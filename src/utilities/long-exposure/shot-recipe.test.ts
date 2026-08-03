import { describe, expect, it } from 'vitest';
import {
	createDefaultRecipe,
	longExposureFormatForStillFormat,
	normalizeRecipe,
	resolvePlan,
	validatePlan,
	variantSuffix,
	interpolationLoad,
	LONG_EXPOSURE_FORMATS,
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
				normalizeRecipe({ highlightRecovery: bogus as never }, base())
					.highlightRecovery
			).toBe(0);
		}
	});

	// The important compatibility property: an old sidecar has no such key, so it must
	// normalise to off and therefore reproduce byte-identically.
	it('normalises a pre-feature recipe to off', () => {
		const old = { ...base() } as Record<string, unknown>;
		delete old.highlightRecovery;
		expect(normalizeRecipe(old as never, base()).highlightRecovery).toBe(0);
	});
});

// Highlight recovery expands near-clipped values BEFORE integrating, and relies on
// something at resolve putting persistent bright surfaces back. That used to be ACES,
// forced on from normalizeRecipe. It is now `compress_highlights` in shaders.hlsl —
// the exact inverse of the expansion, applied unconditionally at resolve — so the
// pair is closed inside the shader and the recipe layer stays out of it.
//
// These tests exist to stop the coupling being reinstated: a second compressive curve
// on top of the inverse is a look change nobody asked for, and it would undo the
// round-trip property the shader change was made for.
describe('normalizeRecipe — recovery does NOT touch the tonemap', () => {
	it('leaves the tonemap off when recovery is used and none was named', () => {
		expect(normalizeRecipe({ highlightRecovery: 3 }, base()).tonemap).toBe(
			'none'
		);
	});

	it('leaves the tonemap alone when recovery is off', () => {
		expect(normalizeRecipe({ highlightRecovery: 0 }, base()).tonemap).toBe(
			'none'
		);
		expect(normalizeRecipe({}, base()).tonemap).toBe('none');
	});

	it('still honours an explicit tonemap at any recovery setting', () => {
		for (const stops of [0, 3]) {
			expect(
				normalizeRecipe(
					{ highlightRecovery: stops, tonemap: 'reinhard' },
					base()
				).tonemap
			).toBe('reinhard');
			expect(
				normalizeRecipe(
					{ highlightRecovery: stops, tonemap: 'aces' },
					base()
				).tonemap
			).toBe('aces');
		}
	});

	// A sidecar written while the coupling was live carries tonemap: "aces"
	// explicitly. Re-shooting it must still apply ACES — the recipe layer reproduces
	// what it recorded, even though the shader beneath it has since changed.
	it('reproduces a coupling-era sidecar as recorded', () => {
		const eraSidecar = { highlightRecovery: 3, tonemap: 'aces' as const };
		expect(normalizeRecipe(eraSidecar, base()).tonemap).toBe('aces');
	});

	// The panel omits tonemap entirely, so this is the path every shot takes.
	it('leaves the tonemap off on the path the UI actually uses', () => {
		const fromPanel: Partial<LongExposureRecipe> = {
			shutter: '1/8',
			supersample: 1,
			interpolationFactor: 1,
			weighting: 'box',
			highlightRecovery: 3,
		};
		expect(normalizeRecipe(fromPanel, base()).tonemap).toBe('none');
	});

	it('still round-trips through JSON', () => {
		const recipe = normalizeRecipe({ highlightRecovery: 3 }, base());
		expect(
			normalizeRecipe(JSON.parse(JSON.stringify(recipe)), base())
		).toEqual(recipe);
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

// The panel no longer carries its own format select: a long exposure saves the way
// a screenshot saves. Settings has no 16-bit option, so PNG there is read as "the
// lossless one" and maps to the 16-bit master.
describe('longExposureFormatForStillFormat', () => {
	it('maps PNG to the 16-bit master', () => {
		expect(longExposureFormatForStillFormat('png')).toBe('png16');
	});

	it('passes the 8-bit formats through unchanged', () => {
		expect(longExposureFormatForStillFormat('jpeg')).toBe('jpeg');
		expect(longExposureFormatForStillFormat('webp')).toBe('webp');
	});

	// The still path defaults to jpeg, so an unset or unrecognised value has to land
	// there too rather than on a format the user never chose.
	it('falls back to jpeg for anything unrecognised', () => {
		for (const bogus of [undefined, null, '', 'png16', 'tiff', 7, {}]) {
			expect(longExposureFormatForStillFormat(bogus)).toBe('jpeg');
		}
	});

	// Whatever it returns has to be a format the writer can actually encode.
	it('only ever returns a supported long-exposure format', () => {
		for (const still of ['jpeg', 'png', 'webp', 'nonsense']) {
			expect(LONG_EXPOSURE_FORMATS).toContain(
				longExposureFormatForStillFormat(still)
			);
		}
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

	// The warning keys on how many samples will land, not on how many replay frames
	// the window spans — since sub-frame windows, a one-frame span can hold plenty
	// of samples, and a 1-sample result is the CORRECT answer for a fast enough
	// shutter rather than a quantisation failure.
	it('flags a capture that will collect a single sample', () => {
		// 1/1000 at 1/16 playback is 1.0 ms of sim time: one rendered frame.
		expect(
			resolvePlan(
				normalizeRecipe({ shutter: '1/1000', playbackSpeed: 16 }, base()),
				{ renderFps: 60 }
			).isSingleSample
		).toBe(true);
		// 1/125 at the same speed spans the same single replay frame but collects
		// about eight samples — real blur, and it used to be warned about anyway.
		const fast = resolvePlan(
			normalizeRecipe({ shutter: '1/125', playbackSpeed: 16 }, base()),
			{ renderFps: 60 }
		);
		expect(fast.windowFrames).toBe(1);
		expect(fast.isSingleSample).toBe(false);
		expect(
			resolvePlan(normalizeRecipe({ shutter: '1/8' }, base())).isSingleSample
		).toBe(false);
	});

	it('reports the exposure the frame quantisation actually produces', () => {
		// 1/8 s is 7.5 replay frames, quantised to 8. Exposures of a whole replay
		// frame or longer still quantise exactly as they always did.
		const plan = resolvePlan(normalizeRecipe({ shutter: '1/8' }, base()));
		expect(plan.windowFrames).toBe(8);
		expect(plan.effectiveExposureSeconds).toBeCloseTo(8 / 60);
		expect(plan.isSubFrameWindow).toBe(false);
	});

	// THE defect. All five of these used to produce a byte-identical plan, so
	// asking for 1/1000 silently delivered 16x the intended blur.
	it('gives every sub-frame shutter its own window', () => {
		const stops = ['1/1000', '1/500', '1/250', '1/125', '1/60'];
		const plans = stops.map((shutter) =>
			resolvePlan(normalizeRecipe({ shutter }, base()))
		);
		const exposures = plans.map((plan) => plan.effectiveExposureSeconds);
		expect(new Set(exposures).size).toBe(stops.length);
		// Every stop is longer than the one before it...
		for (let i = 1; i < exposures.length; i += 1) {
			expect(exposures[i]).toBeGreaterThan(exposures[i - 1]);
		}
		// ...and where the ladder is a true doubling, so is the window. (1/125 to
		// 1/60 is not: the ladder's labels are photographic, and 125/60 is 2.08.)
		for (let i = 1; i < 4; i += 1) {
			expect(exposures[i] / exposures[i - 1]).toBeCloseTo(2, 6);
		}
		// The seek and the safety net are unchanged: one replay frame, every time.
		for (const plan of plans) {
			expect(plan.windowFrames).toBe(1);
			expect(plan.startFrame).toBe(4999);
		}
		expect(plans.map((plan) => plan.isSubFrameWindow)).toEqual([
			true,
			true,
			true,
			true,
			// 1/60 IS one replay frame, so it is not a sub-frame window.
			false,
		]);
	});

	// The sidecar's effectiveExposureSeconds is a re-execution contract, not a
	// label (design note §6) — a sub-frame value has to survive the round trip.
	it('re-resolves a sub-frame plan identically', () => {
		const recipe = normalizeRecipe({ shutter: '1/250' }, base());
		const first = resolvePlan(recipe, { renderFps: 60 });
		const round = resolvePlan(
			normalizeRecipe(JSON.parse(JSON.stringify(recipe)), base()),
			{ renderFps: 60 }
		);
		expect(round).toEqual(first);
		expect(first.effectiveExposureSeconds).toBeCloseTo(1 / 250, 10);
	});

	// A free-form exposure below one replay frame is now honoured too, not just the
	// ladder stops.
	it('honours a free-form sub-frame exposureMs', () => {
		const plan = resolvePlan(
			normalizeRecipe({ shutter: null, exposureMs: 5 }, base())
		);
		expect(plan.effectiveExposureSeconds).toBeCloseTo(0.005, 10);
		expect(plan.isSubFrameWindow).toBe(true);
		expect(plan.windowFrames).toBe(1);
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

	// Past the point where a capture stops looking like a pause and starts looking
	// like a hang, the warning has to say what to do about it. 16 s is where that
	// line sits: it was the ceiling of the whole feature before 2"/5"/10" landed.
	it('escalates the warning past the old ceiling', () => {
		const mild = validate({ shutter: '1', playbackSpeed: 16 }).warnings.join(
			' '
		);
		expect(mild).not.toMatch(/cannot be hurried/);

		const loud = validate({ shutter: '5', playbackSpeed: 16 }).warnings.join(
			' '
		);
		expect(loud).toMatch(/cannot be hurried/);
		expect(loud).toMatch(/faster playback speed/);
	});

	// "about 160 seconds" is a number the reader has to convert themselves.
	it('reports minutes once the wait passes a minute and a half', () => {
		expect(
			validate({ shutter: '10', playbackSpeed: 16 }).warnings.join(' ')
		).toMatch(/2 min 40 s/);
		// ...and stays in seconds below that.
		expect(
			validate({ shutter: '1', playbackSpeed: 16 }).warnings.join(' ')
		).toMatch(/16 seconds/);
	});

	// A 10" exposure is 600 replay frames, so it needs ten seconds of tape behind
	// the anchor. That is the existing bounds error, but the long stops are the
	// first shutters that can realistically hit it.
	it('refuses a long exposure that reaches past the start of the replay', () => {
		const result = validate(
			{ shutter: '10', anchorFrame: 120 },
			{ replayFrameNumEnd: 100000, currentSessionNum: 2 }
		);
		expect(result.errors.join(' ')).toMatch(/600 replay frames/);
	});

	it('fails open when replay bounds are unknown', () => {
		expect(
			validate({}, { replayFrameNumEnd: null, currentSessionNum: null })
				.errors
		).toEqual([]);
	});
});

// The pre-flight warning learns THIS machine's limit from measured captures rather
// than hard-coding one, because where interpolation stops being free depends entirely
// on the GPU. Until there is evidence it must say nothing at all.
describe('validatePlan — interpolation load', () => {
	const planFor = (over: Partial<LongExposureRecipe>) => {
		const r = normalizeRecipe(over, base());
		return { recipe: r, plan: resolvePlan(r) };
	};

	it('says nothing when the machine has never fallen behind', () => {
		const { recipe, plan } = planFor({
			interpolationFactor: 8,
			supersample: 2,
		});
		for (const lossyInterpolationLoad of [null, undefined, 0]) {
			const { warnings } = validatePlan({
				plan,
				recipe,
				replayFrameNumEnd: null,
				currentSessionNum: null,
				lossyInterpolationLoad,
			});
			expect(warnings.join(' ')).not.toMatch(/interpolation/i);
		}
	});

	it('warns once the planned load reaches a known-lossy one', () => {
		const { recipe, plan } = planFor({
			interpolationFactor: 8,
			supersample: 2,
		});
		const load = interpolationLoad({
			renderWidth: plan.renderWidth,
			renderHeight: plan.renderHeight,
			interpolationFactor: recipe.interpolationFactor,
		});
		const { warnings } = validatePlan({
			plan,
			recipe,
			replayFrameNumEnd: null,
			currentSessionNum: null,
			lossyInterpolationLoad: load,
		});
		expect(warnings.join(' ')).toMatch(/cost this machine real samples/i);
		// Supersample is the cheapest thing to give up and it buys samples twice.
		expect(warnings.join(' ')).toMatch(/supersampling/i);
	});

	it('stays quiet for a lighter configuration than the known limit', () => {
		const { recipe, plan } = planFor({
			interpolationFactor: 2,
			supersample: 1,
		});
		const { warnings } = validatePlan({
			plan,
			recipe,
			replayFrameNumEnd: null,
			currentSessionNum: null,
			// A limit measured at a much heavier configuration.
			lossyInterpolationLoad: 100,
		});
		expect(warnings.join(' ')).not.toMatch(/interpolation/i);
	});

	it('never warns when interpolation is off', () => {
		const { recipe, plan } = planFor({
			interpolationFactor: 1,
			supersample: 2,
		});
		const { warnings } = validatePlan({
			plan,
			recipe,
			replayFrameNumEnd: null,
			currentSessionNum: null,
			lossyInterpolationLoad: 0.0001,
		});
		expect(warnings.join(' ')).not.toMatch(/interpolation/i);
	});
});

describe('interpolationLoad', () => {
	it('is render megapixels times the factor', () => {
		expect(
			interpolationLoad({
				renderWidth: 5120,
				renderHeight: 2880,
				interpolationFactor: 8,
			})
		).toBeCloseTo(117.965, 2);
		expect(
			interpolationLoad({
				renderWidth: 2560,
				renderHeight: 1440,
				interpolationFactor: 8,
			})
		).toBeCloseTo(29.491, 2);
	});

	// Both of these must compare as "no interpolation work", so a factor-1 shot can
	// never teach the machine a limit.
	it('treats factor 0 and 1 alike', () => {
		const at = (interpolationFactor: number) =>
			interpolationLoad({
				renderWidth: 1920,
				renderHeight: 1080,
				interpolationFactor,
			});
		expect(at(0)).toBe(at(1));
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
