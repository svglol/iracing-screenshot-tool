// Writing a long exposure to disk (design note §8).
//
// Three artefacts per shot:
//   master     16-bit PNG via our own encoder (sharp reduces 16-bit to 8 before
//              encoding — see utilities/long-exposure/png16.ts), or the user's
//              8-bit format when they chose one.
//   preview    8-bit sRGB in the configured still-capture format, so a long
//              exposure lands in the existing gallery like any other shot.
//   sidecar    the complete recipe plus what actually happened, so the shot is
//              reproducible and a Spotter Pack batch has somewhere to record its
//              variant.
//
// Naming reuses the shared screenshot-output helpers, so a long exposure lands
// beside stills with the same {track}/{driver}/{counter} conventions the user
// already configured.

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { DEFAULT_FORMAT } from '../../utilities/filenameFormat';
import {
	buildUniqueScreenshotName,
	getOutputExtension,
} from '../../utilities/screenshot-output';
import { writePng16 } from '../../utilities/long-exposure/png16';
import {
	buildSidecar,
	extractSessionContext,
	serializeSidecar,
} from '../../utilities/long-exposure/metadata';
import {
	variantSuffix,
	type LongExposureRecipe,
	type ResolvedPlan,
} from '../../utilities/long-exposure/shot-recipe';
import type { SampleStats } from '../../utilities/long-exposure/sample-stats';
import type { LongExposureInterpolationReport } from './capture-session';
import { createLogger } from '../../utilities/logger';

const log = createLogger('long-exposure/output');

// Gallery thumbnail geometry, matching the still-capture path so the strip looks
// uniform.
const THUMB_WIDTH = 1280;
const THUMB_HEIGHT = 720;

export interface LongExposureWriteResult {
	masterPath: string;
	previewPath: string | null;
	sidecarPath: string;
	thumbnailPath: string | null;
}

export interface WriteLongExposureOptions {
	image: { data: Buffer; width: number; height: number };
	recipe: LongExposureRecipe;
	plan: ResolvedPlan;
	stats: SampleStats;
	backend: string | null;
	// What optical-flow interpolation actually did, straight from the capture.
	// Optional so callers that do not have it (older tests, non-capture writers) keep
	// working; the sidecar simply records null.
	interpolation?: LongExposureInterpolationReport | null;
	screenshotDir: string;
	cacheDir: string;
	// irsdk shapes are untyped upstream.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sessionInfo: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	telemetry: any;
	filenameFormat: string;
	toolName: string;
	toolVersion: string;
	capturedAt: string;
}

// sharp reads a raw 16-bit buffer only when handed a Uint16Array — for a plain
// Buffer it infers 8-bit from the constructor and silently misreads the data. The
// view is zero-copy when the underlying ArrayBuffer is 2-byte aligned, which napi
// buffers are; the copy is a correctness backstop, not the expected path.
function asUint16View(buffer: Buffer): Uint16Array {
	if (buffer.byteOffset % 2 === 0) {
		return new Uint16Array(
			buffer.buffer,
			buffer.byteOffset,
			Math.floor(buffer.length / 2)
		);
	}
	const copy = Buffer.from(buffer);
	return new Uint16Array(
		copy.buffer,
		copy.byteOffset,
		Math.floor(copy.length / 2)
	);
}

// Ordered 8x8 Bayer matrix, the classic one. Used as a sub-LSB bias when reducing
// 16-bit to 8-bit.
//
// ORDERED rather than random, because a long exposure is a reproducible recipe: the
// same accumulator must give the same file every time, and an RNG would make two
// executions differ. Ordered rather than error-diffused because diffusion produces
// wandering "worm" textures in exactly the large flat areas this exists to fix.
const BAYER_8 = [
	0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
	14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
	51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
	61, 29, 53, 21,
];

// 16-bit RGBA -> 8-bit RGB, dithered.
//
// WHY THIS EXISTS. The accumulator is fp32 and the master is 16-bit, so a resolved
// sky gradient is genuinely smooth — measured on a real capture, 279 distinct values
// across 311 pixels of sky, steps of 0.02 of an 8-bit LSB. Rounding that to 8 bits
// collapses it to 35 levels with flat runs up to 21 pixels wide, which is textbook
// gradient banding and exactly what a user reported seeing.
//
// The information to avoid it is right there in the low byte: a shallow gradient
// crosses each 8-bit level slowly, so biasing the rounding by a sub-LSB pattern
// makes the crossing happen at different pixels rather than all at once along a
// contour. That trades a hard edge for a stipple the eye integrates away.
//
// This is NOT a fix for the 16-bit master, which never had the problem. It is for
// every 8-bit artefact we derive from it: the preview, the gallery thumbnail, and
// the master itself when the user's format is jpeg or webp.
export function reduceTo8BitDithered(image: {
	data: Buffer;
	width: number;
	height: number;
}): Buffer {
	const src = asUint16View(image.data);
	const { width, height } = image;
	const out = Buffer.allocUnsafe(width * height * 3);

	for (let y = 0; y < height; y += 1) {
		const row = (y & 7) * 8;
		for (let x = 0; x < width; x += 1) {
			// (n + 0.5)/64 - 0.5 puts the bias in [-0.5, +0.5), so it perturbs the
			// rounding decision and nothing else — the mean is unchanged.
			const bias = (BAYER_8[row + (x & 7)] + 0.5) / 64 - 0.5;
			const s = (y * width + x) * 4;
			const d = (y * width + x) * 3;
			for (let c = 0; c < 3; c += 1) {
				// 65535/257 is exactly 255, so this is a pure rescale.
				const v = src[s + c] / 257 + bias;
				out[d + c] = v <= 0 ? 0 : v >= 255 ? 255 : (v + 0.5) | 0;
			}
		}
	}
	return out;
}

