import { describe, expect, it } from 'vitest';
import {
	createDefaultRecipe,
	normalizeRecipe,
	resolvePlan,
	validatePlan,
	variantSuffix,
	MAX_HIGHLIGHT_RECOVERY_STOPS,
	type LongExposureRecipe,
} from './shot-recipe';

const base = (): LongExposureRecipe =>
	createDefaultRecipe({
		anchorFrame: 5000,
		sessionNum: 2,
		width: 1920,
		height: 1080,
		outputDir: 'C:\\shots',
	});

describe('createDefaultRecipe', () => {
	it('carries the anchor, session and output directory the caller supplied', () => {
		const recipe = base();
		expect(recipe.anchorFrame).toBe(5000);
		expect(recipe.sessionNum).toBe(2);
		expect(recipe.outputDir).toBe('C:\\shots');
	});

	it('defaults to a 16-bit master and no variant', () => {
		expect(base().outputFormat).toBe('png16');
		expect(base().variantId).toBeNull();
	});

	// Interpolation is hardware-specific and costs per-frame time that could
	// otherwise buy real samples, so the base feature must not opt into it.
	it('defaults frame interpolation to off', () => {
		expect(base().interpolationFactor).toBe(1);
	});

	// A sidecar written before highlight recovery existed carries no such field, so a
	// non-zero default would make old recipes reproduce differently. Reproducibility
	// outranks a better-looking first shot.
	it('defaults highlight recovery to off', () => {
		expect(base().highlightRecovery).toBe(0);
	});
});

describe('normalizeRecipe — highlight recovery', () => {
	it('keeps a value inside the stop range', () => {
		for (const stops of [0, 0.5, 3, 5.25, 8]) {
			expect(
				normalizeRecipe({ highlightRecovery: stops }, base())
					.highlightRecovery
			).toBe(stops);
		}
	});

	// Negative gain would DARKEN highlights, which is the opposite of the point and
	// would look like a bug rather than a setting.
	it('clamps out-of-range values rather than passing them to the GPU', () => {
		expect(
			normalizeRecipe({ highlightRecovery: -4 }, base()).highlightRecovery
		).toBe(0);
		expect(
			normalizeRecipe({ highlightRecovery: 999 }, base()).highlightRecovery
		).toBe(MAX_HIGHLIGHT_RECOVERY_STOPS);
	});

	it('falls back to the default for a non-numeric value', () => {
		for (const bogus of [NaN, 'lots', null, undefined, {}]) {
			expect(
				normalizeRecipe(
					{ highlightRecovery: bogus as never },
					base()
				).highlightRecovery
			).toBe(0);
		}
	});

	// The important compatibility property: an old sidecar has no such key, so it must
	// normalise to off and therefore reproduce byte-identically.
	it('normalises a pre-feature recipe to off', () => {
		const old = { ...base() } as Record<string, unknown>;
		delete old.highlightRecovery;
		expect(
			normalizeRecipe(old as never, base()).highlightRecovery
		).toBe(0);
	});
});

describe('normalizeRecipe — frame interpolation', () => {
	it('accepts every factor on the ladder', () => {
		for (const factor of [1, 2, 4, 8] as const) {
			expect(
				normalizeRecipe({ interpolationFactor: factor }, base())
					.interpolationFactor
			).toBe(factor);
		}
	});

	// A sidecar written by a future build, or a hand-edited recipe, must degrade to a
	// valid value rather than reaching the GPU. Off is the safe direction: it is what
	// the shot would have done before interpolation existed.
	it('falls back to the default for a factor off the ladder', () => {
		for (const bogus of [0, 3, 16, -2, NaN, 'four', null, undefined]) {
			expect(
				normalizeRecipe({ interpolationFactor: bogus as never }, base())
					.interpolationFactor
			).toBe(1);
		}
	});

	it('inherits a non-default factor from the defaults when absent', () => {
		const defaults = { ...base(), interpolationFactor: 4 as const };
		expect(normalizeRecipe({}, defaults).interpolationFactor).toBe(4);
	});
});

