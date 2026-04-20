'use strict';

// ---------------------------------------------------------------------------
// /label command tests (D-15).
// ---------------------------------------------------------------------------
// Pins:
//   - Non-maintainer is REJECTED before any GitHub call (guard-first).
//   - action=add    → issues.addLabels(number, [name])
//   - action=remove → issues.removeLabel(number, name)
//   - Label name NOT in LABEL_TAXONOMY is rejected with an ephemeral error;
//     no GitHub call is made (defense-in-depth — Discord's addChoices is the
//     first line of defence, this code path backstops it).
//   - deferReply / reply use MessageFlags.Ephemeral (no ephemeral:true).
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
	removeLabel: jest.fn()
}));

// Use the REAL LABEL_TAXONOMY so the allowlist stays in sync with the source.

import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import { execute } from './label.js';

function makeIx({ n = 1, action = 'add', name = 'bug' } = {}) {
	return {
		user: { id: 'u1' },
		options: {
			getInteger: jest.fn().mockReturnValue(n),
			getString: jest.fn((k) => ({ action, name }[k]))
		},
		reply: jest.fn().mockResolvedValue(undefined),
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined)
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('label command', () => {
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
		expect(issues.removeLabel).not.toHaveBeenCalled();
	});

	test('action=add → addLabels(number, [name]) single-element array', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		await execute(makeIx({ n: 5, action: 'add', name: 'triaged' }));
		expect(issues.addLabels).toHaveBeenCalledWith(5, ['triaged']);
		expect(issues.removeLabel).not.toHaveBeenCalled();
	});

	test('action=remove → removeLabel(number, name)', async () => {
		canTriage.mockReturnValue(true);
		issues.removeLabel.mockResolvedValue([]);
		await execute(makeIx({ n: 5, action: 'remove', name: 'bug' }));
		expect(issues.removeLabel).toHaveBeenCalledWith(5, 'bug');
		expect(issues.addLabels).not.toHaveBeenCalled();
	});

	test('label name NOT in LABEL_TAXONOMY is rejected (defense-in-depth)', async () => {
		canTriage.mockReturnValue(true);
		const ix = makeIx({ n: 1, action: 'add', name: 'custom-label' });
		await execute(ix);
		expect(ix.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('not in the taxonomy')
			})
		);
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.removeLabel).not.toHaveBeenCalled();
	});

	test('addLabels failure surfaces an error via editReply', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue(null);
		const ix = makeIx({ n: 5, action: 'add', name: 'bug' });
		await execute(ix);
		expect(ix.editReply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('Failed')
			})
		);
	});

	test('deferReply uses MessageFlags.Ephemeral (no ephemeral:true)', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		const ix = makeIx();
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});

	test('non-maintainer reply uses MessageFlags.Ephemeral (no ephemeral:true)', async () => {
		canTriage.mockReturnValue(false);
		const ix = makeIx();
		await execute(ix);
		const arg = ix.reply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
