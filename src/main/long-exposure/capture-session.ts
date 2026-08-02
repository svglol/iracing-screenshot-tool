// Long-exposure capture orchestration (design note §4).
//
// `executeRecipe` is the ONLY entry point into the capture path. The UI's job is to
// build a recipe; everything from there is here.
//
// THE CENTRAL GUARANTEE. The user parked the replay on a moment and framed a shot.
// We move their cursor to take the picture, so we owe them it back — exactly, not
// "close enough", on every exit path including failure and abort. That is why the
// whole body sits inside a try/finally whose finally runs `restoreAnchor`, and why
// restoration is deliberately NOT abortable.
//
// TIMING AUTHORITY. Window boundaries and termination come from ReplayFrameNum
// telemetry, never from a clock. Playback-speed drift or a stalled frame can make a
// capture slow, or make it fail loudly — it can never silently change the exposure.
// Wall-clock appears here only as timeouts on things that can hang.
//
// Every dependency is injected, so the whole state machine — including the restore
// guarantee — is testable with no sim, no GPU and no window.

import {
	REPLAY_FRAMES_PER_SECOND,
	subFramePosition,
} from '../../utilities/long-exposure/exposure-math';
import {
	planPrimarySink,
	routeFrame,
	type AccumulatorSink,
} from '../../utilities/long-exposure/accumulator-sinks';
import {
	resolvePlan,
	validatePlan,
	type LongExposureRecipe,
	type ResolvedPlan,
} from '../../utilities/long-exposure/shot-recipe';
import {
	summarizeSamples,
	type SampleLogEntry,
	type SampleStats,
} from '../../utilities/long-exposure/sample-stats';
import { assessLongExposureVram } from '../../utilities/long-exposure/vram-budget';
import type { Dimensions, VramInfo } from '../../utilities/vram-prediction';
import type { PlaybackSnapshot, ReplayState } from './replay-control';
import { ReplayController, capturePlaybackSnapshot } from './replay-control';
import { createLogger } from '../../utilities/logger';

const log = createLogger('long-exposure/session');

// How often the accumulation loop samples telemetry and pushes the current weight
// to the GPU session. One 60 Hz tick; frames arriving between pushes use the last
// value, which is at most one tick stale and affects only the taper weight.
export const SAMPLE_PUSH_INTERVAL_MS = 16;

// Wall-clock safety net for the accumulation loop, expressed as a multiple of the
// predicted duration plus a fixed floor. This is a TIMEOUT, not a terminator: the
// loop's real exit condition is ReplayFrameNum reaching the anchor.
export const CAPTURE_TIMEOUT_MULTIPLIER = 3;
export const CAPTURE_TIMEOUT_FLOOR_MS = 15000;

// Budget for the native session's resolve + readback.
export const RESOLVE_TIMEOUT_MS = 20000;

// After starting playback, wait at most this long for the replay to actually begin
// advancing before declaring the transport stuck.
export const ROLL_TIMEOUT_MS = 3000;

export type LongExposureFailure =
	| 'invalid-recipe'
	| 'insufficient-vram'
	| 'backend-unavailable'
	| 'window-unavailable'
	| 'seek-failed'
	| 'playback-stalled'
	| 'no-samples'
	| 'resolve-failed'
	| 'aborted';

export interface LongExposureImage {
	// Tightly packed 16-bit RGBA, little-endian, straight from the GPU resolve.
	data: Buffer;
	width: number;
	height: number;
}

// What optical-flow interpolation actually did, as opposed to what was requested.
//
// Reported on every capture, including when it was never asked for, so the sidecar
// records the truth about how a given image was made. `enabled: false` with a reason
// is a normal outcome on non-NVIDIA hardware, not a failure.
export interface LongExposureInterpolationReport {
	requestedFactor: number;
	enabled: boolean;
	achievedFactor: number;
	reason: string | null;
	gridSize: number;
	bidirectional: boolean;
	// Real captured frames vs synthesised in-betweens. Kept apart deliberately: if
	// interpolation's GPU cost slows frame consumption below iRacing's present rate,
	// synthetic samples are being bought with real ones — and only these two numbers
	// side by side make that visible.
	realSamples: number;
	syntheticSamples: number;
	meanFrameMs: number | null;
	maxFrameMs: number | null;
}

