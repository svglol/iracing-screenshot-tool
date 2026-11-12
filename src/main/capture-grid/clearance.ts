// Capture grid — is any other car close enough to be in the way?
//
// Reported 2026-11-12 from the first live grids: a car shot at the reference
// spot was sometimes overlapping another car — side by side, or tucked under a
// rear wing in the chase camera's view. The SDK gives every car's distance
// around the lap at the current frame, so the gap ALONG THE TRACK to the nearest
// other car is known exactly. Lateral position is not, so this is a gap in
// metres along the racing line; two cars level on track measure 0 whether they
// are touching or across the track from each other.
//
// Only cars on the same side of the pit wall are compared: a car in the pit
// lane beside a car on the straight is not the overlap this guards against, and
// counting it would send the grid lap-hunting every time the reference spot is
// on the pit straight.

import { carLapDistPct, type GridTelemetry } from './roster';
import { wrapLaps } from './position-search';

// The gap the panel offers by default: about four car lengths, enough that the
// car behind is out of a chase camera's frame and the car ahead is not filling
// it.
export const DEFAULT_MIN_GAP_METERS = 20;
// The most the panel accepts. Past this, most grids would find no clear lap.
export const MAX_GRID_MIN_GAP_METERS = 200;
// How many other laps are tried, nearest in time first, before settling for the
// least crowded one. Each costs a few seconds of seeking.
export const CLEAR_LAP_OFFSETS = [-1, 1, -2, 2] as const;

export interface Clearance {
	// Gap to the nearest other car, either way, or null when no other car is on
	// the same side of the pit wall.
	gapMeters: number | null;
	nearestCarIdx: number | null;
	// Signed: positive = ahead of the shot car, negative = behind it.
	nearestOffsetMeters: number | null;
}

export function measureClearance(
	telemetry: GridTelemetry,
	carIdx: number,
	trackLengthMeters: number
): Clearance {
	const none: Clearance = {
		gapMeters: null,
		nearestCarIdx: null,
		nearestOffsetMeters: null,
	};
	const pct = carLapDistPct(telemetry, carIdx);
	if (pct === null || !(trackLengthMeters > 0)) {
		return none;
	}
	const onPitRoad = telemetry.onPitRoad?.[carIdx] === true;
	const count = telemetry.lapDistPct?.length ?? 0;

	let best = none;
	for (let other = 0; other < count; other++) {
		if (other === carIdx) {
			continue;
		}
		const otherPct = carLapDistPct(telemetry, other);
		if (otherPct === null) {
			continue;
		}
		if ((telemetry.onPitRoad?.[other] === true) !== onPitRoad) {
			continue;
		}
		const offset = wrapLaps(otherPct - pct) * trackLengthMeters;
		const gap = Math.abs(offset);
		if (best.gapMeters === null || gap < best.gapMeters) {
			best = {
				gapMeters: gap,
				nearestCarIdx: other,
				nearestOffsetMeters: offset,
			};
		}
	}
	return best;
}

// Clear when nothing is within the minimum gap. A minimum of 0 turns the check
// off; an unmeasurable gap (no other car on track) counts as clear.
export function isClear(clearance: Clearance, minGapMeters: number): boolean {
	return (
		!(minGapMeters > 0) ||
		clearance.gapMeters === null ||
		clearance.gapMeters >= minGapMeters
	);
}

// A lap further away in time has to be roomier by more than this to be worth
// shooting instead: a car's own lap-to-lap wobble is not room.
export const ROOMIER_BY_METERS = 0.5;

// Whether candidate `a` is less crowded than `b`: a gap larger by more than
// ROOMIER_BY_METERS, with "nothing nearby" beating any gap.
export function roomier(a: Clearance, b: Clearance): boolean {
	if (a.gapMeters === null) {
		return b.gapMeters !== null;
	}
	return b.gapMeters !== null && a.gapMeters > b.gapMeters + ROOMIER_BY_METERS;
}
