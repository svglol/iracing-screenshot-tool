import { describe, it, expect } from 'vitest';
import {
	blackFrameDigest,
	referenceDigest,
	summarizeFrameContent,
} from './frame-content';
import type { SampleLogEntry } from './sample-stats';

function sample(
	digest: string,
	overrides: Partial<SampleLogEntry> = {}
): SampleLogEntry {
	return {
		u: 0,
		sessionTime: 0,
		replayFrameNum: 0,
		digest,
		presentedAt: '0',
		accepted: true,
		pass: 0,
		...overrides,
	};
}

describe('blackFrameDigest', () => {
	// The claim the whole detector rests on: the fast path is a specialisation of
	// the real kernel, not a second transcription of it that could drift.
	it('agrees with the general reduction over an all-zero frame', () => {
		for (const [w, h] of [
			[1920, 1080],
			[1906, 1073],
			[3840, 2160],
			[7, 5],
			[1, 1],
		]) {
			expect(blackFrameDigest(w, h)).toBe(
				referenceDigest(w, h, () => [0, 0, 0])
			);
		}
	});

	it('is 16 lowercase hex digits, matching the native format', () => {
		expect(blackFrameDigest(1920, 1080)).toMatch(/^[0-9a-f]{16}$/);
	});

	it('depends on the frame size', () => {
		expect(blackFrameDigest(1920, 1080)).not.toBe(
			blackFrameDigest(1906, 1073)
		);
		expect(blackFrameDigest(1920, 1080)).not.toBe(
			blackFrameDigest(3840, 2160)
		);
	});

	// Alpha is not hashed, so an opaque black frame and a transparent one are the
	// same digest — which is what makes the test work whatever WGC puts in .a.
	it('ignores alpha', () => {
		expect(referenceDigest(64, 64, () => [0, 0, 0])).toBe(
			blackFrameDigest(64, 64)
		);
	});

	it('does not match a frame with any colour in it', () => {
		const black = blackFrameDigest(256, 256);
		// A single lit texel on the sampled grid is enough to move it.
		const oneTexel = referenceDigest(256, 256, (x, y) =>
			x === 128 && y === 128 ? [1, 0, 0] : [0, 0, 0]
		);
		expect(oneTexel).not.toBe(black);
		// ...and so is a uniform near-black, which is the closest a real render gets.
		expect(referenceDigest(256, 256, () => [1, 1, 1])).not.toBe(black);
	});

	// A lit texel BETWEEN grid points is invisible to the digest by construction.
	// Recorded so nobody later mistakes it for a bug: the digest is a duplicate
	// detector, and this test documents its sampling, not a defect.
	it('samples every fourth texel on each axis', () => {
		const black = blackFrameDigest(64, 64);
		expect(
			referenceDigest(64, 64, (x, y) =>
				x === 1 && y === 1 ? [255, 255, 255] : [0, 0, 0]
			)
		).toBe(black);
		expect(
			referenceDigest(64, 64, (x, y) =>
				x === 4 && y === 4 ? [255, 255, 255] : [0, 0, 0]
			)
		).not.toBe(black);
	});

	it('returns null rather than guessing when the size is unknown', () => {
		expect(blackFrameDigest(0, 1080)).toBeNull();
		expect(blackFrameDigest(1920, 0)).toBeNull();
		expect(blackFrameDigest(Number.NaN, 1080)).toBeNull();
	});
});

describe('summarizeFrameContent', () => {
	const size = { width: 1920, height: 1080 };
	const black = blackFrameDigest(1920, 1080) as string;

	it('reports a healthy capture as neither blank nor frozen', () => {
		const log = Array.from({ length: 40 }, (_, i) =>
			sample(i.toString(16).padStart(16, '0'))
		);
		const report = summarizeFrameContent(log, size);
		expect(report.digested).toBe(40);
		expect(report.distinct).toBe(40);
		expect(report.blackSamples).toBe(0);
		expect(report.allBlack).toBe(false);
		expect(report.frozen).toBe(false);
	});

	// The field case: hundreds of frames consumed, every one of them black.
	it('flags a capture whose every frame is black', () => {
		const log = Array.from({ length: 724 }, () => sample(black));
		const report = summarizeFrameContent(log, size);
		expect(report.blackSamples).toBe(724);
		expect(report.allBlack).toBe(true);
		// It is also frozen, but `allBlack` is the finding that matters: black says
		// the capture contains nothing, frozen only says it contains one thing.
		expect(report.frozen).toBe(true);
	});

	it('flags a frozen capture that is not black', () => {
		const log = Array.from({ length: 68 }, () => sample('a1b2c3d4e5f60718'));
		const report = summarizeFrameContent(log, size);
		expect(report.allBlack).toBe(false);
		expect(report.frozen).toBe(true);
		expect(report.distinct).toBe(1);
	});

	// A one-sample exposure is the correct result for a fast enough shutter. It has
	// exactly one distinct frame and must not be called frozen for it.
	it('does not call a single-sample exposure frozen', () => {
		const report = summarizeFrameContent([sample('a1b2c3d4e5f60718')], size);
		expect(report.frozen).toBe(false);
		expect(report.allBlack).toBe(false);
	});

	// One black frame among real ones is a dropped present, not a blank capture.
	it('does not flag a capture that merely contains a black frame', () => {
		const log = [
			sample(black),
			sample('0102030405060708'),
			sample('1112131415161718'),
		];
		const report = summarizeFrameContent(log, size);
		expect(report.blackSamples).toBe(1);
		expect(report.allBlack).toBe(false);
		expect(report.frozen).toBe(false);
	});

	// The digest is computed over the frame WGC delivered. Comparing against the
	// requested size would never match on any machine where the two differ — which
	// is exactly the machine this was written for (it delivered 1906x1073 for a
	// requested 1920x1080 on two of its runs).
	it('measures against the delivered size, not another one', () => {
		const log = Array.from({ length: 8 }, () => sample(black));
		expect(summarizeFrameContent(log, size).allBlack).toBe(true);
		expect(
			summarizeFrameContent(log, { width: 1906, height: 1073 }).allBlack
		).toBe(false);
	});

	it('degrades to "nothing to say" when the size is unknown', () => {
		const log = Array.from({ length: 8 }, () => sample(black));
		const report = summarizeFrameContent(log, { width: 0, height: 0 });
		expect(report.blackDigest).toBeNull();
		expect(report.blackSamples).toBe(0);
		expect(report.allBlack).toBe(false);
		// Frozen still works — it needs no reference value.
		expect(report.frozen).toBe(true);
	});

	it('ignores entries with no digest and survives a missing log', () => {
		const log = [sample(black), sample(''), sample(black)];
		const report = summarizeFrameContent(log, size);
		expect(report.digested).toBe(2);
		expect(report.allBlack).toBe(true);
		expect(summarizeFrameContent([], size).allBlack).toBe(false);
		expect(
			summarizeFrameContent(undefined as unknown as SampleLogEntry[], size)
				.digested
		).toBe(0);
	});
});
