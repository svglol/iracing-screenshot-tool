// Capture grid — a recording of where every car was, for live sessions.
//
// WHY. In a saved replay, iRacing's per-car telemetry follows the replay: seek to
// a frame and CarIdxLapDistPct says where every car was at that frame. In a LIVE
// session it does not — it keeps reporting the live race, whatever frame the
// replay is showing (measured 2026-11-17: car #002 read 0.33/0.66/0.48/0.90 at the
// same frame). The replay CLOCK does follow the replay, though: ReplaySessionTime
// held still while paused and moved back 10.04 s on a 600-frame seek back (live
// test session, 2026-11-17).
//
// So while a live session runs we record every car's telemetry against
// SessionTime, and the grid asks "where was every car at the replay's session
// time?" instead of reading the live values. Everything downstream — the search,
// the gap check, the roster — works unchanged on what this hands back.
//
// The limit is the obvious one: only what happened while the app was running is
// recorded. A replay moment before that (or in a gap) answers null, and the grid
// says so instead of searching.
//
// Storage. Samples at SAMPLE_INTERVAL_S (10 Hz: linear interpolation over 0.1 s
// is within ~5 cm even under 4 g braking), in fixed-size chunks of typed arrays so
// an hour costs ~21 MB and nothing is allocated per sample. The oldest chunks are
// dropped past MAX_HISTORY_SECONDS.

import type { GridTelemetry } from './roster';

export const CAR_SLOTS = 64;
export const SAMPLE_INTERVAL_S = 0.1;
// Two samples further apart than this are a gap (the app was paused, the sim
// stalled): nothing inside one is interpolated.
export const MAX_GAP_S = 0.5;
// How far past the newest sample a lookup may extrapolate — the replay at the
// live edge is up to one sample interval ahead of the recording.
export const MAX_EXTRAPOLATE_S = 0.25;
export const MAX_HISTORY_SECONDS = 2 * 60 * 60;
const CHUNK_SAMPLES = 600; // one minute at 10 Hz
const MAX_CHUNKS = Math.ceil(
	MAX_HISTORY_SECONDS / SAMPLE_INTERVAL_S / CHUNK_SAMPLES
);

// Track surface (irsdk_TrkLoc, -1..3) is stored as is; NO_VALUE marks a
// sample that had none.
const NO_VALUE = -128;

export interface HistorySample {
	sessionNum: number;
	sessionTime: number;
	lapDistPct: readonly number[] | null;
	trackSurface: readonly number[] | null;
	onPitRoad: readonly boolean[] | null;
	racePosition: readonly number[] | null;
	lapCompleted: readonly number[] | null;
}

// The recorded part of GridTelemetry; the caller merges it over the live values
// for everything that is not per-car position (camera, lap times).
export type RecordedTelemetry = Pick<
	GridTelemetry,
	'lapDistPct' | 'trackSurface' | 'onPitRoad' | 'racePosition' | 'lapCompleted'
>;

class Chunk {
	readonly sessionNum: number;
	readonly times = new Float64Array(CHUNK_SAMPLES);
	readonly pct = new Float32Array(CHUNK_SAMPLES * CAR_SLOTS);
	readonly surface = new Int8Array(CHUNK_SAMPLES * CAR_SLOTS);
	readonly pit = new Uint8Array(CHUNK_SAMPLES * CAR_SLOTS);
	readonly position = new Uint8Array(CHUNK_SAMPLES * CAR_SLOTS);
	readonly laps = new Int16Array(CHUNK_SAMPLES * CAR_SLOTS);
	count = 0;

	constructor(sessionNum: number) {
		this.sessionNum = sessionNum;
	}

	get first(): number {
		return this.times[0];
	}

	get last(): number {
		return this.times[this.count - 1];
	}
}

