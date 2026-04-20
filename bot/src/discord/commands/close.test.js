'use strict';

// ---------------------------------------------------------------------------
// /close command tests (D-15).
// ---------------------------------------------------------------------------
// Pins:
//   - Non-maintainer is REJECTED before any GitHub call (guard-first).
//   - reason=fixed       → state_reason=completed + label 'fixed' added FIRST
//   - reason=wontfix     → state_reason=not_planned + label 'wontfix'
//   - reason=duplicate   → state_reason=duplicate + label 'duplicate'
//   - reason=not-planned → state_reason=not_planned, NO label added
//   - Default reason is 'fixed' when the option is unset.
//   - closeIssue failure surfaces a user-visible error via editReply.
//   - deferReply / reply use MessageFlags.Ephemeral (no deprecated ephemeral:true).
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
	closeIssue: jest.fn()
}));

import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import { execute } from './close.js';

function makeIx(n, reason) {
	return {
		user: { id: 'u1' },
		options: {
			getInteger: jest.fn().mockReturnValue(n),
			getString: jest.fn().mockReturnValue(reason)
		},
		reply: jest.fn().mockResolvedValue(undefined),
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined)
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('close command', () => {
	test('non-maintainer is REJECTED before any GitHub call', async () => {
		canTriage.mockReturnValue(false);
		const ix = makeIx(1, 'fixed');
		await execute(ix);
		expect(ix.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('Maintainer')
			})
		);
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.closeIssue).not.toHaveBeenCalled();
	});

	test('reason=fixed → state_reason=completed AND label "fixed" added', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.closeIssue.mockResolvedValue({ number: 1 });
		await execute(makeIx(1, 'fixed'));
		expect(issues.addLabels).toHaveBeenCalledWith(1, ['fixed']);
		expect(issues.closeIssue).toHaveBeenCalledWith(1, {
			state_reason: 'completed'
		});
	});

	test('reason=wontfix → state_reason=not_planned AND label "wontfix"', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.closeIssue.mockResolvedValue({ number: 2 });
		await execute(makeIx(2, 'wontfix'));
		expect(issues.addLabels).toHaveBeenCalledWith(2, ['wontfix']);
		expect(issues.closeIssue).toHaveBeenCalledWith(2, {
			state_reason: 'not_planned'
		});
	});

	test('reason=duplicate → state_reason=duplicate AND label "duplicate"', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.closeIssue.mockResolvedValue({ number: 3 });
		await execute(makeIx(3, 'duplicate'));
		expect(issues.addLabels).toHaveBeenCalledWith(3, ['duplicate']);
		expect(issues.closeIssue).toHaveBeenCalledWith(3, {
			state_reason: 'duplicate'
		});
	});

	test('reason=not-planned → state_reason=not_planned, NO label added', async () => {
		canTriage.mockReturnValue(true);
		issues.closeIssue.mockResolvedValue({ number: 4 });
		await execute(makeIx(4, 'not-planned'));
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.closeIssue).toHaveBeenCalledWith(4, {
			state_reason: 'not_planned'
		});
	});

	test('default reason is "fixed" when option is unset', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.closeIssue.mockResolvedValue({ number: 5 });
		await execute(makeIx(5, null));
		expect(issues.addLabels).toHaveBeenCalledWith(5, ['fixed']);
		expect(issues.closeIssue).toHaveBeenCalledWith(5, {
			state_reason: 'completed'
		});
	});

	test('closeIssue failure surfaces an error via editReply', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.closeIssue.mockResolvedValue(null);
		const ix = makeIx(42, 'fixed');
		await execute(ix);
		expect(ix.editReply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('Failed')
			})
		);
	});

	test('label is added BEFORE closeIssue (order pinned by call sequence)', async () => {
		canTriage.mockReturnValue(true);
		const order = [];
		issues.addLabels.mockImplementation(async () => {
			order.push('addLabels');
			return [];
		});
		issues.closeIssue.mockImplementation(async () => {
			order.push('closeIssue');
			return {};
		});
		await execute(makeIx(7, 'fixed'));
		expect(order).toEqual(['addLabels', 'closeIssue']);
	});

	test('deferReply uses MessageFlags.Ephemeral (no deprecated ephemeral:true)', async () => {
		canTriage.mockReturnValue(true);
		issues.addLabels.mockResolvedValue([]);
		issues.closeIssue.mockResolvedValue({});
		const ix = makeIx(1, 'fixed');
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});

	test('non-maintainer reply uses MessageFlags.Ephemeral (no ephemeral:true)', async () => {
		canTriage.mockReturnValue(false);
		const ix = makeIx(1, 'fixed');
		await execute(ix);
		const arg = ix.reply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
