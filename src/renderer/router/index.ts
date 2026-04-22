import {
	createRouter,
	createWebHashHistory,
	type RouteRecordRaw,
} from 'vue-router';
import Home from '../views/Home.vue';
import Worker from '../views/Worker.vue';

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
