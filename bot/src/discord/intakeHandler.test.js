'use strict';

// ---------------------------------------------------------------------------
// Tests for intakeHandler (modal-submit path for /bug and /feature).
// ---------------------------------------------------------------------------
// This is the phase's critical path: creates the GitHub issue, posts the
// public Discord message, stores the mapping, records the rate-limit bucket,
// and launches the 2-minute attachment collector. Every dependency is mocked
// so tests never hit Discord or GitHub.
//
// CRITICAL assertion: labels passed to `createIssue` are EXACTLY `['bug']` or
// `['feature']` — NOT `['bug', 'triaged']`. The 'triaged' label is reserved
// for Plan 02-08's /assign-status triaged command; auto-applying it at
// intake would make the triage command a no-op and misrepresent the state.
// Both the happy-path test AND a dedicated `.not.toContain('triaged')`
// assertion pin this so a future refactor cannot silently regress it.
//
// Mock naming convention: every mocked function's variable name starts with
// `mock` so Jest's mock-hoisting heuristic permits it to be referenced from
// inside the `jest.mock(..., factory)` body. Without that prefix Jest rejects
// the access as an uninitialised-variable reference.
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => ({
	__esModule: true,
	default: {
		discordToken: 'tkn',
		discordClientId: 'cid',
		discordReportsChannelId: 'ch-1',
		githubOwner: 'svglol',
		githubRepo: 'iracing-screenshot-tool',
		githubAttachmentsBranch: 'bug-attachments',
		rateLimitPerDay: 3,
		logLevel: 'info',
		logDir: ''
	}
}));

// Mock functions defined INSIDE the factory so the jest.mock hoisting is safe.
// Retrieved after module init via `require(...)`-style access on the mocked
// module. This pattern is ugly but is the only hoisting-compliant shape with
// Jest 25's babel-hoist transformation.
jest.mock('../github/issues.js', () => ({
	__esModule: true,
	createIssue: jest.fn(),
	updateIssue: jest.fn()
}));

jest.mock('../storage/mappings.js', () => ({
	__esModule: true,
	insert: jest.fn()
}));

jest.mock('../rateLimit.js', () => ({
	__esModule: true,
	record: jest.fn(),
	check: jest.fn().mockReturnValue({ ok: true })
}));

jest.mock('./attachmentCollector.js', () => ({
	__esModule: true,
	collectAttachments: jest.fn()
}));

import {
	handleBugModalSubmit,
	handleFeatureModalSubmit
} from './intakeHandler.js';
import * as mockIssues from '../github/issues.js';
import * as mockMappings from '../storage/mappings.js';
import * as mockRateLimit from '../rateLimit.js';
import * as mockAttachments from './attachmentCollector.js';

function makeInteraction({
	kind = 'bug',
	fields = {},
	channelFails = false,
	postFails = false
} = {}) {
	const baseFields =
		kind === 'bug'
			? { title: 't', steps: 's', expected: 'e', actual: 'a', version: '2.1.0' }
			: { title: 't', useCase: 'u', why: 'w', niceToHave: 'n' };
	const fieldMap = { ...baseFields, ...fields };

	const posted = { id: 'msg-1', channel: { id: 'ch-1' } };
	const channel = {
		id: 'ch-1',
		send: postFails
			? jest.fn().mockRejectedValue(new Error('send-failed'))
			: jest.fn().mockResolvedValue(posted),
		awaitMessages: jest.fn()
	};

	const client = {
		channels: {
			fetch: channelFails
				? jest.fn().mockRejectedValue(new Error('no-channel'))
				: jest.fn().mockResolvedValue(channel)
		}
	};

	return {
		client,
		user: { id: 'user-1', username: 'alice' },
		fields: { getTextInputValue: (k) => fieldMap[k] },
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined),
		reply: jest.fn().mockResolvedValue(undefined),
		followUp: jest.fn().mockResolvedValue(undefined)
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	mockAttachments.collectAttachments.mockResolvedValue([]);
	mockRateLimit.check.mockReturnValue({ ok: true });
});

