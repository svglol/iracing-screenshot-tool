<template>
	<h1>This is a Worker Process</h1>
</template>

<script lang="ts">
import config from '../../utilities/config';
import {
	normalizeCaptureBounds,
	normalizeCaptureTarget,
	resolveDisplayCaptureRect,
} from '../../utilities/desktop-capture';
import {
	sanitizeFilePart,
	buildScreenshotFileKey,
} from '../../utilities/screenshot-name';
import { resolveFilenameFormat } from '../../utilities/filenameFormat';
import { createLogger } from '../../utilities/logger';
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const log = createLogger('worker');

// Max time to wait for the capture stream's <video> to report loadedmetadata
// before tearing it down, so a stalled stream can't wedge the capture.
const HANDLE_STREAM_TIMEOUT_MS = 5000;

// The getUserMedia desktop-capture path delivers I420 (YUV 4:2:0) frames, so the
// source is already chroma-subsampled before we encode. JPEG at max quality is
// the default (small files, one light extra loss stage); PNG is a lossless
// container and WebP a smaller lossy option. True pixel-accuracy would require a
// native RGBA capture backend, not a different encode format.
const FORMAT_MAP = {
	jpeg: { mime: 'image/jpeg', ext: '.jpg', quality: 1 },
	png: { mime: 'image/png', ext: '.png', quality: undefined },
	webp: { mime: 'image/webp', ext: '.webp', quality: 0.95 },
};

function getOutputFormat() {
	const key = config.get('outputFormat') || 'jpeg';
	return FORMAT_MAP[key] || FORMAT_MAP.jpeg;
}

// A genuinely failed desktop capture (e.g. a GDI fallback on GPU-accelerated
// content) returns an all-black frame that still passes the dimension check.
// Sample a tiny downscale and treat it as failed only if the brightest pixel is
// still essentially black — real night scenes always have some brighter pixels
// (headlights, dash, sky), so this won't false-positive on dark-but-valid shots.
const BLACK_FRAME_MAX_BRIGHTNESS = 24; // sum of R+G+B, ~8 per channel

function isFrameBlack(sourceCanvas) {
	const sampleW = 32;
	const sampleH = 18;
	const sample = new OffscreenCanvas(sampleW, sampleH);
	const sctx = sample.getContext('2d', { willReadFrequently: true });
	if (!sctx) {
		return false;
	}
	sctx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);
	const { data } = sctx.getImageData(0, 0, sampleW, sampleH);
	for (let i = 0; i < data.length; i += 4) {
		if (data[i] + data[i + 1] + data[i + 2] > BLACK_FRAME_MAX_BRIGHTNESS) {
			return false;
		}
	}
	return true;
}

let sessionInfo = null;
let telemetry = null;
let windowID = null;
let crop = false;
let cropTopLeft = false;
let captureBounds = null;
let captureTargetDiagnostics = null;
let preResolvedSourceId = null;
// Set true when main sends 'abort-capture' (iRacing disconnected mid-capture, or
// the main-side watchdog fired). The in-flight capture checks this at each await
// boundary and bails silently — main owns the recovery.
let captureAborted = false;
let targetWidth = null;
let targetHeight = null;
// Window dimensions = what SetWindowPos actually resized iRacing to, which is
// now the selected resolution itself (no expansion). Used by fullscreenScreenshot
// to verify the captured stream came back at the new size and not the prior
// native dimensions. NOT to be confused with targetWidth/targetHeight, which are
// the smaller post-crop output dimensions (window size minus the watermark
// margin) used for crop output sizing.
let windowWidth = null;
let windowHeight = null;
function isPlainObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value);
}

function mergePlainObjects(...objects) {
	return objects.reduce((result, value) => {
		if (!isPlainObject(value)) {
			return result;
		}

		Object.entries(value).forEach(([key, entryValue]) => {
			if (isPlainObject(entryValue) && isPlainObject(result[key])) {
				result[key] = mergePlainObjects(result[key], entryValue);
				return;
			}

			if (isPlainObject(entryValue)) {
				result[key] = mergePlainObjects(entryValue);
				return;
			}

			if (Array.isArray(entryValue)) {
				result[key] = entryValue.slice();
				return;
			}

			result[key] = entryValue;
		});

		return result;
	}, {});
}

