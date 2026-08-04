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
	resolveCropRect,
	resolveCropTarget,
	type CropRect,
} from '../../utilities/screenshot-output';
import { writePng16 } from '../../utilities/long-exposure/png16';
import { PRIMARY_SINK_ID } from '../../utilities/long-exposure/accumulator-sinks';
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

// How many CAPTURES of sidecars to keep. They are a rolling diagnostic window, not
// an archive: the last few shots are what anyone actually reads back when a capture
// looks wrong, and an unbounded pile in the log folder would grow forever with no
// one pruning it.
//
// Counted in captures rather than files because a bracketed shot writes one sidecar
// per stop — a file count would let one eleven-stop bracket evict most of the
// window by itself.
export const SIDECAR_HISTORY_LIMIT = 20;

export interface LongExposureWriteResult {
	// The PRIMARY stop's files — what the gallery is told about and what the capture
	// reports. A non-bracketed shot has nothing else.
	masterPath: string;
	previewPath: string | null;
	sidecarPath: string;
	thumbnailPath: string | null;
	// The extra bracket stops, in ladder order (faster than the primary). Empty
	// unless bracketing was on.
	bracketPaths: string[];
}

// A bracket stop's filename suffix.
//
// Sink ids are shutter keys — '1/125', '0.5' — and both are hostile to a filename:
// '/' is a path separator and a bare '.' reads as an extension boundary. They are
// sanitised HERE and nowhere else, because the id is the stable key shared by the
// planner, the native sink map and the sidecar; rewriting it at the source would
// break that.
//
// Composes with variantSuffix()'s `--{variantId}`: this uses a single leading dash
// so the two can both appear without ambiguity.
// Trim the sidecar directory to the most recent `limit` CAPTURES.
//
// Captures, not files, and that is the whole subtlety: a bracketed shot writes one
// sidecar per stop, so counting files would let a single eleven-stop bracket evict
// most of the window on its own. Stops are grouped by `capturedAt`, which every
// stop of one capture shares verbatim — one timestamp is stamped per capture and
// handed to each stop — so a bracket ages out as the single shot it is.
//
// A sidecar whose `capturedAt` cannot be read counts as a capture of its own. That
// is the conservative direction: it takes one slot rather than being lumped in with
// an unrelated shot, and it ages out normally.
//
// ONLY .json is considered, and that matters: this runs against the app's log
// folder, where `app.log` lives. Deleting by extension means the pruner can never
// reach the log, whatever else ends up in there.
//
// Captures are ordered by their NEWEST file rather than by name, because the
// filename carries the user's own format string ({counter}, {track}) and is not
// sortable in any dependable way.
//
// Best-effort throughout: a sidecar that will not delete is skipped, and a
// directory that will not read prunes nothing. This runs AFTER the shot is on disk
// and must never be able to fail a capture that already succeeded.
export async function pruneSidecars(
	dir: string,
	limit: number = SIDECAR_HISTORY_LIMIT
): Promise<string[]> {
	if (!(limit > 0)) {
		return [];
	}
	let names: string[] = [];
	try {
		names = await fs.promises.readdir(dir);
	} catch {
		return [];
	}

	const records = (
		await Promise.all(
			names
				.filter((name) => path.extname(name).toLowerCase() === '.json')
				.map(async (name) => {
					const fullPath = path.join(dir, name);
					try {
						const stats = await fs.promises.stat(fullPath);
						if (!stats.isFile()) {
							return null;
						}
						return {
							fullPath,
							modified: stats.mtimeMs,
							capture: await captureKeyOf(fullPath),
						};
					} catch {
						return null;
					}
				})
		)
	).filter(
		(
			record
		): record is { fullPath: string; modified: number; capture: string } =>
			Boolean(record)
	);

	const captures = new Map<string, { modified: number; files: string[] }>();
	for (const record of records) {
		const existing = captures.get(record.capture);
		if (existing) {
			existing.modified = Math.max(existing.modified, record.modified);
			existing.files.push(record.fullPath);
		} else {
			captures.set(record.capture, {
				modified: record.modified,
				files: [record.fullPath],
			});
		}
	}

	const removed: string[] = [];
	const doomed = [...captures.values()]
		.sort((a, b) => b.modified - a.modified)
		.slice(limit);
	for (const capture of doomed) {
		for (const file of capture.files) {
			try {
				await fs.promises.unlink(file);
				removed.push(file);
			} catch {
				// Locked or already gone — the next capture prunes it.
			}
		}
	}
	return removed;
}

// Which capture a sidecar belongs to. `capturedAt` is stamped ONCE per capture and
// written into every stop's sidecar, so it identifies the shot exactly. Falling
// back to the file's own path makes an unreadable sidecar its own capture.
async function captureKeyOf(fullPath: string): Promise<string> {
	try {
		const parsed = JSON.parse(await fs.promises.readFile(fullPath, 'utf8'));
		if (
			parsed &&
			typeof parsed.capturedAt === 'string' &&
			parsed.capturedAt.length > 0
		) {
			return `capturedAt:${parsed.capturedAt}`;
		}
	} catch {
		// Malformed or unreadable — treat it as its own capture.
	}
	return `file:${fullPath}`;
}

