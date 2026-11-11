import { describe, expect, it, vi } from 'vitest';
import { runGrid, type GridPlan, type GridShotOutcome } from './grid-session';
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
			world: ReturnType<typeof makeWorld>
		) => GridShotOutcome;
		prepare?: () => { ok: true } | { ok: false; message: string };
		gridCars?: GridCar[];
		referencePct?: number;
	} = {}
) {
	const world = makeWorld({
		cars: Object.fromEntries(
			Object.entries(cars).map(([idx, pct]) => [idx, steady(pct)])
		),
		...opts,
	});
	const shots: Array<{ carIdx: number; frame: number; camCar: number }> = [];
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
		tapeEndFrame: TAPE_END,
		trackLengthMeters: 4500,
	};
	const run = () =>
		runGrid(plan, {
			...world.deps,
			signal,
			prepare: async () => opts.prepare?.() ?? { ok: true },
			shoot: async (c, index) => {
				shots.push({
					carIdx: c.carIdx,
					frame: world.frame(),
					camCar: world.cam.carIdx,
				});
				return (
					opts.shoot?.(c, index, world) ?? {
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
		expect(g.shots[0]).toEqual({ carIdx: 1, frame: ANCHOR, camCar: 1 });
	});
});
