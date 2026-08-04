// The shot recipe (design note §6).
//
// A long-exposure capture is NOT an imperative action — it is a serialisable
// parameter set that can be executed repeatedly and unattended. `executeRecipe` is
// the only entry point into the capture path; the UI's entire job is to build one
// of these.
//
// Two things fall out of that, both of which are the point:
//
//   Re-shoot     the anchor lives IN the recipe, so re-shooting after the user has
//                scrubbed elsewhere is structurally impossible to get wrong — we
//                never re-read the live cursor.
//   Spotter Pack (v2) is a loop that mutates `variantId` and re-executes an
//                otherwise-identical recipe. The capture path does not need to know
//                a batch is happening. `variantId` is threaded end-to-end in v1 and
//                is simply always null.
//
// Pure — no Node, Electron, GPU or SDK deps.

import {
	findShutterStop,
	isSubFrameExposure,
	isWeightingCurve,
	MAX_EXPOSURE_MS,
	nearestPlaybackDivisor,
	predictSampleCount,
	predictWallClockSeconds,
	resolveExposureSeconds,
	solvePlaybackDivisor,
	scaleRenderFpsForResize,
	windowFramesForExposure,
	type PlaybackDivisor,
	type WeightingCurve,
} from './exposure-math';
import { plannedSinkCount } from './accumulator-sinks';
import { resolveCropTarget } from '../screenshot-output';

export const TONEMAPPERS = ['none', 'reinhard', 'aces'] as const;
export type Tonemapper = (typeof TONEMAPPERS)[number];

// SUPERSAMPLE IS GONE (2026-08-03). It rendered at 2x the target on each axis and
// box-downsampled in linear space at resolve, so it bought antialiasing — but it
// bought it at 4x the accumulator memory, 4x the per-sample bandwidth, and roughly
// HALF the sample count, and fewer samples on a moving subject means larger
// per-sample displacement: a ladder of discrete ghosts, which is a structured
// artefact the eye reads as a defect. The aliasing it removed is unstructured and
// the motion blur already hides most of it, so on the moving subjects this feature
// exists for it was a losing trade — the interpolation note §9.9 had already made
// "turn supersampling off" its leading recommendation.
//
// What replaced it is simply picking a higher Resolution, which became possible to
// do honestly once main could read that setting (see utilities/capture-resolution).
// The difference that remains: 4k+2x produced an ANTIALIASED 4k, while 8k produces
// a raw 8k. Downsample externally if that is what you were after.
//
// The native resolve still accepts a supersample factor and is passed 1, which is
// exactly identity. Ripping it out of the shader would mean a rebuild and
// re-verification of the most safety-critical pass in the feature, for no
// user-visible gain.

// Optical-flow frame interpolation. 1 is off; 2/4/8 synthesise that many samples per
// captured frame (factor-1 of them invented), to close the gap between consecutive
// real samples and turn a ladder of discrete ghosts into a continuous streak.
//
// This is an OPTIONAL ACCELERATOR. It needs NVIDIA Turing-or-newer hardware and
// fails soft to 1 everywhere else, so it is a preference rather than a requirement —
// a recipe carrying factor 4 still executes correctly on an AMD card, just without
// the in-betweens. Nothing about the base feature is gated on it.
export const INTERPOLATION_FACTORS = [1, 2, 4, 8] as const;
export type InterpolationFactor = (typeof INTERPOLATION_FACTORS)[number];

// Highlight recovery is expressed in STOPS, like exposure compensation, so it reads
// as a photographic control rather than an arbitrary multiplier. 0 is off; 8 stops is
// a 256x gain at full clip, past anything useful.
export const MAX_HIGHLIGHT_RECOVERY_STOPS = 8;

// Ceiling on multi-pass captures. Wall clock is passes x window x divisor, so this
// is a patience bound rather than a technical one: 16 passes of a sub-frame window
// at 1/16 is a few seconds, while 16 passes of a 10" exposure is over 40 minutes.
// The planner's duration warning is what stops the second case being a surprise;
// this only stops a malformed recipe asking for thousands.
export const MAX_PASSES = 16;

