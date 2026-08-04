import { describe, expect, it } from 'vitest';
import {
	REPLAY_FRAMES_PER_SECOND,
	SHUTTER_LADDER,
	weightAt,
} from './exposure-math';
import {
	PRIMARY_SINK_ID,
	earliestStartFrame,
	planBracketSinks,
	planPrimarySink,
	plannedSinkCount,
	routeFrame,
	sinkFrameSpan,
	sinkStartTime,
	sinksOpenAt,
} from './accumulator-sinks';

// Replay frame -> session time, at the 60 Hz replay rate. Injected into routeFrame
// so the tests use the same continuous units the capture path does.
const frameTimeOf = (frame: number) => frame / REPLAY_FRAMES_PER_SECOND;

// Exposure in seconds for a whole number of replay frames — the shape every
// pre-sub-frame window had.
const frames = (n: number) => n / REPLAY_FRAMES_PER_SECOND;

describe('planPrimarySink', () => {
	it('builds a trailing window that TERMINATES on the anchor', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: frames(8),
			weighting: 'box',
			label: '1/8',
		});
		expect(sink.id).toBe(PRIMARY_SINK_ID);
		expect(sink.startFrame).toBe(992);
		// The frame the user parked on is the LAST sample, not the midpoint.
		expect(sink.endFrame).toBe(1000);
		expect(sinkFrameSpan(sink)).toBe(8);
	});

	it('spans one replay frame for a one-frame exposure', () => {
		const sink = planPrimarySink({
			anchorFrame: 500,
			exposureSeconds: frames(1),
			weighting: 'box',
			label: '1/60',
		});
		expect(sink.startFrame).toBe(499);
		expect(sink.endFrame).toBe(500);
	});

	// The defect this whole feature exists to remove: 1/1000 … 1/125 used to
	// quantise to a one-frame window and deliver 1/60, i.e. 16x the asked-for blur.
	it('keeps a sub-frame exposure sub-frame', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: 1 / 250,
			weighting: 'box',
			label: '1/250',
		});
		// Still seeks back one whole frame — that is the frame it starts inside.
		expect(sink.startFrame).toBe(999);
		expect(sink.endFrame).toBe(1000);
		expect(sink.exposureSeconds).toBeCloseTo(1 / 250, 10);
		// ... but the window it actually exposes for is a quarter of that frame.
		expect(sinkStartTime(sink, frameTimeOf)).toBeCloseTo(
			frameTimeOf(1000) - 1 / 250,
			10
		);
	});

	// For a whole-frame window the continuous start lands exactly on the frame
	// boundary, so nothing about an existing capture moves.
	it('puts a whole-frame window start exactly on its start frame', () => {
		for (const n of [1, 2, 4, 8, 15, 30, 60]) {
			const sink = planPrimarySink({
				anchorFrame: 1000,
				exposureSeconds: frames(n),
				weighting: 'box',
				label: `${n}f`,
			});
			expect(sink.startFrame).toBe(1000 - n);
			expect(sinkStartTime(sink, frameTimeOf)).toBeCloseTo(
				frameTimeOf(1000 - n),
				10
			);
		}
	});
});

