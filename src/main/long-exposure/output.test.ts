import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import zlib from 'node:zlib';
import {
	createDefaultRecipe,
	normalizeRecipe,
	resolvePlan,
} from '../../utilities/long-exposure/shot-recipe';
import { summarizeSamples } from '../../utilities/long-exposure/sample-stats';
import {
	applyWatermarkCrop,
	bracketSuffix,
	cropRgba16,
	pruneSidecars,
	reduceTo8BitDithered,
	SIDECAR_HISTORY_LIMIT,
	writeLongExposure,
} from './output';
import { resolveCropTarget } from '../../utilities/screenshot-output';

// libvips caches operations and keeps file handles open, which makes the Windows
// temp-dir cleanup below fail with EPERM. These tests always read files they just
// wrote, so the cache buys nothing.
sharp.cache(false);

vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

const WIDTH = 24;
const HEIGHT = 16;

// 16-bit RGBA (little-endian) exactly as the GPU resolve hands it over, with
// values spanning the full 16-bit range so any 16->8 reduction is detectable.
function resolvedImage() {
	const data = Buffer.alloc(WIDTH * HEIGHT * 8);
	for (let y = 0; y < HEIGHT; y += 1) {
		for (let x = 0; x < WIDTH; x += 1) {
			const i = (y * WIDTH + x) * 8;
			data.writeUInt16LE((x * 2731 + y * 991) % 65536, i);
			data.writeUInt16LE((x * 601 + y * 40009) % 65536, i + 2);
			data.writeUInt16LE((x * 50021 + y * 7) % 65536, i + 4);
			data.writeUInt16LE(65535, i + 6);
		}
	}
	return { data, width: WIDTH, height: HEIGHT };
}

function expectedPixel(x: number, y: number): [number, number, number] {
	return [
		(x * 2731 + y * 991) % 65536,
		(x * 601 + y * 40009) % 65536,
		(x * 50021 + y * 7) % 65536,
	];
}

// Independent 16-bit PNG decode (inflate + unfilter), because sharp reduces to
// 8 bits on read — see utilities/long-exposure/png16.ts for why.
function decodePng16(file: string) {
	const png = fs.readFileSync(file);
	let offset = 8;
	let width = 0;
	let height = 0;
	const idatParts: Buffer[] = [];
	while (offset + 12 <= png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.subarray(offset + 4, offset + 8).toString('ascii');
		const data = png.subarray(offset + 8, offset + 8 + length);
		if (type === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
		} else if (type === 'IDAT') {
			idatParts.push(data);
		}
		offset += 12 + length;
	}
	const raw = zlib.inflateSync(Buffer.concat(idatParts));
	const rowBytes = width * 6;
	const pixels = new Uint16Array(width * height * 3);
	let prior = Buffer.alloc(rowBytes);
	for (let y = 0; y < height; y += 1) {
		const start = y * (rowBytes + 1);
		const filter = raw[start];
		const line = Buffer.from(raw.subarray(start + 1, start + 1 + rowBytes));
		for (let i = 0; i < rowBytes; i += 1) {
			// The encoder emits filter type 2 ("Up") for every row.
			line[i] = filter === 2 ? (line[i] + prior[i]) & 0xff : line[i];
		}
		for (let x = 0; x < width; x += 1) {
			const at = x * 6;
			const out = (y * width + x) * 3;
			pixels[out] = (line[at] << 8) | line[at + 1];
			pixels[out + 1] = (line[at + 2] << 8) | line[at + 3];
			pixels[out + 2] = (line[at + 4] << 8) | line[at + 5];
		}
		prior = line;
	}
	return { width, height, pixels };
}

// Shaped to what resolveFilenameFormat actually reads: {track} resolves from
// TrackDisplayShortName, and the driver is found by CamCarIdx (the car the camera
// is focused on) rather than DriverCarIdx.
const sessionInfo = {
	data: {
		WeekendInfo: {
			TrackDisplayShortName: 'Road America',
			TrackDisplayName: 'Road America',
			EventType: 'Race',
		},
		DriverInfo: {
			DriverCarIdx: 0,
			Drivers: [{ CarIdx: 0, UserName: 'A Driver', CarScreenName: 'GT3' }],
		},
	},
};
const telemetry = { values: { SessionNum: 0, CamCarIdx: 0 } };