// Mirrors MAX_SAMPLE_LOG in native/wgc-capture/src/longexp/mod.rs. The native cap was
// sized so no single-pass recipe could reach it (the worst expressible one is 10" x
// 1/16 x 360 fps = 57,600), but passes multiply the sample stream, so a slow shutter
// at several passes CAN now outrun it. Accumulation is never affected — the shot is
// the GPU accumulator and the accepted count comes from an uncapped counter — but
// every metric derived from the log then describes a prefix.
export const NATIVE_SAMPLE_LOG_CAP = 65536;

// png16 is the 16-bit master. png/jpeg/webp mirror the existing still-capture
// formats for users who only want the 8-bit result.
export const LONG_EXPOSURE_FORMATS = ['png16', 'png', 'jpeg', 'webp'] as const;
export type LongExposureFormat = (typeof LONG_EXPOSURE_FORMATS)[number];

// The long-exposure format for the user's configured STILL-capture format.
//
// A long exposure saves where and how a screenshot saves, so it follows the one
// format setting rather than carrying a second one of its own. The catch is that
// Settings offers jpeg/png/webp and has no 16-bit option — adding one there would
// put a long-exposure-only choice in the still-capture settings.
//
// So PNG is read as "give me the lossless one" and maps to the 16-bit master,
// which is the only format where accumulating in fp32 reaches disk at all. jpeg and
// webp map to themselves and write a single 8-bit file. An unrecognised value falls
// to jpeg, matching the still path's own default.
export function longExposureFormatForStillFormat(
	stillFormat: unknown
): LongExposureFormat {
	switch (stillFormat) {
		case 'png':
			return 'png16';
		case 'webp':
			return 'webp';
		case 'jpeg':
		default:
			return 'jpeg';
	}
}

export interface LongExposureRecipe {
	// The moment the user framed. The LAST sample of the exposure, the state we owe
	// them back, and the source of truth for every re-shoot. Never re-read from the
	// live cursor once set.
	anchorFrame: number;
	// Replay session the anchor belongs to — a recipe executed against a different
	// session is meaningless, so it is recorded and checked.
	sessionNum: number;

	// Shutter ladder key ('1/8'), or null when exposureMs was set directly.
	shutter: string | null;
	// Authoritative exposure. Always populated; derived from `shutter` when set.
	exposureMs: number;

	// Explicit slow-motion divisor, or null to derive one from targetSamples.
	playbackSpeed: PlaybackDivisor | null;
	// Desired sample count, or null when playbackSpeed is explicit.
	targetSamples: number | null;

	// The capture size, from the Resolution setting. iRacing's window is resized to
	// exactly this, and the frame is accumulated at exactly this. The SAVED size is
	// this minus the watermark margin when `crop` is on — see resolveCropTarget.
	width: number;
	height: number;

	// Emit one image per shutter stop at or faster than `shutter`, from the same
	// captured frames (`docs/design/long-exposure-bracketing.md`).
	//
	// Nearly free in TIME — with a trailing window every stop ends on the same
	// anchor and a faster shutter is the tail subset of samples already flowing —
	// and NOT free in memory: each stop owns a full-size accumulator, so an 11-stop
	// bracket is 11x the accumulator VRAM. The pre-flight counts them.
	//
	// Ignored for a free-form exposure that is not on the ladder: there is no
	// "at or faster" set to build from a key that does not exist.
	bracket: boolean;

	// Crop Watermark, the same setting the still path obeys and with the same
	// geometry (utilities/screenshot-output resolveCropTarget / resolveCropRect).
	// Applied to the resolved image on the way to disk, so the master, the preview
	// and the gallery thumbnail are all the cropped frame and cannot disagree.
	//
	// Recorded in the recipe rather than read from config at write time so the
	// sidecar says what was actually done and a re-shoot reproduces it. A fresh
	// shot inherits the live setting the same way outputFormat does — one place to
	// set it, in Settings, for both kinds of capture.
	crop: boolean;
	// Legacy corner-only mode. Meaningless unless `crop` is on.
	cropTopLeft: boolean;

	// Requested optical-flow interpolation factor. A REQUEST, not a guarantee: the
	// achieved factor is reported back from the capture and written to the sidecar.
	interpolationFactor: InterpolationFactor;

