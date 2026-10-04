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

// The Weighting segmented control. Each button's glyph is sampled from weightAt,
// so these pin the shapes the user picks between rather than any pixel layout.
describe('LongExposurePanel weighting options', () => {
	const weightingOptions = (
		LongExposurePanel as unknown as {
			computed: {
				weightingOptions(this: unknown): {
					value: string;
					label: string;
					title: string;
					points: string;
				}[];
			};
		}
	).computed.weightingOptions;
	const options = weightingOptions.call({ $t: (key: string) => key });
	// SVG y grows downward, so a heavier weight is a SMALLER y.
	const ys = (points: string) =>
		points.split(' ').map((p) => Number(p.split(',')[1]));
	const byValue = (value: string) => options.find((o) => o.value === value)!;

	test('offers box, linear and ease in that order', () => {
		expect(options.map((o) => o.value)).toEqual(['box', 'linear', 'ease']);
	});

	test('labels the button short and keeps the full name as its tooltip', () => {
		expect(byValue('linear').label).toBe('longExposure.weightingLinearShort');
		expect(byValue('linear').title).toBe('longExposure.weightingLinear');
	});

	test('box is a flat line', () => {
		expect(new Set(ys(byValue('box').points)).size).toBe(1);
	});

	test('linear and ease both rise to full weight at the anchor', () => {
		for (const value of ['linear', 'ease']) {
			const y = ys(byValue(value).points);
			expect(y[y.length - 1]).toBe(ys(byValue('box').points)[0]);
			expect(y[0]).toBeGreaterThan(y[y.length - 1]);
		}
	});

	test('ease sits under linear mid-window, i.e. it curves', () => {
		const lin = ys(byValue('linear').points);
		const ease = ys(byValue('ease').points);
		const mid = Math.floor(lin.length / 2);
		expect(ease[mid]).toBeGreaterThan(lin[mid]);
	});
});

describe('LongExposurePanel passes options', () => {
	const passOptions = (
		LongExposurePanel as unknown as {
			computed: {
				passOptions(this: unknown): {
					value: number;
					label: string;
					title: string;
				}[];
			};
		}
	).computed.passOptions;
	const options = passOptions.call({ $t: (key: string) => key });

	test('offers 1×, 2×, 4× and 8× as numbers', () => {
		expect(options.map((o) => o.value)).toEqual([1, 2, 4, 8]);
		expect(options.map((o) => o.label)).toEqual(['1×', '2×', '4×', '8×']);
	});

	// The wait each choice costs must stay discoverable now the button only
	// carries the multiplier.
	test('keeps the full label, which names the wait, as the tooltip', () => {
		expect(options.map((o) => o.title)).toEqual([
			'longExposure.passes1',
			'longExposure.passes2',
			'longExposure.passes4',
			'longExposure.passes8',
		]);
	});
});

describe('LongExposurePanel warm-up readout', () => {
	const computed = (
		LongExposurePanel as unknown as {
			computed: {
				warmUpReadout(this: unknown): string;
				warmUpSpoken(this: unknown): string;
			};
		}
	).computed;
	const $t = (key: string, params?: Record<string, unknown>) =>
		params ? `${key}:${JSON.stringify(params)}` : key;
	const at = (warmUpSeconds: number) => {
		const self = { warmUpSeconds, $t } as Record<string, unknown>;
		self.warmUpReadout = computed.warmUpReadout.call(self);
		return {
			readout: self.warmUpReadout as string,
			spoken: computed.warmUpSpoken.call(self),
		};
	};

	test('reads Off at zero', () => {
		expect(at(0)).toEqual({
			readout: 'longExposure.warmUpOff',
			spoken: 'longExposure.warmUpOff',
		});
	});

	test('shows bare seconds, and speaks the noted label where one exists', () => {
		expect(at(3).readout).toBe('longExposure.warmUpValue:{"seconds":3}');
		expect(at(3).spoken).toBe('longExposure.warmUp3');
		expect(at(5).spoken).toBe('longExposure.warmUp5');
	});

	test('speaks the bare seconds for the stops the old presets skipped', () => {
		expect(at(2).spoken).toBe('longExposure.warmUpValue:{"seconds":2}');
		expect(at(4).spoken).toBe('longExposure.warmUpValue:{"seconds":4}');
	});
});
