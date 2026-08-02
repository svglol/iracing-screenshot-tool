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
import { encodePng16 } from '../../utilities/long-exposure/png16';
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

// An 8-bit sharp pipeline over the 16-bit resolve output. sharp's own 16->8
// reduction is exactly what a preview wants, so this leans on it deliberately.
function previewPipeline(image: {
	data: Buffer;
	width: number;
	height: number;
}): ReturnType<typeof sharp> {
	return sharp(asUint16View(image.data), {
		raw: { width: image.width, height: image.height, channels: 4 },
	}).removeAlpha();
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
	if (wantsPng16) {
		fs.writeFileSync(
			masterPath,
			encodePng16({
				rgbaLe: image.data,
				width: image.width,
				height: image.height,
			})
		);
	} else {
		await encodePreview(previewPipeline(image), recipe.outputFormat).toFile(
			masterPath
		);
	}
	log.info('Long exposure master written', {
		file: masterPath,
		bitDepth: wantsPng16 ? 16 : 8,
		dimensions: { width: image.width, height: image.height },
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
		interpolation: interpolation
			? {
					requestedFactor: interpolation.requestedFactor,
					enabled: interpolation.enabled,
					achievedFactor: interpolation.achievedFactor,
					reason: interpolation.reason,
					gridSize: interpolation.gridSize,
					bidirectional: interpolation.bidirectional,
					meanFrameMs: interpolation.meanFrameMs,
					maxFrameMs: interpolation.maxFrameMs,
				}
			: null,
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
