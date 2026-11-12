// @vitest-environment happy-dom
//
// The banner's page is driven by script strings main sends with
// executeJavaScript, whose errors the overlay swallows (it must never fail a
// capture). So a typo in that script would only show as a banner that never
// changes. Run the real scripts against the real page here.
import { CaptureOverlay } from './capture-overlay';

const scripts: string[] = [];
let page = '';

vi.mock('../utilities/logger', () => ({
	createLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock('electron', () => ({
	screen: {
		getDisplayNearestPoint: () => ({
			workArea: { x: 0, y: 0, width: 1920, height: 1080 },
		}),
	},
	BrowserWindow: class {
		webContents = {
			executeJavaScript: (script: string) => {
				scripts.push(script);
				return Promise.resolve();
			},
		};
		setAlwaysOnTop() {}
		setIgnoreMouseEvents() {}
		showInactive() {}
		isDestroyed() {
			return false;
		}
		destroy() {}
		loadURL(url: string) {
			page = decodeURIComponent(
				url.replace(/^data:text\/html;charset=utf-8,/, '')
			);
			return Promise.resolve();
		}
	},
}));

// Runs what show() sent, against the page as it stands.
async function runScripts() {
	// show() waits on the page load's promise chain.
	await new Promise((resolve) => setTimeout(resolve, 0));
	for (const script of scripts) {
		// eslint-disable-next-line no-new-func
		new Function(script)();
	}
	scripts.length = 0;
}

// Loads a fresh page, then runs what show() sent.
async function render(overlay: CaptureOverlay) {
	await new Promise((resolve) => setTimeout(resolve, 0));
	const body = /<body>([\s\S]*)<\/body>/.exec(page)?.[1] ?? '';
	document.body.innerHTML = body;
	await runScripts();
	return {
		title: document.getElementById('t')?.textContent,
		hint: document.getElementById('k')?.textContent,
		subtitle: document.getElementById('s')?.textContent,
		bar: document.getElementById('p') as HTMLElement,
		box: document.getElementById('b')?.className,
		overlay,
	};
}

beforeEach(() => {
	scripts.length = 0;
});

describe('CaptureOverlay page script', () => {
	test('writes the text, the hint, and a plain bar', async () => {
		const overlay = new CaptureOverlay();
		overlay.open({ x: 0, y: 0 });
		overlay.setHint('Press Esc to abort');
		overlay.show({
			title: 'Car 1 of 3',
			subtitle: 'Moving',
			progress: 0.5,
			warn: true,
		});
		const shown = await render(overlay);
		expect(shown.title).toBe('Car 1 of 3');
		expect(shown.hint).toBe('Press Esc to abort');
		expect(shown.subtitle).toBe('Moving');
		expect(shown.box).toBe('box warn');
		expect(shown.bar.style.width).toBe('50%');
	});

	test('a glide sets a linear transition to the target', async () => {
		const overlay = new CaptureOverlay();
		overlay.open({ x: 0, y: 0 });
		overlay.show({
			title: 'Long exposure',
			progress: 0.2,
			progressTo: 0.6,
			progressMs: 4000,
		});
		const shown = await render(overlay);
		expect(shown.hint).toBe('');
		expect(shown.bar.style.transition).toBe('width 4000ms linear');
		expect(shown.bar.style.width).toBe('60%');
	});

	test('a re-aim continues from where the bar is, never from the reported position', async () => {
		// Real progress arrives in replay-frame steps and the seek is only an
		// estimate, so the reported position runs ahead of the glide; starting
		// from it made the bar leap. Re-aims change speed, not position.
		const overlay = new CaptureOverlay();
		overlay.open({ x: 0, y: 0 });
		overlay.show({
			title: 'Long exposure',
			progress: 0.2,
			progressTo: 0.6,
			progressMs: 4000,
		});
		const first = await render(overlay);
		// The glide has reached 30% on screen when the next update says 50%.
		const startedAt: string[] = [];
		first.bar.getBoundingClientRect = () => ({ width: 30 }) as DOMRect;
		Object.defineProperty(first.bar.parentElement, 'clientWidth', {
			value: 100,
		});
		Object.defineProperty(first.bar, 'offsetWidth', {
			get: () => {
				startedAt.push(first.bar.style.width);
				return 0;
			},
		});
		overlay.show({
			title: 'Long exposure',
			progress: 0.5,
			progressTo: 0.6,
			progressMs: 1000,
		});
		await runScripts();
		expect(startedAt).toEqual(['30%']);
		expect(first.bar.style.width).toBe('60%');
		expect(first.bar.style.transition).toBe('width 1000ms linear');
	});

	test('no progress hides the bar; markup in names stays text', async () => {
		const overlay = new CaptureOverlay();
		overlay.open({ x: 0, y: 0 });
		overlay.show({ title: '<b>#1</b> Driver' });
		const shown = await render(overlay);
		expect(shown.title).toBe('<b>#1</b> Driver');
		expect(shown.bar.style.width).toBe('0px');
	});
});
