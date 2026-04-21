'use strict';

const {
	normalizeWindowHandle,
	normalizeWindowTitle,
	normalizeCaptureBounds,
	normalizeCaptureTarget,
	isExternalWindowSource,
	findSourceByWindowHandles,
	findSourceByWindowTitle,
	findSourceByKnownIracingTitle,
	findDisplaySourceByDisplayId,
	resolveDisplayCaptureRect,
} = require('./desktop-capture');

// ---------------------------------------------------------------------------
// normalizeWindowHandle
// ---------------------------------------------------------------------------
describe('normalizeWindowHandle', () => {
	test('converts numbers to trimmed strings', () => {
		expect(normalizeWindowHandle(12345)).toBe('12345');
	});

	test('trims whitespace from string handles', () => {
		expect(normalizeWindowHandle('  456  ')).toBe('456');
	});

	test('returns empty string for null/undefined', () => {
		expect(normalizeWindowHandle(null)).toBe('');
		expect(normalizeWindowHandle(undefined)).toBe('');
	});

	test('returns empty string for empty string', () => {
		expect(normalizeWindowHandle('')).toBe('');
	});

	test('handles zero (falsy, returns empty)', () => {
		// 0 is falsy, so String(0 || '') gives ''
		expect(normalizeWindowHandle(0)).toBe('');
	});
});

// ---------------------------------------------------------------------------
// normalizeWindowTitle
// ---------------------------------------------------------------------------
describe('normalizeWindowTitle', () => {
	test('trims and lowercases the title', () => {
		expect(normalizeWindowTitle('  iRacing.com Simulator  ')).toBe(
			'iracing.com simulator'
		);
	});

	test('handles empty string', () => {
		expect(normalizeWindowTitle('')).toBe('');
	});

	test('handles null/undefined', () => {
		expect(normalizeWindowTitle(null)).toBe('');
		expect(normalizeWindowTitle(undefined)).toBe('');
	});

	test('handles numeric input', () => {
		expect(normalizeWindowTitle(123)).toBe('123');
	});
});

