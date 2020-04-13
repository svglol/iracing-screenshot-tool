<template>
  <div class="modal-card" style="width: auto; height:100vh">
    <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.2);border-bottom: 0px;">
      <p class="modal-card-title" style="color:white; font-weight:700">Settings</p>
    </header>
    <section class="modal-card-body" style="background-color: transparent; ">
      <div style=" max-width:600px; margin:auto;padding-bottom:1rem">
        <b-field label="Screenshot Folder" />

        <b-field label="">
          <b-input disabled type="text" :value="screenshotFolder" style="width:100vw"></b-input>
          <p class="control">
            <b-button class="button is-primary" @click="openFolderDialog" style="width:130px">Select Folder</b-button>
          </p>
        </b-field>
        <hr />
        <b-field label="Screenshot Keybind" />
        <b-field label="">
          <b-input disabled type="text" :value="screenshotKeybind" style="width:100vw"></b-input>
          <p class="control">
            <b-button class="button is-primary" @click="bindScreenshotKeybind" :loading="bindingKey" style="width:130px">Edit Bind</b-button>
          </p>
        </b-field>
        <hr />
        <b-field>
          <div>
            <span class="label" style="margin-bottom:0px;">Disable Tooltips</span>
            <span class="description">Leave me alone, I know what I'm doing</span>
          </div>
          <b-switch v-model="disableTooltips" style="margin-left:auto"></b-switch>
        </b-field>
        <hr />
        <b-field>
          <div>
            <span class="label" style="margin-bottom:0px;">Monitor Size</span>
            <span class="description">Height and width to resize iRacing window to after taking screenshot. Useful for people using an Ultrawide or Nvidia Surround</span>
          </div>
        </b-field>
        <div class="columns">
          <div class="column">
            <b-field label="Width">
              <b-input type="number" min="1280" max="3840" v-model="screenWidth"></b-input>
            </b-field>
          </div>
          <div class="column">
            <b-field label="Height">
              <b-input type="number" v-model="screenHeight" min="720" max="2160" ></b-input>
            </b-field>
          </div>
        </div>
        <hr />
      </span>
    </div>
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
      bindingKey: false,
      disableTooltips:config.get('disableTooltips'),
      screenWidth: config.get('defaultScreenWidth'),
      screenHeight: config.get('defaultScreenHeight')
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
    },
    disableTooltips(){
      config.set('disableTooltips',this.disableTooltips);
    }
  },
  beforeDestroy(){
    if(config.get('defaultScreenHeight') !== parseInt(this.screenHeight)){
      if(this.screenHeight > 720 && this.screenHeight < 2160){
        config.set('defaultScreenHeight',parseInt(this.screenHeight));
        ipcRenderer.send('defaultScreenHeight',parseInt(this.screenHeight));
      }
    }
    if(config.get('defaultScreenWidth') !== parseInt(this.screenWidth)){
      if(this.screenWidth > 1280 && this.screenWidth < 3840){
        ipcRenderer.send('defaultScreenWidth',parseInt(this.screenWidth));
        config.set('defaultScreenWidth',parseInt(this.screenWidth));
      }
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

</style>
