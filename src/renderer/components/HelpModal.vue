<template>
  <form action="">
    <div class="modal-card" style="width: 100vh;border: 1px solid rgba(255, 255, 255, .1);border-radius: 5px;">
      <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.4); border-bottom: 1px solid black;">
        <p class="modal-card-title" style="color:white">Help</p>

        <button class="button" type="button" @click="$parent.close()"><i class="mdi mdi-close"/></button>
      </header>
      <section class="modal-card-body" style="background-color: rgba(0, 0, 0, 0.6);">
        <span class="heading">iRacing Settings</span>
        <p>iRacing must be running in Windowed Borderless for the best result</br>
        At least 8GB of VRAM is recommended for screenshots of 8k resoultion or higher</br>
        Newer tracks and cars will require more VRAM</p>
        <span class="heading">Screenshot Folder</span>
        <p>Screenshots will be saved by default to "C:\Users\user\Pictures\Screenshots" this can be changed in the settings.</p>
        <span class="heading">Screenshot Hotkey</span>
        <p>By default  "Control + PrintScreen" will take a screenshot with the current settings, this can be changed in the settings.</p>
        <span class="heading">Issues</span>
        <p>If you have any issues please report them on the <a @click="openDiscord">Discord</a> </p>
      </section>
    </div>
  </form>
</template>

<script>
const { shell } = require('electron');

export default {
  data() {
    return {
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
  color:grey;
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
