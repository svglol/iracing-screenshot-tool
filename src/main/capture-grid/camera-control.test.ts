import { describe, expect, it, vi } from 'vitest';
import {
	CAMERA_SWITCH_TIMEOUT_MS,
	readCameraView,
	switchCameraToCar,
	type CameraControlDeps,
	type CameraView,
} from './camera-control';

vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

// A fake sim: `numberToIdx` is how it resolves a broadcast car number to a car,
// `lag` how many reads before the switch shows in telemetry.
function makeSim(opts: {
	start: CameraView;
	numberToIdx: (n: number) => number | null;
	lag?: number;
	throwOnSwitch?: boolean;
}) {
	let clock = 0;
	let view = { ...opts.start };
	let pending: CameraView | null = null;
	let lag = 0;
	const sent: Array<[number, number, number]> = [];
	const deps: CameraControlDeps = {
		readView: () => {
			if (pending) {
				if (lag > 0) {
					lag -= 1;
				} else {
					view = pending;
					pending = null;
				}
			}
			return { ...view };
		},
		switchCamera: (n, group, camera) => {
			if (opts.throwOnSwitch) {
				throw new Error('SDK torn down');
			}
			sent.push([n, group, camera]);
			const idx = opts.numberToIdx(n);
			if (idx !== null) {
				pending = { carIdx: idx, group, camera };
				lag = opts.lag ?? 0;
			}
		},
		delay: async (ms) => {
			clock += ms;
		},
		now: () => clock,
	};
	return { deps, sent, clock: () => clock };
}

const START: CameraView = { carIdx: 1, group: 11, camera: 4 };

describe('readCameraView', () => {
	it('maps the camera telemetry', () => {
		expect(
			readCameraView({
				CamCarIdx: 3,
				CamGroupNumber: 10,
				CamCameraNumber: 4,
			})
		).toEqual({ carIdx: 3, group: 10, camera: 4 });
		expect(readCameraView(null)).toBeNull();
		expect(readCameraView({})).toBeNull();
	});
});

describe('switchCameraToCar', () => {
	it('broadcasts the ENCODED number and confirms via CamCarIdx', async () => {
		const sim = makeSim({
			start: START,
			numberToIdx: (n) => (n === 3007 ? 9 : null),
			lag: 4,
		});
		const r = await switchCameraToCar(
			sim.deps,
			{ carIdx: 9, cameraNumber: 3007 },
			{ group: 11, camera: 4 }
		);
		expect(sim.sent).toEqual([[3007, 11, 4]]);
		expect(r.switched).toBe(true);
		expect(r.view).toEqual({ carIdx: 9, group: 11, camera: 4 });
	});

	it('reports wrong-car when the number resolved to someone else', async () => {
		// Duplicate number: the sim picks car 12, not the 9 we wanted.
		const sim = makeSim({ start: START, numberToIdx: () => 12 });
		const r = await switchCameraToCar(
			sim.deps,
			{ carIdx: 9, cameraNumber: 7 },
			{ group: 11, camera: 4 }
		);
		expect(r.switched).toBe(false);
		expect(r.reason).toBe('wrong-car');
		expect(r.view?.carIdx).toBe(12);
	});

	it('times out when nothing happens', async () => {
		const sim = makeSim({ start: START, numberToIdx: () => null });
		const r = await switchCameraToCar(
			sim.deps,
			{ carIdx: 9, cameraNumber: 7 },
			{ group: 11, camera: 4 }
		);
		expect(r.reason).toBe('timeout');
		expect(sim.clock()).toBeGreaterThanOrEqual(CAMERA_SWITCH_TIMEOUT_MS);
	});

	it('succeeds immediately when already on the car', async () => {
		const sim = makeSim({ start: START, numberToIdx: () => 1 });
		const r = await switchCameraToCar(
			sim.deps,
			{ carIdx: 1, cameraNumber: 3 },
			{ group: 11, camera: 4 }
		);
		expect(r.switched).toBe(true);
	});

	it('treats a throwing broadcast as no telemetry', async () => {
		const sim = makeSim({
			start: START,
			numberToIdx: () => 9,
			throwOnSwitch: true,
		});
		const r = await switchCameraToCar(
			sim.deps,
			{ carIdx: 9, cameraNumber: 7 },
			{ group: 11, camera: 4 }
		);
		expect(r.reason).toBe('no-telemetry');
	});

	it('stops when aborted', async () => {
		const sim = makeSim({ start: START, numberToIdx: () => null });
		const r = await switchCameraToCar(
			sim.deps,
			{ carIdx: 9, cameraNumber: 7 },
			{ group: 11, camera: 4 },
			{ signal: { aborted: true } }
		);
		expect(r.reason).toBe('aborted');
	});
});