// ---------------------------------------------------------------------------
// normalizeCaptureBounds
// ---------------------------------------------------------------------------
describe('normalizeCaptureBounds', () => {
	test('returns normalized bounds for valid input', () => {
		expect(
			normalizeCaptureBounds({ x: 10, y: 20, width: 300, height: 200 })
		).toEqual({ x: 10, y: 20, width: 300, height: 200 });
	});

	test('converts string values to numbers', () => {
		expect(
			normalizeCaptureBounds({
				x: '10',
				y: '20',
				width: '300',
				height: '200',
			})
		).toEqual({ x: 10, y: 20, width: 300, height: 200 });
	});

	test('returns null for null/undefined', () => {
		expect(normalizeCaptureBounds(null)).toBeNull();
		expect(normalizeCaptureBounds(undefined)).toBeNull();
	});

	test('returns null for arrays', () => {
		expect(normalizeCaptureBounds([1, 2, 3, 4])).toBeNull();
	});

	test('returns null for non-objects', () => {
		expect(normalizeCaptureBounds('string')).toBeNull();
		expect(normalizeCaptureBounds(42)).toBeNull();
	});

	test('returns null when width or height is zero', () => {
		expect(
			normalizeCaptureBounds({ x: 0, y: 0, width: 0, height: 100 })
		).toBeNull();
		expect(
			normalizeCaptureBounds({ x: 0, y: 0, width: 100, height: 0 })
		).toBeNull();
	});

	test('returns null when width or height is negative', () => {
		expect(
			normalizeCaptureBounds({ x: 0, y: 0, width: -1, height: 100 })
		).toBeNull();
		expect(
			normalizeCaptureBounds({ x: 0, y: 0, width: 100, height: -50 })
		).toBeNull();
	});

	test('returns null when values are NaN', () => {
		expect(
			normalizeCaptureBounds({ x: NaN, y: 0, width: 100, height: 100 })
		).toBeNull();
	});

	test('returns null when values are Infinity', () => {
		expect(
			normalizeCaptureBounds({ x: 0, y: 0, width: Infinity, height: 100 })
		).toBeNull();
	});

	test('accepts zero for x and y', () => {
		expect(
			normalizeCaptureBounds({ x: 0, y: 0, width: 100, height: 100 })
		).toEqual({ x: 0, y: 0, width: 100, height: 100 });
	});

	test('accepts negative x and y', () => {
		expect(
			normalizeCaptureBounds({ x: -100, y: -50, width: 200, height: 100 })
		).toEqual({ x: -100, y: -50, width: 200, height: 100 });
	});

	test('returns null for empty object', () => {
		expect(normalizeCaptureBounds({})).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// normalizeCaptureTarget
// ---------------------------------------------------------------------------
describe('normalizeCaptureTarget', () => {
	test('normalizes a string into a window target', () => {
		expect(normalizeCaptureTarget('window:123:0')).toEqual({
			id: 'window:123:0',
			kind: 'window',
			captureBounds: null,
			displayBounds: null,
			diagnostics: null,
		});
	});

	test('trims string input', () => {
		expect(normalizeCaptureTarget('  window:123:0  ')).toEqual({
			id: 'window:123:0',
			kind: 'window',
			captureBounds: null,
			displayBounds: null,
			diagnostics: null,
		});
	});

	test('normalizes a full display target object', () => {
		expect(
			normalizeCaptureTarget({
				id: 'screen:1:0',
				kind: 'display',
				captureBounds: { x: 10, y: 20, width: 300, height: 200 },
				displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
				diagnostics: { matchStrategy: 'display-fallback' },
			})
		).toEqual({
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 10, y: 20, width: 300, height: 200 },
			displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
			diagnostics: { matchStrategy: 'display-fallback' },
		});
	});

	test('defaults kind to window for unknown kinds', () => {
		expect(normalizeCaptureTarget({ id: 'test', kind: 'unknown' }).kind).toBe(
			'window'
		);
	});

	test('defaults to empty id and window kind for null/undefined', () => {
		const result = normalizeCaptureTarget(null);
		expect(result.id).toBe('');
		expect(result.kind).toBe('window');
		expect(result.captureBounds).toBeNull();
		expect(result.displayBounds).toBeNull();
		expect(result.diagnostics).toBeNull();
	});

	test('uses sourceId as fallback for id', () => {
		expect(normalizeCaptureTarget({ sourceId: 'window:999:0' }).id).toBe(
			'window:999:0'
		);
	});

	test('prefers id over sourceId', () => {
		expect(normalizeCaptureTarget({ id: 'a', sourceId: 'b' }).id).toBe('a');
	});

	test('sets diagnostics to null for non-object diagnostics', () => {
		expect(
			normalizeCaptureTarget({ id: 'x', diagnostics: 'string' }).diagnostics
		).toBeNull();
		expect(
			normalizeCaptureTarget({ id: 'x', diagnostics: 42 }).diagnostics
		).toBeNull();
		expect(
			normalizeCaptureTarget({ id: 'x', diagnostics: [1] }).diagnostics
		).toBeNull();
	});

	test('handles number input', () => {
		const result = normalizeCaptureTarget(42);
		expect(result.id).toBe('');
		expect(result.kind).toBe('window');
	});

	test('handles boolean input', () => {
		const result = normalizeCaptureTarget(true);
		expect(result.id).toBe('');
	});

	test('handles array input', () => {
		const result = normalizeCaptureTarget(['a', 'b']);
		expect(result.id).toBe('');
		expect(result.kind).toBe('window');
	});
});

// ---------------------------------------------------------------------------
// isExternalWindowSource
// ---------------------------------------------------------------------------
describe('isExternalWindowSource', () => {
	test('returns true for external window sources', () => {
		expect(isExternalWindowSource({ id: 'window:123:0' })).toBe(true);
		expect(isExternalWindowSource({ id: 'window:456789:0' })).toBe(true);
	});

	test('returns false for non-zero suffixes', () => {
		expect(isExternalWindowSource({ id: 'window:123:1' })).toBe(false);
	});

	test('returns false for screen sources', () => {
		expect(isExternalWindowSource({ id: 'screen:0:0' })).toBe(false);
	});

	test('returns false for empty or missing id', () => {
		expect(isExternalWindowSource({})).toBe(false);
		expect(isExternalWindowSource({ id: '' })).toBe(false);
		expect(isExternalWindowSource()).toBe(false);
	});

	test('returns false for non-string id', () => {
		expect(isExternalWindowSource({ id: 123 })).toBe(false);
		expect(isExternalWindowSource({ id: null })).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// findSourceByWindowHandles
// ---------------------------------------------------------------------------
describe('findSourceByWindowHandles', () => {
	const sources = [
		{ id: 'window:111:0', name: 'App A' },
		{ id: 'window:222:0', name: 'App B' },
		{ id: 'window:333:0', name: 'iRacing' },
	];

	test('matches by handle', () => {
		expect(findSourceByWindowHandles(sources, ['333'])).toEqual(sources[2]);
	});

	test('matches first handle in list', () => {
		expect(findSourceByWindowHandles(sources, ['111', '222'])).toEqual(
			sources[0]
		);
	});

	test('matches numeric handles', () => {
		expect(findSourceByWindowHandles(sources, [222])).toEqual(sources[1]);
	});

	test('returns null when no match', () => {
		expect(findSourceByWindowHandles(sources, ['999'])).toBeNull();
	});

	test('returns null for empty handles array', () => {
		expect(findSourceByWindowHandles(sources, [])).toBeNull();
	});

	test('returns null for empty sources', () => {
		expect(findSourceByWindowHandles([], ['123'])).toBeNull();
	});

	test('skips empty/null handles', () => {
		expect(
			findSourceByWindowHandles(sources, [null, '', undefined, '222'])
		).toEqual(sources[1]);
	});

	test('deduplicates handles', () => {
		expect(findSourceByWindowHandles(sources, ['111', '111', '111'])).toEqual(
			sources[0]
		);
	});

	test('defaults to empty arrays', () => {
		expect(findSourceByWindowHandles()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// findSourceByWindowTitle
// ---------------------------------------------------------------------------
describe('findSourceByWindowTitle', () => {
	const sources = [
		{ id: 'window:123:0', name: 'iRacing.com Simulator' },
		{ id: 'window:456:0', name: 'Discord' },
		{ id: 'window:789:0', name: 'Chrome - iRacing' },
		{ id: 'window:999:1', name: 'Internal Window' },
	];

	test('matches exact title (case-insensitive)', () => {
		expect(findSourceByWindowTitle(sources, 'iRacing.com Simulator')).toEqual(
			sources[0]
		);
	});

	test('matches with extra whitespace/suffix in search title', () => {
		expect(
			findSourceByWindowTitle(
				sources,
				'  iRacing.com Simulator - Hosted Session  '
			)
		).toEqual(sources[0]);
	});

	test('returns null for empty title', () => {
		expect(findSourceByWindowTitle(sources, '')).toBeNull();
		expect(findSourceByWindowTitle(sources, null)).toBeNull();
	});

	test('returns null when no match', () => {
		expect(findSourceByWindowTitle(sources, 'Notepad')).toBeNull();
	});

	test('only searches external window sources (ending in :0)', () => {
		expect(findSourceByWindowTitle(sources, 'Internal Window')).toBeNull();
	});

	test('matches by partial inclusion (source name in search)', () => {
		expect(findSourceByWindowTitle(sources, 'Discord Voice Chat')).toEqual(
			sources[1]
		);
	});

	test('matches by partial inclusion (search in source name)', () => {
		expect(findSourceByWindowTitle(sources, 'iracing')).toEqual(sources[0]);
	});

	test('returns null for empty sources', () => {
		expect(findSourceByWindowTitle([], 'test')).toBeNull();
	});

	test('defaults correctly', () => {
		expect(findSourceByWindowTitle()).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// findSourceByKnownIracingTitle
// ---------------------------------------------------------------------------
describe('findSourceByKnownIracingTitle', () => {
	test('matches "iracing.com simulator"', () => {
		const sources = [
			{ id: 'window:123:0', name: 'iRacing.com Simulator' },
			{ id: 'window:456:0', name: 'Discord' },
		];
		expect(findSourceByKnownIracingTitle(sources)).toEqual(sources[0]);
	});

	test('matches "iracing simulator"', () => {
		const sources = [
			{ id: 'window:123:0', name: 'Discord' },
			{ id: 'window:456:0', name: 'iRacing Simulator - Practice' },
		];
		expect(findSourceByKnownIracingTitle(sources)).toEqual(sources[1]);
	});

	test('returns null when no iRacing source found', () => {
		const sources = [
			{ id: 'window:123:0', name: 'Discord' },
			{ id: 'window:456:0', name: 'Chrome' },
		];
		expect(findSourceByKnownIracingTitle(sources)).toBeNull();
	});

	test('returns null for empty sources', () => {
		expect(findSourceByKnownIracingTitle([])).toBeNull();
	});

	test('returns null for no arguments', () => {
		expect(findSourceByKnownIracingTitle()).toBeNull();
	});

	test('ignores non-external window sources', () => {
		const sources = [
			{ id: 'window:123:1', name: 'iRacing.com Simulator' }, // :1 not :0
		];
		expect(findSourceByKnownIracingTitle(sources)).toBeNull();
	});

	test('matches case-insensitively', () => {
		const sources = [{ id: 'window:123:0', name: 'IRACING.COM SIMULATOR' }];
		expect(findSourceByKnownIracingTitle(sources)).toEqual(sources[0]);
	});
});

// ---------------------------------------------------------------------------
// findDisplaySourceByDisplayId
// ---------------------------------------------------------------------------
describe('findDisplaySourceByDisplayId', () => {
	test('matches by display_id', () => {
		const sources = [
			{ id: 'screen:0:0', display_id: '111' },
			{ id: 'screen:1:0', display_id: '222' },
		];
		expect(findDisplaySourceByDisplayId(sources, '222')).toEqual(sources[1]);
	});

	test('matches numeric display_id', () => {
		const sources = [
			{ id: 'screen:0:0', display_id: '111' },
			{ id: 'screen:1:0', display_id: '222' },
		];
		expect(findDisplaySourceByDisplayId(sources, 222)).toEqual(sources[1]);
	});

	test('falls back to single source when displayId is empty', () => {
		const single = [{ id: 'screen:0:0', display_id: '' }];
		expect(findDisplaySourceByDisplayId(single, '')).toEqual(single[0]);
	});

	test('falls back to single source when displayId is null', () => {
		const single = [{ id: 'screen:0:0', display_id: '' }];
		expect(findDisplaySourceByDisplayId(single, null)).toEqual(single[0]);
	});

	test('returns null for multiple sources when displayId is empty', () => {
		const sources = [
			{ id: 'screen:0:0', display_id: '' },
			{ id: 'screen:1:0', display_id: '' },
		];
		expect(findDisplaySourceByDisplayId(sources, '')).toBeNull();
	});

	test('falls back to single source even when display_id does not match', () => {
		// When there is only one source, it's returned as a fallback regardless of id match
		const sources = [{ id: 'screen:0:0', display_id: '111' }];
		expect(findDisplaySourceByDisplayId(sources, '999')).toEqual(sources[0]);
	});

	test('returns null for multiple sources when display_id does not match', () => {
		const sources = [
			{ id: 'screen:0:0', display_id: '111' },
			{ id: 'screen:1:0', display_id: '222' },
		];
		expect(findDisplaySourceByDisplayId(sources, '999')).toBeNull();
	});

	test('returns null for empty sources', () => {
		expect(findDisplaySourceByDisplayId([], '111')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// resolveDisplayCaptureRect
// ---------------------------------------------------------------------------
describe('resolveDisplayCaptureRect', () => {
	test('returns full rect for window kind target', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'window:123:0',
			kind: 'window',
		});
		expect(rect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
	});

	test('returns full rect for string target', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, 'window:123:0');
		expect(rect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
	});

	test('returns full rect when captureBounds is missing', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'screen:1:0',
			kind: 'display',
			displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
		});
		expect(rect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
	});

	test('returns full rect when displayBounds is missing', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 100, y: 50, width: 800, height: 600 },
		});
		expect(rect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
	});

	test('scales and crops for display target with bounds', () => {
		const rect = resolveDisplayCaptureRect(3840, 2160, {
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 100, y: 50, width: 1920, height: 1080 },
			displayBounds: { x: 0, y: 0, width: 2560, height: 1440 },
		});
		expect(rect).toEqual({ x: 150, y: 75, width: 2880, height: 1620 });
	});

	test('handles 1:1 scale (video equals display)', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 100, y: 50, width: 800, height: 600 },
			displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
		});
		expect(rect).toEqual({ x: 100, y: 50, width: 800, height: 600 });
	});

	test('clamps capture rect to video dimensions', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 1800, y: 1000, width: 500, height: 500 },
			displayBounds: { x: 0, y: 0, width: 1920, height: 1080 },
		});
		// x=1800, width should be clamped to 1920-1800=120
		// y=1000, height should be clamped to 1080-1000=80
		expect(rect.x).toBe(1800);
		expect(rect.y).toBe(1000);
		expect(rect.width).toBe(120);
		expect(rect.height).toBe(80);
	});

	test('handles display with offset bounds', () => {
		// Multi-monitor: display starts at x=1920
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 2000, y: 100, width: 800, height: 600 },
			displayBounds: { x: 1920, y: 0, width: 1920, height: 1080 },
		});
		// captureBounds.x - displayBounds.x = 80, scale = 1
		expect(rect.x).toBe(80);
		expect(rect.y).toBe(100);
		expect(rect.width).toBe(800);
		expect(rect.height).toBe(600);
	});

	test('returns full rect for zero-size displayBounds', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, {
			id: 'screen:1:0',
			kind: 'display',
			captureBounds: { x: 0, y: 0, width: 100, height: 100 },
			displayBounds: { x: 0, y: 0, width: 0, height: 0 },
		});
		expect(rect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
	});

	test('handles null target', () => {
		const rect = resolveDisplayCaptureRect(1920, 1080, null);
		expect(rect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
	});
});
