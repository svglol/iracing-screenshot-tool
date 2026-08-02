import { describe, expect, it } from 'vitest';
import {
	SIDECAR_VERSION,
	buildSidecar,
	extractSessionContext,
	serializeSidecar,
} from './metadata';
import {
	createDefaultRecipe,
	normalizeRecipe,
	resolvePlan,
} from './shot-recipe';
import { summarizeSamples } from './sample-stats';

const recipe = normalizeRecipe(
	{ shutter: '1/8', playbackSpeed: 8, supersample: 2 },
	createDefaultRecipe({
		anchorFrame: 5000,
		sessionNum: 3,
		width: 1920,
		height: 1080,
		outputDir: 'C:\\shots',
	})
);
const plan = resolvePlan(recipe, { renderFps: 60 });
const stats = summarizeSamples(
	Array.from({ length: 60 }, (_, i) => ({
		u: i / 59,
		sessionTime: 100 + i / 60,
		replayFrameNum: 4992 + Math.floor(i / 8),
		digest: `d${i}`,
		presentedAt: String(i),
		accepted: true,
	}))
);

const context = {
	track: 'Spa',
	car: 'Porsche 992 GT3 R',
	driver: 'A Driver',
	sessionType: 'Race',
};

const sidecar = () =>
	buildSidecar({
		recipe,
		plan,
		stats,
		backend: 'd3d11-compute',
		imageWidth: 1920,
		imageHeight: 1080,
		toolName: 'iRacing Screenshot Tool',
		toolVersion: '3.2.0',
		capturedAt: '2026-08-02T12:00:00.000Z',
		context,
	});

