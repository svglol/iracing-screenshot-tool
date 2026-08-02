import { describe, expect, it } from 'vitest';
import {
	ASSUMED_RENDER_FPS,
	EASE_EXPONENT,
	PLAYBACK_DIVISORS,
	REPLAY_FRAMES_PER_SECOND,
	SHUTTER_LADDER,
	TAPER_FLOOR,
	exposureSecondsForFrames,
	findShutterStop,
	framesForExposure,
	isWeightingCurve,
	nearestPlaybackDivisor,
	predictSampleCount,
	predictWallClockSeconds,
	shutterStopsAtOrFaster,
	solvePlaybackDivisor,
	usableRenderFps,
	weightAt,
	windowPosition,
} from './exposure-math';

describe('SHUTTER_LADDER', () => {
	// The parameter vocabulary has to match JRT's or users can't carry their
	// instincts across; each stop doubles the reference tool's sample count.
	it('reproduces the JRT ladder from 1/1000 to 0.5"', () => {
		const keys = SHUTTER_LADDER.map((stop) => stop.key);
		expect(keys.slice(0, 10)).toEqual([
			'1/1000',
			'1/500',
			'1/250',
			'1/125',
			'1/60',
			'1/30',
			'1/15',
			'1/8',
			'1/4',
			'0.5',
		]);
	});

	it('doubles the reference sample count at every stop', () => {
		for (let i = 1; i < SHUTTER_LADDER.length; i += 1) {
			expect(SHUTTER_LADDER[i].jrtSamples).toBe(
				SHUTTER_LADDER[i - 1].jrtSamples * 2
			);
		}
	});

	it('is ordered fastest shutter first', () => {
		for (let i = 1; i < SHUTTER_LADDER.length; i += 1) {
			expect(SHUTTER_LADDER[i].seconds).toBeGreaterThan(
				SHUTTER_LADDER[i - 1].seconds
			);
		}
	});

	it('goes past the reference ceiling with a 1-second stop', () => {
		expect(findShutterStop('1')?.seconds).toBe(1);
	});
});

describe('findShutterStop', () => {
	it('resolves a known key', () => {
		expect(findShutterStop('1/8')?.seconds).toBeCloseTo(0.125);
	});

	it('returns null for unknown or absent keys', () => {
		expect(findShutterStop('1/3')).toBeNull();
		expect(findShutterStop(null)).toBeNull();
		expect(findShutterStop(undefined)).toBeNull();
		expect(findShutterStop('')).toBeNull();
	});
});

describe('shutterStopsAtOrFaster', () => {
	// The bracket set: with a trailing window every faster shutter is the tail
	// subset of the samples already flowing.
	it('returns the stop plus every faster one, slowest first', () => {
		expect(shutterStopsAtOrFaster('1/60').map((s) => s.key)).toEqual([
			'1/60',
			'1/125',
			'1/250',
			'1/500',
			'1/1000',
		]);
	});

	it('returns just the fastest stop for 1/1000', () => {
		expect(shutterStopsAtOrFaster('1/1000').map((s) => s.key)).toEqual([
			'1/1000',
		]);
	});

	it('returns nothing for an unknown key', () => {
		expect(shutterStopsAtOrFaster('nope')).toEqual([]);
	});
});

describe('framesForExposure', () => {
	it('converts seconds to 60 Hz replay frames', () => {
		expect(framesForExposure(1)).toBe(REPLAY_FRAMES_PER_SECOND);
		expect(framesForExposure(0.5)).toBe(30);
		expect(framesForExposure(0.125)).toBe(8);
	});

	// A shutter faster than one replay frame collapses to a single sample — no
	// blur — which is JRT's 1/1000 = 1 sample rung.
	it('never returns fewer than one frame', () => {
		expect(framesForExposure(1 / 1000)).toBe(1);
		expect(framesForExposure(1 / 60)).toBe(1);
		expect(framesForExposure(0)).toBe(1);
		expect(framesForExposure(-5)).toBe(1);
		expect(framesForExposure(NaN)).toBe(1);
	});

	it('round-trips through exposureSecondsForFrames', () => {
		expect(exposureSecondsForFrames(framesForExposure(0.5))).toBeCloseTo(0.5);
		// 1/8 s is 7.5 frames, quantised to 8 — reported honestly as 0.1333 s.
		expect(exposureSecondsForFrames(framesForExposure(0.125))).toBeCloseTo(
			8 / 60
		);
	});
});

