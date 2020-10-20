<template>
  <div
    class="modal-card"
    style="width: auto; height:100vh"
  >
    <header class="modal-card-head">
      <p class="modal-card-title">
        Settings
      </p>
    </header>
    <section class="modal-card-body">
      <div
        class="columns is-centered"
        style=" margin:auto;padding-bottom:2rem"
      >
        <div
          class="column is-2"
          style="max-width:200px;"
        >
          <span class="heading">Version - {{ toolVersion }}</span>
          <span class="heading"><a @click="$emit('changelog')">Changelog</a></span>
        </div>

        <div
          class="column is-9"
          style="max-width:600px;"
        >
          <b-field label="Screenshot Folder" />

          <b-field label="">
            <b-input
              disabled
              type="text"
              :value="screenshotFolder"
              style="width:100vw"
            />
            <p class="control">
              <b-button
                class="button is-primary"
                style="width:130px"
                @click="openFolderDialog"
              >
                Select Folder
              </b-button>
            </p>
          </b-field>
          <hr>
          <b-field label="Screenshot Keybind" />
          <b-field label="">
            <b-input
              disabled
              type="text"
              :value="screenshotKeybind"
              style="width:100vw"
            />
            <p class="control">
              <b-button
                class="button is-primary"
                :loading="bindingKey"
                style="width:130px"
                @click="bindScreenshotKeybind"
              >
                Edit Bind
              </b-button>
            </p>
          </b-field>
          <hr>
          <b-field>
            <div>
              <span
                class="label"
                style="margin-bottom:0px;"
              >Disable Tooltips</span>
              <span class="description">Leave me alone, I know what I'm doing</span>
            </div>
            <b-switch
              v-model="disableTooltips"
              style="margin-left:auto"
            />
          </b-field>
          <hr>
          <b-field>
            <div>
              <span
                class="label"
                style="margin-bottom:0px;"
              >Monitor Size & Position</span>
              <span class="description">Width and height to resize iRacing window to after taking screenshot. Useful for people using an Ultrawide or Nvidia Surround</span>
            </div>
          </b-field>
          <div class="columns">
            <div class="column">
              <b-field label="Left">
                <b-input
                  v-model="screenLeft"
                  type="number"
                />
              </b-field>
            </div>
            <div class="column">
              <b-field label="Top">
                <b-input
                  v-model="screenTop"
                  type="number"
                />
              </b-field>
            </div>
          </div>
          <div class="columns">
            <div class="column">
              <b-field label="Width">
                <b-input
                  v-model="screenWidth"
                  type="number"
                  min="1280"
                  max="10000"
                />
              </b-field>
            </div>
            <div class="column">
              <b-field label="Height">
                <b-input
                  v-model="screenHeight"
                  type="number"
                  min="720"
                  max="10000"
                />
              </b-field>
            </div>
          </div>
          <hr>
          <b-field>
            <div>
              <span
                class="label"
                style="margin-bottom:0px;"
              >Reshade Compatibility Mode</span>
            </div>
            <b-switch
              v-model="reshade"
              style="margin-left:auto"
            />
          </b-field>
          <span class="description">
            When using reshade you will have to first use your hotkey for the iRacing Screenshot Tool or press the button, then use your reshade screenshot hotkey once the iRacing window has resized
          </span>
          <b-field label="Reshade INI" />

          <b-field label="">
            <b-input
              disabled
              type="text"
              :value="reshadeFile"
              style="width:100vw"
            />
            <p class="control">
              <b-button
                :disabled="!reshade"
                class="button is-primary"
                style="width:130px"
                @click="openReshadeDialog"
              >
                Select File
              </b-button>
            </p>
          </b-field>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { version } from '../../../package.json'
const config = require('../../utilities/config')
const { ipcRenderer } = require('electron')
const { dialog } = require('electron').remote

