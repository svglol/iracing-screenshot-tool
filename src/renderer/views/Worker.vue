<template>
  <h1>This is a Worker Process</h1>
</template>

<script>
const { ipcRenderer, remote, desktopCapturer } = require('electron');
const sharp = require('sharp');

let iRacingWindowSource;
const homedir = require('os').homedir();
const dir = homedir + '\\Pictures\\Screenshots\\';
let sessionInfo, telemetry;

export default {
  methods: {},
  mounted() {
    ipcRenderer.on('screenshot-request', (event, input) => {
      fullscreenScreenshot((base64data) => {
        saveImage(base64data, input.crop);
      });
    });
    ipcRenderer.on('session-info', (event, arg) => {
      sessionInfo = arg;
    });
    ipcRenderer.on('telemetry', (event, arg) => {
      telemetry = arg;
    });

    ipcRenderer.send('worker-ready');
  },
};

async function saveImage(base64data, crop) {
  base64data = base64data.replace(/^data:image\/png;base64,/, '');
  const fileName = dir + getFileNameString();

  const buff = await Buffer.from(base64data, 'base64');

  const image = sharp(buff);
  image
  .metadata()
  .then(function(metadata) {
    if(metadata.width < 54){
      return Error('image is too small');
    }else{
      if(crop){
        return image
        .extract({ left: 0, top: 0, width: metadata.width-54, height: metadata.height-30 })
        .toFile(fileName)
      }
      else{
        return image
        .toFile(fileName)
      }
    }
  })
  .then(data => {
    ipcRenderer.send('screenshot-response', fileName);
  })
  .catch(err => {
    ipcRenderer.send('screenshot-error', err);
  });
}

function getFileNameString() {
  const trackName = sessionInfo.data.WeekendInfo.TrackDisplayShortName;
  let driverName = '';
  sessionInfo.data.DriverInfo.Drivers.forEach((item) => {
    if (telemetry.values.CamCarIdx === item.CarIdx) {
      driverName = item.UserName;
    }
  });
  const now = new Date();
  return trackName + '-' + driverName + '-' + now.getTime() + '.png';
  return now.getTime() + '.png';
}

async function fullscreenScreenshot(callback) {
  let imageFormat = 'image/png';

  await desktopCapturer
  .getSources({ types: ['window', 'screen'] })
  .then(async (sources) => {
    for (const source of sources) {
      if (source !== null) {
        if (source.name === 'iRacing.com Simulator') {
          iRacingWindowSource = source;
        }
      }
    }
  });

  //
  var handleStream = (stream) => {
    // Create hidden video tag
    const video = document.createElement('video');
    video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';

    // Event connected to stream
    video.addEventListener('loadedmetadata', function () {
      // Set video ORIGINAL height (screenshot)
      video.style.height = this.videoHeight + 'px'; // VideoHeight
      video.style.width = this.videoWidth + 'px'; // VideoWidth

      video.play();

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = this.videoWidth;
      canvas.height = this.videoHeight;
      const ctx = canvas.getContext('2d');
      // Draw video on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Save screenshot to base64
      callback(canvas.toDataURL(imageFormat));

      // Remove hidden video tag
      video.remove();
      try {
        // Destroy connect to stream
        stream.getTracks()[0].stop();
      } catch (error) {
        console.log(error);
      }
    });

    video.srcObject = stream;
    document.body.append(video);
  };

  var handleError = function (e) {
    console.log(e);
    ipcRenderer.send('screenshot-error', e);
  };

  try {
    const source = iRacingWindowSource;
    if(source === undefined) throw Error('Can\'t find iRacing Window');
    if (source.name === 'iRacing.com Simulator') {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            minWidth: 1280,
            maxWidth: 10000,
            minHeight: 720,
            maxHeight: 10000,
          },
        },
      });
      handleStream(stream);
    }
  } catch (error) {
    handleError(error);
  }
}
</script>
