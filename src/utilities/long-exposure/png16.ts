// Minimal 16-bit-per-channel PNG encoder for the long-exposure master.
//
// WHY THIS EXISTS. The GPU resolve produces 16-bit-per-channel RGBA, and 16-bit
// fidelity is the entire point of the master file. sharp cannot write it: its
// pipeline reads a 16-bit raw input correctly (metadata reports `depth: ushort,
// space: rgb16`) and then unconditionally converts to 8-bit sRGB before encoding —
// verified by a raw->raw round trip, where an input sample of 2711 comes back as
// 10, i.e. divided by 257. Every combination of `toColourspace('rgb16')`,
// `pipelineColourspace('rgb16')` and PNG/TIFF output reproduces that loss. There is
// no option exposed to prevent it in the shipped libvips build.
//
// (sharp is still the right tool for the 8-bit preview and the gallery thumbnail —
// that same downconversion is exactly the 16->8 reduction those want.)
//
// Rather than take a new third-party dependency for one file format, we emit the
// PNG directly. It is a well-specified container and Node's built-in zlib does the
// only hard part. Everything here is pure and byte-exact by construction, which is
// a stronger guarantee than we had going through an image library.
//
// Reference: PNG (Portable Network Graphics) Specification, W3C/ISO 15948.

import fs from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Colour type 2 = truecolour (RGB, no alpha). The accumulator's alpha channel
// carries accumulated WEIGHT, not opacity, and resolve already divided it out — so
// there is no meaningful alpha to write, and a long exposure is always opaque.
const COLOUR_TYPE_RGB = 2;
const BIT_DEPTH_16 = 16;
const BYTES_PER_PIXEL = 6; // 3 channels x 2 bytes

// PNG filter type 2 ("Up"): each byte minus the byte directly above it. Cheap, and
// effective on photographic content because vertically adjacent scanlines are
// highly correlated. On the first row the prior row is defined as zeros, so Up
// degenerates to None there and needs no special case.
const FILTER_UP = 2;

function crc32(buffer: Buffer): number {
	// Node's zlib.crc32 (Node 20.15+/22+, and Electron 41's bundled Node 24) matches
	// the PNG CRC exactly — same polynomial, same initial/final XOR.
	return zlib.crc32(buffer) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typeAndData), 0);
	return Buffer.concat([length, typeAndData, crc]);
}

function ihdr(width: number, height: number): Buffer {
	const data = Buffer.alloc(13);
	data.writeUInt32BE(width, 0);
	data.writeUInt32BE(height, 4);
	data.writeUInt8(BIT_DEPTH_16, 8);
	data.writeUInt8(COLOUR_TYPE_RGB, 9);
	data.writeUInt8(0, 10); // compression: deflate
	data.writeUInt8(0, 11); // filter method: adaptive
	data.writeUInt8(0, 12); // interlace: none
	return chunk('IHDR', data);
}

// Declare the image as sRGB with perceptual rendering intent, plus the matching
// gAMA/cHRM the spec recommends alongside it. Without these a 16-bit PNG is
// colour-space-ambiguous, and the resolve pass definitely encoded sRGB.
function srgbChunks(): Buffer {
	const srgb = chunk('sRGB', Buffer.from([0])); // 0 = perceptual
	const gama = Buffer.alloc(4);
	gama.writeUInt32BE(45455, 0); // 1/2.2 * 100000, as the spec pairs with sRGB
	const chrm = Buffer.alloc(32);
	const values = [31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000];
	values.forEach((value, index) => chrm.writeUInt32BE(value, index * 4));
	return Buffer.concat([srgb, chunk('gAMA', gama), chunk('cHRM', chrm)]);
}

export interface Png16Input {
	// Tightly packed 16-bit RGBA, LITTLE-endian — exactly what the GPU resolve
	// pass writes. PNG samples are big-endian, so this is byte-swapped on the way
	// out; the alpha channel is dropped.
	rgbaLe: Buffer;
	width: number;
	height: number;
	// zlib level. 6 is the default trade; the master is written once per shot and
	// the data is high-entropy, so higher levels buy little.
	compressionLevel?: number;
}