function getWorkerScreenshotDiagnostics() {
	return {
		worker: {
			processType: process.type || 'renderer',
			electron: String(process.versions.electron || ''),
			chrome: String(process.versions.chrome || ''),
			node: String(process.versions.node || ''),
			v8: String(process.versions.v8 || ''),
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			language: navigator.language,
			languages: Array.isArray(navigator.languages)
				? navigator.languages.slice(0, 10)
				: [],
			hardwareConcurrency: navigator.hardwareConcurrency || 0,
			devicePixelRatio: window.devicePixelRatio || 1,
			screen: {
				width: window.screen.width,
				height: window.screen.height,
				availWidth: window.screen.availWidth,
				availHeight: window.screen.availHeight,
			},
			captureState: {
				windowID,
				crop,
				cropTopLeft,
				captureBounds,
				captureTargetDiagnostics,
			},
		},
	};
}

function createScreenshotErrorPayload(errorLike, context, meta = {}) {
	if (
		errorLike &&
		typeof errorLike === 'object' &&
		!Array.isArray(errorLike) &&
		typeof errorLike.message === 'string'
	) {
		return {
			message: String(errorLike.message),
			stack: String(errorLike.stack || ''),
			source: 'worker',
			context,
			meta,
			diagnostics: mergePlainObjects(
				getWorkerScreenshotDiagnostics(),
				errorLike.diagnostics
			),
		};
	}

	const message = String(errorLike || 'Unknown screenshot error');
	const error = errorLike instanceof Error ? errorLike : new Error(message);

	return {
		message: error.message || message,
		stack: String(error.stack || ''),
		source: 'worker',
		context,
		meta,
		diagnostics: getWorkerScreenshotDiagnostics(),
	};
}

function sendScreenshotError(errorLike, context, meta = {}) {
	const payload = createScreenshotErrorPayload(errorLike, context, meta);
	log.info('Screenshot error', { context, message: payload.message });
	console.error('Screenshot worker error:', payload.message);
	if (payload.stack) {
		console.error(payload.stack);
	}
	ipcRenderer.send('screenshot-error', payload);
}

function ensureDirectory(targetDir) {
	fs.mkdirSync(targetDir, { recursive: true });
}

function getScreenshotDir() {
	return path.resolve(config.get('screenshotFolder'));
}

function getCacheDir() {
	return path.join(userDataPath, 'Cache');
}

function getScreenshotPath(fileName) {
	const fmt = getOutputFormat();
	return path.join(getScreenshotDir(), `${fileName}${fmt.ext}`);
}

function getThumbnailPath(fileName) {
	return path.join(getCacheDir(), `${fileName}.webp`);
}

function normalizeComparePath(filePath) {
	return path.resolve(filePath).toLowerCase();
}

async function removeFileWithRetries(filePath, attempts = 8, intervalMs = 250) {
	for (let index = 0; index < attempts; index += 1) {
		try {
			await fs.promises.unlink(filePath);
			return;
		} catch (error) {
			// catch-clause variable is `unknown` under TS 4.4+; narrow via any-cast.
			if ((error as any).code === 'ENOENT') {
				return;
			}

			if (index === attempts - 1) {
				throw error;
			}

			await delay(intervalMs);
		}
	}
}

async function cleanupReshadeSourceFile(sourceFile, destinationFile) {
	if (
		normalizeComparePath(sourceFile) === normalizeComparePath(destinationFile)
	) {
		return;
	}

	await removeFileWithRetries(sourceFile);
}

