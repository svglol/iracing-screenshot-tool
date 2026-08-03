// The metadata sidecar (design note §8).
//
// A long exposure is a reusable, deterministic RECIPE rather than a one-shot
// action, so "reproduce this shot" should be a file copy. The sidecar therefore
// carries the complete recipe verbatim alongside what actually happened when it
// ran — achieved sample count, duplicates rejected, sampling evenness, the compute
// backend used, and where the anchor was.
//
// It also carries `variantId` (always null in v1), which is the Spotter Pack seam:
// batch capture across paints writes that field and changes nothing else.
//
// Pure — building the object is separate from writing it, so the shape is testable
// without a filesystem.

import type { LongExposureRecipe } from './shot-recipe';
import type { ResolvedPlan } from './shot-recipe';
import type { SampleStats } from './sample-stats';

// Bumped only when the sidecar shape changes incompatibly, so a future reader can
// tell what it is looking at.
//
// 2 — sub-replay-frame exposure windows. `exposure.effectiveMs` can now be shorter
//     than one replay frame (16.67 ms), and `sampling.achievedWindowSeconds` says
//     what the shot actually covered. THE MEANING OF v1 CHANGED for the fast half
//     of the ladder: a v1 sidecar reading `shutter: '1/250'` with
//     `effectiveMs: 16.67` recorded a shot that was asked for 1/250 and given
//     1/60. Re-executing that recipe on this build honours the 1/250 it asked for,
//     so the image will differ — deliberately, and the two sidecars say why.
//
// 3 — multi-pass accumulation. `recipe.passes` can now exceed 1, and when it does
//     `sampling.predicted` and `sampling.achieved` both count EVERY pass while
//     `exposure.*` still describes the single window all of them visited. A v1/v2
//     sidecar has no `passes` field, which reads as 1 and is exactly what those
//     captures did — so unlike the v1→v2 change, nothing about their meaning moved.
//     `sampling.maxGapSeconds` is now measured across the MERGED sample stream while
//     `evenness` and `medianGapSeconds` stay WITHIN a pass; at one pass all three are
//     what they always were.
//
// 4 — supersampling removed, and THE MEANING OF v1-v3 CHANGED for any sidecar that
//     used it. `image.supersample` is gone, and `image.renderWidth`/`renderHeight`
//     now always equal `image.width`/`height` because the render size and the saved
//     size are the same thing again. A v1-v3 sidecar reading `supersample: 2` with
//     `width: 1920, renderWidth: 3840` recorded a shot rendered at 3840 and saved at
//     1920; re-executing that recipe here renders AND saves at 1920, so the image
//     will differ in both antialiasing and dimensions. That is deliberate, it cannot
//     be reproduced on this build, and the two sidecars say why.
export const SIDECAR_VERSION = 4;

export interface LongExposureSidecar {
	sidecarVersion: number;
	tool: { name: string; version: string };
	capturedAt: string;

	// The complete, re-executable recipe. This is the reproducibility contract.
	recipe: LongExposureRecipe;

	exposure: {
		// What the recipe asked for, and what replay-frame quantisation actually
		// produced — reported separately so a 1/8 that became 8 frames is honest.
		requestedMs: number;
		effectiveMs: number;
		windowFrames: number;
		startFrame: number;
		anchorFrame: number;
		playbackSpeed: string;
		// How many times the window above was visited, summing into one accumulator.
		// 1 is an ordinary capture. Duplicated from `recipe.passes` because this block
		// is what a human reads to understand how the shot was made, and every other
		// field here describes ONE visit.
		passes: number;
		weighting: string;
		tonemap: string;
		exposureCompensationEv: number;
		// Stops of gain applied to near-clipped values before accumulation. 0 = off,
		// which is exactly identity — so a sidecar reading 0 describes the same
		// pipeline that existed before highlight recovery did.
		highlightRecoveryStops: number;
	};

