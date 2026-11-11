// Capture grid — who gets shot, in what order, and who is left out and why.
//
// A grid is one shot per car, each taken with that car at the same distance
// around the lap as the car the camera was on when the user pressed the button
// (the REFERENCE car). This module decides the list. It does not move anything:
// it reads the session's driver list and the telemetry at the starting frame,
// and returns the cars to shoot plus the cars skipped, each with a reason the UI
// can show before the grid starts.
//
// Decisions locked with the user (2026-11-11):
//   - order is race position AT THE STARTING MOMENT, not car number
//   - cars on pit road are INCLUDED (they are shot wherever they are)
//   - the pace car is never shot
//
// Pure and dependency-free so it is unit-tested without a sim.

// irsdk_TrkLoc.NotInWorld — the car is not on the track at this moment: in the
// garage, disconnected, or retired and towed. CarIdxLapDistPct reads -1 with it.
export const TRK_NOT_IN_WORLD = -1;

export interface GridDriver {
	carIdx: number;
	carNumber: string;
	// The car number as the camera broadcast expects it. iRacing encodes leading
	// zeros into it ("007" and "7" are different cars), so this — never a parse of
	// `carNumber` — is what goes to changeCameraNumber.
	carNumberRaw: number;
	driverName: string;
	isPaceCar: boolean;
	isSpectator: boolean;
	// The class's estimated lap time in seconds, the position search's first guess
	// at how fast this car covers the lap. Null when the session does not say.
	estLapTimeSec: number | null;
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
	return typeof value === 'string'
		? value
		: value == null
			? ''
			: String(value);
}

// The driver list from the parsed session YAML (`iracing.sessionInfo.data`).
// Entries without a usable CarIdx are dropped; everything else is kept so the
// roster can explain why it was left out.
type YamlRecord = Record<string, unknown> | null | undefined;

export function readGridDrivers(sessionData: unknown): GridDriver[] {
	const driverInfo = (sessionData as YamlRecord)?.DriverInfo as YamlRecord;
	const drivers = driverInfo?.Drivers;
	if (!Array.isArray(drivers)) {
		return [];
	}
	// PaceCarIdx is -1 when the session has no pace car. Checked alongside the
	// per-driver flag in case either is missing from an older session string.
	const paceCarIdx = num(driverInfo?.PaceCarIdx);

	const out: GridDriver[] = [];
	for (const raw of drivers) {
		const d = raw as YamlRecord;
		const carIdx = num(d?.CarIdx);
		if (carIdx === null || carIdx < 0) {
			continue;
		}
		const estLapTime = num(d?.CarClassEstLapTime);
		out.push({
			carIdx,
			carNumber: str(d?.CarNumber),
			carNumberRaw: num(d?.CarNumberRaw) ?? -1,
			driverName: str(d?.UserName),
			isPaceCar:
				d?.CarIsPaceCar === 1 ||
				d?.CarIsPaceCar === true ||
				(paceCarIdx !== null && paceCarIdx >= 0 && carIdx === paceCarIdx),
			isSpectator: d?.IsSpectator === 1 || d?.IsSpectator === true,
			estLapTimeSec:
				estLapTime !== null && estLapTime > 0 ? estLapTime : null,
		});
	}
	return out;
}

// "5.51 km" / "3.42 mi" → metres. WeekendInfo.TrackLength is a display string.
// Used only to report how far off a match landed in units a person reads.
export function parseTrackLengthMeters(value: unknown): number | null {
	if (typeof value !== 'string') {
		return null;
	}
	const match = /^\s*([0-9]+(?:\.[0-9]+)?)\s*(km|mi)\s*$/i.exec(value);
	if (!match) {
		return null;
	}
	const length = Number(match[1]);
	if (!Number.isFinite(length) || length <= 0) {
		return null;
	}
	return match[2].toLowerCase() === 'mi' ? length * 1609.344 : length * 1000;
}

// The per-car telemetry the roster needs, at one frame.
export interface GridTelemetry {
	camCarIdx: number | null;
	lapDistPct: readonly number[] | null;
	trackSurface: readonly number[] | null;
	racePosition: readonly number[] | null;
	lapCompleted: readonly number[] | null;
	onPitRoad: readonly boolean[] | null;
}

function numArray(value: unknown): number[] | null {
	return Array.isArray(value) ? value.map((v) => num(v) ?? NaN) : null;
}

