import 'bulma-pro/bulma.sass';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import 'buefy/dist/buefy.css';
import './assets/style/animations.scss';
import './assets/style/main.scss';
import Buefy from 'buefy';
import VueLazyload from 'vue-lazyload';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faUserCog,
  faInfoCircle,
  faCog,
  faExternalLinkAlt,
  faFolder,
  faTrash,
  faCamera,
  faCopy,
  faQuestionCircle,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import VueSimpleContextMenu from 'vue-simple-context-menu';
import vClickOutside from 'v-click-outside';
import VueMarkdownPlus from 'vue-markdown-plus';

Vue.use(VueLazyload);
Vue.use(Buefy);
Vue.use(require('vue-shortkey'));
Vue.use(vClickOutside);
Vue.use(VueMarkdownPlus);

library.add(
  faUserCog,
  faInfoCircle,
  faCog,
  faExternalLinkAlt,
  faFolder,
  faTrash,
  faCamera,
  faCopy,
  faQuestionCircle,
  faArrowDown,
  faDiscord
);

Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.component('vue-simple-context-menu', VueSimpleContextMenu);
Vue.component('vue-markdown-plus', VueMarkdownPlus);

Vue.config.devtools = process.env.NODE_ENV === 'development';
Vue.config.performance = process.env.NODE_ENV === 'development';
Vue.config.productionTip = false;

new Vue({
  el: '#app',
  router,
  render: (h) => h(App)
});

if (window && window.process && window.process.type === 'renderer') {
  const { ipcRenderer } = require('electron');

  ipcRenderer.on('change-view', (event, data) => {
    if (data.route) {
      router.push(data.route);
    }
  });
}
