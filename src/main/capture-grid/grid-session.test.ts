import { describe, expect, it, vi } from 'vitest';
import {
	MAX_SHOT_ATTEMPTS,
	runGrid,
	type GridPlan,
	type GridShotOutcome,
	type ShotCheck,
} from './grid-session';
import {
	ReplayController,
	capturePlaybackSnapshot,
	readReplayState,
} from '../replay-control';
import type { GridCar } from './roster';

vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

const LAP = 5400; // frames per lap
const ANCHOR = 20_000;
const TAPE_END = 60_000;

interface WorldOptions {
	// Unwrapped laps per car, by CarIdx.
	cars: Record<number, (frame: number) => number>;
	// Broadcast number → the car the camera actually goes to.
	numberToIdx?: (n: number) => number | null;
	startCamCar?: number;
}

// One simulated sim: a replay tape every car moves along, a camera, and an event
// log so the tests can assert ORDER (restore replay before camera).
function makeWorld(opts: WorldOptions) {
	let clock = 0;
	let frame = ANCHOR;
	let speed = 1;
	const cam = { carIdx: opts.startCamCar ?? 1, group: 22, camera: 1 };
	const events: string[] = [];
	const pctOf = (carIdx: number, f: number) => {
		const laps = opts.cars[carIdx](f);
		return laps - Math.floor(laps);
	};

	const delay = async (ms: number) => {
		clock += ms;
	};
	const now = () => clock;

	const replay = new ReplayController({
		readState: () =>
			readReplayState({
				ReplayFrameNum: frame,
				ReplayFrameNumEnd: TAPE_END - frame,
				ReplaySessionNum: 0,
				ReplayPlaySpeed: speed,
				IsReplayPlaying: true,
			}),
		setPlaySpeed: (s) => {
			speed = s;
			events.push(`speed:${s}`);
		},
		setPlayPosition: (mode, f) => {
			frame = mode === 0 ? f : frame + f;
			events.push(`seek:${frame}`);
		},
		delay,
		now,
	});

	return {
		events,
		cam,
		frame: () => frame,
		pctOf,
		deps: {
			replay,
			search: {
				readSample: (carIdx: number) => ({
					frame,
					pct: pctOf(carIdx, frame),
				}),
				seekAbsolute: (f: number) => replay.seekAbsolute(f),
				delay,
				now,
			},
			// Every car's distance at the current frame, in 64 SDK-sized slots.
			readTelemetry: () => {
				const lapDistPct = new Array(64).fill(-1);
				const trackSurface = new Array(64).fill(-1);
				for (const idx of Object.keys(opts.cars).map(Number)) {
					lapDistPct[idx] = pctOf(idx, frame);
					trackSurface[idx] = 3;
				}
				return {
					camCarIdx: cam.carIdx,
					lapDistPct,
					trackSurface,
					racePosition: null,
					lapCompleted: null,
					onPitRoad: new Array(64).fill(false),
					lastLapTime: new Array(64).fill(LAP / 60),
					bestLapTime: null,
				};
			},
			camera: {
				readView: () => ({ ...cam }),
				switchCamera: (n: number, group: number, camera: number) => {
					const idx = (opts.numberToIdx ?? ((x: number) => x))(n);
					events.push(`camera:${n}`);
					if (idx !== null) {
						cam.carIdx = idx;
						cam.group = group;
						cam.camera = camera;
					}
				},
				delay,
				now,
			},
			delay,
		},
		snapshot: () =>
			capturePlaybackSnapshot(
				readReplayState({
					ReplayFrameNum: frame,
					ReplayPlaySpeed: speed,
					IsReplayPlaying: true,
				})!
			),
	};
}

