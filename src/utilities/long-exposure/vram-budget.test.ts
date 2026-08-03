import { describe, expect, it } from 'vitest';
import { GiB, type VramInfo } from '../vram-prediction';
import {
	ACCUMULATOR_BYTES_PER_PIXEL,
	INTERPOLATION_BYTES_PER_PIXEL,
	assessLongExposureVram,
	estimateLongExposureVram,
} from './vram-budget';

const info = (totalGiB: number, usedGiB: number | null): VramInfo => ({
	totalBytes: totalGiB * GiB,
	usedBytes: usedGiB === null ? null : usedGiB * GiB,
	source: 'native',
	adapterName: 'Test GPU',
});

describe('estimateLongExposureVram', () => {
	it('sizes the accumulator at 16 bytes per pixel per sink', () => {
		const estimate = estimateLongExposureVram({
			renderWidth: 1920,
			renderHeight: 1080,
			sinkCount: 1,
		});
		expect(estimate.accumulatorBytes).toBe(
			1920 * 1080 * ACCUMULATOR_BYTES_PER_PIXEL
		);
	});

	// The structural win over the reference implementation: memory scales with the
	// number of SINKS, never with the number of samples. There is no sample-count
	// input to this function at all.
	it('scales with sink count, not sample count', () => {
		const one = estimateLongExposureVram({
			renderWidth: 1920,
			renderHeight: 1080,
			sinkCount: 1,
		});
		const ten = estimateLongExposureVram({
			renderWidth: 1920,
			renderHeight: 1080,
			sinkCount: 10,
		});
		expect(ten.accumulatorBytes).toBe(one.accumulatorBytes * 10);
	});

	// Doubling each axis quadruples the cost. This used to be reachable via a 2x
	// supersample and is now reachable by moving up the Resolution ladder, which is
	// the same arithmetic with the trade made visible instead of hidden behind a
	// switch.
	it('costs 4x when each axis doubles', () => {
		const plain = estimateLongExposureVram({
			renderWidth: 3840,
			renderHeight: 2160,
			sinkCount: 1,
		});
		const doubled = estimateLongExposureVram({
			renderWidth: 7680,
			renderHeight: 4320,
			sinkCount: 1,
		});
		expect(doubled.accumulatorBytes).toBe(plain.accumulatorBytes * 4);
		// 7680x4320 is ~506 MB — the figure quoted in the design note.
		expect(doubled.accumulatorBytes / (1024 * 1024)).toBeCloseTo(506.25, 1);
	});

	it('includes iRacing own predicted resize growth separately from ours', () => {
		const estimate = estimateLongExposureVram({
			renderWidth: 3840,
			renderHeight: 2160,
			sinkCount: 1,
			baseline: { width: 1920, height: 1080 },
		});
		expect(estimate.simResizeBytes).toBeGreaterThan(0);
		expect(estimate.combinedBytes).toBe(
			estimate.ourTotalBytes + estimate.simResizeBytes
		);
	});

	it('treats a missing baseline as no sim growth rather than guessing', () => {
		expect(
			estimateLongExposureVram({
				renderWidth: 3840,
				renderHeight: 2160,
				sinkCount: 1,
				baseline: null,
			}).simResizeBytes
		).toBe(0);
	});

	it('never divides by zero on a degenerate sink count', () => {
		expect(
			estimateLongExposureVram({
				renderWidth: 100,
				renderHeight: 100,
				sinkCount: 0,
			}).accumulatorBytes
		).toBe(100 * 100 * ACCUMULATOR_BYTES_PER_PIXEL);
	});
});

