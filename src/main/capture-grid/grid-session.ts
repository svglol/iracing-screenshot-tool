// Capture grid — the session: every car in the roster, one shot each, with the
// car at the reference distance; then everything put back.
//
// Per car:   switch the camera → find the frame → if another car is too close,
//            look for the same spot on a nearby lap → hold the camera and the
//            frame while it is shot (shot-lock.ts)
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
	type PositionSearchResult,
} from './position-search';
import {
	switchCameraToCar,
	type CameraControlDeps,
	type CameraSwitchFailure,
	type CameraView,
} from './camera-control';
import { carLapTimeSec, type GridCar, type GridTelemetry } from './roster';
import {
	CLEAR_LAP_OFFSETS,
	isClear,
	measureClearance,
	roomier,
	type Clearance,
} from './clearance';
import {
	readDrift,
	restoreShot,
	returnToFrame,
	shotIsClean,
	startShotGuard,
	type ShotExpectation,
	type ShotLockDeps,
} from './shot-lock';

const log = createLogger('capture-grid/session');

// How many times one car is shot before giving up on a camera that keeps
// moving. Each retry follows a drift that was put back.
export const MAX_SHOT_ATTEMPTS = 3;

// Every field is declared on both branches: strictNullChecks is off in this
// project, so `if (shot.ok)` does not narrow a boolean-tagged union.
export type GridShotOutcome =
	| {
			ok: true;
			path: string;
			reason?: undefined;
			fatal?: undefined;
			skippedByUser?: undefined;
			retry?: undefined;
	  }
	// `fatal` stops the grid (the capture backend is gone); `skippedByUser` is a
	// ReShade-mode skip, recorded as skipped rather than failed; `retry` is a shot
	// refused because the camera moved while it was taken (nothing was saved).
	| {
			ok: false;
			path?: undefined;
			reason: string;
			fatal?: boolean;
			skippedByUser?: boolean;
			retry?: boolean;
	  };

// Handed to every shot. A backend calls `isClean` with the moment its image was
// taken, if it knows it (a ReShade file's write time), before saving anything,
// and returns `{ ok: false, retry: true }` when it is not.
export interface ShotCheck {
	isClean(capturedAt?: number): boolean;
}

export interface GridSessionDeps {
	replay: Pick<ReplayController, 'pause' | 'restoreAnchor'>;
	search: PositionSearchDeps;
	camera: CameraControlDeps;
	// Every car's telemetry at the current frame, for the gap to the nearest car.
	readTelemetry(): GridTelemetry | null;
	// Resize iRacing for the whole grid, once. The caller has already hidden the
	// sim's UI and latched its capture state.
	prepare(): Promise<
		{ ok: true; message?: undefined } | { ok: false; message: string }
	>;
	// One shot of what iRacing is showing now.
	shoot(
		car: GridCar,
		index: number,
		check: ShotCheck
	): Promise<GridShotOutcome>;
	restoreWindow(): void;
	delay(ms: number): Promise<void>;
	signal: { aborted: boolean };
	onProgress?(progress: GridProgress): void;
}

export interface GridPlan {
	cars: GridCar[];
	referencePct: number;
	snapshot: PlaybackSnapshot;
	// The camera as the user left it, to put back at the end. Its group (and on a
	// car-mounted group, its camera) is the one every car is shot with.
	view: CameraView;
	// The encoded number of the car that view was on; null when unknown, and the
	// camera is then left where the grid ended.
	viewCameraNumber: number | null;
	// Whether the camera NUMBER is held too — car-mounted groups only; on a TV
	// group iRacing picks the camera per car.
	holdCamera: boolean;
	tapeEndFrame: number | null;
	trackLengthMeters: number | null;
	// The gap along the track every other car must keep, or 0 to not check.
	minGapMeters: number;
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
	// Laps from the nearest crossing the shot was taken on (0 = the nearest), to
	// find room from the other cars.
	lapOffset: number;
	// Gap to the nearest other car at the chosen frame, along the track.
	gapMeters: number | null;
	// True when no lap tried was clear and the least crowded one was shot.
	crowded: boolean;
	// How many times the camera or replay moved and was put back for this car.
	cameraRestores: number;
}

export type GridPhase =
	| 'positioning'
	| 'finding-clear-lap'
	| 'restoring-camera'
	| 'capturing'
	| 'car-done';

