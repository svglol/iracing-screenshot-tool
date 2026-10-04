// @vitest-environment happy-dom
//
// The panel's notice list. Exercised through the `notices` computed with a stub
// `this` rather than a full mount: the bug pinned here lives entirely in how that
// computed assembles its list, and a mount would drag in the availability poll, the
// preview IPC and the config store for nothing.
//
// NOTE ON THE ELECTRON STUB: the panel resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach, so the stub is planted in
// Node's require cache — the same approach TitleBar.test.ts documents.
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);

vi.mock('@oruga-ui/oruga-next', () => ({
	useOruga: () => ({ notification: { open: vi.fn() } }),
}));
vi.mock('../../utilities/config', () => ({
	default: { get: () => undefined, set: vi.fn() },
}));

const id = nodeRequire.resolve('electron');
nodeRequire.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: { ipcRenderer: { invoke: vi.fn(), on: vi.fn(), send: vi.fn() } },
} as unknown as NodeModule;

const { default: LongExposurePanel } = await import('./LongExposurePanel.vue');

type Notice = { level: string; text: string };
const notices = (
	LongExposurePanel as unknown as {
		computed: { notices(this: unknown): Notice[] };
	}
).computed.notices;

const SINGLE_SAMPLE =
	'This shutter is short enough that only about one frame lands inside it per pass, so 8 passes collect roughly 8 samples.';
const LONG_CAPTURE =
	'This capture runs the replay at 1/16 speed for about 30 seconds of real time across 8 passes over the same moment, and cannot be hurried once started.';

// State after a completed shot whose settings are still on screen: the live
// pre-flight and the last capture's outcome carry the same validatePlan warnings.
function panelAfterShot(disableTooltips: boolean) {
	return {
		needsNativeCapture: false,
		available: true,
		hasReplayData: true,
		previewErrors: [],
		previewWarnings: [SINGLE_SAMPLE, LONG_CAPTURE],
		lastResult: {
			ok: true,
			message: null,
			warnings: [SINGLE_SAMPLE, LONG_CAPTURE],
		},
		lastResultIsCurrent: true,
		disableTooltips,
		passes: 8,
		reshade: false,
		$t: (key: string) => key,
	};
}

describe('LongExposurePanel notices', () => {
	test('shows each plan warning once after a shot', () => {
		const texts = notices.call(panelAfterShot(false)).map((n) => n.text);
		expect(texts.filter((t) => t === SINGLE_SAMPLE)).toHaveLength(1);
		expect(texts.filter((t) => t === LONG_CAPTURE)).toHaveLength(1);
	});

	// The field report: with tooltips disabled an early return skipped the dedupe,
	// so every plan warning rendered twice.
	test('still dedupes with tooltips disabled', () => {
		const list = notices.call(panelAfterShot(true));
		expect(list.map((n) => n.text)).toEqual([SINGLE_SAMPLE, LONG_CAPTURE]);
	});

	test('drops only the tips when tooltips are disabled', () => {
		const withTips = notices.call(panelAfterShot(false)).map((n) => n.text);
		const without = notices.call(panelAfterShot(true)).map((n) => n.text);
		expect(withTips).toContain('longExposure.notices.passes');
		expect(without).not.toContain('longExposure.notices.passes');
	});
});