describe('normalizeRecipe', () => {
	it('lets a recognised shutter key override exposureMs so the two cannot disagree', () => {
		const recipe = normalizeRecipe(
			{ shutter: '1/4', exposureMs: 9999 },
			base()
		);
		expect(recipe.shutter).toBe('1/4');
		expect(recipe.exposureMs).toBeCloseTo(250);
	});

	it('keeps an explicit exposureMs when no shutter key is given', () => {
		const recipe = normalizeRecipe(
			{ shutter: null, exposureMs: 320 },
			base()
		);
		expect(recipe.shutter).toBeNull();
		expect(recipe.exposureMs).toBe(320);
	});

	// Exactly one of the two drives the solve, so an explicit speed clears the
	// target rather than leaving a silent conflict.
	it('makes an explicit playback speed clear the sample target', () => {
		const recipe = normalizeRecipe(
			{ playbackSpeed: 8, targetSamples: 500 },
			base()
		);
		expect(recipe.playbackSpeed).toBe(8);
		expect(recipe.targetSamples).toBeNull();
	});

	it('snaps an unsupported playback speed onto the ladder', () => {
		expect(
			normalizeRecipe({ playbackSpeed: 5 as never }, base()).playbackSpeed
		).toBe(4);
	});

	it('falls back to defaults for unusable fields instead of throwing', () => {
		const recipe = normalizeRecipe(
			{
				weighting: 'spiral' as never,
				tonemap: 'filmic' as never,
				outputFormat: 'tga' as never,
				supersample: 7 as never,
				width: 'wide' as never,
			},
			base()
		);
		expect(recipe.weighting).toBe('box');
		expect(recipe.tonemap).toBe('none');
		expect(recipe.outputFormat).toBe('png16');
		expect(recipe.supersample).toBe(1);
		expect(recipe.width).toBe(1920);
	});

	it('clamps exposure compensation and dimensions to sane ranges', () => {
		const recipe = normalizeRecipe(
			{ exposureCompensation: 99, width: 99999, height: -4 },
			base()
		);
		expect(recipe.exposureCompensation).toBe(6);
		expect(recipe.width).toBe(10000);
		expect(recipe.height).toBe(16);
	});

	it('normalises an absent variantId to null', () => {
		expect(normalizeRecipe({ variantId: '' }, base()).variantId).toBeNull();
		expect(normalizeRecipe({ variantId: 'gt3-blue' }, base()).variantId).toBe(
			'gt3-blue'
		);
	});

	// A recipe must survive a JSON round trip, because "reproduce this shot" is
	// meant to be a file copy (the metadata sidecar carries one).
	it('round-trips through JSON unchanged', () => {
		const recipe = normalizeRecipe(
			{ shutter: '1/4', supersample: 2 },
			base()
		);
		expect(
			normalizeRecipe(JSON.parse(JSON.stringify(recipe)), base())
		).toEqual(recipe);
	});
});

describe('resolvePlan', () => {
	it('places the window BEHIND the anchor, ending on it', () => {
		const plan = resolvePlan(normalizeRecipe({ shutter: '1/4' }, base()));
		expect(plan.anchorFrame).toBe(5000);
		expect(plan.windowFrames).toBe(15);
		expect(plan.startFrame).toBe(4985);
	});

	it('derives a playback speed from the sample target', () => {
		const plan = resolvePlan(
			normalizeRecipe({ shutter: '0.5', targetSamples: 240 }, base()),
			{ renderFps: 60 }
		);
		// 0.5s at 60fps needs 8x to reach 240.
		expect(plan.playbackDivisor).toBe(8);
		expect(plan.predictedSamples).toBeGreaterThanOrEqual(240);
	});

	it('honours an explicit playback speed over any target', () => {
		const plan = resolvePlan(
			normalizeRecipe({ shutter: '0.5', playbackSpeed: 2 }, base()),
			{ renderFps: 60 }
		);
		expect(plan.playbackDivisor).toBe(2);
	});

	it('reports the wall-clock cost of the chosen speed', () => {
		const plan = resolvePlan(
			normalizeRecipe({ shutter: '1', playbackSpeed: 16 }, base()),
			{ renderFps: 60 }
		);
		expect(plan.predictedWallClockSeconds).toBeCloseTo(16);
		expect(plan.predictedSamples).toBeGreaterThan(900);
	});

	it('scales the render size by the supersample factor', () => {
		const plan = resolvePlan(normalizeRecipe({ supersample: 2 }, base()));
		expect(plan.renderWidth).toBe(3840);
		expect(plan.renderHeight).toBe(2160);
	});

	it('marks sub-frame shutters as single-frame captures', () => {
		expect(
			resolvePlan(normalizeRecipe({ shutter: '1/1000' }, base()))
				.isSingleFrame
		).toBe(true);
		expect(
			resolvePlan(normalizeRecipe({ shutter: '1/8' }, base())).isSingleFrame
		).toBe(false);
	});

	it('reports the exposure the frame quantisation actually produces', () => {
		// 1/8 s is 7.5 replay frames, quantised to 8.
		const plan = resolvePlan(normalizeRecipe({ shutter: '1/8' }, base()));
		expect(plan.windowFrames).toBe(8);
		expect(plan.effectiveExposureSeconds).toBeCloseTo(8 / 60);
	});
});

