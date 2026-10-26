// @vitest-environment happy-dom
//
// The sidebar's projection warning (from iRacing's rendererDX11Monitor.ini).
// The sidebar lives in the kept-alive Home and is never remounted, so whatever
// it reads once is what the user sees for the rest of the session.
//
// The ini check itself is mocked — what is under test is WHEN the sidebar asks
// it. NOTE ON THE ELECTRON STUB: SideBar resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach, so the stub is planted in
// Node's require cache (see TitleBar.test.ts).
import { createRequire } from 'module';
import { mount, flushPromises } from '@vue/test-utils';
import { INI_CHANGED_EVENT } from '../ini-events';

const nodeRequire = createRequire(import.meta.url);

const iniState = vi.hoisted(() => ({ projections: true, reads: 0 }));
vi.mock('../../utilities/iracing-config-checks', () => ({
	checkIracingConfig: () => {
		iniState.reads += 1;
		return iniState.projections ? ['Projections are per-monitor'] : [];
	},
}));

const configListeners = vi.hoisted(
	() => new Map<string, (value: unknown) => void>()
);
vi.mock('../../utilities/config', () => ({
	default: {
		get: (key: string) =>
			({ resolution: '1080p', crop: false, iracingFolder: '' })[key],
		set: vi.fn(),
		onDidChange: (key: string, callback: (value: unknown) => void) => {
			configListeners.set(key, callback);
			return () => configListeners.delete(key);
		},
	},
}));
vi.mock('@oruga-ui/oruga-next', () => ({
	useOruga: () => ({ notification: { open: vi.fn() } }),
}));

const ipcListeners = new Map<string, (...args: unknown[]) => void>();
const electronId = nodeRequire.resolve('electron');
nodeRequire.cache[electronId] = {
	id: electronId,
	filename: electronId,
	loaded: true,
	exports: {
		ipcRenderer: {
			on: (channel: string, handler: (...args: unknown[]) => void) =>
				ipcListeners.set(channel, handler),
			removeListener: vi.fn(),
			send: vi.fn(),
			sendSync: vi.fn(),
			invoke: vi.fn(() => Promise.resolve(null)),
		},
	},
} as unknown as NodeModule;

const { default: SideBar } = await import('./SideBar.vue');
const { i18n } = await import('../i18n');

function mountSideBar() {
	return mount(SideBar, {
		global: {
			plugins: [i18n],
			stubs: {
				LongExposurePanel: true,
				NoticeCard: true,
				'o-field': true,
				'o-select': true,
				'o-input': true,
				'o-button': true,
				'o-switch': true,
				'o-tooltip': true,
				'o-icon': true,
			},
		},
	});
}

const warningsOf = (wrapper: { vm: unknown }) =>
	(wrapper.vm as { configWarnings: string[] }).configWarnings;

beforeEach(() => {
	vi.useFakeTimers();
	iniState.projections = true;
	iniState.reads = 0;
});
afterEach(() => {
	vi.useRealTimers();
});

describe('SideBar projection warning', () => {
	// Regression: read once in data(), so applying a graphics profile that fixed
	// the setting left the warning up for the rest of the session.
	test('re-reads the ini when a graphics profile is applied', async () => {
		const wrapper = mountSideBar();
		expect(warningsOf(wrapper)).toEqual(['Projections are per-monitor']);

		iniState.projections = false;
		window.dispatchEvent(new Event(INI_CHANGED_EVENT));
		await flushPromises();
		expect(warningsOf(wrapper)).toEqual([]);
		wrapper.unmount();
	});

	test('re-reads it when iRacing exits, which rewrites the ini', async () => {
		const wrapper = mountSideBar();
		iniState.projections = false;
		ipcListeners.get('iracing-disconnected')?.({});
		await flushPromises();
		expect(warningsOf(wrapper)).toEqual([]);
		wrapper.unmount();
	});

	test('re-reads it when the iRacing folder setting changes', async () => {
		const wrapper = mountSideBar();
		iniState.projections = false;
		configListeners.get('iracingFolder')?.('D:\\iRacing');
		await flushPromises();
		expect(warningsOf(wrapper)).toEqual([]);
		wrapper.unmount();
	});

	test('reads the disk once per change, not on every render', async () => {
		const wrapper = mountSideBar();
		warningsOf(wrapper);
		warningsOf(wrapper);
		const reads = iniState.reads;
		await vi.advanceTimersByTimeAsync(10_000); // several VRAM poll ticks
		warningsOf(wrapper);
		expect(iniState.reads).toBe(reads);
		wrapper.unmount();
	});

	test('stops listening for ini changes once unmounted', () => {
		const wrapper = mountSideBar();
		wrapper.unmount();
		const reads = iniState.reads;
		window.dispatchEvent(new Event(INI_CHANGED_EVENT));
		expect(iniState.reads).toBe(reads);
	});
});
