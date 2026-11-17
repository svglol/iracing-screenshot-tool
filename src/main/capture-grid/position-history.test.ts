import { describe, expect, it } from 'vitest';
import {
	CAR_SLOTS,
	MAX_EXTRAPOLATE_S,
	MAX_HISTORY_SECONDS,
	PositionHistory,
	ReplayClockModel,
	historySampleFrom,
	telemetryAtReplay,
	readSimMode,
	replayClock,
	type HistorySample,
} from './position-history';

// A race where car c is at (offset_c + speed * t) laps; car 5 is in its pit
// stall (on pit road, not moving), car 9 is not in the world.
function raceAt(sessionTime: number, sessionNum = 2): HistorySample {
	const lapDistPct: number[] = [];
	const trackSurface: number[] = [];
	const onPitRoad: boolean[] = [];
	const racePosition: number[] = [];
	const lapCompleted: number[] = [];
	for (let car = 0; car < CAR_SLOTS; car++) {
		const laps = car * 0.07 + sessionTime / 100; // 100 s laps
		lapDistPct.push(
			car === 9 ? -1 : car === 5 ? 0.02 : laps - Math.floor(laps)
		);
		trackSurface.push(car === 9 ? -1 : car === 5 ? 1 : 3);
		onPitRoad.push(car === 5);
		racePosition.push(car + 1);
		lapCompleted.push(Math.floor(laps));
	}
	return {
		sessionNum,
		sessionTime,
		lapDistPct,
		trackSurface,
		onPitRoad,
		racePosition,
		lapCompleted,
	};
}

function recordRange(
	history: PositionHistory,
	from: number,
	to: number,
	step = 1 / 60,
	sessionNum = 2
) {
	for (let t = from; t <= to + 1e-9; t += step) {
		history.record(raceAt(t, sessionNum));
	}
}

describe('PositionHistory', () => {
	it('keeps one sample per tenth of a second from a 60 Hz feed', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20);
		expect(history.sampleCount).toBeGreaterThanOrEqual(99);
		expect(history.sampleCount).toBeLessThanOrEqual(101);
		expect(history.coverage()).toEqual([
			{ sessionNum: 2, from: 10, to: expect.closeTo(20, 1) },
		]);
	});

	it('interpolates every car between samples, to well under a metre', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20);
		const t = 14.537;
		const got = history.at(2, t);
		const truth = raceAt(t);
		expect(got).not.toBeNull();
		for (const car of [0, 1, 13, 40]) {
			// On a 5 km lap, 1e-5 laps = 5 cm.
			expect(got.lapDistPct[car]).toBeCloseTo(truth.lapDistPct[car], 5);
		}
		expect(got.lapDistPct[9]).toBe(-1);
		expect(got.trackSurface[9]).toBe(-1);
		expect(got.onPitRoad[5]).toBe(true);
		expect(got.onPitRoad[4]).toBe(false);
		expect(got.trackSurface[5]).toBe(1);
		expect(got.racePosition[13]).toBe(14);
	});

	it('interpolates across the start/finish line the short way round', () => {
		const history = new PositionHistory();
		// Car 0 crosses the line at t = 100.
		recordRange(history, 99, 101);
		const got = history.at(2, 100.04);
		const pct = got.lapDistPct[0];
		expect(pct).toBeGreaterThanOrEqual(0);
		expect(pct).toBeLessThan(0.001);
		const before = history.at(2, 99.96).lapDistPct[0];
		expect(before).toBeGreaterThan(0.999);
	});

	it('answers null before the recording started, and inside a gap', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20);
		recordRange(history, 30, 40); // the app was not polling for 10 s
		expect(history.at(2, 9.9)).toBeNull();
		expect(history.at(2, 25)).toBeNull();
		expect(history.at(2, 35)).not.toBeNull();
		expect(history.at(1, 15)).toBeNull(); // a session never recorded
	});

	it('extrapolates a moment just past the newest sample (the live edge), not further', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20);
		const last = history.coverage()[0].to;
		const near = history.at(2, last + MAX_EXTRAPOLATE_S / 2);
		expect(near.lapDistPct[1]).toBeCloseTo(
			raceAt(last + MAX_EXTRAPOLATE_S / 2).lapDistPct[1],
			5
		);
		expect(history.at(2, last + MAX_EXTRAPOLATE_S * 2)).toBeNull();
	});

	it('keeps sessions apart, and answers each from its own samples', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20, 1 / 60, 1);
		recordRange(history, 0, 5, 1 / 60, 2); // the race starts; time restarts
		expect(history.at(1, 15)).not.toBeNull();
		expect(history.at(2, 3)).not.toBeNull();
		expect(history.coverage().map((c) => c.sessionNum)).toEqual([1, 2]);
	});

	it('drops everything when time runs backwards inside a session (a new event)', () => {
		const history = new PositionHistory();
		recordRange(history, 100, 110);
		recordRange(history, 5, 6);
		expect(history.at(2, 105)).toBeNull();
		expect(history.at(2, 5.5)).not.toBeNull();
	});

	it('forgets the oldest samples past the cap', () => {
		const history = new PositionHistory();
		const end = MAX_HISTORY_SECONDS + 600;
		recordRange(history, 0, end, 0.1);
		const [span] = history.coverage();
		expect(span.to).toBeCloseTo(end, 0);
		expect(span.to - span.from).toBeLessThanOrEqual(MAX_HISTORY_SECONDS + 1);
		expect(history.at(2, 10)).toBeNull();
	});

	it('ignores a sample without positions or a clock', () => {
		const history = new PositionHistory();
		expect(history.record({ ...raceAt(1), lapDistPct: null })).toBe(false);
		expect(history.record({ ...raceAt(1), sessionTime: NaN })).toBe(false);
		expect(history.sampleCount).toBe(0);
	});
});

