<template>
  <div
    class="columns is-gapless"
    style="margin-top: 0px; height: 100vh;"
  >
    <div class="sidebar column is-2 shadow">
      <SideBar @click="screenshot" />
      <Settings />
    </div>

    <div class="column">
      <div v-if="currentURL !== ''">
        <div
          class="columns is-gapless topbar"
        >
          <div class="column is-9">
            <div
              class="control"
              style="padding-top:.5rem;padding-bottom:.5rem; padding-left:.5rem"
            >
              <span style="font-weight: bold;">{{ fileName }}</span>
              <b-tag type="is-info">
                {{ resolution }}
              </b-tag>
            </div>
          </div>
          <div
            v-show="false"
          >
            <a
              v-show="false"
              v-shortkey="['del']"
              @click="deleteFile"
              @shortkey="deleteFile"
            />

            <a
              v-show="false"
              v-shortkey="['ctrl', 'c']"
              @shortkey="copy"
              @click="copy"
            />
          </div>
        </div>

        <b-carousel
          id="carousel"
          v-model="selected"
          :animated="'fade'"
          :arrow="false"
          :autoplay="false"
          :has-drag="false"
          indicator-custom
          :indicator-inside="false"
        >
          <b-carousel-item
            v-for="(item, i) in items"
            :key="i"
          >
            <figure
              class="al image"
              :draggable="false"
            >
              <img
                v-lazy="items[i].thumb"
                :draggable="false"
                style="max-height: calc(100vh - 41px - 24px - 95px); object-fit: contain;padding:1rem"
                @contextmenu.prevent.stop="handleClick($event, items[i])"
              >
            </figure>
          </b-carousel-item>
          <template
            slot="indicators"
            slot-scope="props"
          >
            <figure
              class="al image"
              :draggable="false"
            >
              <img
                v-lazy="getImageUrl(items[props.i])"
                :draggable="false"
                style="max-height: 70px; object-fit: contain;height:70px"
                @click="selectImage(items[props.i].file)"
                @contextmenu.prevent.stop="handleClick($event, items[props.i])"
              >
            </figure>
          </template>
        </b-carousel>

        <vue-simple-context-menu
          :ref="'vueSimpleContextMenu'"
          :element-id="'myUniqueId'"
          :options="options"
          @option-clicked="optionClicked"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue';

const { ipcRenderer, remote, clipboard } = require('electron');
const { shell } = require('electron');
const sizeOf = require('image-size');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const app = remote.app;
const config = require('../../utilities/config');
let dir = config.get('screenshotFolder');

let sessionInfo, telemetry, windowID, crop;