	// Highlight recovery, in stops of gain applied to near-clipped values BEFORE
	// accumulation. 0 = off, and off is bit-for-bit identity.
	//
	// iRacing hands us display-referred SDR that has already been tonemapped, so a
	// headlight and a white wall both arrive clamped at 1.0. Averaging that and
	// tonemapping again is the wrong order — by Jensen's inequality it is provably
	// too dark, and the error scales with how much the pixel varied — which is why a
	// bright light sweeping through 1% of the exposure reads as a grey smudge rather
	// than a bright trail. This puts the nonlinearity back where a sensor has it.
	//
	// Unlike interpolation this needs no particular hardware: it is a shader constant
	// and behaves identically on every GPU.
	highlightRecovery: number;

	// How many times to visit the exposure window, accumulating into one buffer
	// (`docs/design/long-exposure-multi-pass.md`). 1 is an ordinary capture.
	//
	// Each pass drops a different share of iRacing's presented frames, so N passes
	// yield roughly N times the REAL samples — the only lever left on sample density
	// for short windows, since the playback divisor caps at 16. Costs N times the
	// wall clock, which is why it pays for sub-frame windows and is unaffordable for
	// long ones. Exposure is unaffected: resolve normalises per pixel by accumulated
	// weight, so more passes means a less noisy image, never a brighter one.
	passes: number;

	weighting: WeightingCurve;
	tonemap: Tonemapper;
	// Exposure compensation in stops (EV), applied in linear space before tonemap.
	exposureCompensation: number;

	outputFormat: LongExposureFormat;
	outputDir: string;

	// Spotter Pack seam. Unused in v1 (always null); flows into output naming and
	// the metadata sidecar so adding batch capture changes no other file.
	variantId: string | null;
}

export const DEFAULT_SHUTTER = '1/8';

// Above this predicted wall-clock duration the UI tells the user how long they are
// about to wait. Slow-motion playback trades patience for sample count, so the cost
// of a big exposure is time — and it should never be a surprise.
export const LONG_CAPTURE_WARN_SECONDS = 10;

// Above this, the same warning escalates: it says how to make it shorter, and warns
// that the replay is driven for the whole duration.
//
// 16 s is not arbitrary — it was the ceiling of the entire feature until the 2"/5"/
// 10" stops landed (1" at 1/16 playback). Anything past it is a capture longer than
// anything that used to be expressible, and 10" at 1/16 is 160 s: long enough that a
// user who did not read the number will assume the app has hung.
export const LONG_CAPTURE_ESCALATE_SECONDS = 16;

// Wall-clock durations in the form a waiting user thinks in. Seconds alone stops
// being readable somewhere around two minutes ("about 160 seconds" is a number you
// have to convert yourself).
function describeDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return '0 seconds';
	}
	if (seconds < 90) {
		return `${Math.round(seconds)} seconds`;
	}
	const minutes = Math.floor(seconds / 60);
	const rest = Math.round(seconds - minutes * 60);
	return rest === 0 ? `${minutes} minutes` : `${minutes} min ${rest} s`;
}

// A recipe with everything except the anchor, session and output directory, which
// only the caller can supply.
export function createDefaultRecipe(opts: {
	anchorFrame: number;
	sessionNum: number;
	width: number;
	height: number;
	outputDir: string;
}): LongExposureRecipe {
	const stop = findShutterStop(DEFAULT_SHUTTER);
	return {
		anchorFrame: opts.anchorFrame,
		sessionNum: opts.sessionNum,
		shutter: DEFAULT_SHUTTER,
		exposureMs: (stop ? stop.seconds : 0.125) * 1000,
		playbackSpeed: null,
		targetSamples: 240,
		width: opts.width,
		height: opts.height,
		// Off by default: a bracket is a deliberate choice with a real VRAM cost, and
		// a sidecar written before it existed has no such field.
		bracket: false,
		// Off by default, for the same reproducibility reason as highlightRecovery and
		// passes below: a sidecar written before crop existed has no such field, and
		// must not silently reproduce at a different size. Fresh shots get the live
		// setting from longExposureDefaults(), which is where Settings is read.
		crop: false,
		cropTopLeft: false,
		// Off by default. It is hardware-specific, it costs per-frame time that could
		// otherwise buy real samples, and the base feature must stand on its own.
		interpolationFactor: 1,
		// Also off by default, for a different reason: a sidecar written before this
		// existed has no such field, so a non-zero default would silently make old
		// recipes reproduce differently. Reproducibility outranks a better first look.
		highlightRecovery: 0,
		// One pass, for the same reproducibility reason as highlightRecovery: a sidecar
		// written before multi-pass existed has no such field, and must not silently
		// reproduce as something else.
		passes: 1,
		weighting: 'box',
		tonemap: 'none',
		exposureCompensation: 0,
		outputFormat: 'png16',
		outputDir: opts.outputDir,
		variantId: null,
	};
}

