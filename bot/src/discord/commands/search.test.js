'use strict';

// ---------------------------------------------------------------------------
// /search command tests.
// ---------------------------------------------------------------------------
// Pins:
//   - passes the query string through to github.searchIssues
//   - URL-encodes the query in the footer link (so special chars like & don't
//     break the GitHub URL)
//   - uses per_page=20
//   - defers ephemeral BEFORE GitHub
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
	searchIssues: jest.fn()
}));

import * as issues from '../../github/issues.js';
import { execute } from './search.js';

const makeIx = (q) => ({
	options: { getString: jest.fn().mockReturnValue(q) },
	deferReply: jest.fn().mockResolvedValue(undefined),
	editReply: jest.fn().mockResolvedValue(undefined)
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('search command', () => {
	test('passes query to github.searchIssues with per_page=20', async () => {
		issues.searchIssues.mockResolvedValue([]);
		await execute(makeIx('crash on save'));
		expect(issues.searchIssues).toHaveBeenCalledWith('crash on save', {
			per_page: 20
		});
	});

	test('footer URL URL-encodes the query', async () => {
		issues.searchIssues.mockResolvedValue(
			// Enough issues to force truncation so the footer is actually emitted
			Array.from({ length: 50 }, (_, i) => ({
				number: i,
				state: 'open',
				title: 'x'.repeat(60),
				labels: [],
				assignee: null
			}))
		);
		const ix = makeIx('q&p');
		await execute(ix);
		const content = ix.editReply.mock.calls[0][0].content;
		expect(content).toContain(
			'https://github.com/svglol/iracing-screenshot-tool/issues?q=q%26p'
		);
	});

	test('renders results (includes issue numbers)', async () => {
		issues.searchIssues.mockResolvedValue([
			{
				number: 42,
				state: 'open',
				title: 'crash',
				labels: [{ name: 'bug' }],
				assignee: null
			}
		]);
		const ix = makeIx('crash');
		await execute(ix);
		const content = ix.editReply.mock.calls[0][0].content;
		expect(content).toContain('#42');
		expect(content).toContain('crash');
	});

	test('empty results → empty-state body', async () => {
		issues.searchIssues.mockResolvedValue([]);
		const ix = makeIx('nothing matches');
		await execute(ix);
		const content = ix.editReply.mock.calls[0][0].content;
		expect(content).toContain('No matching');
	});

	test('defers ephemeral BEFORE GitHub call', async () => {
		const order = [];
		issues.searchIssues.mockImplementation(async () => {
			order.push('searchIssues');
			return [];
		});
		const ix = {
			options: { getString: jest.fn().mockReturnValue('q') },
			deferReply: jest.fn(async () => {
				order.push('deferReply');
			}),
			editReply: jest.fn().mockResolvedValue(undefined)
		};
		await execute(ix);
		expect(order[0]).toBe('deferReply');
	});

	test('deferReply uses flags (not ephemeral:true)', async () => {
		issues.searchIssues.mockResolvedValue([]);
		const ix = makeIx('q');
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
