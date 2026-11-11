// @vitest-environment happy-dom
//
// The capture-grid car picker. Mounted for real against a stubbed IPC surface:
// the failures this guards are silent ones — an unregistered component renders
// nothing, a missing key renders as the key — and the class checkbox's three
// states are exactly the kind of logic that is easy to get subtly wrong.
//
// NOTE ON THE ELECTRON STUB: the component resolves ipcRenderer via a NATIVE
// `require('electron')`, which vi.mock cannot reach, so the stub is planted in
// Node's require cache (same approach as GraphicsProfilesModal.test.ts).
import { createRequire } from 'module';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { i18n } from '../i18n';

const nodeRequire = createRequire(import.meta.url);

// The config store reaches for Electron's app paths on import. The panel only
// reads and writes its fold flag, so a plain stub is enough (undefined → folded).
vi.mock('../../utilities/config', () => ({
	default: { get: () => undefined, set: vi.fn() },
}));

let invokeResults: Record<string, unknown> = {};
const invoked: Array<{ channel: string; args: unknown[] }> = [];
const listeners = new Map<string, (...args: unknown[]) => void>();

const ipcRendererStub = {
	on(channel: string, handler: (...args: unknown[]) => void) {
		listeners.set(channel, handler);
	},
	removeListener(channel: string) {
		listeners.delete(channel);
	},
	send: vi.fn(),
	sendSync: vi.fn(),
	invoke(channel: string, ...args: unknown[]) {
		invoked.push({ channel, args });
		const result = invokeResults[channel];
		return typeof result === 'function'
			? Promise.resolve((result as (...a: unknown[]) => unknown)(...args))
			: Promise.resolve(result);
	},
};

const id = nodeRequire.resolve('electron');
nodeRequire.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: { ipcRenderer: ipcRendererStub },
} as unknown as NodeModule;

const { default: CaptureGridPanel } = await import('./CaptureGridPanel.vue');

const global = {
	plugins: [i18n],
	stubs: {
		'o-button': {
			template:
				'<button class="o-btn" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
			props: ['disabled', 'variant', 'expanded', 'iconLeft'],
			emits: ['click'],
		},
		'font-awesome-icon': true,
	},
};

const car = (
	carIdx: number,
	carNumber: string,
	driverName: string,
	extra: Record<string, unknown> = {}
) => ({
	carIdx,
	carNumber,
	driverName,
	racePosition: carIdx,
	onPitRoad: false,
	isReference: false,
	...extra,
});

function roster(overrides: Record<string, unknown> = {}) {
	return {
		connected: true,
		running: false,
		mode: 'standard',
		reference: { carIdx: 1, carNumber: '33', driverName: 'Tanguy Billon' },
		cameraKind: 'car',
		classes: [
			{
				classId: 1,
				className: 'GT3',
				color: '#ffda59',
				cars: [
					car(1, '33', 'Tanguy Billon', { isReference: true }),
					car(2, '89', 'Second Driver'),
				],
			},
			{
				classId: 2,
				className: 'GT4',
				color: '#33ceff',
				cars: [
					car(3, '17', 'Third Driver', { onPitRoad: true }),
					car(4, '10', 'Fourth Driver'),
				],
			},
		],
		skipped: [{ carIdx: 64, carNumber: '0', reason: 'pace-car' }],
		...overrides,
	};
}

let wrapper: VueWrapper | null = null;

async function mountOpen(r = roster()) {
	invokeResults = { 'capture-grid:roster': r };
	wrapper = mount(CaptureGridPanel, { global });
	// Folded by default (config stub returns undefined); unfold it.
	await wrapper.find('.capture-grid__header').trigger('click');
	await flushPromises();
	return wrapper;
}

const classBox = (w: VueWrapper, index: number) =>
	w.findAll('.capture-grid__class-row input[type="checkbox"]')[index]
		.element as HTMLInputElement;
const startButton = (w: VueWrapper) => w.find('.o-btn');

beforeEach(() => {
	invoked.length = 0;
	listeners.clear();
	invokeResults = {};
});

