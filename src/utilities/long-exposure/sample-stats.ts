// Temporal-evenness and duplicate reporting for a long-exposure capture
// (design note §7).
//
// WGC delivers on present, so if iRacing's render rate and our sampling diverge we
// get repeated or missing samples and the exposure is unevenly distributed across
// the window. JRT exposes this by blending consecutive captured PAIRS and asking
// the user to eyeball whether the overlap looks equal. We compute it instead — the
// same information as a number, available on every shot, with no diagnostic
// capture required.
//
// Important: none of this changes EXPOSURE. Resolve normalises by the accumulated
// sum of weights, so rejected duplicates and dropped frames simply don't contribute
// to either sum and the average stays correct (design note §5). This module is
// purely a QUALITY report.
//
// Pure — no GPU, no SDK, no I/O.

// One entry of the capped per-sample log the native session returns.
export interface SampleLogEntry {
	// Normalised window position the sample was accumulated at (1 = anchor).
	u: number;
	// Replay session time at grab, in seconds. The evenness metric is computed in
	// SIM time, not wall time — wall-clock jitter during slow motion is expected
	// and harmless; sim-time jitter is what unevenly weights the exposure.
	sessionTime: number;
	// ReplayFrameNum at grab.
	replayFrameNum: number;
	// GPU-side content digest. Equal consecutive digests = iRacing presented
	// identical content.
	digest: string;
	// WGC presentation timestamp (SystemRelativeTime, 100ns units) as a string —
	// it exceeds 2^53 as a raw count in some sessions, so it is never arithmetic'd
	// here, only compared for equality.
	presentedAt: string;
	// Whether the sample was accumulated (false = rejected duplicate).
	accepted: boolean;
}

export interface SampleStats {
	// Samples actually accumulated.
	accepted: number;
	// Frames rejected because their digest matched the immediately preceding frame.
	duplicatesRejected: number;
	// Frames whose digest repeated but whose presentation timestamp did NOT — the
	// specific signature of a stalled renderer rather than a re-delivered frame.
	stalledPresents: number;
	// Sim-time gaps between consecutive ACCEPTED samples, in seconds.
	medianGapSeconds: number;
	maxGapSeconds: number;
	// medianGap / maxGap ∈ (0,1]. 1.0 = perfectly even sampling. Below
	// EVENNESS_WARN_THRESHOLD the capture had a visible hitch and the streak will
	// show a brighter clump where sampling bunched up.
	evenness: number;
	// Gaps beyond DROP_GAP_FACTOR × median — i.e. probable dropped frames.
	dropouts: number;
	// Sim time from the first accepted sample to the last: the window the exposure
	// ACHIEVED, as opposed to the one it planned.
	//
	// Worth recording since sub-replay-frame windows landed. The window start is
	// now estimated within a replay frame from wall clock, so two captures of the
	// same recipe can differ slightly in exposure DURATION rather than only in
	// sample jitter (design note §9). This is the number that lets a re-shoot be
	// compared instead of assumed.
	//
	// When `logTruncated` is set this covers the logged PREFIX, not the whole
	// exposure — see below.
	windowSeconds: number;
	// The native sample log is capped (MAX_SAMPLE_LOG, 8192 entries) while the
	// accepted counter is not, so a long enough exposure produces more samples than
	// the log can hold: 10" at 1/16 playback and 73 fps is ~11,700. Accumulation is
	// unaffected — the log is a diagnostic, the GPU accumulator is the shot — but
	// every metric derived from the log then describes a prefix rather than the
	// whole capture.
	//
	// `accepted` stays exact regardless, because it is taken from the counter.
	// `windowSeconds`, the gaps and `evenness` are prefix measurements when this is
	// true, and saying so beats quietly reporting an 8.5 s window for a 10 s shot.
	logTruncated: boolean;
}

// A gap this many times the median counts as a dropout rather than jitter.
export const DROP_GAP_FACTOR = 2.5;
// Below this evenness the review step warns the user.
export const EVENNESS_WARN_THRESHOLD = 0.5;

