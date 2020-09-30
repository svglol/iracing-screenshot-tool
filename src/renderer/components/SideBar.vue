<template>
  <div style="padding: 1rem; padding-top:.5rem">
    <b-field label="Resolution">
      <b-select
        v-model="resolution"
        expanded
        placeholder="Resolution"
      >
        <option
          v-for="option in items"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </b-select>
    </b-field>

    <b-field
      v-if="resolution === 'Custom'"
      label="Width"
    >
      <b-input
        v-model="customWidth"
        type="number"
        min="0"
        max="10000"
      />
    </b-field>

    <b-field
      v-if="resolution === 'Custom'"
      label="Height"
    >
      <b-input
        v-model="customHeight"
        type="number"
        min="0"
        max="10000"
      />
    </b-field>

    <b-message
      v-if="(resolution == '4k' || resolution == '5k' || resolution == '6k' || resolution == '7k' || resolution == '8k' || resolution == 'Custom')&& !disableTooltips "
      type="is-warning"
      aria-close-label="Close message"
      size="is-small"
      style="background-color: rgba(0, 0, 0, 0.3)!important; margin-top:.5rem; margin-bottom:.5rem; color:yellow"
    >
      <strong> High resolutions may crash iRacing if you run out of VRAM. Certain track/car combinations will require more VRAM</strong>
    </b-message>

    <b-switch
      v-model="crop"
      dense
      style="padding-top: 0.5rem; padding-bottom: .5rem;"
    >
      Crop Watermark
    </b-switch>

    <b-message
      v-if="crop && !disableTooltips"
      type="is-info"
      aria-close-label="Close message"
      size="is-small"
      style="background-color: rgba(0, 0, 0, 0.3)!important; margin-top:.5rem; margin-bottom:.5rem; color:yellow"
    >
      <strong>Shrink iRacing UI to as small as possible with Ctrl+PgDwn before taking screenshot</strong>
    </b-message>

    <b-button
      type="is-primary"
      icon-left="camera"
      expanded
      :loading="takingScreenshot"
      :disabled="!iracingOpen || takingScreenshot"
      style="margin-top:.5rem"
      @click="takeScreenshot"
    >
      Screenshot
    </b-button>
  </div>
</template>

<script>
const config = require('../../utilities/config');
const { ipcRenderer } = require('electron');
const fs = require('fs');

export default {
  props: ['screenshot'],
  data () {
    return {
      items: ['1080p', '2k', '4k', '5k', '6k', '7k', '8k', 'Custom'],
      resolution: '1080p',
      crop: true,
      customWidth: '0',
      customHeight: '0',
      iracingOpen: false,
      takingScreenshot: false,
      disableTooltips: config.get('disableTooltips')
    };
  },
  computed: {
    disabled () {
      return iracingOpen;
    }
  },
  created () {
    ipcRenderer.send('request-iracing-status', '');

    ipcRenderer.on('hotkey-screenshot', (event, arg) => {
      if (this.iracingOpen && !this.takingScreenshot) {
        this.takeScreenshot();
      }
    });

    ipcRenderer.on('iracing-status', (event, arg) => {
      this.iracingOpen = arg;
    });

    ipcRenderer.on('iracing-connected', (event, arg) => {
      this.iracingOpen = true;
    });

    ipcRenderer.on('iracing-disconnected', (event, arg) => {
      this.iracingOpen = false;
    });

    ipcRenderer.on('screenshot-response', (event, arg) => {
      console.log(arg);
      document.exitPointerLock();
      document.body.style.cursor = 'auto';
      if (fs.existsSync(arg)) {
        this.takingScreenshot = false;
        const file = arg.split(/[\\/]/).pop().split('.').slice(0, -1).join('.');
        this.$buefy.notification.open({
          message: file + ' saved successfully',
          type: 'is-success'
        });
      }
    });

    ipcRenderer.on('screenshot-error', (event, arg) => {
      document.exitPointerLock();
      document.body.style.cursor = 'auto';
      this.takingScreenshot = false;
      this.$buefy.notification.open({
        message: 'An error has occured when taking a screenshot :(',
        type: 'is-danger'
      });
      ipcRenderer.send('request-iracing-status', '');
    });

    config.onDidChange('disableTooltips', (newValue, oldValue) => {
      this.disableTooltips = newValue;
    });
  },
  mounted () {
    this.crop = config.get('crop');
    this.customWidth = config.get('customWidth');
    this.customHeight = config.get('customHeight');
    this.resolution = config.get('resolution');
  },
  updated () {
    config.set('crop', this.crop);
    if (!isNaN(parseInt(this.customWidth))) {
      config.set('customWidth', parseInt(this.customWidth));
    }
    if (!isNaN(parseInt(this.customHeight))) {
      config.set('customHeight', parseInt(this.customHeight));
    }
    config.set('resolution', this.resolution);
  },
  methods: {
    takeScreenshot () {
      let w = 0;
      let h = 0;

      switch (this.resolution) {
        case '1080p':
          w = 1920;
          h = 1080;
          break;
        case '2k':
          w = 2560;
          h = 1440;
          break;
        case '4k':
          w = 3840;
          h = 2160;
          break;
        case '5k':
          w = 5120;
          h = 2880;
          break;
        case '6k':
          w = 6400;
          h = 3600;
          break;
        case '7k':
          w = 7168;
          h = 4032;
          break;
        case '8k':
          w = 7680;
          h = 4320;
          break;
        case 'Custom':
          w = parseInt(this.customWidth, 10);
          h = parseInt(this.customHeight, 10);
          break;
        default:
          w = 1920;
          h = 1080;
      }

      if (this.crop) {
        w += 54;
        h += 30;
      }
      this.takingScreenshot = true;
      this.$emit('click', { width: w, height: h, crop: this.crop });
      document.body.requestPointerLock();
      document.body.style.cursor = 'none';
    }
  }
};
</script>

<style >
.message.is-warning .message-body{
  color:#ffdd57!important;
}

.control-label{
  font-weight: 700;
}

.message.is-info .message-body{
  color:rgb(50, 152, 220)!important;
}

</style>