export default {
  data () {
    return {
      screenshotFolder: config.get('screenshotFolder'),
      screenshotKeybind: config.get('screenshotKeybind'),
      bindingKey: false,
      disableTooltips: config.get('disableTooltips'),
      screenWidth: config.get('defaultScreenWidth'),
      screenHeight: config.get('defaultScreenHeight'),
      screenTop: config.get('defaultScreenTop'),
      screenLeft: config.get('defaultScreenLeft'),
      toolVersion: version,
      reshade: config.get('reshade'),
      reshadeFile: config.get('reshadeFile')
    }
  },
  watch: {
    screenshotFolder () {
      let folder = this.screenshotFolder
      if (config.get('screenshotFolder') !== folder) {
        if (folder.slice(-1) !== '\\') {
          folder += '\\'
          this.screenshotFolder = folder
        }
        config.set('screenshotFolder', folder)
      }
    },
    disableTooltips () {
      config.set('disableTooltips', this.disableTooltips)
    },
    reshade () {
      config.set('reshade', this.reshade)
    },
    reshadeFile () {
      const file = this.reshadeFile
      if (config.get('reshadeFile') !== file) {
        config.set('reshadeFile', file)
      }
    }
  },
  beforeDestroy () {
    if (config.get('defaultScreenHeight') !== parseInt(this.screenHeight)) {
      if (this.screenHeight >= 720 && this.screenHeight <= 10000) {
        config.set('defaultScreenHeight', parseInt(this.screenHeight))
        ipcRenderer.send('defaultScreenHeight', parseInt(this.screenHeight))
      }
    }
    if (config.get('defaultScreenWidth') !== parseInt(this.screenWidth)) {
      if (this.screenWidth >= 1280 && this.screenWidth <= 10000) {
        ipcRenderer.send('defaultScreenWidth', parseInt(this.screenWidth))
        config.set('defaultScreenWidth', parseInt(this.screenWidth))
      }
    }

    if (config.get('defaultScreenLeft') !== parseInt(this.screenLeft)) {
      if (this.screenLeft !== '') {
        ipcRenderer.send('defaultScreenLeft', parseInt(this.screenLeft))
        config.set('defaultScreenLeft', parseInt(this.screenLeft))
      }
    }

    if (config.get('defaultScreenTop') !== parseInt(this.screenTop)) {
      if (this.screenTop !== '') {
        ipcRenderer.send('defaultScreenTop', parseInt(this.screenTop))
        config.set('defaultScreenTop', parseInt(this.screenTop))
      }
    }
  },
  methods: {
    openFolderDialog () {
      dialog.showOpenDialog({
        defaultPath: config.get('screenshotFolder'),
        properties: ['openDirectory']
      }).then(result => {
        if (!result.canceled) {
          this.screenshotFolder = result.filePaths[0]
        }
      }).catch(err => {
        console.log(err)
      })
    },
    openReshadeDialog () {
      dialog.showOpenDialog({
        defaultPath: config.get('reshadeFile'),
        properties: ['openFile']
      }).then(result => {
        if (!result.canceled) {
          this.reshadeFile = result.filePaths[0]
        }
      }).catch(err => {
        console.log(err)
      })
    },
    bindScreenshotKeybind () {
      const _this = this
      this.bindingKey = true
      const keys = []
      const keysReleased = []
      window.addEventListener('keydown', function keydown (e) {
        if (_this.bindingKey) {
          if (!keys.includes(e.key)) {
            keys.push(e.key)
            _this.screenshotKeybind = keys.join('+')
          }
        } else {
          window.removeEventListener('keydown', keydown)
        }
      })
      window.addEventListener('keyup', function keyup (e) {
        if (_this.bindingKey) {
          if (!keys.includes(e.key)) {
            keys.push(e.key)
            _this.screenshotKeybind = keys.join('+')
          }
          keysReleased.push(e.key)
          if (keysReleased.length === keys.length) {
            _this.bindingKey = false
            ipcRenderer.send('screenshotKeybind-change', { newValue: _this.screenshotKeybind, oldValue: config.get('screenshotKeybind') })
            config.set('screenshotKeybind', _this.screenshotKeybind)
            window.removeEventListener('keyup', keyup)
          }
        }
      })
    },
    openChangelog () {

    }
  }
}
</script>

<style scoped>
hr{
  margin: 0;
  margin-top: .25rem;
  margin-bottom: .25rem;
  height:1px;
  background-color: rgba(255, 255, 255, 0.2);
}

.description{
  font-size: .8rem;
  color:#aaaaaa;
}

.modal-card-body{
  padding: 0!important;
}
</style>
