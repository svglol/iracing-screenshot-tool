import { describe, expect, it } from 'vitest';
import {
	DROP_GAP_FACTOR,
	EVENNESS_WARN_THRESHOLD,
	describeSampleStats,
	shouldWarnAboutSampling,
	summarizeSamples,
	type SampleLogEntry,
} from './sample-stats';

// Build an evenly-sampled log at `step` seconds of SIM time between samples.
function evenLog(count: number, step = 1 / 60): SampleLogEntry[] {
	return Array.from({ length: count }, (_, i) => ({
		u: count > 1 ? i / (count - 1) : 1,
		sessionTime: 10 + i * step,
		replayFrameNum: 1000 + i,
		digest: `d${i}`,
		presentedAt: String(1000 + i),
		accepted: true,
	}));
}

describe('summarizeSamples', () => {
	it('reports a perfectly even capture as evenness 1', () => {
		const stats = summarizeSamples(evenLog(30));
		expect(stats.accepted).toBe(30);
		expect(stats.duplicatesRejected).toBe(0);
		expect(stats.evenness).toBeCloseTo(1);
		expect(stats.dropouts).toBe(0);
	});

	it('counts rejected duplicates separately from accepted samples', () => {
		const log = evenLog(10);
		log[4].accepted = false;
		log[4].digest = log[3].digest;
		const stats = summarizeSamples(log);
		expect(stats.accepted).toBe(9);
		expect(stats.duplicatesRejected).toBe(1);
	});

	// A repeated digest with a DIFFERENT presentation timestamp means iRacing
	// presented again without rendering anything new — a renderer stall, which has a
	// different fix from a re-delivered frame.
	it('distinguishes a stalled present from a re-delivered frame', () => {
		const log = evenLog(4);
		log[2].accepted = false;
		log[2].digest = log[1].digest;
		log[2].presentedAt = 'different';
		const stats = summarizeSamples(log);
		expect(stats.stalledPresents).toBe(1);
	});

	it('does not count a re-delivered identical frame as a stall', () => {
		const log = evenLog(4);
		log[2].accepted = false;
		log[2].digest = log[1].digest;
		log[2].presentedAt = log[1].presentedAt;
		expect(summarizeSamples(log).stalledPresents).toBe(0);
	});

	it('flags a gap well beyond the median as a dropout', () => {
		const log = evenLog(20);
		// Shift everything after index 10 forward, creating one long gap.
		for (let i = 10; i < log.length; i += 1) {
			log[i].sessionTime += 0.5;
		}
		const stats = summarizeSamples(log);
		expect(stats.dropouts).toBe(1);
		expect(stats.maxGapSeconds).toBeGreaterThan(
			stats.medianGapSeconds * DROP_GAP_FACTOR
		);
		expect(stats.evenness).toBeLessThan(1);
	});

	it('measures evenness as medianGap / maxGap', () => {
		const log = evenLog(5, 0.01);
		log[4].sessionTime = log[3].sessionTime + 0.04;
		const stats = summarizeSamples(log);
		expect(stats.medianGapSeconds).toBeCloseTo(0.01);
		expect(stats.maxGapSeconds).toBeCloseTo(0.04);
		expect(stats.evenness).toBeCloseTo(0.25);
	});

	// The sim time the exposure ACHIEVED. Since sub-replay-frame windows the planned
	// start is estimated within a replay frame, so this is what makes two shots of
	// the same recipe comparable rather than merely assumed to match.
	it('measures the window the samples actually covered', () => {
		expect(summarizeSamples(evenLog(30)).windowSeconds).toBeCloseTo(
			29 / 60,
			9
		);
		// A sub-frame window: 5 samples 1 ms apart is a 4 ms exposure, not 1/60.
		expect(summarizeSamples(evenLog(5, 0.001)).windowSeconds).toBeCloseTo(
			0.004,
			9
		);
	});

	// The native log is capped while the accepted counter is not, so reporting the
	// log's length would under-report a shot that outran it by thousands of samples.
	// These were the real numbers when the cap was 8192 and a 10" at 1/16 produced
	// ~11,700; the cap is now 65536 and out of reach, but the counter stays
	// authoritative and the truncation flag stays honest, which is what this pins.
	it('takes the accepted count from the uncapped counter when given one', () => {
		const stats = summarizeSamples(evenLog(8192, 0.001), {
			acceptedTotal: 11700,
		});
		expect(stats.accepted).toBe(11700);
		expect(stats.logTruncated).toBe(true);
	});

	it('does not claim truncation when the log holds everything', () => {
		const stats = summarizeSamples(evenLog(30), { acceptedTotal: 30 });
		expect(stats.accepted).toBe(30);
		expect(stats.logTruncated).toBe(false);
	});

	it('falls back to counting the log when no counter is supplied', () => {
		const stats = summarizeSamples(evenLog(30));
		expect(stats.accepted).toBe(30);
		expect(stats.logTruncated).toBe(false);
	});

	it('ignores a nonsensical counter rather than trusting it', () => {
		for (const bogus of [NaN, -5, undefined, null]) {
			const stats = summarizeSamples(evenLog(10), {
				acceptedTotal: bogus as never,
			});
			expect(stats.accepted).toBe(10);
			expect(stats.logTruncated).toBe(false);
		}
	});

	it('reports no window for a single sample', () => {
		expect(summarizeSamples(evenLog(1)).windowSeconds).toBe(0);
		expect(summarizeSamples([]).windowSeconds).toBe(0);
	});

	// A one-sample exposure has no gaps to be uneven about — which is the correct
	// result for a shutter fast enough that one rendered frame fills it.
	it('treats a single sample as evenly sampled by definition', () => {
		const stats = summarizeSamples(evenLog(1));
		expect(stats.accepted).toBe(1);
		expect(stats.evenness).toBe(1);
		expect(stats.medianGapSeconds).toBe(0);
	});

	it('handles an empty or malformed log without throwing', () => {
		expect(summarizeSamples([]).accepted).toBe(0);
		expect(
			summarizeSamples(null as unknown as SampleLogEntry[]).evenness
		).toBe(1);
	});

	it('ignores non-increasing session times rather than producing negative gaps', () => {
		const log = evenLog(4);
		log[2].sessionTime = log[1].sessionTime; // duplicate timestamp
		const stats = summarizeSamples(log);
		expect(stats.medianGapSeconds).toBeGreaterThan(0);
		expect(stats.maxGapSeconds).toBeGreaterThan(0);
	});

	it('measures gaps only between ACCEPTED samples', () => {
		// Rejected samples in the middle must not create phantom short gaps.
		const log = evenLog(5, 0.01);
		log[2].accepted = false;
		const stats = summarizeSamples(log);
		expect(stats.accepted).toBe(4);
		// The gap spanning the rejected sample is twice the base step.
		expect(stats.maxGapSeconds).toBeCloseTo(0.02);
	});
});

