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

// Options for what counts as "switched". By default only the car is confirmed.
// The grid's camera lock also confirms the group, and on a car-mounted group the
// camera number: putting back a camera the user moved to another group while it
// stayed on the same car must not count as done before it is.
export interface CameraSwitchOptions {
	signal?: { aborted: boolean };
	timeoutMs?: number;
	requireGroup?: boolean;
	requireCamera?: boolean;
}

export function viewMatches(
	view: CameraView | null,
	carIdx: number,
	shot: { group: number; camera: number },
	opts: Pick<CameraSwitchOptions, 'requireGroup' | 'requireCamera'> = {}
): boolean {
	return (
		view !== null &&
		view.carIdx === carIdx &&
		(!opts.requireGroup || view.group === shot.group) &&
		(!opts.requireCamera || view.camera === shot.camera)
	);
}

export async function switchCameraToCar(
	deps: CameraControlDeps,
	target: CameraTarget,
	shot: { group: number; camera: number },
	opts: CameraSwitchOptions = {}
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
			if (viewMatches(view, target.carIdx, shot, opts)) {
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

// Whether a camera group rides on the car or watches from the track.
//
// Measured live (2026-11-11): on a car-mounted group (Rear Chase) every car got
// the same camera and therefore identical framing; on TV1 the same frames came
// back from cameras 4, 8 and 3 — iRacing's director picks the trackside camera
// and ignores the one requested. So a grid on a trackside group still runs, but
// the user is told the framing will vary.
//
// Trackside = flagged scenic, or a group of more than one camera (TV1 had 14,
// Scenic 10; every car-mounted group in that session had exactly 1).
export type CameraKind = 'car' | 'trackside' | 'unknown';

export function classifyCameraGroup(
	sessionData: unknown,
	groupNum: number | null
): CameraKind {
	if (groupNum === null) {
		return 'unknown';
	}
	const groups = (
		sessionData as { CameraInfo?: { Groups?: unknown } } | null | undefined
	)?.CameraInfo?.Groups;
	if (!Array.isArray(groups)) {
		return 'unknown';
	}
	const group = groups.find(
		(g) => (g as { GroupNum?: unknown })?.GroupNum === groupNum
	) as { IsScenic?: unknown; Cameras?: unknown } | undefined;
	if (!group) {
		return 'unknown';
	}
	if (group.IsScenic === true || group.IsScenic === 1) {
		return 'trackside';
	}
	const cameras = Array.isArray(group.Cameras) ? group.Cameras.length : 0;
	return cameras > 1 ? 'trackside' : cameras === 1 ? 'car' : 'unknown';
}
