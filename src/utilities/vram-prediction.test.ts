import {
	GiB,
	RESIZE_BYTES_PER_PIXEL,
	vramMarginBytes,
	predictAddedVramBytes,
	assessVram,
	largestSafeResolution,
	formatVramGiB,
} from './vram-prediction';

const P1080 = { width: 1920, height: 1080 };
const P1440 = { width: 2560, height: 1440 };
const P4K = { width: 3840, height: 2160 };
const P8K = { width: 7680, height: 4320 };

// ---------------------------------------------------------------------------
// vramMarginBytes — max(2 GiB floor, 12% of total)
// ---------------------------------------------------------------------------
describe('vramMarginBytes', () => {
	test('uses the 2 GiB floor on small cards (12% < 2 GiB)', () => {
		// 8 GiB * 0.12 = 0.96 GiB < 2 GiB floor
		expect(vramMarginBytes(8 * GiB)).toBe(2 * GiB);
		expect(vramMarginBytes(6 * GiB)).toBe(2 * GiB);
	});

	test('scales to 12% on large cards (12% > 2 GiB)', () => {
		// 24 GiB * 0.12 = 2.88 GiB > 2 GiB
		expect(vramMarginBytes(24 * GiB)).toBeCloseTo(24 * GiB * 0.12, 0);
	});

	test('falls back to the floor for invalid totals', () => {
		expect(vramMarginBytes(0)).toBe(2 * GiB);
		expect(vramMarginBytes(-1)).toBe(2 * GiB);
		expect(vramMarginBytes(NaN)).toBe(2 * GiB);
	});
});

// ---------------------------------------------------------------------------
// predictAddedVramBytes
// ---------------------------------------------------------------------------
describe('predictAddedVramBytes', () => {
	test('counts only the growth in pixel count', () => {
		const grownPx = P4K.width * P4K.height - P1440.width * P1440.height;
		expect(predictAddedVramBytes(P4K, P1440)).toBe(
			grownPx * RESIZE_BYTES_PER_PIXEL
		);
	});

	test('is zero when shrinking or equal', () => {
		expect(predictAddedVramBytes(P1080, P4K)).toBe(0);
		expect(predictAddedVramBytes(P1440, P1440)).toBe(0);
	});

	test('assumes no growth when baseline is unknown (fail-open under-bias)', () => {
		expect(predictAddedVramBytes(P4K, null)).toBe(0);
		expect(predictAddedVramBytes(P4K, { width: 0, height: 0 })).toBe(0);
		expect(predictAddedVramBytes(P4K)).toBe(0);
	});

	test('is zero for an invalid target', () => {
		expect(predictAddedVramBytes({ width: 0, height: 0 }, P1440)).toBe(0);
		expect(predictAddedVramBytes({ width: -5, height: 100 }, P1440)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// assessVram — tiers
// ---------------------------------------------------------------------------
describe('assessVram', () => {
	test('safe: fits with the full margin to spare', () => {
		const info = {
			totalBytes: 8 * GiB,
			usedBytes: 2 * GiB,
			source: 'native' as const,
		};
		const a = assessVram(info, P4K, P1440);
		expect(a.tier).toBe('safe');
		expect(a.freeBytes).toBe(6 * GiB);
		expect(a.marginBytes).toBe(2 * GiB);
		expect(a.deltaBytes).toBe(predictAddedVramBytes(P4K, P1440));
	});

	test('caution: fits but eats into the margin', () => {
		// free = 2.5 GiB; 8K delta ≈ 0.88 GiB (< free) but delta + 2 GiB margin > free
		const info = {
			totalBytes: 8 * GiB,
			usedBytes: 5.5 * GiB,
			source: 'native' as const,
		};
		const a = assessVram(info, P8K, P1440);
		expect(a.tier).toBe('caution');
		expect(a.deltaBytes).toBeLessThan(a.freeBytes as number);
		expect(a.deltaBytes + (a.marginBytes as number)).toBeGreaterThan(
			a.freeBytes as number
		);
	});

	test('risk: added surfaces alone exceed free VRAM', () => {
		// free = 500 MiB; 8K delta ≈ 0.88 GiB > free
		const info = {
			totalBytes: 8 * GiB,
			usedBytes: 8 * GiB - 500 * 1024 * 1024,
			source: 'native' as const,
		};
		const a = assessVram(info, P8K, P1440);
		expect(a.tier).toBe('risk');
		expect(a.deltaBytes).toBeGreaterThan(a.freeBytes as number);
	});

	test('an already-full GPU is caution/risk even for a same-size resize', () => {
		// used = total - 1 GiB, delta 0 (target == baseline). free 1 GiB < margin.
		const info = {
			totalBytes: 8 * GiB,
			usedBytes: 7 * GiB,
			source: 'native' as const,
		};
		const a = assessVram(info, P1440, P1440);
		expect(a.deltaBytes).toBe(0);
		expect(a.tier).toBe('caution');
	});

	test('unknown: no info, no total, or null usage → fail open', () => {
		expect(assessVram(null, P4K, P1440).tier).toBe('unknown');
		expect(
			assessVram(
				{ totalBytes: 0, usedBytes: 2 * GiB, source: 'native' },
				P4K,
				P1440
			).tier
		).toBe('unknown');
		const nullUsed = assessVram(
			{ totalBytes: 8 * GiB, usedBytes: null, source: 'native' },
			P4K,
			P1440
		);
		expect(nullUsed.tier).toBe('unknown');
		expect(nullUsed.freeBytes).toBeNull();
		// margin is still derivable from a known total
		expect(nullUsed.marginBytes).toBe(2 * GiB);
	});
});

// ---------------------------------------------------------------------------
// largestSafeResolution
// ---------------------------------------------------------------------------
describe('largestSafeResolution', () => {
	const presets = [
		{ label: '1080p', dimensions: P1080 },
		{ label: '2k', dimensions: P1440 },
		{ label: '4k', dimensions: P4K },
		{ label: '8k', dimensions: P8K },
	];

	test('returns the biggest preset that assesses safe', () => {
		// free 2.5 GiB: 4k is safe, 8k is only caution → expect 4k
		const info = {
			totalBytes: 8 * GiB,
			usedBytes: 5.5 * GiB,
			source: 'native' as const,
		};
		expect(largestSafeResolution(presets, info, P1440)?.label).toBe('4k');
	});

	test('returns null when nothing is safe', () => {
		const info = {
			totalBytes: 8 * GiB,
			usedBytes: 8 * GiB - 100 * 1024 * 1024,
			source: 'native' as const,
		};
		expect(largestSafeResolution(presets, info, P1440)).toBeNull();
	});

	test('returns null when VRAM info is unknown', () => {
		expect(largestSafeResolution(presets, null, P1440)).toBeNull();
		expect(
			largestSafeResolution(
				presets,
				{ totalBytes: 8 * GiB, usedBytes: null, source: 'native' },
				P1440
			)
		).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// formatVramGiB
// ---------------------------------------------------------------------------
describe('formatVramGiB', () => {
	test('formats bytes as GiB with one decimal', () => {
		expect(formatVramGiB(6 * GiB)).toBe('6.0 GB');
		expect(formatVramGiB(2.5 * GiB)).toBe('2.5 GB');
		expect(formatVramGiB(24 * GiB)).toBe('24.0 GB');
	});

	test('handles zero/invalid input', () => {
		expect(formatVramGiB(0)).toBe('0 GB');
		expect(formatVramGiB(null)).toBe('0 GB');
		expect(formatVramGiB(undefined)).toBe('0 GB');
		expect(formatVramGiB(-5)).toBe('0 GB');
	});
});
