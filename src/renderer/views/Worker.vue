<template>
  <h1>This is a Worker Process</h1>
</template>

<script>
const { ipcRenderer, remote } = require('electron');
const fs = require('fs');
const sharp = require('sharp');
const app = remote.app;

const config = require('../../utilities/config');
const { resolveFilenameFormat } = require('../../utilities/filenameFormat');
let sessionInfo, telemetry, windowID, crop;

export default {
  mounted () {
    ipcRenderer.on('screenshot-request', (event, input) => {
      console.log('Screenshot - ' + input.width + 'x' + input.height + ' Crop - ' + input.crop);
      console.time('Screenshot');
      windowID = input.windowID;
      crop = input.crop;
      if (windowID === undefined) {
        ipcRenderer.send('screenshot-error', 'iRacing window not found');
      } else {
        fullscreenScreenshot((base64data) => {
          saveImage(base64data);
        });
      }
    });
    ipcRenderer.on('session-info', (event, arg) => {
      sessionInfo = arg;
    });
    ipcRenderer.on('telemetry', (event, arg) => {
      telemetry = arg;
    });
    ipcRenderer.on('screenshot-reshade', (event, arg) => {
      const file = getFileNameString();
      var fileName = config.get('screenshotFolder') + file + '.png';
      // crop and move file
      sharp.cache(false);
      crop = config.get('crop');
      var buff = fs.readFileSync(arg);
      const image = sharp(buff);
      image
        .metadata()
        .then(function (metadata) {
          if (metadata.width < 54) {
            return Error('image is too small');
          } else {
            if (crop) {
              return image
                .extract({ left: 0, top: 0, width: metadata.width - 54, height: metadata.height - 30 })
                .toFile(fileName);
            } else {
              return image
                .toFile(fileName);
            }
          }
        })
        .then(async data => {
          // create Thumbnail
          const thumb = app.getPath('userData') + '\\Cache\\' + file + '.webp';
          sharp(fileName)
            .resize(1280, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toFile(thumb, (err, info) => {
              // return screenshot
              ipcRenderer.send('screenshot-response', fileName);
              global.gc();
              if (err) {
                console.log(err);
              }
            });
        });
    });
  },
  methods: {}
};

function saveImage (blob) {
  console.time('Save Image');
  var base64data = '';
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onload = async function () {
    console.time('Save Image to file');
    base64data = reader.result;
    base64data = base64data.replace(/^data:image\/png;base64,/, '');
    const file = getFileNameString();
    var fileName = config.get('screenshotFolder') + file + '.png';
    var buff = await Buffer.from(base64data, 'base64');
    await fs.writeFileSync(fileName, '');

    var writeStream = fs.createWriteStream(fileName);
    writeStream.write(buff);
    writeStream.on('finish', () => {
      console.timeEnd('Save Image to file');
      console.time('Save Thumbnail');
      const thumb = app.getPath('userData') + '\\Cache\\' + file + '.webp';
      sharp(fileName)
        .resize(1280, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile(thumb, (err, info) => {
          if (err) {
            console.log(err);
          }
          ipcRenderer.send('screenshot-response', fileName);
          buff = null;
          base64data = null;
          global.gc();
          console.timeEnd('Save Thumbnail');
          console.timeEnd('Save Image');
          console.timeEnd('Screenshot');
        });
    });
    writeStream.on('error', (err) => {
      console.log(err);
      ipcRenderer.send('screenshot-error', err);
    });
    writeStream.end();
  };
}

function getFileNameString () {
  const formatString = config.get('filenameFormat') || '{track}-{driver}-{counter}';

  // Resolve all tokens except {counter}
  let resolved = resolveFilenameFormat(formatString, sessionInfo, telemetry);

  // Handle {counter} - find unique filename
  if (resolved.includes('{counter}')) {
    var unique = false;
    var count = 0;
    var screenshotFolder = config.get('screenshotFolder');
    var file = resolved.replace('{counter}', count);
    while (!unique) {
      if (fs.existsSync(screenshotFolder + file + '.png')) {
        count++;
        file = resolved.replace('{counter}', count);
      } else {
        unique = true;
      }
    }
    return file;
  } else {
    // No counter - still need uniqueness, append counter if file exists
    var screenshotFolder = config.get('screenshotFolder');
    if (fs.existsSync(screenshotFolder + resolved + '.png')) {
      var count = 1;
      while (fs.existsSync(screenshotFolder + resolved + '-' + count + '.png')) {
        count++;
      }
      return resolved + '-' + count;
    }
    return resolved;
  }
}

async function fullscreenScreenshot (callback) {
  var handleStream = (stream) => {
    console.timeEnd('Get Media');
    // Create hidden video tag
    var video = document.createElement('video');
    // video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';
    // Event connected to stream
    video.addEventListener('loadedmetadata', function () {
      // Set video ORIGINAL height (screenshot)
      video.style.height = this.videoHeight + 'px'; // VideoHeight
      video.style.width = this.videoWidth + 'px'; // VideoWidth

      video.play();
      video.pause();
      ipcRenderer.send('screenshot-finished', '');

      console.time('Create OffscreenCanvas');
      var offscreen;
      if (crop) {
        offscreen = new OffscreenCanvas(this.videoWidth - 54, this.videoHeight - 30);
      } else {
        offscreen = new OffscreenCanvas(this.videoWidth, this.videoHeight);
      }

      const offctx = offscreen.getContext('2d', { alpha: false });
      offctx.drawImage(video, 0, 0, this.videoWidth, this.videoHeight);

      // Remove hidden video tag
      video.srcObject = null;
      video.remove();
      try {
        // Destroy connect to stream
        stream.getTracks()[0].stop();
        video = null;
        stream = null;
      } catch (error) {
        console.log(error);
      }

      console.timeEnd('Create OffscreenCanvas');
      console.time('To Blob');
      offscreen.convertToBlob().then(function (blob) {
        console.timeEnd('To Blob');
        console.timeEnd('Draw Image');
        callback(blob);
      });
    });
    video.srcObject = stream;
  };

  var handleError = function (e) {
    ipcRenderer.send('screenshot-error', e);
  };
  await delay(1000);
  console.time('Draw Image');
  console.time('Get Media');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: 'window:' + windowID + ':0',
          minWidth: 1280,
          maxWidth: 10000,
          minHeight: 720,
          maxHeight: 10000
        }
      }
    });
    handleStream(stream);
  } catch (e) {
    handleError(e);
  }
  // if(!found) ipcRenderer.send('screenshot-error', 'iRacing window not found');
}

const delay = ms => new Promise(res => setTimeout(res, ms));
</script>
