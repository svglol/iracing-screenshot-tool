<template>
  <div style="padding: 1rem;">
    <b-field label="Resolution">
      <b-select expanded placeholder="Resolution" v-model="resolution">
        <option v-for="option in items" :value="option" :key="option">
          {{ option }}
        </option>
      </b-select>
    </b-field>

    <b-field label="Width" v-if="resolution === 'Custom'">
      <b-input
      v-model="customWidth"
      type="number"
      min="0"
      max="10000"
      ></b-input>
    </b-field>

    <b-field label="Height" v-if="resolution === 'Custom'">
      <b-input
      v-model="customHeight"
      type="number"
      min="0"
      max="10000"
      ></b-input>
    </b-field>

    <b-switch
    dense
    v-model="crop"
    style="padding-top: 0.5rem; padding-bottom: 1rem;"
    >Crop Watermark</b-switch
    >
    <b-button
    type="is-primary"
    icon-left="camera"
    expanded
    :loading="takingScreenshot"
    :disabled="!iracingOpen || takingScreenshot"
    @click="takeScreenshot"
    >Screenshot</b-button
    >
  </div>
</template>

<script>
const config = require('../../utilities/config');
const { ipcRenderer } = require('electron');

export default {
  props: ['screenshot'],
  data() {
    return {
      items: ['1080p', '2k', '4k', '5k', '6k', '7k', '8k', 'Custom'],
      resolution: '1080p',
      crop: true,
      customWidth: '0',
      customHeight: '0',
      iracingOpen: false,
      takingScreenshot: false,
    };
  },
  methods: {
    takeScreenshot() {
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
    },
  },
  created() {
    ipcRenderer.send('request-iracing-status', '');

    ipcRenderer.on('hotkey-screenshot', (event, arg) => {
      if(this.iracingOpen && !this.takingScreenshot){
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
      this.takingScreenshot = false;
      this.$buefy.notification.open({
        message: arg + ' saved succesfully',
        type: 'is-success',
      });
    });
  },
  computed: {
    disabled() {
      return iracingOpen;
    },
  },
  mounted() {
    this.crop = config.get('crop');
    this.customWidth = config.get('customWidth');
    this.customHeight = config.get('customHeight');
    this.resolution = config.get('resolution');
  },
  updated() {
    config.set('crop', this.crop);
    config.set('customWidth', this.customWidth);
    config.set('customHeight', this.customHeight);
    config.set('resolution', this.resolution);
  },
};
</script>

<style scoped></style>