function clampInt(
	value: unknown,
	min: number,
	max: number,
	fallback: number
): number {
	const n = Math.round(Number(value));
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, n));
}

// Coerce an untrusted recipe (from IPC, config, or a sidecar written by another
// build) into a valid one. Never throws — an unusable field falls back to the
// default rather than failing the shot.
export function normalizeRecipe(
	input: Partial<LongExposureRecipe>,
	defaults: LongExposureRecipe
): LongExposureRecipe {
	// `??` would be wrong here: an EXPLICIT null means "no ladder key, drive this
	// from exposureMs", which is how a free-form exposure is expressed. Only an
	// ABSENT key should inherit the default.
	const shutterStop = findShutterStop(
		input.shutter !== undefined ? input.shutter : defaults.shutter
	);
	// A recognised shutter key is authoritative over exposureMs — the ladder is the
	// primary vocabulary and the two must never disagree.
	const exposureMs = shutterStop
		? shutterStop.seconds * 1000
		: clampInt(
				input.exposureMs ?? defaults.exposureMs,
				1,
				MAX_EXPOSURE_MS,
				defaults.exposureMs
			);

	const hasExplicitSpeed =
		input.playbackSpeed !== null && input.playbackSpeed !== undefined;

	const highlightRecovery = Number.isFinite(Number(input.highlightRecovery))
		? Math.min(
				MAX_HIGHLIGHT_RECOVERY_STOPS,
				Math.max(0, Number(input.highlightRecovery))
			)
		: (defaults.highlightRecovery ?? 0);

	// NO COUPLING HERE ANY MORE, and that is the fix rather than an omission.
	//
	// Recovery expands near-clipped values BEFORE integrating and relies on something
	// at resolve putting persistent bright surfaces back. Between 2026-08-03 and the
	// inverse-expansion shader change, that something was ACES, forced on from here
	// whenever recovery was used and no tonemap was named. It worked — a static sky
	// stopped clipping flat white at 0.797 linear — but it bought that by repainting
	// the whole frame's look, and a static pixel still did not land back where it
	// started.
	//
	// `compress_highlights` in shaders.hlsl now inverts the expansion exactly, at
	// resolve, unconditionally, so the pair is closed inside the shader where it
	// belongs and a static pixel round-trips to itself. `tonemap` goes back to being
	// a pure look control that defaults to off.
	//
	// NOTE FOR REPRODUCTION: a sidecar written while the coupling was live records
	// `tonemap: "aces"` explicitly, so re-shooting it still applies ACES — on top of
	// the inverse, which the original shot did not have. It will not be pixel-identical
	// to the file it came from. That is the intended direction: the recorded look was
	// a workaround for a shader bug that no longer exists.
	const tonemap: Tonemapper = (TONEMAPPERS as readonly string[]).includes(
		input.tonemap as string
	)
		? (input.tonemap as Tonemapper)
		: defaults.tonemap;

	return {
		anchorFrame: clampInt(
			input.anchorFrame ?? defaults.anchorFrame,
			0,
			Number.MAX_SAFE_INTEGER,
			defaults.anchorFrame
		),
		sessionNum: clampInt(
			input.sessionNum ?? defaults.sessionNum,
			0,
			Number.MAX_SAFE_INTEGER,
			defaults.sessionNum
		),
		shutter: shutterStop ? shutterStop.key : null,
		exposureMs,
		playbackSpeed: hasExplicitSpeed
			? nearestPlaybackDivisor(input.playbackSpeed)
			: null,
		// Exactly one of playbackSpeed / targetSamples drives the solve. An explicit
		// speed wins and clears the target so the two can never silently conflict.
		targetSamples: hasExplicitSpeed
			? null
			: clampInt(
					input.targetSamples ?? defaults.targetSamples ?? 240,
					1,
					8192,
					defaults.targetSamples ?? 240
				),
		width: clampInt(input.width ?? defaults.width, 16, 10000, defaults.width),
		height: clampInt(
			input.height ?? defaults.height,
			16,
			10000,
			defaults.height
		),
		bracket:
			input.bracket === undefined ? !!defaults.bracket : !!input.bracket,
		// Absent reads as the default, which for a sidecar predating crop support is
		// `false` from createDefaultRecipe and for a fresh shot is the live setting.
		crop: input.crop === undefined ? !!defaults.crop : !!input.crop,
		cropTopLeft:
			input.cropTopLeft === undefined
				? !!defaults.cropTopLeft
				: !!input.cropTopLeft,
		// `input.supersample` is deliberately DROPPED rather than honoured. A v1-v3
		// sidecar carrying 2 rendered at twice this size and saved at half of that,
		// so it cannot be reproduced on this build at all — and quietly obeying it
		// would resize the capture without anything on screen saying why. Re-executing
		// such a recipe now yields `width` x `height` exactly, which is the sidecar's
		// own image dimensions in the 1x case and double them in the 2x case. The
		// version bump is what tells the reader that.
		interpolationFactor: (
			INTERPOLATION_FACTORS as readonly number[]
		).includes(Number(input.interpolationFactor))
			? (Number(input.interpolationFactor) as InterpolationFactor)
			: (defaults.interpolationFactor ?? 1),
		highlightRecovery,
		// Absent reads as 1, which is exactly what every sidecar written before
		// multi-pass existed meant.
		passes: clampInt(
			input.passes ?? defaults.passes ?? 1,
			1,
			MAX_PASSES,
			defaults.passes ?? 1
		),
		weighting: isWeightingCurve(input.weighting)
			? input.weighting
			: defaults.weighting,
		tonemap,
		exposureCompensation: Number.isFinite(Number(input.exposureCompensation))
			? Math.min(6, Math.max(-6, Number(input.exposureCompensation)))
			: defaults.exposureCompensation,
		outputFormat: (LONG_EXPOSURE_FORMATS as readonly string[]).includes(
			input.outputFormat as string
		)
			? (input.outputFormat as LongExposureFormat)
			: defaults.outputFormat,
		outputDir:
			typeof input.outputDir === 'string' && input.outputDir
				? input.outputDir
				: defaults.outputDir,
		variantId:
			typeof input.variantId === 'string' && input.variantId
				? input.variantId
				: null,
	};
}

