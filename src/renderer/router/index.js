import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Worker from '../views/Worker.vue';

const router = createRouter({
	history: createWebHashHistory(),
	routes: [
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
	],
});

// dynamically set application title to current view
router.afterEach((to) => {
	let title =
		to.path === '/home'
			? process.env.PRODUCT_NAME
			: `${to.meta.title} - ${process.env.PRODUCT_NAME}`;

	if (!title) {
		title = 'Home';
	}

	document.title = title;
});

export default router;
