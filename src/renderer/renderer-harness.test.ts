// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import SmokeProbe from './__fixtures__/SmokeProbe.vue';

// Proves the renderer test harness works end-to-end (cq-tests#4): @vitejs/plugin-vue
// compiles a .vue SFC, happy-dom (opted in via the docblock above) provides a DOM,
// and @vue/test-utils mounts + renders it. This is the unblocking prerequisite for
// future renderer component/composable tests. It deliberately does NOT full-mount
// Worker.vue/SideBar.vue — those require() config/fs/sharp at module scope (the
// documented trap); harness-capable is the deliverable, not blind coverage of them.
describe('renderer test harness (cq-tests#4)', () => {
	test('mounts and renders an SFC through plugin-vue + happy-dom', () => {
		const wrapper = mount(SmokeProbe, { props: { label: 'ok' } });
		expect(wrapper.find('.smoke-probe').exists()).toBe(true);
		expect(wrapper.text()).toContain('harness: ok');
	});

	test('renders the default prop when none is supplied', () => {
		const wrapper = mount(SmokeProbe);
		expect(wrapper.text()).toContain('harness: ready');
	});
});
