// Accumulator sink model (design note §5).
//
// The capture loop does NOT own a buffer. It owns a router that offers every
// captured frame to a set of independent sinks, each with its own sample range and
// weighting curve. v1 instantiates exactly one sink; bracketing (v2) instantiates
// N without touching the capture loop, the replay control, the backend, or output.
//
// The structural property that makes this work: with a TRAILING window every
// bracket stop shares the same terminal frame (the anchor) and differs ONLY in how
// far back it reaches. A faster shutter is literally the tail subset of the samples
// already flowing past. So a sink is fully described by where it starts consuming.
//
// "How far back" is CONTINUOUS, not a frame count. iRacing renders ~10 distinct
// interpolated frames per replay frame, so a window shorter than one replay frame
// is capturable — it just starts partway through the frame before the anchor. The
// frame index still decides where to seek, when the safety net opens, and when to
// stop; only the window start moved to continuous time.
//
// Consequence worth stating: memory scales with the number of SINKS, not the number
// of SAMPLES. JRT holds every captured frame in RAM and refuses the shot when they
// don't fit; we hold one fixed-size accumulator per sink at any sample count.
//
// Pure — no GPU, no SDK, no I/O.

import {
	exposureSecondsForFrames,
	resolveExposureSeconds,
	shutterStopsAtOrFaster,
	startBoundaryCoverage,
	weightAt,
	windowFramesForExposure,
	windowPosition,
	type WeightingCurve,
} from './exposure-math';

// The id of the single sink v1 creates. Bracket sinks use their shutter key.
export const PRIMARY_SINK_ID = 'primary';

export interface AccumulatorSink {
	// Stable identifier; also the native-side sink key and the output name suffix
	// for bracket stops.
	id: string;
	// Human label for UI/metadata ('1/8').
	label: string;
	// First replay frame this sink may consume, inclusive. INTEGRAL, and it stays
	// authoritative for two things: it is where the replay SEEKS to, and it is the
	// frame-indexed safety net that bounds a bad sub-frame time estimate to one
	// replay frame. It is NOT what bounds the exposure — see exposureSeconds.
	startFrame: number;
	// Last replay frame this sink consumes, inclusive. ALWAYS the anchor frame —
	// every sink terminates on the moment the user framed.
	endFrame: number;
	// The window's continuous length in seconds. The window is
	// [anchorTime − exposureSeconds, anchorTime], and THAT is what bounds the
	// exposure. For a whole-frame exposure it lands exactly on
	// frameTimeOf(startFrame), so the two agree and nothing changes; for a
	// sub-frame exposure it starts partway through frame `startFrame`, which is
	// the whole point (design note §3).
	exposureSeconds: number;
	// This sink's own weighting curve. Sinks are independent, so a bracket set could
	// mix curves; v1 and the v2 bracket planner use one curve throughout.
	weighting: WeightingCurve;
}

// A sink's own sub-window in replay frames. The SEEK span, not the exposure — a
// sub-frame sink spans one frame while exposing for a fraction of it.
export function sinkFrameSpan(sink: AccumulatorSink): number {
	return Math.max(0, sink.endFrame - sink.startFrame);
}

// A sink's continuous window start, in the same session-time units as the live
// sample stream.
//
// Derived from the anchor rather than stored, deliberately: the frame -> session
// time map is only pinned AFTER the seek lands (capture-session re-anchors it on a
// settled reading), so a start time baked in at plan time would be in a different
// origin than the samples it has to be compared against. Anchoring on endFrame —
// which every sink shares — makes the sink origin-free.
//
// `frameTimeOf` is the same injected map `routeFrame` takes.
export function sinkStartTime(
	sink: AccumulatorSink,
	frameTimeOf: (replayFrameNum: number) => number
): number {
	// A whole-frame window starts exactly ON its start frame, so read that straight
	// off the map instead of computing anchorTime − exposureSeconds. The two differ
	// by an ULP — `1000/60 − 1` is not `940/60` — and an ULP on the wrong side of
	// the gate drops the first sample of an exposure this change was never supposed
	// to touch. Exact equality is the right test: both sides come from
	// `exposureSecondsForFrames`, so a planned whole-frame sink matches bit for bit
	// and anything else falls through to the continuous form.
	if (sink.exposureSeconds === exposureSecondsForFrames(sinkFrameSpan(sink))) {
		return frameTimeOf(sink.startFrame);
	}
	return frameTimeOf(sink.endFrame) - Math.max(0, sink.exposureSeconds);
}

// The single sink a v1 capture uses.
export function planPrimarySink(opts: {
	anchorFrame: number;
	// The RESOLVED exposure (see resolveExposureSeconds) — whole-frame quantised at
	// or above one replay frame, exact below it.
	exposureSeconds: number;
	weighting: WeightingCurve;
	label: string;
}): AccumulatorSink {
	const { anchorFrame, exposureSeconds, weighting, label } = opts;
	return {
		id: PRIMARY_SINK_ID,
		label,
		startFrame: anchorFrame - windowFramesForExposure(exposureSeconds),
		endFrame: anchorFrame,
		exposureSeconds,
		weighting,
	};
}

