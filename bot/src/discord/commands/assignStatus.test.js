'use strict';

// ---------------------------------------------------------------------------
// /assign-status command tests (D-15).
// ---------------------------------------------------------------------------
// Pins:
//   - Non-maintainer is REJECTED before any GitHub call (guard-first).
//   - Any existing status label (triaged|in-progress|fixed|wontfix|needs-repro)
//     that differs from the target is REMOVED before the new status is added.
//   - If the target status is already present, NO removal is performed.
//   - getIssue returning null surfaces a "not found" editReply.
//   - deferReply uses MessageFlags.Ephemeral (no deprecated ephemeral:true).
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
	getIssue: jest.fn(),
	addLabels: jest.fn(),
	removeLabel: jest.fn()
}));

import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import { execute } from './assignStatus.js';

function makeIx(n, status) {
	return {
		user: { id: 'u1' },
		options: {
			getInteger: jest.fn().mockReturnValue(n),
			getString: jest.fn().mockReturnValue(status)
		},
		reply: jest.fn().mockResolvedValue(undefined),
		deferReply: jest.fn().mockResolvedValue(undefined),
		editReply: jest.fn().mockResolvedValue(undefined)
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('assign-status command', () => {
	test('non-maintainer is REJECTED before any GitHub call', async () => {
		canTriage.mockReturnValue(false);
		const ix = makeIx(1, 'triaged');
		await execute(ix);
		expect(ix.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('Maintainer')
			})
		);
		expect(issues.getIssue).not.toHaveBeenCalled();
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.removeLabel).not.toHaveBeenCalled();
	});

	test('removes existing status labels and adds the new one', async () => {
		canTriage.mockReturnValue(true);
		issues.getIssue.mockResolvedValue({
			number: 1,
			labels: [
				{ name: 'bug' },
				{ name: 'triaged' },
				{ name: 'in-progress' }
			]
		});
		issues.addLabels.mockResolvedValue([]);
		issues.removeLabel.mockResolvedValue([]);
		await execute(makeIx(1, 'fixed'));
		expect(issues.removeLabel).toHaveBeenCalledWith(1, 'triaged');
		expect(issues.removeLabel).toHaveBeenCalledWith(1, 'in-progress');
		// 'bug' is NOT a status label, must be untouched
		expect(issues.removeLabel).not.toHaveBeenCalledWith(1, 'bug');
		expect(issues.addLabels).toHaveBeenCalledWith(1, ['fixed']);
	});

	test('does NOT remove the target status if it is already present', async () => {
		canTriage.mockReturnValue(true);
		issues.getIssue.mockResolvedValue({
			number: 1,
			labels: [{ name: 'fixed' }]
		});
		issues.addLabels.mockResolvedValue([]);
		await execute(makeIx(1, 'fixed'));
		expect(issues.removeLabel).not.toHaveBeenCalled();
		expect(issues.addLabels).toHaveBeenCalledWith(1, ['fixed']);
	});

	test('reports not-found when getIssue returns null', async () => {
		canTriage.mockReturnValue(true);
		issues.getIssue.mockResolvedValue(null);
		const ix = makeIx(999, 'fixed');
		await execute(ix);
		expect(ix.editReply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining('not found')
			})
		);
		expect(issues.addLabels).not.toHaveBeenCalled();
		expect(issues.removeLabel).not.toHaveBeenCalled();
	});

	test('tolerates issue.labels being undefined (no labels field)', async () => {
		canTriage.mockReturnValue(true);
		issues.getIssue.mockResolvedValue({ number: 1 });
		issues.addLabels.mockResolvedValue([]);
		await execute(makeIx(1, 'triaged'));
		expect(issues.removeLabel).not.toHaveBeenCalled();
		expect(issues.addLabels).toHaveBeenCalledWith(1, ['triaged']);
	});

	test('deferReply uses MessageFlags.Ephemeral (no ephemeral:true)', async () => {
		canTriage.mockReturnValue(true);
		issues.getIssue.mockResolvedValue({ number: 1, labels: [] });
		issues.addLabels.mockResolvedValue([]);
		const ix = makeIx(1, 'triaged');
		await execute(ix);
		const arg = ix.deferReply.mock.calls[0][0];
		expect(arg).toHaveProperty('flags');
		expect(arg.ephemeral).toBeUndefined();
	});
});
