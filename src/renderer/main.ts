import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/style/animations.scss';
import './assets/style/main.scss';
import VueLazyload from 'vue-lazyload';
import {
	createOruga,
	Button,
	Modal,
	Input,
	Field,
	Select,
	Switch,
	Tag,
	Carousel,
	Notification,
	Dropdown,
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
import VueShortkey from 'vue3-shortkey';
import Vue3MarkdownIt from 'vue3-markdown-it';

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
// Register Oruga component plugins (not raw components). Each plugin's
// install() calls app.component('OButton', OButton) etc. — passing raw
// OButton/OModal/etc. to oruga.use() silently no-ops because raw components
// have no install method. Carousel plugin registers both OCarousel and
// OCarouselItem, so CarouselItem is not imported separately.
[Button, Modal, Input, Field, Select, Switch, Tag, Carousel, Notification, Dropdown].forEach(
	(p) => oruga.use(p)
);
app.use(oruga, {
	...bulmaConfig,
	iconComponent: 'vue-fontawesome',
	iconPack: 'fas',
});
app.use(VueShortkey);
app.component('FontAwesomeIcon', FontAwesomeIcon);
app.component('VueSimpleContextMenu', VueSimpleContextMenu);
app.component('Vue3MarkdownIt', Vue3MarkdownIt);
app.mount('#app');

if (window && window.process && window.process.type === 'renderer') {
	const { ipcRenderer } = require('electron');

	ipcRenderer.on('change-view', (event: unknown, data: { route?: string }) => {
		if (data.route) {
			router.push(data.route).catch(() => {});
		}
	});
}
