<template>
  <div class="modal-card" style="width: auto; height:100vh">
    <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.2);border-bottom: 0;">
      <p class="modal-card-title" style="color:white;font-weight:700;  margin-bottom: 0rem;">Help</p>
    </header>
    <section class="modal-card-body" style="background-color: transparent;">
      <div style=" max-width:600px; margin:auto;padding-bottom:1rem">
        <span class="heading">iRacing Settings</span>
        <ul>
          <li>iRacing must be running in Windowed Borderless</li>
          <li>At least 8GB of VRAM is recommended for screenshots of 8k resoultion or higher</li>
          <li>Newer tracks and cars will require more VRAM</li>
          <li>Shrink the UI to the smallest it can go before taking a screenshot if using the Crop Watermark option, "Control+PageDown" will shrink it, if this doesnt work you may need to reset your UI Zoom in the iRacing settings</li>
        </ul>
      </p>
      <span class="heading">Screenshot Folder</span>
      <p>Screenshots will be saved by default to "C:\Users\user\Pictures\Screenshots" this can be changed in the settings</p>
      <span class="heading">Screenshot Hotkey</span>
      <p>By default  "Control + PrintScreen" will take a screenshot with the current settings, this can be changed in the settings.</p>
      <span class="heading">Issues</span>
      <p>If you have any issues please report them on the <a @click="openDiscord">Discord</a> </p>
      <span class="heading">Version - {{toolVersion}}</span>
    </div>
  </section>
</div>
</template>

<script>
const { shell } = require('electron');
import { version } from '../../../package.json';

export default {
  data() {
    return {
      toolVersion: version
    }
  },
  methods:{
    openDiscord(){
      shell.openItem('https://discord.gg/GX2kSgN');
    }
  }
}
</script>

<style scoped>

.heading{
  font-size: .75rem;
  font-weight: 700;
}

ul{
  list-style-type: disc;
  margin-left: 2rem;
}

p{
  margin-bottom: 1rem;
  color:#aaaaaa;
}

button {
  background-color: transparent;
  border: 0px;
  color:white;
  font-size: 1.5rem;
  padding: 0px;
  margin: 0px;
  padding-bottom: 1.25rem;
  text-align: left;
  height: 20px;
  margin-bottom: 1.5rem;
}
</style>
