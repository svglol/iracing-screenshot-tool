import 'bulma-pro/bulma.sass';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import 'buefy/dist/buefy.css';
import './assets/style/animations.scss';
import './assets/style/main.scss';
import Buefy from 'buefy';
import VueLazyload from 'vue-lazyload';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faUserCog, faInfoCircle, faCog, faExternalLinkAlt, faFolder, faTrash, faCamera, faCopy, faQuestionCircle, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import VueSimpleContextMenu from 'vue-simple-context-menu';
import vClickOutside from 'v-click-outside';

import VueMarkdownPlus from 'vue-markdown-plus';

import ChangelogModal from './components/ChangelogModal.vue';
import HelpModal from './components/HelpModal.vue';
import Settings from './components/Settings.vue';
import SettingsModal from './components/SettingsModal.vue';
import SideBar from './components/SideBar.vue';
import TitleBar from './components/TitleBar.vue';

Vue.component('ChangelogModal', ChangelogModal);
Vue.component('HelpModal', HelpModal);
Vue.component('Settings', Settings);
Vue.component('SettingsModal', SettingsModal);
Vue.component('SideBar', SideBar);
Vue.component('TitleBar', TitleBar);

Vue.use(VueLazyload);

Vue.use(Buefy);
Vue.use(require('vue-shortkey'));

library.add(faUserCog, faInfoCircle, faCog, faExternalLinkAlt, faFolder, faTrash, faCamera, faCopy, faQuestionCircle, faArrowDown, faDiscord);

Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(vClickOutside);
Vue.component('vue-simple-context-menu', VueSimpleContextMenu);
Vue.use(VueMarkdownPlus);
Vue.component('vue-markdown-plus', VueMarkdownPlus);

const isDevelopment = process.env.NODE_ENV === 'development';

Vue.config.devtools = isDevelopment;
Vue.config.performance = isDevelopment;
Vue.config.productionTip = isDevelopment;

/* eslint-disable */
new Vue({
  el: '#app',
  router,
  store,
  render: (h) => h(App)
});
 /* eslint-enable */

// To avoild accesing electorn api from web app build
if (window && window.process && window.process.type === 'renderer') {
  const { ipcRenderer } = require('electron');

  // Handle menu event updates from main script
  ipcRenderer.on('change-view', (event, data) => {
    if (data.route) {
      router.push(data.route);
    }
  });
}
