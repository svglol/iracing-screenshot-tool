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
import { writeLongExposure } from './output';

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
		const result = await write({ shutter: '1/4', supersample: 2 });
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
