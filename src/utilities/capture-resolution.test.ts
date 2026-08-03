import { describe, expect, it } from 'vitest';
import {
	applyAspectRatio,
	getResolutionDimensions,
	resolveCaptureDimensions,
	RESOLUTION_PRESETS,
} from './capture-resolution';

describe('getResolutionDimensions', () => {
	// These are the numbers the still-capture path has always used; long exposure
	// now reads the same table, so a change here moves both.
	it('maps every preset to its nominal 16:9 size', () => {
		expect(getResolutionDimensions('1080p')).toEqual({
			width: 1920,
			height: 1080,
		});
		expect(getResolutionDimensions('2k')).toEqual({
			width: 2560,
			height: 1440,
		});
		expect(getResolutionDimensions('4k')).toEqual({
			width: 3840,
			height: 2160,
		});
		expect(getResolutionDimensions('5k')).toEqual({
			width: 5120,
			height: 2880,
		});
		expect(getResolutionDimensions('6k')).toEqual({
			width: 6400,
			height: 3600,
		});
		expect(getResolutionDimensions('7k')).toEqual({
			width: 7168,
			height: 4032,
		});
		expect(getResolutionDimensions('8k')).toEqual({
			width: 7680,
			height: 4320,
		});
	});

	// A config written by a future build must degrade, not fail a capture.
	it('falls back to 1080p for anything unrecognised', () => {
		expect(getResolutionDimensions('16k')).toEqual({
			width: 1920,
			height: 1080,
		});
		expect(getResolutionDimensions(undefined)).toEqual({
			width: 1920,
			height: 1080,
		});
		expect(getResolutionDimensions(null)).toEqual({
			width: 1920,
			height: 1080,
		});
	});

	it('has a nominal size for every preset except Custom', () => {
		for (const preset of RESOLUTION_PRESETS) {
			if (preset === 'Custom') continue;
			const dims = getResolutionDimensions(preset);
			expect(dims.width).toBeGreaterThan(0);
			expect(dims.height).toBeGreaterThan(0);
		}
	});
});

describe('applyAspectRatio', () => {
	const base = { width: 3840, height: 2160 };

	it('preserves the chosen width and scales height to the screen', () => {
		// 21:9 screen: the width the user picked is what the label promised, so it
		// is the height that moves.
		// 3840 * 1440 / 3440 = 1607.4
		expect(
			applyAspectRatio(base, { width: 3440, height: 1440 }, true)
		).toEqual({ width: 3840, height: 1607 });
	});

	it('leaves a matching aspect ratio untouched', () => {
		expect(
			applyAspectRatio(base, { width: 1680, height: 945 }, true)
		).toEqual(base);
	});

	it('does nothing when the option is off', () => {
		expect(
			applyAspectRatio(base, { width: 3440, height: 1440 }, false)
		).toEqual(base);
	});

	// A bad reading must never silently resize a capture.
	it('leaves the base alone when the screen is unusable', () => {
		expect(applyAspectRatio(base, null, true)).toEqual(base);
		expect(applyAspectRatio(base, { width: 0, height: 0 }, true)).toEqual(
			base
		);
		expect(
			applyAspectRatio(base, { width: 1680, height: undefined }, true)
		).toEqual(base);
	});
});

describe('resolveCaptureDimensions', () => {
	// The defect this whole module exists to close: '8k' meant 7680x4320 for a
	// still and 1680x945 for a long exposure, because only the renderer could read
	// the table.
	it('resolves a preset the same way whoever asks', () => {
		expect(
			resolveCaptureDimensions({
				resolution: '8k',
				screen: { width: 1680, height: 945 },
				keepAspectRatio: true,
			})
		).toEqual({ width: 7680, height: 4320 });
	});

	it('reads Custom from the supplied width and height', () => {
		expect(
			resolveCaptureDimensions({
				resolution: 'Custom',
				customWidth: 10000,
				customHeight: 720,
			})
		).toEqual({ width: 10000, height: 720 });
	});

	// Mid-typing is a legitimate UI state, so this is null rather than a guess —
	// callers that need an answer substitute their own default knowingly.
	it('returns null for an unusable Custom size', () => {
		for (const bad of ['', '0', 'abc', undefined, null, -5]) {
			expect(
				resolveCaptureDimensions({
					resolution: 'Custom',
					customWidth: bad,
					customHeight: 1080,
				})
			).toBeNull();
		}
	});

	it('applies the aspect ratio to Custom too', () => {
		expect(
			resolveCaptureDimensions({
				resolution: 'Custom',
				customWidth: 4000,
				customHeight: 4000,
				screen: { width: 1600, height: 900 },
				keepAspectRatio: true,
			})
		).toEqual({ width: 4000, height: 2250 });
	});

	it('ignores the screen entirely when keepAspectRatio is off', () => {
		expect(
			resolveCaptureDimensions({
				resolution: '4k',
				screen: { width: 3440, height: 1440 },
				keepAspectRatio: false,
			})
		).toEqual({ width: 3840, height: 2160 });
	});
});
