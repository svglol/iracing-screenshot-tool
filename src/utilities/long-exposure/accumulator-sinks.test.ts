import { describe, expect, it } from 'vitest';
import { REPLAY_FRAMES_PER_SECOND, weightAt } from './exposure-math';
import {
	PRIMARY_SINK_ID,
	earliestStartFrame,
	planBracketSinks,
	planPrimarySink,
	routeFrame,
	sinkFrameSpan,
	sinksOpenAt,
} from './accumulator-sinks';

// Replay frame -> session time, at the 60 Hz replay rate. Injected into routeFrame
// so the tests use the same continuous units the capture path does.
const frameTimeOf = (frame: number) => frame / REPLAY_FRAMES_PER_SECOND;

describe('planPrimarySink', () => {
	it('builds a trailing window that TERMINATES on the anchor', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			windowFrames: 8,
			weighting: 'box',
			label: '1/8',
		});
		expect(sink.id).toBe(PRIMARY_SINK_ID);
		expect(sink.startFrame).toBe(992);
		// The frame the user parked on is the LAST sample, not the midpoint.
		expect(sink.endFrame).toBe(1000);
		expect(sinkFrameSpan(sink)).toBe(8);
	});

	it('collapses to a zero-length window for a single-frame exposure', () => {
		const sink = planPrimarySink({
			anchorFrame: 500,
			windowFrames: 1,
			weighting: 'box',
			label: '1/60',
		});
		expect(sink.startFrame).toBe(499);
		expect(sink.endFrame).toBe(500);
	});
});

describe('planBracketSinks (v2 seam)', () => {
	// The structural claim that makes bracketing free: with a trailing window,
	// every stop shares the terminal frame and differs ONLY in startFrame.
	it('gives every bracket stop the same terminal frame', () => {
		const sinks = planBracketSinks({
			anchorFrame: 2000,
			shutterKey: '1/60',
			weighting: 'box',
		});
		expect(sinks.length).toBeGreaterThan(1);
		for (const sink of sinks) {
			expect(sink.endFrame).toBe(2000);
		}
	});

	it('reaches further back for slower shutters', () => {
		const sinks = planBracketSinks({
			anchorFrame: 2000,
			shutterKey: '1/8',
			weighting: 'box',
		});
		const starts = sinks.map((sink) => sink.startFrame);
		// Ordered slowest-first, so each subsequent (faster) stop starts later.
		for (let i = 1; i < starts.length; i += 1) {
			expect(starts[i]).toBeGreaterThanOrEqual(starts[i - 1]);
		}
		expect(sinks[0].id).toBe('1/8');
		expect(sinks[sinks.length - 1].id).toBe('1/1000');
	});

	// A faster shutter is literally the tail subset of the slower one's samples.
	it('makes every faster stop a subset of the slowest stop window', () => {
		const sinks = planBracketSinks({
			anchorFrame: 2000,
			shutterKey: '1/15',
			weighting: 'linear',
		});
		const slowest = sinks[0];
		for (const sink of sinks) {
			expect(sink.startFrame).toBeGreaterThanOrEqual(slowest.startFrame);
			expect(sink.endFrame).toBeLessThanOrEqual(slowest.endFrame);
		}
	});

	it('returns nothing for an unknown shutter key', () => {
		expect(
			planBracketSinks({
				anchorFrame: 10,
				shutterKey: 'nope',
				weighting: 'box',
			})
		).toEqual([]);
	});
});

describe('earliestStartFrame', () => {
	it('is where the replay must be seeked to', () => {
		const sinks = planBracketSinks({
			anchorFrame: 2000,
			shutterKey: '1/8',
			weighting: 'box',
		});
		expect(earliestStartFrame(sinks)).toBe(
			Math.min(...sinks.map((sink) => sink.startFrame))
		);
	});

	it('handles a single sink', () => {
		const sink = planPrimarySink({
			anchorFrame: 100,
			windowFrames: 10,
			weighting: 'box',
			label: '1/6',
		});
		expect(earliestStartFrame([sink])).toBe(90);
	});
});

