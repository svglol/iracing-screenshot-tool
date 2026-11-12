// Capture grid — hold the camera and the replay still while a car is shot.
//
// Asked for 2026-11-12: "if the camera is moved inadvertently during a capture
// what happens? We should store the camera position and ensure the values are
// matching across all shots." Until now the grid checked once, before the shot,
// that the camera was on the right car. A key brushed in iRacing — a camera
// change, play, a scrub — while a WGC grab is in flight, or during the long wait
// for a ReShade key, went unnoticed and the shot was filed under that driver.
//
// What is held, for every shot of the grid:
//   - the car the camera is on (CamCarIdx)
//   - the camera group (CamGroupNumber) — the same for every car of the grid
//   - the camera within it (CamCameraNumber), on a car-mounted group only: on a
//     TV group iRacing's director picks the camera per car and ignores the one
//     asked for (measured 2026-11-11), so it cannot be held there
//   - the replay frame (ReplayFrameNum) the search put the car on
//
// What cannot be: camera-tool edits (the position and angle of a camera moved
// with the camera tool). The SDK exposes no camera pose; see
// project_cinematics_parked. The camera-STATE flags are already re-asserted on
// every telemetry tick while a capture runs (index.ts, the 'update' handler).
//
// Drift is detected by polling while the shot is in flight, put back at once,
// and the time it was off-target remembered, so a shot taken while it was off —
// the WGC frame grabbed then, or the ReShade file written then — is refused
// before it is saved and shot again.

import { createLogger } from '../../utilities/logger';
import { POLL_INTERVAL_MS, SEEK_TIMEOUT_MS } from '../replay-control';
import {
	switchCameraToCar,
	viewMatches,
	type CameraControlDeps,
	type CameraView,
} from './camera-control';

const log = createLogger('capture-grid/shot-lock');

// How often the camera is checked while a shot is in flight.
export const GUARD_POLL_MS = 100;
// A shot whose capture time is this close to a drift is treated as taken during
// it. ReShade writes its file some time after the key press, and a big PNG can
// take most of a second.
export const DRIFT_SLACK_MS = 1500;
// Polls in a row that must show the frame back before a frame restore counts.
const STABLE_READS = 2;

export interface ShotExpectation {
	carIdx: number;
	// The encoded number to switch to the car with; null for a car the camera
	// cannot be switched to (it is then only ever checked, never put back).
	cameraNumber: number | null;
	group: number;
	camera: number;
	// Whether the camera number is part of the lock (car-mounted groups only).
	holdCamera: boolean;
	frame: number;
}

export type DriftField = 'car' | 'group' | 'camera' | 'frame';

export interface ShotLockDeps {
	camera: CameraControlDeps;
	// The frame the replay is showing, or null without telemetry.
	readFrame(): number | null;
	pause(): void;
	seekAbsolute(frame: number): void;
	delay(ms: number): Promise<void>;
	now(): number;
}

// What is off, or null when there is no telemetry to tell. Empty = locked.
export function detectDrift(
	view: CameraView | null,
	frame: number | null,
	expected: ShotExpectation
): DriftField[] | null {
	if (!view || frame === null) {
		return null;
	}
	const drift: DriftField[] = [];
	if (view.carIdx !== expected.carIdx) drift.push('car');
	if (view.group !== expected.group) drift.push('group');
	if (expected.holdCamera && view.camera !== expected.camera) {
		drift.push('camera');
	}
	if (frame !== expected.frame) drift.push('frame');
	return drift;
}

export function readDrift(
	deps: ShotLockDeps,
	expected: ShotExpectation
): DriftField[] | null {
	let view: CameraView | null = null;
	let frame: number | null = null;
	try {
		view = deps.camera.readView();
		frame = deps.readFrame();
	} catch {
		return null;
	}
	return detectDrift(view, frame, expected);
}

export type RestoreFailure = 'no-telemetry' | 'camera' | 'frame' | 'aborted';

