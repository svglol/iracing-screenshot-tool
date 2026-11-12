// Capture grid — find the replay frame where a given car is at a given distance
// around the lap.
//
// The SDK has no "put car X at distance D" command. All it offers is seeking the
// replay to a frame, and reading every car's CarIdxLapDistPct at whatever frame
// the replay is on. So this is a root-finder over replay frames:
//
//   1. read the car's distance where the replay is now
//   2. estimate how many frames away the target distance is, from the car's speed
//      (first from the class's estimated lap time, then from what the car actually
//      did between the last two readings — a secant step)
//   3. seek there, read, repeat
//   4. once the estimate is under one frame, check the neighbouring frame on the
//      side the target lies and keep whichever is closer
//
// The answer is the nearest REPLAY FRAME, not the exact distance: the tape is
// stored at 60 frames a second, so at 300 km/h a match is within about ±0.7 m.
//
// WHICH crossing. A car passes the target distance once a lap. Locked with the
// user (2026-11-11): the one NEAREST IN TIME to where the replay started. We
// approximate that as the nearest in distance (the target within half a lap ahead
// or behind), which is the same thing at an even pace. If that crossing is off the
// tape — before the recording starts or after it ends — we take the crossing a lap
// the other way rather than give up.
//
// Positions are tracked UNWRAPPED (laps + fraction) so crossing the start/finish
// line is not a discontinuity. That only works while consecutive readings are
// less than half a lap apart, which is why every step is capped (MAX_STEP_LAPS)
// at the speed we believe the car is doing.
//
// Telemetry is the only position authority, as in ../replay-control:
// wall-clock time is used only as a timeout on seeks that may never land.
//
// All deps are injected so the search is unit-tested against a simulated tape.

import { createLogger } from '../../utilities/logger';
import { POLL_INTERVAL_MS, SEEK_TIMEOUT_MS } from '../replay-control';

const log = createLogger('capture-grid/search');

// iRacing records replays at 60 frames per second.
export const REPLAY_FPS = 60;
// When the session gives no plausible lap-time estimate (hardware, 2026-11-11:
// an AI race reported 1 s for every class), the first guess is the track length
// covered at FALLBACK_SPEED_MPS — deliberately FAST, because overestimating speed
// only makes steps short, while underestimating it can make a step overshoot by
// more than half a lap, which the unwrapping cannot survive. Without a track
// length either, a short oval's lap. The guess stays a FLOOR on the speed used
// to size steps even after real measurements: a speed measured through a
// hairpin and then spent on a straight is exactly the aliasing case, and the
// only price of the floor is a few more (short) seeks.
export const FALLBACK_SPEED_MPS = 90; // 324 km/h
export const FALLBACK_LAP_SECONDS = 15;
export const MIN_FALLBACK_LAP_SECONDS = 10;
// The largest single step, as a fraction of a lap at the believed speed. Keeps
// consecutive readings under the half-lap the unwrapping needs even when the
// car is moving three times faster than believed — a class lap-time estimate
// twice too slow, or a speed measured through a hairpin and then spent on a
// straight. 0.25 was tried first and aliased on a 2x-slow estimate (test below).
export const MAX_STEP_LAPS = 0.15;
// Slower than one lap an hour is "not moving" — a car parked in its pit stall, or
// stopped after a spin.
export const MIN_SLOPE_PCT_PER_FRAME = 1 / (3600 * REPLAY_FPS);
// Readings in a row that showed no forward movement before giving up on the car.
export const MAX_STALLS = 3;
// Hard cap on seeks for one car, so a car the search cannot settle on costs a
// bounded amount of time and is reported, not retried for ever.
// 32 covers the worst case with a fast fallback guess: about a lap of 0.15-lap
// steps to the other crossing, plus the refinement.
export const MAX_SEEKS = 32;
// Polls after landing that must agree (same frame, same distance) before a
// reading is trusted. Guards against reading a car's distance one telemetry tick
// before the sim has updated it for the new frame.
export const STABLE_READS = 2;

export interface CarSample {
	frame: number;
	// Distance around the lap, 0..1. Null when the car is not on the track at
	// this frame.
	pct: number | null;
}