// One filtered, byte-swapped scanline at a time.
//
// A GENERATOR, so a 33 Mpx master never needs its whole scanline stream resident:
// `writePng16` feeds these straight into a deflate stream. `buildScanlines` below
// still concatenates them for callers that want the whole buffer.
//
// Each yielded row is a FRESH buffer, deliberately. Reusing one would be faster,
// but `writePng16` hands these to a stream that queues them — the next iteration
// would then overwrite data already in flight, and the corruption would be silent
// and image-dependent. The two working rows below are still reused, which is where
// the churn actually was: the previous implementation allocated a copy per scanline
// AND zeroed the row it was discarding, while its comment claimed it swapped.
function* scanlineRows(input: Png16Input): Generator<Buffer> {
	const { rgbaLe, width, height } = input;
	const rowBytes = width * BYTES_PER_PIXEL;

	// Previous row's UNFILTERED bytes, needed by the Up filter.
	let prior = Buffer.alloc(rowBytes);
	let current = Buffer.alloc(rowBytes);

	for (let y = 0; y < height; y += 1) {
		// allocUnsafe is safe here only because every byte is written below: the
		// filter tag, then all `rowBytes` of filtered data.
		const out = Buffer.allocUnsafe(rowBytes + 1);
		out[0] = FILTER_UP;

		const srcRow = y * width * 8;
		for (let x = 0; x < width; x += 1) {
			const src = srcRow + x * 8;
			const dst = x * BYTES_PER_PIXEL;
			// LE -> BE per channel, alpha dropped.
			current[dst] = rgbaLe[src + 1];
			current[dst + 1] = rgbaLe[src];
			current[dst + 2] = rgbaLe[src + 3];
			current[dst + 3] = rgbaLe[src + 2];
			current[dst + 4] = rgbaLe[src + 5];
			current[dst + 5] = rgbaLe[src + 4];
		}

		for (let i = 0; i < rowBytes; i += 1) {
			out[i + 1] = (current[i] - prior[i]) & 0xff;
		}
		yield out;

		const swap = prior;
		prior = current;
		current = swap;
	}
}

// Build the filtered, byte-swapped scanline stream. Separated from encoding so the
// (hot, allocation-heavy) transform is testable on its own.
export function buildScanlines(input: Png16Input): Buffer {
	const { width, height } = input;
	const rowBytes = width * BYTES_PER_PIXEL;
	const out = Buffer.alloc(height * (rowBytes + 1));

	let offset = 0;
	for (const row of scanlineRows(input)) {
		row.copy(out, offset);
		offset += row.length;
	}

	return out;
}

function assertDimensions(input: Png16Input): void {
	const { width, height, rgbaLe } = input;
	if (
		!Number.isInteger(width) ||
		!Number.isInteger(height) ||
		width < 1 ||
		height < 1
	) {
		throw new Error(`invalid PNG dimensions ${width}x${height}`);
	}
	const expected = width * height * 8;
	if (rgbaLe.length < expected) {
		throw new Error(
			`pixel buffer too small: ${rgbaLe.length} bytes for ${width}x${height} 16-bit RGBA (need ${expected})`
		);
	}
}

// Encode 16-bit RGBA (little-endian) as a 16-bit RGB PNG, wholly in memory.
//
// Fine for small images and for tests, which is where it is still used. For a
// capture-sized master prefer `writePng16` — see the note there.
export function encodePng16(input: Png16Input): Buffer {
	const { width, height } = input;
	assertDimensions(input);

	const compressed = zlib.deflateSync(buildScanlines(input), {
		level: input.compressionLevel ?? 6,
	});

	return Buffer.concat([
		PNG_SIGNATURE,
		ihdr(width, height),
		srgbChunks(),
		chunk('IDAT', compressed),
		chunk('IEND', Buffer.alloc(0)),
	]);
}

// Encode straight to a file, streaming.
//
// PREFER THIS FOR ANYTHING LARGE. `encodePng16` holds the whole pipeline in memory
// at once — source, scanline stream, deflate output, and then a `Buffer.concat`
// copy of the lot. At 7680x4320 that is ~760 MB of transient buffers in the main
// process, and a field capture took 63.7 s to write where the encode alone measures
// ~4 s. The same shot at 2560x1440 took 0.6 s, so the cost is superlinear in a way
// only the whole-image path explains.
//
// It is also OFF THE MAIN THREAD: zlib's streaming deflate runs on libuv's
// threadpool, so the UI stays responsive instead of going "not responding" for a
// minute with no feedback.
//
// The image data is split across MULTIPLE IDAT chunks, one per deflate output
// buffer. That is ordinary PNG — the spec defines the image as the concatenation of
// all IDAT chunk data, and it is the only way to stream, since a chunk is
// length-prefixed and the compressed length is not known in advance.
export async function writePng16(
	filePath: string,
	input: Png16Input
): Promise<void> {
	const { width, height } = input;
	assertDimensions(input);

	const file = fs.createWriteStream(filePath);
	try {
		await new Promise<void>((resolve, reject) => {
			file.once('error', reject);
			file.write(
				Buffer.concat([PNG_SIGNATURE, ihdr(width, height), srgbChunks()]),
				(error) => (error ? reject(error) : resolve())
			);
		});

		const toIdat = new Transform({
			transform(compressed: Buffer, _encoding, done) {
				done(null, chunk('IDAT', compressed));
			},
		});

		await pipeline(
			Readable.from(scanlineRows(input)),
			zlib.createDeflate({ level: input.compressionLevel ?? 6 }),
			toIdat,
			file,
			// Keep the file open so IEND can still be appended.
			{ end: false }
		);

		await new Promise<void>((resolve, reject) => {
			file.end(chunk('IEND', Buffer.alloc(0)), () => resolve());
			file.once('error', reject);
		});
	} catch (error) {
		file.destroy();
		throw error;
	}
}