// Everything the capture path needs, derived from a recipe plus live conditions.
// Deriving this in one pure place means the UI preview and the actual capture can
// never disagree about what a recipe means.
export interface ResolvedPlan {
	// Replay frames the window spans on the tape — the SEEK span, and the bound on
	// the frame-indexed safety net. Not the exposure: a sub-frame shutter spans one
	// frame while exposing for a fraction of it.
	windowFrames: number;
	// What the requested exposure actually resolves to. Whole-frame quantised at or
	// above one replay frame; exact below it, where the window starts partway
	// through frame `startFrame`.
	effectiveExposureSeconds: number;
	// True when the window is shorter than one replay frame, so its start is
	// continuous rather than landing on a frame boundary.
	isSubFrameWindow: boolean;
	// Where the replay must be seeked to.
	startFrame: number;
	anchorFrame: number;
	// Chosen slow-motion divisor (playback = 1/divisor).
	playbackDivisor: PlaybackDivisor;
	// The render rate this plan predicted from, AFTER the resize discount — i.e. the
	// value `predictedSamples` was computed with, not the raw FrameRate reading.
	//
	// Recorded so a prediction can be re-derived for a DIFFERENT exposure against the
	// same capture conditions, which is what a bracket stop's sidecar needs: every
	// stop rode one capture at one render rate and one playback divisor, and differs
	// only in how much of that stream fell inside its window. Without it the only way
	// to give a stop its own predicted count is to invert `predictedSamples`, which
	// is arithmetic on an already-floored number.
	renderFps: number;
	// How many times the window is visited. 1 is an ordinary capture.
	passes: number;
	// Predictions — the achieved count is always measured separately.
	//
	// PER PASS, both of them, and they must stay that way: `predictedSamples` is the
	// affordability gate that decides whether one visit can keep up with the sim, and
	// `predictedWallClockSeconds` sets the capture loop's per-pass timeout. Multiplying
	// either by `passes` would make a multi-pass capture look affordable when a single
	// pass is not, and would hand each pass N times the timeout it should have.
	predictedSamples: number;
	predictedWallClockSeconds: number;
	// The same two multiplied by `passes` — what the USER experiences, and therefore
	// what every duration warning and preview must quote. Equal to the per-pass values
	// on a single-pass capture.
	predictedTotalSamples: number;
	predictedTotalWallClockSeconds: number;
	// Dimensions iRacing's window is resized to, and the size the frame is
	// accumulated at. Identical to the recipe's width/height; kept as distinct fields
	// because everything downstream — the VRAM pre-flight, the interpolation load,
	// the resolve — is about what is RENDERED, and conflating the two is how a 2x
	// supersample used to hide a 4x cost behind a 1x-looking number.
	renderWidth: number;
	renderHeight: number;
	// Dimensions of the SAVED file: the render size minus the watermark margin when
	// Crop Watermark is on, otherwise identical to it. The render/output split is
	// back for a different reason than supersampling had — cropping trims the
	// captured frame INWARD, so iRacing still renders (and still pays VRAM for) the
	// full render size, and only the file is smaller.
	outputWidth: number;
	outputHeight: number;
	// True when the exposure is predicted to collect ONE sample — no blur, and the
	// capture degenerates to the existing still path.
	//
	// Keyed on predicted samples, not on window frames: since sub-frame windows
	// landed, a 1/125 shot spans one replay frame but collects ~5-9 samples WITH
	// blur, so "shorter than one replay frame" stopped meaning "no motion blur".
	// A 1/1000 that really does resolve to one sample is the correct result for a
	// 1/1000 shutter, not a failure — but the user should still be told.
	isSingleSample: boolean;
}