describe('buildSidecar', () => {
	// "Reproduce this shot" is meant to be a file copy, so the complete recipe has
	// to survive verbatim.
	it('carries the complete recipe verbatim', () => {
		expect(sidecar().recipe).toEqual(recipe);
	});

	it('round-trips through JSON without losing anything', () => {
		const written = serializeSidecar(sidecar());
		expect(JSON.parse(written)).toEqual(sidecar());
		expect(written.endsWith('\n')).toBe(true);
	});

	it('stamps a version so a future reader knows the shape', () => {
		expect(sidecar().sidecarVersion).toBe(SIDECAR_VERSION);
	});

	// Highlight recovery changes the accumulated values themselves, so a sidecar that
	// omitted it would not actually reproduce the shot.
	it('records the highlight recovery the shot was taken with', () => {
		expect(sidecar().exposure.highlightRecoveryStops).toBe(0);
		const recovered = normalizeRecipe({ highlightRecovery: 4 }, recipe);
		expect(
			buildSidecar({
				recipe: recovered,
				plan,
				stats,
				backend: null,
				imageWidth: 1920,
				imageHeight: 1080,
				toolName: 't',
				toolVersion: '1',
				capturedAt: 'now',
				context,
			}).exposure.highlightRecoveryStops
		).toBe(4);
	});

	// The sidecar is the record of how an image was actually made, so it has to
	// distinguish "interpolation was on" from "interpolation was asked for".
	it('records interpolation as null when there is nothing to report', () => {
		expect(sidecar().interpolation).toBeNull();
		expect(sidecar().sampling.synthesized).toBe(0);
	});

	it('records what interpolation actually did, with the MEASURED synthetic count', () => {
		const result = buildSidecar({
			recipe: normalizeRecipe({ interpolationFactor: 4 }, recipe),
			plan,
			stats,
			backend: 'd3d11-compute',
			interpolation: {
				requestedFactor: 4,
				enabled: true,
				achievedFactor: 4,
				reason: null,
				gridSize: 4,
				bidirectional: true,
				meanFrameMs: 6.25,
				maxFrameMs: 18,
				setupFrameMs: 33,
				load: 14.746,
				achievedRatio: 0.95,
			},
			// Deliberately NOT (factor-1) x accepted: frames whose flow estimation
			// failed contribute a real sample and no synthetic ones, and the sidecar
			// must record what happened rather than what was predicted.
			synthesizedSamples: 41,
			imageWidth: 1920,
			imageHeight: 1080,
			toolName: 'iRacing Screenshot Tool',
			toolVersion: '3.2.0',
			capturedAt: '2026-08-02T12:00:00.000Z',
			context,
		});

		expect(result.interpolation).toMatchObject({
			requestedFactor: 4,
			enabled: true,
			achievedFactor: 4,
			meanFrameMs: 6.25,
		});
		expect(result.sampling.synthesized).toBe(41);
		// The real sample count stays exactly what it was, so it remains comparable
		// against a shot taken with interpolation off.
		expect(result.sampling.achieved).toBe(stats.accepted);
		// The diagnostics that actually answer "did interpolation cost real frames"
		// have to reach the sidecar — an explicit field-by-field mapping here once
		// dropped all three of these silently.
		expect(result.interpolation?.setupFrameMs).toBe(33);
		expect(result.interpolation?.load).toBe(14.746);
		expect(result.interpolation?.achievedRatio).toBe(0.95);
	});

	it('records a declined request honestly rather than as success', () => {
		const result = buildSidecar({
			recipe: normalizeRecipe({ interpolationFactor: 8 }, recipe),
			plan,
			stats,
			backend: 'd3d11-compute',
			interpolation: {
				requestedFactor: 8,
				enabled: false,
				achievedFactor: 1,
				reason: 'pre-Turing GPU',
				gridSize: 0,
				bidirectional: false,
				meanFrameMs: null,
				maxFrameMs: null,
				setupFrameMs: null,
				load: 3.686,
				achievedRatio: 1.02,
			},
			synthesizedSamples: 0,
			imageWidth: 1920,
			imageHeight: 1080,
			toolName: 'iRacing Screenshot Tool',
			toolVersion: '3.2.0',
			capturedAt: '2026-08-02T12:00:00.000Z',
			context,
		});

		// The recipe still says what was asked for; the report says what happened.
		expect(result.recipe.interpolationFactor).toBe(8);
		expect(result.interpolation?.enabled).toBe(false);
		expect(result.interpolation?.achievedFactor).toBe(1);
		expect(result.sampling.synthesized).toBe(0);
	});

	// The requested exposure and the one replay-frame quantisation actually
	// produced are different numbers, and both are reported.
	it('records requested and effective exposure separately', () => {
		const result = sidecar();
		expect(result.exposure.requestedMs).toBeCloseTo(125);
		expect(result.exposure.effectiveMs).toBeCloseTo((8 / 60) * 1000);
		expect(result.exposure.windowFrames).toBe(8);
	});

	it('records the trailing window bounds and the anchor', () => {
		const result = sidecar();
		expect(result.exposure.anchorFrame).toBe(5000);
		expect(result.exposure.startFrame).toBe(4992);
	});

	// Sub-frame window starts are estimated within a replay frame, so the planned
	// exposure alone no longer tells a re-shoot whether it matched. The achieved
	// window sits next to it (design note §9).
	it('records the window the samples actually covered', () => {
		expect(sidecar().sampling.achievedWindowSeconds).toBeCloseTo(59 / 60, 5);
	});

	// A shot at 1/250 used to write effectiveMs 16.67 — the honest report of a
	// window it never asked for. It now writes the window it was given.
	it('writes a sub-frame effective exposure for a fast shutter', () => {
		const fast = normalizeRecipe({ shutter: '1/250' }, recipe);
		const result = buildSidecar({
			recipe: fast,
			plan: resolvePlan(fast, { renderFps: 60 }),
			stats,
			backend: 'd3d11-compute',
			imageWidth: 1920,
			imageHeight: 1080,
			toolName: 'iRacing Screenshot Tool',
			toolVersion: '3.2.0',
			capturedAt: '2026-08-02T12:00:00.000Z',
			context,
		});
		expect(result.exposure.effectiveMs).toBeCloseTo(4, 6);
		expect(result.exposure.windowFrames).toBe(1);
		expect(result.exposure.startFrame).toBe(4999);
	});

	it('describes the playback speed the way the user chose it', () => {
		expect(sidecar().exposure.playbackSpeed).toBe('1/8');
		const realtime = normalizeRecipe({ playbackSpeed: 1 }, recipe);
		expect(
			buildSidecar({
				recipe: realtime,
				plan: resolvePlan(realtime),
				stats,
				backend: null,
				imageWidth: 1,
				imageHeight: 1,
				toolName: 't',
				toolVersion: 'v',
				capturedAt: 'now',
				context,
			}).exposure.playbackSpeed
		).toBe('1x');
	});

	// Predicted vs achieved is the honesty check: the user is told what they got,
	// not what we hoped for.
	it('reports predicted and ACHIEVED sampling side by side', () => {
		const result = sidecar();
		expect(result.sampling.predicted).toBe(plan.predictedSamples);
		expect(result.sampling.achieved).toBe(60);
		expect(result.sampling.duplicatesRejected).toBe(0);
		expect(result.sampling.evenness).toBeGreaterThan(0.9);
	});

	it('records the compute backend so shots are attributable', () => {
		expect(sidecar().compute.backend).toBe('d3d11-compute');
	});

	it('records the render size and supersample alongside the output size', () => {
		const result = sidecar();
		expect(result.image.width).toBe(1920);
		expect(result.image.supersample).toBe(2);
		expect(result.image.renderWidth).toBe(3840);
		expect(result.image.bitDepth).toBe(16);
	});

	it('reports 8-bit depth for a non-png16 master', () => {
		const jpeg = normalizeRecipe({ outputFormat: 'jpeg' }, recipe);
		expect(
			buildSidecar({
				recipe: jpeg,
				plan,
				stats,
				backend: null,
				imageWidth: 1,
				imageHeight: 1,
				toolName: 't',
				toolVersion: 'v',
				capturedAt: 'now',
				context,
			}).image.bitDepth
		).toBe(8);
	});

	// The Spotter Pack seam: the field is threaded end-to-end in v1 and simply
	// always null, so adding batch capture changes no other file.
	it('carries a variantId field that is null in v1', () => {
		expect(sidecar().context.variantId).toBeNull();
		const variant = normalizeRecipe({ variantId: 'gt3-blue' }, recipe);
		expect(
			buildSidecar({
				recipe: variant,
				plan,
				stats,
				backend: null,
				imageWidth: 1,
				imageHeight: 1,
				toolName: 't',
				toolVersion: 'v',
				capturedAt: 'now',
				context,
			}).context.variantId
		).toBe('gt3-blue');
	});
});