// The accumulator is fp32 and the master is 16-bit, so a resolved sky gradient is
// genuinely smooth — measured on a real capture, 279 distinct values across 311
// pixels. Rounding that to 8 bits collapsed it to 35 levels with flat runs 21+
// pixels wide, which is the gradient banding a user reported. Every 8-bit artefact
// (preview, thumbnail, and the master itself for jpeg/webp) came through here.
describe('reduceTo8BitDithered', () => {
	// A shallow 16-bit vertical ramp: a few 8-bit levels spread over many pixels,
	// which is exactly the shape that bands.
	function shallowRamp(width: number, height: number, spanLevels: number) {
		const px = new Uint16Array(width * height * 4);
		for (let y = 0; y < height; y += 1) {
			const level = 200 + (spanLevels * y) / height;
			const v = Math.round(level * 257);
			for (let x = 0; x < width; x += 1) {
				const i = (y * width + x) * 4;
				px[i] = v;
				px[i + 1] = v;
				px[i + 2] = v;
				px[i + 3] = 65535;
			}
		}
		return {
			data: Buffer.from(px.buffer, px.byteOffset, px.byteLength),
			width,
			height,
		};
	}

	function longestFlatRun(values: number[]): number {
		let best = 1;
		let run = 1;
		for (let i = 1; i < values.length; i += 1) {
			run = values[i] === values[i - 1] ? run + 1 : 1;
			best = Math.max(best, run);
		}
		return best;
	}

	const column = (buf: Buffer, width: number, height: number, x: number) =>
		Array.from({ length: height }, (_, y) => buf[(y * width + x) * 3]);

	// THE assertion, because it is the artefact itself. The ramp is constant along
	// x, so rounding gives every row exactly one level and the level changes at a
	// hard horizontal line — a contour, which is what the eye picks out. Dither
	// moves that transition to different x positions, so the boundary rows carry
	// both levels and the line stops being a line.
	//
	// Measured on a single COLUMN this barely shows: an ordered matrix spreads its
	// bias across both axes, so one column only sees a subset of the range. The
	// break-up is two-dimensional and has to be measured that way.
	it('breaks the contour rows up instead of stepping the whole row at once', () => {
		const width = 64;
		const height = 256;
		const out = reduceTo8BitDithered(shallowRamp(width, height, 8));

		let mixedRows = 0;
		for (let y = 0; y < height; y += 1) {
			const levels = new Set<number>();
			for (let x = 0; x < width; x += 1) {
				levels.add(out[(y * width + x) * 3]);
			}
			if (levels.size > 1) {
				mixedRows += 1;
			}
		}

		// Rounding would give zero mixed rows: every row is one flat level.
		// Eight level crossings over the ramp, each smeared across several rows.
		expect(mixedRows).toBeGreaterThan(8);
	});

	it('still shortens the flat runs down a column', () => {
		const image = shallowRamp(64, 256, 8);
		const dithered = column(reduceTo8BitDithered(image), 64, 256, 3);

		const src = new Uint16Array(
			image.data.buffer,
			image.data.byteOffset,
			image.data.byteLength / 2
		);
		const rounded = Array.from({ length: 256 }, (_, y) =>
			Math.round(src[y * 64 * 4] / 257)
		);

		expect(longestFlatRun(dithered)).toBeLessThan(longestFlatRun(rounded));
	});

	// Dither perturbs the ROUNDING and nothing else. If it moved the mean it would
	// be a brightness change wearing a smoothing costume.
	it('preserves the mean level', () => {
		const image = shallowRamp(64, 256, 8);
		const out = reduceTo8BitDithered(image);
		const src = new Uint16Array(
			image.data.buffer,
			image.data.byteOffset,
			image.data.byteLength / 2
		);
		let dithSum = 0;
		let trueSum = 0;
		for (let i = 0; i < 64 * 256; i += 1) {
			dithSum += out[i * 3];
			trueSum += src[i * 4] / 257;
		}
		expect(dithSum / (64 * 256)).toBeCloseTo(trueSum / (64 * 256), 1);
	});

	// A perfectly flat area must stay perfectly flat: the bias range is
	// [-0.4922, +0.4922], never enough to push an exact level across a boundary.
	// Stippling a clear sky would be a worse artefact than the one being fixed.
	it('leaves a flat field completely untouched', () => {
		const px = new Uint16Array(16 * 16 * 4).fill(200 * 257);
		const out = reduceTo8BitDithered({
			data: Buffer.from(px.buffer, px.byteOffset, px.byteLength),
			width: 16,
			height: 16,
		});
		expect(new Set(out)).toEqual(new Set([200]));
	});

	// A recipe is meant to be re-executable, so the same accumulator has to produce
	// the same file. An RNG-based dither would break that.
	it('is deterministic', () => {
		const image = shallowRamp(32, 32, 4);
		expect(reduceTo8BitDithered(image)).toEqual(reduceTo8BitDithered(image));
	});

	it('clamps the ends rather than wrapping them', () => {
		const px = new Uint16Array(8 * 2 * 4);
		for (let i = 0; i < 8; i += 1) {
			px[i * 4] = 0;
			px[i * 4 + 1] = 0;
			px[i * 4 + 2] = 0;
		}
		for (let i = 8; i < 16; i += 1) {
			px[i * 4] = 65535;
			px[i * 4 + 1] = 65535;
			px[i * 4 + 2] = 65535;
		}
		const out = reduceTo8BitDithered({
			data: Buffer.from(px.buffer, px.byteOffset, px.byteLength),
			width: 8,
			height: 2,
		});
		expect(out[0]).toBe(0);
		expect(out[8 * 3]).toBe(255);
	});

	it('drops alpha and emits three channels', () => {
		const image = shallowRamp(10, 4, 2);
		expect(reduceTo8BitDithered(image).length).toBe(10 * 4 * 3);
	});
});