describe('usableRenderFps', () => {
	it('passes a plausible reading through', () => {
		expect(usableRenderFps(120)).toBe(120);
	});

	it('falls back to the assumed rate when absent or nonsensical', () => {
		expect(usableRenderFps(undefined)).toBe(ASSUMED_RENDER_FPS);
		expect(usableRenderFps(null)).toBe(ASSUMED_RENDER_FPS);
		expect(usableRenderFps(0)).toBe(ASSUMED_RENDER_FPS);
		expect(usableRenderFps(-1)).toBe(ASSUMED_RENDER_FPS);
		expect(usableRenderFps('60')).toBe(ASSUMED_RENDER_FPS);
	});

	// A transient 5 fps or a 900 fps menu reading would otherwise pick an absurd
	// playback speed.
	it('clamps extremes into a usable band', () => {
		expect(usableRenderFps(5)).toBe(30);
		expect(usableRenderFps(900)).toBe(360);
	});
});

describe('predictSampleCount', () => {
	// The identity the whole design rests on: S = T x R x P.
	it('is exposure x render rate x playback divisor', () => {
		expect(
			predictSampleCount({
				exposureSeconds: 0.5,
				renderFps: 60,
				playbackDivisor: 16,
			})
		).toBe(480);
		expect(
			predictSampleCount({
				exposureSeconds: 1,
				renderFps: 120,
				playbackDivisor: 16,
			})
		).toBe(1920);
	});

	// Past JRT's 512 ceiling with real interpolated geometry, not synthesised
	// in-betweens.
	it('exceeds the reference tool ceiling at 1/16 speed', () => {
		expect(
			predictSampleCount({
				exposureSeconds: 1,
				renderFps: 60,
				playbackDivisor: 16,
			})
		).toBeGreaterThan(512);
	});

	it('never returns fewer than one sample', () => {
		expect(
			predictSampleCount({
				exposureSeconds: 0.001,
				renderFps: 60,
				playbackDivisor: 1,
			})
		).toBe(1);
		expect(
			predictSampleCount({
				exposureSeconds: NaN,
				renderFps: 60,
				playbackDivisor: 1,
			})
		).toBe(1);
	});
});

describe('predictWallClockSeconds', () => {
	// The real cost of a big sample count in this design is patience, not memory.
	it('is exposure x playback divisor', () => {
		expect(
			predictWallClockSeconds({ exposureSeconds: 1, playbackDivisor: 16 })
		).toBe(16);
		expect(
			predictWallClockSeconds({ exposureSeconds: 0.125, playbackDivisor: 8 })
		).toBe(1);
	});

	it('returns 0 for nonsense input rather than NaN', () => {
		expect(
			predictWallClockSeconds({ exposureSeconds: NaN, playbackDivisor: 4 })
		).toBe(0);
	});
});

describe('solvePlaybackDivisor', () => {
	// Choose the FASTEST playback that still hits the target, so we never spend
	// wall-clock we don't need.
	it('picks the smallest sufficient divisor', () => {
		// 0.5s at 60fps: 1x->30, 2x->60, 4x->120, 8x->240.
		expect(
			solvePlaybackDivisor({
				exposureSeconds: 0.5,
				renderFps: 60,
				targetSamples: 100,
			})
		).toBe(4);
		expect(
			solvePlaybackDivisor({
				exposureSeconds: 0.5,
				renderFps: 60,
				targetSamples: 240,
			})
		).toBe(8);
	});

	it('uses 1x when the target is already met at real time', () => {
		expect(
			solvePlaybackDivisor({
				exposureSeconds: 1,
				renderFps: 60,
				targetSamples: 30,
			})
		).toBe(1);
	});

	it('caps at the slowest rung when the target is unreachable', () => {
		expect(
			solvePlaybackDivisor({
				exposureSeconds: 1 / 60,
				renderFps: 60,
				targetSamples: 5000,
			})
		).toBe(16);
	});

	it('returns 1x for a degenerate target', () => {
		expect(
			solvePlaybackDivisor({
				exposureSeconds: 1,
				renderFps: 60,
				targetSamples: 0,
			})
		).toBe(1);
	});
});