// ---------------------------------------------------------------------------
// handleBugModalSubmit — happy path + label assertion (intake does NOT auto-triage)
// ---------------------------------------------------------------------------
describe('handleBugModalSubmit', () => {
	test('happy path: creates issue, posts public message, inserts mapping, records rate-limit, collects attachments', async () => {
		mockIssues.createIssue.mockResolvedValue({
			number: 42,
			html_url: 'https://gh/42'
		});
		const ix = makeInteraction();
		await handleBugModalSubmit(ix);

		expect(ix.deferReply).toHaveBeenCalledWith({ flags: expect.anything() });
		expect(mockIssues.createIssue).toHaveBeenCalledWith(
			expect.objectContaining({ labels: ['bug'] })
		);
		expect(mockMappings.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				issue_number: 42,
				issue_type: 'bug',
				reporter_discord_id: 'user-1',
				discord_channel_id: 'ch-1',
				discord_message_id: 'msg-1'
			})
		);
		expect(mockRateLimit.record).toHaveBeenCalledWith('user-1');
		expect(mockAttachments.collectAttachments).toHaveBeenCalledWith(
			expect.any(Object),
			'user-1',
			42
		);
		expect(ix.editReply).toHaveBeenCalled();
	});

	test('intake does NOT auto-apply the "triaged" label (reserved for /assign-status)', async () => {
		mockIssues.createIssue.mockResolvedValue({ number: 1, html_url: 'x' });
		const ix = makeInteraction();
		await handleBugModalSubmit(ix);

		const createCall = mockIssues.createIssue.mock.calls[0][0];
		expect(createCall.labels).toEqual(['bug']);
		expect(createCall.labels).not.toContain('triaged');
	});

	test('deferReply is called BEFORE createIssue (Pitfall 7 — 3s timeout)', async () => {
		const callOrder = [];
		mockIssues.createIssue.mockImplementation(() => {
			callOrder.push('createIssue');
			return Promise.resolve({ number: 1, html_url: 'x' });
		});
		const ix = makeInteraction();
		ix.deferReply = jest.fn().mockImplementation(() => {
			callOrder.push('deferReply');
			return Promise.resolve(undefined);
		});
		await handleBugModalSubmit(ix);
		expect(callOrder[0]).toBe('deferReply');
		expect(callOrder).toContain('createIssue');
	});

	test('posts public Discord message with 👍 prompt + reporter mention + issue URL', async () => {
		mockIssues.createIssue.mockResolvedValue({
			number: 7,
			html_url: 'https://gh/7'
		});
		const ix = makeInteraction();
		await handleBugModalSubmit(ix);

		const channel = await ix.client.channels.fetch.mock.results[0].value;
		expect(channel.send).toHaveBeenCalledTimes(1);
		const sendArg = channel.send.mock.calls[0][0];
		expect(sendArg.content).toContain('#7');
		expect(sendArg.content).toContain('<@user-1>');
		expect(sendArg.content).toContain('https://gh/7');
		expect(sendArg.content).toContain('👍');
	});

	test('when attachments returned, updateIssue receives body with appended markdown', async () => {
		mockIssues.createIssue.mockResolvedValue({ number: 7, html_url: 'x' });
		mockAttachments.collectAttachments.mockResolvedValue([
			{ name: 'pic.png', url: 'https://raw/pic.png' }
		]);
		const ix = makeInteraction();
		await handleBugModalSubmit(ix);
		expect(mockIssues.updateIssue).toHaveBeenCalledWith(
			7,
			expect.objectContaining({ body: expect.stringContaining('![pic.png]') })
		);
	});

	test('when attachments empty, updateIssue is NOT called', async () => {
		mockIssues.createIssue.mockResolvedValue({ number: 7, html_url: 'x' });
		mockAttachments.collectAttachments.mockResolvedValue([]);
		const ix = makeInteraction();
		await handleBugModalSubmit(ix);
		expect(mockIssues.updateIssue).not.toHaveBeenCalled();
	});

	test('createIssue failure → editReply with failure message; no mapping, no public post', async () => {
		mockIssues.createIssue.mockResolvedValue(null);
		const ix = makeInteraction();
		await handleBugModalSubmit(ix);
		expect(ix.editReply).toHaveBeenCalledWith({
			content: expect.stringContaining('Failed to create')
		});
		expect(mockMappings.insert).not.toHaveBeenCalled();
		expect(mockAttachments.collectAttachments).not.toHaveBeenCalled();
	});

	test('channel-fetch failure → falls back to link in editReply; no mapping insert', async () => {
		mockIssues.createIssue.mockResolvedValue({
			number: 9,
			html_url: 'https://gh/9'
		});
		const ix = makeInteraction({ channelFails: true });
		await handleBugModalSubmit(ix);
		expect(mockMappings.insert).not.toHaveBeenCalled();
		expect(ix.editReply).toHaveBeenCalledWith({
			content: expect.stringContaining('#9')
		});
	});

	test('channel.send failure → editReply with partial-success message; no mapping', async () => {
		mockIssues.createIssue.mockResolvedValue({
			number: 11,
			html_url: 'https://gh/11'
		});
		const ix = makeInteraction({ postFails: true });
		await handleBugModalSubmit(ix);
		expect(mockMappings.insert).not.toHaveBeenCalled();
		expect(ix.editReply).toHaveBeenCalledWith({
			content: expect.stringContaining('#11')
		});
	});
});

// ---------------------------------------------------------------------------
// handleFeatureModalSubmit — mirrors bug but with labels=['feature']
// ---------------------------------------------------------------------------
describe('handleFeatureModalSubmit', () => {
	test('creates issue with labels=[feature] ONLY (no auto-triaged)', async () => {
		mockIssues.createIssue.mockResolvedValue({ number: 5, html_url: 'x' });
		const ix = makeInteraction({ kind: 'feature' });
		await handleFeatureModalSubmit(ix);

		const createCall = mockIssues.createIssue.mock.calls[0][0];
		expect(createCall.labels).toEqual(['feature']);
		expect(createCall.labels).not.toContain('triaged');
		expect(mockMappings.insert).toHaveBeenCalledWith(
			expect.objectContaining({ issue_type: 'feature' })
		);
	});

	test('posts public message with ✨ icon and Feature wording', async () => {
		mockIssues.createIssue.mockResolvedValue({
			number: 3,
			html_url: 'https://gh/3'
		});
		const ix = makeInteraction({ kind: 'feature' });
		await handleFeatureModalSubmit(ix);

		const channel = await ix.client.channels.fetch.mock.results[0].value;
		const sendArg = channel.send.mock.calls[0][0];
		expect(sendArg.content).toContain('✨');
		expect(sendArg.content).toContain('Feature');
		expect(sendArg.content).toContain('#3');
	});

	test('reads the feature-specific fields (useCase, why, niceToHave)', async () => {
		mockIssues.createIssue.mockResolvedValue({ number: 2, html_url: 'x' });
		const ix = makeInteraction({ kind: 'feature' });
		const spy = jest.spyOn(ix.fields, 'getTextInputValue');
		await handleFeatureModalSubmit(ix);
		const calledKeys = spy.mock.calls.map((c) => c[0]);
		expect(calledKeys).toEqual(
			expect.arrayContaining(['title', 'useCase', 'why', 'niceToHave'])
		);
	});
});