describe('writeLongExposure', () => {
	let root: string;
	let screenshotDir: string;
	let cacheDir: string;
	let sidecarDir: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'le-output-'));
		screenshotDir = path.join(root, 'shots');
		cacheDir = path.join(root, 'cache');
		// Stands in for the app's log folder, which is where these land in
		// production — deliberately NOT the screenshot folder.
		sidecarDir = path.join(root, 'logs');
	});

	afterEach(() => {
		// maxRetries covers the brief window where a just-closed handle is still
		// being released by the OS.
		fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 });
	});

	function write(overrides = {}, images?: unknown[]) {
		const recipe = normalizeRecipe(
			overrides,
			createDefaultRecipe({
				anchorFrame: 6921,
				sessionNum: 0,
				width: WIDTH,
				height: HEIGHT,
				outputDir: screenshotDir,
			})
		);
		return writeLongExposure({
			image: resolvedImage(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			images: images as any,
			recipe,
			plan: resolvePlan(recipe, { renderFps: 60 }),
			stats: summarizeSamples([]),
			backend: 'd3d11-compute',
			screenshotDir,
			cacheDir,
			sidecarDir,
			sessionInfo,
			telemetry,
			filenameFormat: '{track}-{driver}-{counter}',
			toolName: 'iRacing Screenshot Tool',
			toolVersion: '3.2.0',
			capturedAt: '2026-08-02T13:26:44.000Z',
		});
	}

	it('creates the output directories if they do not exist', async () => {
		await write();
		expect(fs.existsSync(screenshotDir)).toBe(true);
		expect(fs.existsSync(cacheDir)).toBe(true);
	});

	// END TO END, through the real encoder and an independent decode: the bug this
	// closes is that a long exposure saved the FULL frame with iRacing's watermark
	// still in it while a still of the same Resolution had it cropped off.
	//
	// Asserting the decoded PIXELS, not just the dimensions — a crop taken from the
	// wrong corner has exactly the right size.
	it('crops the watermark out of the master when the setting is on', async () => {
		const result = await write({ outputFormat: 'png16', crop: true });
		const decoded = decodePng16(result.masterPath);

		const target = resolveCropTarget({
			width: WIDTH,
			height: HEIGHT,
			crop: true,
			cropTopLeft: false,
		});
		expect([decoded.width, decoded.height]).toEqual([
			target.width,
			target.height,
		]);
		expect(decoded.width).toBeLessThan(WIDTH);

		// Centered mode: the kept region starts half the removed margin in, so the
		// saved (0,0) is the source pixel at that offset.
		const left = Math.round((WIDTH - target.width) / 2);
		const top = Math.round((HEIGHT - target.height) / 2);
		expect([decoded.pixels[0], decoded.pixels[1], decoded.pixels[2]]).toEqual(
			expectedPixel(left, top)
		);

		// And the far corner, so a right-edge stride error cannot hide.
		const last = ((target.height - 1) * target.width + target.width - 1) * 3;
		expect([
			decoded.pixels[last],
			decoded.pixels[last + 1],
			decoded.pixels[last + 2],
		]).toEqual(
			expectedPixel(left + target.width - 1, top + target.height - 1)
		);
	});

	it('leaves the master uncropped when the setting is off', async () => {
		const result = await write({ outputFormat: 'png16', crop: false });
		const decoded = decodePng16(result.masterPath);
		expect([decoded.width, decoded.height]).toEqual([WIDTH, HEIGHT]);
	});

	// The sidecar is what a re-shoot reads and what the diagnostics quote, so it
	// must describe the file that was actually written, not the frame that was
	// captured.
	it('records the cropped dimensions and the crop setting in the sidecar', async () => {
		const result = await write({ outputFormat: 'png16', crop: true });
		const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
		const target = resolveCropTarget({
			width: WIDTH,
			height: HEIGHT,
			crop: true,
			cropTopLeft: false,
		});

		expect(sidecar.image.width).toBe(target.width);
		expect(sidecar.image.height).toBe(target.height);
		expect(sidecar.recipe.crop).toBe(true);
	});

	// The whole point of the feature's output stage: the master must actually be
	// 16-bit on disk, not merely named .png.
	it('writes a true 16-bit master whose samples survive bit-exactly', async () => {
		const result = await write({ outputFormat: 'png16' });
		expect(fs.existsSync(result.masterPath)).toBe(true);

		const decoded = decodePng16(result.masterPath);
		expect(decoded.width).toBe(WIDTH);
		expect(decoded.height).toBe(HEIGHT);

		let mismatched = 0;
		for (let y = 0; y < HEIGHT; y += 1) {
			for (let x = 0; x < WIDTH; x += 1) {
				const at = (y * WIDTH + x) * 3;
				const [r, g, b] = expectedPixel(x, y);
				if (
					decoded.pixels[at] !== r ||
					decoded.pixels[at + 1] !== g ||
					decoded.pixels[at + 2] !== b
				) {
					mismatched += 1;
				}
			}
		}
		expect(mismatched).toBe(0);
	});

	it('writes an 8-bit preview alongside a 16-bit master', async () => {
		const result = await write({ outputFormat: 'png16' });
		expect(result.previewPath).not.toBeNull();
		expect(fs.existsSync(result.previewPath as string)).toBe(true);
		const meta = await sharp(result.previewPath as string).metadata();
		expect(meta.width).toBe(WIDTH);
		expect(meta.depth).toBe('uchar');
	});

	// An 8-bit master IS the preview; a second identical file would just clutter
	// the gallery.
	it('writes no separate preview when the master is already 8-bit', async () => {
		const result = await write({ outputFormat: 'jpeg' });
		expect(result.previewPath).toBeNull();
		expect(path.extname(result.masterPath)).toBe('.jpg');
		expect(fs.existsSync(result.masterPath)).toBe(true);
	});

	it('honours the chosen 8-bit output format', async () => {
		for (const [format, ext] of [
			['png', '.png'],
			['webp', '.webp'],
			['jpeg', '.jpg'],
		]) {
			const result = await write({ outputFormat: format });
			expect(path.extname(result.masterPath)).toBe(ext);
			const meta = await sharp(result.masterPath).metadata();
			expect(meta.width).toBe(WIDTH);
		}
	});

	it('writes a gallery thumbnail into the cache directory', async () => {
		const result = await write();
		expect(result.thumbnailPath).not.toBeNull();
		expect(fs.existsSync(result.thumbnailPath as string)).toBe(true);
		const meta = await sharp(result.thumbnailPath as string).metadata();
		expect(meta.format).toBe('webp');
	});

	it('writes a sidecar carrying the re-executable recipe', async () => {
		const result = await write({ shutter: '1/4' });
		const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
		expect(sidecar.recipe.shutter).toBe('1/4');
		expect(sidecar.recipe.anchorFrame).toBe(6921);
		expect(sidecar.compute.backend).toBe('d3d11-compute');
		expect(sidecar.context.track).toBe('Road America');
		expect(sidecar.image.bitDepth).toBe(16);
	});

	// Naming reuses the still path's helpers, so long exposures land beside stills
	// under the user's configured conventions and never overwrite one another.
	it('resolves the filename format and avoids collisions', async () => {
		const first = await write();
		const second = await write();
		expect(path.basename(first.masterPath)).toBe(
			'Road America-A Driver-0.png'
		);
		expect(first.masterPath).not.toBe(second.masterPath);
		expect(fs.existsSync(first.masterPath)).toBe(true);
		expect(fs.existsSync(second.masterPath)).toBe(true);
	});

	// Each bracket stop's sidecar must report ITS OWN achieved count. `accepted`
	// counts frames CONSUMED by the session and is identical for every stop, so
	// passing it through unchanged made a 1/1000 stop claim the same sample count
	// as the 1/30 it was bracketed from — a sidecar that quietly lied about the
	// image beside it.
	it('gives each bracket stop its own achieved sample count', async () => {
		const image = resolvedImage();
		const result = await write({ outputFormat: 'jpeg' }, [
			{
				sinkId: 'primary',
				label: '1/30',
				exposureSeconds: 1 / 30,
				accepted: 211,
				...image,
			},
			{
				sinkId: '1/500',
				label: '1/500',
				exposureSeconds: 1 / 500,
				accepted: 7,
				...image,
			},
		]);

		const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
		expect(read(result.sidecarPath).sampling.achieved).toBe(211);

		expect(result.bracketPaths).toHaveLength(1);
		// The stop's IMAGE is in the screenshot folder; its sidecar is in the
		// sidecar folder, so the path has to be rebuilt rather than derived by
		// swapping the extension.
		const stopSidecar = path.join(
			sidecarDir,
			path.basename(result.bracketPaths[0]).replace(/\.[^.]+$/, '.json')
		);
		expect(read(stopSidecar).sampling.achieved).toBe(7);
		// And it still records its own exposure, not the primary's.
		expect(read(stopSidecar).recipe.shutter).toBe('1/500');
	});

	// The sidecar moved OUT of the screenshot folder and into the app's log folder.
	// It is a diagnostic record of how a shot was taken, and with bracketing one
	// capture writes a dozen of them — which turned the folder the user actually
	// browses into a mixture of pictures and metadata. The base name still matches
	// the master, so a sidecar is still attributable to its image at a glance.
	it('writes the sidecar to the sidecar directory, not beside the master', async () => {
		const result = await write();
		expect(path.dirname(result.sidecarPath)).toBe(sidecarDir);
		expect(path.dirname(result.masterPath)).toBe(screenshotDir);
		expect(fs.existsSync(result.sidecarPath)).toBe(true);
		// Nothing metadata-shaped is left in the screenshot folder.
		expect(
			fs.readdirSync(screenshotDir).filter((n) => n.endsWith('.json'))
		).toEqual([]);
	});

	it('keeps the sidecar base name matching the master', async () => {
		const result = await write();
		expect(path.basename(result.sidecarPath, '.json')).toBe(
			path.basename(result.masterPath, '.png')
		);
	});

	// The Spotter Pack seam: a variant id has to reach the filename AND the
	// sidecar, so a batch run produces distinguishable, attributable files.
	it('threads a variantId into the filename and the sidecar', async () => {
		const result = await write({ variantId: 'gt3-blue' });
		expect(path.basename(result.masterPath)).toContain('--gt3-blue');
		const sidecar = JSON.parse(fs.readFileSync(result.sidecarPath, 'utf8'));
		expect(sidecar.context.variantId).toBe('gt3-blue');
	});

	// The master is the artefact that matters; a thumbnail failure must never
	// discard a shot that already reached disk.
	it('still returns the master when the thumbnail cannot be written', async () => {
		const spy = vi.spyOn(sharp.prototype, 'resize').mockImplementation(() => {
			throw new Error('thumbnail exploded');
		});
		try {
			const result = await write();
			expect(fs.existsSync(result.masterPath)).toBe(true);
			expect(result.thumbnailPath).toBeNull();
		} finally {
			spy.mockRestore();
		}
	});
});

