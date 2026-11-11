import { describe, expect, it } from 'vitest';
import {
	buildGridRoster,
	carLapDistPct,
	encodeCameraCarNumber,
	groupByClass,
	padCarNum,
	parseTrackLengthMeters,
	readGridDrivers,
	readGridTelemetry,
	type GridDriver,
	type GridTelemetry,
} from './roster';

function driver(
	carIdx: number,
	overrides: Partial<GridDriver> = {}
): GridDriver {
	return {
		carIdx,
		carNumber: String(carIdx),
		cameraNumber: carIdx,
		classId: 1,
		className: 'GT3',
		classColor: 0xff0000,
		driverName: `Driver ${carIdx}`,
		isPaceCar: false,
		isSpectator: false,
		estLapTimeSec: 90,
		...overrides,
	};
}

// Per-car arrays sized like the SDK's (64 slots), filled from a sparse map.
function telemetry(
	cars: Record<
		number,
		{
			pct: number;
			surface?: number;
			pos?: number;
			laps?: number;
			pit?: boolean;
		}
	>,
	camCarIdx: number | null
): GridTelemetry {
	const lapDistPct = new Array(64).fill(-1);
	const trackSurface = new Array(64).fill(-1);
	const racePosition = new Array(64).fill(0);
	const lapCompleted = new Array(64).fill(-1);
	const onPitRoad = new Array(64).fill(false);
	for (const [idx, c] of Object.entries(cars)) {
		const i = Number(idx);
		lapDistPct[i] = c.pct;
		trackSurface[i] = c.surface ?? 3;
		racePosition[i] = c.pos ?? 0;
		lapCompleted[i] = c.laps ?? 0;
		onPitRoad[i] = c.pit ?? false;
	}
	return {
		camCarIdx,
		lapDistPct,
		trackSurface,
		racePosition,
		lapCompleted,
		onPitRoad,
	};
}

describe('readGridDrivers', () => {
	it('maps the session driver list and flags the pace car both ways', () => {
		const drivers = readGridDrivers({
			DriverInfo: {
				PaceCarIdx: 0,
				Drivers: [
					{
						CarIdx: 0,
						UserName: 'Pace Car',
						CarNumber: '0',
						CarNumberRaw: 0,
						CarIsPaceCar: 0,
					},
					{
						CarIdx: 1,
						UserName: 'A',
						CarNumber: '007',
						CarNumberRaw: 3007,
						CarClassEstLapTime: 92.5,
					},
					{
						CarIdx: 2,
						UserName: 'B',
						CarNumber: '7',
						CarNumberRaw: 7,
						CarIsPaceCar: 1,
					},
					{ CarIdx: 3, UserName: 'Spec', IsSpectator: 1 },
					{ UserName: 'no idx' },
				],
			},
		});
		expect(drivers.map((d) => d.carIdx)).toEqual([0, 1, 2, 3]);
		expect(drivers[0].isPaceCar).toBe(true); // via PaceCarIdx
		expect(drivers[2].isPaceCar).toBe(true); // via CarIsPaceCar
		expect(drivers[1]).toMatchObject({
			carNumber: '007',
			cameraNumber: 3007,
			estLapTimeSec: 92.5,
			isPaceCar: false,
		});
		expect(drivers[3].isSpectator).toBe(true);
		expect(drivers[3].estLapTimeSec).toBeNull();
	});

	it('returns nothing for a missing session', () => {
		expect(readGridDrivers(null)).toEqual([]);
		expect(readGridDrivers({ DriverInfo: {} })).toEqual([]);
	});

	it('discards an implausible class lap-time estimate', () => {
		// Hardware, 2026-11-11: an AI race at Fuji reported 1 for every car.
		const drivers = readGridDrivers({
			DriverInfo: {
				Drivers: [
					{ CarIdx: 1, CarNumber: '3', CarClassEstLapTime: 1 },
					{ CarIdx: 2, CarNumber: '4', CarClassEstLapTime: 101.2 },
				],
			},
		});
		expect(drivers.map((d) => d.estLapTimeSec)).toEqual([null, 101.2]);
	});

	it('does not treat a PaceCarIdx of -1 as car 0', () => {
		const [d] = readGridDrivers({
			DriverInfo: {
				PaceCarIdx: -1,
				Drivers: [{ CarIdx: 0, UserName: 'A' }],
			},
		});
		expect(d.isPaceCar).toBe(false);
	});
});

