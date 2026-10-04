import { describe, expect, it } from 'vitest';
import {
	createDefaultRecipe,
	longExposureFormatForStillFormat,
	normalizeRecipe,
	resolvePlan,
	validatePlan,
	variantSuffix,
	LONG_EXPOSURE_FORMATS,
	MAX_HIGHLIGHT_RECOVERY_STOPS,
	type LongExposureRecipe,
} from './shot-recipe';
import {
	DEFAULT_WARM_UP_SECONDS,
	MAX_WARM_UP_SECONDS,
	WARM_UP_BRAKE_FRAMES,
} from './exposure-math';

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

describe('normalizeRecipe — removed frame interpolation', () => {
	// A v1-v6 sidecar may carry a factor. The feature is gone, so the request is
	// dropped rather than carried into a recipe that would claim it.
	it('drops a stored interpolation factor', () => {
		for (const factor of [1, 2, 4, 8]) {
			expect(
				normalizeRecipe(
					{ interpolationFactor: factor } as Partial<LongExposureRecipe>,
					base()
				)
			).not.toHaveProperty('interpolationFactor');
		}
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
				width: 'wide' as never,
			},
			base()
		);
		expect(recipe.weighting).toBe('box');
		expect(recipe.tonemap).toBe('none');
		expect(recipe.outputFormat).toBe('png16');
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
		const recipe = normalizeRecipe({ shutter: '1/4' }, base());
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

	// Passes multiply what the user WAITS for and what they GET, but must not touch
	// the per-pass figures: `predictedSamples` is the affordability gate for one
	// visit, and `predictedWallClockSeconds` sets the capture loop's per-pass timeout.
	it('multiplies the totals by passes and leaves the per-pass figures alone', () => {
		// Warm-up off: it adds its own per-pass term, tested on its own below.
		const single = resolvePlan(
			normalizeRecipe(
				{ shutter: '1', playbackSpeed: 16, warmUpSeconds: 0 },
				base()
			),
			{ renderFps: 60 }
		);
		const quad = resolvePlan(
			normalizeRecipe(
				{ shutter: '1', playbackSpeed: 16, passes: 4, warmUpSeconds: 0 },
				base()
			),
			{ renderFps: 60 }
		);

		expect(quad.passes).toBe(4);
		expect(quad.predictedWallClockSeconds).toBeCloseTo(
			single.predictedWallClockSeconds
		);
		expect(quad.predictedSamples).toBe(single.predictedSamples);
		expect(quad.predictedTotalWallClockSeconds).toBeCloseTo(
			single.predictedWallClockSeconds * 4
		);
		expect(quad.predictedTotalSamples).toBe(single.predictedSamples * 4);
	});

	it('reports totals equal to the per-pass figures on a single pass', () => {
		const plan = resolvePlan(normalizeRecipe({ warmUpSeconds: 0 }, base()), {
			renderFps: 60,
		});
		expect(plan.passes).toBe(1);
		expect(plan.predictedTotalSamples).toBe(plan.predictedSamples);
		expect(plan.predictedTotalWallClockSeconds).toBeCloseTo(
			plan.predictedWallClockSeconds
		);
	});

	// Supersampling is gone, so the rendered size IS the requested size. A v1-v3
	// sidecar carrying supersample: 2 must not quietly resize the capture -- it
	// cannot be reproduced on this build, and obeying it halfway would be worse
	// than not obeying it at all.
	it('renders at exactly the requested size, ignoring a stale supersample', () => {
		const plan = resolvePlan(normalizeRecipe({}, base()));
		expect(plan.renderWidth).toBe(1920);
		expect(plan.renderHeight).toBe(1080);

		const stale = resolvePlan(
			normalizeRecipe({ supersample: 2 } as never, base())
		);
		expect(stale.renderWidth).toBe(1920);
		expect(stale.renderHeight).toBe(1080);
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
			replayEndFrame?: number | null;
			currentSessionNum?: number | null;
		} = {}
	) => {
		const recipe = normalizeRecipe(overrides, base());
		return validatePlan({
			plan: resolvePlan(recipe, { renderFps: 60 }),
			recipe,
			replayEndFrame: bounds.replayEndFrame ?? 100000,
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
				replayEndFrame: 100000,
				currentSessionNum: 2,
			}).errors
		).toEqual([]);
	});

	it('rejects an anchor too close to the start of the replay', () => {
		const recipe = normalizeRecipe({ anchorFrame: 10, shutter: '1' }, base());
		const result = validatePlan({
			plan: resolvePlan(recipe),
			recipe,
			replayEndFrame: 100000,
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
				{ replayEndFrame: 100000 }
			).errors.join(' ')
		).toMatch(/past the end/);
	});

	// A LIVE session parks the cursor at the live edge, so the anchor IS the end of
	// the tape. That has to pass: this check exists for a sidecar re-shot into a
	// shorter replay, and it once refused every live shot because it was handed the
	// raw `ReplayFrameNumEnd` countdown — ~0 at the edge — as if it were a position.
	it('accepts an anchor sitting exactly at the live edge', () => {
		expect(
			validate({ anchorFrame: 11106 }, { replayEndFrame: 11106 }).errors
		).toEqual([]);
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

	// The duration warning is the ONLY thing standing between a user and an unbidden
	// two-minute replay drive, so it must quote the total. Quoting one pass of eight
	// would understate the wait by eight and never escalate.
	it('quotes the total wait, not one pass of it', () => {
		const single = validate({ shutter: '1/8', playbackSpeed: 16 });
		const many = validate({ shutter: '1/8', playbackSpeed: 16, passes: 16 });
		expect(single.warnings.join(' ')).not.toMatch(/real time/);
		expect(many.warnings.join(' ')).toMatch(/real time/);
		expect(many.warnings.join(' ')).toMatch(/16 passes/);
	});

	// The native log cap was sized so no SINGLE-PASS recipe could reach it. Passes
	// multiply the stream, so the impossible case is reachable again.
	it('warns when passes push the sample stream past the diagnostic log', () => {
		const many = validate({ shutter: '10', playbackSpeed: 16, passes: 16 });
		expect(many.warnings.join(' ')).toMatch(/diagnostic log holds/);
		// And says the shot itself survives, because that is the part that matters.
		expect(many.warnings.join(' ')).toMatch(/image is unaffected/);
		expect(
			validate({ shutter: '10', playbackSpeed: 16 }).warnings.join(' ')
		).not.toMatch(/diagnostic log holds/);
	});

	// Past the point where a capture stops looking like a pause and starts looking
	// like a hang, the warning has to say what to do about it. 16 s is where that
	// line sits: it was the ceiling of the whole feature before 2"/5"/10" landed.
	it('escalates the warning past the old ceiling', () => {
		const mild = validate({
			shutter: '1',
			playbackSpeed: 16,
			warmUpSeconds: 0,
		}).warnings.join(' ');
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
			validate({
				shutter: '10',
				playbackSpeed: 16,
				warmUpSeconds: 0,
			}).warnings.join(' ')
		).toMatch(/2 min 40 s/);
		// ...and stays in seconds below that.
		expect(
			validate({
				shutter: '1',
				playbackSpeed: 16,
				warmUpSeconds: 0,
			}).warnings.join(' ')
		).toMatch(/16 seconds/);
	});

	// A 10" exposure is 600 replay frames, so it needs ten seconds of tape behind
	// the anchor. That is the existing bounds error, but the long stops are the
	// first shutters that can realistically hit it.
	it('refuses a long exposure that reaches past the start of the replay', () => {
		const result = validate(
			{ shutter: '10', anchorFrame: 120 },
			{ replayEndFrame: 100000, currentSessionNum: 2 }
		);
		expect(result.errors.join(' ')).toMatch(/600 replay frames/);
	});

	it('fails open when replay bounds are unknown', () => {
		expect(
			validate({}, { replayEndFrame: null, currentSessionNum: null }).errors
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

describe('effects warm-up', () => {
	const plan = (overrides: Partial<LongExposureRecipe>) =>
		resolvePlan(normalizeRecipe(overrides, base()), { renderFps: 60 });
	const validate = (overrides: Partial<LongExposureRecipe>) => {
		const recipe = normalizeRecipe(overrides, base());
		return validatePlan({
			plan: resolvePlan(recipe, { renderFps: 60 }),
			recipe,
			replayEndFrame: 100000,
			currentSessionNum: 2,
		});
	};

	// On by default, unlike the other recipe additions: it changes what the scene
	// looks like when the window opens, never what the exposure is.
	it('defaults to the recommended warm-up', () => {
		expect(base().warmUpSeconds).toBe(DEFAULT_WARM_UP_SECONDS);
	});

	it('keeps an explicit 0 and clamps out-of-range values', () => {
		expect(normalizeRecipe({ warmUpSeconds: 0 }, base()).warmUpSeconds).toBe(
			0
		);
		expect(normalizeRecipe({ warmUpSeconds: -2 }, base()).warmUpSeconds).toBe(
			0
		);
		expect(normalizeRecipe({ warmUpSeconds: 99 }, base()).warmUpSeconds).toBe(
			MAX_WARM_UP_SECONDS
		);
	});

	// A sidecar written before warm-up existed takes the default rather than
	// reproducing the frozen start it recorded.
	it('reads an absent or unusable value as the default', () => {
		const legacy = base() as Partial<LongExposureRecipe>;
		delete legacy.warmUpSeconds;
		expect(normalizeRecipe(legacy, base()).warmUpSeconds).toBe(
			DEFAULT_WARM_UP_SECONDS
		);
		expect(
			normalizeRecipe({ warmUpSeconds: 'soon' as unknown as number }, base())
				.warmUpSeconds
		).toBe(DEFAULT_WARM_UP_SECONDS);
	});

	it('plans the warm-up in replay frames and charges it to every pass', () => {
		const p = plan({
			shutter: '1/8',
			playbackSpeed: 16,
			passes: 2,
			warmUpSeconds: 3,
		});
		expect(p.warmUpRequestedFrames).toBe(180);
		expect(p.warmUpFrames).toBe(180);
		// 3 s at 1x, then the brake frames at 1/16.
		expect(p.predictedWarmUpSeconds).toBeCloseTo(
			3 + (WARM_UP_BRAKE_FRAMES * 16) / 60
		);
		// ...which the per-pass accumulation estimate does NOT include, because it
		// sets the capture loop's timeout.
		// (1/8 quantises to 8 replay frames.)
		expect(p.predictedWallClockSeconds).toBeCloseTo((8 / 60) * 16);
		expect(p.predictedTotalWallClockSeconds).toBeCloseTo(
			(p.predictedWallClockSeconds + p.predictedWarmUpSeconds) * 2
		);
	});

	it('plans nothing extra with the warm-up off', () => {
		const p = plan({ warmUpSeconds: 0 });
		expect(p.warmUpFrames).toBe(0);
		expect(p.warmUpRequestedFrames).toBe(0);
		expect(p.predictedWarmUpSeconds).toBe(0);
		expect(validate({ warmUpSeconds: 0 }).warnings.join(' ')).not.toMatch(
			/warm-up/
		);
	});

	it('shortens the warm-up near the start of the tape, and says so', () => {
		// 1/8 is 8 frames, so the window starts on 92; the brake takes 6 more.
		const p = plan({ anchorFrame: 100, shutter: '1/8', warmUpSeconds: 3 });
		expect(p.startFrame).toBe(92);
		expect(p.warmUpFrames).toBe(92 - WARM_UP_BRAKE_FRAMES);
		const result = validate({
			anchorFrame: 100,
			shutter: '1/8',
			warmUpSeconds: 3,
		});
		expect(result.errors).toEqual([]);
		expect(result.warnings.join(' ')).toMatch(/cut to 1\.4 s/);
	});

	it('plans no warm-up when the brake alone reaches the tape start', () => {
		const p = plan({ anchorFrame: 10, shutter: '1/8', warmUpSeconds: 3 });
		expect(p.warmUpFrames).toBe(0);
		expect(p.predictedWarmUpSeconds).toBe(0);
	});

	// The window not fitting is already a refusal; a warm-up note on top of it
	// would only bury the reason.
	it('stays silent when the window itself does not fit', () => {
		const result = validate({ anchorFrame: 4, shutter: '1/8' });
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.warnings.join(' ')).not.toMatch(/warm-up/);
	});
});