function car(
	carIdx: number,
	startPct: number,
	extra: Partial<GridCar> = {}
): GridCar {
	return {
		carIdx,
		carNumber: String(carIdx),
		cameraNumber: carIdx,
		driverName: `Driver ${carIdx}`,
		classId: 1,
		className: 'GT3',
		classColor: null,
		carModel: 'Ferrari 296 GT3',
		estLapTimeSec: 90,
		racePosition: carIdx,
		onPitRoad: false,
		startPct,
		isReference: false,
		...extra,
	};
}

const steady = (pctAtAnchor: number) => (f: number) =>
	pctAtAnchor + (f - ANCHOR) / LAP;

function setup(
	cars: Record<number, number>,
	opts: Partial<WorldOptions> & {
		shoot?: (
			c: GridCar,
			index: number,
			world: ReturnType<typeof makeWorld>,
			check: ShotCheck
		) => GridShotOutcome;
		// Cars on track but not in the grid, as unwrapped-laps functions.
		traffic?: Record<number, (frame: number) => number>;
		minGapMeters?: number;
		holdCamera?: boolean;
		prepare?: () => { ok: true } | { ok: false; message: string };
		gridCars?: GridCar[];
		referencePct?: number;
	} = {}
) {
	const world = makeWorld({
		...opts,
		cars: {
			...Object.fromEntries(
				Object.entries(cars).map(([idx, pct]) => [idx, steady(pct)])
			),
			...opts.traffic,
		},
	});
	const shots: Array<{
		carIdx: number;
		frame: number;
		camCar: number;
		group: number;
	}> = [];
	const signal = { aborted: false };
	const restoreWindow = vi.fn(() => world.events.push('window'));
	const plan: GridPlan = {
		cars:
			opts.gridCars ??
			Object.entries(cars).map(([idx, pct]) =>
				car(Number(idx), pct, { isReference: Number(idx) === 1 })
			),
		referencePct: opts.referencePct ?? cars[1],
		snapshot: world.snapshot(),
		view: { ...world.cam },
		viewCameraNumber: world.cam.carIdx,
		holdCamera: opts.holdCamera ?? true,
		tapeEndFrame: TAPE_END,
		trackLengthMeters: 4500,
		minGapMeters: opts.minGapMeters ?? 0,
	};
	const run = () =>
		runGrid(plan, {
			...world.deps,
			signal,
			prepare: async () => opts.prepare?.() ?? { ok: true },
			shoot: async (c, index, check) => {
				shots.push({
					carIdx: c.carIdx,
					frame: world.frame(),
					camCar: world.cam.carIdx,
					group: world.cam.group,
				});
				return (
					opts.shoot?.(c, index, world, check) ?? {
						ok: true,
						path: `shot-${c.carIdx}.png`,
					}
				);
			},
			restoreWindow,
		});
	return { world, shots, signal, restoreWindow, plan, run };
}