// The capture plans the sinks and pays their VRAM; `validatePlan` warns about what
// that costs before the shot. Both answer "is this a bracket?" and they must never
// disagree — a warning about a bracket the capture does not build, or silence about
// one it does, is worse than either alone. So the count is asserted against the
// sinks themselves, across the whole ladder, rather than trusted to stay in step.
describe('plannedSinkCount', () => {
	it('matches what the capture path would actually plan, at every stop', () => {
		for (const stop of SHUTTER_LADDER) {
			const bracketSinks = planBracketSinks({
				anchorFrame: 1000,
				shutterKey: stop.key,
				weighting: 'box',
			});
			// Exactly the rule executeRecipe applies: a set of one is not a bracket, so
			// it falls back to the single primary sink.
			const actual = bracketSinks.length > 1 ? bracketSinks.length : 1;
			expect(plannedSinkCount({ bracket: true, shutterKey: stop.key })).toBe(
				actual
			);
		}
	});

	it('counts one whenever there is no bracket to build', () => {
		expect(plannedSinkCount({ bracket: false, shutterKey: '1/30' })).toBe(1);
		// A free-form exposure has no ladder key, so there is no at-or-faster set.
		expect(plannedSinkCount({ bracket: true, shutterKey: null })).toBe(1);
		expect(plannedSinkCount({ bracket: true, shutterKey: undefined })).toBe(
			1
		);
		// A key from a build with a wider ladder resolves to nothing here.
		expect(plannedSinkCount({ bracket: true, shutterKey: '1/4000' })).toBe(1);
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

	// Before sub-frame windows the fast five (1/1000 … 1/60) all produced the same
	// one-frame window, so bracketing them was five copies of one image — which is
	// why the bracketing brief prescribed deduping by window length. Every stop is
	// now genuinely distinct, and there is nothing to dedupe.
	it('gives every stop on the ladder a distinct window', () => {
		const sinks = planBracketSinks({
			anchorFrame: 2000,
			shutterKey: '1',
			weighting: 'box',
		});
		expect(sinks.length).toBe(11);
		const windows = sinks.map((sink) => sink.exposureSeconds);
		expect(new Set(windows).size).toBe(sinks.length);
		// Strictly decreasing: every faster stop is a strict tail subset.
		for (let i = 1; i < windows.length; i += 1) {
			expect(windows[i]).toBeLessThan(windows[i - 1]);
		}
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
			exposureSeconds: frames(10),
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

	// Offer at the START of a replay frame, which is where a whole-frame window
	// opens. No tick estimate, so the boundary test is binary.
	const at = (frame: number) =>
		sinksOpenAt(sinks, {
			replayFrameNum: frame,
			sessionTime: frameTimeOf(frame),
			frameTimeOf,
		});

	it('offers a frame only to sinks whose window has opened', () => {
		// 1/15 is 4 frames, so it opens at 996; the fast stops open inside 999.
		expect(at(995).map((s) => s.id)).toEqual([]);
		expect(at(996).map((s) => s.id)).toEqual(['1/15']);
		expect(at(1000).length).toBe(sinks.length);
	});

	it('closes every sink past the anchor', () => {
		expect(at(1001)).toEqual([]);
	});

	// The point of the change: within the LAST replay frame the fast stops open at
	// different moments instead of all opening at once.
	it('opens sub-frame stops partway through the last replay frame', () => {
		const anchorTime = frameTimeOf(1000);
		const openAt = (secondsBeforeAnchor: number) =>
			sinksOpenAt(sinks, {
				replayFrameNum: 999,
				sessionTime: anchorTime - secondsBeforeAnchor,
				frameTimeOf,
			}).map((s) => s.id);

		// 12 ms back: inside 1/60 (16.7 ms), outside 1/125 (8 ms) and faster.
		expect(openAt(0.012)).toContain('1/60');
		expect(openAt(0.012)).not.toContain('1/125');
		// 6 ms back: 1/125 is in, 1/250 (4 ms) is not.
		expect(openAt(0.006)).toContain('1/125');
		expect(openAt(0.006)).not.toContain('1/250');
		// 0.5 ms back: even 1/1000 is in.
		expect(openAt(0.0005)).toContain('1/1000');
	});

	// A bad sub-frame time estimate must not be able to reach back beyond the frame
	// the seek landed on. That bound is the reason startFrame stays integral.
	it('never opens before the sink start frame, whatever the time says', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: 1 / 250,
			weighting: 'box',
			label: '1/250',
		});
		expect(
			sinksOpenAt([sink], {
				replayFrameNum: 998,
				// A wildly late time estimate that claims we are inside the window.
				sessionTime: frameTimeOf(1000),
				frameTimeOf,
			})
		).toEqual([]);
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
		// 1/60 is exactly one replay frame, so frame 999 is at its very start.
		expect(byId.get('1/60')?.u).toBeCloseTo(0);
		// 1/1000 is NOT open yet: its window is the last millisecond before the
		// anchor, and the start of frame 999 is 16.7 ms out. It used to open here,
		// which is precisely how 1/1000 came to deliver 1/60.
		expect(byId.has('1/1000')).toBe(false);
	});

	it('applies the sink own weighting curve', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: frames(60),
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
			exposureSeconds: frames(10),
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
			exposureSeconds: frames(60),
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

	// A sub-frame window is a real window, so a tapered curve has to sweep its full
	// range inside a single replay frame rather than reporting one flat position.
	it('normalises u across a sub-frame window, not across the replay frame', () => {
		const sink = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: 1 / 250,
			weighting: 'linear',
			label: '1/250',
		});
		const anchorTime = frameTimeOf(1000);
		const uAt = (secondsBeforeAnchor: number) =>
			routeFrame({
				sinks: [sink],
				replayFrameNum: secondsBeforeAnchor > 0 ? 999 : 1000,
				sessionTime: anchorTime - secondsBeforeAnchor,
				frameTimeOf,
			})[0]?.u;

		expect(uAt(1 / 250)).toBeCloseTo(0, 6);
		expect(uAt(1 / 500)).toBeCloseTo(0.5, 6);
		expect(uAt(0)).toBeCloseTo(1, 6);
	});
});

