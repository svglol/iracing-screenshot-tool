import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import zlib from 'node:zlib';
import { buildScanlines, encodePng16 } from './png16';

// NOTE ON VERIFICATION STRATEGY.
//
// sharp cannot be used to check 16-bit VALUES: its pipeline reduces 16-bit data to
// 8 bits on read as well as on write (that reduction is exactly why this encoder
// exists). So the tests split the job:
//
//   structure   sharp/libvips parses the file and reports 386x293, depth ushort,
//               3 channels — an independent implementation accepting it as a valid
//               16-bit PNG.
//   values      decoded here by a spec-faithful PNG unfilter (all five filter
//               types), which is the mathematical inverse of the encoder rather
//               than a copy of it.
//   geometry    sharp's 8-bit read must still land every pixel in the right place,
//               which catches shear/stride bugs the value check alone might not
//               localise.

const PIXEL_BYTES = 6; // 16-bit RGB

function makeImage(width: number, height: number): Buffer {
	const buffer = Buffer.alloc(width * height * 8);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const i = (y * width + x) * 8;
			buffer.writeUInt16LE((x * 149 + y * 7919) % 65536, i);
			buffer.writeUInt16LE((x * 30011 + y * 13) % 65536, i + 2);
			buffer.writeUInt16LE((x * 3 + y * 60013) % 65536, i + 4);
			buffer.writeUInt16LE(65535, i + 6);
		}
	}
	return buffer;
}

function expectedPixel(x: number, y: number): [number, number, number] {
	return [
		(x * 149 + y * 7919) % 65536,
		(x * 30011 + y * 13) % 65536,
		(x * 3 + y * 60013) % 65536,
	];
}

interface PngChunk {
	type: string;
	data: Buffer;
}

function readChunks(png: Buffer): PngChunk[] {
	const chunks: PngChunk[] = [];
	let offset = 8;
	while (offset + 12 <= png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.subarray(offset + 4, offset + 8).toString('ascii');
		const data = png.subarray(offset + 8, offset + 8 + length);
		// Every chunk carries a CRC over type+data; verifying it proves the file is
		// not merely shaped like a PNG but internally consistent.
		const crc = png.readUInt32BE(offset + 8 + length);
		expect(
			zlib.crc32(png.subarray(offset + 4, offset + 8 + length)) >>> 0
		).toBe(crc);
		chunks.push({ type, data });
		offset += 12 + length;
	}
	return chunks;
}

// Spec-faithful PNG unfilter (PNG spec §9.2), independent of the encoder: it
// implements all five filter types, so it stays a valid check if the encoder's
// filter strategy ever changes.
function decodePng16(png: Buffer): {
	width: number;
	height: number;
	pixels: Uint16Array;
} {
	const chunks = readChunks(png);
	const ihdr = chunks.find((chunk) => chunk.type === 'IHDR');
	expect(ihdr).toBeDefined();
	const width = (ihdr as PngChunk).data.readUInt32BE(0);
	const height = (ihdr as PngChunk).data.readUInt32BE(4);

	const idat = Buffer.concat(
		chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)
	);
	const raw = zlib.inflateSync(idat);

	const rowBytes = width * PIXEL_BYTES;
	const pixels = new Uint16Array(width * height * 3);
	let prior = Buffer.alloc(rowBytes);

	for (let y = 0; y < height; y += 1) {
		const start = y * (rowBytes + 1);
		const filter = raw[start];
		const line = Buffer.from(raw.subarray(start + 1, start + 1 + rowBytes));

		for (let i = 0; i < rowBytes; i += 1) {
			const a = i >= PIXEL_BYTES ? line[i - PIXEL_BYTES] : 0;
			const b = prior[i];
			const c = i >= PIXEL_BYTES ? prior[i - PIXEL_BYTES] : 0;
			let value = line[i];
			switch (filter) {
				case 0:
					break;
				case 1:
					value = (value + a) & 0xff;
					break;
				case 2:
					value = (value + b) & 0xff;
					break;
				case 3:
					value = (value + ((a + b) >> 1)) & 0xff;
					break;
				case 4: {
					const p = a + b - c;
					const pa = Math.abs(p - a);
					const pb = Math.abs(p - b);
					const pc = Math.abs(p - c);
					const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
					value = (value + pred) & 0xff;
					break;
				}
				default:
					throw new Error(`unknown PNG filter type ${filter}`);
			}
			line[i] = value;
		}

		for (let x = 0; x < width; x += 1) {
			const at = x * PIXEL_BYTES;
			const out = (y * width + x) * 3;
			// PNG samples are big-endian.
			pixels[out] = (line[at] << 8) | line[at + 1];
			pixels[out + 1] = (line[at + 2] << 8) | line[at + 3];
			pixels[out + 2] = (line[at + 4] << 8) | line[at + 5];
		}
		prior = line;
	}

	return { width, height, pixels };
}

