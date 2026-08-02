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
