import { describe, expect, it, vi } from 'vitest';
import {
	DRIFT_SLACK_MS,
	detectDrift,
	restoreShot,
	shotIsClean,
	startShotGuard,
	type ShotExpectation,
	type ShotLockDeps,
} from './shot-lock';

vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

const EXPECTED: ShotExpectation = {
	carIdx: 4,
	cameraNumber: 12,
	group: 22,
	camera: 1,
	holdCamera: true,
	frame: 1000,
};

// A sim with a camera and a replay frame, and a virtual clock.
function makeSim() {
	let clock = 0;
	const cam = { carIdx: 4, group: 22, camera: 1 };
	const state = { frame: 1000, paused: true };
	const deps: ShotLockDeps = {
		camera: {
			readView: () => ({ ...cam }),
			switchCamera: (n, group, camera) => {
				cam.carIdx = n === 12 ? 4 : n;
				cam.group = group;
				cam.camera = camera;
			},
			delay: async (ms) => {
				clock += ms;
			},
			now: () => clock,
		},
		readFrame: () => state.frame,
		pause: () => {
			state.paused = true;
		},
		seekAbsolute: (frame) => {
			state.frame = frame;
		},
		delay: async (ms) => {
			clock += ms;
		},
		now: () => clock,
	};
	return { deps, cam, state, clock: () => clock };
}

describe('detectDrift', () => {
	const view = { carIdx: 4, group: 22, camera: 1 };

	it('is empty when everything is where it was put', () => {
		expect(detectDrift(view, 1000, EXPECTED)).toEqual([]);
	});

	it('names every field that moved', () => {
		expect(
			detectDrift({ carIdx: 5, group: 9, camera: 3 }, 1200, EXPECTED)
		).toEqual(['car', 'group', 'camera', 'frame']);
	});

	it('ignores the camera number when it is not held (a TV group)', () => {
		expect(
			detectDrift({ ...view, camera: 3 }, 1000, {
				...EXPECTED,
				holdCamera: false,
			})
		).toEqual([]);
	});

	it('cannot tell without telemetry', () => {
		expect(detectDrift(null, 1000, EXPECTED)).toBeNull();
		expect(detectDrift(view, null, EXPECTED)).toBeNull();
	});
});

describe('restoreShot', () => {
	it('puts back the frame and the camera group', async () => {
		const sim = makeSim();
		sim.cam.group = 9;
		sim.state.frame = 1500;
		const failed = await restoreShot(sim.deps, EXPECTED, ['group', 'frame']);
		expect(failed).toBeNull();
		expect(sim.state.frame).toBe(1000);
		expect(sim.cam).toEqual({ carIdx: 4, group: 22, camera: 1 });
	});

	it('cannot put back a camera with no number to switch with', async () => {
		const sim = makeSim();
		sim.cam.carIdx = 6;
		const failed = await restoreShot(
			sim.deps,
			{ ...EXPECTED, cameraNumber: null },
			['car']
		);
		expect(failed).toBe('camera');
	});
});

describe('shotIsClean', () => {
	it('is clean with no drift at all', () => {
		expect(shotIsClean([], undefined)).toBe(true);
		expect(shotIsClean([], 5000)).toBe(true);
	});

	it('without a capture time, any drift taints the shot', () => {
		expect(
			shotIsClean([{ from: 100, to: 200, drift: ['car'] }], undefined)
		).toBe(false);
	});

	it('with a capture time, only a drift near it does', () => {
		const windows = [{ from: 10_000, to: 11_000, drift: ['group' as const] }];
		expect(shotIsClean(windows, 10_500)).toBe(false);
		expect(shotIsClean(windows, 11_000 + DRIFT_SLACK_MS - 1)).toBe(false);
		expect(shotIsClean(windows, 11_000 + DRIFT_SLACK_MS + 1)).toBe(true);
		expect(shotIsClean(windows, 10_000 - DRIFT_SLACK_MS - 1)).toBe(true);
	});

	it('a drift still being put back taints everything', () => {
		expect(
			shotIsClean([{ from: 10_000, to: null, drift: ['frame'] }], 50_000)
		).toBe(false);
	});
});

describe('startShotGuard', () => {
	it('notices a drift while a shot is in flight, puts it back and records when', async () => {
		const sim = makeSim();
		const onDrift = vi.fn();
		const guard = startShotGuard(sim.deps, EXPECTED, {
			settleMs: 100,
			onDrift,
		});
		// The "shot": somebody switches the camera group halfway through.
		await sim.deps.delay(300);
		sim.cam.group = 9;
		for (let i = 0; i < 20; i++) {
			await sim.deps.delay(50);
		}
		await guard.stop();
		expect(onDrift).toHaveBeenCalledWith(['group']);
		expect(guard.windows).toHaveLength(1);
		expect(guard.windows[0].to).not.toBeNull();
		expect(guard.lost).toBeNull();
		expect(sim.cam.group).toBe(22);
	});

	it('records nothing when nothing moves', async () => {
		const sim = makeSim();
		const guard = startShotGuard(sim.deps, EXPECTED, { settleMs: 100 });
		for (let i = 0; i < 10; i++) {
			await sim.deps.delay(50);
		}
		await guard.stop();
		expect(guard.windows).toEqual([]);
	});
});
