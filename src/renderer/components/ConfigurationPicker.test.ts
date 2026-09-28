// @vitest-environment happy-dom
//
// The title-bar configuration picker: shows which stored profile the live
// config matches, opens the profiles dialog, and stays fresh when something
// else in the renderer rewrites the ini.
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import { createRequire } from 'module';
import { i18n } from '../i18n';
import { INI_CHANGED_EVENT } from '../ini-events';

const nodeRequire = createRequire(import.meta.url);

const notify = vi.fn();
vi.mock('@oruga-ui/oruga-next', () => ({
	useOruga: () => ({ notification: { open: notify } }),
}));

let snapshot: Record<string, unknown>;
let applyResult: Record<string, unknown>;
const ipcRendererStub = {
	invoke: vi.fn(async (channel: string) => {
		if (channel === 'profiles:list') {
			return snapshot;
		}
		if (channel === 'profiles:apply') {
			return applyResult;
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
		profiles: [
			{ name: 'Racing', valid: true },
			{ name: 'Screenshots', valid: true },
		],
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
	const wrapper = mount(ConfigurationPicker, {
		global,
		attachTo: document.body,
	});
	await flushPromises();
	return wrapper;
}

enableAutoUnmount(afterEach);

beforeEach(() => {
	snapshot = makeSnapshot();
	applyResult = { ok: true };
	ipcRendererStub.invoke.mockClear();
	notify.mockClear();
});

async function openMenu(wrapper: Awaited<ReturnType<typeof mountPicker>>) {
	await wrapper.find('.config-picker__toggle').trigger('click');
	await flushPromises();
}

const item = (wrapper: Awaited<ReturnType<typeof mountPicker>>, name: string) =>
	wrapper.find(`.config-picker__item[data-profile-name="${name}"]`);

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

	describe('quick switch', () => {
		test('the name opens a menu of the stored profiles, the live one checked', async () => {
			const wrapper = await mountPicker();
			expect(wrapper.find('[role="menu"]').exists()).toBe(false);
			await openMenu(wrapper);
			expect(wrapper.find('[role="menu"]').exists()).toBe(true);
			expect(item(wrapper, 'Racing').attributes('aria-checked')).toBe(
				'true'
			);
			expect(item(wrapper, 'Screenshots').attributes('aria-checked')).toBe(
				'false'
			);
		});

		test('the clean live profile is disabled, the others are not', async () => {
			// Loading the profile the config already matches would change nothing.
			const wrapper = await mountPicker();
			await openMenu(wrapper);
			expect(item(wrapper, 'Racing').attributes('disabled')).toBeDefined();
			expect(
				item(wrapper, 'Screenshots').attributes('disabled')
			).toBeUndefined();
		});

		test('a MODIFIED live profile stays loadable, to restore it', async () => {
			snapshot = makeSnapshot({
				active: { name: 'Racing', state: 'modified' },
				activeDifferences: 2,
			});
			const wrapper = await mountPicker();
			await openMenu(wrapper);
			expect(item(wrapper, 'Racing').attributes('disabled')).toBeUndefined();
		});

		test('every profile is disabled while iRacing runs, and the menu says why', async () => {
			snapshot = makeSnapshot({ iracingRunning: true });
			const wrapper = await mountPicker();
			await openMenu(wrapper);
			expect(
				item(wrapper, 'Screenshots').attributes('disabled')
			).toBeDefined();
			expect(
				wrapper.find('.config-picker__note.is-blocking').text()
			).toContain('Close iRacing before switching');
		});

		test('picking a profile loads it, confirms, closes and announces the change', async () => {
			const announced = vi.fn();
			window.addEventListener(INI_CHANGED_EVENT, announced);
			const wrapper = await mountPicker();
			await openMenu(wrapper);
			await item(wrapper, 'Screenshots').trigger('click');
			await flushPromises();

			expect(ipcRendererStub.invoke).toHaveBeenCalledWith(
				'profiles:apply',
				'Screenshots'
			);
			expect(notify).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'success',
					message:
						'Screenshots loaded. Start iRacing for it to take effect.',
				})
			);
			expect(wrapper.find('[role="menu"]').exists()).toBe(false);
			expect(announced).toHaveBeenCalled();
			window.removeEventListener(INI_CHANGED_EVENT, announced);
		});

		test('a refused load reports the reason and keeps the menu open', async () => {
			applyResult = { ok: false, error: 'iracingRunning' };
			const wrapper = await mountPicker();
			await openMenu(wrapper);
			await item(wrapper, 'Screenshots').trigger('click');
			await flushPromises();
			expect(notify).toHaveBeenCalledWith(
				expect.objectContaining({ variant: 'danger' })
			);
			expect(wrapper.find('[role="menu"]').exists()).toBe(true);
		});

		test('Escape and a press outside both close the menu', async () => {
			const wrapper = await mountPicker();
			await openMenu(wrapper);
			await wrapper
				.find('[role="menu"]')
				.trigger('keydown', { key: 'Escape' });
			expect(wrapper.find('[role="menu"]').exists()).toBe(false);

			await openMenu(wrapper);
			document.body.dispatchEvent(
				new MouseEvent('mousedown', { bubbles: true })
			);
			await flushPromises();
			expect(wrapper.find('[role="menu"]').exists()).toBe(false);
		});
	});
});
