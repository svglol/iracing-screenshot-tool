import 'bulma-pro/bulma.sass';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'buefy/dist/buefy.css';
import './assets/style/animations.scss';
import './assets/style/main.scss';
import Buefy from 'buefy';
import VueLazyload from 'vue-lazyload';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
	faGear,
	faUpRightFromSquare,
	faFolder,
	faTrash,
	faCopy,
	faCircleQuestion,
	faArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import VueSimpleContextMenu from 'vue-simple-context-menu';
import vClickOutside from 'v-click-outside';
import VueMarkdownPlus from 'vue-markdown-plus';

library.add(
	faGear,
	faUpRightFromSquare,
	faFolder,
	faTrash,
	faCopy,
	faCircleQuestion,
	faArrowDown,
	faDiscord
);

const app = createApp(App);
app.use(router);
app.use(VueLazyload);
app.use(Buefy);
app.use(require('vue-shortkey'));
app.use(vClickOutside);
app.use(VueMarkdownPlus);
app.component('FontAwesomeIcon', FontAwesomeIcon);
app.component('VueSimpleContextMenu', VueSimpleContextMenu);
app.component('VueMarkdownPlus', VueMarkdownPlus);
app.mount('#app');

if (window && window.process && window.process.type === 'renderer') {
	const { ipcRenderer } = require('electron');

	ipcRenderer.on('change-view', (event, data) => {
		if (data.route) {
			router.push(data.route).catch(() => {});
		}
	});
}
