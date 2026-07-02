import {
	matchesIracingExe,
	formatWindowHandle,
	resolveResizePlacement,
	getIracingWindowDetails,
	getIracingWindowSizeNative,
	getIracingExclusiveFullscreenState,
	isExclusiveFullscreenState,
	QUNS_RUNNING_D3D_FULL_SCREEN,
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
