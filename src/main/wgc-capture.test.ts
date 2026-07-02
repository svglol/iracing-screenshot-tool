import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