export interface PositionSearchDeps {
	// The current replay frame and this car's distance at it, or null when there
	// is no telemetry at all.
	readSample(carIdx: number): CarSample | null;
	// Absolute seek (irsdk RpyPos_Begin).
	seekAbsolute(frame: number): void;
	delay(ms: number): Promise<void>;
	// Wall clock, for TIMEOUTS ONLY.
	now(): number;
}

export interface PositionSearchOptions {
	carIdx: number;
	targetPct: number;
	// First guess at the car's pace. Null falls back to the track length at
	// FALLBACK_SPEED_MPS, then FALLBACK_LAP_SECONDS.
	estLapTimeSec: number | null;
	trackLengthMeters?: number | null;
	// Last frame on the tape (absolute), or null when unknown — then only the
	// start of the tape bounds the search.
	tapeEndFrame: number | null;
	// A reading already known, to search FROM instead of where the replay is now.
	// The grid passes each car's distance at the starting frame (the roster read
	// every car there), so "nearest crossing" means nearest to the moment the user
	// chose — not to wherever the previous car's search left the replay — without
	// spending a seek per car to go back first.
	start?: { frame: number; pct: number };
	// Whole laps past (positive) or before (negative) the nearest crossing. The
	// grid uses it to look for the same spot on another lap when another car is
	// too close on the nearest one. 0 = the nearest crossing.
	lapOffset?: number;
	// Whether a crossing off the tape may be swapped for the one a lap the other
	// way. True by default; a lap-offset search turns it off, because the lap the
	// other way is one the grid has already looked at.
	allowOtherCrossing?: boolean;
	signal?: { aborted: boolean };
}

// The seek budget for a search `lapOffset` laps away: the usual budget plus the
// capped steps a full lap takes at the believed pace.
export function seekBudget(lapOffset: number): number {
	return MAX_SEEKS + Math.ceil(Math.abs(lapOffset) / MAX_STEP_LAPS);
}

export type PositionSearchFailure =
	| 'no-telemetry'
	| 'not-in-world'
	| 'not-moving'
	| 'out-of-tape'
	| 'seek-timeout'
	| 'did-not-converge'
	| 'aborted';

export interface PositionSearchResult {
	found: boolean;
	// The best frame found, and the car's distance there. On failure, the last
	// reading taken (or null).
	frame: number | null;
	pct: number | null;
	// Signed distance still to go at `frame`, in laps (target minus car). Multiply
	// by the track length for metres.
	errorLaps: number | null;
	seeks: number;
	// True when the nearest crossing was off the tape and the one a lap the other
	// way was used instead.
	usedOtherCrossing: boolean;
	reason: PositionSearchFailure | null;
}

// A lap-fraction difference folded into [-0.5, 0.5): the shortest way round.
export function wrapLaps(delta: number): number {
	const folded = delta - Math.round(delta);
	return folded >= 0.5 ? folded - 1 : folded;
}

interface Reading {
	frame: number;
	pct: number;
	// Laps + fraction, continuous across the start/finish line, relative to the
	// first reading.
	unwrapped: number;
}