export interface LongExposureOutcome {
	ok: boolean;
	failure: LongExposureFailure | null;
	message: string | null;
	warnings: string[];
	image: LongExposureImage | null;
	plan: ResolvedPlan | null;
	stats: SampleStats | null;
	backend: string | null;
	interpolation: LongExposureInterpolationReport | null;
	// How anchor restoration went. Populated on EVERY outcome, including failures —
	// the user needs to know where their cursor ended up regardless.
	restore: {
		attempted: boolean;
		landedExactly: boolean;
		finalFrame: number | null;
		error: string | null;
	};
}

// Shape the native addon reports interpolation in. Optional throughout so an addon
// build predating the feature type-checks and behaves as interpolation-off.
export interface NativeInterpolationStatus {
	enabled: boolean;
	factor: number;
	reason: string | null;
	gridSize: number;
	bidirectional: boolean;
}

export interface NativeSessionApi {
	longExposureBegin(
		hwnd: number,
		interpolationFactor?: number,
		highlightRecoveryStops?: number
	): number;
	longExposureSetSample(
		session: number,
		weight: number,
		u: number,
		replayFrameNum: number,
		sessionTime: number
	): void;
	longExposureSetGate(session: number, open: boolean): void;
	longExposureStats(session: number): {
		accepted: number;
		synthesized?: number;
		rejected: number;
		sawFrame: boolean;
		meanFrameMs?: number;
		maxFrameMs?: number;
		interpolation?: NativeInterpolationStatus | null;
		frameWidth: number;
		frameHeight: number;
		error: string | null;
	};
	longExposureFinish(
		session: number,
		outWidth: number,
		outHeight: number,
		supersample: number,
		tonemap: number,
		exposureMul: number,
		timeoutMs: number
	): {
		data: Buffer | null;
		width: number;
		height: number;
		accepted: number;
		synthesized?: number;
		rejected: number;
		backend: string;
		meanFrameMs?: number;
		maxFrameMs?: number;
		interpolation?: NativeInterpolationStatus | null;
		samples: Array<{
			u: number;
			sessionTime: number;
			replayFrameNum: number;
			digest: string;
			presentedAt: string;
			accepted: boolean;
		}>;
		error: string | null;
	};
	longExposureAbort(session: number, timeoutMs: number): void;
}

export interface CaptureSessionDeps {
	replay: ReplayController;
	native: NativeSessionApi | null;
	backendName: string | null;
	backendUnavailableReason: string | null;
	// Resize iRacing's window to the render size and raise it. Resolves to the
	// window handle, or undefined when the window can't be found.
	resizeWindow(width: number, height: number): Promise<number | undefined>;
	// Put iRacing's window back the way the user had it.
	restoreWindow(): void;
	// Live VRAM measurement and iRacing's current window size, for the pre-flight.
	vramInfo(): VramInfo | null;
	baselineDims(): Dimensions | null;
	delay(ms: number): Promise<void>;
	// Wall clock. TIMEOUTS ONLY — never used to decide replay position.
	now(): number;
	// Cooperative abort. Checked between every step; unwinds through the same
	// finally as any other exit, so the anchor is still restored.
	signal?: { aborted: boolean };
	onProgress?(update: {
		phase: 'seeking' | 'accumulating' | 'resolving' | 'restoring';
		accepted?: number;
		rejected?: number;
		progress?: number;
	}): void;
}

const TONEMAP_CODES: Record<string, number> = {
	none: 0,
	reinhard: 1,
	aces: 2,
};

function frameToSessionTime(
	frame: number,
	reference: ReplayState | null
): number {
	// Replay frames tick at a fixed 60 Hz, so a frame offset converts to a session
	// time offset exactly. Anchoring on a live reading keeps the two in the same
	// origin even though ReplaySessionTime is relative to the session, not the tape.
	if (!reference || reference.replaySessionTime === null) {
		return frame / REPLAY_FRAMES_PER_SECOND;
	}
	return (
		reference.replaySessionTime +
		(frame - reference.replayFrameNum) / REPLAY_FRAMES_PER_SECOND
	);
}

function failure(
	kind: LongExposureFailure,
	message: string,
	extra: Partial<LongExposureOutcome> = {}
): LongExposureOutcome {
	return {
		ok: false,
		failure: kind,
		message,
		warnings: [],
		image: null,
		plan: null,
		stats: null,
		backend: null,
		interpolation: null,
		restore: {
			attempted: false,
			landedExactly: false,
			finalFrame: null,
			error: null,
		},
		...extra,
	};
}