export default Vue.extend({
  name: 'Home',
  data () {
    return {
      items: [],
      currentURL: '',
      fileName: '',
      resolution: '',
      selected: 0,
      options: [
        {
          name: 'Open Externally',
          slug: 'external'
        },
        {
          name: 'Open Folder',
          slug: 'folder'
        },
        {
          name: 'Copy',
          slug: 'copy'
        },
        {
          name: 'Delete',
          slug: 'delete'
        }
      ]
    };
  },
  watch: {
    items () {
      if (this.items.length !== 0) {
        this.currentURL = this.items[0].file;
      } else {
        this.currentURL = '';
      }

      if (this.items.length !== 0) {
        waitForElementToBeAdded('.carousel-indicator').then(value => {
          (function () {
            function scrollH (e) {
              e = window.event || e;
              var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
              value.scrollLeft -= (delta * 400);
            }
            var carousel = document.getElementById('carousel');
            if (window.addEventListener) {
              carousel.addEventListener('wheel', scrollH, false);
            }
          })();
        });
      }
    },
    currentURL: function () {
      if (this.currentURL !== '') {
        this.fileName = this.currentURL.split(/[\\/]/).pop().split('.').slice(0, -1).join('.');
        var dimensions = sizeOf(this.currentURL);
        this.resolution = dimensions.width + ' x ' + dimensions.height;
        dimensions = null;
      }
    }
  },
  mounted () {
    ipcRenderer.on('screenshot-response', (event, arg) => {
      if (fs.existsSync(arg)) {
        var file = path.parse(arg).name;
        var thumb = app.getPath('userData') + '\\Cache\\' + file + '.webp';
        this.items.unshift({ file: arg, thumb: thumb });
        clipboard.write({ image: arg });
        this.selected = 0;

        document.querySelector('.carousel-indicator').scrollLeft = (0);
      }
    });

    ipcRenderer.on('screenshot-request', (event, input) => {
      console.log('Screenshot - ' + input.width + 'x' + input.height + ' Crop - ' + input.crop);
      console.time('Screenshot');
      windowID = input.windowID;
      crop = input.crop;
      if (windowID === undefined) {
        ipcRenderer.send('screenshot-error', 'iRacing window not found');
      } else {
        fullscreenScreenshot(input, (base64data) => {
          saveImage(base64data);
        });
      }
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

    ipcRenderer.on('session-info', (event, arg) => {
      sessionInfo = arg;
    });
    ipcRenderer.on('telemetry', (event, arg) => {
      telemetry = arg;
    });
    loadGallery(this.items);

    config.onDidChange('screenshotFolder', (newValue, oldValue) => {
      dir = newValue;
      loadGallery(this.items);
    });
  },
  methods: {
    getImageUrl (item) {
      if (item !== undefined) { return item.thumb; }
    },
    screenshot (data) {
      ipcRenderer.send('resize-screenshot', data);
    },
    selectImage (item) {
      this.currentURL = item;
    },
    openExternally () {
      shell.openItem(this.currentURL);
    },
    copy () {
      clipboard.write({ image: this.currentURL });
      this.$buefy.notification.open({
        message: this.fileName + ' copied to clipboard',
        type: 'is-dark'
      });
    },
    openFolder () {
      const file = this.currentURL.replace(/\//g, '\\');
      shell.showItemInFolder(file);
    },
    deleteFile () {
      const file = this.currentURL.replace(/\//g, '\\');
      shell.moveItemToTrash(file);
      for (var i = this.items.length - 1; i >= 0; i--) {
        if (this.items[i].file === this.currentURL) {
          this.$delete(this.items, i);
          if (this.selected === this.items.length) this.selected--;
        }
      }
    },
    handleClick (event, item) {
      this.$refs.vueSimpleContextMenu.showMenu(event, item);
    },
    optionClicked (event) {
      switch (event.option.slug) {
        case 'copy':
          clipboard.write({ image: event.item.file });
          break;
        case 'external':
          shell.openItem(event.item.file);
          break;
        case 'folder':
          var file = event.item.file.replace(/\//g, '\\');
          shell.showItemInFolder(file);
          break;
        case 'delete':
          file = event.item.file.replace(/\//g, '\\');
          shell.moveItemToTrash(file);
          for (var i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].file === event.item.file) {
              this.$delete(this.items, i);
              if (this.selected === this.items.length) this.selected--;
            }
          }
          break;
      }
    }
  }
});

async function loadGallery (items) {
  items.splice(0, items.length);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // Load images from screenshots Folder
  await fs.readdir(dir, (err, files) => {
    if (err) {
      console.log(err);
    }

    files = files
      .map((fileName) => {
        return {
          name: fileName,
          time: fs.statSync(dir + '/' + fileName).mtime.getTime()
        };
      })
      .sort((a, b) => {
        return a.time - b.time;
      })
      .map((v) => {
        return v.name;
      });

    files.forEach(async (file) => {
      if (file.split('.').pop() === 'png') {
        let url = dir + file;
        url = url.replace(/\\/g, '/');

        file = path.parse(file).name;
        var thumb = app.getPath('userData') + '\\Cache\\' + file + '.webp';

        if (!fs.existsSync(thumb)) {
          await sharp(url)
            .resize(1280, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toFile(thumb, (err, info) => {
              if (err) console.log(err);
              items.unshift({ file: url, thumb: thumb });
            });
        } else {
          items.unshift({ file: url, thumb: thumb });
        }
      }
    });
  });

  // Clear unused thumbnail cache
  var thumbDir = app.getPath('userData') + '\\Cache\\';
  await fs.readdir(thumbDir, (err, files) => {
    if (err) console.log(err);
    files.forEach(async (file) => {
      var fullFile = thumbDir + file;
      if (file.split('.').pop() === 'webp') {
        var deleteItem = true;
        items.forEach((item, i) => {
          if (item.thumb === fullFile) {
            deleteItem = false;
          }
        });
        if (deleteItem) {
          fs.unlinkSync(fullFile);
        }
      }
    });
  });
}

const SEARCH_DELAY = 100; // in ms
function waitForElementToBeAdded (cssSelector) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      var element = document.querySelector(cssSelector);
      if (element != null) {
        clearInterval(interval);
        resolve(element);
      }
    }, SEARCH_DELAY);
  });
}

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
  const trackName = sessionInfo.data.WeekendInfo.TrackDisplayShortName;
  let driverName = '';

  if (sessionInfo.data.WeekendInfo.TeamRacing === 1) {
    sessionInfo.data.DriverInfo.Drivers.forEach((item) => {
      if (sessionInfo.data.DriverInfo.DriverCarIdx === item.CarIdx) {
        driverName = item.TeamName;
      }
    });
  } else {
    sessionInfo.data.DriverInfo.Drivers.forEach((item) => {
      if (telemetry.values.CamCarIdx === item.CarIdx) {
        driverName = item.UserName;
      }
    });
  }

  var unique = false;
  var count = 0;
  var file = trackName + '-' + driverName + '-' + count;
  var screenshotFolder = config.get('screenshotFolder');
  while (!unique) {
    if (fs.existsSync(screenshotFolder + file + '.png')) {
      count++;
      file = trackName + '-' + driverName + '-' + count;
    } else {
      unique = true;
    }
  }
  return file;
}

