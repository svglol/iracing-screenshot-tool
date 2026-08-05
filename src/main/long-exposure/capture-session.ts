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
	replayFrameWallMs,
	subFramePosition,
} from '../../utilities/long-exposure/exposure-math';
import {
	earliestStartFrame,
	planBracketSinks,
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
	| 'exclusive-fullscreen'
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

// One resolved bracket stop. A single-stop shot produces exactly one of these and
// it is the same image as `outcome.image`.
export interface LongExposureSinkImage extends LongExposureImage {
	// The sink id, which for a bracket is the shutter key ('1/125').
	sinkId: string;
	// How that stop reads to a person ('1/125 s'). Used for the filename suffix and
	// the sidecar, never as a key.
	label: string;
	// This stop's own exposure, which is the ONLY thing that differs between the
	// images in a bracket — they share every captured frame.
	exposureSeconds: number;
	// REAL frames THIS stop integrated, measured natively rather than inferred from
	// the sample log. The session's `accepted` counts frames CONSUMED and is the
	// same for every stop; this is the number that actually describes the image.
	accepted: number;
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
	// CPU-side time in the frame handler, EXCLUDING the first frame. Since the digest
	// readback stopped blocking, this no longer includes waiting for the GPU — so a
	// small number here does NOT prove we kept up. `realSamples` against
	// `plan.predictedSamples` is the ground truth; treat these as secondary.
	meanFrameMs: number | null;
	maxFrameMs: number | null;
	// The first frame alone: sink allocation plus NVOFA session creation (~30 ms).
	// One-time, and reported separately so it cannot distort the mean.
	setupFrameMs: number | null;
	// renderMegapixels x factor — one scalar for "how much interpolation work this
	// configuration asks for". Used to learn THIS MACHINE's own limit rather than
	// hard-coding a threshold measured on one particular GPU.
	load: number;
	// achieved / predicted real samples. Well below 1 means we could not keep up.
	achievedRatio: number | null;
}

export interface LongExposureOutcome {
	ok: boolean;
	failure: LongExposureFailure | null;
	message: string | null;
	warnings: string[];
	image: LongExposureImage | null;
	// Every resolved stop. One entry (the same image as `image`) for an ordinary
	// shot; one per stop for a bracket. Empty on every failure path.
	images: LongExposureSinkImage[];
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
		highlightRecoveryStops?: number,
		sinkIds?: string[]
	): number;
	longExposureSetSample(
		session: number,
		weight: number,
		u: number,
		replayFrameNum: number,
		sessionTime: number,
		sinkWeights?: number[]
	): void;
	longExposureSetGate(session: number, open: boolean): void;
	// Declare a new visit to the exposure window. Does NOT clear the accumulator.
	// Optional: an addon build predating multi-pass omits it, which is why the
	// session refuses to run more than one pass without it rather than silently
	// producing a whole-window smear.
	longExposureBeginPass?(session: number, passIndex: number): void;
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
		// Always 1 since supersampling was removed, which makes the resolve's box
		// downsample a single tap — exactly identity. The parameter stays because
		// removing it from the shader means rebuilding the addon and re-verifying the
		// most safety-critical pass in the feature, for no user-visible gain.
		supersample: number,
		tonemap: number,
		exposureMul: number,
		timeoutMs: number
	): {
		data: Buffer | null;
		width: number;
		height: number;
		// One entry per sink, in the order the ids were given to begin. Optional so
		// an addon build predating bracketing still satisfies this interface — the
		// caller falls back to the single `data` above.
		images?: Array<{
			sinkId: string;
			data: Buffer | null;
			width: number;
			height: number;
			accepted?: number;
		}>;
		accepted: number;
		synthesized?: number;
		rejected: number;
		backend: string;
		meanFrameMs?: number;
		maxFrameMs?: number;
		setupFrameMs?: number;
		interpolation?: NativeInterpolationStatus | null;
		samples: Array<{
			u: number;
			sessionTime: number;
			replayFrameNum: number;
			digest: string;
			presentedAt: string;
			accepted: boolean;
			pass?: number;
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
	// #10 exclusive-fullscreen check, re-sampled AFTER the window is raised. Returns
	// the refusal message when iRacing is confidently in exclusive fullscreen, or
	// null to proceed. Returns the MESSAGE rather than the raw state so the wording
	// stays in one place (main owns it, shared with the still path) while this module
	// stays free of electron. Optional: a caller that does not supply it simply keeps
	// the old behaviour of never re-checking.
	exclusiveFullscreenRefusal?(): string | null;
	// Live VRAM measurement and iRacing's current window size, for the pre-flight.
	vramInfo(): VramInfo | null;
	baselineDims(): Dimensions | null;
	// The smallest interpolation load this machine has been seen to choke on, or null
	// when it has never choked. Injected so the pure planner stays pure and the
	// persistence lives in the main process.
	lossyInterpolationLoad?(): number | null;
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
		// Zero-based pass index and total, so a multi-pass capture can show "pass 3
		// of 8" rather than appearing to restart. Both absent on a single-pass shot.
		pass?: number;
		passes?: number;
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
		images: [],
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
	setupFrameMs: number | null;
	// Why WE declined interpolation, when the decision was ours rather than the
	// hardware's — today, only "bracketing is on". Takes precedence over the native
	// status's own reason, because the native side was never asked in that case and
	// whatever it says about factor 1 describes a question nobody put to it.
	disabledReason?: string | null;
	renderWidth: number;
	renderHeight: number;
	// PER PASS, as the planner reports it.
	predictedSamples: number;
	// Multiplies the prediction, because `realSamples` is the cumulative count across
	// every pass. Left at 1 an 8-pass capture reports achievedRatio ~8.0 and
	// `diagnoseInterpolationShortfall` can never fire — the shortfall guardrail
	// disabled by the very feature that makes shortfalls easier to hide.
	passes?: number;
}): LongExposureInterpolationReport {
	const { requestedFactor, status } = opts;
	const enabled = status?.enabled === true;
	const achievedFactor = enabled ? (status?.factor ?? 1) : 1;
	const renderMegapixels = (opts.renderWidth * opts.renderHeight) / 1e6;
	const predictedTotal =
		opts.predictedSamples * Math.max(1, Math.round(opts.passes ?? 1));
	return {
		requestedFactor,
		enabled,
		// Never claim the requested factor when the hardware declined it.
		achievedFactor,
		reason: (!enabled && opts.disabledReason) || status?.reason || null,
		gridSize: status?.gridSize ?? 0,
		bidirectional: status?.bidirectional === true,
		realSamples: opts.realSamples,
		syntheticSamples: opts.syntheticSamples,
		meanFrameMs: opts.meanFrameMs,
		maxFrameMs: opts.maxFrameMs,
		setupFrameMs: opts.setupFrameMs,
		load: Number((renderMegapixels * achievedFactor).toFixed(3)),
		achievedRatio:
			predictedTotal > 0
				? Number((opts.realSamples / predictedTotal).toFixed(3))
				: null,
	};
}

