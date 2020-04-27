<template>
  <div class="modal-card" style="width: auto; height:100vh">
    <header class="modal-card-head" style="background-color: rgba(0, 0, 0, 0.2);border-bottom: 0;">
      <p class="modal-card-title" style="color:white;font-weight:700;  margin-bottom: 0rem;">Instructions</p>
    </header>
    <section class="modal-card-body" style="background-color: transparent;">
      <div style=" max-width:600px; margin:auto;padding-bottom:1rem">
        <ol>
          <li>iRacing <b>must</b> be running in Windowed Borderless Mode</li>
          <li>Run iRacing and setup the camera in the position you want to take the screenshot</li>
          <li>Select your desired resolution (Try lower resolutions before going to 8K)</li>
          <li>Select if you want to crop the iRacing watermark or not, if you want to crop it you will need to resize the iRacing UI with 'Control + PageDown' to the smallest size first</li>
          <li>Press the screenshot button or use the Hotkey 'Control + PrintScreen' to take the screenshots</li>
          <li>Depending on the resolution selected this may take a few seconds, once your iRacing screen resizes to its normal size it is finished</li>
          <li>Your screenshot will be saved to 'C:\Users\{User}\Pictures\Screenshots'</li>
        </ol>
      </br>

    </div>
  </section>
</div>
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

li{
  color:#aaaaaa;
}

p{
  margin-bottom: 1rem;
  color:#aaaaaa;
}

ol {list-style: none; counter-reset: li}

li::before {
  content: counter(li);
  color: white;
  display: inline-block; width: 1em;
  margin-left: -1em}

  li {counter-increment: li}

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
