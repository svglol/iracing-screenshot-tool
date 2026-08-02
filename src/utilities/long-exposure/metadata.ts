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
export const SIDECAR_VERSION = 1;

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
		weighting: string;
		tonemap: string;
		exposureCompensationEv: number;
	};

	sampling: {
		predicted: number;
		achieved: number;
		duplicatesRejected: number;
		stalledPresents: number;
		dropouts: number;
		// medianGap / maxGap in sim time. 1.0 = perfectly even.
		evenness: number;
		medianGapSeconds: number;
		maxGapSeconds: number;
	};

	image: {
		width: number;
		height: number;
		supersample: number;
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
			weighting: recipe.weighting,
			tonemap: recipe.tonemap,
			exposureCompensationEv: recipe.exposureCompensation,
		},
		sampling: {
			predicted: plan.predictedSamples,
			achieved: stats.accepted,
			duplicatesRejected: stats.duplicatesRejected,
			stalledPresents: stats.stalledPresents,
			dropouts: stats.dropouts,
			evenness: Number(stats.evenness.toFixed(4)),
			medianGapSeconds: Number(stats.medianGapSeconds.toFixed(6)),
			maxGapSeconds: Number(stats.maxGapSeconds.toFixed(6)),
		},
		image: {
			width: opts.imageWidth,
			height: opts.imageHeight,
			supersample: recipe.supersample,
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
