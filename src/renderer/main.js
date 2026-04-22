import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/style/animations.scss';
import './assets/style/main.scss';
import VueLazyload from 'vue-lazyload';
import {
	createOruga,
	OButton,
	OModal,
	OInput,
	OField,
	OSelect,
	OSwitch,
	OTag,
	OCarousel,
	OCarouselItem,
	ONotification,
	ODropdown,
} from '@oruga-ui/oruga-next';
import { bulmaConfig } from '@oruga-ui/theme-bulma';
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
const oruga = createOruga();
[
	OButton,
	OModal,
	OInput,
	OField,
	OSelect,
	OSwitch,
	OTag,
	OCarousel,
	OCarouselItem,
	ONotification,
	ODropdown,
].forEach((c) => oruga.use(c));
app.use(oruga, {
	...bulmaConfig,
	iconComponent: 'vue-fontawesome',
	iconPack: 'fas',
});
app.use(require('vue-shortkey'));
app.use(vClickOutside);
app.use(VueMarkdownPlus);
app.component('font-awesome-icon', FontAwesomeIcon);
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