describe('shouldWarnAboutSampling', () => {
	it('warns when evenness drops below the threshold', () => {
		const log = evenLog(10, 0.01);
		log[9].sessionTime = log[8].sessionTime + 1;
		const stats = summarizeSamples(log);
		expect(stats.evenness).toBeLessThan(EVENNESS_WARN_THRESHOLD);
		expect(shouldWarnAboutSampling(stats)).toBe(true);
	});

	it('stays quiet for an even capture', () => {
		expect(shouldWarnAboutSampling(summarizeSamples(evenLog(30)))).toBe(
			false
		);
	});

	it('never warns about a single-sample exposure', () => {
		expect(shouldWarnAboutSampling(summarizeSamples(evenLog(1)))).toBe(false);
	});
});

// Multi-pass visits the same window N times, so the sample stream is N interleaved
// sequences rather than one. Which half of the report a metric belongs to is the
// whole design here: per-pass metrics answer "did a visit keep up with the sim",
// merged ones answer "what does the finished image contain".
describe('summarizeSamples — multi-pass', () => {
	// N passes over the same window, each internally even, offset by a fraction of
	// the step so they interleave — which is what the phase dither exists to force.
	function passes(count: number, perPass: number, step = 1 / 60) {
		const log: SampleLogEntry[] = [];
		for (let p = 0; p < count; p++) {
			for (let i = 0; i < perPass; i++) {
				log.push({
					u: perPass > 1 ? i / (perPass - 1) : 1,
					sessionTime: 10 + i * step + (p * step) / count,
					replayFrameNum: 1000 + i,
					digest: `p${p}d${i}`,
					presentedAt: String(p * 1000 + i),
					accepted: true,
					pass: p,
				});
			}
		}
		return log;
	}

	it('reports the pass count and treats an absent index as one pass', () => {
		expect(summarizeSamples(evenLog(30)).passes).toBe(1);
		expect(summarizeSamples(passes(4, 10)).passes).toBe(4);
	});

	// The trap this design exists to avoid: merged gaps from independent passes are
	// near-exponential, so a merged median/max would collapse and trip the warning
	// on a perfectly healthy capture.
	it('measures evenness within a pass, not across the merged stream', () => {
		const stats = summarizeSamples(passes(4, 12));
		expect(stats.evenness).toBeCloseTo(1);
		expect(stats.dropouts).toBe(0);
		expect(shouldWarnAboutSampling(stats)).toBe(false);
	});

	// medianGapSeconds is the per-frame consumption cost (frame-interpolation §9.7).
	// Adding passes does not make the GPU faster, so it must not move.
	it('keeps the median gap at the per-pass spacing, whatever the pass count', () => {
		const one = summarizeSamples(evenLog(12));
		const four = summarizeSamples(passes(4, 12));
		expect(four.medianGapSeconds).toBeCloseTo(one.medianGapSeconds, 9);
	});

	// The merged stream is what the image integrates, so its largest hole is the one
	// worth reporting — and interleaved passes genuinely shrink it.
	it('measures the max gap across the merged stream', () => {
		const one = summarizeSamples(evenLog(12));
		const four = summarizeSamples(passes(4, 12));
		expect(four.maxGapSeconds).toBeCloseTo(one.maxGapSeconds / 4, 9);
		expect(four.maxGapSeconds).toBeLessThan(four.medianGapSeconds);
	});

	// One hitched pass puts a clump in the image that three clean passes do not
	// remove, so the worst pass is reported rather than the average.
	it('reports the worst pass, not the mean of them', () => {
		const log = passes(3, 12);
		// Open a hole inside pass 1 only.
		for (const entry of log) {
			if (entry.pass === 1 && entry.u > 0.5) {
				entry.sessionTime += (1 / 60) * DROP_GAP_FACTOR * 2;
			}
		}
		const stats = summarizeSamples(log);
		expect(stats.evenness).toBeLessThan(EVENNESS_WARN_THRESHOLD);
		expect(stats.dropouts).toBe(1);
		// And the clean passes are still clean — the hole is one pass's fault.
		expect(
			summarizeSamples(log.filter((entry) => entry.pass !== 1)).evenness
		).toBeCloseTo(1);
	});

	it('spans the whole window across passes', () => {
		const stats = summarizeSamples(passes(4, 12));
		expect(stats.windowSeconds).toBeGreaterThan(
			summarizeSamples(evenLog(12)).windowSeconds
		);
	});
});

describe('describeSampleStats', () => {
	it('always reports the achieved sample count and evenness', () => {
		const text = describeSampleStats(summarizeSamples(evenLog(120)));
		expect(text).toContain('120 samples');
		expect(text).toContain('evenness 100%');
	});

	it('mentions rejections and dropouts only when they happened', () => {
		const clean = describeSampleStats(summarizeSamples(evenLog(10)));
		expect(clean).not.toContain('duplicates');
		expect(clean).not.toContain('dropout');

		const log = evenLog(10);
		log[3].accepted = false;
		expect(describeSampleStats(summarizeSamples(log))).toContain(
			'1 duplicates rejected'
		);
	});
});