export async function searchCarPosition(
	deps: PositionSearchDeps,
	opts: PositionSearchOptions
): Promise<PositionSearchResult> {
	const { carIdx, signal } = opts;
	const lapOffset = Math.trunc(opts.lapOffset ?? 0);
	const maxSeeks = seekBudget(lapOffset);
	const allowOtherCrossing = opts.allowOtherCrossing ?? true;
	const lastFrame =
		opts.tapeEndFrame !== null && Number.isFinite(opts.tapeEndFrame)
			? Math.max(0, Math.floor(opts.tapeEndFrame))
			: Number.POSITIVE_INFINITY;

	let seeks = 0;
	let usedOtherCrossing = false;
	let current: Reading | null = null;

	const result = (
		fields: Partial<PositionSearchResult>
	): PositionSearchResult => {
		const out: PositionSearchResult = {
			found: false,
			frame: current?.frame ?? null,
			pct: current?.pct ?? null,
			errorLaps: null,
			seeks,
			usedOtherCrossing,
			reason: null,
			...fields,
		};
		const logFields = {
			carIdx,
			targetPct: opts.targetPct,
			lapOffset,
			...out,
		};
		if (out.found) {
			log.info('Grid position found', logFields);
		} else {
			log.warn('Grid position not found', logFields);
		}
		return out;
	};

	// --- the starting reading -------------------------------------------------
	// `shownFrame` is the frame the replay is actually showing, which differs from
	// `current` when searching from a given start; the answer is only returned
	// once the replay shows it.
	const live = safeRead(deps, carIdx);
	if (!live) {
		return result({ reason: 'no-telemetry' });
	}
	let shownFrame = live.frame;
	const first = opts.start ?? live;
	if (first.pct === null) {
		return result({ frame: first.frame, reason: 'not-in-world' });
	}
	current = { frame: first.frame, pct: first.pct, unwrapped: first.pct };

	// The crossing nearest the start, in unwrapped laps.
	let target = first.pct + wrapLaps(opts.targetPct - first.pct) + lapOffset;
	const errorAt = (reading: Reading) => target - reading.unwrapped;

	const estLap = firstGuessLapSeconds(opts);
	// Laps per replay frame.
	let slope = 1 / (estLap * REPLAY_FPS);
	// Steps are SIZED from the fastest pace believed so far, never the latest
	// reading alone. A car that sat in its stall for most of one step measures as
	// crawling; sizing the next step from that would jump laps at once and alias.
	let fastestSlope = slope;
	let stalls = 0;

	// Seek, wait for the landing, and read it. Returns the new reading, or a
	// failure reason.
	const step = async (
		toFrame: number
	): Promise<Reading | PositionSearchFailure> => {
		const from = current as Reading;
		seeks += 1;
		const landed = await seekAndRead(
			deps,
			carIdx,
			toFrame,
			shownFrame,
			signal
		);
		if (typeof landed === 'string') {
			return landed;
		}
		shownFrame = landed.frame;
		if (landed.pct === null) {
			return 'not-in-world';
		}
		// The step cap keeps real movement under half a lap, so the shortest way
		// round IS the way the car went.
		const moved = wrapLaps(landed.pct - from.pct);
		return {
			frame: landed.frame,
			pct: landed.pct,
			unwrapped: from.unwrapped + moved,
		};
	};

	// --- coarse: secant steps until the estimate is under a frame ------------
	for (;;) {
		if (signal?.aborted) {
			return result({ reason: 'aborted' });
		}
		if (seeks >= maxSeeks) {
			return result({
				errorLaps: errorAt(current),
				reason: 'did-not-converge',
			});
		}

		const error = errorAt(current);
		const maxStep = Math.max(1, Math.floor(MAX_STEP_LAPS / fastestSlope));
		const wanted = Math.round(error / slope);
		if (wanted === 0) {
			break;
		}
		const clampedStep = Math.max(-maxStep, Math.min(maxStep, wanted));
		const toFrame = Math.max(
			0,
			Math.min(lastFrame, current.frame + clampedStep)
		);

		if (toFrame === current.frame) {
			// Pinned against the start or end of the tape with the target beyond
			// it. Take the crossing a lap the other way, once.
			if (usedOtherCrossing || !allowOtherCrossing) {
				return result({ errorLaps: error, reason: 'out-of-tape' });
			}
			usedOtherCrossing = true;
			target += error > 0 ? -1 : 1;
			continue;
		}

		const previous: Reading = current;
		const next = await step(toFrame);
		if (typeof next === 'string') {
			return result({ reason: next });
		}
		current = next;

		// Update the speed estimate from what the car actually did. A car that did
		// not move forward (stopped, spun, reversing) leaves the old estimate in
		// place; too many of those in a row and the car is declared not moving.
		const frames = next.frame - previous.frame;
		const measured =
			frames !== 0 ? (next.unwrapped - previous.unwrapped) / frames : 0;
		if (measured >= MIN_SLOPE_PCT_PER_FRAME) {
			slope = measured;
			fastestSlope = Math.max(fastestSlope, measured);
			stalls = 0;
		} else {
			stalls += 1;
			if (stalls >= MAX_STALLS) {
				return result({
					errorLaps: errorAt(current),
					reason: 'not-moving',
				});
			}
		}
	}

	// --- fine: walk to the closest frame -------------------------------------
	// The estimate says we are within half a frame, but the car's speed is not
	// constant within a frame's worth of a secant. Check the neighbour on the side
	// the target lies and move while that is strictly closer.
	for (;;) {
		const error = errorAt(current);
		if (error === 0 || signal?.aborted || seeks >= maxSeeks) {
			break;
		}
		const neighbour = current.frame + (error > 0 ? 1 : -1);
		if (neighbour < 0 || neighbour > lastFrame) {
			break;
		}
		const previous: Reading = current;
		const next = await step(neighbour);
		if (typeof next === 'string') {
			// The neighbour could not be read; the frame we are holding is still a
			// valid answer, so settle for it rather than fail the car. Seek back so
			// the replay actually shows it.
			if (next === 'aborted') {
				return result({ reason: next });
			}
			current = previous;
			seeks += 1;
			const back = await seekAndRead(
				deps,
				carIdx,
				previous.frame,
				-1,
				signal
			);
			if (typeof back === 'string') {
				return result({ reason: back });
			}
			shownFrame = back.frame;
			break;
		}
		if (Math.abs(errorAt(next)) < Math.abs(errorAt(previous))) {
			current = next;
			continue;
		}
		// The neighbour is no closer: the frame before it is the answer. Return
		// the replay there.
		seeks += 1;
		const back = await seekAndRead(
			deps,
			carIdx,
			previous.frame,
			next.frame,
			signal
		);
		if (typeof back === 'string') {
			return result({ reason: back });
		}
		shownFrame = back.frame;
		current = previous;
		break;
	}

	if (signal?.aborted) {
		return result({ reason: 'aborted' });
	}
	// Searching from a given start can settle without the replay ever moving —
	// the car was already on the mark at the starting frame — so put the replay on
	// the answer before reporting it.
	if (shownFrame !== current.frame) {
		seeks += 1;
		const landed = await seekAndRead(
			deps,
			carIdx,
			current.frame,
			shownFrame,
			signal
		);
		if (typeof landed === 'string') {
			return result({ reason: landed });
		}
	}
	return result({ found: true, errorLaps: errorAt(current) });
}

