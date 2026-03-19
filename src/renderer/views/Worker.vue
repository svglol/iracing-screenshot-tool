<template>
  <h1>This is a Worker Process</h1>
</template>

<script>
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const config = require('../../utilities/config');

let sessionInfo = null;
let telemetry = null;
let windowID = null;
let crop = false;

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
      meta
    };
  }

  const message = String(errorLike || 'Unknown screenshot error');
  const error = errorLike instanceof Error ? errorLike : new Error(message);

  return {
    message: error.message || message,
    stack: String(error.stack || ''),
    source: 'worker',
    context,
    meta
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

function sanitizeFilePart(value, fallback) {
  const sanitized = String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim();

  return sanitized || fallback;
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
  const weekendInfo = sessionInfo?.data?.WeekendInfo || {};
  const driverInfo = sessionInfo?.data?.DriverInfo || {};
  const drivers = driverInfo.Drivers || [];
  const driverCarIdx = driverInfo.DriverCarIdx;
  const cameraCarIdx = telemetry?.values?.CamCarIdx;

  const trackName = sanitizeFilePart(weekendInfo.TrackDisplayShortName, 'Track');
  let driverName = 'Driver';

  if (weekendInfo.TeamRacing === 1) {
    const teamDriver = drivers.find((item) => item.CarIdx === driverCarIdx);
    driverName = sanitizeFilePart(teamDriver?.TeamName, 'Team');
  } else {
    const selectedDriver = drivers.find((item) => item.CarIdx === cameraCarIdx);
    driverName = sanitizeFilePart(selectedDriver?.UserName, 'Driver');
  }

  ensureDirectory(getScreenshotDir());

  let count = 0;
  let fileName = `${trackName}-${driverName}-${count}`;

  while (fs.existsSync(getScreenshotPath(fileName))) {
    count += 1;
    fileName = `${trackName}-${driverName}-${count}`;
  }

  return fileName;
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
      video.style.height = this.videoHeight + 'px';
      video.style.width = this.videoWidth + 'px';

      video.play();
      video.pause();
      ipcRenderer.send('screenshot-finished', '');

      console.time('Create OffscreenCanvas');
      const offscreen = crop
        ? new OffscreenCanvas(this.videoWidth - 54, this.videoHeight - 30)
        : new OffscreenCanvas(this.videoWidth, this.videoHeight);

      const offctx = offscreen.getContext('2d', { alpha: false });
      offctx.drawImage(video, 0, 0, this.videoWidth, this.videoHeight);

      video.srcObject = null;
      video.remove();

      try {
        stream.getTracks().forEach((track) => track.stop());
        video = null;
      } catch (error) {
        console.log(error);
      }

      console.timeEnd('Create OffscreenCanvas');
      console.time('To Blob');
      const blob = await offscreen.convertToBlob({ type: 'image/png' });
      console.timeEnd('To Blob');
      console.timeEnd('Draw Image');
      callback(blob);
    });

    video.srcObject = stream;
  };

  const handleError = (error) => {
    sendScreenshotError(error, 'fullscreen-capture', {
      windowID,
      crop
    });
  };

  await delay(1000);
  console.time('Draw Image');
  console.time('Get Media');

  try {
    const sourceId = await ipcRenderer.invoke('desktop-capturer:get-source-id', windowID);

    if (!sourceId) {
      throw new Error('No desktop capture source found for window ' + windowID);
    }

    console.log('Using capture source ' + sourceId);

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

      if (windowID === undefined) {
        sendScreenshotError('iRacing window not found', 'worker:screenshot-request', {
          request: input
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




