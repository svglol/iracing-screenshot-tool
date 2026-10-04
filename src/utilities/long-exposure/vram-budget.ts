// VRAM pre-flight for long exposure (design note §7).
//
// JRT estimates RAM before the shot and refuses if there isn't enough, because it
// buffers every captured frame on the host. We don't — memory scales with the
// number of accumulator SINKS, not the sample count — but we still allocate real
// GPU memory for those accumulators, and unlike iRacing's allocation ours is
// deterministic and entirely ours to be honest about.
//
// So the policy is deliberately two-level:
//
//   our accumulators alone exceed free VRAM  →  HARD REFUSE, naming a setting
//                                               that would fit. We know exactly
//                                               how big our own buffers are.
//   anything else                            →  warn and proceed, matching the
//                                               existing capture path's
//                                               warn-don't-block policy for
//                                               iRacing's own (unpredictable)
//                                               resize cost.
//
// Pure — reuses the existing vram-prediction primitives, adds no measurement.

import {
	assessVram,
	formatVramGiB,
	predictAddedVramBytes,
	type Dimensions,
	type VramInfo,
	type VramTier,
} from '../vram-prediction';

// Accumulator format is R32G32B32A32_FLOAT — 16 bytes per pixel. This is not
// tunable: fp16 accumulation stalls once the running sum passes ~2048 (the fp16
// ULP there is 2.0, so adding a unit sample rounds to nothing), and pre-normalised
// fp16 leaves ~3% relative error at 1000 samples — ~2000x coarser than the 16-bit
// master we write. See design note §3.
export const ACCUMULATOR_BYTES_PER_PIXEL = 16;

// Per-session GPU surfaces beyond the accumulators: the WGC source texture (RGBA8),
// OUR PRIVATE COPY of it (RGBA8), the resolve target (RGBA16), and one staging
// texture for readback (RGBA16).
//
// The private copy is not an optimisation we could drop to save the 4 B/px. WGC's
// frame pool is one buffer deep and reclaims the surface the instant the frame
// handler returns, so accumulating straight out of it races the compositor — see
// `AccumulateBackend::retain_frame`. Budgeting it here is what keeps the hard-refuse
// honest: the refusal names our own allocation, and this is part of it.
export const WORKING_BYTES_PER_PIXEL = 4 + 4 + 8 + 8;

export interface LongExposureVramEstimate {
	// Bytes for the accumulators alone — the allocation we control and are
	// therefore willing to hard-refuse on.
	accumulatorBytes: number;
	// Source/resolve/staging surfaces.
	workingBytes: number;
	// Accumulators + working set.
	ourTotalBytes: number;
	// Extra VRAM iRacing itself is predicted to allocate when its window grows to
	// the render size (existing resize predictor).
	simResizeBytes: number;
	// Everything above.
	combinedBytes: number;
}

// One accumulator per sink, and never fewer than one. Shared by the estimate and
// the refusal message below, which have to agree about whether a shot is a bracket
// — the message names bracketing as the way out, and naming it for a shot that is
// not one would be worse than naming nothing.
function normalizeSinkCount(sinkCount: unknown): number {
	return Math.max(1, Math.floor(Number(sinkCount)) || 1);
}

export function estimateLongExposureVram(opts: {
	renderWidth: number;
	renderHeight: number;
	sinkCount: number;
	// iRacing's current window size, for the resize delta. Null = unknown, in which
	// case the existing predictor conservatively returns 0.
	baseline?: Dimensions | null;
}): LongExposureVramEstimate {
	const { renderWidth, renderHeight, sinkCount, baseline } = opts;
	const pixels = Math.max(0, renderWidth) * Math.max(0, renderHeight);
	const sinks = normalizeSinkCount(sinkCount);

	const accumulatorBytes = pixels * ACCUMULATOR_BYTES_PER_PIXEL * sinks;
	const workingBytes = pixels * WORKING_BYTES_PER_PIXEL;
	const simResizeBytes = predictAddedVramBytes(
		{ width: renderWidth, height: renderHeight },
		baseline
	);

	const ourTotalBytes = accumulatorBytes + workingBytes;
	return {
		accumulatorBytes,
		workingBytes,
		ourTotalBytes,
		simResizeBytes,
		combinedBytes: ourTotalBytes + simResizeBytes,
	};
}

export interface LongExposureVramAssessment {
	estimate: LongExposureVramEstimate;
	// 'unknown' whenever VRAM measurement is unavailable — fail open, exactly as
	// the still-capture guardrail does.
	tier: VramTier;
	freeBytes: number | null;
	// True only when OUR OWN allocation cannot fit. This is the hard-refuse signal.
	refuse: boolean;
	// User-facing explanation when refusing, else null.
	refusalMessage: string | null;
}

export function assessLongExposureVram(opts: {
	info: VramInfo | null | undefined;
	renderWidth: number;
	renderHeight: number;
	sinkCount: number;
	baseline?: Dimensions | null;
}): LongExposureVramAssessment {
	const estimate = estimateLongExposureVram(opts);

	// Reuse the existing tiering for the combined cost by expressing our own
	// allocation as an equivalent pixel-count delta on top of the resize. This
	// keeps a single source of truth for margin policy.
	const combined = assessVram(
		opts.info,
		{ width: opts.renderWidth, height: opts.renderHeight },
		opts.baseline
	);
	const freeBytes = combined.freeBytes;

	// Fail open when we cannot measure — never refuse on a guess.
	if (freeBytes === null) {
		return {
			estimate,
			tier: 'unknown',
			freeBytes: null,
			refuse: false,
			refusalMessage: null,
		};
	}

	const refuse = estimate.ourTotalBytes > freeBytes;

	// Name the lever that actually caused it.
	//
	// This used to end "or turn off supersampling", a control that was removed on
	// 2026-08-03 — so the one message whose entire job is to say how to make the shot
	// fit was pointing at a switch the user could no longer find. What replaced it as
	// the dominant term is bracketing: the accumulators are the bulk of our
	// allocation and a bracket multiplies them by its stop count, so on a bracketed
	// shot it is both the likeliest cause and the cheapest thing to give up.
	const sinks = normalizeSinkCount(opts.sinkCount);
	const remedy =
		sinks > 1
			? `Turn off bracket shutters — ${sinks} stops means ${sinks} full-size accumulators — or lower the resolution.`
			: 'Lower the resolution.';
	const refusalMessage = refuse
		? `Long exposure needs ${formatVramGiB(estimate.ourTotalBytes)} of video memory for its accumulation buffers, but only ${formatVramGiB(freeBytes)} is free. ${remedy}`
		: null;

	// Our own buffers are additional to the resize delta the base assessment
	// covered, so escalate the tier when they eat the remaining headroom.
	let tier: VramTier = combined.tier;
	if (refuse) {
		tier = 'risk';
	} else if (
		tier === 'safe' &&
		estimate.combinedBytes + (combined.marginBytes ?? 0) > freeBytes
	) {
		tier = 'caution';
	}

	return { estimate, tier, freeBytes, refuse, refusalMessage };
}
