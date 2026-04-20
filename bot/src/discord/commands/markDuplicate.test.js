'use strict';

// ---------------------------------------------------------------------------
// /mark-duplicate command tests (D-15, D-16).
// ---------------------------------------------------------------------------
// Pins:
//   - Non-maintainer is REJECTED before any GitHub call (guard-first).
//   - Self-duplication (issue === of-issue) is rejected with an ephemeral
//     message and NO GitHub call is made.
//   - Three-step sequence on happy path: addLabels('duplicate') →
//     addComment(#ofIssue mentioned) → closeIssue(state_reason='duplicate').
//   - When a Discord mapping exists for the duplicate issue, a reply is
//     posted in the original Discord channel linking to the primary
//     (uses reply.messageReference for proper Discord threading).
//   - When NO mapping exists, the flow completes without attempting to
//     fetch/send to any channel.
//   - close failure surfaces a partial-success editReply.
// ---------------------------------------------------------------------------

jest.mock('../../config.js', () => ({
	__esModule: true,
	default: {
		discordOwnerId: 'owner-id',
		discordMaintainerRoleId: 'maint-role'
	}
}));

jest.mock('../../permissions.js', () => ({
	__esModule: true,
	canTriage: jest.fn()
}));

jest.mock('../../github/issues.js', () => ({
	__esModule: true,
	addLabels: jest.fn(),
	addComment: jest.fn(),
	closeIssue: jest.fn()
}));

jest.mock('../../storage/mappings.js', () => ({
	__esModule: true,
	findByIssueNumber: jest.fn()
}));

import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import * as mappings from '../../storage/mappings.js';
import { execute } from './markDuplicate.js';

function makeIx({
	dup = 1,
	orig = 2,
	channelSend = jest.fn().mockResolvedValue({}),
	channelFetch
} = {}) {
	const fetch =
		channelFetch ||
		jest.fn().mockResolvedValue({ send: channelSend });
	return {
		user: { id: 'u1' },
		client: { channels: { fetch } },
		options: {
			getInteger: jest.fn((k) => ({ issue: dup, 'of-issue': orig }[k]))
		},
		reply: jest.fn().mockResolvedValue(undefined),
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined),
		_send: channelSend,
		_fetch: fetch
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('mark-duplicate command', () => {
	test('non-maintainer is REJECTED before any GitHub call', async () => {
		canTriage.mockReturnValue(false);
		const ix = makeIx();
		await execute(ix);
		expect(ix.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('Maintainer')
			})
		);
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.addComment).not.toHaveBeenCalled();
		expect(issues.closeIssue).not.toHaveBeenCalled();
	});

	test('rejects self-duplication (issue === of-issue)', async () => {
		canTriage.mockReturnValue(true);
		const ix = makeIx({ dup: 5, orig: 5 });
		await execute(ix);
		expect(ix.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('itself')
			})
		);
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.addComment).not.toHaveBeenCalled();
		expect(issues.closeIssue).not.toHaveBeenCalled();
	});

	test('happy path: addLabels → addComment → closeIssue(duplicate)', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.addComment.mockResolvedValue({});
		issues.closeIssue.mockResolvedValue({ number: 7 });
		mappings.findByIssueNumber.mockReturnValue(null);
		await execute(makeIx({ dup: 7, orig: 3 }));
		expect(issues.addLabels).toHaveBeenCalledWith(7, ['duplicate']);
		expect(issues.addComment).toHaveBeenCalledWith(
			7,
			expect.stringContaining('#3')
		);
		expect(issues.closeIssue).toHaveBeenCalledWith(7, {
			state_reason: 'duplicate'
		});
	});

	test('three-step sequence runs in correct order', async () => {
		canTriage.mockReturnValue(true);
		const order = [];
		issues.addLabels.mockImplementation(async () => {
			order.push('addLabels');
			return [];
		});
		issues.addComment.mockImplementation(async () => {
			order.push('addComment');
			return {};
		});
		issues.closeIssue.mockImplementation(async () => {
			order.push('closeIssue');
			return {};
		});
		mappings.findByIssueNumber.mockReturnValue(null);
		await execute(makeIx({ dup: 8, orig: 4 }));
		expect(order).toEqual(['addLabels', 'addComment', 'closeIssue']);
	});

	test('posts Discord reply in original channel when mapping exists', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.addComment.mockResolvedValue({});
		issues.closeIssue.mockResolvedValue({});
		const send = jest.fn().mockResolvedValue({});
		mappings.findByIssueNumber.mockReturnValue({
			discord_channel_id: 'ch-id',
			discord_message_id: 'msg-id'
		});
		const ix = makeIx({ dup: 7, orig: 3, channelSend: send });
		await execute(ix);
		expect(ix._fetch).toHaveBeenCalledWith('ch-id');
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('#3'),
				reply: expect.objectContaining({
					messageReference: 'msg-id',
					failIfNotExists: false
				})
			})
		);
	});

	test('completes without channel fetch when no mapping exists', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.addComment.mockResolvedValue({});
		issues.closeIssue.mockResolvedValue({});
		mappings.findByIssueNumber.mockReturnValue(null);
		const ix = makeIx({ dup: 7, orig: 3 });
		await execute(ix);
		expect(ix._fetch).not.toHaveBeenCalled();
	});

	test('discord-post failure does NOT abort the triage flow', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.addComment.mockResolvedValue({});
		issues.closeIssue.mockResolvedValue({});
		mappings.findByIssueNumber.mockReturnValue({
			discord_channel_id: 'ch-id',
			discord_message_id: 'msg-id'
		});
		const ix = makeIx({
			dup: 7,
			orig: 3,
			channelFetch: jest
				.fn()
				.mockRejectedValue(new Error('missing access'))
		});
		await execute(ix);
		// Final editReply should still signal success — D-16 completion
		// must not hinge on a best-effort Discord reply.
		const last = ix.editReply.mock.calls.at(-1)[0];
		expect(last.content).toMatch(/Marked|duplicate/i);
	});

	test('closeIssue failure surfaces a partial-success editReply', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.addComment.mockResolvedValue({});
		issues.closeIssue.mockResolvedValue(null);
		mappings.findByIssueNumber.mockReturnValue(null);
		const ix = makeIx({ dup: 7, orig: 3 });
		await execute(ix);
		const last = ix.editReply.mock.calls.at(-1)[0];
		expect(last.content).toMatch(/close failed|Labeled/i);
	});

	test('deferReply uses MessageFlags.Ephemeral (no ephemeral:true)', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.addComment.mockResolvedValue({});
		issues.closeIssue.mockResolvedValue({});
		mappings.findByIssueNumber.mockReturnValue(null);
		const ix = makeIx();
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
