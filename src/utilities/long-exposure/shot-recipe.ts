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

export const TONEMAPPERS = ['none', 'reinhard', 'aces'] as const;
export type Tonemapper = (typeof TONEMAPPERS)[number];

export const SUPERSAMPLE_FACTORS = [1, 2] as const;
export type SupersampleFactor = (typeof SUPERSAMPLE_FACTORS)[number];

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

	width: number;
	height: number;
	supersample: SupersampleFactor;

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
		supersample: 1,
		// Off by default. It is hardware-specific, it costs per-frame time that could
		// otherwise buy real samples, and the base feature must stand on its own.
		interpolationFactor: 1,
		// Also off by default, for a different reason: a sidecar written before this
		// existed has no such field, so a non-zero default would silently make old
		// recipes reproduce differently. Reproducibility outranks a better first look.
		highlightRecovery: 0,
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
		supersample: (SUPERSAMPLE_FACTORS as readonly number[]).includes(
			Number(input.supersample)
		)
			? (Number(input.supersample) as SupersampleFactor)
			: defaults.supersample,
		interpolationFactor: (
			INTERPOLATION_FACTORS as readonly number[]
		).includes(Number(input.interpolationFactor))
			? (Number(input.interpolationFactor) as InterpolationFactor)
			: (defaults.interpolationFactor ?? 1),
		highlightRecovery: Number.isFinite(Number(input.highlightRecovery))
			? Math.min(
					MAX_HIGHLIGHT_RECOVERY_STOPS,
					Math.max(0, Number(input.highlightRecovery))
				)
			: (defaults.highlightRecovery ?? 0),
		weighting: isWeightingCurve(input.weighting)
			? input.weighting
			: defaults.weighting,
		tonemap: (TONEMAPPERS as readonly string[]).includes(
			input.tonemap as string
		)
			? (input.tonemap as Tonemapper)
			: defaults.tonemap,
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
	// Predictions — the achieved count is always measured separately.
	predictedSamples: number;
	predictedWallClockSeconds: number;
	// Render dimensions (target × supersample) iRacing's window is resized to.
	renderWidth: number;
	renderHeight: number;
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
	const renderWidth = recipe.width * recipe.supersample;
	const renderHeight = recipe.height * recipe.supersample;
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

	return {
		windowFrames,
		effectiveExposureSeconds,
		isSubFrameWindow: isSubFrameExposure(effectiveExposureSeconds),
		startFrame: recipe.anchorFrame - windowFrames,
		anchorFrame: recipe.anchorFrame,
		playbackDivisor,
		predictedSamples,
		predictedWallClockSeconds: predictWallClockSeconds({
			exposureSeconds: effectiveExposureSeconds,
			playbackDivisor,
		}),
		renderWidth,
		renderHeight,
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
			'This shutter is short enough that only one frame will land inside it, so the result has no motion blur. A slower playback speed or a slower shutter buys samples.'
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
	if (plan.predictedWallClockSeconds > LONG_CAPTURE_ESCALATE_SECONDS) {
		warnings.push(
			`This capture runs the replay at 1/${plan.playbackDivisor} speed for about ${describeDuration(plan.predictedWallClockSeconds)} of real time, and cannot be hurried once started. A faster playback speed finishes sooner with fewer samples.`
		);
	} else if (plan.predictedWallClockSeconds > LONG_CAPTURE_WARN_SECONDS) {
		warnings.push(
			`This capture will take about ${describeDuration(plan.predictedWallClockSeconds)} of real time at 1/${plan.playbackDivisor} playback speed.`
		);
	}

	// Interpolation that cannot keep up buys synthetic samples with real ones, and the
	// result looks under-blurred rather than obviously broken — so it is worth saying
	// BEFORE the shot, once this machine has shown where its limit is.
	if (recipe.interpolationFactor > 1) {
		const load = interpolationLoad({
			renderWidth: plan.renderWidth,
			renderHeight: plan.renderHeight,
			interpolationFactor: recipe.interpolationFactor,
		});
		const limit = opts.lossyInterpolationLoad;
		if (typeof limit === 'number' && limit > 0 && load >= limit) {
			warnings.push(
				`At this size, ${recipe.interpolationFactor}x interpolation has previously cost this machine real samples. ` +
					(recipe.supersample > 1
						? 'Turning off supersampling would fix it and buy samples directly.'
						: 'Consider a lower factor or a smaller capture size.')
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
