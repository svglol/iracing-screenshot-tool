// @vitest-environment happy-dom
//
// Settings' screenshot-hotkey capture and its listener hygiene. Settings is the
// /settings route's page, so it unmounts on every navigation away — whatever it
// leaves registered outlives it.
//
// NOTE ON THE ELECTRON STUB: SettingsModal resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach, so the stub is planted in
// Node's require cache (see TitleBar.test.ts).
import { createRequire } from 'module';
import { mount, flushPromises } from '@vue/test-utils';
import { initialUpdateState } from '../../utilities/update-decisions';

const nodeRequire = createRequire(import.meta.url);

const store: Record<string, unknown> = {
	screenshotKeybind: 'Control+PrintScreen',
	screenshotFolder: 'C:\\Shots\\',
	reshadeFile: '',
	outputFormat: 'jpeg',
	locale: 'en',
};
const configSet = vi.fn((key: string, value: unknown) => {
	store[key] = value;
});
vi.mock('../../utilities/config', () => ({
	default: {
		get: (key: string) => store[key],
		set: (key: string, value: unknown) => configSet(key, value),
	},
}));

const live = new Map<string, Set<unknown>>();
let invokeResult: unknown = null;
const invoke = vi.fn((channel: string) =>
	Promise.resolve(
		channel === 'update:state'
			? { ...initialUpdateState(), busy: false, currentVersion: '0.0.0' }
			: invokeResult
	)
);
const rebinds = () =>
	invoke.mock.calls.filter(
		([channel]) => channel === 'screenshotKeybind-change'
	);
const ipcRendererStub = {
	on(channel: string, handler: unknown) {
		if (!live.has(channel)) live.set(channel, new Set());
		live.get(channel).add(handler);
	},
	removeListener(channel: string, handler: unknown) {
		live.get(channel)?.delete(handler);
	},
	send: vi.fn(),
	sendSync: () => ({ supported: true }),
	invoke,
};
const electronId = nodeRequire.resolve('electron');
nodeRequire.cache[electronId] = {
	id: electronId,
	filename: electronId,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub, shell: {} },
} as unknown as NodeModule;

const { default: SettingsModal } = await import('./SettingsModal.vue');
const { i18n } = await import('../i18n');

// The slice of the component instance these tests drive.
interface SettingsVm {
	bindScreenshotKeybind(): void;
	screenshotKeybind: string;
	bindingKey: boolean;
	keybindNotice: string | null;
}
const vmOf = (wrapper: { vm: unknown }) => wrapper.vm as SettingsVm;

function mountSettings() {
	return mount(SettingsModal, {
		global: {
			plugins: [i18n],
			stubs: {
				'o-field': true,
				'o-select': true,
				'o-input': true,
				'o-button': true,
				'o-switch': true,
				'o-tag': true,
			},
		},
	});
}

function key(
	type: 'keydown' | 'keyup',
	init: { key: string; code: string; ctrlKey?: boolean; shiftKey?: boolean }
) {
	window.dispatchEvent(new KeyboardEvent(type, init));
}

const liveCount = () =>
	[...live.values()].reduce((n, handlers) => n + handlers.size, 0);

beforeEach(() => {
	live.clear();
	invoke.mockClear();
	configSet.mockClear();
	store.screenshotKeybind = 'Control+PrintScreen';
	invokeResult = null;
});

describe('Settings listener hygiene', () => {
	// Regression: each visit left four ipcRenderer listeners behind.
	test('removes every ipcRenderer listener it added when it unmounts', () => {
		for (let visit = 0; visit < 3; visit += 1) {
			mountSettings().unmount();
		}
		expect(liveCount()).toBe(0);
	});

	// Regression: the capture's window listeners outlived the page, so the next
	// shortcut typed anywhere (Ctrl+C on Home) became the global hotkey.
	test('a key capture left running stops when the page unmounts', async () => {
		const wrapper = mountSettings();
		vmOf(wrapper).bindScreenshotKeybind();
		wrapper.unmount();

		key('keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true });
		key('keydown', { key: 'c', code: 'KeyC', ctrlKey: true });
		key('keyup', { key: 'c', code: 'KeyC', ctrlKey: true });
		key('keyup', { key: 'Control', code: 'ControlLeft' });
		await flushPromises();
		expect(rebinds()).toEqual([]);
		expect(ipcRendererStub.send).not.toHaveBeenCalledWith(
			'screenshotKeybind-change',
			expect.anything()
		);
		expect(configSet).not.toHaveBeenCalledWith(
			'screenshotKeybind',
			expect.anything()
		);
	});
});

describe('Settings hotkey capture', () => {
	test('asks main to bind the combination and shows what main registered', async () => {
		invokeResult = { ok: true, accelerator: 'Control+Up' };
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();

		key('keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true });
		expect(vm.screenshotKeybind).toBe('Control');
		key('keydown', { key: 'ArrowUp', code: 'ArrowUp', ctrlKey: true });
		await flushPromises();

		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Control+Up' }],
		]);
		expect(vm.screenshotKeybind).toBe('Control+Up');
		expect(vm.bindingKey).toBe(false);
		expect(vm.keybindNotice).toBeNull();
		// Main persists it; the renderer no longer writes a value main may
		// have refused.
		expect(configSet).not.toHaveBeenCalledWith(
			'screenshotKeybind',
			expect.anything()
		);
		wrapper.unmount();
	});

	test('PrintScreen, which Windows reports only on release, completes the capture', async () => {
		invokeResult = { ok: true, accelerator: 'Control+PrintScreen' };
		const wrapper = mountSettings();
		vmOf(wrapper).bindScreenshotKeybind();
		key('keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true });
		key('keyup', { key: 'PrintScreen', code: 'PrintScreen', ctrlKey: true });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Control+PrintScreen' }],
		]);
		wrapper.unmount();
	});

	test('a refused binding reverts to the hotkey still in force and says why', async () => {
		invokeResult = {
			ok: false,
			accelerator: 'Control+PrintScreen',
			reason: 'already registered by another application',
		};
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', { key: 'F12', code: 'F12' });
		await flushPromises();

		expect(vm.screenshotKeybind).toBe('Control+PrintScreen');
		expect(vm.keybindNotice).toContain('F12');
		expect(vm.keybindNotice).toContain('Control+PrintScreen');
		wrapper.unmount();
	});

	test('Escape cancels without asking main for anything', async () => {
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true });
		key('keyup', { key: 'Shift', code: 'ShiftLeft' });
		key('keydown', { key: 'Escape', code: 'Escape' });
		await flushPromises();

		expect(rebinds()).toEqual([]);
		expect(vm.screenshotKeybind).toBe('Control+PrintScreen');
		expect(vm.bindingKey).toBe(false);
		wrapper.unmount();
	});

	test('a key no accelerator can name is refused locally', async () => {
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', { key: 'ContextMenu', code: 'ContextMenu' });
		await flushPromises();

		expect(rebinds()).toEqual([]);
		expect(vm.screenshotKeybind).toBe('Control+PrintScreen');
		expect(vm.keybindNotice).toContain('ContextMenu');
		wrapper.unmount();
	});
});