// An 8-bit sharp pipeline over the 16-bit resolve output, with the depth reduction
// done here rather than by sharp: sharp rounds, and rounding is what bands.
function previewPipeline(image: {
	data: Buffer;
	width: number;
	height: number;
}): ReturnType<typeof sharp> {
	return sharp(reduceTo8BitDithered(image), {
		raw: { width: image.width, height: image.height, channels: 3 },
	});
}

function encodePreview(
	pipeline: ReturnType<typeof sharp>,
	formatKey: unknown
): ReturnType<typeof sharp> {
	switch (formatKey) {
		case 'png':
			return pipeline.png();
		case 'webp':
			return pipeline.webp({ quality: 95 });
		case 'jpeg':
		default:
			return pipeline.jpeg({ quality: 100, chromaSubsampling: '4:4:4' });
	}
}

export async function writeLongExposure(
	options: WriteLongExposureOptions
): Promise<LongExposureWriteResult> {
	const {
		image,
		recipe,
		plan,
		stats,
		backend,
		screenshotDir,
		cacheDir,
		sessionInfo,
		telemetry,
	} = options;

	fs.mkdirSync(screenshotDir, { recursive: true });
	fs.mkdirSync(cacheDir, { recursive: true });

	const wantsPng16 = recipe.outputFormat === 'png16';
	const masterExt = wantsPng16
		? '.png'
		: getOutputExtension(recipe.outputFormat);
	const suffix = variantSuffix(recipe);

	// Same naming machinery as the still path, so long exposures and stills share
	// the user's configured conventions and never collide.
	const baseName = buildUniqueScreenshotName({
		formatString: options.filenameFormat || DEFAULT_FORMAT,
		sessionInfo,
		telemetry,
		exists: (name) =>
			fs.existsSync(
				path.join(screenshotDir, `${name}${suffix}${masterExt}`)
			),
	});
	const fileKey = `${baseName}${suffix}`;

	const masterPath = path.join(screenshotDir, `${fileKey}${masterExt}`);
	const sidecarPath = path.join(screenshotDir, `${fileKey}.json`);
	const thumbnailPath = path.join(cacheDir, `${fileKey}.webp`);

	// --- master -----------------------------------------------------------
	// Timed because a 7680x4320 master once took 63.7 s to write where the encode
	// measures ~4 s in isolation, and the remaining ~59 s has no confirmed cause:
	// the encode, the file write, Defender and memory pressure were each measured
	// and cleared. The leading suspect is contention with iRacing rebuilding its
	// render targets after the capture resize, which cannot be reproduced off the
	// sim. So the next occurrence records itself rather than being re-theorised.
	const masterStartedAt = Date.now();
	if (wantsPng16) {
		// Streamed, not encodePng16 + writeFileSync. The whole-image path holds the
		// source, the scanline stream, the deflate output and a concat copy at once —
		// ~760 MB at 7680x4320, where a field capture took 63.7 s to write against a
		// ~4 s measured encode. It also blocks the main thread for that whole time,
		// which is what "not responding" looked like to the user.
		await writePng16(masterPath, {
			rgbaLe: image.data,
			width: image.width,
			height: image.height,
		});
	} else {
		await encodePreview(previewPipeline(image), recipe.outputFormat).toFile(
			masterPath
		);
	}
	log.info('Long exposure master written', {
		file: masterPath,
		bitDepth: wantsPng16 ? 16 : 8,
		dimensions: { width: image.width, height: image.height },
		elapsedMs: Date.now() - masterStartedAt,
		megapixels: Number(((image.width * image.height) / 1e6).toFixed(1)),
	});

	// --- 8-bit preview ----------------------------------------------------
	// Only when the master is 16-bit: an 8-bit master IS the preview, and writing
	// a second identical file would just clutter the gallery.
	let previewPath: string | null = null;
	if (wantsPng16) {
		previewPath = path.join(screenshotDir, `${fileKey}-preview.jpg`);
		try {
			await previewPipeline(image)
				.jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
				.toFile(previewPath);
		} catch (error) {
			// Best-effort: the master is already on disk and is the artefact that
			// matters.
			log.warn('Long exposure preview failed — master still written', {
				error: (error as Error)?.message || String(error),
			});
			previewPath = null;
		}
	}

	// --- gallery thumbnail ------------------------------------------------
	let thumbResult: string | null = thumbnailPath;
	try {
		await previewPipeline(image)
			.resize(THUMB_WIDTH, THUMB_HEIGHT, {
				fit: 'contain',
				background: { r: 0, g: 0, b: 0, alpha: 0 },
			})
			.webp()
			.toFile(thumbnailPath);
	} catch (error) {
		log.warn('Long exposure thumbnail failed — shot still saved', {
			error: (error as Error)?.message || String(error),
		});
		thumbResult = null;
	}

	// --- sidecar ----------------------------------------------------------
	const interpolation = options.interpolation ?? null;
	const sidecar = buildSidecar({
		recipe,
		plan,
		stats,
		backend,
		// Spread rather than field-by-field: an explicit mapping here silently dropped
		// setupFrameMs / load / achievedRatio when they were added, so the sidecar —
		// the one place these diagnostics are actually read — reported none of them.
		interpolation,
		synthesizedSamples: interpolation?.syntheticSamples ?? 0,
		imageWidth: image.width,
		imageHeight: image.height,
		toolName: options.toolName,
		toolVersion: options.toolVersion,
		capturedAt: options.capturedAt,
		context: extractSessionContext(sessionInfo, telemetry),
	});
	fs.writeFileSync(sidecarPath, serializeSidecar(sidecar), 'utf8');

	return {
		masterPath,
		previewPath,
		sidecarPath,
		thumbnailPath: thumbResult,
	};
}