// Put the frame back, then the camera looking at it — the grid's restore order.
export async function restoreShot(
	deps: ShotLockDeps,
	expected: ShotExpectation,
	drift: readonly DriftField[],
	signal?: { aborted: boolean }
): Promise<RestoreFailure | null> {
	if (drift.includes('frame')) {
		const back = await returnToFrame(deps, expected.frame, signal);
		if (back) {
			return back;
		}
	}
	const view = safeView(deps);
	const shot = { group: expected.group, camera: expected.camera };
	const lock = { requireGroup: true, requireCamera: expected.holdCamera };
	if (!viewMatches(view, expected.carIdx, shot, lock)) {
		if (expected.cameraNumber === null) {
			return 'camera';
		}
		const switched = await switchCameraToCar(
			deps.camera,
			{ carIdx: expected.carIdx, cameraNumber: expected.cameraNumber },
			shot,
			{ signal, ...lock }
		);
		if (!switched.switched) {
			return switched.reason === 'aborted'
				? 'aborted'
				: switched.reason === 'no-telemetry'
					? 'no-telemetry'
					: 'camera';
		}
	}
	return null;
}

export async function returnToFrame(
	deps: ShotLockDeps,
	frame: number,
	signal?: { aborted: boolean }
): Promise<RestoreFailure | null> {
	try {
		// Someone pressed play: stop it first, or the frame walks away again.
		deps.pause();
		deps.seekAbsolute(frame);
	} catch {
		return 'no-telemetry';
	}
	const started = deps.now();
	let agreeing = 0;
	for (;;) {
		if (signal?.aborted) {
			return 'aborted';
		}
		let now: number | null = null;
		try {
			now = deps.readFrame();
		} catch {
			now = null;
		}
		agreeing = now === frame ? agreeing + 1 : 0;
		if (agreeing >= STABLE_READS) {
			return null;
		}
		if (deps.now() - started >= SEEK_TIMEOUT_MS) {
			return 'frame';
		}
		await deps.delay(POLL_INTERVAL_MS);
	}
}

function safeView(deps: ShotLockDeps): CameraView | null {
	try {
		return deps.camera.readView();
	} catch {
		return null;
	}
}

// A span of time the camera or replay was off-target. `to` is null while it is
// still being put back.
export interface DriftWindow {
	from: number;
	to: number | null;
	drift: DriftField[];
}

// Whether a shot captured at `capturedAt` (wall clock) can be trusted, given the
// drifts seen while it was in flight. Without a capture time — a WGC grab, which
// returns the newest frame at some point during the call — any drift at all
// since the shot started taints it.
export function shotIsClean(
	windows: readonly DriftWindow[],
	capturedAt: number | undefined
): boolean {
	if (windows.length === 0) {
		return true;
	}
	if (capturedAt === undefined) {
		return false;
	}
	return windows.every(
		(w) =>
			w.to !== null &&
			(capturedAt < w.from - DRIFT_SLACK_MS ||
				capturedAt > w.to + DRIFT_SLACK_MS)
	);
}

// Watches the lock while a shot is in flight: polls, puts back whatever moved,
// and records when it was off. `stop()` ends the watch and waits for a restore
// in progress to finish.
export interface ShotGuard {
	windows: DriftWindow[];
	// Set when something moved and could NOT be put back.
	lost: RestoreFailure | null;
	stop(): Promise<void>;
}

export function startShotGuard(
	deps: ShotLockDeps,
	expected: ShotExpectation,
	opts: {
		signal?: { aborted: boolean };
		settleMs: number;
		onDrift?(drift: DriftField[]): void;
		onRestored?(): void;
	}
): ShotGuard {
	const guard: ShotGuard = {
		windows: [],
		lost: null,
		stop: async () => {
			state.stopped = true;
			await loop;
		},
	};
	// An object, not a local: the loop reads a flag `stop()` sets from outside it.
	const state = { stopped: false };

	const loop = (async () => {
		while (!state.stopped && !opts.signal?.aborted && !guard.lost) {
			await deps.delay(GUARD_POLL_MS);
			if (state.stopped || opts.signal?.aborted) {
				break;
			}
			const drift = readDrift(deps, expected);
			if (!drift || drift.length === 0) {
				continue;
			}
			const window: DriftWindow = { from: deps.now(), to: null, drift };
			guard.windows.push(window);
			log.warn('Grid camera moved during a shot; putting it back', {
				carIdx: expected.carIdx,
				drift,
			});
			opts.onDrift?.(drift);
			const failed = await restoreShot(deps, expected, drift, opts.signal);
			if (failed) {
				guard.lost = failed;
				window.to = deps.now();
				break;
			}
			// The window stays open through the settle: the renderer may still be
			// presenting the drifted image until the restored frame is drawn.
			await deps.delay(opts.settleMs);
			window.to = deps.now();
			opts.onRestored?.();
		}
	})();

	return guard;
}
