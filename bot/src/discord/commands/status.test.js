'use strict';

// ---------------------------------------------------------------------------
// /status command tests.
// ---------------------------------------------------------------------------
// Pins:
//   - not-found path when issues.getIssue returns null
//   - happy path renders number, state, title, labels (non-vote), votes, assignee, URL
//   - defers ephemeral BEFORE hitting GitHub (Pitfall 7 — 3-sec interaction
//     timeout)
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
	getIssue: jest.fn()
}));

import * as issues from '../../github/issues.js';
import { execute } from './status.js';

function makeIx(n) {
	return {
		options: { getInteger: jest.fn().mockReturnValue(n) },
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined)
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('status command', () => {
	test('not-found message when getIssue returns null', async () => {
		issues.getIssue.mockResolvedValue(null);
		const ix = makeIx(999);
		await execute(ix);
		expect(ix.editReply).toHaveBeenCalledWith({
			content: 'Issue #999 not found.'
		});
	});

	test('renders open issue with votes, labels and assignee', async () => {
		issues.getIssue.mockResolvedValue({
			number: 7,
			state: 'open',
			title: 'boom',
			labels: [{ name: 'bug' }, { name: 'votes:4' }],
			assignee: { login: 'alice' },
			html_url: 'https://x/7'
		});
		const ix = makeIx(7);
		await execute(ix);
		const call = ix.editReply.mock.calls[0][0].content;
		expect(call).toContain('#7');
		expect(call).toContain('[open]');
		expect(call).toContain('boom');
		expect(call).toContain('Votes: 4');
		expect(call).toContain('@alice');
		expect(call).toContain('https://x/7');
		// votes:N label should NOT appear in the Labels: line
		expect(call).not.toMatch(/Labels:.*votes:4/);
	});

	test('renders closed issue with "unassigned" when assignee is null', async () => {
		issues.getIssue.mockResolvedValue({
			number: 12,
			state: 'closed',
			title: 'done',
			labels: [{ name: 'feature' }],
			assignee: null,
			html_url: 'https://x/12'
		});
		const ix = makeIx(12);
		await execute(ix);
		const call = ix.editReply.mock.calls[0][0].content;
		expect(call).toContain('[closed]');
		expect(call).toContain('unassigned');
		expect(call).toContain('Votes: 0');
	});

	test('defers ephemeral BEFORE hitting GitHub', async () => {
		const order = [];
		const ix = {
			options: { getInteger: jest.fn().mockReturnValue(5) },
			deferReply: jest.fn(async () => {
				order.push('deferReply');
			}),
			editReply: jest.fn(async () => {
				order.push('editReply');
			})
		};
		issues.getIssue.mockImplementation(async () => {
			order.push('getIssue');
			return null;
		});
		await execute(ix);
		expect(order[0]).toBe('deferReply');
		expect(order.indexOf('getIssue')).toBeGreaterThan(
			order.indexOf('deferReply')
		);
	});

	test('deferReply uses MessageFlags.Ephemeral (not deprecated ephemeral:true)', async () => {
		issues.getIssue.mockResolvedValue(null);
		const ix = makeIx(1);
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toBeDefined();
		// Must have 'flags' set — must NOT use deprecated ephemeral:true
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
