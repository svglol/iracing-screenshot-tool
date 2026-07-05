// vram-utils.ts now does a module-top createLogger('vram-utils') whose init()
// eagerly resolves the Electron userData dir — which throws under vitest. Mock the
// logger so importing the module (and the pure-helper tests below) don't fail at
// collection. Single coordinated copy across WP-J/WP-E (see planning SUMMARY).
vi.mock('../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

import {
	getVramInfo,
	isValidPdhStatus,
	selectUsedInstance,
} from './vram-utils';

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

// ---------------------------------------------------------------------------
// isValidPdhStatus — pure, no FFI (cq-capture-path#4)
// ---------------------------------------------------------------------------
describe('isValidPdhStatus', () => {
	test('accepts VALID_DATA (0) and NEW_DATA (1)', () => {
		expect(isValidPdhStatus(0)).toBe(true);
		expect(isValidPdhStatus(1)).toBe(true);
	});

	test('rejects other statuses (the old code accepted only 0)', () => {
		expect(isValidPdhStatus(2)).toBe(false);
		expect(isValidPdhStatus(0xc0000000)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// selectUsedInstance — pure adapter-matching (cq-capture-path#1)
// ---------------------------------------------------------------------------
describe('selectUsedInstance', () => {
	const GB = 1024 ** 3;

	test('returns null for an empty instance list', () => {
		expect(selectUsedInstance([], 24 * GB)).toBeNull();
	});

	test('single instance is selected', () => {
		const inst = { instanceName: 'luid_a', bytes: 6 * GB };
		expect(selectUsedInstance([inst], 24 * GB)).toBe(inst);
	});

	test('picks the busiest plausible instance', () => {
		const a = { instanceName: 'luid_a', bytes: 6 * GB };
		const b = { instanceName: 'luid_b', bytes: 12 * GB };
		expect(selectUsedInstance([a, b], 24 * GB)).toBe(b);
	});

	test('excludes a foreign adapter whose usage exceeds total (dual-dGPU false-positive repro)', () => {
		// total = 24GB dGPU; a foreign card reports 33GB used (impossible for THIS
		// card). Old code took 33GB → assessVram freeBytes = max(0, 24-33) = 0 →
		// over-warn. Now the 6GB dGPU instance is selected → free = 18GB.
		const dgpu = { instanceName: 'luid_dgpu', bytes: 6 * GB };
		const foreign = { instanceName: 'luid_foreign', bytes: 33 * GB };
		expect(selectUsedInstance([foreign, dgpu], 24 * GB)).toBe(dgpu);
	});

	test('falls back to the global busiest when total is unknown (0)', () => {
		const a = { instanceName: 'luid_a', bytes: 6 * GB };
		const b = { instanceName: 'luid_b', bytes: 12 * GB };
		expect(selectUsedInstance([a, b], 0)).toBe(b);
	});

	test('falls back to the global busiest if every instance is over-total', () => {
		const a = { instanceName: 'luid_a', bytes: 30 * GB };
		const b = { instanceName: 'luid_b', bytes: 40 * GB };
		expect(selectUsedInstance([a, b], 24 * GB)).toBe(b);
	});
});