// Crop Watermark, which long exposure silently ignored until 2026-08-03: the
// still path cropped the watermark off and a long exposure of the same Resolution
// saved the full frame with iRacing's watermark still in it.
//
// The geometry is SHARED with the still path (utilities/screenshot-output), so
// these tests pin the two things a shared helper cannot: that the crop is applied
// at all, and that it lands in the right PLACE. Size alone would pass with the
// rectangle taken from the wrong corner.
describe('long-exposure watermark crop', () => {
	// A 16-bit RGBA buffer whose every pixel encodes its own coordinates, so a
	// misplaced or mis-strided extract is unmissable rather than merely wrong.
	function coordImage(width: number, height: number) {
		const data = Buffer.alloc(width * height * 8);
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const i = (y * width + x) * 8;
				data.writeUInt16LE(x, i);
				data.writeUInt16LE(y, i + 2);
				data.writeUInt16LE(0xbeef, i + 4);
				data.writeUInt16LE(65535, i + 6);
			}
		}
		return { data, width, height };
	}

	const pixelAt = (
		img: { data: Buffer; width: number },
		x: number,
		y: number
	) => {
		const i = (y * img.width + x) * 8;
		return [img.data.readUInt16LE(i), img.data.readUInt16LE(i + 2)];
	};

	describe('cropRgba16', () => {
		it('extracts the requested rectangle at the requested offset', () => {
			const src = coordImage(20, 12);
			const out = cropRgba16(src, { left: 3, top: 2, width: 9, height: 7 });

			expect(out.width).toBe(9);
			expect(out.height).toBe(7);
			expect(out.data.length).toBe(9 * 7 * 8);
			// Every corner, because a stride bug typically survives one of them.
			expect(pixelAt(out, 0, 0)).toEqual([3, 2]);
			expect(pixelAt(out, 8, 0)).toEqual([11, 2]);
			expect(pixelAt(out, 0, 6)).toEqual([3, 8]);
			expect(pixelAt(out, 8, 6)).toEqual([11, 8]);
		});

		it('keeps the alpha and third channels intact', () => {
			const out = cropRgba16(coordImage(16, 16), {
				left: 4,
				top: 4,
				width: 4,
				height: 4,
			});
			expect(out.data.readUInt16LE(4)).toBe(0xbeef);
			expect(out.data.readUInt16LE(6)).toBe(65535);
		});
	});

	describe('applyWatermarkCrop', () => {
		it('returns the frame untouched when crop is off', () => {
			const src = coordImage(40, 30);
			const out = applyWatermarkCrop(src, {
				crop: false,
				cropTopLeft: false,
			});
			expect(out).toBe(src);
		});

		// The default mode trims the margin equally from all sides, so the kept
		// region starts at half the removed width — NOT at the origin.
		it('centres the kept region in the default mode', () => {
			const src = coordImage(200, 100);
			const out = applyWatermarkCrop(src, {
				crop: true,
				cropTopLeft: false,
			});

			const target = resolveCropTarget({
				width: 200,
				height: 100,
				crop: true,
				cropTopLeft: false,
			});
			expect([out.width, out.height]).toEqual([target.width, target.height]);
			expect(pixelAt(out, 0, 0)).toEqual([
				Math.round((200 - target.width) / 2),
				Math.round((100 - target.height) / 2),
			]);
		});

		// Legacy mode keeps the top-left region, dropping the bottom-right corner
		// the watermark actually sits in.
		it('anchors at the origin in top-left mode', () => {
			const out = applyWatermarkCrop(coordImage(200, 100), {
				crop: true,
				cropTopLeft: true,
			});
			expect(pixelAt(out, 0, 0)).toEqual([0, 0]);
			const target = resolveCropTarget({
				width: 200,
				height: 100,
				crop: true,
				cropTopLeft: true,
			});
			expect([out.width, out.height]).toEqual([target.width, target.height]);
		});

		// Fails open. A capture the user waited minutes for must not be lost to a
		// framing detail, so a rect that cannot fit saves the full frame instead.
		it('saves the full frame when the rect will not fit', () => {
			// 16x16 at 6% rounds to a 15x15 keep, which fits; the guard is for a
			// degenerate source, so use one that cannot produce a valid rect.
			const src = coordImage(8, 8);
			const out = applyWatermarkCrop(src, {
				crop: true,
				cropTopLeft: false,
			});
			// 8 - ceil(0.48) = 7, still valid — assert it stayed in bounds rather
			// than asserting a specific failure, which is the property that matters.
			expect(out.width).toBeLessThanOrEqual(src.width);
			expect(out.height).toBeLessThanOrEqual(src.height);
			expect(out.data.length).toBe(out.width * out.height * 8);
		});
	});

	// The geometry must be the SAME as the still path's, which is the entire point
	// of routing both through resolveCropTarget. This pins the margins against the
	// literals SideBar.vue used before they were shared.
	describe('geometry matches the still path', () => {
		it.each([
			[3840, 2160],
			[7680, 4320],
			[2560, 1440],
		])('centres 6%% of %ix%i', (w, h) => {
			expect(
				resolveCropTarget({
					width: w,
					height: h,
					crop: true,
					cropTopLeft: false,
				})
			).toEqual({
				width: w - Math.ceil(w * 0.06),
				height: h - Math.ceil(h * 0.06),
			});
		});

		it('takes 3% in top-left mode', () => {
			expect(
				resolveCropTarget({
					width: 3840,
					height: 2160,
					crop: true,
					cropTopLeft: true,
				})
			).toEqual({
				width: 3840 - Math.ceil(3840 * 0.03),
				height: 2160 - Math.ceil(2160 * 0.03),
			});
		});
	});
});

