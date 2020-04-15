<template>
  <h1>This is a Worker Process</h1>
</template>

<script>
const { ipcRenderer, remote, desktopCapturer } = require('electron');
const fs = require('fs');
const sharp = require('sharp');
const app = remote.app;

const config = require('../../utilities/config');
let sessionInfo, telemetry,windowID;

export default {
  methods: {},
  mounted() {
    ipcRenderer.on('screenshot-request', (event, input) => {
      windowID = input.windowID;
      if(windowID === undefined){
        ipcRenderer.send('screenshot-error', 'iRacing window not found');
      }else{
        fullscreenScreenshot((base64data) => {
          saveImage(base64data, input.crop);
        });
      }
    });
    ipcRenderer.on('session-info', (event, arg) => {
      sessionInfo = arg;
    });
    ipcRenderer.on('telemetry', (event, arg) => {
      telemetry = arg;
    });
  },
};

function saveImage(blob, crop) {
  var base64data = '';
  let reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onload = async function() {
    base64data = reader.result;
    base64data = base64data.replace(/^data:image\/png;base64,/, '');

    const file = getFileNameString();
    var fileName = config.get('screenshotFolder')+ file + '.png';
    var buff = await Buffer.from(base64data, 'base64');
    await fs.writeFileSync(fileName, '');
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
      const thumb = app.getPath('userData')+'\\Cache\\'+file+'.webp';
      sharp(fileName)
      .resize(1280, 720,{fit: 'contain',background:{r:0,g:0,b:0,alpha:0}})
      .toFile(thumb, (err, info) => {
        ipcRenderer.send('screenshot-response', fileName);
        buff = null;
        base64data = null;
        global.gc();
      });

    })
    .catch(err => {
      console.log(err)
      ipcRenderer.send('screenshot-error', err);
    });
  };
}

function getFileNameString() {
  const trackName = sessionInfo.data.WeekendInfo.TrackDisplayShortName;
  let driverName = '';

  if(sessionInfo.data.WeekendInfo.TeamRacing == 1){
    sessionInfo.data.DriverInfo.Drivers.forEach((item) => {
      if(sessionInfo.data.DriverInfo.DriverCarIdx === item.CarIdx){
        driverName = item.TeamName;
      }
    });
  }
  else{
    sessionInfo.data.DriverInfo.Drivers.forEach((item) => {
      if (telemetry.values.CamCarIdx === item.CarIdx) {
        driverName = item.UserName;
      }
    });
  }

  var unique = false;
  var count = 0;
  var file = trackName + '-' + driverName + '-' + count;
  var screenshotFolder = config.get('screenshotFolder')
  while(!unique){
    if (fs.existsSync(screenshotFolder+file+'.png')) {
      count++;
      file = trackName + '-' + driverName + '-' + count;
    }
    else{
      unique = true;
    }
  }
  return file;
}

async function fullscreenScreenshot(callback) {
  let imageFormat = 'image/png';

  var handleStream = (stream) => {
    // Create hidden video tag
    var video = document.createElement('video');
    video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';

    // Event connected to stream
    video.addEventListener('loadedmetadata', function () {
      // Set video ORIGINAL height (screenshot)
      video.style.height = this.videoHeight + 'px'; // VideoHeight
      video.style.width = this.videoWidth + 'px'; // VideoWidth

      video.play();
      video.pause();

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = this.videoWidth;
      canvas.height = this.videoHeight;
      const ctx = canvas.getContext('2d');

      // Draw video on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Save screenshot to base64
      canvas.toBlob((data)=>{
        callback(data);
      });

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
    });

    video.srcObject = stream;
    document.body.append(video);
  };

  var handleError = function (e) {
    throw e;
    ipcRenderer.send('screenshot-error', e);
  };

  await delay(1000);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: 'window:'+windowID+':0',
          minWidth: 1280,
          maxWidth: 10000,
          minHeight: 720,
          maxHeight: 10000
        }
      }
    })
    handleStream(stream)
  } catch (e) {
    handleError(e)
  }
  // if(!found) ipcRenderer.send('screenshot-error', 'iRacing window not found');
}

const delay = ms => new Promise(res => setTimeout(res, ms));
</script>
