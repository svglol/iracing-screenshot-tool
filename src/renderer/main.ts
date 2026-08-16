import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import config from '../utilities/config';
import { applyLocale, detectRendererLocale, i18n } from './i18n';
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
	faChevronRight,
	// NoticeCard's severity glyphs: severity must not be carried by colour alone.
	faCircleExclamation,
	faTriangleExclamation,
	faCircleInfo,
	// TitleBar's update states. Two glyphs, because "download it" and "restart to
	// install it" are different actions and one arrow for both told the user
	// neither.
	faCloudArrowDown,
	faRotateRight,
	// Graphics profile switcher's toolbar entry.
	faSliders,
	// Nav rail: Home (gallery) and the iRacing configuration page.
	faImages,
	faDisplay,
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
	faChevronRight,
	faCircleExclamation,
	faTriangleExclamation,
	faCircleInfo,
	faCloudArrowDown,
	faRotateRight,
	faSliders,
	faImages,
	faDisplay,
	faDiscord
);

// Adopt the language BEFORE the app mounts, so the first paint is already in the
// right one rather than flashing English. Main resolves and persists this from
// the Windows UI language on first run; detectRendererLocale is only a safety net
// for a window that somehow opens before that write lands.
applyLocale(config.get('locale') || detectRendererLocale());
// Follows the setting for the lifetime of the window. Main broadcasts
// `config:changed:locale` to EVERY window, so the worker window re-languages
// itself from the same event that re-languages this one.
config.onDidChange?.('locale', (newValue) => {
	applyLocale(newValue);
});

const app = createApp(App);
app.use(router);
app.use(i18n);
app.use(VueLazyload);
const oruga = createOruga();
// Register Oruga component plugins (not raw components). Each plugin's
// install() calls app.component('OButton', OButton) etc. — passing raw
// OButton/OModal/etc. to oruga.use() silently no-ops because raw components
// have no install method. Carousel plugin registers both OCarousel and
// OCarouselItem, so CarouselItem is not imported separately.
[
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
].forEach((p) => oruga.use(p));
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