export function bracketSuffix(sinkId: string): string {
	return `-${sinkId.replace(/\//g, '-').replace(/\./g, 's')}`;
}

export interface WriteLongExposureOptions {
	image: { data: Buffer; width: number; height: number };
	// Every resolved bracket stop, primary FIRST. Omitted means the single image
	// above, which is exactly what a non-bracketed shot writes.
	images?: {
		sinkId: string;
		label: string;
		exposureSeconds: number;
		data: Buffer;
		width: number;
		height: number;
		// REAL frames THIS stop integrated. Written into its own sidecar so a
		// bracket stop reports what went into IT rather than what the session
		// consumed — see the note on the per-stop sidecar below.
		accepted: number;
	}[];
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
	// Where the .json sidecars go. Deliberately NOT the screenshot folder: a sidecar
	// is a diagnostic record of how a shot was taken, and a dozen of them per bracket
	// turned the folder the user actually browses into a mixture of pictures and
	// metadata. Passed in rather than resolved here so this module stays pure enough
	// to test without Electron.
	sidecarDir: string;
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

// Extract a sub-rectangle from a 16-bit RGBA buffer.
//
// Done here on the CPU rather than in the resolve shader, because the crop is a
// pure framing decision with no bearing on accumulation: the frame must still be
// captured, accumulated and resolved at the full render size (iRacing is sized to
// it and pays the VRAM for it either way), and doing it at the last moment means
// the master, the preview and the gallery thumbnail all derive from one cropped
// buffer and cannot disagree about what was saved.
//
// Row-wise copy: 8 bytes per pixel (RGBA x 2), and the rect is validated by the
// caller against the source bounds.
export function cropRgba16(
	image: { data: Buffer; width: number; height: number },
	rect: CropRect
): { data: Buffer; width: number; height: number } {
	const bytesPerPixel = 8;
	const srcStride = image.width * bytesPerPixel;
	const dstStride = rect.width * bytesPerPixel;
	const out = Buffer.allocUnsafe(dstStride * rect.height);
	for (let y = 0; y < rect.height; y += 1) {
		const srcStart = (y + rect.top) * srcStride + rect.left * bytesPerPixel;
		image.data.copy(out, y * dstStride, srcStart, srcStart + dstStride);
	}
	return { data: out, width: rect.width, height: rect.height };
}

// Apply the recipe's Crop Watermark setting to the resolved image, or return it
// untouched when no crop applies. Fails OPEN: a rect that does not fit inside the
// source is logged and skipped rather than throwing, because the alternative is
// losing a capture the user already waited minutes for over a framing detail.
export function applyWatermarkCrop(
	image: { data: Buffer; width: number; height: number },
	recipe: Pick<LongExposureRecipe, 'crop' | 'cropTopLeft'>
): { data: Buffer; width: number; height: number } {
	const target = resolveCropTarget({
		width: image.width,
		height: image.height,
		crop: recipe.crop,
		cropTopLeft: recipe.cropTopLeft,
	});
	const rect = resolveCropRect({
		sourceWidth: image.width,
		sourceHeight: image.height,
		targetWidth: target.width,
		targetHeight: target.height,
		crop: recipe.crop,
		cropTopLeft: recipe.cropTopLeft,
	});
	if (!rect) {
		return image;
	}
	// resolveCropRect deliberately does not clamp — it is shared with paths whose
	// target is guaranteed <= source. Here the source is whatever the GPU handed
	// back, so check before trusting it.
	if (
		rect.left < 0 ||
		rect.top < 0 ||
		rect.width <= 0 ||
		rect.height <= 0 ||
		rect.left + rect.width > image.width ||
		rect.top + rect.height > image.height
	) {
		log.warn(
			'Long exposure crop rect out of bounds — saving the full frame',
			{
				rect,
				source: { width: image.width, height: image.height },
			}
		);
		return image;
	}
	return cropRgba16(image, rect);
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
		recipe,
		plan,
		stats,
		backend,
		screenshotDir,
		cacheDir,
		sidecarDir,
		sessionInfo,
		telemetry,
	} = options;

