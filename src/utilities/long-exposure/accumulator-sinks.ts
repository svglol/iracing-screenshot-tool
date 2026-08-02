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
// Consequence worth stating: memory scales with the number of SINKS, not the number
// of SAMPLES. JRT holds every captured frame in RAM and refuses the shot when they
// don't fit; we hold one fixed-size accumulator per sink at any sample count.
//
// Pure — no GPU, no SDK, no I/O.

import {
	framesForExposure,
	shutterStopsAtOrFaster,
	weightAt,
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
	// First replay frame this sink consumes, inclusive.
	startFrame: number;
	// Last replay frame this sink consumes, inclusive. ALWAYS the anchor frame —
	// every sink terminates on the moment the user framed.
	endFrame: number;
	// This sink's own weighting curve. Sinks are independent, so a bracket set could
	// mix curves; v1 and the v2 bracket planner use one curve throughout.
	weighting: WeightingCurve;
}

// A sink's own sub-window in replay frames.
export function sinkFrameSpan(sink: AccumulatorSink): number {
	return Math.max(0, sink.endFrame - sink.startFrame);
}

// The single sink a v1 capture uses.
export function planPrimarySink(opts: {
	anchorFrame: number;
	windowFrames: number;
	weighting: WeightingCurve;
	label: string;
}): AccumulatorSink {
	const { anchorFrame, windowFrames, weighting, label } = opts;
	return {
		id: PRIMARY_SINK_ID,
		label,
		startFrame: anchorFrame - Math.max(0, windowFrames),
		endFrame: anchorFrame,
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
	return shutterStopsAtOrFaster(shutterKey).map((stop) => ({
		id: stop.key,
		label: stop.label,
		// The ONLY thing that differs between bracket stops.
		startFrame: anchorFrame - framesForExposure(stop.seconds),
		// Identical for every stop, by construction.
		endFrame: anchorFrame,
		weighting,
	}));
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

// Which sinks are open at a given replay frame. A bracket stop that hasn't opened
// yet simply isn't offered the frame — no buffering, no bookkeeping.
export function sinksOpenAt(
	sinks: AccumulatorSink[],
	replayFrameNum: number
): AccumulatorSink[] {
	return sinks.filter(
		(sink) =>
			replayFrameNum >= sink.startFrame && replayFrameNum <= sink.endFrame
	);
}

// What the router hands the backend for one frame: which sink, and at what weight.
export interface SinkContribution {
	sinkId: string;
	weight: number;
	// Normalised position WITHIN THIS SINK's own window, for diagnostics.
	u: number;
}

// Route one captured frame to its contributions. Each sink computes u against its
// OWN window, which is what lets a 1/1000 bracket stop reach full weight at the
// anchor in the same pass where the 1/8 primary is only part-way through its taper.
//
// `frameTimeOf(frame)` converts a replay frame number to session time so a sink's
// window bounds can be expressed in the same continuous units as `sessionTime`.
// Injected rather than assumed so the caller can use measured session times.
export function routeFrame(opts: {
	sinks: AccumulatorSink[];
	replayFrameNum: number;
	sessionTime: number;
	frameTimeOf: (replayFrameNum: number) => number;
}): SinkContribution[] {
	const { sinks, replayFrameNum, sessionTime, frameTimeOf } = opts;
	return sinksOpenAt(sinks, replayFrameNum).map((sink) => {
		const u = windowPosition({
			sessionTime,
			windowStartTime: frameTimeOf(sink.startFrame),
			windowEndTime: frameTimeOf(sink.endFrame),
		});
		return { sinkId: sink.id, weight: weightAt(sink.weighting, u), u };
	});
}
