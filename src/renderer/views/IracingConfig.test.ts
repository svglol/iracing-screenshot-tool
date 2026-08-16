// @vitest-environment happy-dom
//
// Page-level tests for the config editor: mount against a stubbed IPC surface
// and prove the load -> edit -> save loop, the sim-running lock, and the
// stale-file flow. Child components (SettingField, FovCalculator,
// MonitorLayout, NoticeCard) mount for real, so a template error anywhere in
// the tree fails here.
//
// The electron stub is planted in Node's require cache because the view
// resolves ipcRenderer via a native require('electron') that vi.mock cannot
// reach (the GraphicsProfilesModal.test.ts approach).
import { createRequire } from 'module';
import { mount, flushPromises } from '@vue/test-utils';
import { i18n } from '../i18n';

const notificationOpen = vi.fn();
vi.mock('@oruga-ui/oruga-next', () => ({
	useOruga: () => ({ notification: { open: notificationOpen } }),
}));

const nodeRequire = createRequire(import.meta.url);

let invokeResults: Record<string, unknown> = {};
const invoked: Array<{ channel: string; args: unknown[] }> = [];
const listeners = new Map<string, (...args: unknown[]) => void>();
let configValues: Record<string, unknown> = {};

const ipcRendererStub = {
	on(channel: string, handler: (...args: unknown[]) => void) {
		listeners.set(channel, handler);
	},
	removeListener(channel: string) {
		listeners.delete(channel);
	},
	send: vi.fn(),
	sendSync(channel: string, payload: unknown) {
		if (channel === 'config:get') {
			return configValues[payload as string] ?? '';
		}
		if (channel === 'config:set') {
			const { key, value } = payload as { key: string; value: unknown };
			configValues[key] = value;
		}
		return undefined;
	},
	invoke(channel: string, ...args: unknown[]) {
		invoked.push({ channel, args });
		if (!(channel in invokeResults)) {
			return Promise.reject(new Error(`no stub for ${channel}`));
		}
		const result = invokeResults[channel];
		return Promise.resolve(
			typeof result === 'function' ? result(...args) : result
		);
	},
};

const id = nodeRequire.resolve('electron');
nodeRequire.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub },
} as unknown as NodeModule;

// Imported AFTER the stub is planted — the view captures ipcRenderer at
// module scope.
const { default: IracingConfig } = await import('./IracingConfig.vue');

function readPayload(overrides: Record<string, unknown> = {}) {
	return {
		ok: true,
		values: {
			'Display/fullScreen': '0',
			'Display/windowedXPos': '0',
			'Display/windowedYPos': '0',
			'Display/windowedWidth': '1920',
			'Display/windowedHeight': '1080',
			'Graphics Options/ShaderQuality': '3',
			'Graphics Options/SSAO': '1',
		},
		missing: [],
		mtimeMs: 111,
		path: 'C:\\Docs\\iRacing\\rendererDX11Monitor.ini',
		fileName: 'rendererDX11Monitor.ini',
		...overrides,
	};
}

const global = {
	plugins: [i18n],
	stubs: {
		'o-button': {
			template:
				'<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
			props: ['disabled', 'loading', 'variant', 'size'],
		},
		'o-select': {
			template:
				'<select @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
			props: ['modelValue', 'size'],
		},
		'o-input': {
			template:
				'<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
			props: [
				'modelValue',
				'min',
				'max',
				'step',
				'disabled',
				'size',
				'type',
			],
		},
		'o-switch': {
			template:
				'<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>',
			props: ['modelValue', 'disabled'],
		},
		'o-tag': { template: '<span class="tag"><slot /></span>' },
		'font-awesome-icon': true,
	},
};

async function mountPage(overrides: Record<string, unknown> = {}) {
	invokeResults = {
		'iracing-config:modes': {
			ok: true,
			modes: [
				{
					mode: 'Monitor',
					fileName: 'rendererDX11Monitor.ini',
					mtimeMs: 111,
				},
				{
					mode: 'OpenXR',
					fileName: 'rendererDX11OpenXR.ini',
					mtimeMs: 111,
				},
			],
			folder: 'C:\\Docs\\iRacing',
		},
		'iracing-config:read': readPayload(),
		'iracing-config:displays': {
			displays: [
				{
					id: 1,
					bounds: { x: 0, y: 0, width: 2560, height: 1440 },
					scaleFactor: 1,
					rotation: 0,
					internal: false,
				},
			],
			primaryId: 1,
		},
		...overrides,
	};
	const wrapper = mount(IracingConfig, { global });
	await flushPromises();
	return wrapper;
}

