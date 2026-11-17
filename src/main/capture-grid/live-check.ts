// Capture grid — is the telemetry describing the REPLAY, or the live race?
//
// The whole grid rests on one assumption: seek the replay to a frame, and every
// car's CarIdxLapDistPct is where that car was AT that frame. That holds when a
// replay file is open. It does not hold in a live session (measured 2026-11-17,
// Daytona, AI race): seeks land on the right frame, but the distances keep
// tracking the race as it runs. Car #002 read 0.33, 0.66, 0.48 and 0.90 of a lap
// at the same frame (~71725) across four grids. Every car then looks "not
// moving" to the search, because going back in the replay never moves it back.
//
// The test needs no seek. With the replay paused, a replay's telemetry is frozen
// — the frame does not change, and neither does any car's distance. Live
// telemetry keeps moving under a frame that stands still. So: read, wait, read
// again; the same frame with a car somewhere else is the live race.

// Readings taken after the first, and the wait between them. Four 250 ms waits
// span a second: at racing speed a car covers tens of metres in that, far above
// the float noise of a lap fraction.
export const LIVE_PROBE_READS = 4;
export const LIVE_PROBE_INTERVAL_MS = 250;
// A lap fraction is a float32 in the SDK; a replay re-reporting the same frame
// gives the identical value, so anything past this is real movement.
export const LIVE_PROBE_EPSILON = 1e-6;

export interface LiveProbeDeps {
	// The replay frame now, or null with no telemetry.
	readFrame(): number | null;
	// Every car's lap distance now (CarIdx-indexed; negative = not in the world).
	readLapDistPct(): readonly number[] | null;
	delay(ms: number): Promise<void>;
}

// 'replay'     the telemetry held still with the frame: it follows the replay.
// 'live'       a car moved while the frame did not: live session telemetry.
// 'unsettled'  the frame never held still long enough to tell (the replay is
//              still moving); the caller proceeds as before.
// 'no-telemetry' / 'aborted' as everywhere else.
export type LiveProbeResult =
	| 'replay'
	| 'live'
	| 'unsettled'
	| 'no-telemetry'
	| 'aborted';

export interface LiveProbeOutcome {
	result: LiveProbeResult;
	// The first car seen moving, for the log.
	movedCarIdx: number | null;
	frame: number | null;
}

export async function probeTelemetrySource(
	deps: LiveProbeDeps,
	signal?: { aborted: boolean }
): Promise<LiveProbeOutcome> {
	const read = () => {
		try {
			return { frame: deps.readFrame(), pcts: deps.readLapDistPct() };
		} catch {
			return { frame: null, pcts: null };
		}
	};

	let base = read();
	if (base.frame === null || !base.pcts) {
		return { result: 'no-telemetry', movedCarIdx: null, frame: null };
	}
	// Consecutive readings at the same frame; it takes at least one to know
	// anything.
	let heldStill = 0;

	for (let i = 0; i < LIVE_PROBE_READS; i++) {
		if (signal?.aborted) {
			return { result: 'aborted', movedCarIdx: null, frame: base.frame };
		}
		await deps.delay(LIVE_PROBE_INTERVAL_MS);
		const next = read();
		if (next.frame === null || !next.pcts) {
			return { result: 'no-telemetry', movedCarIdx: null, frame: null };
		}
		if (next.frame !== base.frame) {
			// The replay itself moved (a pause not yet in effect). Start over from
			// here; this reading says nothing about where the data comes from.
			base = next;
			heldStill = 0;
			continue;
		}
		const moved = firstMovedCar(base.pcts, next.pcts);
		if (moved !== null) {
			return { result: 'live', movedCarIdx: moved, frame: next.frame };
		}
		heldStill += 1;
	}

	return {
		result: heldStill > 0 ? 'replay' : 'unsettled',
		movedCarIdx: null,
		frame: base.frame,
	};
}

function firstMovedCar(
	before: readonly number[],
	after: readonly number[]
): number | null {
	const n = Math.min(before.length, after.length);
	for (let idx = 0; idx < n; idx++) {
		const a = before[idx];
		const b = after[idx];
		// Only cars in the world on both readings: one entering or leaving the
		// track between reads is not evidence either way.
		if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
			continue;
		}
		// Shortest way round, so crossing the line (0.999 → 0.001) counts as the
		// small move it is.
		let delta = Math.abs(b - a);
		delta = Math.min(delta, 1 - delta);
		if (delta > LIVE_PROBE_EPSILON) {
			return idx;
		}
	}
	return null;
}