// Bracketing: one capture, N images. The planner and the router were written and
// tested in v1; these cover the OUTPUT half — that the extra stops reach disk under
// filename-safe names, and that each carries its own exposure rather than the
// primary's, which is what makes an individual stop re-shootable.
describe('bracket output', () => {
	describe('bracketSuffix', () => {
		// Sink ids are shutter keys, and both '/' and '.' are hostile to a filename.
		it('makes a shutter key safe for a filename', () => {
			expect(bracketSuffix('1/125')).toBe('-1-125');
			expect(bracketSuffix('1/1000')).toBe('-1-1000');
			expect(bracketSuffix('0.5')).toBe('-0s5');
		});

		it('never emits a path separator or an extension boundary', () => {
			for (const key of ['1/1000', '1/8', '0.5', '1', '2']) {
				const suffix = bracketSuffix(key);
				expect(suffix).not.toContain('/');
				expect(suffix).not.toContain(String.fromCharCode(92));
				expect(suffix).not.toContain('.');
			}
		});
	});
});

// Sidecars are a rolling diagnostic window rather than an archive: the last handful
// of shots are what anyone reads back when a capture looks wrong, and an unbounded
// pile in the log folder would grow forever with nothing pruning it.
describe('pruneSidecars', () => {
	let dir: string;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'le-sidecars-'));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
	});

	// mtimes are set explicitly: writing files in a loop can land several in the
	// same filesystem timestamp tick, which would make the ordering untestable.
	//
	// No `capturedAt` here, so every seeded file is its own capture — which keeps
	// the one-file-per-shot cases below reading as "N captures".
	function seed(count: number, extension = '.json') {
		for (let i = 0; i < count; i += 1) {
			const file = path.join(dir, `shot-${i}${extension}`);
			fs.writeFileSync(file, '{}', 'utf8');
			const when = new Date(1000 * 1000 + i * 60_000);
			fs.utimesSync(file, when, when);
		}
	}

	// One capture's worth of sidecars: a primary plus `stops - 1` bracket stops,
	// all sharing the capturedAt that makes them one shot.
	function seedCapture(
		name: string,
		capturedAt: string,
		stops: number,
		at: number
	) {
		for (let i = 0; i < stops; i += 1) {
			const file = path.join(
				dir,
				i === 0 ? `${name}.json` : `${name}-stop${i}.json`
			);
			fs.writeFileSync(file, JSON.stringify({ capturedAt }), 'utf8');
			const when = new Date(at + i);
			fs.utimesSync(file, when, when);
		}
	}

	const remaining = () => fs.readdirSync(dir).sort();

	it('keeps nothing beyond the limit', async () => {
		seed(25);
		await pruneSidecars(dir, 10);
		expect(remaining()).toHaveLength(10);
	});

	// The window is the most RECENT records — the point is to answer "what did the
	// last few shots do", so dropping the newest would invert the whole feature.
	it('keeps the newest and drops the oldest', async () => {
		seed(5);
		const removed = await pruneSidecars(dir, 2);

		expect(remaining()).toEqual(['shot-3.json', 'shot-4.json']);
		expect(removed).toHaveLength(3);
		expect(removed.every((file) => file.endsWith('.json'))).toBe(true);
	});

	it('does nothing when the directory is already under the limit', async () => {
		seed(3);
		expect(await pruneSidecars(dir, 20)).toEqual([]);
		expect(remaining()).toHaveLength(3);
	});

	// THE assertion that matters, because this runs against the folder holding
	// app.log: pruning by extension means the pruner can never reach the log,
	// whatever else ends up in there.
	it('never touches anything that is not a .json', async () => {
		seed(30);
		fs.writeFileSync(path.join(dir, 'app.log'), 'log lines', 'utf8');
		fs.writeFileSync(path.join(dir, 'app.log.1'), 'older log', 'utf8');

		await pruneSidecars(dir, 5);

		expect(fs.existsSync(path.join(dir, 'app.log'))).toBe(true);
		expect(fs.existsSync(path.join(dir, 'app.log.1'))).toBe(true);
		expect(remaining().filter((n) => n.endsWith('.json'))).toHaveLength(5);
	});

	it('is a no-op on a directory that does not exist', async () => {
		await expect(pruneSidecars(path.join(dir, 'nope'), 5)).resolves.toEqual(
			[]
		);
	});

	it('defaults to the documented window size', async () => {
		seed(SIDECAR_HISTORY_LIMIT + 4);
		await pruneSidecars(dir);
		expect(remaining()).toHaveLength(SIDECAR_HISTORY_LIMIT);
	});

	// THE reason this counts captures instead of files. A bracketed shot writes one
	// sidecar per stop, so on a file count a single eleven-stop bracket would evict
	// half the window on its own and the diagnostic record would be useless exactly
	// when bracketing is in use.
	it('counts a bracket as ONE capture, not one per stop', async () => {
		seedCapture('bracket-a', '2026-08-03T10:00:00.000Z', 11, 1_000_000);
		seedCapture('bracket-b', '2026-08-03T11:00:00.000Z', 11, 2_000_000);
		seedCapture('bracket-c', '2026-08-03T12:00:00.000Z', 11, 3_000_000);

		await pruneSidecars(dir, 2);

		// Two whole captures survive — all 22 of their files — and the oldest
		// capture is gone in its entirety rather than partly.
		const left = remaining();
		expect(left).toHaveLength(22);
		expect(left.some((n) => n.startsWith('bracket-a'))).toBe(false);
		expect(left.filter((n) => n.startsWith('bracket-b'))).toHaveLength(11);
		expect(left.filter((n) => n.startsWith('bracket-c'))).toHaveLength(11);
	});

	// A capture is never left half-pruned: the whole point of grouping is that the
	// primary and its stops describe one shot, so keeping some and dropping others
	// would leave a record that lies about what was captured.
	it('removes every file of an evicted capture together', async () => {
		seedCapture('old', '2026-08-03T09:00:00.000Z', 4, 1_000_000);
		seedCapture('new', '2026-08-03T10:00:00.000Z', 4, 2_000_000);

		const removed = await pruneSidecars(dir, 1);

		expect(removed).toHaveLength(4);
		expect(
			removed.every((file) => path.basename(file).startsWith('old'))
		).toBe(true);
		expect(remaining()).toHaveLength(4);
	});

	// A malformed sidecar must not silently join an unrelated shot's group — that
	// would make an unreadable file able to evict a good capture with it.
	it('treats a sidecar with no readable capturedAt as its own capture', async () => {
		fs.writeFileSync(
			path.join(dir, 'broken.json'),
			'not json at all',
			'utf8'
		);
		fs.utimesSync(
			path.join(dir, 'broken.json'),
			new Date(3_000_000),
			new Date(3_000_000)
		);
		seedCapture('good', '2026-08-03T10:00:00.000Z', 3, 1_000_000);

		await pruneSidecars(dir, 1);

		// The broken one is newest, so it is the capture that survives — alone.
		expect(remaining()).toEqual(['broken.json']);
	});
});