beforeEach(() => {
	invoked.length = 0;
	listeners.clear();
	invokeResults = {};
	configValues = { iniEditorMode: 'Monitor', iracingFolder: '' };
	notificationOpen.mockClear();
});

describe('rendering', () => {
	test('mounts, loads modes + values, renders every group', async () => {
		const wrapper = await mountPage();
		expect(invoked.map((call) => call.channel)).toContain(
			'iracing-config:modes'
		);
		expect(invoked.map((call) => call.channel)).toContain(
			'iracing-config:read'
		);
		expect(wrapper.text()).toContain('Window placement');
		expect(wrapper.text()).toContain('Full screen');
	});

	test('the graphics tab renders its groups and the pair switch', async () => {
		const wrapper = await mountPage();
		wrapper.vm.activeTab = 'graphics';
		await flushPromises();
		expect(wrapper.text()).toContain('Quality & detail');
		expect(wrapper.text()).toContain('Anti-aliasing & sharpening');
		expect(wrapper.text()).toContain('Post-processing');
		expect(wrapper.text()).toContain('Performance');
		expect(wrapper.text()).toContain('Miscellaneous');
		expect(wrapper.text()).toContain('Also apply to replay graphics');
		expect(wrapper.text()).not.toContain('iniEditor.');
	});

	test('resolves every translation key it renders', async () => {
		const wrapper = await mountPage();
		expect(wrapper.text()).not.toContain('iniEditor.');
	});

	test('a custom config is listed by its bare name, like iRacing does', async () => {
		const wrapper = await mountPage({
			'iracing-config:modes': {
				ok: true,
				modes: [
					{
						mode: 'Monitor',
						fileName: 'rendererDX11Monitor.ini',
						mtimeMs: 111,
					},
					{
						mode: 'Monitor - Screenshots',
						fileName: 'rendererDX11Monitor - Screenshots.ini',
						mtimeMs: 111,
					},
					{ mode: 'Legacy', fileName: 'rendererDX11.ini', mtimeMs: 111 },
				],
				folder: 'C:\\Docs\\iRacing',
			},
		});
		const select = wrapper.find('#iracing-config-mode');
		expect(select.exists()).toBe(true);
		expect(select.text()).toContain('Screenshots');
		expect(select.text()).not.toContain('Monitor - Screenshots');
		expect(select.text()).toContain('Legacy');
	});

	test('an unreadable file surfaces the load failure', async () => {
		const wrapper = await mountPage({
			'iracing-config:read': { ok: false, error: 'fileNotFound' },
		});
		expect(wrapper.text()).toContain(
			'The configuration file could not be read.'
		);
	});
});

