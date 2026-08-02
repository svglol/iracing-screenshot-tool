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
	exposureSecondsForFrames,
	findShutterStop,
	framesForExposure,
	isWeightingCurve,
	nearestPlaybackDivisor,
	predictSampleCount,
	predictWallClockSeconds,
	solvePlaybackDivisor,
	scaleRenderFpsForResize,
	type PlaybackDivisor,
	type WeightingCurve,
} from './exposure-math';

export const TONEMAPPERS = ['none', 'reinhard', 'aces'] as const;
export type Tonemapper = (typeof TONEMAPPERS)[number];

export const SUPERSAMPLE_FACTORS = [1, 2] as const;
export type SupersampleFactor = (typeof SUPERSAMPLE_FACTORS)[number];

// png16 is the 16-bit master. png/jpeg/webp mirror the existing still-capture
// formats for users who only want the 8-bit result.
export const LONG_EXPOSURE_FORMATS = ['png16', 'png', 'jpeg', 'webp'] as const;
export type LongExposureFormat = (typeof LONG_EXPOSURE_FORMATS)[number];

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
				5000,
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
	// Exposure window length in replay frames, and what that quantises the
	// requested exposure to.
	windowFrames: number;
	effectiveExposureSeconds: number;
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
	// True when the exposure collapses to a single replay frame — no blur, and the
	// capture degenerates to the existing still path.
	isSingleFrame: boolean;
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
	const exposureSeconds = recipe.exposureMs / 1000;
	const windowFrames = framesForExposure(exposureSeconds);
	const effectiveExposureSeconds = exposureSecondsForFrames(windowFrames);
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

	return {
		windowFrames,
		effectiveExposureSeconds,
		startFrame: recipe.anchorFrame - windowFrames,
		anchorFrame: recipe.anchorFrame,
		playbackDivisor,
		predictedSamples: predictSampleCount({
			exposureSeconds: effectiveExposureSeconds,
			renderFps,
			playbackDivisor,
		}),
		predictedWallClockSeconds: predictWallClockSeconds({
			exposureSeconds: effectiveExposureSeconds,
			playbackDivisor,
		}),
		renderWidth,
		renderHeight,
		isSingleFrame: windowFrames <= 1,
	};
}

export interface RecipeValidation {
	// Hard failures — the capture must not start.
	errors: string[];
	// Proceed, but tell the user.
	warnings: string[];
}

// Validate a plan against live replay bounds. Split from resolvePlan so the UI can
// show live feasibility without attempting a capture.
export function validatePlan(opts: {
	plan: ResolvedPlan;
	recipe: LongExposureRecipe;
	// Live replay bounds from telemetry.
	replayFrameNumEnd: number | null;
	currentSessionNum: number | null;
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

	if (plan.isSingleFrame) {
		warnings.push(
			'This shutter is shorter than one replay frame, so the result is a single sample with no motion blur.'
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

	if (plan.predictedWallClockSeconds > LONG_CAPTURE_WARN_SECONDS) {
		warnings.push(
			`This capture will take about ${Math.round(plan.predictedWallClockSeconds)} seconds of real time at 1/${plan.playbackDivisor} playback speed.`
		);
	}

	return { errors, warnings };
}

// Output base-name suffix for a recipe. Empty in v1 (variantId always null);
// Spotter Pack fills it, so naming needs no change when that lands.
export function variantSuffix(recipe: LongExposureRecipe): string {
	return recipe.variantId ? `--${recipe.variantId}` : '';
}