// Below this share of the predicted real-sample count, a capture is treated as
// having failed to keep up with the sim rather than merely having been unlucky.
//
// RAISED 0.6 -> 0.8 after the warp optimisation (frame-interpolation note §9). The
// original value was fitted to a BIMODAL field sample — unaffected captures at ~1.08,
// badly affected ones at ~0.27 — so anything in between was untested. §9.1 created
// exactly that middle case: a shot landing at 0.636 while still losing half its real
// samples against the interpolation-off baseline, which the old threshold passed in
// silence. Silence there is the worst outcome, because the resulting image looks
// merely under-blurred rather than obviously broken.
//
// Recalibrated against every 5120x2880 shot taken to date:
//
//   unaffected (interpolation off, or on and keeping up):  1.00, 1.08, 1.09, 1.30, 1.36
//   affected   (real samples lost to interpolation):       0.27, 0.36, 0.46, 0.64
//
// The classes separate cleanly in (0.64, 1.00) and 0.8 sits in that gap, deliberately
// nearer the affected side: 26% above the worst affected shot but 20% below the worst
// unaffected one, so the bias stays toward missing a marginal case rather than crying
// wolf. Five interpolation-off shots at identical settings varied by +/-13% in sample
// count (13, 15, 13, 11, 12), which puts 0.8 about 2.4 standard deviations below the
// unaffected mean.
//
// Note this is not only a warning threshold: `index.ts` uses it to decide when to LEARN
// this machine's interpolation load limit, so the pre-shot guardrail and the post-shot
// diagnosis fire on the same evidence. Import it; do not re-type the number.
export const SAMPLE_SHORTFALL_RATIO = 0.8;

// Whether a capture lost real samples to interpolation, and what to do about it.
// Exported for tests: "requested 8x, got a third of the samples" is precisely the
// case that must not pass silently, because the resulting image looks under-blurred
// rather than obviously broken.
export function diagnoseInterpolationShortfall(
	report: LongExposureInterpolationReport
): string | null {
	if (!report.enabled || report.achievedRatio === null) {
		return null;
	}
	if (report.achievedRatio >= SAMPLE_SHORTFALL_RATIO) {
		return null;
	}
	const percent = Math.round(report.achievedRatio * 100);
	// The "turn off supersampling" remedy went with the setting. What is left are the
	// two levers that still exist, plus the one that did not before: passes buy real
	// samples with wall clock rather than with GPU time, which is precisely the
	// resource this warning says ran out.
	return (
		`Frame interpolation at ${report.achievedFactor}x could not keep up: this shot ` +
		`captured ${report.realSamples} real frames, about ${percent}% of the ${'~'}` +
		`predicted count, so synthetic samples were bought with real ones and the ` +
		`streak will look shorter and coarser than it should. Lower the interpolation ` +
		`factor, reduce the capture resolution, or turn interpolation off and add passes.`
	);
}

