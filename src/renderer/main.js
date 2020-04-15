import 'bulma-pro/bulma.sass';
import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import 'buefy/dist/buefy.css';
import './assets/style/animations.scss';
import './assets/style/main.scss';
import Buefy from 'buefy';
import VueLazyload from 'vue-lazyload'

Vue.use(VueLazyload)

Vue.use(Buefy);
Vue.use(require('vue-shortkey'));

import { library } from '@fortawesome/fontawesome-svg-core'
import { faUserCog,faInfoCircle,faCog,faExternalLinkAlt,faFolder,faTrash,faCamera,faCopy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faUserCog,faInfoCircle,faCog,faExternalLinkAlt,faFolder,faTrash,faCamera,faCopy)

Vue.component('font-awesome-icon', FontAwesomeIcon)

import * as Sentry from '@sentry/electron';

const isDevelopment = process.env.NODE_ENV === 'development';

if(!isDevelopment){
  Sentry.init({dsn: 'https://b80e45fd34c54ebe94691e27445740b1@o376188.ingest.sentry.io/5196735'});
}

Vue.config.devtools = isDevelopment;
Vue.config.performance = isDevelopment;
Vue.config.productionTip = isDevelopment;

new Vue({
	el: '#app',
	router,
	store,
	render: (h) => h(App),
});

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