describe('encodePng16 — structure', () => {
	it('produces a PNG signature and a well-formed IHDR', () => {
		const png = encodePng16({ rgbaLe: makeImage(4, 2), width: 4, height: 2 });

		expect([...png.subarray(0, 8)]).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
		expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
		expect(png.readUInt32BE(16)).toBe(4);
		expect(png.readUInt32BE(20)).toBe(2);
		expect(png.readUInt8(24)).toBe(16); // bit depth
		expect(png.readUInt8(25)).toBe(2); // colour type: truecolour RGB
		expect(png.readUInt8(26)).toBe(0); // deflate
		expect(png.readUInt8(28)).toBe(0); // no interlace
	});

	it('emits sRGB/gAMA/cHRM so the master is not colour-space ambiguous', () => {
		const types = readChunks(
			encodePng16({ rgbaLe: makeImage(4, 2), width: 4, height: 2 })
		).map((chunk) => chunk.type);
		expect(types).toContain('sRGB');
		expect(types).toContain('gAMA');
		expect(types).toContain('cHRM');
		expect(types[types.length - 1]).toBe('IEND');
	});

	// libvips parsing it proves this is a real 16-bit PNG, not just one we like the
	// look of. (Its VALUES can't be checked this way — sharp reduces to 8 bits on
	// read, which is the whole reason this encoder exists.)
	it('is accepted by libvips as a 16-bit RGB PNG', async () => {
		const png = encodePng16({
			rgbaLe: makeImage(386, 293),
			width: 386,
			height: 293,
		});
		const meta = await sharp(png).metadata();
		expect(meta.width).toBe(386);
		expect(meta.height).toBe(293);
		expect(meta.depth).toBe('ushort');
		expect(meta.channels).toBe(3);
	});
});

describe('encodePng16 — values', () => {
	it('round-trips every sample bit-exactly at 16 bits per channel', () => {
		const width = 386;
		const height = 293;
		const png = encodePng16({
			rgbaLe: makeImage(width, height),
			width,
			height,
		});

		const decoded = decodePng16(png);
		expect(decoded.width).toBe(width);
		expect(decoded.height).toBe(height);

		let mismatched = 0;
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const at = (y * width + x) * 3;
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

	// Odd widths exercise the scanline stride arithmetic, where an off-by-one would
	// shear the image rather than fail loudly.
	it('handles odd dimensions without shearing', () => {
		const width = 37;
		const height = 19;
		const decoded = decodePng16(
			encodePng16({ rgbaLe: makeImage(width, height), width, height })
		);

		for (const [x, y] of [
			[0, 0],
			[36, 0],
			[0, 18],
			[36, 18],
			[18, 9],
		]) {
			const at = (y * width + x) * 3;
			expect([
				decoded.pixels[at],
				decoded.pixels[at + 1],
				decoded.pixels[at + 2],
			]).toEqual(expectedPixel(x, y));
		}
	});

	// Cross-check geometry with a genuinely independent decoder. sharp's 8-bit
	// reduction loses precision, so this asserts placement (±1 LSB of 8-bit), which
	// is what catches a stride or shear bug.
	it('places pixels where libvips also finds them', async () => {
		const width = 386;
		const height = 293;
		const png = encodePng16({
			rgbaLe: makeImage(width, height),
			width,
			height,
		});
		const { data, info } = await sharp(png)
			.raw()
			.toBuffer({ resolveWithObject: true });

		for (const [x, y] of [
			[0, 0],
			[385, 0],
			[0, 292],
			[385, 292],
			[193, 146],
		]) {
			const at = (y * info.width + x) * info.channels;
			const expected = expectedPixel(x, y);
			for (let c = 0; c < 3; c += 1) {
				expect(
					Math.abs(data[at + c] - expected[c] / 257)
				).toBeLessThanOrEqual(1);
			}
		}
	});
});

describe('encodePng16 — guards', () => {
	it('rejects a pixel buffer that is too small rather than reading past it', () => {
		expect(() =>
			encodePng16({ rgbaLe: Buffer.alloc(16), width: 100, height: 100 })
		).toThrow(/too small/);
	});

	it('rejects invalid dimensions', () => {
		expect(() =>
			encodePng16({ rgbaLe: Buffer.alloc(8), width: 0, height: 1 })
		).toThrow(/invalid PNG dimensions/);
	});
});

describe('buildScanlines', () => {
	it('emits one filter byte plus 6 bytes per pixel for each row', () => {
		const width = 5;
		const height = 3;
		const scanlines = buildScanlines({
			rgbaLe: makeImage(width, height),
			width,
			height,
		});
		expect(scanlines.length).toBe(height * (width * PIXEL_BYTES + 1));
		for (let y = 0; y < height; y += 1) {
			expect(scanlines[y * (width * PIXEL_BYTES + 1)]).toBe(2); // filter "Up"
		}
	});

	// PNG samples are big-endian; the GPU hands us little-endian. On the first row
	// the Up filter's prior row is all zeros, so the filtered bytes ARE the raw
	// big-endian bytes and the byte order is directly observable.
	it('byte-swaps little-endian samples to big-endian and drops alpha', () => {
		const buffer = Buffer.alloc(8);
		buffer.writeUInt16LE(0x1234, 0);
		buffer.writeUInt16LE(0x5678, 2);
		buffer.writeUInt16LE(0x9abc, 4);
		buffer.writeUInt16LE(0xffff, 6);

		const scanlines = buildScanlines({ rgbaLe: buffer, width: 1, height: 1 });
		expect([...scanlines.subarray(1)]).toEqual([
			0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc,
		]);
	});

	it('applies the Up filter against the previous row', () => {
		const buffer = Buffer.alloc(16);
		for (let c = 0; c < 3; c += 1) {
			buffer.writeUInt16LE(0x0100, c * 2);
			buffer.writeUInt16LE(0x0300, 8 + c * 2);
		}
		buffer.writeUInt16LE(0xffff, 6);
		buffer.writeUInt16LE(0xffff, 14);

		const scanlines = buildScanlines({ rgbaLe: buffer, width: 1, height: 2 });
		expect([...scanlines.subarray(1, 7)]).toEqual([
			0x01, 0x00, 0x01, 0x00, 0x01, 0x00,
		]);
		// Row 1: 0x0300 - 0x0100 = 0x0200, byte-wise.
		expect([...scanlines.subarray(8, 14)]).toEqual([
			0x02, 0x00, 0x02, 0x00, 0x02, 0x00,
		]);
	});
});
