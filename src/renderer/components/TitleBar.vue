<template>
  <div class="titlebar">
    <div class="bar">
      <div class="dragregion">
        <img
        v-bind:src="ico"
        style="
        max-height: 18px;
        margin-right: 5px;
        margin-left: 5px;
        margin-top: auto;
        margin-bottom: auto;
        "
        />
        <span style="margin-top: auto; margin-bottom: auto;">{{
          title
        }}</span>
      </div>
      <div class="button" @click="onUpdate"><font-awesome-icon :style="{ color: 'green' }" v-if="updateReady" :icon="['fas', 'arrow-down']" /></div>
      <div class="button" @click="onMinimize">
        <span class="dash">&#x2012;</span>
      </div>
      <div class="button" @click="onMaximize"><span>&#9744;</span></div>
      <div class="button close" @click="onClose"><span>&#10005;</span></div>
    </div>
  </div>
</template>

<script>
const electron = window.require ? window.require('electron') : null;
const { ipcRenderer } = require('electron');
const { remote } = require('electron');
const win = remote.getCurrentWindow();

export default {
  props: ['title', 'ico'],
  data() {
    return {
      updateReady: false,
    }
  },
  methods: {
    onClose() {
      close();
    },
    onMinimize() {
      win.minimize();
    },
    onMaximize() {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    },
    onUpdate(){
      ipcRenderer.send('install-update', '');
    }
  },
  mounted(){
    ipcRenderer.on('update-available', (event, arg) => {
      this.updateReady = true;
    });
  }
};
</script>

<style scoped>
.titlebar {
  display: flex;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  height: 24px;
}
img {
  height: 24px;
}
.bar {
  flex-grow: 1;
  display: flex;
}
.dragregion {
  margin-top: 2px;
  flex-grow: 1;
  text-align: left;
  vertical-align: middle;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  font-size: 12px;
}
.dragregion > span {
  flex-grow: 1;
  margin-top: -3px;
}
.button {
  padding: 0;
  width: 44px;
  text-align: center;
  font-size: 12pt;
  display: flex;
  align-items: center;
  cursor: pointer;
  height: 24px;
  background-color: rgba(0, 0, 0, 0);
  border: 0px solid transparent;
  border-radius: 0px;
}
.button > span {
  flex-grow: 1;
  margin-top: -3px;
  user-select: none;
  color: white;
}
.button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
.close:hover {
  background-color: red;
  color: white;
}
.button > span.dash {
  vertical-align: sub;
  margin-top: 0px;
}
</style>
