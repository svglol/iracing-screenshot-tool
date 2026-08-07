// @vitest-environment happy-dom
//
// Component tests for the title-bar update affordance, on the harness
// renderer-harness.test.ts established. The behaviours locked here are the ones the
// old implementation got wrong: it listened for a single fire-and-forget
// 'update-available' send (so a renderer that mounted late never learned about a
// ready update), rendered an unlabelled green arrow, and quit the app on one click
// through a channel that asked main nothing.
//
// NOTE ON THE ELECTRON STUB: TitleBar.vue resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach (it only intercepts the
// transformed import graph) — so the stub is planted in Node's require cache, the
// same approach logger.integration.test.ts documents.
import { createRequire } from 'module';
import { mount, flushPromises } from '@vue/test-utils';

const nodeRequire = createRequire(import.meta.url);

const notificationOpen = vi.fn();
vi.mock('@oruga-ui/oruga-next', () => ({
	useOruga: () => ({ notification: { open: notificationOpen } }),
}));

// Set per test before mounting; the stub reads them lazily.
let invokeResults: Record<string, unknown> = {};
const invoked: Array<{ channel: string; args: unknown[] }> = [];
const listeners = new Map<string, (...args: unknown[]) => void>();
const removed: string[] = [];

const ipcRendererStub = {
	on(channel: string, handler: (...args: unknown[]) => void) {
		listeners.set(channel, handler);
	},
	removeListener(channel: string) {
		removed.push(channel);
		listeners.delete(channel);
	},
	send: vi.fn(),
	sendSync: vi.fn(),
	invoke(channel: string, ...args: unknown[]) {
		invoked.push({ channel, args });
		if (!(channel in invokeResults)) {
			return Promise.reject(new Error(`no stub for ${channel}`));
		}
		return Promise.resolve(invokeResults[channel]);
	},
};

const id = nodeRequire.resolve('electron');
nodeRequire.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub },
} as unknown as NodeModule;

// Imported AFTER the stub is planted — the component captures ipcRenderer at module
// scope, so a later install would be too late.
const { default: TitleBar } = await import('./TitleBar.vue');

function state(patch: Record<string, unknown> = {}) {
	return {
		phase: 'idle',
		version: null,
		percent: null,
		error: null,
		checkedAt: null,
		busy: false,
		currentVersion: '3.2.2',
		...patch,
	};
}

function mountBar() {
	return mount(TitleBar, {
		props: { title: 'iRacing Screenshot Tool', ico: 'icon.png' },
		global: { stubs: { 'font-awesome-icon': true } },
	});
}

beforeEach(() => {
	invokeResults = {};
	invoked.length = 0;
	removed.length = 0;
	listeners.clear();
	notificationOpen.mockClear();
});

describe('TitleBar update affordance', () => {
	test('asks main for the state on mount instead of only listening', async () => {
		invokeResults = { 'update:state': state() };
		mountBar();
		await flushPromises();

		expect(invoked.map((c) => c.channel)).toContain('update:state');
		expect(listeners.has('update:state')).toBe(true);
	});

	// The regression that made the old notification missable: the download finishes
	// before this component exists, so nothing is ever broadcast to it.
	test('shows an update that was already downloaded before it mounted', async () => {
		invokeResults = {
			'update:state': state({ phase: 'downloaded', version: '3.3.0' }),
		};
		const wrapper = mountBar();
		await flushPromises();

		const button = wrapper.find('.update-button');
		expect(button.exists()).toBe(true);
		expect(button.attributes('title')).toContain('v3.3.0');
		expect(button.attributes('title')).toMatch(/restart and install/i);
	});

	test('stays hidden when there is nothing to act on', async () => {
		invokeResults = { 'update:state': state({ checkedAt: 1 }) };
		const wrapper = mountBar();
		await flushPromises();

		expect(wrapper.find('.update-button').exists()).toBe(false);
	});

	test('survives main not answering the query yet', async () => {
		// No stub for update:state — the invoke rejects.
		const wrapper = mountBar();
		await flushPromises();

		expect(wrapper.find('.update-button').exists()).toBe(false);
		expect(wrapper.find('.titlebar').exists()).toBe(true);
	});

	test('renders a broadcast that arrives after mount', async () => {
		invokeResults = { 'update:state': state({ checkedAt: 1 }) };
		const wrapper = mountBar();
		await flushPromises();

		listeners.get('update:state')?.(
			{},
			state({ phase: 'available', version: '3.3.0' })
		);
		await flushPromises();

		const button = wrapper.find('.update-button');
		expect(button.exists()).toBe(true);
		expect(button.attributes('title')).toMatch(/click to download/i);
		// The label is also the accessible name — an icon-only control needs one.
		expect(button.attributes('aria-label')).toBe(button.attributes('title'));
	});

	test('shows download percent while the transfer runs', async () => {
		invokeResults = {
			'update:state': state({
				phase: 'downloading',
				version: '3.3.0',
				percent: 62,
			}),
		};
		const wrapper = mountBar();
		await flushPromises();

		expect(wrapper.find('.update-percent').text()).toBe('62%');
		expect(wrapper.find('.update-button').attributes('title')).toContain(
			'62%'
		);
	});

	test('an available update asks main to download, not to install', async () => {
		invokeResults = {
			'update:state': state({ phase: 'available', version: '3.3.0' }),
			'update:download': { ok: true, reason: null, state: state({}) },
		};
		const wrapper = mountBar();
		await flushPromises();

		await wrapper.find('.update-button').trigger('click');
		await flushPromises();

		expect(invoked.map((c) => c.channel)).toContain('update:download');
		expect(invoked.map((c) => c.channel)).not.toContain('update:install');
	});

	test('a downloaded update asks main to install', async () => {
		invokeResults = {
			'update:state': state({ phase: 'downloaded', version: '3.3.0' }),
			'update:install': { ok: true, reason: null, state: state({}) },
		};
		const wrapper = mountBar();
		await flushPromises();

		await wrapper.find('.update-button').trigger('click');
		await flushPromises();

		expect(invoked.map((c) => c.channel)).toContain('update:install');
	});

	test('surfaces a refusal reason and stays put', async () => {
		const refused = state({
			phase: 'downloaded',
			version: '3.3.0',
			busy: true,
		});
		invokeResults = {
			'update:state': refused,
			'update:install': {
				ok: false,
				reason:
					'A capture is in progress. The update will install by itself when you close the app.',
				state: refused,
			},
		};
		const wrapper = mountBar();
		await flushPromises();

		await wrapper.find('.update-button').trigger('click');
		await flushPromises();

		expect(notificationOpen).toHaveBeenCalledTimes(1);
		expect(notificationOpen.mock.calls[0][0].message).toMatch(
			/close the app/i
		);
		// Still offered — a refusal is not a dismissal.
		expect(wrapper.find('.update-button').exists()).toBe(true);
	});

	// Declining the confirmation dialog comes back ok:false with no reason, and a
	// toast repeating a choice the user just made would be noise.
	test('says nothing when the user declines the install dialog', async () => {
		const downloaded = state({ phase: 'downloaded', version: '3.3.0' });
		invokeResults = {
			'update:state': downloaded,
			'update:install': { ok: false, reason: null, state: downloaded },
		};
		const wrapper = mountBar();
		await flushPromises();

		await wrapper.find('.update-button').trigger('click');
		await flushPromises();

		expect(notificationOpen).not.toHaveBeenCalled();
	});

	test('removes its listener on unmount', async () => {
		invokeResults = { 'update:state': state() };
		const wrapper = mountBar();
		await flushPromises();

		wrapper.unmount();
		expect(removed).toContain('update:state');
	});
});