describe('car numbers for the camera broadcast', () => {
	it('matches irsdk_padCarNum', () => {
		expect(padCarNum(1, 2)).toBe(3001); // the SDK header's own example: #001
		expect(padCarNum(7, 0)).toBe(7);
		expect(padCarNum(12, 1)).toBe(3012);
		expect(padCarNum(0, 1)).toBe(2000);
	});

	it('encodes leading zeros from the displayed number', () => {
		expect(encodeCameraCarNumber('7', 7)).toBe(7);
		expect(encodeCameraCarNumber('007', 7)).toBe(3007);
		expect(encodeCameraCarNumber('07', 7)).toBe(2007);
		expect(encodeCameraCarNumber('194', 194)).toBe(194);
		expect(encodeCameraCarNumber('0', 0)).toBe(0);
	});

	it('falls back to CarNumberRaw for a non-numeric display', () => {
		expect(encodeCameraCarNumber('', 42)).toBe(42);
		expect(encodeCameraCarNumber('A1', 5)).toBe(5);
		expect(encodeCameraCarNumber('', null)).toBeNull();
		expect(encodeCameraCarNumber('', -1)).toBeNull();
	});
});

describe('parseTrackLengthMeters', () => {
	it('reads km and miles', () => {
		expect(parseTrackLengthMeters('5.51 km')).toBeCloseTo(5510);
		expect(parseTrackLengthMeters('2.50 mi')).toBeCloseTo(4023.36);
	});
	it('rejects anything else', () => {
		expect(parseTrackLengthMeters('fast')).toBeNull();
		expect(parseTrackLengthMeters(5.5)).toBeNull();
		expect(parseTrackLengthMeters('0 km')).toBeNull();
	});
});

describe('readGridTelemetry / carLapDistPct', () => {
	it('maps the flattened telemetry values', () => {
		const t = readGridTelemetry({
			CamCarIdx: 4,
			CarIdxLapDistPct: [0.1, -1],
			CarIdxTrackSurface: [3, -1],
			CarIdxPosition: [2, 0],
			CarIdxLapCompleted: [5, -1],
			CarIdxOnPitRoad: [true, false],
		});
		expect(t.camCarIdx).toBe(4);
		expect(carLapDistPct(t, 0)).toBe(0.1);
		expect(carLapDistPct(t, 1)).toBeNull();
		expect(t.onPitRoad).toEqual([true, false]);
	});

	it('treats NotInWorld as off track even with a stale distance', () => {
		const t = telemetry({ 5: { pct: 0.4, surface: -1 } }, 5);
		expect(carLapDistPct(t, 5)).toBeNull();
	});

	it('survives missing telemetry', () => {
		const t = readGridTelemetry(null);
		expect(t.camCarIdx).toBeNull();
		expect(carLapDistPct(t, 0)).toBeNull();
	});
});