export function readGridTelemetry(
	values: Record<string, unknown> | null | undefined
): GridTelemetry {
	return {
		camCarIdx: num(values?.CamCarIdx),
		lapDistPct: numArray(values?.CarIdxLapDistPct),
		trackSurface: numArray(values?.CarIdxTrackSurface),
		racePosition: numArray(values?.CarIdxPosition),
		lapCompleted: numArray(values?.CarIdxLapCompleted),
		onPitRoad: Array.isArray(values?.CarIdxOnPitRoad)
			? (values?.CarIdxOnPitRoad as unknown[]).map((v) => v === true)
			: null,
	};
}

// A car's distance around the lap at this frame, or null when it is not on the
// track (NotInWorld, or the -1 sentinel iRacing writes for absent cars).
export function carLapDistPct(
	telemetry: GridTelemetry,
	carIdx: number
): number | null {
	const surface = telemetry.trackSurface?.[carIdx];
	if (surface === TRK_NOT_IN_WORLD) {
		return null;
	}
	const pct = telemetry.lapDistPct?.[carIdx];
	return typeof pct === 'number' && Number.isFinite(pct) && pct >= 0
		? pct
		: null;
}

export type GridSkipReason = 'pace-car' | 'spectator' | 'not-in-world';

export interface GridCar {
	carIdx: number;
	carNumber: string;
	carNumberRaw: number;
	driverName: string;
	estLapTimeSec: number | null;
	// Race position at the starting moment; null before the green flag, or for a
	// car the sim has not classified.
	racePosition: number | null;
	onPitRoad: boolean;
	// The car the camera was on. It is shot at the starting frame itself, with no
	// search — its position IS the reference.
	isReference: boolean;
}

export interface GridSkip {
	carIdx: number;
	carNumber: string;
	driverName: string;
	reason: GridSkipReason;
}

export interface GridRoster {
	referenceCarIdx: number | null;
	// The distance every car is matched to. Null when the reference car is not on
	// the track — there is then nothing to match and the grid cannot start.
	referencePct: number | null;
	cars: GridCar[];
	skipped: GridSkip[];
}

// Race position first; cars without one (before the green, or unclassified)
// after them in track order, which before the start is the grid itself. CarIdx
// breaks any remaining tie so the order is stable across calls.
function compareCars(
	a: GridCar & { progress: number },
	b: GridCar & { progress: number }
): number {
	const pa = a.racePosition;
	const pb = b.racePosition;
	if (pa !== null && pb !== null && pa !== pb) {
		return pa - pb;
	}
	if (pa !== null && pb === null) {
		return -1;
	}
	if (pa === null && pb !== null) {
		return 1;
	}
	if (a.progress !== b.progress) {
		return b.progress - a.progress;
	}
	return a.carIdx - b.carIdx;
}

export function buildGridRoster(
	drivers: readonly GridDriver[],
	telemetry: GridTelemetry
): GridRoster {
	const referenceCarIdx = telemetry.camCarIdx;
	const referencePct =
		referenceCarIdx === null
			? null
			: carLapDistPct(telemetry, referenceCarIdx);

	const ranked: Array<GridCar & { progress: number }> = [];
	const skipped: GridSkip[] = [];

	for (const driver of drivers) {
		const skip = (reason: GridSkipReason) =>
			skipped.push({
				carIdx: driver.carIdx,
				carNumber: driver.carNumber,
				driverName: driver.driverName,
				reason,
			});

		if (driver.isPaceCar) {
			skip('pace-car');
			continue;
		}
		if (driver.isSpectator) {
			skip('spectator');
			continue;
		}
		// Not on track at the starting moment: retired, disconnected or in the
		// garage. Its nearest crossing could be laps ago, which is not the "same
		// moment" a grid promises, and from here there is no position to search
		// from. Skipped, with the reason shown.
		const pct = carLapDistPct(telemetry, driver.carIdx);
		if (pct === null) {
			skip('not-in-world');
			continue;
		}

		const position = telemetry.racePosition?.[driver.carIdx];
		const laps = telemetry.lapCompleted?.[driver.carIdx];
		ranked.push({
			carIdx: driver.carIdx,
			carNumber: driver.carNumber,
			carNumberRaw: driver.carNumberRaw,
			driverName: driver.driverName,
			estLapTimeSec: driver.estLapTimeSec,
			// iRacing reports 0 for "no position yet".
			racePosition:
				typeof position === 'number' &&
				Number.isFinite(position) &&
				position > 0
					? position
					: null,
			onPitRoad: telemetry.onPitRoad?.[driver.carIdx] === true,
			isReference: driver.carIdx === referenceCarIdx,
			progress:
				(typeof laps === 'number' && Number.isFinite(laps) && laps > 0
					? laps
					: 0) + pct,
		});
	}

	ranked.sort(compareCars);
	const cars: GridCar[] = ranked.map(({ progress: _progress, ...car }) => car);

	return { referenceCarIdx, referencePct, cars, skipped };
}