	// Crop FIRST, once per stop, so every artefact below — master, 8-bit preview,
	// gallery thumbnail, and the sidecar's recorded dimensions — describes the same
	// image. Shadowing `image` deliberately: nothing downstream should be able to
	// reach the uncropped buffer by accident.
	// The bracket set, primary first. A non-bracketed shot is a one-element list, so
	// the loop below is the same code path, and `image` is simply its first entry —
	// cropped ONCE, because at 8K a redundant crop is a 200 MB copy.
	const stops = (
		options.images && options.images.length > 0
			? options.images
			: [
					{
						sinkId: PRIMARY_SINK_ID,
						label: recipe.shutter ?? '',
						exposureSeconds: plan.effectiveExposureSeconds,
						accepted: stats.accepted,
						...options.image,
					},
				]
	).map((stop) => ({ ...stop, ...applyWatermarkCrop(stop, recipe) }));
	const image = stops[0];

	fs.mkdirSync(screenshotDir, { recursive: true });
	fs.mkdirSync(cacheDir, { recursive: true });
	fs.mkdirSync(sidecarDir, { recursive: true });

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
	const sidecarPath = path.join(sidecarDir, `${fileKey}.json`);
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
		// Sourced from the stop rather than the session for the same reason the
		// bracket stops below are, and it is not merely cosmetic uniformity: it means
		// EVERY sidecar's `achieved` describes the image beside it, with no special
		// case for the primary. The two are equal here by construction — the primary
		// reaches furthest back, so it is open whenever any stop is — which is
		// exactly why routing it through the same field cannot change a single-stop
		// shot's output.
		stats: { ...stats, accepted: image.accepted },
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

	// --- the rest of the bracket -----------------------------------------
	// Written AFTER the primary, and never allowed to fail the shot: the stop the
	// user actually chose is already on disk, and losing an extra stop to a disk
	// error should not turn a good capture into a failed one.
	//
	// Each extra stop shares the primary's base name and adds its own suffix, so a
	// bracket reads as one shot in the folder rather than eleven unrelated ones. It
	// gets a master and a sidecar; no preview and no thumbnail, because only one
	// image goes to the gallery and generating ten more 8-bit derivatives of a shot
	// nobody asked to browse is pure cost.
	const bracketPaths: string[] = [];
	for (const stop of stops.slice(1)) {
		const stopKey = `${fileKey}${bracketSuffix(stop.sinkId)}`;
		const stopPath = path.join(screenshotDir, `${stopKey}${masterExt}`);
		try {
			if (wantsPng16) {
				await writePng16(stopPath, {
					rgbaLe: stop.data,
					width: stop.width,
					height: stop.height,
				});
			} else {
				await encodePreview(
					previewPipeline(stop),
					recipe.outputFormat
				).toFile(stopPath);
			}
			// Its own sidecar, recording ITS exposure rather than the primary's —
			// each stop is independently re-executable, which is the property that
			// makes a sidecar worth writing at all.
			fs.writeFileSync(
				path.join(sidecarDir, `${stopKey}.json`),
				serializeSidecar(
					buildSidecar({
						recipe: {
							...recipe,
							shutter: stop.sinkId,
							exposureMs: stop.exposureSeconds * 1000,
							// A re-shoot of one stop is a single shot, not a bracket.
							bracket: false,
						},
						plan,
						// THIS stop's achieved count, not the session's. `accepted`
						// counts frames CONSUMED and is identical for every stop in a
						// bracket, so passing it unchanged made a 1/1000 stop claim
						// the same sample count as the 1/30 it was bracketed from.
						//
						// The DISTRIBUTION fields (evenness, gaps, window) are left as
						// the session's: they are derived from the sample log, which
						// records one entry per captured frame against the primary's
						// window, so there is no per-stop version of them to report.
						// Recomputing them here would be modelling what the GPU did
						// rather than measuring it. Noted, not faked.
						stats: { ...stats, accepted: stop.accepted },
						backend,
						interpolation,
						synthesizedSamples: interpolation?.syntheticSamples ?? 0,
						imageWidth: stop.width,
						imageHeight: stop.height,
						toolName: options.toolName,
						toolVersion: options.toolVersion,
						capturedAt: options.capturedAt,
						context: extractSessionContext(sessionInfo, telemetry),
					})
				),
				'utf8'
			);
			bracketPaths.push(stopPath);
		} catch (error) {
			log.warn(
				'Long exposure bracket stop failed — the rest are still saved',
				{
					sinkId: stop.sinkId,
					error: (error as Error)?.message || String(error),
				}
			);
		}
	}
	if (bracketPaths.length > 0) {
		log.info('Long exposure bracket written', {
			stops: bracketPaths.length + 1,
			primary: masterPath,
		});
	}

	// Roll the window. Last, so a prune failure cannot affect anything that was
	// just written, and so this shot's own sidecars are already in the count.
	const pruned = await pruneSidecars(sidecarDir);
	if (pruned.length > 0) {
		log.info('Pruned old long-exposure sidecars', {
			removedFiles: pruned.length,
			keepingCaptures: SIDECAR_HISTORY_LIMIT,
		});
	}

	return {
		masterPath,
		previewPath,
		sidecarPath,
		thumbnailPath: thumbResult,
		bracketPaths,
	};
}