	sampling: {
		predicted: number;
		// REAL captured frames. `recipe.interpolationFactor` records what was asked
		// for, `interpolation` below records what happened — so this number stays
		// comparable across shots with interpolation on and off, which is the whole
		// point of keeping it separate from `synthesized`.
		achieved: number;
		synthesized: number;
		duplicatesRejected: number;
		stalledPresents: number;
		dropouts: number;
		// medianGap / maxGap in sim time. 1.0 = perfectly even.
		//
		// On a multi-pass shot these split: `evenness` and `medianGapSeconds` are
		// computed WITHIN a pass (worst pass reported for evenness), because they
		// describe whether one visit kept up with the sim; `maxGapSeconds` is measured
		// across the MERGED sample stream, because the biggest hole in the combined
		// sampling is what the image actually shows. See sample-stats.ts.
		evenness: number;
		medianGapSeconds: number;
		maxGapSeconds: number;
		// Sim time from the first accepted sample to the last — the window the shot
		// ACHIEVED, next to the one `exposure.effectiveMs` planned. Since sub-frame
		// windows the planned start is estimated within a replay frame, so this is
		// what makes a re-shoot comparable rather than assumed (design note §9).
		achievedWindowSeconds: number;
		// True when the capture produced more samples than the native diagnostic log
		// holds (MAX_SAMPLE_LOG, 65536). No recipe the UI can build reaches that, so
		// this should now always be false; it stays in the sidecar because the reader
		// cannot otherwise tell a prefix measurement from a whole one, and it was true
		// on captures taken while the cap was 8192. `achieved` is exact either way —
		// it comes from the uncapped counter — but the gap metrics and
		// `achievedWindowSeconds` describe the logged prefix when this is set.
		logTruncated: boolean;
	};

	// What optical-flow interpolation actually did. Null when the addon predates the
	// feature; `enabled: false` with a reason on hardware that cannot do it.
	interpolation: {
		requestedFactor: number;
		enabled: boolean;
		achievedFactor: number;
		reason: string | null;
		gridSize: number;
		bidirectional: boolean;
		// CPU-side per-frame cost, EXCLUDING the first frame. Since the digest
		// readback stopped blocking these no longer include waiting on the GPU, so a
		// small value does NOT prove the capture kept up — `achievedRatio` is the
		// number that answers that.
		meanFrameMs: number | null;
		maxFrameMs: number | null;
		// The first frame alone: sink allocation plus NVOFA session creation.
		setupFrameMs: number | null;
		// Render megapixels x achieved factor — how much interpolation work this shot
		// asked for, comparable across shots and machines.
		load: number;
		// achieved / predicted REAL samples. The ground truth for "did interpolation
		// cost us real frames". Well below 1 means it did.
		achievedRatio: number | null;
	} | null;

	image: {
		width: number;
		height: number;
		// Equal to width/height since supersampling was removed. Both are still
		// recorded: a future reader comparing them across versions is exactly how the
		// v1-v3 shots stay legible.
		renderWidth: number;
		renderHeight: number;
		bitDepth: number;
	};

	compute: { backend: string | null };

	context: {
		track: string | null;
		car: string | null;
		driver: string | null;
		sessionType: string | null;
		sessionNum: number;
		// Spotter Pack seam — unused in v1.
		variantId: string | null;
	};
}

// irsdk session/telemetry shapes are untyped upstream (see filenameFormat.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
function firstString(...values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) {
			return value;
		}
	}
	return null;
}

// Pull the human-meaningful context out of the session YAML. Every field is
// best-effort: a missing one becomes null rather than failing the sidecar, because
// the sidecar must never be the reason a shot is lost.
export function extractSessionContext(
	sessionInfo: any,
	telemetry: any
): Pick<
	LongExposureSidecar['context'],
	'track' | 'car' | 'driver' | 'sessionType'
