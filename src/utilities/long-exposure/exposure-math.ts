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
] as const;

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

// Exposure window length in REPLAY FRAMES. Always at least 1: a shutter faster
// than one replay frame (1/1000 … 1/60) collapses to a single-frame window, which
// is the existing still-capture path with no blur — matching JRT's 1/1000 = 1
// sample rung.
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