// Fold the requested factor together with what the hardware actually delivered.
// Exported for tests: the "requested 4, got 1 because AMD" path is exactly the one
// that must not silently look like success.
export function buildInterpolationReport(opts: {
	requestedFactor: number;
	status: NativeInterpolationStatus | null | undefined;
	realSamples: number;
	syntheticSamples: number;
	meanFrameMs: number | null;
	maxFrameMs: number | null;
}): LongExposureInterpolationReport {
	const { requestedFactor, status } = opts;
	const enabled = status?.enabled === true;
	return {
		requestedFactor,
		enabled,
		// Never claim the requested factor when the hardware declined it.
		achievedFactor: enabled ? (status?.factor ?? 1) : 1,
		reason: status?.reason ?? null,
		gridSize: status?.gridSize ?? 0,
		bidirectional: status?.bidirectional === true,
		realSamples: opts.realSamples,
		syntheticSamples: opts.syntheticSamples,
		meanFrameMs: opts.meanFrameMs,
		maxFrameMs: opts.maxFrameMs,
	};
}

export async function executeRecipe(
	recipe: LongExposureRecipe,
	deps: CaptureSessionDeps
): Promise<LongExposureOutcome> {
	const live = deps.replay.state();
	if (!live) {
		return failure(
			'invalid-recipe',
			'iRacing is not showing a replay, so there is no moment to capture.'
		);
	}

	// The current window size lets the predictor discount FrameRate for the resize
	// to render size — without it the sample-count estimate runs ~2x optimistic.
	const baseline = deps.baselineDims();
	const plan = resolvePlan(recipe, {
		renderFps: live.frameRate ?? undefined,
		currentWindowPixels: baseline ? baseline.width * baseline.height : null,
	});
	const validation = validatePlan({
		plan,
		recipe,
		replayFrameNumEnd: live.replayFrameNumEnd,
		currentSessionNum: live.replaySessionNum,
	});
	if (validation.errors.length > 0) {
		return failure('invalid-recipe', validation.errors.join(' '), { plan });
	}

	if (!deps.native) {
		return failure(
			'backend-unavailable',
			deps.backendUnavailableReason ||
				'Long exposure is not available on this machine.',
			{ plan, warnings: validation.warnings }
		);
	}

	// Pre-flight our OWN allocation. Unlike iRacing's, it is deterministic and ours
	// to be honest about, so this is the one place we hard-refuse.
	const vram = assessLongExposureVram({
		info: deps.vramInfo(),
		renderWidth: plan.renderWidth,
		renderHeight: plan.renderHeight,
		sinkCount: 1,
		baseline: deps.baselineDims(),
		interpolationFactor: recipe.interpolationFactor,
	});
	if (vram.refuse) {
		return failure('insufficient-vram', vram.refusalMessage as string, {
			plan,
			warnings: validation.warnings,
		});
	}

	// The playback state we owe back. The ANCHOR comes from the RECIPE, never from
	// the live cursor — that is what makes re-shooting after scrubbing safe.
	const snapshot: PlaybackSnapshot = {
		...capturePlaybackSnapshot(live),
		anchorFrame: recipe.anchorFrame,
	};

	const sink = planPrimarySink({
		anchorFrame: recipe.anchorFrame,
		windowFrames: plan.windowFrames,
		weighting: recipe.weighting,
		label: recipe.shutter || `${Math.round(recipe.exposureMs)}ms`,
	});

	log.info('Long exposure starting', {
		anchorFrame: recipe.anchorFrame,
		windowFrames: plan.windowFrames,
		playbackDivisor: plan.playbackDivisor,
		predictedSamples: plan.predictedSamples,
		render: { width: plan.renderWidth, height: plan.renderHeight },
		weighting: recipe.weighting,
	});

	let nativeSession: number | null = null;
	let outcome: LongExposureOutcome | null = null;

	try {
		outcome = await runCapture({
			recipe,
			plan,
			sink,
			live,
			deps,
			warnings: validation.warnings,
			claimSession: (id) => {
				nativeSession = id;
			},
			releaseSession: () => {
				nativeSession = null;
			},
		});
	} catch (error) {
		const message = (error as Error)?.message || String(error);
		log.error('Long exposure threw', { error: message });
		outcome = failure('resolve-failed', message, {
			plan,
			warnings: validation.warnings,
		});
	} finally {
		// GUARANTEED CLEANUP, in dependency order.
		//
		// 1. Tear down any live GPU session first, so its VRAM is released before we
		//    resize iRacing back (and so a hung capture thread cannot outlive us).
		if (nativeSession !== null && deps.native) {
			try {
				deps.native.longExposureAbort(nativeSession, RESOLVE_TIMEOUT_MS);
			} catch (error) {
				log.warn('Long exposure session abort failed', {
					error: (error as Error)?.message || String(error),
				});
			}
		}

		// 2. Put iRacing's window back before restoring the cursor, so the user sees
		//    their own framing while the seek settles rather than a resized window.
		try {
			deps.restoreWindow();
		} catch (error) {
			log.warn('Window restore failed', {
				error: (error as Error)?.message || String(error),
			});
		}

		// 3. Return the cursor to the anchor. NOT abortable, and never skipped —
		//    leaving the user somewhere they never chose is the one outcome this
		//    feature must not produce.
		deps.onProgress?.({ phase: 'restoring' });
		const restore = await deps.replay.restoreAnchor(snapshot);
		if (outcome) {
			outcome.restore = {
				attempted: true,
				landedExactly: restore.landedExactly,
				finalFrame: restore.finalFrame,
				error: restore.error,
			};
			if (!restore.landedExactly) {
				outcome.warnings = [
					...outcome.warnings,
					`The replay could not be returned exactly to frame ${snapshot.anchorFrame}${
						restore.finalFrame === null
							? ''
							: ` (it is on ${restore.finalFrame})`
					}. Re-shooting this moment may not match.`,
				];
			}
		}
	}

	return outcome as LongExposureOutcome;
}