async function fullscreenScreenshot (input, callback) {
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
          chromeMediaSourceId: 'window:' + input.windowID + ':0',
          minWidth: 500,
          maxWidth: input.width,
          minHeight: 500,
          maxHeight: input.height
        }
      }
    });
    console.log('handle stream');
    handleStream(stream);
  } catch (e) {
    handleError(e);
  }
  // if(!found) ipcRenderer.send('screenshot-error', 'iRacing window not found');
}

const delay = ms => new Promise(function (resolve) { setTimeout(resolve, ms); });

</script>

<style>
.container {
  max-width: 100vw !important;
  padding: 0px !important;
}

html {
  background-color: transparent!important;
}

body {
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  background: rgb(37, 37, 37)!important;
  background: linear-gradient(0deg, rgba(37, 37, 37, 1) 0%, rgba(61, 61, 61, 1) 100%);
  height: 100vh;
  color: white !important;
}

.label {
  color: white !important;
}

.indicator-item {
  flex: 0 0 calc(100vh/6) !important;
  margin-left: .25rem;
  margin-right: .25rem;
}

.carousel .carousel-indicator.has-custom {
  overflow-x: scroll !important;
  margin-top: auto;
  background-color: rgba(0, 0, 0, .2);
  scroll-behavior: smooth;
}

.indicator-item {
  padding-right: .5rem;
}

.is-active img {
  filter: drop-shadow(0 -2px 0 #ec202a) drop-shadow(0 2px 0 #ec202a) drop-shadow(-2px 0 0 #ec202a) drop-shadow(2px 0 0 #ec202a);
}

.indicator-item img:hover {
  opacity: .8;
}

.carousel {
  height: calc(100vh - 41px - 27px);
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 240px)
}

.sidebar {
  background-color: rgba(0, 0, 0, 0.5);
  display: flex!important;
  flex-direction: column;
  min-width: 240px;
  max-width: 240px
}

.topbar {
  margin-bottom: 0.15rem!important;
  background-color:rgba(0, 0, 0, 0.2)
}
</style>
