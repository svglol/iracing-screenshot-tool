// Capture grid — the session: every car in the roster, one shot each, with the
// car at the reference distance; then everything put back.
//
// Per car:   switch the camera → find the frame → confirm the camera is still on
//            the car → settle → shoot
// Once:      pause and prepare the window before the first car; in `finally`,
//            restore the replay frame, THEN the camera, THEN the window.
//
// The restore order is not arbitrary. Measured live (2026-11-11): switching the
// camera back before the replay is back lets a TV camera pick its angle for the
// wrong place, and the user is left on a different camera than they chose. The
// frame first, then the camera that was looking at it.
//
// A failed car is recorded and the grid moves on; only a failure that means the
// sim is gone (no telemetry) or an abort stops it. Shooting is injected — the
// caller decides what a shot is (a WGC grab and save, or waiting for the user's
// ReShade key) — so this file holds the sequence and nothing about capture
// backends, and is unit-tested against fakes.

import { createLogger } from '../../utilities/logger';
import {
	SEEK_SETTLE_MS,
	type PlaybackSnapshot,
	type ReplayController,
	type RestoreResult,
} from '../replay-control';
import {
	searchCarPosition,
	type PositionSearchDeps,
	type PositionSearchFailure,
} from './position-search';
import {
	switchCameraToCar,
	type CameraControlDeps,
	type CameraSwitchFailure,
	type CameraView,
} from './camera-control';
import type { GridCar } from './roster';

const log = createLogger('capture-grid/session');

// Every field is declared on both branches: strictNullChecks is off in this
// project, so `if (shot.ok)` does not narrow a boolean-tagged union.
export type GridShotOutcome =
	| {
			ok: true;
			path: string;
			reason?: undefined;
			fatal?: undefined;
			skippedByUser?: undefined;
	  }
	// `fatal` stops the grid (the capture backend is gone); `skippedByUser` is a
	// ReShade-mode skip, recorded as skipped rather than failed.
	| {
			ok: false;
			path?: undefined;
			reason: string;
			fatal?: boolean;
			skippedByUser?: boolean;
	  };

export interface GridSessionDeps {
	replay: Pick<ReplayController, 'pause' | 'restoreAnchor'>;
	search: PositionSearchDeps;
	camera: CameraControlDeps;
	// Resize iRacing for the whole grid, once. The caller has already hidden the
	// sim's UI and latched its capture state.
	prepare(): Promise<
		{ ok: true; message?: undefined } | { ok: false; message: string }
	>;
	// One shot of what iRacing is showing now.
	shoot(car: GridCar, index: number): Promise<GridShotOutcome>;
	restoreWindow(): void;
	delay(ms: number): Promise<void>;
	signal: { aborted: boolean };
	onProgress?(progress: GridProgress): void;
}

export interface GridPlan {
	cars: GridCar[];
	referencePct: number;
	snapshot: PlaybackSnapshot;
	// The camera as the user left it, to put back at the end.
	view: CameraView;
	// The encoded number of the car that view was on; null when unknown, and the
	// camera is then left where the grid ended.
	viewCameraNumber: number | null;
	tapeEndFrame: number | null;
	trackLengthMeters: number | null;
}

export type GridCarStatus = 'shot' | 'failed' | 'skipped';

export interface GridCarResult {
	carIdx: number;
	carNumber: string;
	driverName: string;
	status: GridCarStatus;
	path: string | null;
	// Why it was not shot: 'camera-<reason>', 'position-<reason>', the shot's own
	// reason, 'skipped-by-user' or 'aborted'.
	reason: string | null;
	frame: number | null;
	// How far from the reference distance the chosen frame put the car.
	errorMeters: number | null;
	usedOtherCrossing: boolean;
}

export type GridPhase = 'positioning' | 'capturing' | 'car-done';

export interface GridProgress {
	phase: GridPhase;
	index: number;
	total: number;
	car: GridCar;
	result?: GridCarResult;
}

export interface GridOutcome {
	// False only when the grid could not run at all or the sim went away; an
	// abort, or individual cars failing, still reports ok with per-car results.
	ok: boolean;
	aborted: boolean;
	message: string | null;
	results: GridCarResult[];
	restore: RestoreResult | null;
	cameraRestored: boolean;
}

// A failure that means there is no sim to keep talking to.
function simGone(reason: PositionSearchFailure | CameraSwitchFailure): boolean {
	return reason === 'no-telemetry';
}

