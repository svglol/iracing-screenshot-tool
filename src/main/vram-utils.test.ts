import { getVramInfo } from './vram-utils';

// ---------------------------------------------------------------------------
// getVramInfo — end-to-end smoke (Windows only)
//
// Exercises the real koffi FFI chain (advapi32 registry enum + PDH GPU counter)
// without needing iRacing running. Asserts the returned shape and that it never
// throws — a malformed FFI prototype would otherwise be masked by the fail-open
// path. On a machine with a GPU (dev/CI-with-GPU) totalBytes should be > 0 and
// source 'native'; where the registry read can't resolve a dGPU it must degrade
// to source 'fallback' with totalBytes 0 (predictor then fails open).
// ---------------------------------------------------------------------------
describe('getVramInfo (native FFI smoke)', () => {
	test.runIf(process.platform === 'win32')(
		'returns a well-formed VramInfo and never throws',
		() => {
			const info = getVramInfo();
			expect(info).toBeTruthy();
			expect(typeof info.totalBytes).toBe('number');
			expect(info.totalBytes).toBeGreaterThanOrEqual(0);
			expect(
				info.usedBytes === null || typeof info.usedBytes === 'number'
			).toBe(true);
			if (typeof info.usedBytes === 'number') {
				expect(info.usedBytes).toBeGreaterThanOrEqual(0);
			}
			expect(['native', 'fallback']).toContain(info.source);
			expect(typeof info.adapterName).toBe('string');
			// A real total implies a native read with a named adapter.
			if (info.source === 'native') {
				expect(info.totalBytes).toBeGreaterThan(0);
			}
		}
	);

	test.runIf(process.platform === 'win32')(
		'is stable across repeated calls (total cache path)',
		() => {
			const a = getVramInfo();
			const b = getVramInfo();
			expect(a.totalBytes).toBe(b.totalBytes);
			expect(a.source).toBe(b.source);
		}
	);
});