export async function executeRecipe(
	recipe: LongExposureRecipe,
	deps: CaptureSessionDeps
): Promise<LongExposureOutcome> {
	const live = deps.replay.state();
	if (!live) {
		// NOT "you are not in a replay". `readReplayState` returns null when
		// ReplayFrameNum is absent from telemetry, and iRacing writes its replay
		// buffer continuously — including during a live session — so that variable is
		// there whenever the sim is connected and in a session. Reaching here means we
		// have no telemetry at all, and telling the user to open a replay would send
		// them to do something that cannot help.
		return failure(
			'invalid-recipe',
			'iRacing is not sending replay telemetry, so there is no moment to capture. Check that the sim is running and in a session.'
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
		lossyInterpolationLoad: deps.lossyInterpolationLoad?.() ?? null,
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

	// One sink, or the whole at-or-faster ladder when bracketing is on.
	//
	// The structural property that makes bracketing nearly free in TIME: with a
	// trailing window every stop ends on the same anchor frame and differs only in
	// how far back it reaches, so a faster shutter is literally the tail subset of
	// the samples already flowing past. One capture, N images, one wait.
	//
	// It is NOT free in MEMORY — each stop owns a full-size accumulator — which is
	// why the VRAM pre-flight below counts sinks rather than assuming one.
	//
	// `planBracketSinks` returns the chosen stop FIRST, then progressively faster
	// ones. That order is load-bearing: the native side reports index 0 as the
	// primary image, and the gallery gets the stop the user actually asked for.
	const primarySink = planPrimarySink({
		anchorFrame: recipe.anchorFrame,
		exposureSeconds: plan.effectiveExposureSeconds,
		weighting: recipe.weighting,
		label: recipe.shutter || `${Math.round(recipe.exposureMs)}ms`,
	});
	const bracketSinks = recipe.bracket
		? planBracketSinks({
				anchorFrame: recipe.anchorFrame,
				shutterKey: recipe.shutter || '',
				weighting: recipe.weighting,
			})
		: [];
	// Falls back to the single sink when bracketing is asked for with a free-form
	// exposure that is not on the ladder — there is no "at or faster" set to build
	// from a key that does not exist, and refusing the shot over it would be worse.
	const sinks: AccumulatorSink[] =
		bracketSinks.length > 1 ? bracketSinks : [primarySink];
	const sink = sinks[0];

	// BRACKETING AND INTERPOLATION CANNOT BOTH RUN, and this is the downgrade that
	// makes that true rather than a preference.
	//
	// The native session keeps ONE retained-frame ping-pong and advances it inside
	// `accumulate_sample` — which the frame handler calls once per OPEN SINK. So on
	// the second and later stops of a captured frame both ping-pong slots already
	// hold that same frame: the flow estimate runs between identical inputs and the
	// warp deposits `factor - 1` zero-motion COPIES of the real frame rather than
	// in-betweens. Every stop but the primary would be quietly wrong, and wrong in
	// the way that reads as merely under-blurred rather than as broken. It also runs
	// NVOFA once per sink per frame, against a design note that assumes once per
	// frame.
	//
	// Interpolation gives way because it is the optional accelerator and bracketing
	// is what the user asked for by name — the same "fail soft, never silently
	// wrong" rule that governs interpolation on non-NVIDIA hardware. `validatePlan`
	// has already told the user, so this stays silent and just does it.
	//
	// Fixing it properly is the N-UAV warp kernel in
	// docs/design/long-exposure-bracketing.md §3.1.
	const interpolationFactor =
		sinks.length > 1 ? 1 : recipe.interpolationFactor;
	const interpolationDisabledReason =
		interpolationFactor !== recipe.interpolationFactor
			? 'bracketing is on, and the two cannot share the retained-frame state'
			: null;
	if (interpolationDisabledReason) {
		log.info('Long exposure dropped interpolation for a bracket', {
			requestedFactor: recipe.interpolationFactor,
			stops: sinks.length,
		});
	}

	// Pre-flight our OWN allocation. Unlike iRacing's, it is deterministic and ours
	// to be honest about, so this is the one place we hard-refuse.
	const vram = assessLongExposureVram({
		info: deps.vramInfo(),
		renderWidth: plan.renderWidth,
		renderHeight: plan.renderHeight,
		// Every stop owns a full accumulator (width x height x 16 B), so a bracket
		// multiplies the accumulator budget by the number of stops. This is the
		// pre-flight that stops an 11-stop 8K shot from being attempted.
		sinkCount: sinks.length,
		baseline: deps.baselineDims(),
		// The EFFECTIVE factor, not the requested one: a bracket does not allocate
		// the interpolation surfaces, so reserving for them would refuse shots that
		// would in fact have fit.
		interpolationFactor,
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

	log.info('Long exposure starting', {
		anchorFrame: recipe.anchorFrame,
		windowFrames: plan.windowFrames,
		exposureSeconds: plan.effectiveExposureSeconds,
		subFrameWindow: plan.isSubFrameWindow,
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
			sinks,
			interpolationFactor,
			interpolationDisabledReason,
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
	// The chosen stop, and the full set it leads (itself alone, or the bracket).
	sink: AccumulatorSink;
	sinks: AccumulatorSink[];
	// The interpolation factor actually handed to the native session, which is the
	// recipe's EXCEPT on a bracket, where it is forced to 1. Separate from
	// `recipe.interpolationFactor` on purpose: the recipe records what was asked for
	// and the sidecar must keep saying so.
	interpolationFactor: number;
	// Why we declined it, when the decision was ours rather than the hardware's.
	// null when the recipe's factor was honoured (including when it was already 1).
	interpolationDisabledReason: string | null;
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
		sinks,
		interpolationFactor,
		interpolationDisabledReason,
		live,
		deps,
		warnings,
		claimSession,
		releaseSession,
	} = args;
	const native = deps.native as NativeSessionApi;
	const aborted = () => deps.signal?.aborted === true;

	// Multi-pass degrades to a single pass on an addon build that predates it, the
	// same way interpolation degrades on a non-NVIDIA card: the shot is still correct,
	// just sampled as sparsely as it always was. It must NOT proceed silently — without
	// `longExposureBeginPass` the retained frame survives the seek, and every pass after
	// the first would warp its first in-betweens across the whole window.
	const passWarnings: string[] = [];
	let passes = Math.max(1, Math.round(recipe.passes ?? 1));
	if (passes > 1 && typeof native.longExposureBeginPass !== 'function') {
		passWarnings.push(
			`This build of the capture addon cannot run multi-pass captures, so the shot was taken as a single pass instead of ${passes}. It will be noisier than requested, not wrong.`
		);
		passes = 1;
	}

	const base = (): LongExposureOutcome => ({
		ok: false,
		failure: null,
		message: null,
		warnings,
		image: null,
		images: [],
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

	// #10 AGAIN — and this is the sample that can actually fire.
	//
	// The pre-flight in main runs the instant the user clicks Long Exposure, while
	// OUR window is still foreground. `isExclusiveFullscreenState` requires
	// attribution (GetForegroundWindow() === iRacing) because
	// SHQueryUserNotificationState is session-global and cannot say WHICH app is
	// fullscreen — so on this path attribution is structurally guaranteed to fail and
	// the guard can never return true. The still path gets away with sampling early
	// because its global hotkey leaves iRacing foreground; long exposure has no
	// hotkey, only the in-app button.
	//
	// `resizeWindow` raises iRacing (BringWindowToTop + SetForegroundWindow), so HERE
	// is the first moment attribution means anything. Refuse now rather than after
	// burning the whole exposure — WGC is DWM-based, so an exclusive-fullscreen
	// window presents nothing to capture and the run would end in the generic
	// "iRacing did not present any frames" with no way to tell why.
	const fullscreenRefusal = deps.exclusiveFullscreenRefusal?.() ?? null;
	if (fullscreenRefusal) {
		// The window was already resized, but the `finally` in `executeRecipe`
		// restores it unconditionally, so returning here leaves nothing behind.
		return {
			...base(),
			failure: 'exclusive-fullscreen',
			message: fullscreenRefusal,
		};
	}

	// --- 2-4. Visit the exposure window, once per pass -----------------------
	//
	// PASSES SUM INTO ONE ACCUMULATOR, which is never cleared between them. That is
	// correct rather than clever: resolve normalises per pixel by ACCUMULATED WEIGHT,
	// and every weight is a function of window POSITION rather than of sample index,
	// so N visits to the same window produce the same brightness as one visit with N
	// times the real samples. Each pass drops a different share of iRacing's presents,
	// which is where the extra samples come from.
	// See docs/design/long-exposure-multi-pass.md.
	//
	// ABORT IS DIFFERENT IN KIND HERE. A cancelled single-pass capture is a
	// half-open window and correctly fails. After k COMPLETE passes the image is
	// finished and merely noisier, because every pass covers the whole window — so it
	// is resolved rather than thrown away. `passes = 1` keeps today's behaviour
	// exactly, since k is then always 0.
	let session: number | null = null;
	let completedPasses = 0;
	let cutShort = false;
	// Whether the abort landed PART-WAY through a pass, which cannot be undone: those
	// samples are already summed in, over-weighting the window positions they reached.
	let partialPass = false;

	for (let pass = 0; pass < passes; pass += 1) {
		// --- 2. Seek to the window start and let it settle -------------------
		deps.onProgress?.({ phase: 'seeking', pass, passes });
		const seek = await deps.replay.seekToWindowStart(
			earliestStartFrame(sinks),
			{
				signal: deps.signal,
				// Spread the passes across one replay frame of wall clock, so they land on
				// different presentation instants instead of possibly re-sampling the same
				// ones. At 1/16 that is 267 ms / passes — 33 ms steps at 8 passes, against
				// a ~23 ms present interval, so they interleave rather than stack. Pass 0
				// gets no dither, so a single-pass capture is unchanged.
				extraSettleMs:
					passes > 1
						? (pass * replayFrameWallMs(plan.playbackDivisor)) / passes
						: 0,
			}
		);
		if (aborted()) {
			// Between passes: nothing partial to declare.
			if (completedPasses > 0) {
				cutShort = true;
				break;
			}
			return {
				...base(),
				failure: 'aborted',
				message: 'Capture cancelled.',
			};
		}
		if (!seek.landed) {
			return {
				...base(),
				failure: 'seek-failed',
				message: `The replay did not reach frame ${sink.startFrame} in time. It may still be loading.`,
			};
		}

		// Re-anchor the frame->session-time map on a reading taken AFTER the seek, so
		// the sink's window bounds and the live sample stream share one origin. This is
		// also why the sink stores a window LENGTH rather than an absolute start time —
		// the origin does not exist until here.
		//
		// Re-derived per pass, and it has to be: the origin is established by the seek.
		// The same replay frame yields the same ReplaySessionTime every pass, so sample
		// times stay comparable ACROSS passes — which is what lets the merged sample log
		// mean anything.
		const settled = deps.replay.state() ?? live;
		const startFrameTime = frameToSessionTime(sink.startFrame, settled);
		const frameTimeOf = (frame: number) =>
			startFrameTime + (frame - sink.startFrame) / REPLAY_FRAMES_PER_SECOND;

		// --- 3. Open the GPU session (gate closed) -----------------------------
		// ONCE, on the first pass — the accumulator has to outlive every pass.
		// The interpolation factor is a REQUEST. The native side sets it up from the
		// first real frame and reports back what it could actually negotiate; hardware
		// that cannot do it captures exactly as it would have.
		// Highlight recovery, unlike interpolation, is not a request — it is a shader
		// constant that behaves identically on every GPU, so what is asked for is always
		// what happens.
		if (session === null) {
			session = native.longExposureBegin(
				hwnd,
				// The EFFECTIVE factor, which a bracket forces to 1 — see the note on
				// the downgrade in `executeRecipe`. `recipe.interpolationFactor` stays
				// what was ASKED for and is what the sidecar reports.
				interpolationFactor,
				recipe.highlightRecovery,
				// One accumulator per stop. An addon build predating bracketing
				// ignores this and creates the single primary sink, which is why the
				// outcome below falls back to one image rather than failing.
				sinks.map((entry) => entry.id)
			);
			claimSession(session);
		}

		// Declared on EVERY pass including the first, so every sample carries a correct
		// pass index whether or not multi-pass was used. On passes after the first this
		// is also what discards the retained frame: without it the pass's first
		// in-betweens warp from the END of the window to its start.
		native.longExposureBeginPass?.(session, pass);

		// --- 4. Roll, and accumulate until the anchor --------------------------
		// Snapshotted so an abort can say whether this pass actually contributed,
		// rather than assuming the worst about a cancel that landed on its first tick.
		const acceptedBefore = native.longExposureStats(session).accepted;
		const failed = await accumulateWindow({
			deps,
			plan,
			sink,
			sinks,
			native,
			session,
			pass,
			passes,
			startFrameNum: settled.replayFrameNum,
			frameTimeOf,
			base,
		});

		// --- 5. Halt playback ------------------------------------------------
		deps.replay.pause();
		if (failed) {
			// Only an ABORT can be salvaged. A seek failure or a stalled transport
			// means something is wrong with the replay, and resolving on top of that
			// would hand back an image nobody asked for.
			if (failed.failure === 'aborted' && completedPasses > 0) {
				cutShort = true;
				partialPass =
					native.longExposureStats(session).accepted > acceptedBefore;
				break;
			}
			return failed;
		}
		completedPasses += 1;
	}

	// Unreachable with passes >= 1, but the resolve below needs a definite session and
	// this is cheaper than asserting.
	if (session === null) {
		return {
			...base(),
			failure: 'invalid-recipe',
			message: 'A capture must run at least one pass.',
		};
	}

	// A cancelled multi-pass capture is still a whole exposure, but the user has to be
	// told it is not the one they asked for — and told the one thing that cannot be
	// undone, since the partial pass's contribution is already summed into the buffer.
	if (cutShort) {
		passWarnings.push(
			`Cancelled after ${completedPasses} of ${passes} passes. The exposure is complete — every pass covers the whole window — but noisier than ${passes} would have been.` +
				(partialPass
					? ' The cancelled pass had already contributed, so the start of the streak carries slightly more weight than the end.'
					: '')
		);
	}

	// --- 6. Resolve ----------------------------------------------------------
	return await resolveCapture({
		recipe,
		plan,
		sink,
		sinks,
		interpolationFactor,
		interpolationDisabledReason,
		deps,
		native,
		session,
		// The denominator for `achievedRatio` is what actually RAN, not what was
		// asked for. On any complete capture these are the same number; on a
		// cancelled one, dividing by the requested count would manufacture a
		// shortfall warning out of the user's own cancel.
		passes: completedPasses,
		warnings: [...warnings, ...passWarnings],
		base,
		releaseSession,
	});
}

interface AccumulateWindowArgs {
	deps: CaptureSessionDeps;
	plan: ResolvedPlan;
	// The PRIMARY sink — the stop the user chose. Drives the gate, the sample log
	// and termination. Always `sinks[0]`.
	sink: AccumulatorSink;
	// Every sink this capture feeds: just the primary, or the whole bracket ladder.
	sinks: AccumulatorSink[];
	native: NativeSessionApi;
	session: number;
	// Zero-based index of this visit, and the total, for progress reporting only.
	pass: number;
	passes: number;
	// The replay frame the pre-roll seek actually landed on.
	startFrameNum: number;
	frameTimeOf(frame: number): number;
	base(): LongExposureOutcome;
}

// Roll the replay through the exposure window once, pushing weights as it goes.
//
// Returns null when the window was traversed to the anchor, or the failure outcome
// to hand straight back.
//
// A FUNCTION RATHER THAN AN INNER BLOCK, deliberately: every variable below is
// per-pass, and making them locals of a per-pass call means leaking one across a
// boundary is unrepresentable rather than merely untested. `rolling`, `lastFrameNum`
// and `reachedAnchor` would misreport a stalled later pass; `frameChangedAt` and
// `lastTickAt` are the quiet pair — carried over they would span the whole seek and
// settle, saturating the sub-frame estimate and inflating the pass's first
// `tickSeconds`. The pre-roll lead plus the frame-indexed net in `sinksOpenAt`
// (`replayFrameNum >= sink.startFrame`) bound what that could actually cost to a
// seek that lands inside the window, so it is a hazard rather than a demonstrated
// defect — but it is a hazard with no upside, and this removes it by construction.
async function accumulateWindow(
	args: AccumulateWindowArgs
): Promise<LongExposureOutcome | null> {
	const {
		deps,
		plan,
		sink,
		sinks,
		native,
		session,
		pass,
		passes,
		startFrameNum,
		frameTimeOf,
		base,
	} = args;
	const aborted = () => deps.signal?.aborted === true;

	deps.replay.setCaptureSpeed(plan.playbackDivisor);

	const timeoutMs = Math.max(
		CAPTURE_TIMEOUT_FLOOR_MS,
		plan.predictedWallClockSeconds * 1000 * CAPTURE_TIMEOUT_MULTIPLIER
	);
	const started = deps.now();
	let rolling = false;
	let lastFrameNum = startFrameNum;
	let reachedAnchor = false;
	// When the replay frame number last CHANGED, in wall-clock ms. Interpolates
	// position WITHIN a replay frame — ReplaySessionTime is frame-quantised, so
	// without this every sample sharing a frame gets an identical weight and
	// tapered curves band visibly (see subFramePosition).
	//
	// Since sub-frame windows landed this also decides where a window shorter than
	// one replay frame OPENS, which is a real widening of the wall-clock exception
	// (design note §4 and §10 Q1). What keeps it bounded: `sink.startFrame` is still
	// integral and still gates the router, so the worst a bad estimate can do is
	// move the start within one replay frame — against a status quo that was wrong
	// by 16x on 1/1000.
	let frameChangedAt = deps.now();
	// Wall clock at the previous control tick. The weight we push governs every
	// frame iRacing presents until the NEXT push, so one tick covers a span of SIM
	// time: 16 ms of wall clock is 16/P ms of it. That span is ~1 ms at P=16 — a
	// quarter of a 1/250 exposure — which is why the tick that straddles the window
	// start is weighted by how much of it fell inside rather than being all-or-
	// nothing. Measured rather than assumed, because the loop's real cadence is the
	// delay plus whatever the tick cost.
	let lastTickAt: number | null = null;

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
			const now = deps.now();
			const frameNum = state.replayFrameNum;
			if (frameNum !== lastFrameNum) {
				frameChangedAt = now;
			}

			const tickSeconds =
				(lastTickAt === null
					? SAMPLE_PUSH_INTERVAL_MS
					: Math.max(0, now - lastTickAt)) /
				1000 /
				plan.playbackDivisor;
			lastTickAt = now;

			// Interpolate within the replay frame. ReplaySessionTime only ticks at
			// 60 Hz, so at 1/16 playback ~10 consecutive samples would otherwise
			// share one position — and one weight — producing a visibly banded taper,
			// and a sub-frame window could not be expressed at all.
			const subFrame = subFramePosition({
				elapsedSinceFrameChangeMs: now - frameChangedAt,
				playbackDivisor: plan.playbackDivisor,
			});
			const sessionTime =
				frameTimeOf(frameNum) + subFrame / REPLAY_FRAMES_PER_SECOND;

			// ONE window test, not two. The router owns the window: an open sink IS
			// the gate condition, so the gate and the weight can never disagree about
			// where the exposure starts. (They used to be separate comparisons, which
			// is exactly the kind of duplication that survives a change to one of
			// them.) The gate opens the moment we cross into the window and NOT
			// before, so pre-roll frames can never join the exposure.
			const contributions = routeFrame({
				sinks,
				replayFrameNum: frameNum,
				sessionTime,
				frameTimeOf,
				tickSeconds,
			});
			// The PRIMARY's contribution drives the gate and the sample log. Every
			// stop shares the same terminal frame and the primary reaches furthest
			// back, so it is open whenever any of them is — the gate is the same
			// condition it always was.
			const contribution = contributions.find(
				(entry) => entry.sinkId === sink.id
			);
			native.longExposureSetGate(session, contributions.length > 0);

			if (contributions.length > 0) {
				// NEGATIVE means "this stop's window is not open on this tick" and is
				// skipped natively. Zero cannot mean that: linear weighting is
				// legitimately 0 at the start of its own window, and those frames have
				// always been accumulated and counted.
				const weights = sinks.map((entry) => {
					const match = contributions.find(
						(item) => item.sinkId === entry.id
					);
					return match ? match.weight : -1;
				});
				// The interpolated time goes into the sample log too, so the evenness
				// report measures actual sample spacing rather than the frame-quantised
				// staircase (which reported a flat 1/60 s).
				native.longExposureSetSample(
					session,
					contribution?.weight ?? weights[0],
					contribution?.u ?? 0,
					frameNum,
					sessionTime,
					weights
				);
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
			pass,
			passes,
			// Within this pass. `accepted` is cumulative across passes, deliberately:
			// it is the count the shot is judged on.
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

	if (!reachedAnchor) {
		return {
			...base(),
			failure: 'playback-stalled',
			message: 'The exposure ended before reaching the selected moment.',
		};
	}
	return null;
}

interface ResolveCaptureArgs {
	recipe: LongExposureRecipe;
	plan: ResolvedPlan;
	// The primary sink and the full set, so each resolved accumulator can be
	// labelled with the stop it actually is.
	sink: AccumulatorSink;
	sinks: AccumulatorSink[];
	// The factor the session actually ran with, and why it differs from the recipe's
	// when it does. See `RunCaptureArgs`.
	interpolationFactor: number;
	interpolationDisabledReason: string | null;
	deps: CaptureSessionDeps;
	native: NativeSessionApi;
	session: number;
	passes: number;
	warnings: string[];
	base(): LongExposureOutcome;
	releaseSession(): void;
}

// Read the accumulator back and build the outcome. Split out only so `runCapture`
// reads as the state machine it is; the body is unchanged from when it was inline.
async function resolveCapture(
	args: ResolveCaptureArgs
): Promise<LongExposureOutcome> {
	const {
		recipe,
		plan,
		sink,
		sinks,
		interpolationFactor,
		interpolationDisabledReason,
		deps,
		native,
		session,
		passes,
		warnings,
		base,
		releaseSession,
	} = args;

	deps.onProgress?.({ phase: 'resolving' });
	const preResolve = native.longExposureStats(session);
	if (preResolve.accepted === 0) {
		// EVERYTHING the native side knows, logged BEFORE the abort below destroys the
		// session. This branch used to be a dead end in support: the addon records a
		// concrete cause in `last_error` ("capture failed: ItemConvertFailed",
		// "capture target closed during exposure"), returns it on every stats call, and
		// we dropped it on the floor — leaving a bug report with one generic sentence
		// and a log that said only that the shot produced no image.
		log.warn('Long exposure accumulated no samples', {
			sawFrame: preResolve.sawFrame,
			nativeError: preResolve.error,
			accepted: preResolve.accepted,
			rejected: preResolve.rejected,
			synthesized: preResolve.synthesized ?? null,
			frame: {
				width: preResolve.frameWidth,
				height: preResolve.frameHeight,
			},
			render: { width: plan.renderWidth, height: plan.renderHeight },
			passes,
			subFrameWindow: plan.isSubFrameWindow,
		});
		releaseSession();
		native.longExposureAbort(session, RESOLVE_TIMEOUT_MS);
		// A sub-replay-frame window can legitimately catch no presents at all:
		// 1/1000 at 1/16 playback is ~16 ms of wall clock, about one rendered
		// frame, so landing between two of them is a coin toss rather than a
		// malfunction. Blaming iRacing for that would send the user hunting a
		// fault that isn't there.
		const reason = !preResolve.sawFrame
			? 'iRacing did not present any frames to capture.'
			: plan.isSubFrameWindow
				? `This shutter is shorter than one replay frame, and iRacing did not render a frame inside it. Try a slower playback speed, or the next slower shutter.`
				: 'No frames were accumulated. iRacing may have stopped rendering during the exposure.';
		// Append the native cause when there is one. It is a short, concrete string
		// aimed at us rather than at the user, but a user who can paste it into a bug
		// report turns an unfalsifiable "it doesn't work" into a named failure — which
		// is worth more than the tidier sentence. Suppressed for the sub-frame case,
		// where the native text ("no frames were accumulated during the exposure")
		// merely restates the sentence above and would make a non-fault look like one.
		const nativeError = plan.isSubFrameWindow ? null : preResolve.error;
		return {
			...base(),
			failure: 'no-samples',
			message: nativeError ? `${reason} (${nativeError})` : reason,
		};
	}

	// The delivered frame size is WGC's to report, not ours to assume — DPI and
	// client-area geometry mean it can differ from what we asked the window to be.
	const renderWidth = preResolve.frameWidth || plan.renderWidth;
	const renderHeight = preResolve.frameHeight || plan.renderHeight;
	// Since supersample was removed the saved image IS the rendered frame, whatever
	// WGC delivered. The native resolve keeps its supersample parameter and is handed
	// 1, which makes its box-downsample a single tap — exactly identity.
	const outWidth = Math.max(1, renderWidth);
	const outHeight = Math.max(1, renderHeight);

	const result = native.longExposureFinish(
		session,
		outWidth,
		outHeight,
		1,
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
		// Absent on an addon build predating multi-pass, which reads as pass 0 —
		// exactly what a single-pass capture is.
		pass: sample.pass ?? 0,
	}));
	// The native log is capped (MAX_SAMPLE_LOG, 65536); the accepted counter is not.
	// The cap is now above anything the UI can ask for — the worst expressible recipe
	// is 10" at 1/16 and 360 fps, or 57,600 samples — but the counter is still what
	// `accepted` is taken from, because it is the only number that stays exact if that
	// ever stops being true. At the old 8192 it already was not: a 10" at 1/16 and a
	// routine 73 fps produces ~11,700 samples and reported an achieved window a second
	// and a half short of the truth.
	const stats = summarizeSamples(samples, { acceptedTotal: result.accepted });

	const interpolation = buildInterpolationReport({
		// What was ASKED for, always — a bracket that dropped interpolation must still
		// record that it was requested, or the sidecar reads as though the user never
		// turned it on.
		requestedFactor: recipe.interpolationFactor,
		status: result.interpolation,
		disabledReason: interpolationDisabledReason,
		realSamples: result.accepted,
		syntheticSamples: result.synthesized ?? 0,
		meanFrameMs: result.meanFrameMs ?? null,
		maxFrameMs: result.maxFrameMs ?? null,
		setupFrameMs: result.setupFrameMs ?? null,
		// The delivered size, not the requested one — DPI and client-area geometry
		// mean WGC decides this.
		renderWidth,
		renderHeight,
		predictedSamples: plan.predictedSamples,
		passes,
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
	//
	// Keyed on the EFFECTIVE factor, so a bracket that dropped interpolation by our
	// own decision does not get blamed on the machine. `validatePlan` already told
	// the user why, before the shot, and its message is the accurate one.
	if (interpolationFactor > 1 && !interpolation.enabled) {
		interpolationWarnings.push(
			`Frame interpolation was requested but is not available on this machine, so the shot was taken without it${
				interpolation.reason ? ` (${interpolation.reason})` : ''
			}.`
		);
	}
	// Got it, but it cost more than it gave. This is the failure that otherwise looks
	// like "the blur just isn't very strong" rather than like a problem.
	const shortfall = diagnoseInterpolationShortfall(interpolation);
	if (shortfall) {
		interpolationWarnings.push(shortfall);
	}

	// Every resolved stop, in sink order. An addon build predating bracketing
	// reports no `images`, so this degrades to the single master it did return —
	// which is exactly the shot the user would have got before, not a failure.
	const bySinkId = new Map(sinks.map((entry) => [entry.id, entry]));
	const resolvedImages: LongExposureSinkImage[] = (result.images ?? [])
		.filter((entry) => entry.data)
		.map((entry) => {
			const planned = bySinkId.get(entry.sinkId);
			return {
				sinkId: entry.sinkId,
				label: planned?.label ?? entry.sinkId,
				exposureSeconds:
					planned?.exposureSeconds ?? plan.effectiveExposureSeconds,
				data: entry.data as Buffer,
				width: entry.width,
				height: entry.height,
				// An addon build predating the per-sink tally reports nothing, and the
				// session count is the honest fallback: for a single-sink shot the two
				// ARE the same number.
				accepted: entry.accepted ?? stats.accepted,
			};
		});
	if (resolvedImages.length === 0) {
		resolvedImages.push({
			sinkId: sink.id,
			label: sink.label,
			exposureSeconds: sink.exposureSeconds,
			data: result.data,
			width: result.width,
			height: result.height,
			accepted: stats.accepted,
		});
	}
	if (sinks.length > 1 && resolvedImages.length < sinks.length) {
		warnings.push(
			`Bracketing asked for ${sinks.length} stops but ${resolvedImages.length} came back — ` +
				'the rest failed to resolve, or this build of the capture addon predates bracketing.'
		);
	}

	return {
		...base(),
		ok: true,
		image: { data: result.data, width: result.width, height: result.height },
		images: resolvedImages,
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
