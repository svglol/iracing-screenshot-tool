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
import { version } from '../../../package.json';
const { shell, remote } = require('electron');
const app = remote.app;
const fs = require('fs');
const fetch = require('fetch');
const changelogFile = app.getPath('userData') + '\\releases' + '.json';

const config = require('../../utilities/config');

export default {
  components: {
    HelpModal, SettingsModal, ChangelogModal
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
    var firstTime = config.get('firstTime');
    if (firstTime) {
      this.showHelp = true;
      config.set('firstTime', false);
    }

    var configVersion = config.get('version');
    if (configVersion == '' || configVersion !== version) {
      var ctx = this;
      config.set('version', version);
      fetch.fetchUrl('https://api.github.com/repos/svglol/iracing-screenshot-tool/releases', function (error, meta, body) {
        var releases = JSON.parse(body.toString());
        if (Array.isArray(releases)) {
          fs.writeFileSync(changelogFile, body);
          if (!firstTime) {
            ctx.showChangelog = true;
          }
        }
      });
    } else {
      config.set('version', version);
    }
  },
  methods: {
    openDiscord () {
      shell.openItem('https://discord.gg/GX2kSgN');
    }
  }
};
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
