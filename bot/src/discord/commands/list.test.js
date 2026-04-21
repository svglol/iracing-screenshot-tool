'use strict';

// ---------------------------------------------------------------------------
// /list command tests.
// ---------------------------------------------------------------------------
// Pins:
//   - open/closed filters call listIssues with correct state
//   - 'mine' uses local mappings.listByReporter (reporters have no GH account
//     per D-05 — can't use GitHub author: query)
//   - defers ephemeral BEFORE the GitHub call
//   - uses flags: MessageFlags.Ephemeral (no deprecated ephemeral:true)
// ---------------------------------------------------------------------------

jest.mock('../../config.js', () => ({
	__esModule: true,
	default: {
		githubOwner: 'svglol',
		githubRepo: 'iracing-screenshot-tool'
	}
}));

jest.mock('../../github/issues.js', () => ({
	__esModule: true,
	listIssues: jest.fn(),
	getIssue: jest.fn()
}));

jest.mock('../../storage/mappings.js', () => ({
	__esModule: true,
	listByReporter: jest.fn()
}));

import * as issues from '../../github/issues.js';
import * as mappings from '../../storage/mappings.js';
import { execute } from './list.js';

function makeIx(filter) {
	return {
		user: { id: 'u1', username: 'alice' },
		options: { getString: jest.fn().mockReturnValue(filter) },
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined)
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('list command', () => {
	test('open filter calls listIssues with state=open', async () => {
		issues.listIssues.mockResolvedValue([
			{
				number: 1,
				state: 'open',
				title: 't',
				labels: [],
				assignee: null
			}
		]);
		await execute(makeIx('open'));
		expect(issues.listIssues).toHaveBeenCalledWith({
			state: 'open',
			per_page: 50
		});
	});

	test('closed filter calls listIssues with state=closed', async () => {
		issues.listIssues.mockResolvedValue([]);
		await execute(makeIx('closed'));
		expect(issues.listIssues).toHaveBeenCalledWith({
			state: 'closed',
			per_page: 50
		});
	});

	test('default filter (null getString) uses open', async () => {
		issues.listIssues.mockResolvedValue([]);
		const ix = {
			user: { id: 'u1', username: 'alice' },
			options: { getString: jest.fn().mockReturnValue(null) },
			deferReply: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined)
		};
		await execute(ix);
		expect(issues.listIssues).toHaveBeenCalledWith({
			state: 'open',
			per_page: 50
		});
	});

	test('mine filter queries local mappings then fetches each issue', async () => {
		mappings.listByReporter.mockReturnValue([
			{ issue_number: 1 },
			{ issue_number: 2 }
		]);
		issues.getIssue.mockResolvedValueOnce({
			number: 1,
			state: 'open',
			title: 'a',
			labels: [],
			assignee: null
		});
		issues.getIssue.mockResolvedValueOnce({
			number: 2,
			state: 'closed',
			title: 'b',
			labels: [],
			assignee: null
		});
		const ix = makeIx('mine');
		await execute(ix);
		expect(mappings.listByReporter).toHaveBeenCalledWith('u1');
		expect(issues.getIssue).toHaveBeenCalledTimes(2);
		// Must NOT call listIssues when filter === 'mine'
		expect(issues.listIssues).not.toHaveBeenCalled();
	});

	test('mine filter with no mapped issues renders empty-state', async () => {
		mappings.listByReporter.mockReturnValue([]);
		const ix = makeIx('mine');
		await execute(ix);
		expect(issues.getIssue).not.toHaveBeenCalled();
		const content = ix.editReply.mock.calls[0][0].content;
		expect(content).toContain('No matching');
	});

	test('defers ephemeral BEFORE hitting GitHub', async () => {
		const order = [];
		issues.listIssues.mockImplementation(async () => {
			order.push('listIssues');
			return [];
		});
		const ix = {
			user: { id: 'u1', username: 'alice' },
			options: { getString: jest.fn().mockReturnValue('open') },
			deferReply: jest.fn(async () => {
				order.push('deferReply');
			}),
			editReply: jest.fn().mockResolvedValue(undefined)
		};
		await execute(ix);
		expect(order[0]).toBe('deferReply');
		expect(order.indexOf('listIssues')).toBeGreaterThan(
			order.indexOf('deferReply')
		);
	});

	test('deferReply uses flags (not ephemeral:true)', async () => {
		issues.listIssues.mockResolvedValue([]);
		const ix = makeIx('open');
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
