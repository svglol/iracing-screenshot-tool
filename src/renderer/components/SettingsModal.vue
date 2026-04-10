<template>
  <div
    class="modal-card"
  >
    <header
      class="modal-card-head"
    >
      <p
        class="modal-card-title settings-title"
      >
        Settings
      </p>
    </header>
    <section
      class="modal-card-body settings-body"
    >
      <div class="settings-layout">
        <aside class="settings-meta">
          <span class="heading">Version - {{ toolVersion }}</span>
          <span class="heading"><a @click="$emit('changelog')">Changelog</a></span>
        </aside>

        <div class="settings-form">
          <b-field label="Screenshot Folder" />

          <b-field class="settings-inline-field">
            <b-input
              expanded
              disabled
              type="text"
              :value="screenshotFolder"
            />
            <p class="control">
              <b-button
                class="button is-primary settings-action"
                @click="openFolderDialog"
              >
                Select Folder
              </b-button>
            </p>
          </b-field>
          <hr>
          <b-field label="Screenshot Keybind" />
          <b-field class="settings-inline-field">
            <b-input
              expanded
              disabled
              type="text"
              :value="screenshotKeybind"
            />
            <p class="control">
              <b-button
                class="button is-primary settings-action"
                :loading="bindingKey"
                @click="bindScreenshotKeybind"
              >
                Edit Bind
              </b-button>
            </p>
          </b-field>
          <hr>
          <b-field>
            <div>
              <span class="label" style="margin-bottom:0px;">Custom Filename Format</span>
              <span class="description">Use a custom pattern instead of the default ({track}-{driver}-{counter})</span>
            </div>
            <b-switch
              v-model="customFilenameFormat"
              style="margin-left:auto"
            />
          </b-field>
          <div v-if="customFilenameFormat">
            <b-field>
              <span class="description">Click fields to add them to the format. Type separators (-, _, etc.) directly.</span>
            </b-field>

            <b-field>
              <b-input
                v-model="filenameFormat"
                type="text"
                placeholder="{track}-{driver}-{counter}"
                style="width:100%"
              />
              <p class="control">
                <b-button
                  class="button is-light"
                  style="width:80px"
                  @click="filenameFormat = defaultFormat"
                >
                  Reset
                </b-button>
              </p>
            </b-field>

            <b-field>
              <span class="description">Preview: <strong style="color:#fff">{{ filenamePreview }}</strong></span>
            </b-field>

            <div v-for="(fields, category) in fieldsByCategory" :key="category" style="margin-bottom: 0.5rem;">
              <span class="description" style="display:block; margin-bottom:0.25rem;">{{ category }}</span>
              <div class="field is-grouped is-grouped-multiline">
                <div class="control" v-for="field in fields" :key="field.token">
                  <b-tag
                    type="is-primary"
                    style="cursor:pointer"
                    @click.native="insertField(field.token)"
                  >
                    {{ field.label }}
                  </b-tag>
                </div>
              </div>
            </div>
          </div>

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
              >Prefer top-left watermark crop</span>
              <span class="description">Crops only the bottom-right corner (3% expansion). When off, the screenshot is expanded by 6% and cropped equally from all sides for a centered result.</span>
            </div>
            <b-switch
              v-model="cropTopLeft"
              style="margin-left:auto"
            />
          </b-field>
          <hr>
          <b-field>
            <div>
              <span
                class="label"
                style="margin-bottom:0px;"
              >Manual Window Restore</span>
              <span class="description">Override the automatic window restore with custom position and size. Useful for people using an Ultrawide or Nvidia Surround</span>
            </div>
            <b-switch
              v-model="manualWindowRestore"
              style="margin-left:auto"
            />
          </b-field>
          <div v-if="manualWindowRestore">
            <div class="columns settings-grid">
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
            <div class="columns settings-grid">
              <div class="column">
                <b-field label="Width">
                  <b-input
                    v-model="screenWidth"
                    type="number"
                    min="1080"
                    max="10320"
                  />
                </b-field>
              </div>
              <div class="column">
                <b-field label="Height">
                  <b-input
                    v-model="screenHeight"
                    type="number"
                    min="720"
                    max="10320"
                  />
                </b-field>
              </div>
            </div>
            <b-button
              type="is-info"
              icon-left="expand-arrows-alt"
              expanded
              :disabled="!iracingOpen"
              style="margin-top:.5rem"
              @click="restoreNow"
            >
              Restore Now
            </b-button>
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

          <b-field class="settings-inline-field">
            <b-input
              expanded
              disabled
              type="text"
              :value="reshadeFile"
            />
            <p class="control">
              <b-button
                :disabled="!reshade"
                class="button is-primary settings-action"
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
const { version } = require('../../../package.json');
const config = require('../../utilities/config');
const { FILENAME_FIELDS, DEFAULT_FORMAT } = require('../../utilities/filenameFormat');
const { ipcRenderer } = require('electron');