afterEach(() => {
	wrapper?.unmount();
	wrapper = null;
});

describe('CaptureGridPanel', () => {
	test('lists classes and cars, all selected by default', async () => {
		const w = await mountOpen();
		expect(w.text()).toContain('GT3');
		expect(w.text()).toContain('GT4');
		expect(w.text()).toContain('Reference: #33 Tanguy Billon');
		expect(w.text()).toContain('4 of 4 cars selected');
		expect(w.text()).toContain('Not available: #0 (pace car)');
		expect(startButton(w).text()).toBe('Capture grid (4)');
		expect(classBox(w, 0).checked).toBe(true);
	});

	test('a class checkbox selects and clears the whole class', async () => {
		const w = await mountOpen();
		await w.findAll('.capture-grid__class-row input')[1].setValue(false);
		expect(w.text()).toContain('2 of 4 cars selected');
		expect(classBox(w, 1).checked).toBe(false);
		expect(classBox(w, 1).indeterminate).toBe(false);
		await w.findAll('.capture-grid__class-row input')[1].setValue(true);
		expect(w.text()).toContain('4 of 4 cars selected');
	});

	test('one car off makes its class indeterminate', async () => {
		const w = await mountOpen();
		// Several classes start folded; unfold GT4 and untick one car.
		await w.findAll('.capture-grid__fold')[1].trigger('click');
		const gt4Cars = w
			.findAll('.capture-grid__cars')[1]
			.findAll('input[type="checkbox"]');
		await gt4Cars[0].setValue(false);
		expect(classBox(w, 1).checked).toBe(false);
		expect(classBox(w, 1).indeterminate).toBe(true);
		expect(w.text()).toContain('3 of 4 cars selected');
	});

	test('starts the grid with exactly the selected cars, in roster order', async () => {
		const w = await mountOpen();
		await w.findAll('.capture-grid__class-row input')[1].setValue(false);
		invokeResults['capture-grid:start'] = {
			ok: true,
			message: null,
			aborted: false,
			folder: 'C:/shots/Fuji grid',
			results: [
				{
					carIdx: 1,
					carNumber: '33',
					driverName: 'Tanguy Billon',
					status: 'shot',
					reason: null,
				},
				{
					carIdx: 2,
					carNumber: '89',
					driverName: 'Second Driver',
					status: 'failed',
					reason: 'position-not-moving',
				},
			],
		};
		await startButton(w).trigger('click');
		await flushPromises();
		const start = invoked.find((c) => c.channel === 'capture-grid:start');
		expect(start?.args[0]).toEqual([1, 2]);
		expect(w.text()).toContain('1 shot, 1 failed, 0 skipped');
		expect(w.text()).toContain('#89 Second Driver: the car is not moving');
		expect(w.text()).toContain('Open folder');
	});

	test('a deselection survives a roster refresh, and a new car arrives selected', async () => {
		const w = await mountOpen();
		await w.findAll('.capture-grid__class-row input')[1].setValue(false);
		const next = roster();
		(next.classes[0].cars as unknown[]).push(car(5, '5', 'New Driver'));
		invokeResults['capture-grid:roster'] = next;
		await w
			.find('.capture-grid__toolbar-actions button:last-child')
			.trigger('click');
		await flushPromises();
		expect(w.text()).toContain('3 of 5 cars selected');
	});

	test('warns on a trackside camera and refuses without a reference', async () => {
		const w = await mountOpen(
			roster({ cameraKind: 'trackside', reference: null })
		);
		expect(w.text()).toContain('TV or scenic camera');
		expect(w.text()).toContain('Put the camera on a car that is on track');
		expect(startButton(w).attributes('disabled')).toBeDefined();
	});

	test('shows the refusal main returned', async () => {
		const w = await mountOpen();
		invokeResults['capture-grid:start'] = {
			ok: false,
			message: 'Capture grid needs High-Fidelity Capture.',
			aborted: false,
			folder: null,
			results: [],
		};
		await startButton(w).trigger('click');
		await flushPromises();
		expect(w.text()).toContain('Capture grid needs High-Fidelity Capture.');
	});
});
