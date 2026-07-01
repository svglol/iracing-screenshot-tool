import {
	matchesIracingExe,
	formatWindowHandle,
	resolveResizePlacement,
	getIracingWindowDetails,
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
