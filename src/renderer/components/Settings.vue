<template>
  <div class="settings">
    <ul class="toolbar" style="padding:.5rem">
      <li>
        <a @click="showSettings = true" ><font-awesome-icon :icon="['fas', 'cog']"  /></a>
      </li>
      <li>
        <a @click="showHelp = true" v-shortkey.push="['f1']" @shortkey="showHelp = true"><font-awesome-icon :icon="['fas', 'question-circle']"  /></a>
      </li>

      <li>
        <a @click="openDiscord" ><font-awesome-icon :icon="['fab', 'discord']" /></a>
      </li>
    </ul>

    <b-modal :active.sync="showSettings"
    has-modal-card full-screen :can-cancel="true">
    <SettingsModal  @changelog="showChangelog = true"/>
  </b-modal>

  <b-modal :active.sync="showHelp"
  has-modal-card
  trap-focus
  :destroy-on-hide="false"
  :can-cancel="false"
  aria-role="dialog"
  aria-modal >
  <HelpModal  @close="showHelp = false"/>
</b-modal>

<b-modal :active.sync="showChangelog"
has-modal-card
trap-focus
:destroy-on-hide="false"
:can-cancel="false"
aria-role="dialog"
aria-modal>
<ChangelogModal @close="showChangelog = false"/>
</b-modal>

</div>
</template>

<script>
import HelpModal from '../components/HelpModal.vue';
import SettingsModal from '../components/SettingsModal.vue';
import ChangelogModal from '../components/ChangelogModal.vue';
const { shell } = require('electron');
import { version } from '../../../package.json';

const config = require('../../utilities/config');

export default {
  components: {
    HelpModal, SettingsModal, ChangelogModal
  },
  data() {
    return {
      showSettings: false,
      showHelp: false,
      showConfig: false,
      showChangelog: false,
    }
  },
  methods: {
    openDiscord(){
      shell.openItem('https://discord.gg/GX2kSgN');
    }
  },
  mounted(){
    var firstTime = config.get('firstTime');
    if(firstTime){
      this.showHelp = true;
      config.set('firstTime',false);
    }

    var configVersion = config.get('version');
    if(configVersion == '' && !firstTime){
      config.set('version',version);
      this.showChangelog = true;
    }
    else if(configVersion !== version && !firstTime){
      config.set('version',version);
      this.showChangelog = true;
    }
    else{
      config.set('version',version);
    }
  }
}
</script>

<style scoped>
.settings{
  margin-top: auto;
  /* padding: 1rem; */
  /* background-color: rgba(0, 0, 0, 0.3); */
  margin-bottom: 1.5rem;
}

.modal{
  margin-top: 24px;
  border: 0px;
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
  font-size: 1.25rem;
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