export default {
  data () {
    return {
      screenshotFolder: config.get('screenshotFolder'),
      screenshotKeybind: config.get('screenshotKeybind'),
      bindingKey: false,
      cropTopLeft: config.get('cropTopLeft'),
      disableTooltips: config.get('disableTooltips'),
      screenWidth: config.get('defaultScreenWidth'),
      screenHeight: config.get('defaultScreenHeight'),
      screenTop: config.get('defaultScreenTop'),
      screenLeft: config.get('defaultScreenLeft'),
      manualWindowRestore: config.get('manualWindowRestore'),
      toolVersion: version,
      reshade: config.get('reshade'),
      reshadeFile: config.get('reshadeFile'),
      customFilenameFormat: config.get('customFilenameFormat'),
      filenameFormat: config.get('filenameFormat'),
      filenameFields: FILENAME_FIELDS,
      defaultFormat: DEFAULT_FORMAT,
      iracingOpen: false
    };
  },
  computed: {
    filenamePreview () {
      const examples = {
        '{track}': 'Daytona',
        '{trackFull}': 'Daytona International Speedway',
        '{trackCity}': 'Daytona Beach',
        '{trackCountry}': 'USA',
        '{trackType}': 'road course',
        '{driver}': 'Max Verstappen',
        '{driverAbbrev}': 'M. Verstappen',
        '{driverInitials}': 'MV',
        '{team}': 'Red Bull Racing',
        '{carNumber}': '1',
        '{car}': 'MCL36',
        '{carFull}': 'McLaren MCL36',
        '{carClass}': 'GTP',
        '{iRating}': '5231',
        '{sessionType}': 'Race',
        '{sessionName}': 'RACE',
        '{lap}': '12',
        '{date}': '2026-04-03',
        '{time}': '14-30-00',
        '{datetime}': '2026-04-03_14-30-00',
        '{counter}': '0'
      };
      let preview = this.filenameFormat || '';
      for (const [token, value] of Object.entries(examples)) {
        preview = preview.split(token).join(value);
      }
      return preview + '.png';
    },
    fieldsByCategory () {
      return this.filenameFields.reduce((acc, field) => {
        if (!acc[field.category]) acc[field.category] = [];
        acc[field.category].push(field);
        return acc;
      }, {});
    }
  },
  created () {
    ipcRenderer.send('request-iracing-status', '');

    ipcRenderer.on('iracing-status', (event, arg) => {
      this.iracingOpen = arg;
    });

    ipcRenderer.on('iracing-connected', () => {
      this.iracingOpen = true;
    });

    ipcRenderer.on('iracing-disconnected', () => {
      this.iracingOpen = false;
    });
  },
  watch: {
    customFilenameFormat () {
      config.set('customFilenameFormat', this.customFilenameFormat);
    },
    filenameFormat () {
      if (config.get('filenameFormat') !== this.filenameFormat) {
        config.set('filenameFormat', this.filenameFormat);
      }
    },
    screenshotFolder () {
      let folder = this.screenshotFolder;
      if (config.get('screenshotFolder') !== folder) {
        if (folder.slice(-1) !== '\\') {
          folder += '\\';
          this.screenshotFolder = folder;
        }
        config.set('screenshotFolder', folder);
      }
    },
    cropTopLeft () {
      config.set('cropTopLeft', this.cropTopLeft);
    },
    disableTooltips () {
      config.set('disableTooltips', this.disableTooltips);
    },
    reshade () {
      config.set('reshade', this.reshade);
    },
    manualWindowRestore () {
      config.set('manualWindowRestore', this.manualWindowRestore);
    },
    reshadeFile () {
      const file = this.reshadeFile;
      if (config.get('reshadeFile') !== file) {
        config.set('reshadeFile', file);
      }
    }
  },
  beforeDestroy () {
    if (config.get('defaultScreenHeight') !== parseInt(this.screenHeight, 10)) {
      if (this.screenHeight >= 720 && this.screenHeight <= 10320) {
        config.set('defaultScreenHeight', parseInt(this.screenHeight, 10));
        ipcRenderer.send('defaultScreenHeight', parseInt(this.screenHeight, 10));
      }
    }
    if (config.get('defaultScreenWidth') !== parseInt(this.screenWidth, 10)) {
      if (this.screenWidth >= 1080 && this.screenWidth <= 10320) {
        ipcRenderer.send('defaultScreenWidth', parseInt(this.screenWidth, 10));
        config.set('defaultScreenWidth', parseInt(this.screenWidth, 10));
      }
    }

    if (config.get('defaultScreenLeft') !== parseInt(this.screenLeft, 10)) {
      if (this.screenLeft !== '') {
        ipcRenderer.send('defaultScreenLeft', parseInt(this.screenLeft, 10));
        config.set('defaultScreenLeft', parseInt(this.screenLeft, 10));
      }
    }

    if (config.get('defaultScreenTop') !== parseInt(this.screenTop, 10)) {
      if (this.screenTop !== '') {
        ipcRenderer.send('defaultScreenTop', parseInt(this.screenTop, 10));
        config.set('defaultScreenTop', parseInt(this.screenTop, 10));
      }
    }
  },
  methods: {
    restoreNow () {
      ipcRenderer.send('defaultScreenWidth', parseInt(this.screenWidth, 10));
      ipcRenderer.send('defaultScreenHeight', parseInt(this.screenHeight, 10));
      ipcRenderer.send('defaultScreenLeft', parseInt(this.screenLeft, 10));
      ipcRenderer.send('defaultScreenTop', parseInt(this.screenTop, 10));
    },
    openFolderDialog () {
      ipcRenderer.invoke('dialog:showOpen', {
        defaultPath: config.get('screenshotFolder'),
        properties: ['openDirectory']
      }).then((result) => {
        if (!result.canceled) {
          this.screenshotFolder = result.filePaths[0];
        }
      }).catch((err) => {
        console.log(err);
      });
    },
    openReshadeDialog () {
      ipcRenderer.invoke('dialog:showOpen', {
        defaultPath: config.get('reshadeFile'),
        properties: ['openFile']
      }).then((result) => {
        if (!result.canceled) {
          this.reshadeFile = result.filePaths[0];
        }
      }).catch((err) => {
        console.log(err);
      });
    },
    bindScreenshotKeybind () {
      const keys = [];
      const keysReleased = [];
      this.bindingKey = true;

      const onKeyDown = (e) => {
        if (!this.bindingKey) {
          window.removeEventListener('keydown', onKeyDown);
          return;
        }

        if (!keys.includes(e.key)) {
          keys.push(e.key);
          this.screenshotKeybind = keys.join('+');
        }
      };

      const onKeyUp = (e) => {
        if (!this.bindingKey) {
          window.removeEventListener('keyup', onKeyUp);
          return;
        }

        if (!keys.includes(e.key)) {
          keys.push(e.key);
          this.screenshotKeybind = keys.join('+');
        }

        keysReleased.push(e.key);
        if (keysReleased.length === keys.length) {
          this.bindingKey = false;
          ipcRenderer.send('screenshotKeybind-change', {
            newValue: this.screenshotKeybind,
            oldValue: config.get('screenshotKeybind')
          });
          config.set('screenshotKeybind', this.screenshotKeybind);
          window.removeEventListener('keyup', onKeyUp);
          window.removeEventListener('keydown', onKeyDown);
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    },
    insertField (token) {
      this.filenameFormat = (this.filenameFormat || '') + token;
    }
  }
};
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

.modal-card {
  width: 100%;
  max-width: none;
  height: 100vh;
}

.modal-card-head {
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom: 0;
}

.settings-title {
  color: white;
  font-weight: 700;
}

.settings-body {
  background-color: transparent;
  padding: 0 !important;
}

.settings-layout {
  max-width: 980px;
  margin: 0 auto;
  padding: 1rem 2rem 2rem;
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 2.5rem;
  align-items: start;
}

.settings-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.settings-form {
  min-width: 0;
}

.settings-inline-field {
  margin-bottom: 0;
}

.settings-action {
  width: 130px;
}

.settings-grid {
  margin-top: 0.25rem;
  margin-bottom: 0;
}

@media (max-width: 900px) {
  .settings-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1rem 1.25rem 2rem;
  }

  .settings-meta {
    padding-top: 0;
  }

  .settings-action {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .settings-inline-field {
    display: block;
  }

  .settings-inline-field .control {
    margin-top: 0.5rem;
  }
}
</style>



