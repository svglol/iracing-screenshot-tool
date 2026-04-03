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
let captureBounds = null;
let captureTargetDiagnostics = null;

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

    const image = sharp(sourceFile);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height || metadata.width < 54 || metadata.height < 30) {
      throw new Error('image is too small');
    }

    if (crop) {
      await image
        .extract({ left: 0, top: 0, width: metadata.width - 54, height: metadata.height - 30 })
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

    ipcRenderer.send('screenshot-response', fileName);
    if (global.gc) {
      global.gc();
    }

    console.timeEnd('Save Image');
    console.timeEnd('Screenshot');
  } catch (error) {
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
        ipcRenderer.send('screenshot-finished', '');

        const captureTarget = normalizeCaptureTarget(stream.__captureTarget);
        const captureRect = resolveDisplayCaptureRect(this.videoWidth, this.videoHeight, captureTarget);
        const outputWidth = crop ? captureRect.width - 54 : captureRect.width;
        const outputHeight = crop ? captureRect.height - 30 : captureRect.height;

        if (outputWidth < 1 || outputHeight < 1) {
          throw new Error(`Capture output is too small (${outputWidth}x${outputHeight})`);
        }

        console.time('Create OffscreenCanvas');
        const offscreen = new OffscreenCanvas(outputWidth, outputHeight);

        const offctx = offscreen.getContext('2d', { alpha: false });
        offctx.drawImage(
          video,
          captureRect.x,
          captureRect.y,
          captureRect.width,
          captureRect.height,
          0,
          0,
          captureRect.width,
          captureRect.height
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
    sendScreenshotError(error, 'fullscreen-capture', {
      windowID,
      crop,
      captureBounds
    });
  };

  await delay(1000);
  console.time('Draw Image');
  console.time('Get Media');

  try {
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
    handleStream(stream);
  } catch (error) {
    handleError(error);
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  mounted() {
    ipcRenderer.on('screenshot-request', (event, input) => {
      console.log(`Screenshot - ${input.width}x${input.height} Crop - ${input.crop}`);
      console.time('Screenshot');
      windowID = input.windowID;
      crop = input.crop;
      captureBounds = normalizeCaptureBounds(input.captureBounds);
      captureTargetDiagnostics = null;

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