describe('extractSessionContext', () => {
	const sessionInfo = {
		data: {
			WeekendInfo: {
				TrackDisplayName: 'Spa-Francorchamps',
				EventType: 'Race',
			},
			DriverInfo: {
				DriverCarIdx: 2,
				Drivers: [
					{ CarIdx: 0, UserName: 'Other', CarScreenName: 'Car A' },
					{ CarIdx: 1, UserName: 'Another', CarScreenName: 'Car B' },
					{
						CarIdx: 2,
						UserName: 'Me',
						CarScreenName: 'Porsche 992 GT3 R',
					},
				],
			},
			SessionInfo: {
				Sessions: [
					{ SessionNum: 0, SessionType: 'Practice' },
					{ SessionNum: 1, SessionType: 'Race' },
				],
			},
		},
	};

	it('resolves the player car, track, driver and session type', () => {
		const context = extractSessionContext(sessionInfo, {
			values: { SessionNum: 1 },
		});
		expect(context).toEqual({
			track: 'Spa-Francorchamps',
			car: 'Porsche 992 GT3 R',
			driver: 'Me',
			sessionType: 'Race',
		});
	});

	// The sidecar must never be the reason a shot is lost, so every field degrades
	// to null instead of throwing.
	it('degrades every field to null rather than throwing', () => {
		expect(extractSessionContext(null, null)).toEqual({
			track: null,
			car: null,
			driver: null,
			sessionType: null,
		});
		expect(extractSessionContext({}, {})).toEqual({
			track: null,
			car: null,
			driver: null,
			sessionType: null,
		});
		expect(
			extractSessionContext(
				{ data: { DriverInfo: { Drivers: 'nope' } } },
				{}
			).car
		).toBeNull();
	});

	it('falls back to the internal track name when there is no display name', () => {
		expect(
			extractSessionContext(
				{ data: { WeekendInfo: { TrackName: 'spa gp' } } },
				{}
			).track
		).toBe('spa gp');
	});

	it('falls back to the weekend event type when the session is not found', () => {
		expect(
			extractSessionContext(sessionInfo, { values: { SessionNum: 99 } })
				.sessionType
		).toBe('Race');
	});
});
