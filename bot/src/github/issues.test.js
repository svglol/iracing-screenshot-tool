'use strict';

// ---------------------------------------------------------------------------
// Mocks — pinned at file scope so every test file is hermetic.
// `jest.mock` is hoisted above imports by babel-jest, so the mocks are in
// place before `issues.js` / `client.js` are evaluated.
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => {
	const stub = {
		githubToken: 'tkn',
		githubOwner: 'svglol',
		githubRepo: 'iracing-screenshot-tool',
		logDir: '',
		logLevel: 'info'
	};
	return { __esModule: true, default: stub };
});

// Single shared `rest` surface so every test can set resolved/rejected values
// on named operations.
const mockRest = {
	issues: {
		create: jest.fn(),
		get: jest.fn(),
		update: jest.fn(),
		addLabels: jest.fn(),
		removeLabel: jest.fn(),
		listForRepo: jest.fn(),
		createComment: jest.fn()
	},
	search: { issuesAndPullRequests: jest.fn() }
};

jest.mock(
	'@octokit/rest',
	() => ({
		__esModule: true,
		Octokit: jest.fn().mockImplementation(() => ({ rest: mockRest }))
	}),
	{ virtual: true }
);

import * as issues from './issues.js';
import { resetOctokit } from './client.js';

beforeEach(() => {
	resetOctokit();
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createIssue
// ---------------------------------------------------------------------------
describe('createIssue', () => {
	test('returns issue data on success', async () => {
		mockRest.issues.create.mockResolvedValue({ data: { number: 42, html_url: 'x' } });
		const r = await issues.createIssue({ title: 't', body: 'b', labels: ['bug'] });
		expect(r).toEqual({ number: 42, html_url: 'x' });
		expect(mockRest.issues.create).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'svglol',
				repo: 'iracing-screenshot-tool',
				title: 't',
				body: 'b',
				labels: ['bug']
			})
		);
	});

	test('defaults labels to [] when omitted', async () => {
		mockRest.issues.create.mockResolvedValue({ data: { number: 1 } });
		await issues.createIssue({ title: 't', body: 'b' });
		expect(mockRest.issues.create).toHaveBeenCalledWith(
			expect.objectContaining({ labels: [] })
		);
	});

	test('returns null on throw', async () => {
		mockRest.issues.create.mockRejectedValue(new Error('422'));
		const r = await issues.createIssue({ title: 't', body: 'b' });
		expect(r).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getIssue
// ---------------------------------------------------------------------------
describe('getIssue', () => {
	test('returns issue data on success', async () => {
		mockRest.issues.get.mockResolvedValue({ data: { number: 7, title: 'hi' } });
		const r = await issues.getIssue(7);
		expect(r).toEqual({ number: 7, title: 'hi' });
		expect(mockRest.issues.get).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'svglol',
				repo: 'iracing-screenshot-tool',
				issue_number: 7
			})
		);
	});

	test('returns null on throw (404)', async () => {
		mockRest.issues.get.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
		const r = await issues.getIssue(99999);
		expect(r).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// updateIssue
// ---------------------------------------------------------------------------
describe('updateIssue', () => {
	test('passes the full patch through', async () => {
		mockRest.issues.update.mockResolvedValue({ data: { number: 3, title: 'new' } });
		const r = await issues.updateIssue(3, { title: 'new', body: 'b2', labels: ['feature'] });
		expect(r).toEqual({ number: 3, title: 'new' });
		expect(mockRest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 3,
				title: 'new',
				body: 'b2',
				labels: ['feature']
			})
		);
	});

	test('returns null on throw', async () => {
		mockRest.issues.update.mockRejectedValue(new Error('500'));
		expect(await issues.updateIssue(1, { title: 't' })).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// closeIssue / reopenIssue
// ---------------------------------------------------------------------------
describe('closeIssue', () => {
	test('passes state=closed and default state_reason=completed', async () => {
		mockRest.issues.update.mockResolvedValue({ data: { number: 1, state: 'closed' } });
		await issues.closeIssue(1);
		expect(mockRest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 1,
				state: 'closed',
				state_reason: 'completed'
			})
		);
	});

	test('supports duplicate state_reason for D-16', async () => {
		mockRest.issues.update.mockResolvedValue({ data: {} });
		await issues.closeIssue(1, { state_reason: 'duplicate' });
		expect(mockRest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({ state_reason: 'duplicate' })
		);
	});

	test('supports not_planned state_reason', async () => {
		mockRest.issues.update.mockResolvedValue({ data: {} });
		await issues.closeIssue(2, { state_reason: 'not_planned' });
		expect(mockRest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({ state_reason: 'not_planned' })
		);
	});

	test('returns null on throw', async () => {
		mockRest.issues.update.mockRejectedValue(new Error('403'));
		expect(await issues.closeIssue(1)).toBeNull();
	});
});

describe('reopenIssue', () => {
	test('sets state=open', async () => {
		mockRest.issues.update.mockResolvedValue({ data: {} });
		await issues.reopenIssue(9);
		expect(mockRest.issues.update).toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 9, state: 'open' })
		);
	});

	test('returns null on throw', async () => {
		mockRest.issues.update.mockRejectedValue(new Error('x'));
		expect(await issues.reopenIssue(1)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// addLabels / removeLabel
// ---------------------------------------------------------------------------
describe('addLabels / removeLabel', () => {
	test('addLabels passes labels array', async () => {
		mockRest.issues.addLabels.mockResolvedValue({ data: [{ name: 'bug' }] });
		const r = await issues.addLabels(1, ['bug']);
		expect(r).toEqual([{ name: 'bug' }]);
		expect(mockRest.issues.addLabels).toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 1, labels: ['bug'] })
		);
	});

	test('addLabels returns null on throw', async () => {
		mockRest.issues.addLabels.mockRejectedValue(new Error('422'));
		expect(await issues.addLabels(1, ['x'])).toBeNull();
	});

	test('removeLabel passes label name', async () => {
		mockRest.issues.removeLabel.mockResolvedValue({ data: [] });
		const r = await issues.removeLabel(1, 'triage');
		expect(r).toEqual([]);
		expect(mockRest.issues.removeLabel).toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 1, name: 'triage' })
		);
	});

	test('removeLabel returns null on throw', async () => {
		mockRest.issues.removeLabel.mockRejectedValue(new Error('404'));
		expect(await issues.removeLabel(1, 'missing')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// listIssues
// ---------------------------------------------------------------------------
describe('listIssues', () => {
	test('filters out PRs', async () => {
		mockRest.issues.listForRepo.mockResolvedValue({
			data: [
				{ number: 1, pull_request: null },
				{ number: 2, pull_request: { url: 'x' } },
				{ number: 3 }
			]
		});
		const r = await issues.listIssues({ state: 'open' });
		expect(r.map((i) => i.number)).toEqual([1, 3]);
	});

	test('passes state, labels, per_page through', async () => {
		mockRest.issues.listForRepo.mockResolvedValue({ data: [] });
		await issues.listIssues({ state: 'closed', labels: 'bug', per_page: 10 });
		expect(mockRest.issues.listForRepo).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'svglol',
				repo: 'iracing-screenshot-tool',
				state: 'closed',
				labels: 'bug',
				per_page: 10
			})
		);
	});

	test('uses default state=open and per_page=30 when options omitted', async () => {
		mockRest.issues.listForRepo.mockResolvedValue({ data: [] });
		await issues.listIssues();
		expect(mockRest.issues.listForRepo).toHaveBeenCalledWith(
			expect.objectContaining({ state: 'open', per_page: 30 })
		);
	});

	test('returns [] on throw', async () => {
		mockRest.issues.listForRepo.mockRejectedValue(new Error('boom'));
		expect(await issues.listIssues()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// searchIssues
// ---------------------------------------------------------------------------
describe('searchIssues', () => {
	test('scopes query with repo:owner/repo and optional state', async () => {
		mockRest.search.issuesAndPullRequests.mockResolvedValue({ data: { items: [{ number: 1 }] } });
		await issues.searchIssues('crash', { state: 'open' });
		expect(mockRest.search.issuesAndPullRequests).toHaveBeenCalledWith(
			expect.objectContaining({
				q: 'repo:svglol/iracing-screenshot-tool state:open crash'
			})
		);
	});

	test('scopes query without state when not provided', async () => {
		mockRest.search.issuesAndPullRequests.mockResolvedValue({ data: { items: [] } });
		await issues.searchIssues('crash');
		expect(mockRest.search.issuesAndPullRequests).toHaveBeenCalledWith(
			expect.objectContaining({
				q: 'repo:svglol/iracing-screenshot-tool crash'
			})
		);
	});

	test('filters out PR items from search results', async () => {
		mockRest.search.issuesAndPullRequests.mockResolvedValue({
			data: {
				items: [
					{ number: 1 },
					{ number: 2, pull_request: { url: 'x' } },
					{ number: 3, pull_request: null }
				]
			}
		});
		const r = await issues.searchIssues('q');
		expect(r.map((i) => i.number)).toEqual([1, 3]);
	});

	test('returns [] on throw', async () => {
		mockRest.search.issuesAndPullRequests.mockRejectedValue(new Error('x'));
		expect(await issues.searchIssues('q')).toEqual([]);
	});

	test('returns [] when items missing', async () => {
		mockRest.search.issuesAndPullRequests.mockResolvedValue({ data: {} });
		expect(await issues.searchIssues('q')).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------
describe('addComment', () => {
	test('returns comment data on success', async () => {
		mockRest.issues.createComment.mockResolvedValue({ data: { id: 7, body: 'hi' } });
		const r = await issues.addComment(1, 'hi');
		expect(r).toEqual({ id: 7, body: 'hi' });
		expect(mockRest.issues.createComment).toHaveBeenCalledWith(
			expect.objectContaining({ issue_number: 1, body: 'hi' })
		);
	});

	test('returns null on throw', async () => {
		mockRest.issues.createComment.mockRejectedValue(new Error('500'));
		expect(await issues.addComment(1, 'hi')).toBeNull();
	});
});
