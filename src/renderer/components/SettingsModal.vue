<template>
    <div class="modal-card" style="width: auto; height:100vh">
      <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.2);border-bottom: 0px;">
        <p class="modal-card-title" style="color:white; font-weight:700">Settings</p>
      </header>
      <section class="modal-card-body" style="background-color: transparent; max-width:600px; margin:auto">
        <b-field label="Screenshot Folder" />

        <b-field label="">
          <b-input disabled type="text" :value="screenshotFolder" style="width:100vw"></b-input>
          <p class="control">
            <b-button class="button is-primary" @click="openFolderDialog">Select Folder</b-button>
          </p>
        </b-field>

        <b-field label="Screenshot Keybind" />
        <b-field label="">
          <b-input disabled type="text" :value="screenshotKeybind" style="width:100vw"></b-input>
          <p class="control">
            <b-button class="button is-primary" @click="bindScreenshotKeybind" :loading="bindingKey">Bind</b-button>
          </p>
        </b-field>
      </section>
    </div>
</template>

<script>
const config = require('../../utilities/config');
const { ipcRenderer } = require('electron');
const {dialog} = require('electron').remote;

export default {
  data() {
    return {
      screenshotFolder: config.get('screenshotFolder'),
      screenshotKeybind: config.get('screenshotKeybind'),
      bindingKey: false
    }
  },
  methods: {
    openFolderDialog(){
      var path = dialog.showOpenDialog({
        defaultPath : config.get('screenshotFolder'),
        properties: ['openDirectory']
      }).then(result => {
        if(!result.canceled){
          this.screenshotFolder = result.filePaths[0]
        }
      }).catch(err => {
        console.log(err)
      });
    },
    bindScreenshotKeybind(){
      let _this = this;
      this.bindingKey = true;
      let keys = [];
      let keysReleased = [];
      var keydown = window.addEventListener("keydown", function keydown (e) {
        if(_this.bindingKey){
          if(!keys.includes(e.key)){
            keys.push(e.key);
            _this.screenshotKeybind = keys.join('+')
          }
        }
        else{
          window.removeEventListener("keydown",keydown);
        }
      });
      window.addEventListener("keyup",  function keyup (e) {
        if(_this.bindingKey){
          if(!keys.includes(e.key)){
            keys.push(e.key);
            _this.screenshotKeybind = keys.join('+')
          }
          keysReleased.push(e.key);
          if(keysReleased.length == keys.length){
            _this.bindingKey = false;
            ipcRenderer.send('screenshotKeybind-change',{newValue: _this.screenshotKeybind,oldValue:config.get('screenshotKeybind')});
            config.set('screenshotKeybind',_this.screenshotKeybind);
            window.removeEventListener("keyup",keyup);
          }
        }
      });
    }
  },
  watch:{
    screenshotFolder(){
      let folder = this.screenshotFolder;
      if(config.get('screenshotFolder') !== folder){
        if(folder.slice(-1) !== '\\'){
          folder += '\\';
          this.screenshotFolder = folder;
        }
        config.set('screenshotFolder',folder);
      }
    }
  }
}
</script>
