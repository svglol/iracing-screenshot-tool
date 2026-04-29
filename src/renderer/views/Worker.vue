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

const FORMAT_MAP = {
	jpeg: { mime: 'image/jpeg', ext: '.jpg', quality: 0.95 },
	png: { mime: 'image/png', ext: '.png', quality: undefined },
	webp: { mime: 'image/webp', ext: '.webp', quality: 0.95 },
};

function getOutputFormat() {
	const key = config.get('outputFormat') || 'jpeg';
	return FORMAT_MAP[key] || FORMAT_MAP.jpeg;
}

let sessionInfo = null;
let telemetry = null;
let windowID = null;
let crop = false;
let cropTopLeft = false;
let captureBounds = null;
let captureTargetDiagnostics = null;
let preResolvedSourceId = null;
let targetWidth = null;
let targetHeight = null;
// Expanded window dimensions (= what SetWindowPos actually resized iRacing to).
// Used by fullscreenScreenshot to verify the captured stream came back at the
// new size and not the prior native dimensions. NOT to be confused with
// targetWidth/targetHeight, which are the un-expanded user-facing values used
// for crop output sizing.
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
			// Legacy: crop bottom-right — output is the original target resolution
			await image
				.extract({
					left: 0,
					top: 0,
					width: targetWidth,
					height: targetHeight,
				})
				.toFile(fileName);
		} else if (crop && targetWidth && targetHeight) {
			// Default: crop from each side — center-extract the original target resolution
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

async function saveImage(blob) {
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
		await createThumbnail(fileName, fileKey);
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
	const handleStream = (stream) => {
		console.timeEnd('Get Media');
		let video = document.createElement('video');

		video.addEventListener('loadedmetadata', async function () {
			try {
				video.style.height = this.videoHeight + 'px';
				video.style.width = this.videoWidth + 'px';

				video.play();
				video.pause();

				const captureTarget = normalizeCaptureTarget(
					stream.__captureTarget
				);
				const captureRect = resolveDisplayCaptureRect(
					this.videoWidth,
					this.videoHeight,
					captureTarget
				);

				let outputWidth, outputHeight, srcX, srcY;
				if (crop && cropTopLeft && targetWidth && targetHeight) {
					// Legacy: crop bottom-right — output is the original target resolution
					outputWidth = targetWidth;
					outputHeight = targetHeight;
					srcX = captureRect.x;
					srcY = captureRect.y;
				} else if (crop && targetWidth && targetHeight) {
					// Default: crop from each side — center-extract the original target resolution
					outputWidth = targetWidth;
					outputHeight = targetHeight;
					const cropX = Math.round((captureRect.width - outputWidth) / 2);
					const cropY = Math.round(
						(captureRect.height - outputHeight) / 2
					);
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
				callback(blob);
			} catch (error) {
				handleError(error);
			} finally {
				video.srcObject = null;
				video.remove();

				try {
					stream.getTracks().forEach((track) => track.stop());
					video = null;
				} catch (error) {
					console.log(error);
				}
			}
		});

		video.srcObject = stream;
	};

	const handleError = (error) => {
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

		// Acquire the capture stream, then verify (for window-mode captures only)
		// that the stream came back at the post-resize window dimensions and not
		// the prior native dimensions. SetWindowPos completes synchronously at
		// the OS level but the OS-level capture pipeline may still be holding the
		// previous frame; on slow / loaded user machines this race causes the
		// captured PNG to come out at native resolution instead of the selected
		// target. Display-mode captures intentionally capture the full display
		// and extract the sub-region downstream — skip the dim-check for them.
		//
		// History: an earlier version of this guard (commit 3f5ff3c) compared
		// against `targetWidth/targetHeight` (the un-expanded crop output dims),
		// which never matched the actual stream dims; it was removed in af9dd43,
		// which restored the original race. Compare against the *window* dims
		// (= what SetWindowPos actually resized to) so the check matches cleanly.
		const RETRY_DELAY_MS = 300;
		const MAX_WAIT_MS = 8000;
		const retryStart = performance.now();

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

		// In Electron's desktopCapturer flow, `track.getSettings().{width,height}`
		// returns the constraint bounds (here 10000×10000), not actual frame
		// dimensions. Probe the real dimensions via a temporary <video> element's
		// videoWidth/videoHeight after loadedmetadata.
		const probeStreamDimensions = async (
			s: MediaStream
		): Promise<{ w: number; h: number }> => {
			const probe = document.createElement('video');
			probe.muted = true;
			(probe as any).playsInline = true;
			probe.srcObject = s;
			const ready = new Promise<void>((resolve, reject) => {
				if (probe.readyState >= 1) {
					resolve();
					return;
				}
				probe.addEventListener('loadedmetadata', () => resolve(), {
					once: true,
				});
				probe.addEventListener(
					'error',
					() => reject(new Error('probe error')),
					{ once: true }
				);
			});
			try {
				probe.play().catch(() => {
					/* best-effort: metadata fires regardless on some browsers */
				});
				await Promise.race([
					ready,
					new Promise<void>((_, reject) =>
						setTimeout(() => reject(new Error('probe timeout')), 1500)
					),
				]);
				return { w: probe.videoWidth || 0, h: probe.videoHeight || 0 };
			} finally {
				try {
					probe.pause();
				} catch {
					/* noop */
				}
				probe.srcObject = null;
				probe.remove();
			}
		};

		let stream = await acquireStream();

		const captureKind =
			captureTarget && captureTarget.kind === 'display'
				? 'display'
				: 'window';
		if (captureKind === 'window' && windowWidth && windowHeight) {
			// Tolerance to absorb capture-pipeline rounding to even dimensions
			// (h.264 / DWM require even width/height; an odd target like 1145 is
			// captured as 1144). 2px also covers minor DPI/border artifacts.
			const DIM_TOLERANCE = 2;
			const dimsMatch = (sw: number, sh: number) =>
				Math.abs(sw - windowWidth) <= DIM_TOLERANCE &&
				Math.abs(sh - windowHeight) <= DIM_TOLERANCE;

			let dims = await probeStreamDimensions(stream).catch(() => ({
				w: 0,
				h: 0,
			}));
			let streamW = dims.w;
			let streamH = dims.h;

			while (
				!dimsMatch(streamW, streamH) &&
				performance.now() - retryStart < MAX_WAIT_MS
			) {
				log.debug('Stream dim mismatch — retrying', {
					streamW,
					streamH,
					windowWidth,
					windowHeight,
					waitMs: RETRY_DELAY_MS,
				});
				console.log(
					`Stream dimensions ${streamW}x${streamH} do not match window ${windowWidth}x${windowHeight} — retrying in ${RETRY_DELAY_MS}ms`
				);
				try {
					stream.getTracks().forEach((t) => t.stop());
				} catch {
					// best-effort cleanup
				}
				await delay(RETRY_DELAY_MS);
				stream = await acquireStream();
				dims = await probeStreamDimensions(stream).catch(() => ({
					w: 0,
					h: 0,
				}));
				streamW = dims.w;
				streamH = dims.h;
			}

			if (!dimsMatch(streamW, streamH)) {
				// Don't fail the capture — proceed with whatever the stream
				// delivered. The user will see a wrong-resolution PNG instead of
				// no PNG at all, which is a strictly better failure mode and
				// leaves the warning in the log for diagnosis.
				// Logger has no 'warn' level — use info; the console.warn below preserves the
				// dev-tools severity badge.
				log.info('Stream dim retry timeout — proceeding', {
					streamW,
					streamH,
					windowWidth,
					windowHeight,
					elapsedMs: Math.round(performance.now() - retryStart),
				});
				console.warn(
					`Timed out waiting for window dimensions ${windowWidth}x${windowHeight}; proceeding with ${streamW}x${streamH}`
				);
			} else {
				log.debug('Stream dim confirmed', {
					streamW,
					streamH,
					elapsedMs: Math.round(performance.now() - retryStart),
				});
			}
		}

		// Attach custom marker to MediaStream instance (not in lib.dom.d.ts).
		(stream as any).__captureTarget = captureTarget;
		handleStream(stream);
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

			fullscreenScreenshot((base64data) => {
				saveImage(base64data);
			});
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