describe('runGrid', () => {
	it('shoots every car at the reference distance, then puts everything back', async () => {
		// Car 1 is the reference at 0.30; the others are spread around the lap.
		const g = setup({ 1: 0.3, 2: 0.25, 3: 0.4, 4: 0.9 });
		const out = await g.run();

		expect(out.ok).toBe(true);
		expect(out.results.map((r) => r.status)).toEqual([
			'shot',
			'shot',
			'shot',
			'shot',
		]);
		for (const shot of g.shots) {
			// Camera on the right car, replay on a frame where it sits at 0.30.
			expect(shot.camCar).toBe(shot.carIdx);
			expect(g.world.pctOf(shot.carIdx, shot.frame)).toBeCloseTo(0.3, 3);
		}
		// Nearest to the ANCHOR, whichever car the replay was left on before.
		expect(g.shots.map((s) => s.frame)).toEqual([
			ANCHOR,
			ANCHOR + 0.05 * LAP,
			ANCHOR - 0.1 * LAP,
			ANCHOR + 0.4 * LAP,
		]);
		expect(out.restore?.landedExactly).toBe(true);
		expect(g.world.frame()).toBe(ANCHOR);
		expect(out.cameraRestored).toBe(true);
		expect(g.world.cam.carIdx).toBe(1);
		expect(g.restoreWindow).toHaveBeenCalledTimes(1);
	});

	it('restores the replay BEFORE the camera, and the window last', async () => {
		const g = setup({ 1: 0.3, 2: 0.25 });
		await g.run();
		const tail = g.world.events.slice(-4);
		expect(tail).toEqual([`seek:${ANCHOR}`, 'speed:1', 'camera:1', 'window']);
	});

	it('records a camera that went to the wrong car and carries on', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25, 3: 0.4 },
			// Number 2 resolves to car 3 (a duplicate number).
			{ numberToIdx: (n) => (n === 2 ? 3 : n) }
		);
		const out = await g.run();
		expect(out.results.map((r) => [r.carIdx, r.status, r.reason])).toEqual([
			[1, 'shot', null],
			[2, 'failed', 'camera-wrong-car'],
			[3, 'shot', null],
		]);
		expect(g.shots.map((s) => s.carIdx)).toEqual([1, 3]);
	});

	it('records a car whose position cannot be found and carries on', async () => {
		const g = setup({ 1: 0.3, 2: 0.25, 3: 0.4 });
		// Car 2 is parked for the whole tape.
		g.world.deps.search.readSample = ((orig) => (carIdx: number) =>
			carIdx === 2 ? { frame: g.world.frame(), pct: 0.25 } : orig(carIdx))(
			g.world.deps.search.readSample
		);
		const out = await g.run();
		expect(out.results[1]).toMatchObject({
			carIdx: 2,
			status: 'failed',
			reason: 'position-not-moving',
		});
		expect(out.results[2].status).toBe('shot');
	});

	it('stops on abort, accounts for the rest, and still restores', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25, 3: 0.4, 4: 0.9 },
			{
				shoot: (c) => {
					if (c.carIdx === 2) {
						g.signal.aborted = true;
					}
					return { ok: true, path: `shot-${c.carIdx}.png` };
				},
			}
		);
		const out = await g.run();
		expect(out.aborted).toBe(true);
		expect(out.ok).toBe(true);
		expect(out.results.map((r) => [r.carIdx, r.status, r.reason])).toEqual([
			[1, 'shot', null],
			[2, 'shot', null],
			[3, 'skipped', 'aborted'],
			[4, 'skipped', 'aborted'],
		]);
		expect(g.world.frame()).toBe(ANCHOR);
		expect(g.restoreWindow).toHaveBeenCalledTimes(1);
	});

	it('labels the car in flight "aborted" when the abort cancels its shot', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25, 3: 0.4 },
			{
				shoot: (c) => {
					if (c.carIdx === 2) {
						// The abort cancels the ReShade wait, which then fails.
						g.signal.aborted = true;
						return { ok: false, reason: 'cancelled' };
					}
					return { ok: true, path: 'x' };
				},
			}
		);
		const out = await g.run();
		expect(out.results.map((r) => [r.carIdx, r.status, r.reason])).toEqual([
			[1, 'shot', null],
			[2, 'skipped', 'aborted'],
			[3, 'skipped', 'aborted'],
		]);
	});

	it('stops on a fatal shot failure and says why', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25, 3: 0.4 },
			{
				shoot: (c) =>
					c.carIdx === 2
						? { ok: false, reason: 'WGC unavailable', fatal: true }
						: { ok: true, path: 'x' },
			}
		);
		const out = await g.run();
		expect(out.ok).toBe(false);
		expect(out.message).toBe('WGC unavailable');
		expect(out.results.map((r) => r.status)).toEqual([
			'shot',
			'failed',
			'skipped',
		]);
		expect(out.results[2].reason).toBe('not-reached');
		expect(g.world.frame()).toBe(ANCHOR);
	});

	it('records a ReShade skip as skipped, not failed', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				shoot: (c) =>
					c.carIdx === 2
						? { ok: false, reason: 'user', skippedByUser: true }
						: { ok: true, path: 'x' },
			}
		);
		const out = await g.run();
		expect(out.results[1]).toMatchObject({
			status: 'skipped',
			reason: 'skipped-by-user',
		});
	});

	it('refuses cleanly when the window cannot be prepared', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{ prepare: () => ({ ok: false, message: 'iRacing window not found' }) }
		);
		const out = await g.run();
		expect(out.ok).toBe(false);
		expect(out.message).toBe('iRacing window not found');
		expect(g.shots).toEqual([]);
		// Paused by the grid, so it must still be put back.
		expect(g.world.frame()).toBe(ANCHOR);
		expect(g.restoreWindow).toHaveBeenCalledTimes(1);
	});

	it('shoots the reference car without a switch when it has no number', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				gridCars: [
					car(1, 0.3, { isReference: true, cameraNumber: null }),
					car(2, 0.25),
				],
			}
		);
		const out = await g.run();
		expect(out.results.map((r) => r.status)).toEqual(['shot', 'shot']);
		expect(g.shots[0]).toEqual({
			carIdx: 1,
			frame: ANCHOR,
			camCar: 1,
			group: 22,
		});
	});
});

