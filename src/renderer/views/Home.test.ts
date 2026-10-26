// @vitest-environment happy-dom
//
// Home's keyboard shortcuts (Delete deletes the selected screenshot, Ctrl+C
// copies it) are vue3-shortkey mappings, and its listeners are on the document:
// a mapped key fires wherever focus is, on whatever page is shown. Home is kept
// alive behind the other pages, so its mappings used to outlive it — Delete
// pressed in Settings, or typed in any text field, deleted the selected
// screenshot from disk without asking.
//
// Real Home, real vue3-shortkey installed with the app's options, real files in a
// temp folder. The Electron boundary, the settings store and Home's child
// components are stubbed.
//
// NOTE ON THE ELECTRON STUB: Home.vue resolves electron via a NATIVE
// `require('electron')`, which vi.mock cannot reach, so the stub is planted in
// Node's require cache — the approach TitleBar.test.ts documents.
import { createRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import sharp from 'sharp';
import VueShortkey from 'vue3-shortkey';
import { SHORTKEY_OPTIONS } from '../shortkey-options';

const nodeRequire = createRequire(import.meta.url);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'home-test-'));
const userData = path.join(tmpRoot, 'userData');
const shots = path.join(tmpRoot, 'shots');
fs.mkdirSync(userData, { recursive: true });
fs.mkdirSync(shots, { recursive: true });

const settings: Record<string, unknown> = {
	screenshotFolder: shots,
	firstTime: false,
	version: '',
};
vi.mock('../../utilities/config', () => ({
	default: {
		get: (key: string) => settings[key],
		set: vi.fn(),
		onDidChange: () => () => {},
	},
}));
vi.mock('@oruga-ui/oruga-next', () => ({
	useOruga: () => ({ notification: { open: vi.fn() } }),
}));

const electronId = nodeRequire.resolve('electron');
nodeRequire.cache[electronId] = {
	id: electronId,
	filename: electronId,
	loaded: true,
	exports: {
		ipcRenderer: {
			on: vi.fn(),
			removeListener: vi.fn(),
			send: vi.fn(),
			sendSync: (channel: string) =>
				channel === 'app:getPath-sync' ? userData : undefined,
			invoke: vi.fn(() => Promise.resolve(null)),
		},
		clipboard: { writeImage: vi.fn() },
		shell: { showItemInFolder: vi.fn(), openPath: vi.fn() },
		nativeImage: { createFromPath: vi.fn(() => ({})) },
	},
} as unknown as NodeModule;

vi.stubGlobal(
	'fetch',
	vi.fn(() => Promise.reject(new Error('offline')))
);

const { default: Home } = await import('./Home.vue');
const { i18n } = await import('../i18n');

const shotCount = () =>
	fs.readdirSync(shots).filter((name) => name.endsWith('.png')).length;

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
	for (const type of ['keydown', 'keyup']) {
		target.dispatchEvent(
			new KeyboardEvent(type, { key, bubbles: true, ...init })
		);
	}
}

// Home inside a KeepAlive, as App.vue has it. Swapping it for another page
// deactivates it, as navigating away does.
const page = ref<'home' | 'other'>('home');
const Host = defineComponent({
	setup: () => () =>
		h(KeepAlive, { include: 'Home' }, [
			page.value === 'home' ? h(Home) : h('p', 'another page'),
		]),
});

let wrapper: VueWrapper;
beforeEach(async () => {
	for (let index = 0; index < 3; index += 1) {
		await sharp({
			create: {
				width: 32,
				height: 18,
				channels: 3,
				background: { r: 60 * index, g: 90, b: 120 },
			},
		})
			.png()
			.toFile(path.join(shots, `shot${index}.png`));
	}
	page.value = 'home';
	wrapper = mount(Host, {
		attachTo: document.body,
		global: {
			plugins: [i18n, [VueShortkey, SHORTKEY_OPTIONS]],
			mocks: { $router: { push: vi.fn() } },
			stubs: {
				SideBar: true,
				PromoCard: true,
				ChangelogModal: true,
				'o-modal': true,
				'font-awesome-icon': true,
				'vue-simple-context-menu': true,
			},
		},
	});
	const home = wrapper.findComponent(Home).vm as unknown as {
		currentURL: string;
	};
	await vi.waitFor(() => expect(home.currentURL).not.toBe(''));
});
afterEach(() => {
	wrapper.unmount();
	fs.rmSync(shots, { recursive: true, force: true });
	fs.mkdirSync(shots, { recursive: true });
});
afterAll(() => {
	fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('Home keyboard shortcuts', () => {
	test('Delete on Home deletes the selected screenshot', async () => {
		press(document.body, 'Delete');
		await vi.waitFor(() => expect(shotCount()).toBe(2));
	});

	// Regression: Delete in the custom width field deleted the screenshot.
	test('Delete typed in a text field deletes nothing', async () => {
		const field = document.createElement('input');
		document.body.appendChild(field);
		field.focus();
		press(field, 'Delete');
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(shotCount()).toBe(3);
		field.remove();
	});

	// Delete does nothing in these controls, so the shortcut keeps working there.
	test('Delete with a select or a switch focused still deletes', async () => {
		const select = document.createElement('select');
		const toggle = document.createElement('input');
		toggle.type = 'checkbox';
		document.body.append(select, toggle);
		select.focus();
		press(select, 'Delete');
		await vi.waitFor(() => expect(shotCount()).toBe(2));
		// The file goes before Home moves its selection on; press again after.
		const home = wrapper.findComponent(Home).vm as unknown as {
			items: unknown[];
		};
		await vi.waitFor(() => expect(home.items).toHaveLength(2));
		toggle.focus();
		press(toggle, 'Delete');
		await vi.waitFor(() => expect(shotCount()).toBe(1));
		select.remove();
		toggle.remove();
	});

	// Regression: the Graphics Profiles dialog opens over Home, which stays
	// active behind it — Delete on a profile deleted the selected screenshot.
	test('Delete in a dialog over Home deletes nothing', async () => {
		const dialog = document.createElement('div');
		dialog.setAttribute('role', 'dialog');
		dialog.tabIndex = -1;
		const button = document.createElement('button');
		dialog.appendChild(button);
		document.body.appendChild(dialog);
		dialog.focus();
		press(dialog, 'Delete');
		button.focus();
		press(button, 'Delete');
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(shotCount()).toBe(3);
		dialog.remove();
	});

	// Regression: Delete pressed in Settings deleted the screenshot Home had
	// selected behind it.
	test('Delete on another page deletes nothing', async () => {
		page.value = 'other';
		await nextTick();
		press(document.body, 'Delete');
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(shotCount()).toBe(3);

		page.value = 'home';
		await nextTick();
		press(document.body, 'Delete');
		await vi.waitFor(() => expect(shotCount()).toBe(2));
	});
});
