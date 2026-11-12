// window-utils.ts now creates a module-top logger (createLogger('window-utils')),
// whose eager init() calls electron app.getPath() — undefined under vitest. Mock
// the logger so importing the module under test doesn't throw at collection time.
vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

import {
	matchesIracingExe,
	formatWindowHandle,
	resolveResizePlacement,
	getIracingWindowDetails,
	getIracingWindowSizeNative,
	getIracingExclusiveFullscreenState,
	isExclusiveFullscreenState,
	QUNS_RUNNING_D3D_FULL_SCREEN,
	classifyAccessProbe,
	ERROR_ACCESS_DENIED,
	isIracingWindowAccessDenied,
	parseIntegrityRid,
	integrityName,
	compareProcessRights,
	runsAsAdministrator,
	getProcessRights,
	getIracingProcessRights,
	INTEGRITY_HIGH,
	INTEGRITY_MEDIUM,
	type ProcessRights,
} from './window-utils';

// SetWindowPos uFlags (mirrors the private constants in window-utils.ts)
const SWP_NOZORDER = 0x0004;
const SWP_NOACTIVATE = 0x0010;
const SWP_NOSENDCHANGING = 0x0400;

// ---------------------------------------------------------------------------
// matchesIracingExe
// ---------------------------------------------------------------------------
describe('matchesIracingExe', () => {
	test('matches the exact iRacing image name', () => {
		expect(matchesIracingExe('iRacingSim64DX11.exe')).toBe(true);
	});

	test('is case-insensitive (Windows file names are)', () => {
		expect(matchesIracingExe('iracingsim64dx11.exe')).toBe(true);
		expect(matchesIracingExe('IRACINGSIM64DX11.EXE')).toBe(true);
	});

	test('requires the .exe suffix Toolhelp reports', () => {
		expect(matchesIracingExe('iRacingSim64DX11')).toBe(false);
	});

	test('rejects other processes', () => {
		expect(matchesIracingExe('iRacingUI.exe')).toBe(false);
		expect(matchesIracingExe('explorer.exe')).toBe(false);
		expect(matchesIracingExe('')).toBe(false);
	});

	test('rejects non-string input', () => {
		expect(matchesIracingExe(null)).toBe(false);
		expect(matchesIracingExe(undefined)).toBe(false);
		expect(matchesIracingExe(42)).toBe(false);
		expect(matchesIracingExe({})).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// formatWindowHandle
// ---------------------------------------------------------------------------
describe('formatWindowHandle', () => {
	test('formats a BigInt handle as a base-10 string', () => {
		expect(formatWindowHandle(1117784n)).toBe('1117784');
		expect(formatWindowHandle(0n)).toBe('0');
	});

	test('formats a numeric handle as a base-10 string', () => {
		expect(formatWindowHandle(1117784)).toBe('1117784');
	});

	test('preserves precision beyond Number.MAX_SAFE_INTEGER for BigInt', () => {
		// A 64-bit pointer value that would lose precision as a JS number; the
		// desktopCapturer source id must carry the exact decimal.
		expect(formatWindowHandle(9007199254740993n)).toBe('9007199254740993');
	});

	test('truncates fractional numeric input', () => {
		expect(formatWindowHandle(42.9)).toBe('42');
	});
});

// ---------------------------------------------------------------------------
// resolveResizePlacement
// ---------------------------------------------------------------------------
describe('resolveResizePlacement', () => {
	test('pre-capture (raise) inserts at HWND_TOP and activates', () => {
		const { insertAfter, flags } = resolveResizePlacement(true);
		expect(insertAfter).toBe(0); // HWND_TOP
		expect(flags).toBe(SWP_NOSENDCHANGING);
		// No SWP_NOACTIVATE — the window is meant to come to the foreground.
		expect(flags & SWP_NOACTIVATE).toBe(0);
	});

	test('restore inserts at HWND_NOTOPMOST without stealing focus or z-order', () => {
		const { insertAfter, flags } = resolveResizePlacement(false);
		expect(insertAfter).toBe(-2); // HWND_NOTOPMOST
		expect(flags).toBe(SWP_NOACTIVATE | SWP_NOZORDER | SWP_NOSENDCHANGING);
		// Restore must NOT activate and must NOT touch the Z-order.
		expect(flags & SWP_NOACTIVATE).toBe(SWP_NOACTIVATE);
		expect(flags & SWP_NOZORDER).toBe(SWP_NOZORDER);
	});

	test('both policies suppress WM_WINDOWPOSCHANGING clamping', () => {
		expect(resolveResizePlacement(true).flags & SWP_NOSENDCHANGING).toBe(
			SWP_NOSENDCHANGING
		);
		expect(resolveResizePlacement(false).flags & SWP_NOSENDCHANGING).toBe(
			SWP_NOSENDCHANGING
		);
	});
});

// ---------------------------------------------------------------------------
// getIracingWindowDetails — end-to-end smoke (Windows only)
//
// Exercises the real koffi FFI chain (koffi.load + Toolhelp process enumeration
// + EnumWindows + GetWindowRect) without needing iRacing to be running. iRacing
// is normally absent in CI/dev, so undefined is the expected result; if it does
// happen to be running, assert the returned shape instead. Either way the call
// must not throw — proving the FFI layer (or its PowerShell fallback) is sound.
// ---------------------------------------------------------------------------
describe('getIracingWindowDetails (native FFI smoke)', () => {
	test.runIf(process.platform === 'win32')(
		'returns undefined or a well-formed detail object, never throws',
		() => {
			const details = getIracingWindowDetails();
			if (details === undefined) {
				expect(details).toBeUndefined();
				return;
			}
			expect(typeof details.handle).toBe('string');
			expect(details.handle.length).toBeGreaterThan(0);
			expect(typeof details.title).toBe('string');
			expect(Number.isFinite(details.left)).toBe(true);
			expect(Number.isFinite(details.top)).toBe(true);
			expect(Number.isFinite(details.width)).toBe(true);
			expect(Number.isFinite(details.height)).toBe(true);
		}
	);
});

// ---------------------------------------------------------------------------
// isExclusiveFullscreenState — the pure #10 classifier
// ---------------------------------------------------------------------------
describe('isExclusiveFullscreenState', () => {
	const S_OK = 0;

	test('flags only S_OK + QUNS_RUNNING_D3D_FULL_SCREEN + attributed', () => {
		expect(
			isExclusiveFullscreenState(S_OK, QUNS_RUNNING_D3D_FULL_SCREEN, true)
		).toBe(true);
	});

	test('does NOT flag borderless / flip-model (QUNS_BUSY = 2)', () => {
		// The critical false-positive guard: borderless/FSO is composited and
		// captures fine, so state 2 must never be treated as exclusive.
		expect(isExclusiveFullscreenState(S_OK, 2, true)).toBe(false);
	});

	test('does NOT flag a normal windowed desktop (QUNS_ACCEPTS_NOTIFICATIONS = 5)', () => {
		expect(isExclusiveFullscreenState(S_OK, 5, true)).toBe(false);
	});

	test('does NOT flag when the read failed (hr !== S_OK)', () => {
		expect(
			isExclusiveFullscreenState(1, QUNS_RUNNING_D3D_FULL_SCREEN, true)
		).toBe(false);
	});

	test('does NOT flag when unattributed (some OTHER app is fullscreen)', () => {
		expect(
			isExclusiveFullscreenState(S_OK, QUNS_RUNNING_D3D_FULL_SCREEN, false)
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getIracingWindowSizeNative — koffi-only baseline read (Windows only)
//
// The VRAM guardrail's baseline read: it must go through the in-process koffi
// path ONLY (never the DPI-unaware, main-thread-blocking PowerShell fallback)
// and fail open to null. With iRacing absent (the CI/dev norm) it returns null;
// if iRacing is running it returns a positive {width,height}. It must never
// throw and never return a non-positive dimension.
// ---------------------------------------------------------------------------
describe('getIracingWindowSizeNative (koffi-only baseline)', () => {
	test.runIf(process.platform === 'win32')(
		'returns null or a positive {width,height}, never throws',
		() => {
			const size = getIracingWindowSizeNative();
			if (size === null) {
				expect(size).toBeNull();
				return;
			}
			expect(size.width).toBeGreaterThan(0);
			expect(size.height).toBeGreaterThan(0);
			expect(Number.isFinite(size.width)).toBe(true);
			expect(Number.isFinite(size.height)).toBe(true);
		}
	);
});

// ---------------------------------------------------------------------------
// iRacing running as administrator — the access probe's verdict
// ---------------------------------------------------------------------------
describe('classifyAccessProbe', () => {
	test('a resize Windows allowed is not denied', () => {
		expect(classifyAccessProbe(true, 0)).toBe(false);
		// GetLastError is stale on success and must not be read as a refusal.
		expect(classifyAccessProbe(true, ERROR_ACCESS_DENIED)).toBe(false);
	});

	test('ERROR_ACCESS_DENIED is the UIPI refusal (both field logs: lastError 5)', () => {
		expect(ERROR_ACCESS_DENIED).toBe(5);
		expect(classifyAccessProbe(false, 5)).toBe(true);
	});

	test('any other failure is unknown, so nothing is refused on it', () => {
		// 0 = koffi lost GetLastError; 1400 = ERROR_INVALID_WINDOW_HANDLE.
		expect(classifyAccessProbe(false, 0)).toBeNull();
		expect(classifyAccessProbe(false, 1400)).toBeNull();
	});
});

describe('isIracingWindowAccessDenied (native FFI smoke)', () => {
	test.runIf(process.platform === 'win32')(
		'returns null when iRacing is absent, a boolean otherwise, never throws',
		() => {
			const denied = isIracingWindowAccessDenied();
			expect(denied === null || typeof denied === 'boolean').toBe(true);
		}
	);
});

// ---------------------------------------------------------------------------
// Process rights
// ---------------------------------------------------------------------------
describe('parseIntegrityRid', () => {
	// TOKEN_MANDATORY_LABEL buffers read on the dev machine (2026-11-12): the
	// label's SID pointer (8 bytes), Attributes (4) + padding, then S-1-16-<rid>.
	const medium = Buffer.from(
		'80537571ca0100006000000000000000010100000000001000200000',
		'hex'
	);
	const high = Buffer.from(
		'e04c8671ca0100006000000000000000010100000000001000300000',
		'hex'
	);

	test('reads the RID of a real normal and a real elevated process', () => {
		expect(parseIntegrityRid(medium, medium.length)).toBe(INTEGRITY_MEDIUM);
		expect(parseIntegrityRid(high, high.length)).toBe(INTEGRITY_HIGH);
	});

	test('only within the length Windows reported', () => {
		expect(parseIntegrityRid(high, 20)).toBeNull();
		expect(parseIntegrityRid(Buffer.alloc(28), 28)).toBeNull();
	});
});

describe('integrityName', () => {
	test('names the levels', () => {
		expect(integrityName(0x1000)).toBe('low');
		expect(integrityName(0x2000)).toBe('medium');
		expect(integrityName(0x2100)).toBe('medium');
		expect(integrityName(0x3000)).toBe('high');
		expect(integrityName(0x4000)).toBe('system');
		expect(integrityName(null)).toBeNull();
	});
});

describe('compareProcessRights', () => {
	const rights = (
		elevated: boolean | null,
		integrity: number | null
	): ProcessRights => ({ elevated, integrity, error: null });
	const normal = rights(false, INTEGRITY_MEDIUM);
	const admin = rights(true, INTEGRITY_HIGH);
	const unreadable: ProcessRights = {
		elevated: null,
		integrity: null,
		error: 'open-token:5',
	};

	test('all four combinations of tool and iRacing', () => {
		expect(compareProcessRights(normal, normal)).toBe('same');
		expect(compareProcessRights(normal, admin)).toBe('iracing-higher');
		expect(compareProcessRights(admin, normal)).toBe('tool-higher');
		expect(compareProcessRights(admin, admin)).toBe('same');
	});

	test('integrity decides over the elevated flag (UIPI compares levels)', () => {
		// Elevated by flag but at the same level: UIPI lets the calls through.
		expect(compareProcessRights(normal, rights(true, INTEGRITY_MEDIUM))).toBe(
			'same'
		);
	});

	test('the flags stand in for an unreadable level', () => {
		expect(compareProcessRights(normal, rights(true, null))).toBe(
			'iracing-higher'
		);
	});

	test('an unreadable iRacing is unknown, never "same"', () => {
		expect(compareProcessRights(normal, unreadable)).toBe('unknown');
	});

	test('runsAsAdministrator reads the flag, else the level', () => {
		expect(runsAsAdministrator(admin)).toBe(true);
		expect(runsAsAdministrator(rights(null, INTEGRITY_HIGH))).toBe(true);
		expect(runsAsAdministrator(rights(null, INTEGRITY_MEDIUM))).toBe(false);
		expect(runsAsAdministrator(unreadable)).toBeNull();
	});
});

describe('process rights (native FFI smoke)', () => {
	test.runIf(process.platform === 'win32')(
		'reads this process the way it reads iRacing',
		() => {
			const self = getProcessRights(process.pid);
			if (self === null) {
				return; // koffi unavailable
			}
			expect(self.error).toBeNull();
			expect(typeof self.elevated).toBe('boolean');
			// Whatever this machine runs the tests as, the flag and the level agree.
			expect(self.integrity).toBe(
				self.elevated ? INTEGRITY_HIGH : INTEGRITY_MEDIUM
			);
		}
	);

	test.runIf(process.platform === 'win32')(
		'iRacing: null when absent, a well-formed report otherwise',
		() => {
			const report = getIracingProcessRights();
			if (report === null) {
				return;
			}
			expect(report.iracing.pid).toBeGreaterThan(0);
			expect(['same', 'iracing-higher', 'tool-higher', 'unknown']).toContain(
				report.verdict
			);
		}
	);
});

// ---------------------------------------------------------------------------
// getIracingExclusiveFullscreenState — koffi SHQueryUserNotificationState smoke
//
// Exercises the real shell32 + user32 FFI chain. iRacing is normally absent in
// CI/dev so null is expected; if it resolves, the shape must be well-formed and
// never throw. With no D3D-exclusive app running, exclusiveFullscreen is false.
// ---------------------------------------------------------------------------
describe('getIracingExclusiveFullscreenState (native FFI smoke)', () => {
	test.runIf(process.platform === 'win32')(
		'returns null or a well-formed state object, never throws',
		() => {
			const result = getIracingExclusiveFullscreenState();
			if (result === null) {
				expect(result).toBeNull();
				return;
			}
			expect(typeof result.state).toBe('number');
			expect(typeof result.attributed).toBe('boolean');
			expect(typeof result.exclusiveFullscreen).toBe('boolean');
			// The dev/CI machine isn't running an exclusive-fullscreen D3D app.
			expect(result.exclusiveFullscreen).toBe(false);
		}
	);
});
