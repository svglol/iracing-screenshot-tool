// @vitest-environment happy-dom
//
// The title-bar configuration picker: shows which stored profile the live
// config matches, opens the profiles dialog, and stays fresh when something
// else in the renderer rewrites the ini.
import { mount, flushPromises } from '@vue/test-utils';
import { createRequire } from 'module';
import { i18n } from '../i18n';
import { INI_CHANGED_EVENT } from '../ini-events';

const nodeRequire = createRequire(import.meta.url);

let snapshot: Record<string, unknown>;
const ipcRendererStub = {
	invoke: vi.fn(async (channel: string) => {
		if (channel === 'profiles:list') {
			return snapshot;
		}
		return {};
	}),
	on: vi.fn(),
	removeListener: vi.fn(),
	send: vi.fn(),
	sendSync: vi.fn(),
};

// The component (and the modal it hosts) captures ipcRenderer via a native
// require at module scope — plant the stub before importing.
const id = nodeRequire.resolve('electron');
nodeRequire.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub },
} as unknown as NodeModule;

const { default: ConfigurationPicker } =
	await import('./ConfigurationPicker.vue');

function makeSnapshot(overrides: Record<string, unknown> = {}) {
	return {
		profiles: [],
		activeExists: true,
		active: { name: 'Racing', state: 'clean' },
		activeDifferences: null,
		activeIniPath: 'C:\\Docs\\iRacing\\rendererDX11Monitor.ini',
		iracingRunning: false,
		...overrides,
	};
}

const global = {
	plugins: [i18n],
	stubs: {
		'o-modal': {
			template: '<div v-if="active" class="modal-host"><slot /></div>',
			props: ['active'],
		},
		GraphicsProfilesModal: true,
		'font-awesome-icon': true,
	},
};

async function mountPicker() {
	const wrapper = mount(ConfigurationPicker, { global });
	await flushPromises();
	return wrapper;
}

beforeEach(() => {
	snapshot = makeSnapshot();
	ipcRendererStub.invoke.mockClear();
});

describe('ConfigurationPicker', () => {
	test('a clean active profile shows its bare name, no badge', async () => {
		const wrapper = await mountPicker();
		expect(wrapper.find('.config-picker__name').text()).toBe('Racing');
		expect(wrapper.find('.config-picker__badge').exists()).toBe(false);
	});

	test('a drifted profile keeps the name and gains the Modified badge', async () => {
		snapshot = makeSnapshot({
			active: { name: 'Racing', state: 'modified' },
			activeDifferences: 3,
		});
		const wrapper = await mountPicker();
		expect(wrapper.find('.config-picker__name').text()).toBe('Racing');
		expect(wrapper.find('.config-picker__badge').text()).toBe('Modified');
	});

	test('a missing config and an unmatched config get compact fallbacks', async () => {
		snapshot = makeSnapshot({ activeExists: false });
		expect((await mountPicker()).find('.config-picker__name').text()).toBe(
			'No configuration'
		);
		snapshot = makeSnapshot({ active: { name: null, state: 'unknown' } });
		expect((await mountPicker()).find('.config-picker__name').text()).toBe(
			'No matching profile'
		);
	});

	test('the button opens the profiles dialog', async () => {
		const wrapper = await mountPicker();
		expect(wrapper.find('.modal-host').exists()).toBe(false);
		await wrapper.find('.config-picker__open').trigger('click');
		expect(wrapper.find('.modal-host').exists()).toBe(true);
	});

	test('an ini-changed announcement refreshes the label', async () => {
		const wrapper = await mountPicker();
		expect(wrapper.find('.config-picker__name').text()).toBe('Racing');

		snapshot = makeSnapshot({
			active: { name: 'Screenshots', state: 'clean' },
		});
		window.dispatchEvent(new Event(INI_CHANGED_EVENT));
		await flushPromises();
		expect(wrapper.find('.config-picker__name').text()).toBe('Screenshots');
	});
});
