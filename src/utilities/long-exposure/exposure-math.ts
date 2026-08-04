// Pure exposure/sampling math for long-exposure photo mode. No Node, Electron,
// GPU or SDK deps — so it runs identically in the main process (capture-session)
// and the renderer (parameter UI previews), and is fully unit-testable.
//
// See docs/design/long-exposure.md §3 for the derivation. The identity everything
// here rests on:
//
//     samples S = exposureSeconds × renderFps × playbackDivisor
//     wall    W = exposureSeconds × playbackDivisor
//
// where playbackDivisor P means "1/P real time" (iRacing's slow-motion argument is
// a divisor — confirmed against the SDK's own msgtest.cpp sample, which captions
// `ReplaySetPlaySpeed(16, true)` as "1/16th speed").
//
// The whole point of the design: sample count is bounded by wall-clock patience,
// not by the sim's 60 Hz positional tick rate.

// iRacing's replay tape advances at 60 positional frames per second. ReplayFrameNum
// counts these from the start of the tape, so it is our exact window unit.
export const REPLAY_FRAMES_PER_SECOND = 60;

// The slow-motion divisors we broadcast. iRacing's own SDK sample demonstrates
// 1..16; we restrict to powers of two because those are the rungs its replay UI
// exposes and therefore the ones with the most field evidence behind them.
// (Open question 3 in the design note: whether arbitrary integers are stable.)
export const PLAYBACK_DIVISORS = [1, 2, 4, 8, 16] as const;
export type PlaybackDivisor = (typeof PLAYBACK_DIVISORS)[number];

// Render rate assumed when the FrameRate telemetry variable is unavailable. Only
// ever used to PREDICT sample count / wall time for the UI and to pick a playback
// speed — the achieved count is always measured, never assumed.
export const ASSUMED_RENDER_FPS = 60;
// Floor/ceiling clamps on a live FrameRate reading. iRacing reports an average, and
// a transient 0 or a 900 fps menu reading would otherwise pick an absurd speed.
export const MIN_USABLE_RENDER_FPS = 30;
export const MAX_USABLE_RENDER_FPS = 360;

// The JRT shutter ladder, reproduced exactly — each stop doubles the blended
// sample count in JRT's model. We keep `jrtSamples` purely so the UI can show
// users the reference tool's number next to ours (ours is typically far higher);
// nothing in our pipeline consumes it.
export interface ShutterStop {
	key: string;
	label: string;
	seconds: number;
	jrtSamples: number;
}

export const SHUTTER_LADDER: readonly ShutterStop[] = [
	{ key: '1/1000', label: '1/1000', seconds: 1 / 1000, jrtSamples: 1 },
	{ key: '1/500', label: '1/500', seconds: 1 / 500, jrtSamples: 2 },
	{ key: '1/250', label: '1/250', seconds: 1 / 250, jrtSamples: 4 },
	{ key: '1/125', label: '1/125', seconds: 1 / 125, jrtSamples: 8 },
	{ key: '1/60', label: '1/60', seconds: 1 / 60, jrtSamples: 16 },
	{ key: '1/30', label: '1/30', seconds: 1 / 30, jrtSamples: 32 },
	{ key: '1/15', label: '1/15', seconds: 1 / 15, jrtSamples: 64 },
	{ key: '1/8', label: '1/8', seconds: 1 / 8, jrtSamples: 128 },
	{ key: '1/4', label: '1/4', seconds: 1 / 4, jrtSamples: 256 },
	{ key: '0.5', label: '0.5"', seconds: 0.5, jrtSamples: 512 },
	// Past JRT's ceiling — reachable for us because slow motion costs wall-clock
	// time, not memory (accumulators are fixed-size; see design note §5).
	{ key: '1', label: '1"', seconds: 1, jrtSamples: 1024 },
	// The long end. Memory does not grow with exposure — one fixed-size accumulator
	// holds a 10-second shot exactly as it holds a 1/1000 one — so the only thing
	// these cost is the user's patience, and they cost a LOT of it: 10" at 1/16
	// playback is 160 s of real time. `validatePlan` escalates its wall-clock
	// warning past LONG_CAPTURE_ESCALATE_SECONDS for precisely this reason.
	//
	// jrtSamples stays on the seconds x 1024 line the ladder already implies; JRT
	// itself offers nothing this slow, and nothing in our pipeline reads it.
	{ key: '2', label: '2"', seconds: 2, jrtSamples: 2048 },
	{ key: '5', label: '5"', seconds: 5, jrtSamples: 5120 },
	{ key: '10', label: '10"', seconds: 10, jrtSamples: 10240 },
] as const;

