<template>
  <h1>This is a Worker Process</h1>
</template>

<script>
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  normalizeCaptureBounds,
  normalizeCaptureTarget,
  resolveDisplayCaptureRect
} = require('../../utilities/desktop-capture');
const {
  sanitizeFilePart,
  buildScreenshotFileKey
} = require('../../utilities/screenshot-name');

const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const config = require('../../utilities/config');
const { resolveFilenameFormat } = require('../../utilities/filenameFormat');

let sessionInfo = null;
let telemetry = null;
let windowID = null;
let crop = false;
let cropTopLeft = false;
let captureBounds = null;
let captureTargetDiagnostics = null;
let targetWidth = null;
let targetHeight = null;

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
      languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 10) : [],
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight
      },
      captureState: {
        windowID,
        crop,
        cropTopLeft,
        captureBounds,
        captureTargetDiagnostics
      }
    }
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
      diagnostics: mergePlainObjects(getWorkerScreenshotDiagnostics(), errorLike.diagnostics)
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
    diagnostics: getWorkerScreenshotDiagnostics()
  };
}

function sendScreenshotError(errorLike, context, meta = {}) {
  const payload = createScreenshotErrorPayload(errorLike, context, meta);
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
  return path.join(getScreenshotDir(), `${fileName}.png`);
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
      if (error.code === 'ENOENT') {
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
  if (normalizeComparePath(sourceFile) === normalizeComparePath(destinationFile)) {
    return;
  }

  await removeFileWithRetries(sourceFile);
}

async function createThumbnail(fileName, fileKey) {
  const thumbPath = getThumbnailPath(fileKey);
  await sharp(fileName)
    .resize(1280, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(thumbPath);
}

function getFileNameString() {
  const useCustom = config.get('customFilenameFormat');
  const formatString = useCustom ? (config.get('filenameFormat') || '{track}-{driver}-{counter}') : '{track}-{driver}-{counter}';

  // Resolve all tokens except {counter}
  const resolved = resolveFilenameFormat(formatString, sessionInfo, telemetry);

  ensureDirectory(getScreenshotDir());

  // Handle {counter} - find unique filename
  if (resolved.includes('{counter}')) {
    let count = 0;
    let fileName = resolved.replace('{counter}', count);
    while (fs.existsSync(getScreenshotPath(fileName))) {
      count += 1;
      fileName = resolved.replace('{counter}', count);
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

    if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100) {
      throw new Error('image is too small');
    }

    if (crop && cropTopLeftFlag) {
      // Legacy: crop 3% from bottom-right
      await image
        .extract({
          left: 0,
          top: 0,
          width: metadata.width - Math.ceil(metadata.width * 0.03),
          height: metadata.height - Math.ceil(metadata.height * 0.03)
        })
        .toFile(fileName);
    } else if (crop) {
      // Default: crop 3% from each side
      const cropX = Math.ceil(metadata.width * 0.03);
      const cropY = Math.ceil(metadata.height * 0.03);
      await image
        .extract({
          left: cropX,
          top: cropY,
          width: metadata.width - cropX * 2,
          height: metadata.height - cropY * 2
        })
        .toFile(fileName);
    } else {
      await image.toFile(fileName);
    }

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
      crop
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
    await fs.promises.writeFile(fileName, buffer);
    console.timeEnd('Save Image to file');

    console.time('Save Thumbnail');
    await createThumbnail(fileName, fileKey);
    console.timeEnd('Save Thumbnail');

    ipcRenderer.send('screenshot-finished', '');
    ipcRenderer.send('screenshot-response', fileName);
    if (global.gc) {
      global.gc();
    }

    console.timeEnd('Save Image');
    console.timeEnd('Screenshot');
  } catch (error) {
    ipcRenderer.send('screenshot-finished', '');
    sendScreenshotError(error, 'save-image', {
      screenshotDir: getScreenshotDir(),
      crop
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

        const captureTarget = normalizeCaptureTarget(stream.__captureTarget);
        const captureRect = resolveDisplayCaptureRect(this.videoWidth, this.videoHeight, captureTarget);

        let outputWidth, outputHeight, srcX, srcY;
        if (crop && cropTopLeft) {
          // Legacy: crop 3% from bottom-right only
          outputWidth = captureRect.width - Math.ceil(captureRect.width * 0.03);
          outputHeight = captureRect.height - Math.ceil(captureRect.height * 0.03);
          srcX = captureRect.x;
          srcY = captureRect.y;
        } else if (crop) {
          // Default: crop 3% from each side (6% total expansion, center extract)
          outputWidth = captureRect.width - Math.ceil(captureRect.width * 0.06);
          outputHeight = captureRect.height - Math.ceil(captureRect.height * 0.06);
          srcX = captureRect.x + Math.ceil(captureRect.width * 0.03);
          srcY = captureRect.y + Math.ceil(captureRect.height * 0.03);
        } else {
          outputWidth = captureRect.width;
          outputHeight = captureRect.height;
          srcX = captureRect.x;
          srcY = captureRect.y;
        }

        if (outputWidth < 1 || outputHeight < 1) {
          throw new Error(`Capture output is too small (${outputWidth}x${outputHeight})`);
        }

        console.time('Create OffscreenCanvas');
        const offscreen = new OffscreenCanvas(outputWidth, outputHeight);

        const offctx = offscreen.getContext('2d', { alpha: false });
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

        console.timeEnd('Create OffscreenCanvas');
        console.time('To Blob');
        const blob = await offscreen.convertToBlob({ type: 'image/png' });
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
      captureBounds
    });
  };

  console.time('Draw Image');
  console.time('Get Media');

  const RETRY_DELAY_MS = 300;
  const MAX_WAIT_MS = 8000;
  const startTime = Date.now();

  const acquireStream = async () => {
    const captureTarget = normalizeCaptureTarget(
      await ipcRenderer.invoke('desktop-capturer:get-source-id', {
        windowID,
        captureBounds
      })
    );
    const sourceId = captureTarget.id;
    captureTargetDiagnostics = captureTarget.diagnostics;

    if (!sourceId) {
      throw new Error('No desktop capture source found for window ' + windowID);
    }

    console.log(`Using capture source ${sourceId}${captureTarget.kind === 'display' ? ' (display fallback)' : ''}`);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          minWidth: 1280,
          maxWidth: 10000,
          minHeight: 720,
          maxHeight: 10000
        }
      }
    });

    stream.__captureTarget = captureTarget;
    return stream;
  };

  try {
    // Initial settling delay — give the OS time to resize the window before
    // the first capture attempt.
    await delay(500);

    let stream = await acquireStream();

    // If we have a target resolution, verify the stream delivered it.
    // If not, release and retry until the window has finished resizing or we
    // exceed MAX_WAIT_MS, then proceed with whatever dimensions we have.
    if (targetWidth && targetHeight) {
      const track = stream.getVideoTracks()[0];
      const settings = track ? track.getSettings() : {};
      let streamW = settings.width || 0;
      let streamH = settings.height || 0;

      while (
        (streamW !== targetWidth || streamH !== targetHeight) &&
        Date.now() - startTime < MAX_WAIT_MS
      ) {
        console.log(
          `Stream dimensions ${streamW}x${streamH} do not match target ${targetWidth}x${targetHeight} — retrying in ${RETRY_DELAY_MS}ms`
        );
        stream.getTracks().forEach((t) => t.stop());
        await delay(RETRY_DELAY_MS);
        stream = await acquireStream();
        const retryTrack = stream.getVideoTracks()[0];
        const retrySettings = retryTrack ? retryTrack.getSettings() : {};
        streamW = retrySettings.width || 0;
        streamH = retrySettings.height || 0;
      }

      if (streamW !== targetWidth || streamH !== targetHeight) {
        console.warn(
          `Timed out waiting for target dimensions ${targetWidth}x${targetHeight}; proceeding with ${streamW}x${streamH}`
        );
      } else {
        console.log(`Stream dimensions confirmed: ${streamW}x${streamH}`);
      }
    }

    handleStream(stream);
  } catch (error) {
    handleError(error);
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  mounted() {
    ipcRenderer.on('screenshot-request', (event, input) => {
      console.log(`Screenshot - ${input.width}x${input.height} Crop - ${input.crop} TopLeft - ${input.cropTopLeft}`);
      console.time('Screenshot');
      windowID = input.windowID;
      crop = input.crop;
      cropTopLeft = input.cropTopLeft || false;
      captureBounds = normalizeCaptureBounds(input.captureBounds);
      captureTargetDiagnostics = null;
      targetWidth = input.width || null;
      targetHeight = input.height || null;

      if (windowID === undefined) {
        sendScreenshotError('iRacing window not found', 'worker:screenshot-request', {
          request: input,
          captureBounds
        });
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
      saveReshadeImage(arg);
    });
  },
  methods: {}
};
</script>




