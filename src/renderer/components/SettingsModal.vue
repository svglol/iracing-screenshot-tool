<template>
  <form action="">
    <div class="modal-card" style="width: 80vh;border: 1px solid rgba(255, 255, 255, .1);border-radius: 5px;">
      <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.4); border-bottom: 1px solid black;">
        <p class="modal-card-title" style="color:white">Settings</p>
      </header>
      <section class="modal-card-body" style="background-color: rgba(0, 0, 0, 0.6);">

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
      <footer class="modal-card-foot" style="background-color: rgba(0, 0, 0, 0.4);border-top: 1px solid black;">
        <button class="button is-dark" type="button" @click="$parent.close()">Close</button>
        <b-button class="button is-primary" @click="save">Save</b-button>
      </footer>
    </div>
  </form>
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
    save(){
      if(config.get('screenshotFolder') !== this.screenshotFolder){
        config.set('screenshotFolder',this.screenshotFolder+'\\');
      }
      ipcRenderer.send('screenshotKeybind-change',{newValue: this.screenshotKeybind,oldValue:config.get('screenshotKeybind')});
      config.set('screenshotKeybind',this.screenshotKeybind);
      this.$parent.close()
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
            window.removeEventListener("keyup",keyup);
          }
        }
      });
    }
  },
}
</script>