describe('validatePlan', () => {
	const validate = (
		overrides: Partial<LongExposureRecipe>,
		bounds: {
			replayFrameNumEnd?: number | null;
			currentSessionNum?: number | null;
		} = {}
	) => {
		const recipe = normalizeRecipe(overrides, base());
		return validatePlan({
			plan: resolvePlan(recipe, { renderFps: 60 }),
			recipe,
			replayFrameNumEnd: bounds.replayFrameNumEnd ?? 100000,
			currentSessionNum: bounds.currentSessionNum ?? 2,
		});
	};

	it('accepts a workable shot', () => {
		expect(validate({ shutter: '1/8' }).errors).toEqual([]);
	});

	// A trailing window means an anchor near the END is always safe — we never need
	// frames after it. Only the START of the replay constrains us.
	it('accepts an anchor at the very end of the replay', () => {
		const recipe = normalizeRecipe(
			{ anchorFrame: 100000, shutter: '1' },
			base()
		);
		expect(
			validatePlan({
				plan: resolvePlan(recipe),
				recipe,
				replayFrameNumEnd: 100000,
				currentSessionNum: 2,
			}).errors
		).toEqual([]);
	});

	it('rejects an anchor too close to the start of the replay', () => {
		const recipe = normalizeRecipe({ anchorFrame: 10, shutter: '1' }, base());
		const result = validatePlan({
			plan: resolvePlan(recipe),
			recipe,
			replayFrameNumEnd: 100000,
			currentSessionNum: 2,
		});
		expect(result.errors.join(' ')).toMatch(
			/frames before the selected moment/
		);
	});

	it('rejects an anchor past the end of the replay', () => {
		expect(
			validate(
				{ anchorFrame: 200000 },
				{ replayFrameNumEnd: 100000 }
			).errors.join(' ')
		).toMatch(/past the end/);
	});

	// Re-shooting into a different session would silently produce a shot of
	// something else entirely.
	it('rejects a recipe whose session no longer matches the replay', () => {
		expect(validate({}, { currentSessionNum: 5 }).errors.join(' ')).toMatch(
			/different session/
		);
	});

	it('warns rather than fails when the sample target is unreachable', () => {
		const result = validate({ shutter: '1/60', targetSamples: 4000 });
		expect(result.errors).toEqual([]);
		expect(result.warnings.join(' ')).toMatch(/short of the 4000 requested/);
	});

	it('warns that a sub-frame shutter produces no motion blur', () => {
		expect(validate({ shutter: '1/1000' }).warnings.join(' ')).toMatch(
			/no motion blur/
		);
	});

	it('warns about a long wall-clock capture', () => {
		expect(
			validate({ shutter: '1', playbackSpeed: 16 }).warnings.join(' ')
		).toMatch(/seconds of real time/);
	});

	it('fails open when replay bounds are unknown', () => {
		expect(
			validate({}, { replayFrameNumEnd: null, currentSessionNum: null })
				.errors
		).toEqual([]);
	});
});

describe('variantSuffix (Spotter Pack seam)', () => {
	it('is empty in v1 because variantId is always null', () => {
		expect(variantSuffix(base())).toBe('');
	});

	it('becomes an output-name suffix once a variant is set', () => {
		expect(variantSuffix({ ...base(), variantId: 'gt3-blue' })).toBe(
			'--gt3-blue'
		);
	});
});
