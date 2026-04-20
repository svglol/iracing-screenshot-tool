'use strict';

// ---------------------------------------------------------------------------
// handlers — dispatch GitHub issues.* events to Discord (D-17).
// ---------------------------------------------------------------------------
// Covers:
//   - issues.closed with state_reason='completed'  → ✅ icon + reporter ping
//   - issues.closed with state_reason='not_planned' → 🔒 icon
//   - issues.closed with state_reason='duplicate'   → 🔁 icon
//   - issues.reopened → 🔄 icon
//   - issues.labeled (non-votes:*)  → reporter ping with label name
//   - issues.labeled (votes:*)      → ignored (no spam on vote count changes)
//   - orphaned mapping (no mapping row) → silent no-op
//   - non-issues events → silent no-op
//   - allowedMentions restricts pings to the reporter only (D-17)
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => ({ __esModule: true, default: {} }));
jest.mock('../storage/mappings.js', () => ({
	__esModule: true,
	findByIssueNumber: jest.fn()
}));

// Define the Discord mock objects INSIDE the factory so Jest's hoisting
// doesn't bite us (see Plan 02-06 SUMMARY §"Mocking convention for hoisting"
// for the full rationale). We retrieve the same references through
// `__mocks` after module init.
jest.mock('../discord/client.js', () => {
	const mockMsg = {
		content: '🐛 Bug #42 foo',
		edit: jest.fn().mockResolvedValue({}),
		reply: jest.fn().mockResolvedValue({})
	};
	const mockChannel = {
		messages: { fetch: jest.fn().mockResolvedValue(mockMsg) }
	};
	const mockClient = {
		channels: { fetch: jest.fn().mockResolvedValue(mockChannel) }
	};
	return {
		__esModule: true,
		getClient: () => mockClient,
		__mocks: { mockMsg, mockChannel, mockClient }
	};
});

import * as mappings from '../storage/mappings.js';
import * as discordClient from '../discord/client.js';
import { dispatch } from './handlers.js';

const mockMsg = discordClient.__mocks.mockMsg;
const mockChannel = discordClient.__mocks.mockChannel;
const mockClient = discordClient.__mocks.mockClient;

const MAPPING = {
	issue_number: 42,
	issue_type: 'bug',
	discord_channel_id: 'c-id',
	discord_message_id: 'm-id',
	reporter_discord_id: 'u1',
	created_at: 1
};

beforeEach(() => {
	jest.clearAllMocks();
	mockMsg.content = '🐛 Bug #42 foo';
});

describe('dispatch: issues.closed (completed)', () => {
	test('edits message with ✅ and pings reporter with allowedMentions', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', {
			action: 'closed',
			issue: { number: 42, state_reason: 'completed' }
		});
		expect(mockClient.channels.fetch).toHaveBeenCalledWith('c-id');
		expect(mockChannel.messages.fetch).toHaveBeenCalledWith('m-id');
		expect(mockMsg.edit).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('✅')
			})
		);
		expect(mockMsg.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('<@u1>'),
				allowedMentions: { users: ['u1'] }
			})
		);
	});
});

describe('dispatch: issues.closed (not_planned)', () => {
	test('uses 🔒 icon', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', {
			action: 'closed',
			issue: { number: 42, state_reason: 'not_planned' }
		});
		expect(mockMsg.edit).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('🔒') })
		);
	});
});

describe('dispatch: issues.closed (duplicate)', () => {
	test('uses 🔁 icon', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', {
			action: 'closed',
			issue: { number: 42, state_reason: 'duplicate' }
		});
		expect(mockMsg.edit).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('🔁') })
		);
	});
});

describe('dispatch: issues.reopened', () => {
	test('uses 🔄 icon and pings reporter', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', { action: 'reopened', issue: { number: 42 } });
		expect(mockMsg.edit).toHaveBeenCalledWith(
			expect.objectContaining({ content: expect.stringContaining('🔄') })
		);
		expect(mockMsg.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('<@u1>'),
				allowedMentions: { users: ['u1'] }
			})
		);
	});
});

describe('dispatch: issues.labeled', () => {
	test('pings reporter for non-votes label', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', {
			action: 'labeled',
			issue: { number: 42 },
			label: { name: 'in-progress' }
		});
		expect(mockMsg.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('in-progress'),
				allowedMentions: { users: ['u1'] }
			})
		);
	});

	test('ignores votes:* label to avoid reporter spam on every upvote', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', {
			action: 'labeled',
			issue: { number: 42 },
			label: { name: 'votes:7' }
		});
		expect(mockMsg.reply).not.toHaveBeenCalled();
	});
});

describe('dispatch: orphaned mapping (silent no-op)', () => {
	test('no-op when mapping missing', async () => {
		mappings.findByIssueNumber.mockReturnValue(null);
		await dispatch('issues', {
			action: 'closed',
			issue: { number: 99, state_reason: 'completed' }
		});
		expect(mockMsg.edit).not.toHaveBeenCalled();
		expect(mockMsg.reply).not.toHaveBeenCalled();
	});
});

describe('dispatch: non-issues event (silent no-op)', () => {
	test('ignores push events', async () => {
		await dispatch('push', {});
		expect(mockMsg.edit).not.toHaveBeenCalled();
		expect(mockMsg.reply).not.toHaveBeenCalled();
	});

	test('ignores unknown issue actions (assigned, milestoned, etc.)', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		await dispatch('issues', { action: 'assigned', issue: { number: 42 } });
		expect(mockMsg.edit).not.toHaveBeenCalled();
		expect(mockMsg.reply).not.toHaveBeenCalled();
	});
});

describe('dispatch: failure isolation', () => {
	test('does NOT throw when channel fetch fails', async () => {
		mappings.findByIssueNumber.mockReturnValue(MAPPING);
		mockClient.channels.fetch.mockRejectedValueOnce(new Error('403'));
		await expect(
			dispatch('issues', {
				action: 'closed',
				issue: { number: 42, state_reason: 'completed' }
			})
		).resolves.toBeUndefined();
	});
});