// v2 bracketing, written and tested now so adding it later is wiring rather than
// design. A shot at 1/60 also emits 1/125 … 1/1000 from the same sample stream:
// every returned sink ends on the anchor and differs only in startFrame.
//
// NOT called by v1 — the capture path plans exactly one sink. Kept here (and
// covered by tests) so the seam is proven rather than asserted.
export function planBracketSinks(opts: {
	anchorFrame: number;
	shutterKey: string;
	weighting: WeightingCurve;
}): AccumulatorSink[] {
	const { anchorFrame, shutterKey, weighting } = opts;
	return shutterStopsAtOrFaster(shutterKey).map((stop) => {
		const exposureSeconds = resolveExposureSeconds(stop.seconds);
		return {
			id: stop.key,
			label: stop.label,
			// The frame span; several fast stops share a one-frame span, but their
			// WINDOWS differ — which is why exposureSeconds carries the distinction.
			startFrame: anchorFrame - windowFramesForExposure(exposureSeconds),
			// Identical for every stop, by construction.
			endFrame: anchorFrame,
			// The ONLY thing that differs between bracket stops.
			exposureSeconds,
			weighting,
		};
	});
}

// How many accumulator sinks a recipe will instantiate, WITHOUT building them.
//
// Exported because two places need the answer and they must not disagree: the
// capture plans the sinks and pays their VRAM, while `validatePlan` warns about what
// that costs BEFORE the shot. Both derive it from `shutterStopsAtOrFaster`, so a
// bracket the planner builds and a bracket the warning describes are the same
// bracket — including the degenerate cases, where both land on 1:
//
//   bracketing off              the single primary sink
//   free-form exposure          no ladder key, so no "at or faster" set to build
//   the fastest stop chosen     the set is the chosen stop alone
export function plannedSinkCount(opts: {
	bracket: boolean;
	shutterKey: string | null | undefined;
}): number {
	if (!opts.bracket || !opts.shutterKey) {
		return 1;
	}
	return Math.max(1, shutterStopsAtOrFaster(opts.shutterKey).length);
}

// The earliest frame any sink needs — i.e. where the replay must be seeked to.
// With bracketing this is the slowest stop's start; with one sink it is that
// sink's start.
export function earliestStartFrame(sinks: AccumulatorSink[]): number {
	return sinks.reduce(
		(min, sink) => Math.min(min, sink.startFrame),
		sinks.length ? sinks[0].startFrame : 0
	);
}

// One offer of a captured moment to the router: where the replay is, both
// frame-indexed and continuous, plus the map between the two.
export interface FrameOffer {
	// Authoritative position. Bounds the error and terminates the exposure.
	replayFrameNum: number;
	// Continuous position, sub-frame interpolated. Bounds the exposure.
	sessionTime: number;
	// Replay frame -> session time. Injected rather than assumed so the caller can
	// pin it to a reading taken after the seek landed.
	frameTimeOf: (replayFrameNum: number) => number;
	// Sim-time span the weight pushed for this offer will govern — one control
	// tick. Drives the fractional boundary weight; omitted (or 0) gives a binary
	// in/out test on the window start instead.
	tickSeconds?: number;
}

// Which sinks are open for an offer. A bracket stop that hasn't opened yet simply
// isn't offered the frame — no buffering, no bookkeeping.
//
// Three conditions, and they are not redundant:
//   - `replayFrameNum >= startFrame` is the frame-indexed SAFETY NET. The window
//     start is now estimated from wall clock within a replay frame, so this is
//     what bounds a bad estimate to one replay frame (design note §4).
//   - the boundary coverage is what actually opens the window, continuously.
//   - `replayFrameNum <= endFrame` is termination, unchanged and frame-indexed.
export function sinksOpenAt(
	sinks: AccumulatorSink[],
	offer: FrameOffer
): AccumulatorSink[] {
	const { replayFrameNum, sessionTime, frameTimeOf, tickSeconds = 0 } = offer;
	return sinks.filter(
		(sink) =>
			replayFrameNum >= sink.startFrame &&
			replayFrameNum <= sink.endFrame &&
			startBoundaryCoverage({
				sessionTime,
				tickSeconds,
				windowStartTime: sinkStartTime(sink, frameTimeOf),
			}) > 0
	);
}

// What the router hands the backend for one frame: which sink, and at what weight.
export interface SinkContribution {
	sinkId: string;
	weight: number;
	// Normalised position WITHIN THIS SINK's own window, for diagnostics.
	u: number;
	// Fraction of this tick that fell inside the window. 1 everywhere except the
	// tick that straddles the window start. Reported so a diagnostic can tell a
	// tapered weight apart from a part-covered one.
	coverage: number;
}

// Route one captured frame to its contributions. Each sink computes u against its
// OWN window, which is what lets a 1/1000 bracket stop reach full weight at the
// anchor in the same pass where the 1/8 primary is only part-way through its taper.
export function routeFrame(offer: {
	sinks: AccumulatorSink[];
	replayFrameNum: number;
	sessionTime: number;
	frameTimeOf: (replayFrameNum: number) => number;
	tickSeconds?: number;
}): SinkContribution[] {
	const { sinks, sessionTime, frameTimeOf, tickSeconds = 0 } = offer;
	return sinksOpenAt(sinks, offer).map((sink) => {
		const windowStartTime = sinkStartTime(sink, frameTimeOf);
		const u = windowPosition({
			sessionTime,
			windowStartTime,
			windowEndTime: frameTimeOf(sink.endFrame),
		});
		const coverage = startBoundaryCoverage({
			sessionTime,
			tickSeconds,
			windowStartTime,
		});
		return {
			sinkId: sink.id,
			weight: weightAt(sink.weighting, u) * coverage,
			u,
			coverage,
		};
	});
}