export function firstGuessLapSeconds(
	opts: Pick<PositionSearchOptions, 'estLapTimeSec' | 'trackLengthMeters'>
): number {
	if (opts.estLapTimeSec !== null && opts.estLapTimeSec > 0) {
		return opts.estLapTimeSec;
	}
	const length = opts.trackLengthMeters;
	if (typeof length === 'number' && Number.isFinite(length) && length > 0) {
		return Math.max(MIN_FALLBACK_LAP_SECONDS, length / FALLBACK_SPEED_MPS);
	}
	return FALLBACK_LAP_SECONDS;
}

function safeRead(deps: PositionSearchDeps, carIdx: number): CarSample | null {
	try {
		return deps.readSample(carIdx);
	} catch {
		// A native throw means the SDK handle went stale (iRacing exited).
		return null;
	}
}

// Seek to `target` and return the reading there once it is stable: the replay
// reports the target frame, and STABLE_READS polls in a row agree on it and on
// the car's distance. If the seek lands somewhere else (an inexact landing),
// whatever frame it reached is returned after the timeout — the search works
// from actual frames, so that is still progress. Only a replay that never moved
// at all is a failure.
async function seekAndRead(
	deps: PositionSearchDeps,
	carIdx: number,
	target: number,
	fromFrame: number,
	signal: { aborted: boolean } | undefined
): Promise<CarSample | PositionSearchFailure> {
	deps.seekAbsolute(target);
	const started = deps.now();
	let last: CarSample | null = null;
	let agreeing = 0;

	for (;;) {
		if (signal?.aborted) {
			return 'aborted';
		}
		const sample = safeRead(deps, carIdx);
		if (sample && sample.frame === target) {
			agreeing =
				last && last.frame === sample.frame && last.pct === sample.pct
					? agreeing + 1
					: 1;
			if (agreeing >= STABLE_READS) {
				return sample;
			}
		} else {
			agreeing = 0;
		}
		if (sample) {
			last = sample;
		}
		if (deps.now() - started >= SEEK_TIMEOUT_MS) {
			if (last && last.frame !== fromFrame) {
				log.warn('Grid seek landed off target', {
					carIdx,
					target,
					landed: last.frame,
				});
				return last;
			}
			return 'seek-timeout';
		}
		await deps.delay(POLL_INTERVAL_MS);
	}
}