describe('replayClock / readSimMode', () => {
	it('reads the replay session and time', () => {
		expect(
			replayClock({ ReplaySessionNum: 0, ReplaySessionTime: 60.477 })
		).toEqual({ sessionNum: 0, sessionTime: 60.477 });
		expect(replayClock({ ReplaySessionNum: 0 })).toBeNull();
		expect(replayClock(null)).toBeNull();
	});

	it('reads SimMode from the session YAML', () => {
		expect(readSimMode({ WeekendInfo: { SimMode: 'full' } })).toBe('full');
		expect(readSimMode({ WeekendInfo: { SimMode: 'Replay' } })).toBe(
			'replay'
		);
		expect(readSimMode({})).toBeNull();
	});
});

describe('telemetryAtReplay', () => {
	const liveNow = {
		camCarIdx: 3,
		lapDistPct: Array(CAR_SLOTS).fill(0.9),
		trackSurface: Array(CAR_SLOTS).fill(3),
		racePosition: Array(CAR_SLOTS).fill(1),
		lapCompleted: Array(CAR_SLOTS).fill(7),
		onPitRoad: Array(CAR_SLOTS).fill(false),
		lastLapTime: Array(CAR_SLOTS).fill(101),
		bestLapTime: Array(CAR_SLOTS).fill(100),
	};

	it('uses iRacing’s own values outside a live session', () => {
		const history = new PositionHistory();
		const got = telemetryAtReplay({}, liveNow, 'replay', history);
		expect(got.source).toBe('telemetry');
		expect(got.telemetry).toBe(liveNow);
	});

	it('reads positions from the recording at the replay time in a live session', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20);
		const got = telemetryAtReplay(
			{ ReplaySessionNum: 2, ReplaySessionTime: 12.34 },
			liveNow,
			'full',
			history
		);
		expect(got.source).toBe('history');
		expect(got.telemetry.lapDistPct[1]).toBeCloseTo(
			raceAt(12.34).lapDistPct[1],
			5
		);
		// Camera and lap times are not recorded: they come from the live values.
		expect(got.telemetry.camCarIdx).toBe(3);
		expect(got.telemetry.lastLapTime[0]).toBe(101);
	});

	it('says so when the replay is on a moment the recording does not cover', () => {
		const history = new PositionHistory();
		recordRange(history, 10, 20);
		const got = telemetryAtReplay(
			{ ReplaySessionNum: 2, ReplaySessionTime: 5 },
			liveNow,
			'full',
			history
		);
		expect(got.source).toBe('not-recorded');
		expect(got.telemetry.lapDistPct).toBeNull();
		expect(got.telemetry.camCarIdx).toBe(3);
	});

	it('builds a sample from the live clock', () => {
		expect(
			historySampleFrom({ SessionNum: 2, SessionTime: 80.5 }, liveNow)
		).toMatchObject({ sessionNum: 2, sessionTime: 80.5 });
		expect(historySampleFrom({ SessionNum: 2 }, liveNow)).toBeNull();
	});
});

describe('ReplayClockModel', () => {
	// The live tape as measured: frames at exactly 60/s from some offset, and a
	// replay clock that only moves in ~0.08 s steps.
	const OFFSET = 4.3721;
	const coarse = (frame: number) =>
		Math.floor((frame / 60 + OFFSET) / 0.08) * 0.08;

	it('turns a coarse replay clock into a per-frame time', () => {
		const model = new ReplayClockModel();
		// Readings as a search and the update loop would make them.
		for (let f = 150_000; f < 150_600; f += 7) {
			model.timeAt(0, f, coarse(f));
		}
		// Neighbouring frames now differ by one frame's time, never 0 or 0.08.
		const a = model.timeAt(0, 151_390, coarse(151_390));
		const b = model.timeAt(0, 151_391, coarse(151_391));
		expect(b - a).toBeCloseTo(1 / 60, 6);
		// And within half a clock step of the truth (a constant bias at most).
		expect(Math.abs(a - (151_390 / 60 + OFFSET))).toBeLessThanOrEqual(0.045);
	});

	it('the coarse clock alone reads neighbouring frames as the same moment', () => {
		// The failure this model exists for.
		const same = [151_390, 151_391, 151_392].map(coarse);
		expect(new Set(same).size).toBeLessThan(3);
	});

	it('starts over on a jump in the tape or a new session', () => {
		const model = new ReplayClockModel();
		model.timeAt(0, 1000, 1000 / 60 + 10);
		// Ten seconds of tape missing: the offset moved by 10 s.
		expect(model.timeAt(0, 2000, 2000 / 60 + 20)).toBeCloseTo(
			2000 / 60 + 20,
			6
		);
		expect(model.timeAt(1, 2000, 5)).toBeCloseTo(5, 6);
	});

	it('ignores the zero readings iRacing gives mid-seek', () => {
		const model = new ReplayClockModel();
		model.timeAt(0, 1000, 1000 / 60 + 10);
		model.timeAt(0, 0, 0);
		model.timeAt(-1, 1500, 0);
		expect(model.timeAt(0, 1200, 1200 / 60 + 10)).toBeCloseTo(
			1200 / 60 + 10,
			6
		);
	});
});