function median(sorted: number[]): number {
	if (sorted.length === 0) {
		return 0;
	}
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2
		: sorted[mid];
}

export function summarizeSamples(
	log: SampleLogEntry[],
	opts: {
		// The native session's own accepted counter, which is not capped. Pass it
		// whenever it is available: it is the only exact count once an exposure
		// outruns the log.
		acceptedTotal?: number | null;
	} = {}
): SampleStats {
	const entries = Array.isArray(log) ? log : [];
	const accepted = entries.filter((entry) => entry.accepted);
	const rejected = entries.filter((entry) => !entry.accepted);

	const counterTotal =
		typeof opts.acceptedTotal === 'number' &&
		Number.isFinite(opts.acceptedTotal) &&
		opts.acceptedTotal >= 0
			? Math.round(opts.acceptedTotal)
			: null;
	const acceptedCount = counterTotal ?? accepted.length;
	const logTruncated = counterTotal !== null && counterTotal > accepted.length;

	// A rejected duplicate whose presentation timestamp differs from the frame it
	// duplicates means iRacing presented again without rendering anything new —
	// a renderer stall, not a WGC re-delivery. Worth distinguishing in the log
	// because the two have different fixes (lower resolution vs. lower fps target).
	let stalledPresents = 0;
	for (let i = 1; i < entries.length; i += 1) {
		if (
			!entries[i].accepted &&
			entries[i].digest === entries[i - 1].digest &&
			entries[i].presentedAt !== entries[i - 1].presentedAt
		) {
			stalledPresents += 1;
		}
	}

	const gaps: number[] = [];
	for (let i = 1; i < accepted.length; i += 1) {
		const gap = accepted[i].sessionTime - accepted[i - 1].sessionTime;
		if (Number.isFinite(gap) && gap > 0) {
			gaps.push(gap);
		}
	}

	const span =
		accepted.length > 1
			? accepted[accepted.length - 1].sessionTime - accepted[0].sessionTime
			: 0;
	const windowSeconds = Number.isFinite(span) && span > 0 ? span : 0;

	// Fewer than two accepted samples means there are no gaps to be uneven about.
	// A one-sample exposure — the correct result for a fast enough shutter — is
	// evenly sampled by definition.
	if (gaps.length === 0) {
		return {
			accepted: acceptedCount,
			duplicatesRejected: rejected.length,
			stalledPresents,
			medianGapSeconds: 0,
			maxGapSeconds: 0,
			evenness: 1,
			dropouts: 0,
			windowSeconds,
			logTruncated,
		};
	}

	const sorted = [...gaps].sort((a, b) => a - b);
	const medianGapSeconds = median(sorted);
	const maxGapSeconds = sorted[sorted.length - 1];
	const dropouts = gaps.filter(
		(gap) => gap > medianGapSeconds * DROP_GAP_FACTOR
	).length;

	return {
		accepted: acceptedCount,
		duplicatesRejected: rejected.length,
		stalledPresents,
		medianGapSeconds,
		maxGapSeconds,
		evenness: maxGapSeconds > 0 ? medianGapSeconds / maxGapSeconds : 1,
		dropouts,
		windowSeconds,
		logTruncated,
	};
}

// One-line human summary for the review step and the log.
export function describeSampleStats(stats: SampleStats): string {
	const parts = [`${stats.accepted} samples`];
	if (stats.duplicatesRejected > 0) {
		parts.push(`${stats.duplicatesRejected} duplicates rejected`);
	}
	if (stats.dropouts > 0) {
		parts.push(`${stats.dropouts} dropout${stats.dropouts === 1 ? '' : 's'}`);
	}
	parts.push(`evenness ${(stats.evenness * 100).toFixed(0)}%`);
	return parts.join(', ');
}

// Whether the review step should warn about sampling quality.
export function shouldWarnAboutSampling(stats: SampleStats): boolean {
	return stats.accepted > 1 && stats.evenness < EVENNESS_WARN_THRESHOLD;
}
