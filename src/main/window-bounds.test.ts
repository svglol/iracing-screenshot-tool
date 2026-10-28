import { restoreWindowBounds } from './window-bounds';

const PRIMARY = { x: 0, y: 0, width: 1920, height: 1040 };
const RIGHT = { x: 1920, y: 0, width: 2560, height: 1400 };
const FALLBACK = { width: 1100, height: 655 };

describe('restoreWindowBounds', () => {
	test('keeps a position on a connected display', () => {
		expect(
			restoreWindowBounds(
				{ x: 200, y: 100, width: 1200, height: 700 },
				[PRIMARY],
				FALLBACK
			)
		).toEqual({ x: 200, y: 100, width: 1200, height: 700 });
	});

	test('keeps a position on a second display while it is connected', () => {
		expect(
			restoreWindowBounds(
				{ x: 2500, y: 300, width: 1200, height: 700 },
				[PRIMARY, RIGHT],
				FALLBACK
			)
		).toEqual({ x: 2500, y: 300, width: 1200, height: 700 });
	});

	// Regression: a frameless window saved on a monitor that is no longer
	// connected reopened where nothing shows it, with no title bar to grab.
	test('drops the position when its display is gone, keeping the size', () => {
		expect(
			restoreWindowBounds(
				{ x: 2500, y: 300, width: 1200, height: 700 },
				[PRIMARY],
				FALLBACK
			)
		).toEqual({ width: 1200, height: 700 });
	});

	test('keeps a window hanging off an edge while its title bar can be grabbed', () => {
		expect(
			restoreWindowBounds(
				{ x: 1500, y: 600, width: 1200, height: 700 },
				[PRIMARY],
				FALLBACK
			)
		).toEqual({ x: 1500, y: 600, width: 1200, height: 700 });
	});

	test('drops it when only a sliver of the title bar shows', () => {
		expect(
			restoreWindowBounds(
				{ x: 1880, y: 100, width: 1200, height: 700 },
				[PRIMARY],
				FALLBACK
			)
		).toEqual({ width: 1200, height: 700 });
	});

	test('drops it when the title bar is above every display', () => {
		expect(
			restoreWindowBounds(
				{ x: 200, y: -500, width: 1200, height: 700 },
				[PRIMARY],
				FALLBACK
			)
		).toEqual({ width: 1200, height: 700 });
	});

	test('falls back for values that are not numbers', () => {
		expect(
			restoreWindowBounds(
				{ x: undefined, y: 'top', width: NaN, height: null },
				[PRIMARY],
				FALLBACK
			)
		).toEqual(FALLBACK);
	});

	test('the first-run default (0, 0) is on the primary display', () => {
		expect(
			restoreWindowBounds(
				{ x: 0, y: 0, width: 1100, height: 655 },
				[PRIMARY],
				FALLBACK
			)
		).toEqual({ x: 0, y: 0, width: 1100, height: 655 });
	});
});