describe('runGrid: room around the car', () => {
	// 4500 m track: one metre is 1/4500 of a lap.
	const M = 1 / 4500;
	// Car 2 reaches 0.30 at ANCHOR + 0.05 lap.
	const CAR2_AT_REF = ANCHOR + 0.05 * LAP;

	it('takes the same spot on another lap when a car is too close on the nearest', async () => {
		// Car 5 is 2 m behind car 2 at the nearest crossing, but laps faster, so a
		// lap either way it is far off.
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				minGapMeters: 20,
				traffic: { 5: (f) => 0.3 - 2 * M + (f - CAR2_AT_REF) / 5000 },
			}
		);
		const out = await g.run();
		const car2 = out.results[1];
		expect(car2).toMatchObject({
			status: 'shot',
			lapOffset: -1,
			crowded: false,
		});
		expect(car2.gapMeters).toBeGreaterThan(20);
		// The lap before: one lap of car 2's frames earlier, still at 0.30.
		expect(g.shots[1].frame).toBe(CAR2_AT_REF - LAP);
		expect(g.world.pctOf(2, g.shots[1].frame)).toBeCloseTo(0.3, 3);
	});

	it('shoots the nearest lap, marked crowded, when no lap tried is clear', async () => {
		// Car 5 sits 1 m behind car 2 for the whole tape.
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{ minGapMeters: 20, traffic: { 5: (f) => steady(0.25)(f) - M } }
		);
		const out = await g.run();
		expect(out.results[1]).toMatchObject({
			status: 'shot',
			lapOffset: 0,
			crowded: true,
		});
		expect(out.results[1].gapMeters).toBeCloseTo(1, 0);
		// Put back on the nearest crossing after the other laps were tried.
		expect(g.shots[1].frame).toBe(CAR2_AT_REF);
	});

	it('does not look for room when the minimum gap is 0', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{ minGapMeters: 0, traffic: { 5: (f) => steady(0.25)(f) - M } }
		);
		const out = await g.run();
		expect(out.results[1]).toMatchObject({ lapOffset: 0, crowded: false });
		expect(g.shots[1].frame).toBe(CAR2_AT_REF);
	});
});