describe('nearestPlaybackDivisor', () => {
	it('snaps to a supported rung', () => {
		expect(nearestPlaybackDivisor(3)).toBe(2);
		expect(nearestPlaybackDivisor(7)).toBe(8);
		expect(nearestPlaybackDivisor(100)).toBe(16);
		expect(nearestPlaybackDivisor(1)).toBe(1);
	});

	it('defaults to real time for nonsense', () => {
		expect(nearestPlaybackDivisor('x')).toBe(1);
		expect(nearestPlaybackDivisor(-4)).toBe(1);
		expect(nearestPlaybackDivisor(null)).toBe(1);
	});

	it('only ever returns a supported divisor', () => {
		for (const value of [0.4, 1.6, 5, 11, 15.9, 40]) {
			expect(PLAYBACK_DIVISORS).toContain(nearestPlaybackDivisor(value));
		}
	});
});

describe('weightAt', () => {
	it('is flat for the box curve', () => {
		expect(weightAt('box', 0)).toBe(1);
		expect(weightAt('box', 0.5)).toBe(1);
		expect(weightAt('box', 1)).toBe(1);
	});

	// Tapered curves must be heaviest at the ANCHOR end (u=1), so the user's
	// chosen moment reads as the crisp head of the streak.
	it('weights the anchor end most heavily for tapered curves', () => {
		for (const curve of ['linear', 'ease'] as const) {
			expect(weightAt(curve, 1)).toBeCloseTo(1);
			expect(weightAt(curve, 1)).toBeGreaterThan(weightAt(curve, 0.5));
			expect(weightAt(curve, 0.5)).toBeGreaterThan(weightAt(curve, 0));
		}
	});

	it('keeps a floor so the tail fades out instead of ending on a hard edge', () => {
		expect(weightAt('linear', 0)).toBeCloseTo(TAPER_FLOOR);
		expect(weightAt('ease', 0)).toBeCloseTo(TAPER_FLOOR);
	});

	it('makes ease fall away faster than linear', () => {
		expect(weightAt('ease', 0.5)).toBeLessThan(weightAt('linear', 0.5));
		expect(EASE_EXPONENT).toBeGreaterThan(1);
	});

	it('clamps out-of-range and non-finite positions', () => {
		expect(weightAt('linear', -1)).toBeCloseTo(TAPER_FLOOR);
		expect(weightAt('linear', 5)).toBeCloseTo(1);
		expect(weightAt('linear', NaN)).toBeCloseTo(1);
	});

	it('never returns a non-positive weight', () => {
		for (const curve of ['box', 'linear', 'ease'] as const) {
			for (let u = 0; u <= 1; u += 0.05) {
				expect(weightAt(curve, u)).toBeGreaterThan(0);
			}
		}
	});
});

describe('isWeightingCurve', () => {
	it('accepts the known curves and rejects anything else', () => {
		expect(isWeightingCurve('box')).toBe(true);
		expect(isWeightingCurve('linear')).toBe(true);
		expect(isWeightingCurve('ease')).toBe(true);
		expect(isWeightingCurve('gaussian')).toBe(false);
		expect(isWeightingCurve(null)).toBe(false);
		expect(isWeightingCurve(3)).toBe(false);
	});
});

describe('windowPosition', () => {
	it('maps the window start to 0 and the anchor to 1', () => {
		expect(
			windowPosition({
				sessionTime: 10,
				windowStartTime: 10,
				windowEndTime: 11,
			})
		).toBe(0);
		expect(
			windowPosition({
				sessionTime: 11,
				windowStartTime: 10,
				windowEndTime: 11,
			})
		).toBe(1);
		expect(
			windowPosition({
				sessionTime: 10.25,
				windowStartTime: 10,
				windowEndTime: 11,
			})
		).toBeCloseTo(0.25);
	});

	it('clamps outside the window', () => {
		expect(
			windowPosition({
				sessionTime: 9,
				windowStartTime: 10,
				windowEndTime: 11,
			})
		).toBe(0);
		expect(
			windowPosition({
				sessionTime: 12,
				windowStartTime: 10,
				windowEndTime: 11,
			})
		).toBe(1);
	});

	// A single-frame exposure has a zero-length window: the one sample IS the
	// anchor, so it must carry full weight rather than divide by zero.
	it('treats a zero-length window as the anchor', () => {
		expect(
			windowPosition({
				sessionTime: 10,
				windowStartTime: 10,
				windowEndTime: 10,
			})
		).toBe(1);
		expect(
			windowPosition({
				sessionTime: NaN,
				windowStartTime: 10,
				windowEndTime: 11,
			})
		).toBe(1);
	});
});
