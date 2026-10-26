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
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
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
	bindScreenshotKeybind(trigger?: Event): void;
	screenshotKeybind: string;
	bindingKey: boolean;
	keybindNotice: string | null;
}
const vmOf = (wrapper: { vm: unknown }) => wrapper.vm as SettingsVm;

const mounted: VueWrapper[] = [];
function mountSettings() {
	const wrapper = mount(SettingsModal, {
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
	mounted.push(wrapper);
	return wrapper;
}

// keyCode is the Windows virtual key — what the capture maps to a token.
function key(
	type: 'keydown' | 'keyup',
	init: {
		key: string;
		code: string;
		keyCode: number;
		ctrlKey?: boolean;
		altKey?: boolean;
		shiftKey?: boolean;
	}
) {
	window.dispatchEvent(new KeyboardEvent(type, init));
}

const liveCount = () =>
	[...live.values()].reduce((n, handlers) => n + handlers.size, 0);

// A test that fails before its own unmount would leave its key capture
// listening on window, and the tests after it would fail on its account.
afterEach(() => {
	for (const wrapper of mounted.splice(0)) {
		if (!wrapper.vm.$.isUnmounted) {
			wrapper.unmount();
		}
	}
});

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

		key('keydown', {
			key: 'Control',
			code: 'ControlLeft',
			keyCode: 17,
			ctrlKey: true,
		});
		key('keydown', { key: 'c', code: 'KeyC', keyCode: 67, ctrlKey: true });
		key('keyup', { key: 'c', code: 'KeyC', keyCode: 67, ctrlKey: true });
		key('keyup', { key: 'Control', code: 'ControlLeft', keyCode: 17 });
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

		key('keydown', {
			key: 'Control',
			code: 'ControlLeft',
			keyCode: 17,
			ctrlKey: true,
		});
		expect(vm.screenshotKeybind).toBe('Control');
		key('keydown', {
			key: 'ArrowUp',
			code: 'ArrowUp',
			keyCode: 38,
			ctrlKey: true,
		});
		await flushPromises();

		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Control+Up' }],
		]);
		expect(vm.screenshotKeybind).toBe('Control+Up');
		expect(vm.bindingKey).toBe(false);
		expect(vm.keybindNotice).toBeNull();
		// The finished capture stopped listening: a later click or blur does
		// not abandon it after the fact.
		window.dispatchEvent(new Event('pointerdown'));
		window.dispatchEvent(new Event('blur'));
		expect(vm.screenshotKeybind).toBe('Control+Up');
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
		key('keydown', {
			key: 'Control',
			code: 'ControlLeft',
			keyCode: 17,
			ctrlKey: true,
		});
		key('keyup', {
			key: 'PrintScreen',
			code: 'PrintScreen',
			keyCode: 44,
			ctrlKey: true,
		});
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
		key('keydown', { key: 'F12', code: 'F12', keyCode: 123 });
		await flushPromises();

		expect(vm.screenshotKeybind).toBe('Control+PrintScreen');
		expect(vm.keybindNotice).toContain('F12');
		expect(vm.keybindNotice).toContain('Control+PrintScreen');
		wrapper.unmount();
	});

	// PrintScreen arrives only on release, and Ctrl may be released first.
	test('PrintScreen released after Ctrl still binds Ctrl+PrintScreen', async () => {
		invokeResult = { ok: true, accelerator: 'Control+PrintScreen' };
		const wrapper = mountSettings();
		vmOf(wrapper).bindScreenshotKeybind();
		key('keydown', {
			key: 'Control',
			code: 'ControlLeft',
			keyCode: 17,
			ctrlKey: true,
		});
		key('keyup', { key: 'Control', code: 'ControlLeft', keyCode: 17 });
		key('keyup', { key: 'PrintScreen', code: 'PrintScreen', keyCode: 44 });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Control+PrintScreen' }],
		]);
		wrapper.unmount();
	});

	// Regression: Oruga's button emits its click during the Enter keydown that
	// activates it, and the capture's window listener then received that same
	// keydown — binding bare Enter as a system-wide hotkey.
	test('the keystroke that pressed the Edit Bind button is not captured', async () => {
		invokeResult = { ok: true, accelerator: 'F12' };
		const wrapper = mountSettings();
		const activation = new KeyboardEvent('keydown', {
			key: 'Enter',
			code: 'Enter',
			keyCode: 13,
		});
		vmOf(wrapper).bindScreenshotKeybind(activation);
		window.dispatchEvent(activation);
		key('keyup', { key: 'Enter', code: 'Enter', keyCode: 13 });
		await flushPromises();
		expect(rebinds()).toEqual([]);
		expect(vmOf(wrapper).bindingKey).toBe(true);

		key('keydown', { key: 'F12', code: 'F12', keyCode: 123 });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'F12' }],
		]);
		wrapper.unmount();
	});

	// Regression: every modifier pressed during the capture was kept, so one let
	// go long before a bare PrintScreen (an Alt+Tab, AltGr's Ctrl+Alt) was bound
	// into it.
	test('a modifier released long before PrintScreen is not part of it', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			invokeResult = { ok: true, accelerator: 'PrintScreen' };
			const wrapper = mountSettings();
			vmOf(wrapper).bindScreenshotKeybind();
			key('keydown', {
				key: 'Control',
				code: 'ControlLeft',
				keyCode: 17,
				ctrlKey: true,
			});
			key('keyup', { key: 'Control', code: 'ControlLeft', keyCode: 17 });
			vi.setSystemTime(Date.now() + 2000);
			key('keyup', { key: 'PrintScreen', code: 'PrintScreen', keyCode: 44 });
			await flushPromises();
			expect(rebinds()).toEqual([
				['screenshotKeybind-change', { newValue: 'PrintScreen' }],
			]);
			wrapper.unmount();
		} finally {
			vi.useRealTimers();
		}
	});

	// Regression: RegisterHotKey keeps the keydown of a combination another
	// application holds (Alt+F1 for a GPU overlay) from the page, which sees only
	// the release. That release was dropped, so nothing was bound, nothing was
	// said, and the capture stayed armed — the next key typed in Settings (a
	// digit in the width field) became the system-wide hotkey.
	test('a combination another application holds is refused, not left armed', async () => {
		invokeResult = {
			ok: false,
			accelerator: 'Control+PrintScreen',
			reason: 'already registered by another application',
		};
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', {
			key: 'Alt',
			code: 'AltLeft',
			keyCode: 18,
			altKey: true,
		});
		key('keyup', { key: 'F1', code: 'F1', keyCode: 112, altKey: true });
		await flushPromises();

		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Alt+F1' }],
		]);
		expect(vm.bindingKey).toBe(false);
		expect(vm.keybindNotice).toContain('Alt+F1');

		key('keydown', { key: '3', code: 'Digit3', keyCode: 51 });
		await flushPromises();
		expect(rebinds()).toHaveLength(1);
		wrapper.unmount();
	});

	// The same press with Alt let go before F1.
	test('a held combination released modifier-first still names the modifier', async () => {
		invokeResult = { ok: true, accelerator: 'Alt+F1' };
		const wrapper = mountSettings();
		vmOf(wrapper).bindScreenshotKeybind();
		key('keydown', {
			key: 'Alt',
			code: 'AltLeft',
			keyCode: 18,
			altKey: true,
		});
		key('keyup', { key: 'Alt', code: 'AltLeft', keyCode: 18 });
		key('keyup', { key: 'F1', code: 'F1', keyCode: 112 });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Alt+F1' }],
		]);
		wrapper.unmount();
	});

	// AltGr is a synthetic Control plus the right Alt reported as 'AltGraph', and
	// Windows matches it as Ctrl+Alt. Only the Control release used to count, so
	// AltGr let go before PrintScreen bound Control+PrintScreen, which AltGr
	// never fires.
	test('AltGr let go before PrintScreen binds Ctrl+Alt, as Windows matches it', async () => {
		invokeResult = { ok: true, accelerator: 'Control+Alt+PrintScreen' };
		const wrapper = mountSettings();
		vmOf(wrapper).bindScreenshotKeybind();
		const altGr = { ctrlKey: true, altKey: true };
		key('keydown', {
			key: 'Control',
			code: 'ControlLeft',
			keyCode: 17,
			...altGr,
		});
		key('keydown', {
			key: 'AltGraph',
			code: 'AltRight',
			keyCode: 18,
			...altGr,
		});
		key('keyup', { key: 'AltGraph', code: 'AltRight', keyCode: 18 });
		key('keyup', { key: 'Control', code: 'ControlLeft', keyCode: 17 });
		key('keyup', { key: 'PrintScreen', code: 'PrintScreen', keyCode: 44 });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'Control+Alt+PrintScreen' }],
		]);
		wrapper.unmount();
	});

	// Regression: every release whose press the page never saw completed the
	// capture, including a key pressed before it began. Tab still held as Enter
	// pressed Edit Bind bound bare Tab, taking it from every application.
	test('a key held when the capture began is not bound when let go', async () => {
		invokeResult = { ok: true, accelerator: 'F9' };
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		key('keydown', { key: 'Tab', code: 'Tab', keyCode: 9 });
		const activation = new KeyboardEvent('keydown', {
			key: 'Enter',
			code: 'Enter',
			keyCode: 13,
		});
		vm.bindScreenshotKeybind(activation);
		window.dispatchEvent(activation);
		key('keyup', { key: 'Tab', code: 'Tab', keyCode: 9 });
		key('keyup', { key: 'Enter', code: 'Enter', keyCode: 13 });
		await flushPromises();
		expect(rebinds()).toEqual([]);
		expect(vm.bindingKey).toBe(true);

		key('keydown', { key: 'F9', code: 'F9', keyCode: 120 });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'F9' }],
		]);
		wrapper.unmount();
	});

	// The Enter that closes a native folder dialog, or a Tab let go after
	// Alt+Tab back into the app, arrives as a release alone.
	test('a release whose press went to another window is not bound', async () => {
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keyup', { key: 'Enter', code: 'Enter', keyCode: 13 });
		key('keyup', { key: 'Alt', code: 'AltLeft', keyCode: 18 });
		key('keyup', { key: 'Tab', code: 'Tab', keyCode: 9 });
		key('keyup', { key: 'F4', code: 'F4', keyCode: 115, altKey: true });
		key('keyup', { key: 'Escape', code: 'Escape', keyCode: 27 });
		await flushPromises();
		expect(rebinds()).toEqual([]);
		expect(vm.bindingKey).toBe(true);
		wrapper.unmount();
	});

	// Its registration takes the keydown of this app's own hotkey too.
	test('pressing the current hotkey ends the capture by keeping it', async () => {
		store.screenshotKeybind = 'F9';
		invokeResult = { ok: true, accelerator: 'F9' };
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keyup', { key: 'F9', code: 'F9', keyCode: 120 });
		await flushPromises();
		expect(rebinds()).toEqual([
			['screenshotKeybind-change', { newValue: 'F9' }],
		]);
		expect(vm.bindingKey).toBe(false);
		wrapper.unmount();
	});

	test('a click anywhere, or leaving the window, abandons the capture', async () => {
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', {
			key: 'Control',
			code: 'ControlLeft',
			keyCode: 17,
			ctrlKey: true,
		});
		expect(vm.screenshotKeybind).toBe('Control');
		window.dispatchEvent(new Event('pointerdown'));
		expect(vm.bindingKey).toBe(false);
		expect(vm.screenshotKeybind).toBe('Control+PrintScreen');

		vm.bindScreenshotKeybind();
		window.dispatchEvent(new Event('blur'));
		expect(vm.bindingKey).toBe(false);
		key('keydown', { key: 'F12', code: 'F12', keyCode: 123 });
		await flushPromises();
		expect(rebinds()).toEqual([]);
		wrapper.unmount();
	});

	test('a refusal that leaves no hotkey registered says so', async () => {
		invokeResult = {
			ok: false,
			accelerator: null,
			reason: 'already registered by another application',
		};
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', { key: 'F12', code: 'F12', keyCode: 123 });
		await flushPromises();
		expect(vm.keybindNotice).toContain('F12');
		expect(vm.keybindNotice).toContain('No screenshot keybind is active');
		expect(vm.keybindNotice).not.toContain('still active');
		wrapper.unmount();
	});

	test('Escape cancels without asking main for anything', async () => {
		const wrapper = mountSettings();
		const vm = vmOf(wrapper);
		vm.bindScreenshotKeybind();
		key('keydown', {
			key: 'Shift',
			code: 'ShiftLeft',
			keyCode: 16,
			shiftKey: true,
		});
		key('keyup', { key: 'Shift', code: 'ShiftLeft', keyCode: 16 });
		key('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 });
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
		key('keydown', { key: 'ContextMenu', code: 'ContextMenu', keyCode: 93 });
		await flushPromises();

		expect(rebinds()).toEqual([]);
		expect(vm.screenshotKeybind).toBe('Control+PrintScreen');
		expect(vm.keybindNotice).toContain('ContextMenu');
		wrapper.unmount();
	});
});
