import {
	applyUpdateEvent,
	canInstallNow,
	canStartDownload,
	clampPercent,
	describeUpdate,
	initialUpdateState,
	shouldCheckNow,
	shouldShowUpdateBadge,
	UPDATE_RECHECK_INTERVAL_MS,
	type UpdateState,
} from './update-decisions';

const NOW = 1_754_000_000_000;

function stateWith(patch: Partial<UpdateState>): UpdateState {
	return { ...initialUpdateState(), ...patch };
}

describe('initialUpdateState', () => {
	test('starts idle with nothing claimed', () => {
		expect(initialUpdateState()).toEqual({
			phase: 'idle',
			version: null,
			percent: null,
			error: null,
			checkedAt: null,
		});
	});
});

describe('clampPercent', () => {
	test('rounds a float into whole percent', () => {
		expect(clampPercent(42.4)).toBe(42);
		expect(clampPercent(42.6)).toBe(43);
	});

	test('clamps outside 0-100 rather than trusting the reporter', () => {
		expect(clampPercent(-5)).toBe(0);
		expect(clampPercent(103.2)).toBe(100);
	});

	test('rejects non-finite and non-numeric input', () => {
		expect(clampPercent(NaN)).toBeNull();
		expect(clampPercent(Infinity)).toBeNull();
		expect(clampPercent(undefined)).toBeNull();
		expect(clampPercent('50')).toBeNull();
	});
});

describe('applyUpdateEvent', () => {
	test('checking clears a previous error but keeps the staged version', () => {
		const before = stateWith({
			phase: 'error',
			version: '3.3.0',
			error: 'boom',
		});
		const after = applyUpdateEvent(before, { type: 'checking' }, NOW);
		expect(after.phase).toBe('checking');
		expect(after.error).toBeNull();
		expect(after.version).toBe('3.3.0');
	});

	test('available records the version and stamps the check', () => {
		const after = applyUpdateEvent(
			initialUpdateState(),
			{ type: 'available', version: '3.3.0' },
			NOW
		);
		expect(after).toEqual({
			phase: 'available',
			version: '3.3.0',
			percent: null,
			error: null,
			checkedAt: NOW,
		});
	});

	test('not-available clears the version and stamps the check', () => {
		const before = stateWith({ phase: 'available', version: '3.3.0' });
		const after = applyUpdateEvent(
			before,
			{ type: 'not-available', version: '3.2.2' },
			NOW
		);
		expect(after.phase).toBe('idle');
		expect(after.version).toBeNull();
		expect(after.checkedAt).toBe(NOW);
	});

	test('download-started opens at zero percent', () => {
		const before = stateWith({ phase: 'available', version: '3.3.0' });
		const after = applyUpdateEvent(before, { type: 'download-started' }, NOW);
		expect(after.phase).toBe('downloading');
		expect(after.percent).toBe(0);
		expect(after.version).toBe('3.3.0');
	});

	test('progress clamps through the same rule as clampPercent', () => {
		const before = stateWith({ phase: 'downloading', version: '3.3.0' });
		expect(
			applyUpdateEvent(before, { type: 'progress', percent: 61.7 }, NOW)
				.percent
		).toBe(62);
		expect(
			applyUpdateEvent(before, { type: 'progress', percent: 250 }, NOW)
				.percent
		).toBe(100);
		expect(
			applyUpdateEvent(before, { type: 'progress', percent: null }, NOW)
				.percent
		).toBeNull();
	});

	test('downloaded falls back to the version already staged', () => {
		const before = stateWith({ phase: 'downloading', version: '3.3.0' });
		const after = applyUpdateEvent(
			before,
			{ type: 'downloaded', version: null },
			NOW
		);
		expect(after.phase).toBe('downloaded');
		expect(after.version).toBe('3.3.0');
		expect(after.percent).toBe(100);
	});

	test('error from idle surfaces the message', () => {
		const after = applyUpdateEvent(
			initialUpdateState(),
			{ type: 'error', message: 'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND' },
			NOW
		);
		expect(after.phase).toBe('error');
		expect(after.error).toBe('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND');
	});

	// The invariant that matters most: the bits are on disk and will install on
	// quit, so a later failed re-check must not tell the user the update failed.
	test('a downloaded update outranks a later error', () => {
		const before = stateWith({
			phase: 'downloaded',
			version: '3.3.0',
			percent: 100,
		});
		const after = applyUpdateEvent(
			before,
			{ type: 'error', message: 'offline' },
			NOW + 1000
		);
		expect(after).toEqual(before);
	});

	test('an unknown event leaves the state untouched', () => {
		const before = stateWith({ phase: 'available', version: '3.3.0' });
		const after = applyUpdateEvent(
			before,
			{ type: 'nonsense' } as unknown as { type: 'checking' },
			NOW
		);
		expect(after).toBe(before);
	});
});

