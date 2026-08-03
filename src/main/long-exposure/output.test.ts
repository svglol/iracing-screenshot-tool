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
import { reduceTo8BitDithered, writeLongExposure } from './output';

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

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'le-output-'));
		screenshotDir = path.join(root, 'shots');
		cacheDir = path.join(root, 'cache');
	});

	afterEach(() => {
		// maxRetries covers the brief window where a just-closed handle is still
		// being released by the OS.
		fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 });
	});

	function write(overrides = {}) {
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
			recipe,
			plan: resolvePlan(recipe, { renderFps: 60 }),
			stats: summarizeSamples([]),
			backend: 'd3d11-compute',
			screenshotDir,
			cacheDir,
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

	it('keeps the sidecar next to the master with a matching base name', async () => {
		const result = await write();
		expect(path.dirname(result.sidecarPath)).toBe(
			path.dirname(result.masterPath)
		);
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
