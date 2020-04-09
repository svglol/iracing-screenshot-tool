<template>
  <div class="columns is-gapless" style="margin-top: 0px; height: 100vh;">
    <div
    class="column is-2 shadow"
    style="
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    "
    >
    <SideBar v-on:click="screenshot" />
    <Settings />
  </div>

  <div class="column">
    <div v-if="currentURL != ''">
      <div
      class="columns is-gapless"
      style="margin-bottom: 0.15rem;
      background-color:rgba(0, 0, 0, 0.2)"
      >
      <div class="column is-9">
        <div class="control" style="padding-top:.5rem;padding-bottom:.5rem; padding-left:.5rem">
          <span style="font-weight: bold;">{{ fileName }}</span>
          <b-tag type="is-info">{{ resolution }}</b-tag>
        </div>
      </div>
      <div class="column" style="margin-left: 5rem;">
        <ul class="toolbar" style="padding-right:.5rem;padding-top:.25rem;padding-bottom:.25rem;">
          <li>
            <a
            @click="deleteFile"
            v-shortkey="['del']"
            @shortkey="deleteFile"
            ><i class="mdi mdi-delete"
            /></a>
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
        v-lazy="items[i]"
        style="max-height: calc(100vh - 41px - 24px - 95px); object-fit: contain;padding:1rem"
        />
      </figure>
    </b-carousel-item>
    <template slot="indicators" slot-scope="props">
      <figure class="al image" :draggable="false">
        <img
        :draggable="false"
        v-lazy="items[props.i]"
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
import Settings from '../components/Settings.vue';
const { ipcRenderer, remote, desktopCapturer, clipboard } = require('electron');
const { exec } = require('electron').remote.require('child_process');
const { shell } = require('electron');
const sizeOf = require('image-size');
const { screen } = remote;
const mainWindow = remote.getCurrentWindow();
const { width, height } = screen.getPrimaryDisplay().bounds;
const fs = require('fs');
import Vue from 'vue';
const config = require('../../utilities/config');
const dir = config.get('screenshotFolder');

let iRacingWindowSource = null;

export default Vue.extend({
  name: 'Home',
  components: { SideBar, Settings },
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
        scroll() {},
      },
      mounted() {
        ipcRenderer.on('screenshot-response', (event, arg) => {
          if (fs.existsSync(arg)) {
            this.items.unshift(arg);
            clipboard.write({ image: arg });
          }
        });
        loadGallery(this.items);
      },
      watch: {
        items() {
          if (this.items.length !== 0) {
            this.currentURL = this.items[0];
          } else {
            this.currentURL = '';
          }

          if (this.items.length != 0) {

            const SEARCH_DELAY = 100; // in ms

            function waitForElementToBeAdded(cssSelector) {
              return new Promise((resolve) => {
                const interval = setInterval(() => {
                  var element = document.querySelector(cssSelector)
                  if (element != null) {
                    clearInterval(interval);
                    resolve(element);
                  }
                }, SEARCH_DELAY);
              });
            }
            waitForElementToBeAdded('.carousel-indicator').then(value => {
              (function () {
                function scrollH(e) {
                  e = window.event || e;
                  var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
                  value.scrollLeft -= (delta * 80);
                }
                if (window.addEventListener) {
                  window.addEventListener("wheel", scrollH, false);
                }
              })();
            });

          }
        },
        currentURL: function () {
          if (this.currentURL !== '') {
            this.fileName = this.currentURL.split(/[\\/]/).pop();
            const dimensions = sizeOf(this.currentURL);
            this.resolution = dimensions.width + ' x ' + dimensions.height;
          }
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
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
      background: rgb(37,37,37);
      background: linear-gradient(0deg, rgba(37,37,37,1) 0%, rgba(61,61,61,1) 100%);
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
      font-size: 1.4rem;
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

    .carousel .carousel-indicator.has-custom {
      overflow-x: scroll !important;
      margin-top: auto;
      background-color: rgba(0,0,0,.2);
    }


    .carousel {
      height: calc(100vh - 41px - 27px);
      display: flex;
      flex-direction: column;
    }
    </style>