export async function runGrid(
	plan: GridPlan,
	deps: GridSessionDeps
): Promise<GridOutcome> {
	const { signal } = deps;
	const results: GridCarResult[] = [];
	const total = plan.cars.length;
	let message: string | null = null;
	let fatal = false;

	const record = (
		car: GridCar,
		fields: Partial<GridCarResult> & { status: GridCarStatus }
	): GridCarResult => {
		const result: GridCarResult = {
			carIdx: car.carIdx,
			carNumber: car.carNumber,
			driverName: car.driverName,
			path: null,
			reason: null,
			frame: null,
			errorMeters: null,
			usedOtherCrossing: false,
			...fields,
		};
		results.push(result);
		return result;
	};

	let restore: RestoreResult | null = null;
	let cameraRestored = false;

	try {
		deps.replay.pause();
		const prepared = await deps.prepare();
		if (!prepared.ok) {
			return {
				ok: false,
				aborted: false,
				message: prepared.message,
				results,
				restore: null,
				cameraRestored: false,
			};
		}

		for (let index = 0; index < total; index++) {
			const car = plan.cars[index];
			if (signal.aborted || fatal) {
				break;
			}
			const progress = (phase: GridPhase, result?: GridCarResult) =>
				deps.onProgress?.({ phase, index, total, car, result });
			const finish = (
				fields: Partial<GridCarResult> & { status: GridCarStatus }
			) => {
				const result = record(car, fields);
				log.info('Grid car finished', { index, total, ...result });
				progress('car-done', result);
			};

			progress('positioning');

			// --- camera ---------------------------------------------------------
			// The number is null only for the reference car (the roster skips any
			// other car without one), and the camera is already on it.
			if (car.cameraNumber !== null && plan.view.group !== null) {
				const switched = await switchCameraToCar(
					deps.camera,
					{ carIdx: car.carIdx, cameraNumber: car.cameraNumber },
					{ group: plan.view.group, camera: plan.view.camera ?? 0 },
					{ signal }
				);
				if (!switched.switched) {
					if (switched.reason === 'aborted') {
						break;
					}
					fatal = switched.reason !== null && simGone(switched.reason);
					finish({
						status: 'failed',
						reason: `camera-${switched.reason}`,
					});
					continue;
				}
			}

			// --- position -------------------------------------------------------
			const found = await searchCarPosition(deps.search, {
				carIdx: car.carIdx,
				targetPct: plan.referencePct,
				estLapTimeSec: car.estLapTimeSec,
				trackLengthMeters: plan.trackLengthMeters,
				tapeEndFrame: plan.tapeEndFrame,
				start: { frame: plan.snapshot.anchorFrame, pct: car.startPct },
				signal,
			});
			if (!found.found) {
				if (found.reason === 'aborted') {
					break;
				}
				fatal = found.reason !== null && simGone(found.reason);
				finish({
					status: 'failed',
					reason: `position-${found.reason}`,
					frame: found.frame,
				});
				continue;
			}
			const errorMeters =
				found.errorLaps !== null && plan.trackLengthMeters
					? found.errorLaps * plan.trackLengthMeters
					: null;

			// The seeks must not have moved the camera off the car. Cheap to check,
			// and a shot of the wrong car would be filed under this driver's name.
			let onCar = false;
			try {
				onCar = deps.camera.readView()?.carIdx === car.carIdx;
			} catch {
				onCar = false;
			}
			if (!onCar && car.cameraNumber !== null && plan.view.group !== null) {
				const again = await switchCameraToCar(
					deps.camera,
					{ carIdx: car.carIdx, cameraNumber: car.cameraNumber },
					{ group: plan.view.group, camera: plan.view.camera ?? 0 },
					{ signal }
				);
				onCar = again.switched;
			}
			if (!onCar) {
				finish({
					status: 'failed',
					reason: 'camera-lost-after-seek',
					frame: found.frame,
					errorMeters,
				});
				continue;
			}

			// Give the renderer time to present the new frame before it is shot.
			await deps.delay(SEEK_SETTLE_MS);
			if (signal.aborted) {
				break;
			}

			// --- shoot ----------------------------------------------------------
			progress('capturing');
			const shot = await deps.shoot(car, index);
			if (shot.ok) {
				finish({
					status: 'shot',
					path: shot.path,
					frame: found.frame,
					errorMeters,
					usedOtherCrossing: found.usedOtherCrossing,
				});
				continue;
			}
			// Aborted while the shot was in flight (a ReShade wait the abort
			// cancelled): this car was not shot because of the abort, not a fault.
			if (signal.aborted) {
				finish({
					status: 'skipped',
					reason: 'aborted',
					frame: found.frame,
					errorMeters,
				});
				break;
			}
			if (shot.fatal) {
				fatal = true;
				message = shot.reason;
			}
			finish({
				status: shot.skippedByUser ? 'skipped' : 'failed',
				reason: shot.skippedByUser ? 'skipped-by-user' : shot.reason,
				frame: found.frame,
				errorMeters,
				usedOtherCrossing: found.usedOtherCrossing,
			});
		}

		// Every car the loop never reached is accounted for, so the summary adds up.
		for (const car of plan.cars.slice(results.length)) {
			record(car, {
				status: 'skipped',
				reason: signal.aborted ? 'aborted' : 'not-reached',
			});
		}
	} finally {
		// Replay frame first, then the camera looking at it, then the window.
		restore = await deps.replay.restoreAnchor(plan.snapshot);
		if (
			plan.viewCameraNumber !== null &&
			plan.view.carIdx !== null &&
			plan.view.group !== null
		) {
			const back = await switchCameraToCar(
				deps.camera,
				{ carIdx: plan.view.carIdx, cameraNumber: plan.viewCameraNumber },
				{ group: plan.view.group, camera: plan.view.camera ?? 0 }
			);
			cameraRestored = back.switched;
		}
		deps.restoreWindow();
	}

	const outcome: GridOutcome = {
		ok: !fatal,
		aborted: signal.aborted,
		message: fatal ? (message ?? 'iRacing stopped responding') : null,
		results,
		restore,
		cameraRestored,
	};
	log.info('Grid finished', {
		ok: outcome.ok,
		aborted: outcome.aborted,
		shot: results.filter((r) => r.status === 'shot').length,
		failed: results.filter((r) => r.status === 'failed').length,
		skipped: results.filter((r) => r.status === 'skipped').length,
		restoredExactly: restore?.landedExactly ?? false,
		cameraRestored,
	});
	return outcome;
}
