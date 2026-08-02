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
// the resolve target (RGBA16), and one staging texture for readback (RGBA16).
export const WORKING_BYTES_PER_PIXEL = 4 + 8 + 8;

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
	const sinks = Math.max(1, Math.floor(sinkCount) || 1);

	const accumulatorBytes = pixels * ACCUMULATOR_BYTES_PER_PIXEL * sinks;
	const workingBytes = pixels * WORKING_BYTES_PER_PIXEL;
	const simResizeBytes = predictAddedVramBytes(
		{ width: renderWidth, height: renderHeight },
		baseline
	);

	return {
		accumulatorBytes,
		workingBytes,
		ourTotalBytes: accumulatorBytes + workingBytes,
		simResizeBytes,
		combinedBytes: accumulatorBytes + workingBytes + simResizeBytes,
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
	const refusalMessage = refuse
		? `Long exposure needs ${formatVramGiB(estimate.ourTotalBytes)} of video memory for its accumulation buffers, but only ${formatVramGiB(freeBytes)} is free. Lower the resolution or turn off supersampling.`
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
