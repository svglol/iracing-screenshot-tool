// @vitest-environment happy-dom
//
// The rail is the app's only navigation; these tests pin the things a silent
// failure could take away: every destination renders, the active route is the
// one visually marked, and tooltips resolve to words rather than i18n keys.
import { mount } from '@vue/test-utils';
import { i18n } from '../i18n';
import NavRail from './NavRail.vue';

// to → expected index in the rail's visual order.
const PAGES = ['/home', '/config', '/help', '/settings'];

function mountRail(path: string) {
	return mount(NavRail, {
		global: {
			plugins: [i18n],
			mocks: {
				$route: { path },
			},
			stubs: {
				'router-link': { template: '<a><slot /></a>' },
				'font-awesome-icon': true,
			},
			directives: {
				// v-shortkey is app-registered in main.ts; a no-op stands in.
				shortkey: {},
			},
		},
	});
}

describe('NavRail', () => {
	test('renders four page destinations and the Discord button', () => {
		const wrapper = mountRail('/home');
		expect(wrapper.findAll('.nav-rail__item')).toHaveLength(5);
		expect(wrapper.find('.nav-rail__item--button').attributes('title')).toBe(
			'Discord'
		);
	});

	test.each(PAGES)('marks exactly %s active on its own route', (path) => {
		const wrapper = mountRail(path);
		const active = wrapper.findAll('.nav-rail__item--active');
		expect(active).toHaveLength(1);
		expect(active[0].attributes('title')).toBeTruthy();
	});

	test('the Discord button is never marked active', () => {
		for (const path of PAGES) {
			const button = mountRail(path).find('.nav-rail__item--button');
			expect(button.classes()).not.toContain('nav-rail__item--active');
		}
	});

	test('tooltips resolve to real strings, not dotted keys', () => {
		const wrapper = mountRail('/home');
		for (const item of wrapper.findAll('.nav-rail__item')) {
			expect(item.attributes('title')).toBeTruthy();
			expect(item.attributes('title')).not.toMatch(/^\w+(\.\w+)+$/);
		}
	});
});
