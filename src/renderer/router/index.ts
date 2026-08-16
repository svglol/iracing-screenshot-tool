import {
	createRouter,
	createWebHashHistory,
	type RouteRecordRaw,
} from 'vue-router';
import Home from '../views/Home.vue';
import Worker from '../views/Worker.vue';
import IracingConfig from '../views/IracingConfig.vue';
import Settings from '../views/Settings.vue';
import Help from '../views/Help.vue';

const routes: RouteRecordRaw[] = [
	{
		path: '/',
		redirect: '/home',
	},
	{
		path: '/home',
		meta: {
			title: 'Home',
			icon: 'fa-home',
		},
		component: Home,
	},
	{
		path: '/config',
		name: 'config',
		meta: {
			title: 'iRacing Config',
			icon: 'fa-display',
		},
		component: IracingConfig,
	},
	{
		path: '/settings',
		name: 'settings',
		meta: {
			title: 'Settings',
			icon: 'fa-gear',
		},
		component: Settings,
	},
	{
		path: '/help',
		name: 'help',
		meta: {
			title: 'Help',
			icon: 'fa-circle-question',
		},
		component: Help,
	},
	{
		path: '/worker',
		name: 'worker',
		component: Worker,
	},
	{
		path: '/:pathMatch(.*)*',
		redirect: '/home',
	},
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

// dynamically set application title to current view
router.afterEach((to) => {
	const productName = process.env.PRODUCT_NAME || 'iRacing Screenshot Tool';
	let title: string =
		to.path === '/home'
			? productName
			: `${(to.meta as { title?: string }).title ?? 'Home'} - ${productName}`;

	if (!title) {
		title = 'Home';
	}

	document.title = title;
});

export default router;