describe('buildGridRoster', () => {
	it('orders by race position at the starting moment', () => {
		const roster = buildGridRoster(
			[driver(1), driver(2), driver(3)],
			telemetry(
				{
					1: { pct: 0.5, pos: 3 },
					2: { pct: 0.4, pos: 1 },
					3: { pct: 0.3, pos: 2 },
				},
				3
			)
		);
		expect(roster.cars.map((c) => c.carIdx)).toEqual([2, 3, 1]);
		expect(roster.referenceCarIdx).toBe(3);
		expect(roster.referencePct).toBe(0.3);
		expect(roster.cars.find((c) => c.isReference)?.carIdx).toBe(3);
	});

	it('falls back to track order before the green flag', () => {
		const roster = buildGridRoster(
			[driver(1), driver(2), driver(3), driver(4)],
			telemetry(
				{
					1: { pct: 0.9, laps: 0 },
					2: { pct: 0.1, laps: 1 }, // a lap further on: ahead of car 1
					3: { pct: 0.95, laps: 0 },
					4: { pct: 0.2, pos: 1 }, // classified cars come first
				},
				1
			)
		);
		expect(roster.cars.map((c) => c.carIdx)).toEqual([4, 2, 3, 1]);
	});

	it('includes cars on pit road and says so', () => {
		const roster = buildGridRoster(
			[driver(1), driver(2)],
			telemetry(
				{
					1: { pct: 0.5, pos: 1 },
					2: { pct: 0.1, pos: 2, surface: 2, pit: true },
				},
				1
			)
		);
		expect(roster.cars.map((c) => c.carIdx)).toEqual([1, 2]);
		expect(roster.cars[1].onPitRoad).toBe(true);
		expect(roster.skipped).toEqual([]);
	});

	it('skips the pace car, spectators and cars not on track, with reasons', () => {
		const roster = buildGridRoster(
			[
				driver(0, { isPaceCar: true }),
				driver(1),
				driver(2, { isSpectator: true }),
				driver(3),
			],
			telemetry(
				{
					0: { pct: 0.2 },
					1: { pct: 0.5, pos: 1 },
					3: { pct: 0.4, surface: -1 },
				},
				1
			)
		);
		expect(roster.cars.map((c) => c.carIdx)).toEqual([1]);
		expect(roster.skipped.map((s) => [s.carIdx, s.reason])).toEqual([
			[0, 'pace-car'],
			[2, 'spectator'],
			[3, 'not-in-world'],
		]);
	});

	it('skips a car the camera cannot be pointed at, but never the reference', () => {
		const roster = buildGridRoster(
			[driver(1, { cameraNumber: null }), driver(2, { cameraNumber: null })],
			telemetry({ 1: { pct: 0.5, pos: 1 }, 2: { pct: 0.4, pos: 2 } }, 1)
		);
		expect(roster.cars.map((c) => c.carIdx)).toEqual([1]);
		expect(roster.skipped.map((s) => [s.carIdx, s.reason])).toEqual([
			[2, 'no-car-number'],
		]);
	});

	it('ignores the pace car slot past the end of the telemetry arrays', () => {
		// Hardware, 2026-11-11: the pace car was CarIdx 64 with 64-slot arrays.
		const roster = buildGridRoster(
			[driver(1), driver(64, { isPaceCar: true })],
			telemetry({ 1: { pct: 0.5, pos: 1 } }, 1)
		);
		expect(roster.cars.map((c) => c.carIdx)).toEqual([1]);
		expect(roster.skipped.map((s) => s.reason)).toEqual(['pace-car']);
	});

	it('still has a reference distance when the camera is on the pace car', () => {
		const roster = buildGridRoster(
			[driver(0, { isPaceCar: true }), driver(1)],
			telemetry({ 0: { pct: 0.25 }, 1: { pct: 0.5, pos: 1 } }, 0)
		);
		expect(roster.referencePct).toBe(0.25);
		expect(roster.cars.some((c) => c.isReference)).toBe(false);
	});

	it('has no reference distance when the reference car is off track', () => {
		const roster = buildGridRoster(
			[driver(1), driver(2)],
			telemetry({ 1: { pct: 0.5, surface: -1 }, 2: { pct: 0.5, pos: 1 } }, 1)
		);
		expect(roster.referencePct).toBeNull();
	});
});

describe('classes', () => {
	it('reads the class, falling back to the car name, then the id', () => {
		const drivers = readGridDrivers({
			DriverInfo: {
				Drivers: [
					{
						CarIdx: 1,
						CarClassID: 4,
						CarClassShortName: 'GT3',
						CarClassColor: 0xffda59,
					},
					{
						CarIdx: 2,
						CarClassID: 5,
						CarClassShortName: ' ',
						CarScreenNameShort: 'MX-5',
					},
					{ CarIdx: 3, CarClassID: 6 },
				],
			},
		});
		expect(
			drivers.map((d) => [d.classId, d.className, d.classColor])
		).toEqual([
			[4, 'GT3', 0xffda59],
			[5, 'MX-5', null],
			[6, 'Class 6', null],
		]);
	});

	it('groups cars by class, leading class first, race order kept', () => {
		const roster = buildGridRoster(
			[
				driver(1, { classId: 2, className: 'GT4' }),
				driver(2, { classId: 1, className: 'GT3' }),
				driver(3, { classId: 2, className: 'GT4' }),
				driver(4, { classId: 1, className: 'GT3' }),
			],
			telemetry(
				{
					1: { pct: 0.1, pos: 3 },
					2: { pct: 0.2, pos: 1 },
					3: { pct: 0.3, pos: 4 },
					4: { pct: 0.4, pos: 2 },
				},
				2
			)
		);
		const classes = groupByClass(roster.cars);
		expect(
			classes.map((c) => [c.className, c.cars.map((x) => x.carIdx)])
		).toEqual([
			['GT3', [2, 4]],
			['GT4', [1, 3]],
		]);
	});
});
