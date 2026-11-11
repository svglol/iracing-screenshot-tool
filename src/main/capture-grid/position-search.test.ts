import { describe, expect, it, vi } from 'vitest';
import {
	MAX_SEEKS,
	searchCarPosition,
	wrapLaps,
	type PositionSearchDeps,
	type PositionSearchOptions,
} from './position-search';

// The logger writes through electron's app paths; stub it so these stay pure.
vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

const LAP_FRAMES = 5400; // a 90 s lap at 60 fps
const CAR = 7;

interface TapeOptions {
	startFrame: number;
	// The car's position in UNWRAPPED laps at a frame.
	laps: (frame: number) => number;
	tapeEnd?: number;
	notInWorld?: (frame: number) => boolean;
	// Reads before a seek shows up in ReplayFrameNum.
	landLag?: number;
	// Reads after the frame changes during which the car's distance is still the
	// old frame's — the "telemetry one tick behind" case.
	staleReads?: number;
	// The sim ignores seeks entirely.
	ignoreSeeks?: boolean;
}

// A simulated replay tape. Wall clock is virtual: `delay` advances it, so the
// timeouts are exercised without real waiting.
function makeTape(opts: TapeOptions) {
	let clock = 0;
	let frame = opts.startFrame;
	let pending: number | null = null;
	let lag = 0;
	let stale = 0;
	let stalePct: number | null = null;
	const seeks: number[] = [];
	const tapeEnd = opts.tapeEnd ?? 1_000_000;

	const pctAt = (f: number): number | null => {
		if (opts.notInWorld?.(f)) {
			return null;
		}
		const laps = opts.laps(f);
		return laps - Math.floor(laps);
	};

	const deps: PositionSearchDeps = {
		readSample: (carIdx) => {
			expect(carIdx).toBe(CAR);
			if (pending !== null) {
				if (lag > 0) {
					lag -= 1;
				} else {
					stalePct = pctAt(frame);
					frame = pending;
					pending = null;
					stale = opts.staleReads ?? 0;
				}
			}
			if (stale > 0) {
				stale -= 1;
				return { frame, pct: stalePct };
			}
			return { frame, pct: pctAt(frame) };
		},
		seekAbsolute: (target) => {
			seeks.push(target);
			if (opts.ignoreSeeks) {
				return;
			}
			pending = Math.max(0, Math.min(tapeEnd, target));
			lag = opts.landLag ?? 0;
		},
		delay: async (ms) => {
			clock += ms;
		},
		now: () => clock,
	};

	return {
		deps,
		seeks,
		pctAt,
		currentFrame: () => frame,
		search: (o: Partial<PositionSearchOptions> & { targetPct: number }) =>
			searchCarPosition(deps, {
				carIdx: CAR,
				estLapTimeSec: 90,
				tapeEndFrame: tapeEnd,
				...o,
			}),
	};
}

// |target − car| at a frame, the shortest way round.
function errAt(
	pctAt: (f: number) => number | null,
	frame: number,
	target: number
): number {
	return Math.abs(wrapLaps(target - (pctAt(frame) as number)));
}

// The answer is the closest frame: neither neighbour is closer.
function expectLocallyBest(
	pctAt: (f: number) => number | null,
	frame: number,
	target: number
) {
	const here = errAt(pctAt, frame, target);
	expect(here).toBeLessThanOrEqual(errAt(pctAt, frame - 1, target));
	expect(here).toBeLessThanOrEqual(errAt(pctAt, frame + 1, target));
}

describe('wrapLaps', () => {
	it('folds a difference into [-0.5, 0.5)', () => {
		expect(wrapLaps(0.3)).toBeCloseTo(0.3);
		expect(wrapLaps(0.7)).toBeCloseTo(-0.3);
		expect(wrapLaps(-0.7)).toBeCloseTo(0.3);
		expect(wrapLaps(1.2)).toBeCloseTo(0.2);
		expect(wrapLaps(0.5)).toBeCloseTo(-0.5);
		expect(wrapLaps(-0.5)).toBeCloseTo(-0.5);
		expect(wrapLaps(0)).toBe(0);
	});
});