> {
	const data = sessionInfo?.data ?? sessionInfo ?? {};
	const weekend = data?.WeekendInfo ?? {};
	const drivers = data?.DriverInfo?.Drivers;
	const driverIdx = data?.DriverInfo?.DriverCarIdx;
	const driver =
		Array.isArray(drivers) && typeof driverIdx === 'number'
			? drivers.find((entry: any) => entry?.CarIdx === driverIdx) ||
				drivers[driverIdx]
			: null;

	const sessionNum = telemetry?.values?.SessionNum;
	const sessions = data?.SessionInfo?.Sessions;
	const session =
		Array.isArray(sessions) && typeof sessionNum === 'number'
			? sessions.find((entry: any) => entry?.SessionNum === sessionNum)
			: null;

	return {
		track: firstString(weekend.TrackDisplayName, weekend.TrackName),
		car: firstString(driver?.CarScreenName, driver?.CarPath),
		driver: firstString(driver?.UserName, driver?.TeamName),
		sessionType: firstString(session?.SessionType, weekend.EventType),
	};
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function buildSidecar(opts: {
	recipe: LongExposureRecipe;
	plan: ResolvedPlan;
	stats: SampleStats;
	backend: string | null;
	interpolation?: LongExposureSidecar['interpolation'];
	// MEASURED count of synthesised in-betweens, not derived from the factor. They
	// can differ: a frame whose flow estimation failed contributes its real sample
	// and no synthetic ones, and the sidecar should record what happened.
	synthesizedSamples?: number;
	imageWidth: number;
	imageHeight: number;
	toolName: string;
	toolVersion: string;
	capturedAt: string;
	context: Pick<
		LongExposureSidecar['context'],
		'track' | 'car' | 'driver' | 'sessionType'
	>;
}): LongExposureSidecar {
	const { recipe, plan, stats, context } = opts;

	return {
		sidecarVersion: SIDECAR_VERSION,
		tool: { name: opts.toolName, version: opts.toolVersion },
		capturedAt: opts.capturedAt,
		recipe,
		exposure: {
			requestedMs: recipe.exposureMs,
			effectiveMs: plan.effectiveExposureSeconds * 1000,
			windowFrames: plan.windowFrames,
			startFrame: plan.startFrame,
			anchorFrame: plan.anchorFrame,
			playbackSpeed:
				plan.playbackDivisor === 1 ? '1x' : `1/${plan.playbackDivisor}`,
			passes: plan.passes,
			weighting: recipe.weighting,
			tonemap: recipe.tonemap,
			exposureCompensationEv: recipe.exposureCompensation,
			highlightRecoveryStops: recipe.highlightRecovery,
		},
		sampling: {
			// The TOTAL across every pass, because `achieved` below is cumulative too.
			// Pairing a per-pass prediction with a cumulative count would make an
			// 8-pass shot read as having beaten its prediction eightfold.
			predicted: plan.predictedTotalSamples,
			achieved: stats.accepted,
			synthesized: Math.max(0, Math.round(opts.synthesizedSamples ?? 0)),
			duplicatesRejected: stats.duplicatesRejected,
			stalledPresents: stats.stalledPresents,
			dropouts: stats.dropouts,
			evenness: Number(stats.evenness.toFixed(4)),
			medianGapSeconds: Number(stats.medianGapSeconds.toFixed(6)),
			maxGapSeconds: Number(stats.maxGapSeconds.toFixed(6)),
			achievedWindowSeconds: Number(stats.windowSeconds.toFixed(6)),
			logTruncated: stats.logTruncated === true,
		},
		interpolation: opts.interpolation ?? null,
		image: {
			width: opts.imageWidth,
			height: opts.imageHeight,
			renderWidth: plan.renderWidth,
			renderHeight: plan.renderHeight,
			bitDepth: recipe.outputFormat === 'png16' ? 16 : 8,
		},
		compute: { backend: opts.backend },
		context: {
			...context,
			sessionNum: recipe.sessionNum,
			variantId: recipe.variantId,
		},
	};
}

export function serializeSidecar(sidecar: LongExposureSidecar): string {
	return `${JSON.stringify(sidecar, null, 2)}\n`;
}