async function createThumbnail(fileName, fileKey) {
	const thumbPath = getThumbnailPath(fileKey);
	const thumbStart = performance.now();
	await sharp(fileName)
		.resize(1280, 720, {
			fit: 'contain',
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.toFile(thumbPath);
	log.debug('Thumbnail write', {
		elapsed: Math.round(performance.now() - thumbStart),
		file: thumbPath,
	});
	log.info('Thumbnail created', { file: thumbPath });
}

// In-memory gallery thumbnail: downscale the captured frame (fit:contain,
// transparent letterbox) without re-decoding the saved full-resolution file.
// Uses an alpha:true canvas so the letterbox padding stays transparent, matching
// the previous sharp output.
const THUMB_WIDTH = 1280;
const THUMB_HEIGHT = 720;

async function renderThumbnailBlob(sourceCanvas, srcWidth, srcHeight) {
	const scale = Math.min(THUMB_WIDTH / srcWidth, THUMB_HEIGHT / srcHeight);
	const drawW = Math.max(1, Math.round(srcWidth * scale));
	const drawH = Math.max(1, Math.round(srcHeight * scale));
	const thumb = new OffscreenCanvas(THUMB_WIDTH, THUMB_HEIGHT);
	const tctx = thumb.getContext('2d', { alpha: true });
	if (!tctx) {
		return null;
	}
	tctx.drawImage(
		sourceCanvas,
		0,
		0,
		srcWidth,
		srcHeight,
		Math.round((THUMB_WIDTH - drawW) / 2),
		Math.round((THUMB_HEIGHT - drawH) / 2),
		drawW,
		drawH
	);
	return thumb.convertToBlob({ type: 'image/webp', quality: 0.8 });
}

function getFileNameString() {
	const useCustom = config.get('customFilenameFormat');
	const formatString = useCustom
		? config.get('filenameFormat') || '{track}-{driver}-{counter}'
		: '{track}-{driver}-{counter}';

	// Resolve all tokens except {counter}
	const resolved = resolveFilenameFormat(formatString, sessionInfo, telemetry);

	ensureDirectory(getScreenshotDir());

	// Handle {counter} - find unique filename
	if (resolved.includes('{counter}')) {
		let count = 0;
		let fileName = resolved.replace('{counter}', String(count));
		while (fs.existsSync(getScreenshotPath(fileName))) {
			count += 1;
			fileName = resolved.replace('{counter}', String(count));
		}
		return fileName;
	}

	// No counter - still need uniqueness, append counter if file exists
	if (fs.existsSync(getScreenshotPath(resolved))) {
		let count = 1;
		while (fs.existsSync(getScreenshotPath(resolved + '-' + count))) {
			count += 1;
		}
		return resolved + '-' + count;
	}
	return resolved;
}

async function saveReshadeImage(sourceFile) {
	try {
		ensureDirectory(getScreenshotDir());
		ensureDirectory(getCacheDir());

		const fileKey = getFileNameString();
		const fileName = getScreenshotPath(fileKey);

		sharp.cache(false);
		crop = config.get('crop');
		const cropTopLeftFlag = config.get('cropTopLeft');

		const image = sharp(sourceFile);
		const metadata = await image.metadata();
		log.debug('ReShade image metadata', {
			width: metadata.width,
			height: metadata.height,
		});

		if (
			!metadata.width ||
			!metadata.height ||
			metadata.width < 100 ||
			metadata.height < 100
		) {
			throw new Error('image is too small');
		}

		const reshadeProcessStart = performance.now();
		if (crop && cropTopLeftFlag && targetWidth && targetHeight) {
			// Legacy: crop the bottom-right corner off — output is the render size
			// minus the watermark margin
			await image
				.extract({
					left: 0,
					top: 0,
					width: targetWidth,
					height: targetHeight,
				})
				.toFile(fileName);
		} else if (crop && targetWidth && targetHeight) {
			// Default: center-crop each side off — output is the render size minus
			// the watermark margin
			const cropX = Math.round((metadata.width - targetWidth) / 2);
			const cropY = Math.round((metadata.height - targetHeight) / 2);
			await image
				.extract({
					left: cropX,
					top: cropY,
					width: targetWidth,
					height: targetHeight,
				})
				.toFile(fileName);
		} else {
			await image.toFile(fileName);
		}
		log.debug('ReShade image processed', {
			elapsed: Math.round(performance.now() - reshadeProcessStart),
			file: fileName,
		});
		log.info('ReShade screenshot saved', {
			file: fileName,
			crop,
			cropTopLeft: cropTopLeftFlag,
		});

		await cleanupReshadeSourceFile(sourceFile, fileName);
		await createThumbnail(fileName, fileKey);
		ipcRenderer.send('screenshot-response', fileName);
		if (global.gc) {
			global.gc();
		}
	} catch (error) {
		sendScreenshotError(error, 'save-reshade-image', {
			sourceFile,
			screenshotDir: getScreenshotDir(),
			crop,
		});
	}
}

async function saveImage(blob, thumbBlob) {
	try {
		console.time('Save Image');
		ensureDirectory(getScreenshotDir());
		ensureDirectory(getCacheDir());

		const fileKey = getFileNameString();
		const fileName = getScreenshotPath(fileKey);
		const buffer = Buffer.from(await blob.arrayBuffer());

		console.time('Save Image to file');
		const fileWriteStart = performance.now();
		await fs.promises.writeFile(fileName, buffer);
		log.debug('File write', {
			elapsed: Math.round(performance.now() - fileWriteStart),
			file: fileName,
			bytes: buffer.length,
		});
		log.info('Screenshot saved', { file: fileName });
		console.timeEnd('Save Image to file');

		// Restore window immediately — thumbnail doesn't need to block it
		ipcRenderer.send('screenshot-finished', '');
		ipcRenderer.send('screenshot-response', fileName);

		console.time('Save Thumbnail');
		if (thumbBlob) {
			const thumbPath = getThumbnailPath(fileKey);
			const thumbStart = performance.now();
			await fs.promises.writeFile(
				thumbPath,
				Buffer.from(await thumbBlob.arrayBuffer())
			);
			log.debug('Thumbnail write (in-memory)', {
				elapsed: Math.round(performance.now() - thumbStart),
				file: thumbPath,
			});
			log.info('Thumbnail created', { file: thumbPath });
		} else {
			// Fallback: no in-memory thumbnail was produced — re-decode the file.
			await createThumbnail(fileName, fileKey);
		}
		console.timeEnd('Save Thumbnail');
		if (global.gc) {
			global.gc();
		}

		console.timeEnd('Save Image');
		console.timeEnd('Screenshot');
	} catch (error) {
		ipcRenderer.send('screenshot-finished', '');
		sendScreenshotError(error, 'save-image', {
			screenshotDir: getScreenshotDir(),
			crop,
		});
	}
}

async function fullscreenScreenshot(callback) {
	// Draw the current frame of `video` (crop-adjusted) into an OffscreenCanvas,
	// encode it, and hand the blob to the callback. The blob is self-contained,
	// so the stream/video can be released immediately afterwards.
	const encodeAndDeliver = async (video, captureTarget) => {
		const captureRect = resolveDisplayCaptureRect(
			video.videoWidth,
			video.videoHeight,
			captureTarget
		);

		let outputWidth, outputHeight, srcX, srcY;
		if (crop && cropTopLeft && targetWidth && targetHeight) {
			// Legacy: crop the bottom-right corner off — output is the render
			// size minus the watermark margin
			outputWidth = targetWidth;
			outputHeight = targetHeight;
			srcX = captureRect.x;
			srcY = captureRect.y;
		} else if (crop && targetWidth && targetHeight) {
			// Default: center-crop each side off — output is the render size
			// minus the watermark margin
			outputWidth = targetWidth;
			outputHeight = targetHeight;
			const cropX = Math.round((captureRect.width - outputWidth) / 2);
			const cropY = Math.round((captureRect.height - outputHeight) / 2);
			srcX = captureRect.x + cropX;
			srcY = captureRect.y + cropY;
		} else {
			outputWidth = captureRect.width;
			outputHeight = captureRect.height;
			srcX = captureRect.x;
			srcY = captureRect.y;
		}

		if (outputWidth < 1 || outputHeight < 1) {
			throw new Error(
				`Capture output is too small (${outputWidth}x${outputHeight})`
			);
		}

		console.time('Create OffscreenCanvas');
		const offscreen = new OffscreenCanvas(outputWidth, outputHeight);
		const offctx = offscreen.getContext('2d', { alpha: false });
		const drawStart = performance.now();
		offctx.drawImage(
			video,
			srcX,
			srcY,
			outputWidth,
			outputHeight,
			0,
			0,
			outputWidth,
			outputHeight
		);
		log.debug('Canvas draw', {
			elapsed: Math.round(performance.now() - drawStart),
			outputWidth,
			outputHeight,
		});
		console.timeEnd('Create OffscreenCanvas');

		if (isFrameBlack(offscreen)) {
			throw new Error(
				'Captured frame is black — the capture source may have failed (GPU-accelerated content can fail to capture on some Windows setups)'
			);
		}

		console.time('To Blob');
		const blobStart = performance.now();
		const fmt = getOutputFormat();
		// blobOpts inferred as { type: any } on first line; `quality` set
		// conditionally — cast to any for the optional-property assignment.
		const blobOpts: any = { type: fmt.mime };
		if (fmt.quality !== undefined) blobOpts.quality = fmt.quality;
		const blob = await offscreen.convertToBlob(blobOpts);
		log.debug('Blob conversion', {
			elapsed: Math.round(performance.now() - blobStart),
			type: fmt.mime,
		});
		console.timeEnd('To Blob');
		console.timeEnd('Draw Image');

		// Build the gallery thumbnail from the same in-memory frame instead of
		// re-decoding the just-written full-resolution file with sharp.
		const thumbBlob = await renderThumbnailBlob(
			offscreen,
			outputWidth,
			outputHeight
		);

		callback(blob, thumbBlob);
	};

	const handleError = (error) => {
		if (captureAborted) {
			// Main already restored the window and reported the error on abort.
			return;
		}
		ipcRenderer.send('screenshot-finished', '');
		sendScreenshotError(error, 'fullscreen-capture', {
			windowID,
			crop,
			captureBounds,
		});
	};

	console.time('Draw Image');
	console.time('Get Media');

	try {
		// Brief initial settling delay for iRacing to re-render at the new
		// resolution before the first capture attempt.
		log.debug('Settling delay start', { ms: 200 });
		await delay(200);
		log.debug('Settling delay end');

		let sourceId = preResolvedSourceId;
		let captureTarget: any = null;

		if (sourceId) {
			// Fast path: source ID was pre-resolved by the main process during
			// resize, skipping the expensive IPC round-trip (~2-3s).
			log.debug('Using pre-resolved source', { sourceId });
			console.log(`Using capture source ${sourceId} (pre-resolved)`);
			captureTarget = { id: sourceId, kind: 'window' };
		} else {
			// Slow fallback: full desktop source enumeration via IPC
			log.debug('Falling back to source enumeration');
			console.log(
				'No pre-resolved source ID, falling back to source enumeration'
			);
			captureTarget = normalizeCaptureTarget(
				await ipcRenderer.invoke('desktop-capturer:get-source-id', {
					windowID,
					captureBounds,
				})
			);
			sourceId = captureTarget.id;
			captureTargetDiagnostics = captureTarget.diagnostics;
			log.debug('Source enumeration result', {
				sourceId,
				kind: captureTarget.kind,
			});
		}

		if (!sourceId) {
			throw new Error(
				'No desktop capture source found for window ' + windowID
			);
		}

		// The desktop-capture pipeline can briefly keep delivering the prior
		// (pre-resize) frame after SetWindowPos, so for window captures we wait
		// until the stream's frames report the post-resize window dimensions.
		// Display captures grab the full display and extract downstream, so they
		// skip the dim wait.
		const acquireStream = async () => {
			const t0 = performance.now();
			// Electron's getUserMedia accepts a `mandatory` Chrome-internal property
			// that isn't in the standard MediaTrackConstraints TS type. Cast to any.
			const s = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					mandatory: {
						chromeMediaSource: 'desktop',
						chromeMediaSourceId: sourceId,
						minWidth: 1280,
						maxWidth: 10000,
						minHeight: 720,
						maxHeight: 10000,
					},
				},
			} as any);
			log.debug('getUserMedia complete', {
				elapsed: Math.round(performance.now() - t0),
			});
			return s;
		};

		const DIM_TOLERANCE = 2;
		const captureKind =
			captureTarget && captureTarget.kind === 'display'
				? 'display'
				: 'window';
		const wantDimCheck = Boolean(
			captureKind === 'window' && windowWidth && windowHeight
		);
		// Tolerance absorbs capture-pipeline rounding to even dimensions (h.264 /
		// DWM require even width/height; an odd target like 1145 is captured as
		// 1144) plus minor DPI/border artifacts.
		const dimsMatch = (sw: number, sh: number) =>
			Math.abs(sw - windowWidth) <= DIM_TOLERANCE &&
			Math.abs(sh - windowHeight) <= DIM_TOLERANCE;

		// Single-stream capture: acquire ONE stream, attach it to one <video>, and
		// wait for an actually-presented frame via requestVideoFrameCallback (rVFC)
		// instead of the old tear-down-and-re-acquire-every-300ms loop (which spun
		// up a fresh desktop-capture session each iteration and double-decoded
		// through a throwaway probe video). We poll successive frames of the SAME
		// stream until the dimensions match the resized window, and only fully
		// re-acquire as a bounded fallback for the rare stale-locked-track case.
		const waitForVideoReady = (v: HTMLVideoElement): Promise<void> =>
			new Promise((resolve, reject) => {
				if (v.readyState >= 1) {
					resolve();
					return;
				}
				const cleanup = () => {
					clearTimeout(timer);
					v.removeEventListener('loadedmetadata', onReady);
					v.removeEventListener('error', onError);
				};
				const onReady = () => {
					cleanup();
					resolve();
				};
				const onError = () => {
					cleanup();
					reject(new Error('capture video error'));
				};
				const timer = setTimeout(() => {
					cleanup();
					reject(
						new Error('Timed out waiting for capture video metadata')
					);
				}, HANDLE_STREAM_TIMEOUT_MS);
				v.addEventListener('loadedmetadata', onReady, { once: true });
				v.addEventListener('error', onError, { once: true });
			});

		// Resolve when the next frame is presented (rVFC), with an upper-bound
		// fallback so an off-DOM video that never triggers rVFC can't hang the poll
		// — a decoded frame is available shortly after play() regardless.
		const nextFramePresented = (v: HTMLVideoElement): Promise<void> =>
			new Promise((resolve) => {
				let done = false;
				const finish = () => {
					if (!done) {
						done = true;
						resolve();
					}
				};
				const rvfc = (v as any).requestVideoFrameCallback;
				if (typeof rvfc === 'function') {
					try {
						rvfc.call(v, () => finish());
					} catch {
						/* fall through to the timeout */
					}
				}
				setTimeout(finish, 120);
			});

		let stream: MediaStream | null = null;
		let video: HTMLVideoElement | null = null;

		const releaseCapture = () => {
			if (video) {
				try {
					video.pause();
				} catch {
					/* noop */
				}
				video.srcObject = null;
				video.remove();
				video = null;
			}
			if (stream) {
				try {
					stream.getTracks().forEach((t) => t.stop());
				} catch {
					/* noop */
				}
				stream = null;
			}
		};

		try {
			const MAX_WAIT_MS = 8000;
			const REACQUIRE_LIMIT = 1;
			const waitStart = performance.now();
			let matched = false;

			for (
				let attempt = 0;
				attempt <= REACQUIRE_LIMIT && !captureAborted;
				attempt += 1
			) {
				stream = await acquireStream();
				if (attempt === 0) {
					console.timeEnd('Get Media');
				}
				const activeVideo = document.createElement('video');
				video = activeVideo;
				activeVideo.muted = true;
				(activeVideo as any).playsInline = true;
				activeVideo.srcObject = stream;
				await waitForVideoReady(activeVideo);
				await activeVideo.play().catch(() => {
					/* muted autoplay; frames arrive regardless */
				});
				await nextFramePresented(activeVideo);

				if (!wantDimCheck) {
					matched = true;
					break;
				}

				while (
					!captureAborted &&
					!dimsMatch(activeVideo.videoWidth, activeVideo.videoHeight) &&
					performance.now() - waitStart < MAX_WAIT_MS
				) {
					await nextFramePresented(activeVideo);
				}

				if (dimsMatch(activeVideo.videoWidth, activeVideo.videoHeight)) {
					matched = true;
					break;
				}

				// Never reached the target size within the budget. If time remains,
				// re-acquire once (stale-locked-track case); otherwise proceed with
				// whatever we have.
				if (performance.now() - waitStart >= MAX_WAIT_MS) {
					break;
				}
				log.debug('Stream dim mismatch — re-acquiring once', {
					streamW: activeVideo.videoWidth,
					streamH: activeVideo.videoHeight,
					windowWidth,
					windowHeight,
				});
				releaseCapture();
			}

			if (captureAborted) {
				// Aborted mid-acquisition (iRacing disconnected or watchdog). Main
				// owns recovery — release and bail without reporting.
				releaseCapture();
				log.info('Capture aborted before handoff — skipping');
				return;
			}

			if (!video) {
				throw new Error('Capture stream did not produce a video frame');
			}
			const finalVideo = video;

			if (wantDimCheck && !matched) {
				// Proceed with whatever the stream delivered instead of failing — a
				// wrong-resolution image beats no image, and the warning is logged
				// for diagnosis.
				log.info('Stream dim wait timeout — proceeding', {
					streamW: finalVideo.videoWidth,
					streamH: finalVideo.videoHeight,
					windowWidth,
					windowHeight,
					elapsedMs: Math.round(performance.now() - waitStart),
				});
				console.warn(
					`Timed out waiting for window dimensions ${windowWidth}x${windowHeight}; proceeding with ${finalVideo.videoWidth}x${finalVideo.videoHeight}`
				);
			} else if (wantDimCheck) {
				log.debug('Stream dim confirmed', {
					streamW: finalVideo.videoWidth,
					streamH: finalVideo.videoHeight,
					elapsedMs: Math.round(performance.now() - waitStart),
				});
			}

			await encodeAndDeliver(finalVideo, captureTarget);
		} finally {
			releaseCapture();
		}
	} catch (error) {
		handleError(error);
	}
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
	mounted() {
		ipcRenderer.on('screenshot-request', (event, input) => {
			console.log(
				`Screenshot - ${input.width}x${input.height} Crop - ${input.crop} TopLeft - ${input.cropTopLeft}`
			);
			console.time('Screenshot');
			windowID = input.windowID;
			crop = input.crop;
			cropTopLeft = input.cropTopLeft || false;
			captureBounds = normalizeCaptureBounds(input.captureBounds);
			captureTargetDiagnostics = null;
			preResolvedSourceId = input.sourceId || null;
			targetWidth = input.targetWidth || null;
			targetHeight = input.targetHeight || null;
			windowWidth = input.width || null;
			windowHeight = input.height || null;
			log.info('Screenshot capture started', {
				width: input.width,
				height: input.height,
				crop: input.crop,
				cropTopLeft: input.cropTopLeft,
			});
			if (windowID === undefined) {
				sendScreenshotError(
					'iRacing window not found',
					'worker:screenshot-request',
					{
						request: input,
						captureBounds,
					}
				);
				return;
			}

			captureAborted = false;
			fullscreenScreenshot((blob, thumbBlob) => {
				saveImage(blob, thumbBlob);
			});
		});

		ipcRenderer.on('abort-capture', (event, reason) => {
			// Main tells us to abandon the in-flight capture (iRacing disconnected
			// mid-capture, or the watchdog fired). The capture loop and handoff
			// check this flag and bail silently — main owns the recovery path.
			captureAborted = true;
			log.info('Capture aborted', { reason });
		});

		ipcRenderer.on('session-info', (event, arg) => {
			sessionInfo = arg;
		});

		ipcRenderer.on('telemetry', (event, arg) => {
			telemetry = arg;
		});

		ipcRenderer.on('screenshot-reshade', (event, arg) => {
			// Payload is `{ file, targetWidth, targetHeight }` — main forwards
			// the user-chosen resolution so saveReshadeImage can crop to it.
			// Module-level targetWidth/targetHeight are otherwise only set by
			// the non-ReShade `screenshot-request` handler, which leaves them
			// null for ReShade flows and silently disables the crop branches.
			targetWidth = arg.targetWidth || null;
			targetHeight = arg.targetHeight || null;
			saveReshadeImage(arg.file);
		});
	},
	methods: {},
};
</script>