interface RunCaptureArgs {
	recipe: LongExposureRecipe;
	plan: ResolvedPlan;
	sink: AccumulatorSink;
	live: ReplayState;
	deps: CaptureSessionDeps;
	warnings: string[];
	claimSession(id: number): void;
	releaseSession(): void;
}

async function runCapture(args: RunCaptureArgs): Promise<LongExposureOutcome> {
	const {
		recipe,
		plan,
		sink,
		live,
		deps,
		warnings,
		claimSession,
		releaseSession,
	} = args;
	const native = deps.native as NativeSessionApi;
	const aborted = () => deps.signal?.aborted === true;

	const base = (): LongExposureOutcome => ({
		ok: false,
		failure: null,
		message: null,
		warnings,
		image: null,
		plan,
		stats: null,
		backend: deps.backendName,
		interpolation: null,
		restore: {
			attempted: false,
			landedExactly: false,
			finalFrame: null,
			error: null,
		},
	});

	// --- 1. Resize iRacing to the render size -------------------------------
	const hwnd = await deps.resizeWindow(plan.renderWidth, plan.renderHeight);
	if (hwnd === undefined) {
		return {
			...base(),
			failure: 'window-unavailable',
			message: 'iRacing window not found.',
		};
	}
	if (aborted()) {
		return { ...base(), failure: 'aborted', message: 'Capture cancelled.' };
	}

	// --- 2. Seek to the window start and let it settle -----------------------
	deps.onProgress?.({ phase: 'seeking' });
	const seek = await deps.replay.seekToWindowStart(sink.startFrame, {
		signal: deps.signal,
	});
	if (aborted()) {
		return { ...base(), failure: 'aborted', message: 'Capture cancelled.' };
	}
	if (!seek.landed) {
		return {
			...base(),
			failure: 'seek-failed',
			message: `The replay did not reach frame ${sink.startFrame} in time. It may still be loading.`,
		};
	}

	// Re-anchor the frame->session-time map on a reading taken AFTER the seek, so
	// the sink's window bounds and the live sample stream share one origin.
	// windowFrames is always >= 1, so this map is always strictly increasing.
	const settled = deps.replay.state() ?? live;
	const windowStartTime = frameToSessionTime(sink.startFrame, settled);
	const frameTimeOf = (frame: number) =>
		windowStartTime + (frame - sink.startFrame) / REPLAY_FRAMES_PER_SECOND;

	// --- 3. Open the GPU session (gate closed) -------------------------------
	// The interpolation factor is a REQUEST. The native side sets it up from the
	// first real frame and reports back what it could actually negotiate; hardware
	// that cannot do it captures exactly as it would have.
	// Highlight recovery, unlike interpolation, is not a request — it is a shader
	// constant that behaves identically on every GPU, so what is asked for is always
	// what happens.
	const session = native.longExposureBegin(
		hwnd,
		recipe.interpolationFactor,
		recipe.highlightRecovery
	);
	claimSession(session);

	// --- 4. Roll, and accumulate until the anchor ----------------------------
	deps.replay.setCaptureSpeed(plan.playbackDivisor);

	const timeoutMs = Math.max(
		CAPTURE_TIMEOUT_FLOOR_MS,
		plan.predictedWallClockSeconds * 1000 * CAPTURE_TIMEOUT_MULTIPLIER
	);
	const started = deps.now();
	let rolling = false;
	let lastFrameNum = settled.replayFrameNum;
	let reachedAnchor = false;
	// When the replay frame number last CHANGED, in wall-clock ms. Used only to
	// interpolate the taper weight WITHIN a replay frame — ReplaySessionTime is
	// frame-quantised, so without this every sample sharing a frame gets an
	// identical weight and tapered curves band visibly (see subFramePosition).
	// Never used for boundaries or termination, which stay frame-indexed.
	let frameChangedAt = deps.now();

	for (;;) {
		if (aborted()) {
			native.longExposureSetGate(session, false);
			return {
				...base(),
				failure: 'aborted',
				message: 'Capture cancelled.',
			};
		}

		const state = deps.replay.state();
		if (state) {
			const frameNum = state.replayFrameNum;
			if (frameNum !== lastFrameNum) {
				frameChangedAt = deps.now();
			}

			// The gate opens the moment we cross into the window, and NOT before —
			// so pre-roll frames can never join the exposure.
			const inWindow =
				frameNum >= sink.startFrame && frameNum <= sink.endFrame;
			native.longExposureSetGate(session, inWindow);

			if (inWindow) {
				// Interpolate within the replay frame. ReplaySessionTime only ticks at
				// 60 Hz, so at 1/16 playback ~10 consecutive samples would otherwise
				// share one position — and one weight — producing a visibly banded
				// taper. The frame index still decides everything that matters.
				const subFrame = subFramePosition({
					elapsedSinceFrameChangeMs: deps.now() - frameChangedAt,
					playbackDivisor: plan.playbackDivisor,
				});
				const sessionTime =
					frameTimeOf(frameNum) + subFrame / REPLAY_FRAMES_PER_SECOND;

				const [contribution] = routeFrame({
					sinks: [sink],
					replayFrameNum: frameNum,
					sessionTime,
					frameTimeOf,
				});
				if (contribution) {
					// The interpolated time goes into the sample log too, so the
					// evenness report measures actual sample spacing rather than the
					// frame-quantised staircase (which reported a flat 1/60 s).
					native.longExposureSetSample(
						session,
						contribution.weight,
						contribution.u,
						frameNum,
						sessionTime
					);
				}
			}

			if (frameNum > lastFrameNum) {
				rolling = true;
			}
			lastFrameNum = frameNum;

			// TERMINATION IS FRAME-INDEXED, never timed. Overshoot is expected and
			// harmless — the gate closes on the same condition, so nothing past the
			// anchor is accumulated, and the restore seek is unconditional anyway.
			if (frameNum >= sink.endFrame) {
				native.longExposureSetGate(session, false);
				reachedAnchor = true;
				break;
			}
		}

		const elapsed = deps.now() - started;
		// Transport stuck: playback was requested but the cursor never advanced.
		if (!rolling && elapsed > ROLL_TIMEOUT_MS) {
			native.longExposureSetGate(session, false);
			return {
				...base(),
				failure: 'playback-stalled',
				message:
					'The replay did not start playing. Check that iRacing is not paused by another tool.',
			};
		}
		if (elapsed > timeoutMs) {
			native.longExposureSetGate(session, false);
			return {
				...base(),
				failure: 'playback-stalled',
				message: `The exposure did not reach frame ${sink.endFrame} within ${Math.round(timeoutMs / 1000)}s.`,
			};
		}

		const stats = native.longExposureStats(session);
		deps.onProgress?.({
			phase: 'accumulating',
			accepted: stats.accepted,
			rejected: stats.rejected,
			progress:
				sink.endFrame > sink.startFrame
					? Math.min(
							1,
							Math.max(
								0,
								(lastFrameNum - sink.startFrame) /
									(sink.endFrame - sink.startFrame)
							)
						)
					: 0,
		});

		await deps.delay(SAMPLE_PUSH_INTERVAL_MS);
	}

	// --- 5. Halt playback ----------------------------------------------------
	deps.replay.pause();

	if (!reachedAnchor) {
		return {
			...base(),
			failure: 'playback-stalled',
			message: 'The exposure ended before reaching the selected moment.',
		};
	}

	// --- 6. Resolve ----------------------------------------------------------
	deps.onProgress?.({ phase: 'resolving' });
	const preResolve = native.longExposureStats(session);
	if (preResolve.accepted === 0) {
		releaseSession();
		native.longExposureAbort(session, RESOLVE_TIMEOUT_MS);
		return {
			...base(),
			failure: 'no-samples',
			message: preResolve.sawFrame
				? 'No frames were accumulated. iRacing may have stopped rendering during the exposure.'
				: 'iRacing did not present any frames to capture.',
		};
	}

	// The delivered frame size is WGC's to report, not ours to assume — DPI and
	// client-area geometry mean it can differ from what we asked the window to be.
	const renderWidth = preResolve.frameWidth || plan.renderWidth;
	const renderHeight = preResolve.frameHeight || plan.renderHeight;
	const supersample = recipe.supersample;
	const outWidth = Math.max(1, Math.floor(renderWidth / supersample));
	const outHeight = Math.max(1, Math.floor(renderHeight / supersample));

	const result = native.longExposureFinish(
		session,
		outWidth,
		outHeight,
		supersample,
		TONEMAP_CODES[recipe.tonemap] ?? 0,
		Math.pow(2, recipe.exposureCompensation),
		RESOLVE_TIMEOUT_MS
	);
	// The native side consumed the session; do not abort it again in the finally.
	releaseSession();

	const samples: SampleLogEntry[] = result.samples.map((sample) => ({
		u: sample.u,
		sessionTime: sample.sessionTime,
		replayFrameNum: sample.replayFrameNum,
		digest: sample.digest,
		presentedAt: sample.presentedAt,
		accepted: sample.accepted,
	}));
	const stats = summarizeSamples(samples);

	const interpolation = buildInterpolationReport({
		requestedFactor: recipe.interpolationFactor,
		status: result.interpolation,
		realSamples: result.accepted,
		syntheticSamples: result.synthesized ?? 0,
		meanFrameMs: result.meanFrameMs ?? null,
		maxFrameMs: result.maxFrameMs ?? null,
	});

	if (!result.data || result.width < 1 || result.height < 1) {
		return {
			...base(),
			failure: 'resolve-failed',
			message: result.error || 'The GPU did not return an image.',
			stats,
			backend: result.backend || deps.backendName,
			interpolation,
		};
	}

	// Logged with real and synthetic side by side, and with the per-frame cost, so
	// comparing two shots at identical settings answers the only question that
	// matters about interpolation: did it cost us real samples?
	log.info('Long exposure resolved', {
		accepted: result.accepted,
		synthesized: result.synthesized ?? 0,
		rejected: result.rejected,
		evenness: Number(stats.evenness.toFixed(3)),
		dimensions: { width: result.width, height: result.height },
		backend: result.backend,
		interpolation: {
			requested: interpolation.requestedFactor,
			enabled: interpolation.enabled,
			achieved: interpolation.achievedFactor,
			reason: interpolation.reason,
		},
		frameMs: {
			mean:
				interpolation.meanFrameMs === null
					? null
					: Number(interpolation.meanFrameMs.toFixed(2)),
			max:
				interpolation.maxFrameMs === null
					? null
					: Number(interpolation.maxFrameMs.toFixed(2)),
		},
	});

	const interpolationWarnings: string[] = [];
	// Asked for it, did not get it. Say so — silently producing the un-interpolated
	// image would leave the user thinking this is what interpolation looks like.
	if (recipe.interpolationFactor > 1 && !interpolation.enabled) {
		interpolationWarnings.push(
			`Frame interpolation was requested but is not available on this machine, so the shot was taken without it${
				interpolation.reason ? ` (${interpolation.reason})` : ''
			}.`
		);
	}

	return {
		...base(),
		ok: true,
		image: { data: result.data, width: result.width, height: result.height },
		stats,
		backend: result.backend || deps.backendName,
		interpolation,
		// A resolve-stage error that still produced an image is a warning, not a
		// failure — the shot exists and the user should judge it.
		warnings: [
			...warnings,
			...interpolationWarnings,
			...(result.error ? [result.error] : []),
		],
	};
}