describe('edit -> save loop', () => {
	test('an edit shows the save bar; save sends exactly the diff', async () => {
		const wrapper = await mountPage();
		expect(wrapper.find('.iracing-config__savebar').exists()).toBe(false);

		wrapper.vm.onUpdate('Display/windowedWidth', '2560');
		await flushPromises();
		expect(wrapper.find('.iracing-config__savebar').exists()).toBe(true);
		expect(wrapper.text()).toContain('1 unsaved change');

		invokeResults['iracing-config:save'] = {
			ok: true,
			mtimeMs: 222,
			backedUp: true,
		};
		await wrapper.vm.save();
		await flushPromises();

		const save = invoked.find(
			(call) => call.channel === 'iracing-config:save'
		);
		expect(save.args[0]).toEqual({
			mode: 'Monitor',
			edits: [{ id: 'Display/windowedWidth', value: '2560' }],
			expectedMtimeMs: 111,
			pairReplay: true,
		});
		expect(notificationOpen).toHaveBeenCalledWith(
			expect.objectContaining({ variant: 'success' })
		);
		// The buffer was reloaded and is clean again.
		expect(wrapper.vm.dirtyCount).toBe(0);
	});

	test('reverting an edit to the disk value clears the dirty state', async () => {
		const wrapper = await mountPage();
		wrapper.vm.onUpdate('Display/windowedWidth', '2560');
		expect(wrapper.vm.dirtyCount).toBe(1);
		wrapper.vm.onUpdate('Display/windowedWidth', '1920');
		expect(wrapper.vm.dirtyCount).toBe(0);
	});

	test('discard drops every pending edit', async () => {
		const wrapper = await mountPage();
		wrapper.vm.onUpdate('Display/windowedWidth', '2560');
		wrapper.vm.onUpdate('Display/windowedHeight', '1440');
		wrapper.vm.discard();
		expect(wrapper.vm.dirtyCount).toBe(0);
	});

	test('an invalid edit blocks saving', async () => {
		const wrapper = await mountPage();
		wrapper.vm.onUpdate('Display/windowedWidth', 'nope');
		await flushPromises();
		expect(wrapper.vm.canSave).toBe(false);
	});
});

describe('sim-running lock', () => {
	test('the status event raises the banner and blocks saving', async () => {
		const wrapper = await mountPage();
		listeners.get('iracing-status')(null, true);
		await flushPromises();
		expect(wrapper.text()).toContain('iRacing is running');
		wrapper.vm.onUpdate('Display/windowedWidth', '2560');
		expect(wrapper.vm.canSave).toBe(false);
	});
});

describe('stale detection', () => {
	test('a stale save result raises the reload notice', async () => {
		const wrapper = await mountPage();
		wrapper.vm.onUpdate('Display/windowedWidth', '2560');
		invokeResults['iracing-config:save'] = { ok: false, error: 'staleFile' };
		await wrapper.vm.save();
		await flushPromises();
		expect(wrapper.text()).toContain('This file changed on disk');
		expect(wrapper.vm.canSave).toBe(false);
	});

	test('a background change with no edits is adopted silently', async () => {
		const wrapper = await mountPage();
		invokeResults['iracing-config:read'] = readPayload({
			mtimeMs: 999,
			values: { ...readPayload().values, 'Display/windowedWidth': '2560' },
		});
		await wrapper.vm.checkStale();
		await flushPromises();
		expect(wrapper.vm.stale).toBe(false);
		expect(wrapper.vm.values['Display/windowedWidth']).toBe('2560');
	});

	test('a background change with pending edits raises the notice instead', async () => {
		const wrapper = await mountPage();
		wrapper.vm.onUpdate('Display/windowedHeight', '1440');
		invokeResults['iracing-config:read'] = readPayload({ mtimeMs: 999 });
		await wrapper.vm.checkStale();
		await flushPromises();
		expect(wrapper.vm.stale).toBe(true);
		expect(wrapper.text()).toContain('Reload');
	});
});

describe('replay pairing', () => {
	test('the switch persists to config and rides along on save', async () => {
		const wrapper = await mountPage();
		wrapper.vm.setPairReplay(false);
		expect(configValues.iniEditorPairReplay).toBe(false);

		wrapper.vm.onUpdate('Display/windowedWidth', '2560');
		invokeResults['iracing-config:save'] = {
			ok: true,
			mtimeMs: 222,
			backedUp: true,
		};
		await wrapper.vm.save();
		const save = invoked.find(
			(call) => call.channel === 'iracing-config:save'
		);
		expect((save.args[0] as { pairReplay?: boolean }).pairReplay).toBe(false);
	});

	test('the stored preference seeds the switch on mount', async () => {
		configValues.iniEditorPairReplay = false;
		const wrapper = await mountPage();
		expect(wrapper.vm.pairReplay).toBe(false);
	});
});

describe('invalid feedback', () => {
	test('an invalid edit renders the constraint hint inline', async () => {
		const wrapper = await mountPage();
		wrapper.vm.onUpdate('Display/windowedWidth', '99');
		await flushPromises();
		expect(wrapper.text()).toContain(
			'Enter a whole number between 640 and 30000.'
		);
	});
});