// The longest exposure the ladder offers, in milliseconds. Free-form exposures are
// clamped to it rather than to a separate number, so a hand-edited recipe cannot
// ask for something the UI has no way to express.
export const MAX_EXPOSURE_MS =
	SHUTTER_LADDER[SHUTTER_LADDER.length - 1].seconds * 1000;

export function findShutterStop(
	key: string | null | undefined
): ShutterStop | null {
	if (!key) {
		return null;
	}
	return SHUTTER_LADDER.find((stop) => stop.key === key) || null;
}

// Every stop at or FASTER than the given one, slowest first. This is the bracket
// set: with a trailing window a faster shutter is the tail subset of the samples
// we are already collecting (design note §5). Unused in v1; planBracketSinks
// consumes it in v2.
export function shutterStopsAtOrFaster(key: string): ShutterStop[] {
	const index = SHUTTER_LADDER.findIndex((stop) => stop.key === key);
	if (index < 0) {
		return [];
	}
	return SHUTTER_LADDER.slice(0, index + 1).reverse();
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

// Exposure window length in REPLAY FRAMES, rounded to the nearest whole frame.
// Always at least 1. This is the QUANTISER for exposures of one replay frame or
// longer; below one frame it saturates at 1 and `resolveExposureSeconds` takes
// over — see the sub-frame section below.
export function framesForExposure(exposureSeconds: number): number {
	if (!isFiniteNumber(exposureSeconds) || exposureSeconds <= 0) {
		return 1;
	}
	return Math.max(1, Math.round(exposureSeconds * REPLAY_FRAMES_PER_SECOND));
}

// Inverse of framesForExposure — the exposure a whole number of replay frames
// actually represents. The UI shows this so a requested 1/8 that quantises to 8
// frames is reported honestly as 0.133 s, not the nominal 0.125 s.
export function exposureSecondsForFrames(frames: number): number {
	if (!isFiniteNumber(frames) || frames < 1) {
		return 1 / REPLAY_FRAMES_PER_SECOND;
	}
	return Math.round(frames) / REPLAY_FRAMES_PER_SECOND;
}

// ---------------------------------------------------------------------------
// Sub-replay-frame exposure windows
//
// The tape stores POSITIONS at 60 Hz, but iRacing renders ~10 distinct
// interpolated frames between each pair of them (measured — see
// long-exposure-frame-interpolation.md §1). So an exposure shorter than one replay
// frame is perfectly capturable: seek to `anchor − 1`, play, and accumulate only
// the tail subset of the rendered frames.
//
// Before this existed, `framesForExposure` was the only quantiser and 1/1000,
// 1/500, 1/250 and 1/125 all collapsed onto 1/60 — asking for 1/1000 silently
// delivered 16x the intended blur. Five stops, one image.
//
// Deliberately NOT changed: exposures of one frame or longer still quantise to
// whole frames exactly as before, so every existing recipe resolves to the same
// window it always did (1/8 remains 8 frames = 0.133 s, 6.7% slower than its
// label). The machinery below would remove that too; doing so would silently
// change what every stored recipe means, which is a separate decision.
// ---------------------------------------------------------------------------

// Tolerance, in replay frames, for float round-trips. `(1/60)*1000/1000` is not
// exactly `1/60`, and `(8/60)*60` is not exactly 8 — without this a 1/60 request
// would classify as sub-frame and an 8-frame window would ceil to 9.
const FRAME_EPSILON = 1e-9;

// What a requested exposure actually resolves to.
//
//   >= one replay frame  quantised to whole frames, exactly as before.
//   <  one replay frame  passed through UNQUANTISED — a continuous window that
//                        ends on the anchor and starts partway into the frame
//                        before it.
//
// This value is a reproducibility contract, not a label: it goes in the sidecar
// and a re-execution must land on the same window (design note §6).
export function resolveExposureSeconds(exposureSeconds: number): number {
	if (!isFiniteNumber(exposureSeconds) || exposureSeconds <= 0) {
		return 1 / REPLAY_FRAMES_PER_SECOND;
	}
	if (exposureSeconds * REPLAY_FRAMES_PER_SECOND < 1 - FRAME_EPSILON) {
		return exposureSeconds;
	}
	return exposureSecondsForFrames(framesForExposure(exposureSeconds));
}

// How many whole replay frames a resolved exposure needs on the tape.
//
// CEIL, not round: this is what the seek targets and what the frame-indexed safety
// net opens on, so it must reach back far enough to contain the whole continuous
// window. A sub-frame exposure still needs one full frame — that is the frame it
// starts partway through. For a whole-frame exposure this returns exactly the
// frame count that produced it, so the seek is unchanged.
export function windowFramesForExposure(exposureSeconds: number): number {
	if (!isFiniteNumber(exposureSeconds) || exposureSeconds <= 0) {
		return 1;
	}
	return Math.max(
		1,
		Math.ceil(exposureSeconds * REPLAY_FRAMES_PER_SECOND - FRAME_EPSILON)
	);
}

// Whether an exposure is shorter than one replay frame — i.e. whether it needs the
// continuous window start rather than being fully described by its frame span.
export function isSubFrameExposure(exposureSeconds: number): boolean {
	return (
		isFiniteNumber(exposureSeconds) &&
		exposureSeconds > 0 &&
		exposureSeconds * REPLAY_FRAMES_PER_SECOND < 1 - FRAME_EPSILON
	);
}

// Clamp a live FrameRate telemetry reading into a range that produces sane
// predictions. Non-numeric / absent → the assumed default.
export function usableRenderFps(reported: unknown): number {
	if (!isFiniteNumber(reported) || reported <= 0) {
		return ASSUMED_RENDER_FPS;
	}
	return Math.min(
		MAX_USABLE_RENDER_FPS,
		Math.max(MIN_USABLE_RENDER_FPS, reported)
	);
}

// FrameRate telemetry is read at the user's CURRENT window size, but we capture
// after resizing iRacing to the render size — which for a 2x supersampled 1440p
// shot is four times the pixels. Predicting from the unscaled reading overestimates
// the sample count by roughly 2x, which is what a field capture showed: 1166
// predicted against 620 achieved at 5120x2880.
//
// Neither naive model fits. Pure pixel-linear scaling assumes fully GPU-bound
// rendering and under-predicts badly (it would have said 293); no scaling at all
// assumes fully CPU-bound and over-predicts. A square-root law sits between the two
// and matched that capture closely (73 fps / sqrt(4) = 36.5 predicted vs 38.75
// measured).
//
// This is an empirical fit against ONE data point on ONE machine. It is a
// prediction shown next to an achieved count, never a promise — so being roughly
// right beats being precisely wrong in a fixed direction.
export function scaleRenderFpsForResize(opts: {
	reportedFps: unknown;
	currentPixels?: number | null;
	renderPixels: number;
}): number {
	const base = usableRenderFps(opts.reportedFps);
	const { currentPixels, renderPixels } = opts;
	if (
		!isFiniteNumber(currentPixels) ||
		(currentPixels as number) <= 0 ||
		!isFiniteNumber(renderPixels) ||
		renderPixels <= 0 ||
		renderPixels <= (currentPixels as number)
	) {
		// Unknown baseline, or the render is no larger than the current window —
		// nothing to scale down.
		return base;
	}
	const scaled = base * Math.sqrt((currentPixels as number) / renderPixels);
	return Math.max(MIN_USABLE_RENDER_FPS, scaled);
}

// Predicted sample count for a window. Floors, because a partial sample is not a
// sample — and never below 1, since we always get the frame we stop on.
export function predictSampleCount(opts: {
	exposureSeconds: number;
	renderFps: number;
	playbackDivisor: number;
}): number {
	const { exposureSeconds, renderFps, playbackDivisor } = opts;
	if (
		!isFiniteNumber(exposureSeconds) ||
		!isFiniteNumber(renderFps) ||
		!isFiniteNumber(playbackDivisor) ||
		exposureSeconds <= 0 ||
		renderFps <= 0 ||
		playbackDivisor <= 0
	) {
		return 1;
	}
	return Math.max(
		1,
		Math.floor(exposureSeconds * renderFps * playbackDivisor)
	);
}

// How long the capture will actually take the user, in wall-clock seconds. This is
// the real cost of a big sample count in our design — not memory.
export function predictWallClockSeconds(opts: {
	exposureSeconds: number;
	playbackDivisor: number;
}): number {
	const { exposureSeconds, playbackDivisor } = opts;
	if (
		!isFiniteNumber(exposureSeconds) ||
		!isFiniteNumber(playbackDivisor) ||
		exposureSeconds <= 0 ||
		playbackDivisor <= 0
	) {
		return 0;
	}
	return exposureSeconds * playbackDivisor;
}

// Pick the SLOWEST-DIVISOR (= fastest playback, least waiting) rung of the ladder
// that still reaches targetSamples. Returns the largest divisor when even 1/16
// can't reach the target — we get as close as the ladder allows rather than
// failing, and the caller reports the shortfall.
export function solvePlaybackDivisor(opts: {
	exposureSeconds: number;
	renderFps: number;
	targetSamples: number;
}): PlaybackDivisor {
	const { exposureSeconds, renderFps, targetSamples } = opts;
	const slowest = PLAYBACK_DIVISORS[PLAYBACK_DIVISORS.length - 1];
	if (!isFiniteNumber(targetSamples) || targetSamples <= 1) {
		return PLAYBACK_DIVISORS[0];
	}
	for (const divisor of PLAYBACK_DIVISORS) {
		if (
			predictSampleCount({
				exposureSeconds,
				renderFps,
				playbackDivisor: divisor,
			}) >= targetSamples
		) {
			return divisor;
		}
	}
	return slowest;
}

// Snap an arbitrary number to the nearest supported divisor (UI safety — the
// recipe may arrive from a sidecar written by a future build with a wider ladder).
export function nearestPlaybackDivisor(value: unknown): PlaybackDivisor {
	if (!isFiniteNumber(value) || value <= 0) {
		return 1;
	}
	return PLAYBACK_DIVISORS.reduce((best, candidate) =>
		Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
	);
}

// ---------------------------------------------------------------------------
// Sub-frame position
//
// FIELD FINDING (2026-08-02): ReplaySessionTime is QUANTISED TO REPLAY FRAMES, not
// continuous. Measured sample logs show a median sim-time gap between accepted
// samples of exactly 1/60 s, with ~10 samples sharing each value at 1/16 playback.
// (This settles open question 1 in the design note.)
//
// Left alone, that makes the taper weight a staircase: `u` takes only
// `windowFrames` distinct values, so on a 15-frame window every sample lands in one
// of 15 brightness levels and the streak shows visible banding. `box` is immune
// (all weights 1); `linear` and `ease` are not — which is exactly what a user
// reported as "the blending is not so smooth".
//
// The fix is to interpolate within a replay frame using elapsed wall time. This is
// a deliberate, bounded exception to "wall clock is only ever used for timeouts":
// it affects the WEIGHT of a sample and nothing else. Window boundaries and
// termination remain frame-indexed, so a bad estimate here can only make the taper
// slightly uneven — it can never change the exposure, the window, or when we stop.
// ---------------------------------------------------------------------------

// How long one replay frame lasts in WALL-clock milliseconds at a given
// slow-motion divisor. At 1/16, a single 1/60 s replay frame occupies 267 ms of
// real time — which is precisely why the staircase is visible.
export function replayFrameWallMs(playbackDivisor: number): number {
	const divisor =
		isFiniteNumber(playbackDivisor) && playbackDivisor > 0
			? playbackDivisor
			: 1;
	return (1000 / REPLAY_FRAMES_PER_SECOND) * divisor;
}

// Fractional progress through the current replay frame, in [0, 1). Clamped just
// below 1 so a sample can never be attributed to the NEXT frame — the frame index
// stays authoritative.
export function subFramePosition(opts: {
	elapsedSinceFrameChangeMs: number;
	playbackDivisor: number;
}): number {
	const { elapsedSinceFrameChangeMs, playbackDivisor } = opts;
	if (
		!isFiniteNumber(elapsedSinceFrameChangeMs) ||
		elapsedSinceFrameChangeMs <= 0
	) {
		return 0;
	}
	const frameMs = replayFrameWallMs(playbackDivisor);
	if (frameMs <= 0) {
		return 0;
	}
	// 0.999 rather than 1: a sample that overruns its frame's expected duration
	// (a hitch) must still be weighted as belonging to the frame we observed.
	return Math.min(0.999, elapsedSinceFrameChangeMs / frameMs);
}

// ---------------------------------------------------------------------------
// Weighting curves
//
// w is a function of POSITION IN THE WINDOW (u ∈ [0,1], u=1 at the anchor), never
// of sample index. That is what makes the result invariant to achieved sample
// count: the same window shot at 60 and 120 fps yields the same image, just less
// noisy. An index-parameterised weight would have turned frame-rate variance into
// brightness variance.
//
// Every non-box curve is oriented so its HEAVIEST weight sits at the anchor end,
// keeping the user's chosen moment the crisp head of the streak.
// ---------------------------------------------------------------------------

export const WEIGHTING_CURVES = ['box', 'linear', 'ease'] as const;
export type WeightingCurve = (typeof WEIGHTING_CURVES)[number];

// Exponent for the 'ease' curve: sharper head, longer soft tail than 'linear'.
export const EASE_EXPONENT = 2.5;
// Floor applied to tapered curves so the far end of the window still contributes
// something. Without it, u=0 samples carry exactly zero weight and the streak
// terminates in a hard edge instead of fading out.
export const TAPER_FLOOR = 0.02;

export function isWeightingCurve(value: unknown): value is WeightingCurve {
	return (
		typeof value === 'string' &&
		(WEIGHTING_CURVES as readonly string[]).includes(value)
	);
}

// Sample weight at normalised window position u (0 = oldest sample, 1 = anchor).
// Always > 0 so no sample is silently discarded by the weighting alone.
export function weightAt(curve: WeightingCurve, u: number): number {
	const clamped = !isFiniteNumber(u) ? 1 : Math.min(1, Math.max(0, u));
	switch (curve) {
		case 'linear':
			return TAPER_FLOOR + (1 - TAPER_FLOOR) * clamped;
		case 'ease':
			return (
				TAPER_FLOOR + (1 - TAPER_FLOOR) * Math.pow(clamped, EASE_EXPONENT)
			);
		case 'box':
		default:
			return 1;
	}
}

// Normalised position of a replay time within a window. Uses ReplaySessionTime
// (continuous) rather than ReplayFrameNum (quantised at 60 Hz) so tapered curves
// are smooth between positional frames — see design note §5 and open question 1.
// Falls back to the frame-quantised position when the times are degenerate.
export function windowPosition(opts: {
	sessionTime: number;
	windowStartTime: number;
	windowEndTime: number;
}): number {
	const { sessionTime, windowStartTime, windowEndTime } = opts;
	const span = windowEndTime - windowStartTime;
	if (!isFiniteNumber(span) || span <= 0 || !isFiniteNumber(sessionTime)) {
		// Zero-length window (single-frame exposure): the one sample IS the anchor.
		return 1;
	}
	return Math.min(1, Math.max(0, (sessionTime - windowStartTime) / span));
}

// Fraction of one control tick that lies INSIDE the window, at the window start.
//
// The gate and weight we push govern every frame iRacing presents until the next
// push, so a tick's weight covers a sim-time INTERVAL, not an instant. That
// interval is ~1 ms of sim time at P=16 (16 ms of wall clock at 1/16 speed), which
// against a 4 ms 1/250 exposure is 25% of the whole window. A binary in/out test
// would therefore quantise the window start to whole ticks and stair-step the fast
// stops; scaling the straddling tick's weight by its covered fraction turns that
// into a smooth ramp, for one multiply. Standard antialiasing.
//
// ONLY the start is antialiased. Termination stays frame-indexed on the anchor
// (design note §4), so the tick that ends the exposure is never scaled.
//
// Because resolve normalises by accumulated weight, getting this slightly wrong
// changes blur length, never brightness — it fails graceful in both directions.
export function startBoundaryCoverage(opts: {
	// Sim time at the START of the interval this tick's weight governs.
	sessionTime: number;
	// How much sim time it governs. Non-positive/unknown falls back to a binary
	// test on the sample's own time.
	tickSeconds: number;
	windowStartTime: number;
}): number {
	const { sessionTime, tickSeconds, windowStartTime } = opts;
	if (!isFiniteNumber(sessionTime) || !isFiniteNumber(windowStartTime)) {
		return 1;
	}
	if (!isFiniteNumber(tickSeconds) || tickSeconds <= 0) {
		return sessionTime >= windowStartTime ? 1 : 0;
	}
	const covered = sessionTime + tickSeconds - windowStartTime;
	return Math.min(1, Math.max(0, covered / tickSeconds));
}
