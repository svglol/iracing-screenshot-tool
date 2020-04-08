<template>
  <div class="settings">
    <ul class="toolbar" style="padding:.5rem">
      <li>
        <a @click="showSettings = true" ><i class="mdi mdi-settings" /></a>
      </li>
    </ul>

    <b-modal :active.sync="showSettings"
    has-modal-card
    trap-focus
    aria-role="dialog"
    aria-modal>
    <modal-form></modal-form>
  </b-modal>
</div>
</template>

<script>
const config = require('../../utilities/config');

const {dialog} = require('electron').remote;

const ModalForm = {
  data() {
    return {
      screenshotFolder: config.get('screenshotFolder'),
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
      config.set('screenshotFolder',this.screenshotFolder+'\\');
      this.$parent.close()
    }
  },
  watch: {
  },
  template: `
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

  </section>
  <footer class="modal-card-foot" style="background-color: rgba(0, 0, 0, 0.4);border-top: 1px solid black;">
  <button class="button is-dark" type="button" @click="$parent.close()">Close</button>
  <button class="button is-primary" @click="save">Save</button>
  </footer>
  </div>
  </form>
  `
}

export default {
  components: {
    ModalForm
  },
  data() {
    return {
      showSettings: false,
    }
  },
  methods: {

  }
}
</script>

<style scoped>
.settings{
  margin-top: auto;
  /* padding: 1rem; */
  background-color: rgba(0, 0, 0, 0.3);
  margin-bottom: 1.5rem;
}

.toolbar {
  list-style-type: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.toolbar li {
  float: left;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  font-size: 1.5rem;
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
</style>
