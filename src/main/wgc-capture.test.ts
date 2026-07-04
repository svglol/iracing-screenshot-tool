import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// wgc-capture.ts now creates a module-top logger (createLogger('wgc-capture')),
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
	getWgcUnavailableReason,
	isWgcAvailable,
	getWgcApi,
	captureIracingWindowNative,
	getLastNativeFailureReason,
	__setWgcApiForTests,
} from './wgc-capture';

// ---------------------------------------------------------------------------
// WGC addon load smoke test (Windows only)
//
// Loads the prebuilt native/wgc-capture.node directly (bypassing the electron
// `app`-based path resolver, which isn't available under vitest) and asserts the
// N-API ABI is intact: the addon loads with NO electron-rebuild and exposes the
// two expected functions. This is the packaging guardrail — if the prebuild's
// ABI drifts from the Electron/Node N-API version, this fails loudly here rather
// than silently at capture time.
//
// It deliberately does NOT call captureWindow (that needs a live window HWND and
// spawns a capture thread); it only proves the module loads and isSupported()
// returns a boolean. Non-Windows CI skips it — the .node is win32-x64 only.
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/main/ -> repo root -> native/wgc-capture.node
const addonPath = path.resolve(
	__dirname,
	'..',
	'..',
	'native',
	'wgc-capture.node'
);

describe('wgc-capture addon (native N-API load smoke)', () => {
	test.runIf(process.platform === 'win32')(
		'loads with no electron-rebuild and exposes the expected ABI',
		() => {
			const addon = require(addonPath);
			expect(typeof addon.isSupported).toBe('function');
			expect(typeof addon.captureWindow).toBe('function');
			// IsSupported() must return a plain boolean (true on any Win10 1903+ box,
			// which every dev/CI Windows runner is). Never throws.
			expect(typeof addon.isSupported()).toBe('boolean');
		}
	);
});

// ---------------------------------------------------------------------------
// getWgcUnavailableReason invariant (obs-capture-diagnostics#2)
//
// The failure-time diagnostics rely on: reason === null EXACTLY when WGC is
// available this session, and a concrete non-null string otherwise. The accessor
// is self-initializing (it forces createWgcApi via getWgcApi), so this holds
// regardless of call order — and regardless of platform: under vitest the electron
// `app` shim is absent, so createWgcApi's addon require() fails and WGC reports
// unavailable-with-a-reason, which still satisfies the biconditional.
// ---------------------------------------------------------------------------
describe('getWgcUnavailableReason invariant', () => {
	test('returns a string|null, null iff WGC is available', () => {
		const reason = getWgcUnavailableReason();
		const available = isWgcAvailable();

		expect(reason === null || typeof reason === 'string').toBe(true);
		// The core biconditional: available ⟺ no reason.
		expect(reason === null).toBe(available);
		// When unavailable, the reason must be a non-empty diagnostic string.
		if (!available) {
			expect(typeof reason).toBe('string');
			expect((reason as string).length).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// lastNativeFailureReason state machine (cq-tests#3)
//
// captureIracingWindowNative records WHY the last native grab returned null (or
// null when it succeeded), which the main-process failure diagnostics read to tell
// H1(timeout/no-frame) from H2(alloc/black). This exercises that state machine
// deterministically via the __setWgcApiForTests seam — no real .node, no live
// window. Each case injects the addon state it needs; afterEach restores the lazy
// path so these never leak into the invariant test above or a real capture.
// ---------------------------------------------------------------------------
describe('captureIracingWindowNative failure-reason state machine', () => {
	// A minimal fake addon: captureWindow is supplied per-test; isSupported is
	// present so the shape matches the WgcAddon interface the seam expects.
	function fakeAddon(captureWindow: (hwnd: number, t?: number) => unknown) {
		return {
			isSupported: () => true,
			captureWindow: captureWindow as never,
		};
	}

	afterEach(() => {
		// Restore the lazy createWgcApi path so the injected fake doesn't persist.
		__setWgcApiForTests(undefined);
	});

	test('records a reason and returns null when WGC is unavailable (api null)', () => {
		__setWgcApiForTests(null);
		const result = captureIracingWindowNative(123, 1000);
		expect(result).toBeNull();
		expect(getLastNativeFailureReason()).toBe(
			'wgc-unavailable (missing addon / unsupported OS)'
		);
	});

	test('records the thrown native message on a grab throw, returns null', () => {
		__setWgcApiForTests(
			fakeAddon(() => {
				throw new Error('WGC capture timed out');
			})
		);
		const result = captureIracingWindowNative(123, 1000);
		expect(result).toBeNull();
		expect(getLastNativeFailureReason()).toBe('WGC capture timed out');
	});

	test('resets the reason to null after a successful grab', () => {
		// First fail so there is a stale reason to clear.
		__setWgcApiForTests(
			fakeAddon(() => {
				throw new Error('transient');
			})
		);
		captureIracingWindowNative(1, 1000);
		expect(getLastNativeFailureReason()).toBe('transient');

		// Now succeed: the reason must clear to null.
		const frame = { data: Buffer.alloc(4), width: 1, height: 1 };
		__setWgcApiForTests(fakeAddon(() => frame));
		const result = captureIracingWindowNative(1, 1000);
		expect(result).toBe(frame);
		expect(getLastNativeFailureReason()).toBeNull();
	});

	test('a per-grab throw does NOT null the session addon cache', () => {
		const addon = fakeAddon(() => {
			throw new Error('grab blew up');
		});
		__setWgcApiForTests(addon);
		captureIracingWindowNative(1, 1000);
		// The transient grab failure must leave the addon enabled for the next
		// capture — only a load-time fault (createWgcApi) disables the session.
		expect(getWgcApi()).toBe(addon);
	});
});