export interface GridProgress {
	phase: GridPhase;
	index: number;
	total: number;
	car: GridCar;
	// 'finding-clear-lap': the lap being tried.
	lapOffset?: number;
	// 'capturing': a shot again after the camera moved.
	retry?: boolean;
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

interface Candidate {
	found: PositionSearchResult;
	lapOffset: number;
	clearance: Clearance;
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
	const group = plan.view.group ?? 0;
	const camera = plan.view.camera ?? 0;
	const lock = { requireGroup: true, requireCamera: plan.holdCamera };

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
			lapOffset: 0,
			gapMeters: null,
			crowded: false,
			cameraRestores: 0,
			...fields,
		};
		results.push(result);
		return result;
	};

	const measure = (carIdx: number): Clearance => {
		let telemetry: GridTelemetry | null = null;
		try {
			telemetry = deps.readTelemetry();
		} catch {
			telemetry = null;
		}
		return telemetry && plan.trackLengthMeters
			? measureClearance(telemetry, carIdx, plan.trackLengthMeters)
			: { gapMeters: null, nearestCarIdx: null, nearestOffsetMeters: null };
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
			const progress = (
				phase: GridPhase,
				extra: Partial<Omit<GridProgress, 'phase'>> = {}
			) => deps.onProgress?.({ phase, index, total, car, ...extra });
			const finish = (
				fields: Partial<GridCarResult> & { status: GridCarStatus }
			) => {
				const result = record(car, fields);
				log.info('Grid car finished', { index, total, ...result });
				progress('car-done', { result });
			};
			const lockDeps: ShotLockDeps = {
				camera: deps.camera,
				readFrame: () => {
					const sample = deps.search.readSample(car.carIdx);
					return sample ? sample.frame : null;
				},
				pause: () => deps.replay.pause(),
				seekAbsolute: (frame) => deps.search.seekAbsolute(frame),
				delay: (ms) => deps.delay(ms),
				now: () => deps.camera.now(),
			};

			progress('positioning');

			// --- camera ---------------------------------------------------------
			// The number is null only for the reference car (the roster skips any
			// other car without one), and the camera is already on it.
			if (car.cameraNumber !== null && plan.view.group !== null) {
				const switched = await switchCameraToCar(
					deps.camera,
					{ carIdx: car.carIdx, cameraNumber: car.cameraNumber },
					{ group, camera },
					{ signal, ...lock }
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
			const nearest = await searchCarPosition(deps.search, {
				carIdx: car.carIdx,
				targetPct: plan.referencePct,
				estLapTimeSec: car.estLapTimeSec,
				trackLengthMeters: plan.trackLengthMeters,
				tapeEndFrame: plan.tapeEndFrame,
				start: { frame: plan.snapshot.anchorFrame, pct: car.startPct },
				signal,
			});
			if (!nearest.found) {
				if (nearest.reason === 'aborted') {
					break;
				}
				fatal = nearest.reason !== null && simGone(nearest.reason);
				finish({
					status: 'failed',
					reason: `position-${nearest.reason}`,
					frame: nearest.frame,
				});
				continue;
			}

			// --- room around the car --------------------------------------------
			// Another car within the minimum gap: the same spot on a nearby lap,
			// nearest in time first, until one is clear. None clear: the least
			// crowded, reported as such.
			let chosen: Candidate = {
				found: nearest,
				lapOffset: 0,
				clearance: measure(car.carIdx),
			};
			if (!isClear(chosen.clearance, plan.minGapMeters)) {
				log.info('Grid car crowded; trying other laps', {
					carIdx: car.carIdx,
					gapMeters: chosen.clearance.gapMeters,
					nearestCarIdx: chosen.clearance.nearestCarIdx,
				});
				let lapTime: number | null = null;
				try {
					const telemetry = deps.readTelemetry();
					lapTime = telemetry
						? carLapTimeSec(telemetry, car.carIdx)
						: null;
				} catch {
					lapTime = null;
				}
				let searched = false;
				for (const lapOffset of CLEAR_LAP_OFFSETS) {
					if (signal.aborted) {
						break;
					}
					progress('finding-clear-lap', { lapOffset });
					searched = true;
					const other = await searchCarPosition(deps.search, {
						carIdx: car.carIdx,
						targetPct: plan.referencePct,
						estLapTimeSec: lapTime ?? car.estLapTimeSec,
						trackLengthMeters: plan.trackLengthMeters,
						tapeEndFrame: plan.tapeEndFrame,
						start: { frame: nearest.frame, pct: nearest.pct },
						lapOffset,
						allowOtherCrossing: false,
						signal,
					});
					if (!other.found) {
						if (other.reason === 'no-telemetry') {
							fatal = true;
							break;
						}
						// Off the tape, or this lap would not settle: try the next.
						continue;
					}
					const clearance = measure(car.carIdx);
					if (roomier(clearance, chosen.clearance)) {
						chosen = { found: other, lapOffset, clearance };
					}
					if (isClear(clearance, plan.minGapMeters)) {
						break;
					}
				}
				if (signal.aborted) {
					break;
				}
				if (fatal) {
					finish({ status: 'failed', reason: 'position-no-telemetry' });
					continue;
				}
				// The replay is wherever the last lap tried left it.
				if (searched) {
					const back = await returnToFrame(
						lockDeps,
						chosen.found.frame as number,
						signal
					);
					if (back === 'aborted') {
						break;
					}
					if (back) {
						finish({
							status: 'failed',
							reason: 'position-seek-timeout',
							frame: chosen.found.frame,
						});
						continue;
					}
				}
			}
			const found = chosen.found;
			const errorMeters =
				found.errorLaps !== null && plan.trackLengthMeters
					? found.errorLaps * plan.trackLengthMeters
					: null;
			const crowded = !isClear(chosen.clearance, plan.minGapMeters);
			const placed = {
				frame: found.frame,
				errorMeters,
				usedOtherCrossing: found.usedOtherCrossing,
				lapOffset: chosen.lapOffset,
				gapMeters: chosen.clearance.gapMeters,
				crowded,
			};

			// --- shoot, with the camera and frame held --------------------------
			const expected: ShotExpectation = {
				carIdx: car.carIdx,
				cameraNumber: car.cameraNumber,
				group,
				camera,
				holdCamera: plan.holdCamera,
				frame: found.frame as number,
			};
			let cameraRestores = 0;
			let shot: GridShotOutcome | null = null;
			for (let attempt = 0; attempt < MAX_SHOT_ATTEMPTS; attempt++) {
				// Seeks can move the camera, and so can the user between cars.
				const drift = readDrift(lockDeps, expected);
				if (drift === null) {
					shot = { ok: false, reason: 'no-telemetry', fatal: true };
					break;
				}
				if (drift.length > 0) {
					cameraRestores += 1;
					progress('restoring-camera');
					const failed = await restoreShot(
						lockDeps,
						expected,
						drift,
						signal
					);
					if (failed) {
						shot =
							failed === 'aborted'
								? null
								: {
										ok: false,
										reason:
											failed === 'no-telemetry'
												? 'no-telemetry'
												: 'camera-lost',
										fatal: failed === 'no-telemetry',
									};
						break;
					}
				}

				// Give the renderer time to present the new frame before it is shot.
				await deps.delay(SEEK_SETTLE_MS);
				if (signal.aborted) {
					break;
				}

				progress('capturing', { retry: attempt > 0 });
				const guard = startShotGuard(lockDeps, expected, {
					signal,
					settleMs: SEEK_SETTLE_MS,
					onDrift: () => {
						cameraRestores += 1;
						progress('restoring-camera');
					},
					onRestored: () => progress('capturing', { retry: true }),
				});
				try {
					shot = await deps.shoot(car, index, {
						// Checked by the backend before it saves: the guard saw no drift
						// at the moment of capture, could put back anything it did see,
						// and nothing is off right now.
						isClean: (capturedAt) =>
							guard.lost === null &&
							shotIsClean(guard.windows, capturedAt) &&
							readDrift(lockDeps, expected)?.length === 0,
					});
				} finally {
					await guard.stop();
				}
				if (shot.ok || !shot.retry) {
					break;
				}
				log.warn('Grid shot refused: the camera moved while it was taken', {
					carIdx: car.carIdx,
					attempt,
					drifts: guard.windows,
				});
			}

			// A shot that landed counts even if the abort came in while it was
			// being saved.
			if (shot?.ok) {
				finish({
					status: 'shot',
					path: shot.path,
					cameraRestores,
					...placed,
				});
				continue;
			}
			if (!shot || signal.aborted) {
				// Aborted while positioned or with a shot in flight (a ReShade wait the
				// abort cancelled): not shot because of the abort, not a fault.
				finish({ status: 'skipped', reason: 'aborted', ...placed });
				break;
			}
			if (shot.fatal) {
				fatal = true;
				message = shot.reason;
			}
			finish({
				status: shot.skippedByUser ? 'skipped' : 'failed',
				reason: shot.skippedByUser
					? 'skipped-by-user'
					: shot.retry
						? 'camera-kept-moving'
						: shot.reason,
				cameraRestores,
				...placed,
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
				{ group, camera },
				lock
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
		crowded: results.filter((r) => r.crowded).length,
		cameraRestores: results.reduce((n, r) => n + r.cameraRestores, 0),
		restoredExactly: restore?.landedExactly ?? false,
		cameraRestored,
	});
	return outcome;
}