describe('estimateLongExposureVram — frame interpolation surfaces', () => {
	it('allocates nothing extra when interpolation is off', () => {
		for (const interpolationFactor of [undefined, 1]) {
			const estimate = estimateLongExposureVram({
				renderWidth: 1920,
				renderHeight: 1080,
				sinkCount: 1,
				interpolationFactor,
			});
			expect(estimate.interpolationBytes).toBe(0);
		}
	});

	it('adds the retained frame and both luma planes when it is on', () => {
		const estimate = estimateLongExposureVram({
			renderWidth: 5120,
			renderHeight: 2880,
			sinkCount: 1,
			interpolationFactor: 4,
		});
		expect(estimate.interpolationBytes).toBe(
			5120 * 2880 * INTERPOLATION_BYTES_PER_PIXEL
		);
		expect(estimate.ourTotalBytes).toBe(
			estimate.accumulatorBytes +
				estimate.workingBytes +
				estimate.interpolationBytes
		);
	});

	// The warp reads two retained frames and writes straight into the accumulator, so
	// there is no per-synthetic-sample buffer. Factor 8 costs exactly what factor 2
	// does — worth pinning, because assuming otherwise would over-refuse big shots.
	it('costs the same at every factor above 1', () => {
		const at = (interpolationFactor: number) =>
			estimateLongExposureVram({
				renderWidth: 2560,
				renderHeight: 1440,
				sinkCount: 1,
				interpolationFactor,
			}).interpolationBytes;
		expect(at(2)).toBe(at(4));
		expect(at(4)).toBe(at(8));
		expect(at(2)).toBeGreaterThan(0);
	});

	// The interpolation surfaces are ours and deterministic, exactly like the
	// accumulators, so they belong inside the number we are willing to hard-refuse on.
	it('counts toward the hard-refuse total', () => {
		const common = {
			renderWidth: 7680,
			renderHeight: 4320,
			sinkCount: 1,
			info: info(8, 1),
		};
		const off = assessLongExposureVram({ ...common, interpolationFactor: 1 });
		const on = assessLongExposureVram({ ...common, interpolationFactor: 4 });
		expect(on.estimate.ourTotalBytes).toBeGreaterThan(
			off.estimate.ourTotalBytes
		);
	});
});

describe('assessLongExposureVram', () => {
	// We refuse only on OUR OWN allocation, which is deterministic and ours to be
	// honest about — unlike iRacing's, where the existing policy is warn-not-block.
	it('hard-refuses when our own buffers cannot fit in free VRAM', () => {
		const result = assessLongExposureVram({
			info: info(8, 7.5),
			renderWidth: 7680,
			renderHeight: 4320,
			sinkCount: 1,
		});
		expect(result.refuse).toBe(true);
		expect(result.tier).toBe('risk');
		expect(result.refusalMessage).toMatch(/video memory/);
		// The message must name the way out, not just the problem.
		expect(result.refusalMessage).toMatch(/supersampling|resolution/);
	});

	it('allows a shot that fits comfortably', () => {
		const result = assessLongExposureVram({
			info: info(24, 4),
			renderWidth: 1920,
			renderHeight: 1080,
			sinkCount: 1,
			baseline: { width: 1920, height: 1080 },
		});
		expect(result.refuse).toBe(false);
		expect(result.tier).toBe('safe');
	});

	// Fail open: never refuse on a guess. This mirrors the still-capture guardrail.
	it('never refuses when VRAM cannot be measured', () => {
		for (const measurement of [
			null,
			info(0, 1),
			info(8, null),
		] as (VramInfo | null)[]) {
			const result = assessLongExposureVram({
				info: measurement,
				renderWidth: 7680,
				renderHeight: 4320,
				sinkCount: 4,
			});
			expect(result.refuse).toBe(false);
			expect(result.tier).toBe('unknown');
			expect(result.refusalMessage).toBeNull();
		}
	});

	it('escalates a safe resize to caution when our buffers eat the margin', () => {
		// The resize alone costs nothing (render size == baseline), so the existing
		// predictor calls this 'safe'. Our ~530 MB of accumulator + working surfaces
		// is invisible to it, and pushes the total past the safety margin — which is
		// exactly the gap this module exists to close.
		const result = assessLongExposureVram({
			info: info(8, 5.6),
			renderWidth: 5120,
			renderHeight: 2880,
			sinkCount: 1,
			baseline: { width: 5120, height: 2880 },
		});
		expect(result.refuse).toBe(false);
		expect(result.tier).toBe('caution');
	});

	it('reports the estimate alongside the verdict so the UI can explain itself', () => {
		const result = assessLongExposureVram({
			info: info(16, 4),
			renderWidth: 2560,
			renderHeight: 1440,
			sinkCount: 1,
		});
		expect(result.estimate.accumulatorBytes).toBeGreaterThan(0);
		expect(result.freeBytes).toBeGreaterThan(0);
	});
});