// The control loop pushes one weight per tick, and that weight governs every frame
// iRacing presents until the next push. So a tick covers a SPAN of sim time — ~1 ms
// at 1/16 playback, a quarter of a 1/250 exposure. Weighting the straddling tick by
// its covered fraction is what stops the fast stops stair-stepping.
describe('routeFrame — fractional boundary weight', () => {
	const sink = planPrimarySink({
		anchorFrame: 1000,
		exposureSeconds: 1 / 250,
		weighting: 'box',
		label: '1/250',
	});
	const windowStart = frameTimeOf(1000) - 1 / 250;
	// One control tick of sim time at 1/16 playback.
	const tickSeconds = 0.016 / 16;

	const weightAtOffset = (offsetFromWindowStart: number) =>
		routeFrame({
			sinks: [sink],
			replayFrameNum: 999,
			sessionTime: windowStart + offsetFromWindowStart,
			frameTimeOf,
			tickSeconds,
		})[0];

	it('gives a fully-inside tick full weight', () => {
		expect(weightAtOffset(tickSeconds * 2)?.coverage).toBe(1);
		expect(weightAtOffset(tickSeconds * 2)?.weight).toBeCloseTo(1);
	});

	it('scales the tick that straddles the window start by its covered fraction', () => {
		// A tick starting a quarter-tick BEFORE the window covers three quarters.
		const straddling = weightAtOffset(-tickSeconds * 0.25);
		expect(straddling?.coverage).toBeCloseTo(0.75);
		expect(straddling?.weight).toBeCloseTo(0.75);
	});

	it('closes the gate for a tick entirely before the window', () => {
		expect(weightAtOffset(-tickSeconds * 1.5)).toBeUndefined();
	});

	// The straddling tick's weight and the taper multiply rather than replace each
	// other — coverage is about how much of the tick counted, the curve is about
	// where in the window it sat.
	it('multiplies coverage with the weighting curve', () => {
		const tapered = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: 1 / 250,
			weighting: 'linear',
			label: '1/250',
		});
		const [contribution] = routeFrame({
			sinks: [tapered],
			replayFrameNum: 999,
			sessionTime: windowStart - tickSeconds * 0.5,
			frameTimeOf,
			tickSeconds,
		});
		expect(contribution.coverage).toBeCloseTo(0.5);
		expect(contribution.weight).toBeCloseTo(
			weightAt('linear', contribution.u) * 0.5
		);
	});

	// Termination is frame-indexed on the anchor and this change does not touch it:
	// the last tick of the exposure is never scaled down.
	it('leaves the anchor end alone', () => {
		const [contribution] = routeFrame({
			sinks: [sink],
			replayFrameNum: 1000,
			sessionTime: frameTimeOf(1000),
			frameTimeOf,
			tickSeconds,
		});
		expect(contribution.coverage).toBe(1);
		expect(contribution.weight).toBeCloseTo(1);
	});

	// The safety net has to survive the early-opening that coverage introduces:
	// a whole-frame window's first tick lands on its start frame, never before it.
	it('does not let coverage open a whole-frame window a frame early', () => {
		const wholeFrame = planPrimarySink({
			anchorFrame: 1000,
			exposureSeconds: frames(8),
			weighting: 'box',
			label: '1/8',
		});
		expect(
			routeFrame({
				sinks: [wholeFrame],
				replayFrameNum: 991,
				sessionTime: frameTimeOf(992) - tickSeconds * 0.5,
				frameTimeOf,
				tickSeconds,
			})
		).toEqual([]);
		const [first] = routeFrame({
			sinks: [wholeFrame],
			replayFrameNum: 992,
			sessionTime: frameTimeOf(992),
			frameTimeOf,
			tickSeconds,
		});
		expect(first.coverage).toBe(1);
	});
});