describe('sinksOpenAt', () => {
	const sinks = planBracketSinks({
		anchorFrame: 1000,
		shutterKey: '1/15',
		weighting: 'box',
	});

	it('offers a frame only to sinks whose range has opened', () => {
		// 1/15 is 4 frames, so it opens at 996; 1/1000 is 1 frame, opening at 999.
		expect(sinksOpenAt(sinks, 995).map((s) => s.id)).toEqual([]);
		expect(sinksOpenAt(sinks, 996).map((s) => s.id)).toEqual(['1/15']);
		expect(sinksOpenAt(sinks, 1000).length).toBe(sinks.length);
	});

	it('closes every sink past the anchor', () => {
		expect(sinksOpenAt(sinks, 1001)).toEqual([]);
	});
});

describe('routeFrame', () => {
	it('gives the anchor frame full weight in every open sink', () => {
		const sinks = planBracketSinks({
			anchorFrame: 1000,
			shutterKey: '1/30',
			weighting: 'linear',
		});
		const contributions = routeFrame({
			sinks,
			replayFrameNum: 1000,
			sessionTime: frameTimeOf(1000),
			frameTimeOf,
		});
		expect(contributions.length).toBe(sinks.length);
		for (const contribution of contributions) {
			expect(contribution.u).toBeCloseTo(1);
			expect(contribution.weight).toBeCloseTo(1);
		}
	});

	// Each sink computes u against its OWN window, which is what lets a fast
	// bracket stop already be at full weight while a slower one is mid-taper.
	it('computes each sink position against that sink own window', () => {
		const sinks = planBracketSinks({
			anchorFrame: 1000,
			shutterKey: '1/15',
			weighting: 'linear',
		});
		const contributions = routeFrame({
			sinks,
			replayFrameNum: 999,
			sessionTime: frameTimeOf(999),
			frameTimeOf,
		});
		const byId = new Map(contributions.map((c) => [c.sinkId, c]));
		// 1/15 spans 996..1000, so frame 999 is 3/4 through it.
		expect(byId.get('1/15')?.u).toBeCloseTo(0.75);
		// 1/1000 spans 999..1000, so frame 999 is at its very start.
		expect(byId.get('1/1000')?.u).toBeCloseTo(0);
	});

	it('applies the sink own weighting curve', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			windowFrames: 60,
			weighting: 'ease',
			label: '1"',
		});
		const [contribution] = routeFrame({
			sinks: [sink],
			replayFrameNum: 970,
			sessionTime: frameTimeOf(970),
			frameTimeOf,
		});
		expect(contribution.u).toBeCloseTo(0.5);
		expect(contribution.weight).toBeCloseTo(weightAt('ease', 0.5));
	});

	it('routes nothing before the window opens or after the anchor', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			windowFrames: 10,
			weighting: 'box',
			label: '1/6',
		});
		expect(
			routeFrame({
				sinks: [sink],
				replayFrameNum: 989,
				sessionTime: frameTimeOf(989),
				frameTimeOf,
			})
		).toEqual([]);
		expect(
			routeFrame({
				sinks: [sink],
				replayFrameNum: 1001,
				sessionTime: frameTimeOf(1001),
				frameTimeOf,
			})
		).toEqual([]);
	});

	// Position-parameterised weights are what make the result invariant to how many
	// samples actually landed: shoot the same window at 60 or 120 fps and the image
	// matches, only less noisy. Index-parameterised weights would have turned
	// frame-rate variance into BRIGHTNESS variance.
	it('is invariant to sample count for the same window', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			windowFrames: 60,
			weighting: 'linear',
			label: '1"',
		});
		const sample = (times: number) => {
			const weights: number[] = [];
			for (let i = 0; i <= times; i += 1) {
				const sessionTime =
					frameTimeOf(940) +
					(i / times) * (frameTimeOf(1000) - frameTimeOf(940));
				const [c] = routeFrame({
					sinks: [sink],
					replayFrameNum: 940 + Math.round((i / times) * 60),
					sessionTime,
					frameTimeOf,
				});
				weights.push(c.weight);
			}
			return weights;
		};
		const coarse = sample(10);
		const fine = sample(20);
		// The same normalised positions produce the same weights regardless of how
		// densely the window was sampled.
		expect(fine[0]).toBeCloseTo(coarse[0]);
		expect(fine[10]).toBeCloseTo(coarse[5]);
		expect(fine[20]).toBeCloseTo(coarse[10]);
	});
});