describe('shouldCheckNow', () => {
	test('checks when nothing has ever been checked', () => {
		expect(
			shouldCheckNow({ phase: 'idle', checkedAt: null, nowMs: NOW })
		).toBe(true);
	});

	test('holds off inside the interval and allows it after', () => {
		expect(
			shouldCheckNow({
				phase: 'idle',
				checkedAt: NOW - UPDATE_RECHECK_INTERVAL_MS + 1,
				nowMs: NOW,
			})
		).toBe(false);
		expect(
			shouldCheckNow({
				phase: 'idle',
				checkedAt: NOW - UPDATE_RECHECK_INTERVAL_MS,
				nowMs: NOW,
			})
		).toBe(true);
	});

	test('force bypasses the interval', () => {
		expect(
			shouldCheckNow({
				phase: 'idle',
				checkedAt: NOW - 1000,
				nowMs: NOW,
				force: true,
			})
		).toBe(true);
	});

	test('never interrupts a check or a download, even forced', () => {
		for (const phase of ['checking', 'downloading'] as const) {
			expect(
				shouldCheckNow({
					phase,
					checkedAt: null,
					nowMs: NOW,
					force: true,
				})
			).toBe(false);
		}
	});

	test('does not churn while an update is staged and awaiting the user', () => {
		for (const phase of ['available', 'downloaded'] as const) {
			expect(
				shouldCheckNow({
					phase,
					checkedAt: NOW - UPDATE_RECHECK_INTERVAL_MS * 10,
					nowMs: NOW,
					force: true,
				})
			).toBe(false);
		}
	});

	test('re-checks after a previous failure', () => {
		expect(
			shouldCheckNow({
				phase: 'error',
				checkedAt: NOW - UPDATE_RECHECK_INTERVAL_MS,
				nowMs: NOW,
			})
		).toBe(true);
	});
});

describe('canStartDownload', () => {
	test('allows a download of an available update when idle-handed', () => {
		expect(canStartDownload({ phase: 'available', busy: false })).toEqual({
			allowed: true,
			reason: null,
		});
	});

	test('refuses while a capture is running', () => {
		const verdict = canStartDownload({ phase: 'available', busy: true });
		expect(verdict.allowed).toBe(false);
		expect(verdict.reason).toMatch(/capture is in progress/i);
	});

	test('refuses when there is nothing to download', () => {
		expect(canStartDownload({ phase: 'idle', busy: false }).allowed).toBe(
			false
		);
		expect(canStartDownload({ phase: 'error', busy: false }).allowed).toBe(
			false
		);
	});

	test('refuses a second download of the same update', () => {
		expect(
			canStartDownload({ phase: 'downloading', busy: false }).reason
		).toMatch(/already downloading/i);
		expect(
			canStartDownload({ phase: 'downloaded', busy: false }).reason
		).toMatch(/already downloaded/i);
	});
});

describe('canInstallNow', () => {
	test('allows installing a downloaded update', () => {
		expect(canInstallNow({ phase: 'downloaded', busy: false })).toEqual({
			allowed: true,
			reason: null,
		});
	});

	test('refuses mid-capture and says what happens instead', () => {
		const verdict = canInstallNow({ phase: 'downloaded', busy: true });
		expect(verdict.allowed).toBe(false);
		expect(verdict.reason).toMatch(/close the app/i);
	});

	test('refuses when nothing has been downloaded', () => {
		for (const phase of [
			'idle',
			'checking',
			'available',
			'downloading',
			'error',
		] as const) {
			expect(canInstallNow({ phase, busy: false }).allowed).toBe(false);
		}
	});
});

describe('describeUpdate', () => {
	test('distinguishes "not checked yet" from "up to date"', () => {
		expect(describeUpdate(initialUpdateState(), '3.2.2')).toMatch(
			/have not been checked/i
		);
		expect(describeUpdate(stateWith({ checkedAt: NOW }), '3.2.2')).toMatch(
			/latest version \(v3\.2\.2\)/i
		);
	});

	test('names the version and the action for an available update', () => {
		const text = describeUpdate(
			stateWith({ phase: 'available', version: '3.3.0' }),
			'3.2.2'
		);
		expect(text).toContain('v3.3.0');
		expect(text).toMatch(/click to download/i);
	});

	test('shows download percent when there is one', () => {
		expect(
			describeUpdate(
				stateWith({ phase: 'downloading', version: '3.3.0', percent: 62 }),
				'3.2.2'
			)
		).toContain('62%');
		expect(
			describeUpdate(
				stateWith({
					phase: 'downloading',
					version: '3.3.0',
					percent: null,
				}),
				'3.2.2'
			)
		).toMatch(/downloading v3\.3\.0…/i);
	});

	test('explains the install-on-close path while busy', () => {
		expect(
			describeUpdate(
				stateWith({ phase: 'downloaded', version: '3.3.0' }),
				'3.2.2',
				true
			)
		).toMatch(/install when you close the app/i);
		expect(
			describeUpdate(
				stateWith({ phase: 'downloaded', version: '3.3.0' }),
				'3.2.2',
				false
			)
		).toMatch(/click to restart and install/i);
	});

	test('surfaces the error text', () => {
		expect(
			describeUpdate(
				stateWith({ phase: 'error', error: 'offline' }),
				'3.2.2'
			)
		).toContain('offline');
	});

	test('falls back gracefully when the version is unknown', () => {
		expect(
			describeUpdate(stateWith({ phase: 'available' }), '3.2.2')
		).toMatch(/^A new version is available/);
	});
});

describe('shouldShowUpdateBadge', () => {
	test('shows only once there is something the user can act on', () => {
		expect(shouldShowUpdateBadge(stateWith({ phase: 'available' }))).toBe(
			true
		);
		expect(shouldShowUpdateBadge(stateWith({ phase: 'downloading' }))).toBe(
			true
		);
		expect(shouldShowUpdateBadge(stateWith({ phase: 'downloaded' }))).toBe(
			true
		);
	});

	test('stays quiet for idle, checking and error', () => {
		for (const phase of ['idle', 'checking', 'error'] as const) {
			expect(shouldShowUpdateBadge(stateWith({ phase }))).toBe(false);
		}
	});
});