export function resolvePlan(
	recipe: LongExposureRecipe,
	conditions: {
		renderFps?: number;
		// Pixel count of iRacing's CURRENT window. FrameRate is measured there, but
		// the capture runs at the render size — so without this the sample-count
		// prediction is optimistic by roughly the resize factor.
		currentWindowPixels?: number | null;
	} = {}
): ResolvedPlan {
	const effectiveExposureSeconds = resolveExposureSeconds(
		recipe.exposureMs / 1000
	);
	const windowFrames = windowFramesForExposure(effectiveExposureSeconds);
	const renderWidth = recipe.width;
	const renderHeight = recipe.height;
	const renderFps = scaleRenderFpsForResize({
		reportedFps: conditions.renderFps,
		currentPixels: conditions.currentWindowPixels,
		renderPixels: renderWidth * renderHeight,
	});

	const playbackDivisor =
		recipe.playbackSpeed ??
		solvePlaybackDivisor({
			exposureSeconds: effectiveExposureSeconds,
			renderFps,
			targetSamples: recipe.targetSamples ?? 1,
		});

	const predictedSamples = predictSampleCount({
		exposureSeconds: effectiveExposureSeconds,
		renderFps,
		playbackDivisor,
	});

	const passes = Math.max(1, Math.round(recipe.passes ?? 1));
	const predictedWallClockSeconds = predictWallClockSeconds({
		exposureSeconds: effectiveExposureSeconds,
		playbackDivisor,
	});

	return {
		windowFrames,
		effectiveExposureSeconds,
		isSubFrameWindow: isSubFrameExposure(effectiveExposureSeconds),
		startFrame: recipe.anchorFrame - windowFrames,
		anchorFrame: recipe.anchorFrame,
		playbackDivisor,
		renderFps,
		passes,
		predictedSamples,
		predictedWallClockSeconds,
		predictedTotalSamples: predictedSamples * passes,
		// Excludes the per-pass seek and settle, which the single-pass estimate has
		// always excluded too. It understates by roughly SEEK_SETTLE_MS per extra pass
		// — sub-second against a warning threshold measured in seconds.
		predictedTotalWallClockSeconds: predictedWallClockSeconds * passes,
		renderWidth,
		renderHeight,
		// The SAME helper the still path's sidebar hint and its capture call use, so
		// a still and a long exposure of one Resolution cannot come out different
		// sizes — the reason the geometry lives in screenshot-output at all.
		...(() => {
			const output = resolveCropTarget({
				width: renderWidth,
				height: renderHeight,
				crop: recipe.crop,
				cropTopLeft: recipe.cropTopLeft,
			});
			return { outputWidth: output.width, outputHeight: output.height };
		})(),
		isSingleSample: predictedSamples <= 1,
	};
}

export interface RecipeValidation {
	// Hard failures — the capture must not start.
	errors: string[];
	// Proceed, but tell the user.
	warnings: string[];
}