function finite(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

// A lap fraction difference folded into [-0.5, 0.5).
function wrap(delta: number): number {
	const folded = delta - Math.round(delta);
	return folded >= 0.5 ? folded - 1 : folded;
}

export interface HistoryCoverage {
	sessionNum: number;
	from: number;
	to: number;
}

export class PositionHistory {
	private chunks: Chunk[] = [];

	clear(): void {
		this.chunks = [];
	}

	get sampleCount(): number {
		return this.chunks.reduce((n, c) => n + c.count, 0);
	}

	// The recorded span of each session, oldest first (gaps not reported).
	coverage(): HistoryCoverage[] {
		const out: HistoryCoverage[] = [];
		for (const chunk of this.chunks) {
			if (chunk.count === 0) {
				continue;
			}
			const tail = out[out.length - 1];
			if (tail && tail.sessionNum === chunk.sessionNum) {
				tail.to = chunk.last;
			} else {
				out.push({
					sessionNum: chunk.sessionNum,
					from: chunk.first,
					to: chunk.last,
				});
			}
		}
		return out;
	}

	// Whether a sample at this moment would be kept — a cheap check so the caller
	// can skip building one on most of the 60 Hz updates.
	due(sessionNum: number, sessionTime: number): boolean {
		const chunk = this.chunks[this.chunks.length - 1];
		return (
			!chunk ||
			chunk.count === 0 ||
			chunk.sessionNum !== sessionNum ||
			sessionTime < chunk.last ||
			sessionTime - chunk.last >= SAMPLE_INTERVAL_S - 1e-6
		);
	}

	// Adds a sample, at most one per SAMPLE_INTERVAL_S. Returns whether it was
	// kept. Time running backwards within a session means a new event (the
	// session restarted, or a different server): everything before is dropped.
	record(sample: HistorySample): boolean {
		const { sessionNum, sessionTime } = sample;
		if (!finite(sessionNum) || !finite(sessionTime) || !sample.lapDistPct) {
			return false;
		}
		let chunk = this.chunks[this.chunks.length - 1];
		if (chunk && chunk.sessionNum === sessionNum && chunk.count > 0) {
			if (sessionTime < chunk.last) {
				this.clear();
				chunk = undefined;
			} else if (sessionTime - chunk.last < SAMPLE_INTERVAL_S - 1e-6) {
				return false;
			}
		}
		// A session seen before, after a different one (practice → qualify →
		// practice again cannot happen; a server restart reusing numbers can):
		// that session's old samples are stale.
		if (
			(!chunk || chunk.sessionNum !== sessionNum) &&
			this.chunks.some((c) => c.sessionNum === sessionNum)
		) {
			this.chunks = this.chunks.filter((c) => c.sessionNum !== sessionNum);
		}
		if (
			!chunk ||
			chunk.sessionNum !== sessionNum ||
			chunk.count >= CHUNK_SAMPLES
		) {
			chunk = new Chunk(sessionNum);
			this.chunks.push(chunk);
			if (this.chunks.length > MAX_CHUNKS) {
				this.chunks.shift();
			}
		}

		const i = chunk.count;
		const base = i * CAR_SLOTS;
		chunk.times[i] = sessionTime;
		for (let car = 0; car < CAR_SLOTS; car++) {
			const pct = sample.lapDistPct[car];
			chunk.pct[base + car] = finite(pct) ? pct : -1;
			const surface = sample.trackSurface?.[car];
			chunk.surface[base + car] = finite(surface)
				? Math.max(-127, Math.min(127, Math.trunc(surface)))
				: NO_VALUE;
			chunk.pit[base + car] = sample.onPitRoad?.[car] === true ? 1 : 0;
			const position = sample.racePosition?.[car];
			chunk.position[base + car] = finite(position)
				? Math.max(0, Math.min(255, Math.trunc(position)))
				: 0;
			const laps = sample.lapCompleted?.[car];
			chunk.laps[base + car] = finite(laps)
				? Math.max(-32768, Math.min(32767, Math.trunc(laps)))
				: -1;
		}
		chunk.count += 1;
		return true;
	}

	// Every car's telemetry at `sessionTime` of `sessionNum`, interpolated
	// between the two samples around it; null when that moment was not recorded.
	at(sessionNum: number, sessionTime: number): RecordedTelemetry | null {
		if (!finite(sessionNum) || !finite(sessionTime)) {
			return null;
		}
		const bracket = this.bracket(sessionNum, sessionTime);
		if (!bracket) {
			return null;
		}
		const { a, ai, b, bi } = bracket;
		const ta = a.times[ai];
		const tb = b.times[bi];
		const span = tb - ta;
		const f = span > 0 ? (sessionTime - ta) / span : 0;
		// Discrete values come from the nearer sample (the later one past halfway).
		const [near, ni] = f > 0.5 ? [b, bi] : [a, ai];

		const lapDistPct: number[] = new Array(CAR_SLOTS);
		const trackSurface: number[] = new Array(CAR_SLOTS);
		const onPitRoad: boolean[] = new Array(CAR_SLOTS);
		const racePosition: number[] = new Array(CAR_SLOTS);
		const lapCompleted: number[] = new Array(CAR_SLOTS);
		for (let car = 0; car < CAR_SLOTS; car++) {
			const pa = a.pct[ai * CAR_SLOTS + car];
			const pb = b.pct[bi * CAR_SLOTS + car];
			let pct: number;
			if (pa >= 0 && pb >= 0) {
				// Shortest way round: a car crossing the line between samples goes
				// 0.99 → 0.01, not backwards through the lap.
				pct = pa + wrap(pb - pa) * f;
				pct -= Math.floor(pct);
			} else {
				pct = (f > 0.5 ? pb : pa) >= 0 ? (f > 0.5 ? pb : pa) : -1;
			}
			lapDistPct[car] = pct;
			const s = near.surface[ni * CAR_SLOTS + car];
			trackSurface[car] = s === NO_VALUE ? NaN : s;
			onPitRoad[car] = near.pit[ni * CAR_SLOTS + car] === 1;
			racePosition[car] = near.position[ni * CAR_SLOTS + car];
			lapCompleted[car] = near.laps[ni * CAR_SLOTS + car];
		}
		return {
			lapDistPct,
			trackSurface,
			onPitRoad,
			racePosition,
			lapCompleted,
		};
	}

	// The two samples around `t` (the same one twice on an exact hit, the last
	// two when extrapolating just past the end), or null for a moment outside the
	// recording or inside a gap.
	private bracket(
		sessionNum: number,
		t: number
	): { a: Chunk; ai: number; b: Chunk; bi: number } | null {
		// Samples of this session in order, as (chunk, index) — chunks of one
		// session are contiguous and ordered.
		const chunks = this.chunks.filter(
			(c) => c.sessionNum === sessionNum && c.count > 0
		);
		if (chunks.length === 0) {
			return null;
		}
		const lastChunk = chunks[chunks.length - 1];
		if (t < chunks[0].first) {
			return null;
		}
		if (t > lastChunk.last) {
			if (t - lastChunk.last > MAX_EXTRAPOLATE_S) {
				return null;
			}
			// Extrapolate from the last two samples.
			const bi = lastChunk.count - 1;
			const prev =
				bi > 0
					? { c: lastChunk, i: bi - 1 }
					: chunks.length > 1
						? {
								c: chunks[chunks.length - 2],
								i: chunks[chunks.length - 2].count - 1,
							}
						: null;
			if (!prev || lastChunk.times[bi] - prev.c.times[prev.i] > MAX_GAP_S) {
				return { a: lastChunk, ai: bi, b: lastChunk, bi };
			}
			return { a: prev.c, ai: prev.i, b: lastChunk, bi };
		}
		for (let k = 0; k < chunks.length; k++) {
			const chunk = chunks[k];
			if (t > chunk.last) {
				// Between this chunk's last sample and the next chunk's first.
				const next = chunks[k + 1];
				if (next && t < next.first) {
					return next.first - chunk.last > MAX_GAP_S
						? null
						: { a: chunk, ai: chunk.count - 1, b: next, bi: 0 };
				}
				continue;
			}
			// Binary search: the last sample at or before t.
			let lo = 0;
			let hi = chunk.count - 1;
			while (lo < hi) {
				const mid = (lo + hi + 1) >> 1;
				if (chunk.times[mid] <= t) {
					lo = mid;
				} else {
					hi = mid - 1;
				}
			}
			if (chunk.times[lo] === t) {
				return { a: chunk, ai: lo, b: chunk, bi: lo };
			}
			const bi = lo + 1;
			if (chunk.times[bi] - chunk.times[lo] > MAX_GAP_S) {
				return null;
			}
			return { a: chunk, ai: lo, b: chunk, bi };
		}
		return null;
	}
}

// Where the replay is, in recording terms: the session and session time of the
// frame on screen. Null when the sim does not say.
export function replayClock(
	values: Record<string, unknown> | null | undefined
): { sessionNum: number; sessionTime: number } | null {
	const sessionNum = values?.ReplaySessionNum;
	const sessionTime = values?.ReplaySessionTime;
	return finite(sessionNum) && finite(sessionTime)
		? { sessionNum, sessionTime }
		: null;
}

// The replay's frames run at exactly REPLAY_FPS of session time (measured live
// 2026-11-17: 4056 frames = 67.60 s), but ReplaySessionTime is COARSE — it moves
// in steps of ~0.08 s, so neighbouring frames read the same time (151390 and
// 151391 both 2558.46) and then jump (154722 → 154723: +0.08 s). Read raw, that
// is ~5 m of track at racing speed: a search stepping a frame or two sees the
// car standing still, and a shot can be off by metres.
//
// So a frame's time is its frame number at REPLAY_FPS plus an OFFSET, and the
// replay clock is only used to pin the offset: every reading gives
// `replayTime - frame / fps`, which lies within one clock step of the truth;
// the middle of the spread seen so far is the estimate. A reading far outside
// that spread (a different session, or a discontinuity in the tape) starts
// the estimate over.
export const REPLAY_FPS = 60;
export const CLOCK_RESET_S = 0.25;

export class ReplayClockModel {
	private sessionNum: number | null = null;
	private low = 0;
	private high = 0;

	reset(): void {
		this.sessionNum = null;
	}

	// The session time of `frame`, given the (coarse) replay time read with it.
	timeAt(sessionNum: number, frame: number, replayTime: number): number {
		// Mid-seek iRacing can report frame 0 / time 0 / session -1 for a tick;
		// that says nothing about the clock and must not reset it.
		if (!(frame > 0 && replayTime > 0 && sessionNum >= 0)) {
			return this.sessionNum === sessionNum
				? frame / REPLAY_FPS + (this.low + this.high) / 2
				: replayTime;
		}
		const offset = replayTime - frame / REPLAY_FPS;
		if (
			this.sessionNum !== sessionNum ||
			offset < this.high - CLOCK_RESET_S ||
			offset > this.low + CLOCK_RESET_S
		) {
			this.sessionNum = sessionNum;
			this.low = offset;
			this.high = offset;
		} else {
			this.low = Math.min(this.low, offset);
			this.high = Math.max(this.high, offset);
		}
		return frame / REPLAY_FPS + (this.low + this.high) / 2;
	}
}

// The session's mode from the session YAML: 'full' for a live session, 'replay'
// for a saved replay file. Null when absent.
export function readSimMode(sessionData: unknown): string | null {
	const mode = (sessionData as { WeekendInfo?: { SimMode?: unknown } } | null)
		?.WeekendInfo?.SimMode;
	return typeof mode === 'string' ? mode.toLowerCase() : null;
}

// Where the grid's per-car telemetry comes from at the frame on screen:
// 'telemetry' — iRacing's own values (a saved replay, where they follow the
//   replay; or no recording is kept);
// 'history'   — a live session, read from the recording at the replay's time;
// 'not-recorded' — a live session at a moment the recording does not cover.
export type ReplayTelemetrySource = 'telemetry' | 'history' | 'not-recorded';

export interface ReplayTelemetry {
	telemetry: GridTelemetry;
	source: ReplayTelemetrySource;
	// The session time the positions were read at (live sessions only).
	clock?: number;
}

// The grid's telemetry for the frame the replay is showing. `live` is
// readGridTelemetry of the same values: camera and lap times always come from
// it; per-car positions come from the recording in a live session.
export function telemetryAtReplay(
	values: Record<string, unknown> | null | undefined,
	live: GridTelemetry,
	simMode: string | null,
	history: PositionHistory,
	clockModel?: ReplayClockModel
): ReplayTelemetry {
	if (simMode !== 'full') {
		return { telemetry: live, source: 'telemetry' };
	}
	const clock = replayClock(values);
	const frame = values?.ReplayFrameNum;
	const time =
		clock && clockModel && finite(frame)
			? clockModel.timeAt(clock.sessionNum, frame, clock.sessionTime)
			: clock?.sessionTime;
	const recorded = clock ? history.at(clock.sessionNum, time) : null;
	if (!recorded) {
		return {
			telemetry: {
				...live,
				lapDistPct: null,
				trackSurface: null,
				onPitRoad: null,
				racePosition: null,
				lapCompleted: null,
			},
			source: 'not-recorded',
		};
	}
	return {
		telemetry: { ...live, ...recorded },
		source: 'history',
		clock: time,
	};
}

// The sample to record from one telemetry update, or null when it has no clock.
export function historySampleFrom(
	values: Record<string, unknown> | null | undefined,
	live: GridTelemetry
): HistorySample | null {
	const sessionNum = values?.SessionNum;
	const sessionTime = values?.SessionTime;
	if (!finite(sessionNum) || !finite(sessionTime)) {
		return null;
	}
	return {
		sessionNum,
		sessionTime,
		lapDistPct: live.lapDistPct,
		trackSurface: live.trackSurface,
		onPitRoad: live.onPitRoad,
		racePosition: live.racePosition,
		lapCompleted: live.lapCompleted,
	};
}
