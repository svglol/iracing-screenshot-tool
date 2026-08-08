// What the per-sample digests say about the CONTENT of a capture.
//
// Everything else in the long-exposure report describes how the shot was SAMPLED —
// how many frames arrived, how evenly they were spaced, how many were duplicates.
// None of it can tell a good exposure from a capture of nothing, and that gap is not
// theoretical: a field report on Windows 10 22H2 produced black images on every
// attempt while the pipeline reported total success, because
//
//   - `accepted` counts frames CONSUMED, whatever they contain;
//   - `evenness` takes its "no gaps to be uneven about" branch precisely BECAUSE
//     every frame after the first was a duplicate, and so reported 100%;
//   - `meanFrameMs` measures CPU submission and never touches the GPU.
//
// So the one signal that carries content — the GPU digest CSDigest already computes
// for duplicate detection — was being reduced to a duplicate count and thrown away.
// This module reads it properly.
//
// Pure: no GPU, no I/O, no state beyond a memo of the black digest per size.

import type { SampleLogEntry } from './sample-stats';

// Must match DIGEST_STRIDE in native/wgc-capture/src/longexp/shaders.hlsl.
const DIGEST_STRIDE = 4;

// The mixing constants CSDigest uses. Named here so the correspondence is greppable
// from either side; a test pins the whole reproduction against a worked example.
const MIX_PACKED = 0x9e3779b1;
const MIX_X = 0x85ebca6b;
const MIX_Y = 0xc2b2ae35;
const MIX_LANE1 = 0x27d4eb2f;

// A 64-bit digest is 16 lowercase hex digits — the exact format the native side
// produces with `format!("{:016x}", ...)`.
function formatDigest(lane0: number, lane1: number): string {
	return ((BigInt(lane1 >>> 0) << 32n) | BigInt(lane0 >>> 0))
		.toString(16)
		.padStart(16, '0');
}

// Memoised because the answer depends only on the frame size, and a 6400x3600
// capture walks 1.44 M grid points to get it. One capture asks once; a bracket asks
// once per stop with identical dimensions.
const blackDigestCache = new Map<string, string>();

// The exact digest CSDigest produces for a frame whose RGB is zero everywhere.
//
// EXACTLY, not approximately, and that is what makes this usable as a hard test
// rather than a heuristic. The kernel is deterministic in three separate senses:
// the sampled grid is fixed by the dispatch (`p = tid * DIGEST_STRIDE`, guarded by
// `p >= gSize`, so the visited set is exactly {0, 4, 8, ...} < size on each axis);
// the per-texel mix is pure arithmetic on the quantised 8-bit colour and the
// position; and both accumulations — InterlockedAdd and InterlockedXor — are
// order-independent, which the shader comment calls out as deliberate. With the
// colour term pinned to zero the whole value collapses to a function of width and
// height alone.
//
// Alpha is deliberately not part of it: CSDigest hashes only rgb, so this matches a
// black frame whether it arrives opaque or fully transparent.
export function blackFrameDigest(width: number, height: number): string | null {
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width < 1 ||
		height < 1
	) {
		return null;
	}
	const w = Math.floor(width);
	const h = Math.floor(height);
	const key = `${w}x${h}`;
	const cached = blackDigestCache.get(key);
	if (cached !== undefined) {
		return cached;
	}

	let lane0 = 0;
	let lane1 = 0;
	for (let py = 0; py < h; py += DIGEST_STRIDE) {
		// The y term is invariant across the row, so hoist it. `Math.imul` is the
		// only way to get C-style uint32 wraparound out of JS multiplication —
		// plain `*` goes through a double and loses the low bits above 2^53.
		const yTerm = Math.imul(py, MIX_Y);
		for (let px = 0; px < w; px += DIGEST_STRIDE) {
			// packed === 0 for black, so `packed * MIX_PACKED` drops out entirely.
			let mixed = (Math.imul(px, MIX_X) + yTerm) >>> 0;
			mixed = (mixed ^ (mixed >>> 15)) >>> 0;
			lane0 = (lane0 + mixed) >>> 0;
			lane1 = (lane1 ^ Math.imul(mixed, MIX_LANE1)) >>> 0;
		}
	}

	const digest = formatDigest(lane0, lane1);
	blackDigestCache.set(key, digest);
	return digest;
}

// The same reduction over arbitrary pixel data, used only by the tests to prove the
// black case above is a specialisation of the real kernel rather than a second,
// independently-wrong transcription of it.
//
// `rgb(x, y)` returns the three 8-bit channel values at that texel.
export function referenceDigest(
	width: number,
	height: number,
	rgb: (x: number, y: number) => [number, number, number]
): string {
	let lane0 = 0;
	let lane1 = 0;
	for (let py = 0; py < height; py += DIGEST_STRIDE) {
		for (let px = 0; px < width; px += DIGEST_STRIDE) {
			const [r, g, b] = rgb(px, py);
			const packed =
				((r & 0xff) | ((g & 0xff) << 8) | ((b & 0xff) << 16)) >>> 0;
			let mixed =
				(Math.imul(packed, MIX_PACKED) +
					Math.imul(px, MIX_X) +
					Math.imul(py, MIX_Y)) >>>
				0;
			mixed = (mixed ^ (mixed >>> 15)) >>> 0;
			lane0 = (lane0 + mixed) >>> 0;
			lane1 = (lane1 ^ Math.imul(mixed, MIX_LANE1)) >>> 0;
		}
	}
	return formatDigest(lane0, lane1);
}

export interface FrameContentReport {
	// Samples carrying a usable digest. Can be below the accepted count when the
	// native log was capped, and is 0 on an addon build that reports no digests.
	digested: number;
	// How many DIFFERENT frames the capture actually saw. This is the number the
	// duplicate count was always a proxy for, and unlike the duplicate count it does
	// not depend on where the pass boundaries fell.
	distinct: number;
	// The digest an all-black frame of the delivered size would produce, or null when
	// the size is unknown.
	blackDigest: string | null;
	// How many of the sampled frames were exactly black.
	blackSamples: number;
	// EVERY sampled frame was black. The capture contains nothing — saving it would
	// hand the user a black file and call it a success.
	allBlack: boolean;
	// More than one frame arrived and they were all the same. The image is a still,
	// not an exposure: iRacing rendered nothing new for the whole window.
	frozen: boolean;
}

// Read the content story out of a native sample log.
//
// `width`/`height` are the dimensions WGC actually DELIVERED, not the ones that were
// requested — the digest is computed over the delivered frame, so comparing against
// the requested size would silently never match on any machine where the two differ.
export function summarizeFrameContent(
	log: SampleLogEntry[],
	frame: { width: number; height: number }
): FrameContentReport {
	const entries = Array.isArray(log) ? log : [];
	const blackDigest = blackFrameDigest(frame.width, frame.height);

	const seen = new Set<string>();
	let digested = 0;
	let blackSamples = 0;
	for (const entry of entries) {
		const digest = entry?.digest;
		if (typeof digest !== 'string' || digest.length === 0) {
			continue;
		}
		digested += 1;
		seen.add(digest);
		if (blackDigest !== null && digest === blackDigest) {
			blackSamples += 1;
		}
	}

	return {
		digested,
		distinct: seen.size,
		blackDigest,
		blackSamples,
		allBlack: digested > 0 && blackSamples === digested,
		// One sample is a legitimate outcome for a fast enough shutter and is not
		// frozen — there was never a second frame to differ from.
		frozen: digested > 1 && seen.size === 1,
	};
}
