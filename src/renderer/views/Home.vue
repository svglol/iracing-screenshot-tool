<template>
  <div class="columns is-gapless" style="margin-top: 0px; height: 100vh;">
    <div
    class="column is-2"
    style="
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    "
    >
    <SideBar v-on:click="screenshot" />
  </div>
  <div class="column">
    <div style="padding: 0.5rem;" v-if="currentURL != ''">
      <div class="columns is-gapless" style="margin-bottom: 0.15rem;">
        <div class="column is-9">
          <div class="control">
            <span style="font-weight: bold;">{{ fileName }}</span>
            <b-tag type="is-info">{{ resolution }}</b-tag>
          </div>
        </div>
        <div class="column" style="margin-left: 5rem;">
          <ul class="toolbar">
            <li>
              <a @click="deleteFile"><i class="mdi mdi-delete" /></a>
            </li>
            <li>
              <a @click="openFolder"><i class="mdi mdi-folder" /></a>
            </li>
            <li>
              <a
              v-shortkey="['ctrl', 'c']"
              @shortkey="copy"
              @click="copy"
              v-show="false"
              ><i class="mdi mdi-content-copy"
              /></a>
            </li>
            <li>
              <a @click="openExternally"
              ><i class="mdi mdi-launch"
              /></a>
            </li>
          </ul>
        </div>
      </div>

      <b-carousel
      :animated="'fade'"
      :arrow="false"
      :autoplay="false"
      :has-drag="false"
      indicator-custom
      :indicator-inside="false"
      >
      <b-carousel-item v-for="(item, i) in items" :key="i">
        <figure class="al image" :draggable="false">
          <img
          contain
          :src="items[i]"
          style="max-height: 75vh;"
          />
        </figure>
      </b-carousel-item>
      <template slot="indicators" slot-scope="props" @scroll="scroll">
        <figure class="al image" :draggable="false">
          <img
          :draggable="false"
          :src="items[props.i]"
          @click="selectImage(items[props.i])"
          style="max-height: 70px; object-fit: contain;"
          />
        </figure>
      </template>
    </b-carousel>
  </div>
</div>
</div>
</template>

<script>
const electron = window.require ? window.require('electron') : null;

import SideBar from '../components/SideBar.vue';
const { ipcRenderer, remote, desktopCapturer, clipboard } = require('electron');
const { exec } = require('electron').remote.require('child_process');
const { shell } = require('electron');
const sizeOf = require('image-size');
const { screen } = remote;
const mainWindow = remote.getCurrentWindow();
const { width, height } = screen.getPrimaryDisplay().bounds;
const fs = require('fs');
import Vue from 'vue';
const homedir = require('os').homedir();
const dir = homedir + '\\Pictures\\Screenshots\\';
let sessionInfo, telemetry;

let iRacingWindowSource = null;

export default Vue.extend({
  name: 'Home',
  components: { SideBar },
  data() {
    return {
      items: [],
      currentURL: '',
    };
  },
  methods: {
    screenshot(data) {
      ipcRenderer.send('resize-screenshot', data);
    },
    switchGallery(value) {
      this.gallery = value;
      if (value) {
        return document.documentElement.classList.add('is-clipped');
      } else {
        return document.documentElement.classList.remove('is-clipped');
      }
    },
    selectImage(item) {
      this.currentURL = item;
    },
    openExternally() {
      shell.openItem(this.currentURL);
    },
    copy() {
      clipboard.write({ image: this.currentURL });
    },
    openFolder() {
      const file = this.currentURL.replace(/\//g, '\\');
        shell.showItemInFolder(file);
      },
      deleteFile() {
        const file = this.currentURL.replace(/\//g, '\\');
          shell.moveItemToTrash(file);
          var index = this.items.indexOf(this.currentURL);
          if (index !== -1) this.items.splice(index, 1);
        },
        scroll(){
          console.log('test')
        }
      },
      mounted() {
        ipcRenderer.on('screenshot-response', (event, arg) => {
          this.items.unshift(arg);
          clipboard.write({ image: arg });
        });
        loadGallery(this.items);
      },
      watch: {
        items() {
          this.currentURL = this.items[0];

          if (this.items.length != 0) {

            // var y = document.querySelector('.carousel-indicator');
            //
            // console.log(y)

            // if(y !== null){
            //
            //   (function () {
            //     function scrollH(e) {
            //       e = window.event || e;
            //       var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
            //       y.scrollLeft -= (delta * 100);
            //       e.preventDefault();
            //     }
            //     if (window.addEventListener) {
            //       y.addEventListener("mousewheel", scrollH, false);
            //       y.addEventListener("DOMMouseScroll", scrollH, false);
            //     } else {
            //       y.attachEvent("onmousewheel", scrollH);
            //     }
            //   })();
            // }
          }
        },
        currentURL: function () {
          this.fileName = this.currentURL.split(/[\\/]/).pop();
          const dimensions = sizeOf(this.currentURL);
          this.resolution = dimensions.width + ' x ' + dimensions.height;
        },
      },
    });

    async function loadGallery(items) {
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
            time: fs.statSync(dir + '/' + fileName).mtime.getTime(),
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
            items.unshift(url);
          }
        });
      });
    }
    </script>

    <style>
    .container {
      max-width: 100vw !important;
      padding: 0px !important;
    }

    body {
      background-image: url('../../../static/bg.png');
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;

      /* background: rgb(42, 46, 91);
      background: linear-gradient(
      153deg,
      rgba(42, 46, 91, 1) 0%,
      rgba(46, 53, 140, 1) 100%
      ); */
      height: 100vh;
      color: white !important;
    }
    .label {
      color: white !important;
    }
    .indicator-item {
      flex: 0 0 15% !important;
    }

    .toolbar {
      list-style-type: none;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    .toolbar li {
      float: right;
      margin-left: 0.3rem;
      margin-right: 0.3rem;
      font-size: 1.5rem;
    }

    .toolbar li a {
      display: block;
      color: white;
      text-align: center;
      text-decoration: none;
    }

    .toolbar li a:hover {
      opacity: 0.5;
    }

    .carousel .carousel-indicator.has-custom{
      overflow-x: scroll!important;
    }
    </style>