describe('runGrid: holding the camera', () => {
	const cleanOrRetry = (check: ShotCheck): GridShotOutcome =>
		check.isClean()
			? { ok: true, path: 'x' }
			: { ok: false, reason: 'camera-moved', retry: true };

	it('refuses a shot taken after the camera moved, puts it back and shoots again', async () => {
		let moved = false;
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				shoot: (c, _i, world, check) => {
					if (c.carIdx === 2 && !moved) {
						// A key brushed in iRacing: another camera group.
						moved = true;
						world.cam.group = 9;
					}
					return cleanOrRetry(check);
				},
			}
		);
		const out = await g.run();
		expect(out.results[1]).toMatchObject({ status: 'shot' });
		expect(out.results[1].cameraRestores).toBeGreaterThanOrEqual(1);
		expect(g.shots.filter((s) => s.carIdx === 2)).toHaveLength(2);
		expect(g.world.cam.group).toBe(22);
	});

	it('puts the camera back when it moved while the car was being positioned', async () => {
		const g = setup({ 1: 0.3, 2: 0.25 });
		// A camera change lands during car 2's search, after its switch.
		const seek = g.world.deps.search.seekAbsolute;
		let moved = false;
		g.world.deps.search.seekAbsolute = (f: number) => {
			seek(f);
			if (g.world.cam.carIdx === 2 && !moved) {
				moved = true;
				g.world.cam.group = 9;
			}
		};
		const out = await g.run();
		expect(out.results[1]).toMatchObject({
			status: 'shot',
			cameraRestores: 1,
		});
		// Shot once, already on the right group: put back BEFORE the shot.
		const car2Shots = g.shots.filter((s) => s.carIdx === 2);
		expect(car2Shots).toHaveLength(1);
		expect(car2Shots[0].group).toBe(22);
	});

	it('puts the replay back when it was scrubbed during the shot', async () => {
		let scrubbed = false;
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				shoot: (c, _i, world, check) => {
					if (c.carIdx === 2 && !scrubbed) {
						scrubbed = true;
						world.deps.search.seekAbsolute(world.frame() + 600);
					}
					return cleanOrRetry(check);
				},
			}
		);
		const out = await g.run();
		expect(out.results[1].status).toBe('shot');
		const car2Shots = g.shots.filter((s) => s.carIdx === 2);
		expect(car2Shots).toHaveLength(2);
		expect(car2Shots[1].frame).toBe(ANCHOR + 0.05 * LAP);
	});

	it('does not hold the camera number on a TV group', async () => {
		// The director picks a different camera per car; that is not a drift.
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				holdCamera: false,
				shoot: (_c, _i, world, check) => {
					world.cam.camera = 7;
					return cleanOrRetry(check);
				},
			}
		);
		const out = await g.run();
		expect(out.results.map((r) => r.status)).toEqual(['shot', 'shot']);
		expect(out.results.map((r) => r.cameraRestores)).toEqual([0, 0]);
	});

	it('holds the camera number on a car-mounted group', async () => {
		let moved = false;
		const g = setup(
			{ 1: 0.3, 2: 0.25 },
			{
				holdCamera: true,
				shoot: (c, _i, world, check) => {
					if (c.carIdx === 2 && !moved) {
						moved = true;
						world.cam.camera = 7;
					}
					return cleanOrRetry(check);
				},
			}
		);
		const out = await g.run();
		expect(out.results[1]).toMatchObject({ status: 'shot' });
		expect(out.results[1].cameraRestores).toBeGreaterThanOrEqual(1);
		expect(g.world.cam.camera).toBe(1);
	});

	it('gives up on a car whose camera keeps moving', async () => {
		const g = setup(
			{ 1: 0.3, 2: 0.25, 3: 0.4 },
			{
				shoot: (c, _i, world, check) => {
					if (c.carIdx === 2) {
						world.cam.group = 9;
					}
					return cleanOrRetry(check);
				},
			}
		);
		const out = await g.run();
		expect(out.results.map((r) => [r.carIdx, r.status, r.reason])).toEqual([
			[1, 'shot', null],
			[2, 'failed', 'camera-kept-moving'],
			[3, 'shot', null],
		]);
		expect(g.shots.filter((s) => s.carIdx === 2)).toHaveLength(
			MAX_SHOT_ATTEMPTS
		);
	});
});