describe('searchCarPosition', () => {
	const steady = (startFrame: number, startPct: number) => (f: number) =>
		startPct + (f - startFrame) / LAP_FRAMES;

	it('finds the exact frame ahead at a steady pace', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: steady(10_000, 0.2) });
		const r = await tape.search({ targetPct: 0.5 });
		expect(r.found).toBe(true);
		expect(r.frame).toBe(10_000 + 0.3 * LAP_FRAMES);
		expect(tape.currentFrame()).toBe(r.frame);
		expect(Math.abs(r.errorLaps as number)).toBeLessThan(1e-9);
		expect(r.seeks).toBeLessThanOrEqual(6);
	});

	it('goes BACK in time when the nearest crossing is behind', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: steady(10_000, 0.6) });
		const r = await tape.search({ targetPct: 0.5 });
		expect(r.found).toBe(true);
		expect(r.frame).toBe(10_000 - 0.1 * LAP_FRAMES);
	});

	it('crosses the start/finish line without losing the lap', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: steady(10_000, 0.97) });
		const r = await tape.search({ targetPct: 0.02 });
		expect(r.found).toBe(true);
		expect(r.frame).toBe(10_000 + 0.05 * LAP_FRAMES);
	});

	it('crosses it backwards too', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: steady(10_000, 0.03) });
		const r = await tape.search({ targetPct: 0.98 });
		expect(r.found).toBe(true);
		expect(r.frame).toBe(10_000 - 0.05 * LAP_FRAMES);
	});

	it('does no seeking when the car is already on the target', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: steady(10_000, 0.4) });
		const r = await tape.search({ targetPct: 0.4 });
		expect(r.found).toBe(true);
		expect(r.frame).toBe(10_000);
		expect(r.seeks).toBe(0);
	});

	it.each([
		['too slow', 180],
		['too fast', 45],
		['missing', null],
	])(
		'converges when the estimated lap time is %s',
		async (_label, estLapTimeSec) => {
			const tape = makeTape({
				startFrame: 10_000,
				laps: steady(10_000, 0.1),
			});
			const r = await tape.search({ targetPct: 0.55, estLapTimeSec });
			expect(r.found).toBe(true);
			expect(r.frame).toBe(10_000 + 0.45 * LAP_FRAMES);
		}
	);

	it('lands on the closest frame when the pace varies through the lap', async () => {
		// Corners and straights: speed swings ±56 % around the mean, three times a lap.
		const laps = (f: number) =>
			0.1 +
			f / LAP_FRAMES +
			0.03 * Math.sin((2 * Math.PI * 3 * f) / LAP_FRAMES);
		for (const target of [0.05, 0.33, 0.71, 0.999]) {
			// A fresh tape per target: each search must start from frame 20 000.
			const tape = makeTape({ startFrame: 20_000, laps });
			const r = await tape.search({ targetPct: target });
			expect(r.found).toBe(true);
			expectLocallyBest(tape.pctAt, r.frame as number, target);
			// And it is the crossing nearest the start, so within half a lap of it.
			expect(Math.abs((r.frame as number) - 20_000)).toBeLessThan(
				0.75 * LAP_FRAMES
			);
		}
	});

	it('waits out a pit stop at the starting moment', async () => {
		// Stationary for 50 s around the start, then racing again.
		const stopStart = 9_000;
		const stopEnd = 12_000;
		const laps = (f: number) => {
			const moving = Math.min(f, stopStart) + Math.max(0, f - stopEnd);
			return 0.2 + moving / LAP_FRAMES;
		};
		const tape = makeTape({ startFrame: 10_000, laps });
		const r = await tape.search({ targetPct: 0.45 });
		expect(r.found).toBe(true);
		expectLocallyBest(tape.pctAt, r.frame as number, 0.45);
	});

	it('uses the crossing a lap the other way when the nearest is off the tape', async () => {
		// Nearest crossing is 0.05 lap BEHIND, i.e. before frame 0.
		const tape = makeTape({ startFrame: 100, laps: steady(100, 0.5) });
		const r = await tape.search({ targetPct: 0.45 });
		expect(r.found).toBe(true);
		expect(r.usedOtherCrossing).toBe(true);
		expect(r.frame).toBe(100 + 0.95 * LAP_FRAMES);
	});

	it('reports out-of-tape when neither crossing is recorded', async () => {
		const tape = makeTape({
			startFrame: 100,
			laps: steady(100, 0.5),
			tapeEnd: 2_000,
		});
		const r = await tape.search({ targetPct: 0.45 });
		expect(r.found).toBe(false);
		expect(r.reason).toBe('out-of-tape');
	});

	it('reports a car that is not on the track', async () => {
		const tape = makeTape({
			startFrame: 10_000,
			laps: steady(10_000, 0.2),
			notInWorld: () => true,
		});
		const r = await tape.search({ targetPct: 0.5 });
		expect(r.reason).toBe('not-in-world');
		expect(r.seeks).toBe(0);
	});

	it('gives up on a car that never moves', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: () => 0.2 });
		const r = await tape.search({ targetPct: 0.5 });
		expect(r.found).toBe(false);
		expect(r.reason).toBe('not-moving');
	});

	it('never trusts a distance read before the sim caught up with the seek', async () => {
		const tape = makeTape({
			startFrame: 10_000,
			laps: steady(10_000, 0.2),
			landLag: 3,
			staleReads: 1,
		});
		const r = await tape.search({ targetPct: 0.5 });
		expect(r.found).toBe(true);
		expect(r.frame).toBe(10_000 + 0.3 * LAP_FRAMES);
	});

	it('fails with seek-timeout when the replay never moves', async () => {
		const tape = makeTape({
			startFrame: 10_000,
			laps: steady(10_000, 0.2),
			ignoreSeeks: true,
		});
		const r = await tape.search({ targetPct: 0.5 });
		expect(r.found).toBe(false);
		expect(r.reason).toBe('seek-timeout');
	});

	it('stops when aborted', async () => {
		const tape = makeTape({ startFrame: 10_000, laps: steady(10_000, 0.2) });
		const signal = { aborted: true };
		const r = await tape.search({ targetPct: 0.5, signal });
		expect(r.reason).toBe('aborted');
	});

	it('never exceeds the seek budget', async () => {
		// A pathological car: pace flips direction every frame block.
		const laps = (f: number) => 0.2 + 0.05 * Math.sin(f / 7);
		const tape = makeTape({ startFrame: 10_000, laps });
		const r = await tape.search({ targetPct: 0.7 });
		expect(r.found).toBe(false);
		expect(tape.seeks.length).toBeLessThanOrEqual(MAX_SEEKS + 1);
	});
});
