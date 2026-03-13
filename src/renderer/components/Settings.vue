<template>
  <div class="settings">
    <ul
      class="toolbar"
      style="padding:.5rem"
    >
      <li>
        <a @click="showSettings = true"><font-awesome-icon :icon="['fas', 'cog']" /></a>
      </li>
      <li>
        <a
          v-shortkey.push="['f1']"
          @click="showHelp = true"
          @shortkey="showHelp = true"
        ><font-awesome-icon :icon="['fas', 'question-circle']" /></a>
      </li>

      <li>
        <a @click="openDiscord"><font-awesome-icon :icon="['fab', 'discord']" /></a>
      </li>
    </ul>

    <b-modal
      :active.sync="showSettings"
      has-modal-card
      full-screen
      :can-cancel="true"
    >
      <SettingsModal @changelog="showChangelog = true" />
    </b-modal>

    <b-modal
      :active.sync="showHelp"
      has-modal-card
      trap-focus
      :destroy-on-hide="false"
      :can-cancel="false"
      aria-role="dialog"
      aria-modal
    >
      <HelpModal @close="showHelp = false" />
    </b-modal>

    <b-modal
      :active.sync="showChangelog"
      has-modal-card
      trap-focus
      :destroy-on-hide="false"
      :can-cancel="false"
      aria-role="dialog"
      aria-modal
    >
      <ChangelogModal @close="showChangelog = false" />
    </b-modal>
  </div>
</template>

<script>
import HelpModal from '../components/HelpModal.vue';
import SettingsModal from '../components/SettingsModal.vue';
import ChangelogModal from '../components/ChangelogModal.vue';
const { version } = require('../../../package.json');

const { shell, ipcRenderer } = require('electron');
const fs = require('fs');
const userDataPath = ipcRenderer.sendSync('app:getPath-sync', 'userData');
const changelogFile = userDataPath + '\\releases.json';

const config = require('../../utilities/config');

export default {
  components: {
    HelpModal,
    SettingsModal,
    ChangelogModal
  },
  data () {
    return {
      showSettings: false,
      showHelp: false,
      showConfig: false,
      showChangelog: false
    };
  },
  mounted () {
    const firstTime = config.get('firstTime');
    if (firstTime) {
      this.showHelp = true;
      config.set('firstTime', false);
    }

    const configVersion = config.get('version');
    if (configVersion === '' || configVersion !== version) {
      config.set('version', version);
      this.loadReleases(firstTime);
    } else {
      config.set('version', version);
    }
  },
  methods: {
    async loadReleases (firstTime) {
      try {
        const response = await fetch('https://api.github.com/repos/svglol/iracing-screenshot-tool/releases');
        const body = await response.text();
        const releases = JSON.parse(body);
        if (Array.isArray(releases)) {
          fs.writeFileSync(changelogFile, body);
          if (!firstTime) {
            this.showChangelog = true;
          }
        }
      } catch (error) {
        console.log(error);
      }
    },
    openDiscord () {
      shell.openExternal('https://discord.gg/GX2kSgN');
    }
  }
};
</script>

<style scoped>
.settings{
  margin-top: auto;
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