// How much interpolation work a configuration asks for: render megapixels times the
// factor. One scalar, and the only one that has to be comparable across shots.
export function interpolationLoad(opts: {
	renderWidth: number;
	renderHeight: number;
	interpolationFactor: number;
}): number {
	const megapixels = (opts.renderWidth * opts.renderHeight) / 1e6;
	return Number(
		(megapixels * Math.max(1, opts.interpolationFactor)).toFixed(3)
	);
}

// Validate a plan against live replay bounds. Split from resolvePlan so the UI can
// show live feasibility without attempting a capture.
export function validatePlan(opts: {
	plan: ResolvedPlan;
	recipe: LongExposureRecipe;
	// Live replay bounds from telemetry.
	replayFrameNumEnd: number | null;
	currentSessionNum: number | null;
	// The smallest interpolation load THIS MACHINE has been observed to choke on,
	// learned from previous captures. Null until there is evidence.
	//
	// Deliberately measured rather than hard-coded: the point at which interpolation
	// stops being free depends entirely on the GPU, and a threshold calibrated on one
	// card would be wrong everywhere else. Silent until this machine has actually
	// demonstrated a limit.
	lossyInterpolationLoad?: number | null;
}): RecipeValidation {
	const { plan, recipe, replayFrameNumEnd, currentSessionNum } = opts;
	const errors: string[] = [];
	const warnings: string[] = [];
	// Whether this recipe actually resolves to more than one accumulator. Asked once,
	// through the same helper the capture plans from, because two of the warnings
	// below turn on it and a warning that disagrees with what the capture does is
	// worse than no warning.
	const bracketed =
		plannedSinkCount({
			bracket: recipe.bracket,
			shutterKey: recipe.shutter,
		}) > 1;

	if (plan.startFrame < 0) {
		// A trailing window means an anchor near the END of the replay is always
		// safe — we never need frames after it. Only an anchor closer than the
		// window length to the START is constrained.
		errors.push(
			`The exposure needs ${plan.windowFrames} replay frames before the selected moment, but it is only ${recipe.anchorFrame} frames into the replay. Pick a later moment or a faster shutter.`
		);
	}

	if (
		typeof replayFrameNumEnd === 'number' &&
		replayFrameNumEnd > 0 &&
		recipe.anchorFrame > replayFrameNumEnd
	) {
		errors.push('The selected moment is past the end of the replay.');
	}

	if (
		typeof currentSessionNum === 'number' &&
		currentSessionNum !== recipe.sessionNum
	) {
		errors.push(
			'The replay has moved to a different session since this shot was set up. Re-select the moment.'
		);
	}

	if (plan.isSingleSample) {
		warnings.push(
			plan.passes > 1
				? `This shutter is short enough that only about one frame lands inside it per pass, so ${plan.passes} passes collect roughly ${plan.passes} samples. A slower playback speed or a slower shutter buys far more.`
				: 'This shutter is short enough that only one frame will land inside it, so the result has no motion blur. A slower playback speed or a slower shutter buys samples.'
		);
	}

	// BRACKETING AND INTERPOLATION CANNOT BOTH RUN. This is a correctness limit, not
	// a preference: the native session keeps ONE retained-frame ping-pong and
	// advances it inside `accumulate_sample`, which the frame handler calls once per
	// OPEN SINK. On the second and later stops of a captured frame both slots already
	// hold that same frame, so the flow estimate runs between identical inputs and
	// the warp deposits `factor - 1` zero-motion COPIES of the real frame instead of
	// in-betweens. Every stop but the primary comes out quietly wrong, in the way
	// that reads as merely under-blurred rather than as broken.
	//
	// Interpolation is what gives way, because it is the optional accelerator while
	// bracketing is what the user asked for by name. `executeRecipe` applies that
	// downgrade; this says so before the shot rather than after.
	//
	// The proper fix is the N-UAV warp kernel in
	// docs/design/long-exposure-bracketing.md §3.1, which warps once and does one
	// read-modify-write per sink from values already in registers.
	if (bracketed && recipe.interpolationFactor > 1) {
		warnings.push(
			`Bracket shutters and ${recipe.interpolationFactor}x frame interpolation cannot both run, so this shot will be taken without interpolation. Turn bracketing off if the in-betweens matter more to you than the extra stops.`
		);
	}

	// Both are optional accelerators competing for the same per-frame budget, and
	// running them together is the worst of the trade: interpolation roughly halves
	// each pass's real-sample yield, so the wall clock buys synthetic samples where
	// plain multi-pass would have bought real ones (frame-interpolation note §10.2).
	//
	// Silent on a bracketed shot: interpolation is already being dropped above, so
	// advising the user to turn off something that is not going to run would send
	// them looking for a setting that is no longer doing anything.
	if (!bracketed && plan.passes > 1 && recipe.interpolationFactor > 1) {
		warnings.push(
			`Multi-pass and ${recipe.interpolationFactor}x interpolation are both on. They compete: interpolation slows each pass enough to cost it real frames, so the same wait buys fewer real samples than passes alone would. Turning interpolation off is usually the better shot.`
		);
	}

	if (
		recipe.targetSamples !== null &&
		plan.predictedSamples < recipe.targetSamples
	) {
		warnings.push(
			`Even at 1/${plan.playbackDivisor} speed this exposure reaches about ${plan.predictedSamples} samples, short of the ${recipe.targetSamples} requested. Use a longer shutter for more.`
		);
	}

	// One warning, two registers. A capture drives the user's replay for its whole
	// duration and cannot be hurried, so past the point where it stops looking like
	// a pause and starts looking like a hang, the warning says what to do about it
	// rather than just quoting a number.
	//
	// Quoted from the TOTAL, so N passes cannot be sold as the cost of one. That is
	// what makes multi-pass safe to expose in the UI at all: its whole cost is time.
	const passSuffix =
		plan.passes > 1
			? ` across ${plan.passes} passes over the same moment`
			: '';
	if (plan.predictedTotalWallClockSeconds > LONG_CAPTURE_ESCALATE_SECONDS) {
		warnings.push(
			`This capture runs the replay at 1/${plan.playbackDivisor} speed for about ${describeDuration(plan.predictedTotalWallClockSeconds)} of real time${passSuffix}, and cannot be hurried once started. ${
				plan.passes > 1
					? 'Fewer passes finish sooner with fewer samples.'
					: 'A faster playback speed finishes sooner with fewer samples.'
			}`
		);
	} else if (plan.predictedTotalWallClockSeconds > LONG_CAPTURE_WARN_SECONDS) {
		warnings.push(
			`This capture will take about ${describeDuration(plan.predictedTotalWallClockSeconds)} of real time at 1/${plan.playbackDivisor} playback speed${passSuffix}.`
		);
	}

	// Passes multiply the sample stream, so a combination the single-pass cap was
	// sized to make impossible is reachable again. Says what is lost and what is not:
	// the IMAGE is unaffected, only the diagnostics describe a prefix.
	if (plan.predictedTotalSamples > NATIVE_SAMPLE_LOG_CAP) {
		warnings.push(
			`This capture is predicted to collect about ${Math.round(plan.predictedTotalSamples)} samples across ${plan.passes} passes, past the ${NATIVE_SAMPLE_LOG_CAP} the diagnostic log holds. The image is unaffected — only the evenness and gap figures will describe the first part of the capture.`
		);
	}

	// Interpolation that cannot keep up buys synthetic samples with real ones, and the
	// result looks under-blurred rather than obviously broken — so it is worth saying
	// BEFORE the shot, once this machine has shown where its limit is.
	//
	// Silent on a bracketed shot, for the same reason as the multi-pass warning above:
	// interpolation is not going to run, so it cannot cost this capture anything.
	if (!bracketed && recipe.interpolationFactor > 1) {
		const load = interpolationLoad({
			renderWidth: plan.renderWidth,
			renderHeight: plan.renderHeight,
			interpolationFactor: recipe.interpolationFactor,
		});
		const limit = opts.lossyInterpolationLoad;
		if (typeof limit === 'number' && limit > 0 && load >= limit) {
			warnings.push(
				`At this size, ${recipe.interpolationFactor}x interpolation has previously cost this machine real samples. Consider a lower factor, a lower Resolution, or more passes instead.`
			);
		}
	}

	return { errors, warnings };
}

// Output base-name suffix for a recipe. Empty in v1 (variantId always null);
// Spotter Pack fills it, so naming needs no change when that lands.
export function variantSuffix(recipe: LongExposureRecipe): string {
	return recipe.variantId ? `--${recipe.variantId}` : '';
}
