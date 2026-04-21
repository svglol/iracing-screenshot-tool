'use strict';

// ---------------------------------------------------------------------------
// /top-features command tests.
// ---------------------------------------------------------------------------
// Pins:
//   - queries open feature-labeled issues
//   - sorts by parseVotesLabel descending
//   - caps at 10 results
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
	listIssues: jest.fn()
}));

import * as issues from '../../github/issues.js';
import { execute } from './topFeatures.js';

const makeIx = () => ({
	deferReply: jest.fn().mockResolvedValue(undefined),
	editReply: jest.fn().mockResolvedValue(undefined)
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('top-features command', () => {
	test('queries open feature-labeled issues with per_page=100', async () => {
		issues.listIssues.mockResolvedValue([]);
		const ix = makeIx();
		await execute(ix);
		expect(issues.listIssues).toHaveBeenCalledWith({
			state: 'open',
			labels: 'feature',
			per_page: 100
		});
	});

	test('sorts by votes:N descending', async () => {
		issues.listIssues.mockResolvedValue([
			{
				number: 1,
				state: 'open',
				title: 'a',
				labels: [{ name: 'feature' }, { name: 'votes:3' }],
				assignee: null
			},
			{
				number: 2,
				state: 'open',
				title: 'b',
				labels: [{ name: 'feature' }, { name: 'votes:10' }],
				assignee: null
			},
			{
				number: 3,
				state: 'open',
				title: 'c',
				labels: [{ name: 'feature' }],
				assignee: null
			}
		]);
		const ix = makeIx();
		await execute(ix);
		const content = ix.editReply.mock.calls[0][0].content;
		const firstIdx = content.indexOf('#2');
		const secondIdx = content.indexOf('#1');
		const thirdIdx = content.indexOf('#3');
		expect(firstIdx).toBeGreaterThan(-1);
		expect(secondIdx).toBeGreaterThan(-1);
		expect(thirdIdx).toBeGreaterThan(-1);
		expect(firstIdx).toBeLessThan(secondIdx);
		expect(secondIdx).toBeLessThan(thirdIdx);
	});

	test('caps output at 10 results', async () => {
		const many = Array.from({ length: 25 }, (_, i) => ({
			number: i + 1,
			state: 'open',
			title: `t${i}`,
			labels: [{ name: 'feature' }, { name: `votes:${i}` }],
			assignee: null
		}));
		issues.listIssues.mockResolvedValue(many);
		const ix = makeIx();
		await execute(ix);
		const content = ix.editReply.mock.calls[0][0].content;
		// Top 10 by votes descending: numbers 25 through 16
		expect(content).toContain('#25');
		expect(content).toContain('#16');
		// 15 or lower should NOT appear
		expect(content).not.toMatch(/#15\b/);
		expect(content).not.toMatch(/#1\b/);
	});

	test('empty result → empty-state body', async () => {
		issues.listIssues.mockResolvedValue([]);
		const ix = makeIx();
		await execute(ix);
		const content = ix.editReply.mock.calls[0][0].content;
		expect(content).toContain('No matching');
	});

	test('defers ephemeral BEFORE GitHub call', async () => {
		const order = [];
		issues.listIssues.mockImplementation(async () => {
			order.push('listIssues');
			return [];
		});
		const ix = {
			deferReply: jest.fn(async () => {
				order.push('deferReply');
			}),
			editReply: jest.fn().mockResolvedValue(undefined)
		};
		await execute(ix);
		expect(order[0]).toBe('deferReply');
	});
});
