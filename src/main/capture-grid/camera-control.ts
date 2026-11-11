// Capture grid — point the camera at a car, and prove it happened.
//
// irsdk_BroadcastCamSwitchNum(carNumber, group, camera) is fire-and-forget: the
// sim does not answer, and a car number can be ambiguous (duplicate numbers in a
// hosted session) or mis-encoded (leading zeros). So a switch only counts once
// CamCarIdx — the telemetry naming the car the camera is actually on — reports
// the car we asked for. Anything else is reported, never assumed.
//
// Same shape as ../replay-control: deps injected, telemetry as the authority,
// wall clock only as a failure timeout.

import { createLogger } from '../../utilities/logger';
import { POLL_INTERVAL_MS } from '../replay-control';

const log = createLogger('capture-grid/camera');

// How long a switch may take to show up in CamCarIdx before it is declared
// failed. Wall-clock, failure-only.
export const CAMERA_SWITCH_TIMEOUT_MS = 2000;

export interface CameraView {
	carIdx: number | null;
	group: number | null;
	camera: number | null;
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readCameraView(
	values: Record<string, unknown> | null | undefined
): CameraView | null {
	if (!values) {
		return null;
	}
	const view = {
		carIdx: num(values.CamCarIdx),
		group: num(values.CamGroupNumber),
		camera: num(values.CamCameraNumber),
	};
	return view.carIdx === null && view.group === null ? null : view;
}

export interface CameraControlDeps {
	readView(): CameraView | null;
	// irsdk_BroadcastCamSwitchNum. `cameraNumber` is the ENCODED car number
	// (roster.encodeCameraCarNumber), not a CarIdx.
	switchCamera(cameraNumber: number, group: number, camera: number): void;
	delay(ms: number): Promise<void>;
	// Wall clock, for TIMEOUTS ONLY.
	now(): number;
}

export type CameraSwitchFailure =
	// The camera ended on a different car than asked — an ambiguous or
	// mis-encoded car number.
	| 'wrong-car'
	// Nothing changed before the timeout.
	| 'timeout'
	| 'no-telemetry'
	| 'aborted';

export interface CameraSwitchResult {
	switched: boolean;
	// What the camera was on when this returned.
	view: CameraView | null;
	elapsedMs: number;
	reason: CameraSwitchFailure | null;
}

export interface CameraTarget {
	carIdx: number;
	cameraNumber: number;
}

export async function switchCameraToCar(
	deps: CameraControlDeps,
	target: CameraTarget,
	shot: { group: number; camera: number },
	opts: { signal?: { aborted: boolean }; timeoutMs?: number } = {}
): Promise<CameraSwitchResult> {
	const started = deps.now();
	const timeoutMs = opts.timeoutMs ?? CAMERA_SWITCH_TIMEOUT_MS;
	const done = (fields: Partial<CameraSwitchResult>): CameraSwitchResult => {
		const out: CameraSwitchResult = {
			switched: false,
			view: null,
			elapsedMs: deps.now() - started,
			reason: null,
			...fields,
		};
		const logFields = { target, shot, ...out };
		if (out.switched) {
			log.info('Grid camera switched', logFields);
		} else {
			log.warn('Grid camera switch failed', logFields);
		}
		return out;
	};

	const before = safeRead(deps);
	if (!before) {
		return done({ reason: 'no-telemetry' });
	}

	try {
		deps.switchCamera(target.cameraNumber, shot.group, shot.camera);
	} catch {
		// broadcastUnsafe throws when the SDK was torn down (iRacing exited).
		return done({ view: before, reason: 'no-telemetry' });
	}

	let last: CameraView | null = before;
	for (;;) {
		if (opts.signal?.aborted) {
			return done({ view: last, reason: 'aborted' });
		}
		const view = safeRead(deps);
		if (view) {
			last = view;
			if (view.carIdx === target.carIdx) {
				return done({ switched: true, view });
			}
		}
		if (deps.now() - started >= timeoutMs) {
			const movedElsewhere =
				last !== null &&
				last.carIdx !== null &&
				last.carIdx !== before.carIdx &&
				last.carIdx !== target.carIdx;
			return done({
				view: last,
				reason: movedElsewhere ? 'wrong-car' : 'timeout',
			});
		}
		await deps.delay(POLL_INTERVAL_MS);
	}
}

function safeRead(deps: CameraControlDeps): CameraView | null {
	try {
		return deps.readView();
	} catch {
		return null;
	}
}
