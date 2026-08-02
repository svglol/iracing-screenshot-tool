import { describe, expect, it, vi } from 'vitest';
import { GiB } from '../../utilities/vram-prediction';
import {
	createDefaultRecipe,
	normalizeRecipe,
	type LongExposureRecipe,
} from '../../utilities/long-exposure/shot-recipe';
import { ReplayController, type ReplayState } from './replay-control';
import {
	buildInterpolationReport,
	diagnoseInterpolationShortfall,
	executeRecipe,
	SAMPLE_SHORTFALL_RATIO,
	type CaptureSessionDeps,
	type LongExposureInterpolationReport,
	type NativeSessionApi,
} from './capture-session';

vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

const ANCHOR = 5000;

function recipe(
	overrides: Partial<LongExposureRecipe> = {}
): LongExposureRecipe {
	return normalizeRecipe(
		{ shutter: '1/8', playbackSpeed: 4, ...overrides },
		createDefaultRecipe({
			anchorFrame: ANCHOR,
			sessionNum: 1,
			width: 640,
			height: 360,
			outputDir: 'C:\\shots',
		})
	);
}

interface HarnessOptions {
	// Frames per poll while "playing". 0 means the transport never advances.
	framesPerPoll?: number;
	startFrame?: number;
	nativeOverrides?: Partial<NativeSessionApi>;
	native?: NativeSessionApi | null;
	freeVramGiB?: number;
	// True simulates iRacing's window not being found (resizeWindow -> undefined).
	// A flag rather than `windowHandle: undefined`, which a default would swallow.
	windowMissing?: boolean;
	signal?: { aborted: boolean };
	// Force the restore seek to miss, to prove the outcome reports it honestly.
	restoreLands?: boolean;
}

function makeHarness(options: HarnessOptions = {}) {
	const {
		framesPerPoll = 6,
		startFrame = ANCHOR,
		freeVramGiB = 16,
		windowMissing = false,
		restoreLands = true,
	} = options;

	let clock = 0;
	let playing = false;
	const events: string[] = [];

	const state: ReplayState = {
		replayFrameNum: startFrame,
		replayFrameNumEnd: 100000,
		replaySessionTime: 500,
		replaySessionNum: 1,
		replayPlaySpeed: 0,
		replayPlaySlowMotion: false,
		isReplayPlaying: false,
		frameRate: 60,
	};

	// Simulated transport: reading telemetry advances the cursor while "playing",
	// which is how the accumulation loop makes progress.
	const replay = new ReplayController({
		readState: () => {
			if (playing) {
				state.replayFrameNum += framesPerPoll;
				state.replaySessionTime =
					(state.replaySessionTime as number) + framesPerPoll / 60;
			}
			return { ...state };
		},
		setPlaySpeed: (speed) => {
			events.push(`speed:${speed}`);
			playing = speed !== 0;
		},
		setPlayPosition: (mode, frame) => {
			events.push(`seek:${mode}:${frame}`);
			playing = false;
			if (mode === 0) {
				state.replayFrameNum = restoreLands ? frame : frame + 4;
			} else {
				state.replayFrameNum += restoreLands ? frame : 0;
			}
		},
		delay: async (ms) => {
			clock += ms;
		},
		now: () => clock,
	});

	let accepted = 0;
	const rejected = 0;
	let gateOpen = false;
	const nativeCalls: string[] = [];

	// What the recipe asked the native side for, so a test can assert the factor was
	// actually threaded rather than merely accepted by the type checker.
	const begunWith: Array<number | undefined> = [];
	const highlightBegunWith: Array<number | undefined> = [];

	const defaultNative: NativeSessionApi = {
		longExposureBegin: (_hwnd, interpolationFactor, highlightRecoveryStops) => {
			nativeCalls.push('begin');
			begunWith.push(interpolationFactor);
			highlightBegunWith.push(highlightRecoveryStops);
			return 7;
		},
		longExposureSetSample: () => {
			// A frame only lands while the gate is open — mirroring the addon, where
			// the gate is what stops pre-roll and post-anchor frames joining.
			if (gateOpen) {
				accepted += 1;
			}
		},
		longExposureSetGate: (_session, open) => {
			gateOpen = open;
		},
		longExposureStats: () => ({
			accepted,
			rejected,
			sawFrame: true,
			frameWidth: 640,
			frameHeight: 360,
			error: null,
		}),
		longExposureFinish: () => {
			nativeCalls.push('finish');
			return {
				data: Buffer.alloc(640 * 360 * 8),
				width: 640,
				height: 360,
				accepted,
				rejected,
				backend: 'd3d11-compute',
				samples: Array.from({ length: accepted }, (_, i) => ({
					u: accepted > 1 ? i / (accepted - 1) : 1,
					sessionTime: 500 + i / 60,
					replayFrameNum: ANCHOR - accepted + i,
					digest: `d${i}`,
					presentedAt: String(i),
					accepted: true,
				})),
				error: null,
			};
		},
		longExposureAbort: () => {
			nativeCalls.push('abort');
		},
	};

	const native =
		options.native === null
			? null
			: { ...defaultNative, ...(options.nativeOverrides || {}) };

	const deps: CaptureSessionDeps = {
		replay,
		native,
		backendName: 'd3d11-compute',
		backendUnavailableReason: 'no compute backend on this machine',
		resizeWindow: async () => {
			events.push('resize');
			return windowMissing ? undefined : 4242;
		},
		restoreWindow: () => {
			events.push('restoreWindow');
		},
		vramInfo: () => ({
			totalBytes: 24 * GiB,
			usedBytes: (24 - freeVramGiB) * GiB,
			source: 'native',
		}),
		baselineDims: () => ({ width: 640, height: 360 }),
		delay: async (ms) => {
			clock += ms;
		},
		now: () => clock,
		signal: options.signal,
	};

	return {
		deps,
		events,
		nativeCalls,
		begunWith,
		highlightBegunWith,
		state,
		replay,
	};
}

// Every outcome must show the cursor going back to the anchor. This helper is used
// by nearly every test below, because the restore guarantee is the point.
function expectAnchorRestored(events: string[]): void {
	expect(events).toContain(`seek:0:${ANCHOR}`);
}

describe('executeRecipe — happy path', () => {
	it('captures, resolves, and reports achieved sampling', async () => {
		const harness = makeHarness();
		const outcome = await executeRecipe(recipe(), harness.deps);

		expect(outcome.ok).toBe(true);
		expect(outcome.failure).toBeNull();
		expect(outcome.image?.width).toBe(640);
		expect(outcome.stats?.accepted).toBeGreaterThan(0);
		expect(outcome.backend).toBe('d3d11-compute');
	});

	it('seeks BEHIND the anchor and terminates ON it', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe({ shutter: '1/8' }), harness.deps);

		// 1/8s quantises to 8 replay frames, and the pre-roll seek adds a lead.
		const seek = harness.events.find((e) => e.startsWith('seek:0:'));
		const target = Number(seek?.split(':')[2]);
		expect(target).toBeLessThan(ANCHOR);
		expect(target).toBeGreaterThanOrEqual(ANCHOR - 8 - 3);
	});

	it('rolls at the chosen slow-motion divisor and pauses afterwards', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe({ playbackSpeed: 8 }), harness.deps);
		expect(harness.events).toContain('speed:8');
		expect(
			harness.events.filter((e) => e === 'speed:0').length
		).toBeGreaterThan(0);
	});

	it('restores the window before returning the cursor', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe(), harness.deps);
		const windowAt = harness.events.indexOf('restoreWindow');
		const anchorAt = harness.events.lastIndexOf(`seek:0:${ANCHOR}`);
		expect(windowAt).toBeGreaterThanOrEqual(0);
		expect(anchorAt).toBeGreaterThan(windowAt);
	});

	it('returns the cursor to the anchor', async () => {
		const harness = makeHarness();
		const outcome = await executeRecipe(recipe(), harness.deps);
		expectAnchorRestored(harness.events);
		expect(outcome.restore.attempted).toBe(true);
		expect(outcome.restore.landedExactly).toBe(true);
		expect(outcome.restore.finalFrame).toBe(ANCHOR);
	});

	// The recipe carries the anchor precisely so a re-shoot after scrubbing is
	// impossible to get wrong.
	it('uses the RECIPE anchor, not wherever the cursor happens to be', async () => {
		const harness = makeHarness({ startFrame: 9000 });
		await executeRecipe(recipe(), harness.deps);
		expectAnchorRestored(harness.events);
	});
});

describe('executeRecipe — the restore guarantee holds on every failure path', () => {
	it('restores after a failed pre-roll seek', async () => {
		// framesPerPoll 0 with a seek that lands short: the window start is never
		// reached... force it by making the seek land far away.
		const harness = makeHarness({ framesPerPoll: 0, restoreLands: true });
		harness.deps.replay.seekToWindowStart = async () => ({
			landed: false,
			frame: 1,
			elapsedMs: 4000,
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('seek-failed');
		expectAnchorRestored(harness.events);
		expect(outcome.restore.attempted).toBe(true);
	});

	it('restores when the transport never starts', async () => {
		const harness = makeHarness({ framesPerPoll: 0 });
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('playback-stalled');
		expectAnchorRestored(harness.events);
	});

	it('restores when no frames were accumulated', async () => {
		const harness = makeHarness({
			nativeOverrides: {
				longExposureStats: () => ({
					accepted: 0,
					rejected: 0,
					sawFrame: true,
					frameWidth: 640,
					frameHeight: 360,
					error: null,
				}),
			},
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('no-samples');
		expectAnchorRestored(harness.events);
	});

	it('restores when the GPU resolve returns nothing', async () => {
		const harness = makeHarness({
			nativeOverrides: {
				longExposureFinish: () => ({
					data: null,
					width: 0,
					height: 0,
					accepted: 10,
					rejected: 0,
					backend: 'd3d11-compute',
					samples: [],
					error: 'device removed',
				}),
			},
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('resolve-failed');
		expect(outcome.message).toMatch(/device removed/);
		expectAnchorRestored(harness.events);
	});

	it('restores when the native layer throws mid-capture', async () => {
		const harness = makeHarness({
			nativeOverrides: {
				longExposureSetSample: () => {
					throw new Error('addon exploded');
				},
			},
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.ok).toBe(false);
		expect(outcome.message).toMatch(/addon exploded/);
		expectAnchorRestored(harness.events);
	});

	it('restores when the user aborts', async () => {
		const signal = { aborted: false };
		const harness = makeHarness({ signal });
		// Abort as soon as the window resize happens, i.e. mid-flight.
		harness.deps.resizeWindow = async () => {
			signal.aborted = true;
			return 4242;
		};
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('aborted');
		expectAnchorRestored(harness.events);
	});

	it('restores when iRacing window cannot be found', async () => {
		const harness = makeHarness({ windowMissing: true });
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('window-unavailable');
		expectAnchorRestored(harness.events);
	});

	// Tearing the GPU session down before resizing iRacing back matters: its VRAM
	// has to be released first, and a hung capture thread must not outlive us.
	it('aborts a live native session before restoring the window', async () => {
		const harness = makeHarness({ framesPerPoll: 0 });
		await executeRecipe(recipe(), harness.deps);
		expect(harness.nativeCalls).toContain('abort');
	});

	it('does not double-free a session the resolve already consumed', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe(), harness.deps);
		expect(harness.nativeCalls).toContain('finish');
		expect(harness.nativeCalls).not.toContain('abort');
	});
});

describe('executeRecipe — pre-flight refusals move nothing', () => {
	// These fail BEFORE the cursor is touched, so there is nothing to restore and
	// no window to put back.
	it('refuses an anchor too close to the start of the replay', async () => {
		const harness = makeHarness();
		const outcome = await executeRecipe(
			recipe({ anchorFrame: 3, shutter: '1' }),
			harness.deps
		);
		expect(outcome.failure).toBe('invalid-recipe');
		expect(harness.events).not.toContain('resize');
		expect(outcome.restore.attempted).toBe(false);
	});

	it('refuses when our own accumulators cannot fit in VRAM', async () => {
		const harness = makeHarness({ freeVramGiB: 0.05 });
		const outcome = await executeRecipe(
			recipe({ width: 7680, height: 4320, supersample: 2 }),
			harness.deps
		);
		expect(outcome.failure).toBe('insufficient-vram');
		expect(outcome.message).toMatch(/video memory/);
		expect(harness.events).not.toContain('resize');
	});

	it('refuses with a reason when the compute backend is unavailable', async () => {
		const harness = makeHarness({ native: null });
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('backend-unavailable');
		expect(outcome.message).toMatch(/no compute backend/);
		expect(harness.events).not.toContain('resize');
	});

	it('refuses when iRacing is not in a replay at all', async () => {
		const harness = makeHarness();
		harness.deps.replay.state = () => null;
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('invalid-recipe');
		expect(outcome.message).toMatch(/not showing a replay/);
	});
});

// Frame interpolation is an OPTIONAL accelerator. The contract these tests pin down
// is that it can only ever add in-betweens — it can never change whether a shot
// works, silently claim it happened, or hide that it did not.
describe('frame interpolation', () => {
	function nativeWithInterpolation(
		status: {
			enabled: boolean;
			factor: number;
			reason: string | null;
			gridSize: number;
			bidirectional: boolean;
		} | null,
		synthesized = 0,
		// Comfortably above any prediction the harness can produce, so the default
		// fixture represents a capture that KEPT UP. Tests that want the fall-behind
		// case pass a small number explicitly.
		accepted = 500
	): Partial<NativeSessionApi> {
		return {
			longExposureFinish: () => ({
				data: Buffer.alloc(640 * 360 * 8),
				width: 640,
				height: 360,
				accepted,
				synthesized,
				rejected: 0,
				backend: 'd3d11-compute',
				meanFrameMs: 4.5,
				maxFrameMs: 9.25,
				setupFrameMs: 33,
				interpolation: status,
				samples: [],
				error: null,
			}),
		};
	}

	it('passes the recipe factor through to the native session', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe({ interpolationFactor: 4 }), harness.deps);
		expect(harness.begunWith).toEqual([4]);
	});

	it('defaults to off, so nothing changes for a recipe that never asked', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe(), harness.deps);
		expect(harness.begunWith).toEqual([1]);
	});

	it('reports what the hardware actually delivered', async () => {
		const harness = makeHarness({
			nativeOverrides: nativeWithInterpolation(
				{
					enabled: true,
					factor: 4,
					reason: null,
					gridSize: 4,
					bidirectional: true,
				},
				36
			),
		});
		const outcome = await executeRecipe(
			recipe({ interpolationFactor: 4 }),
			harness.deps
		);

		expect(outcome.ok).toBe(true);
		expect(outcome.interpolation).toMatchObject({
			requestedFactor: 4,
			enabled: true,
			achievedFactor: 4,
			bidirectional: true,
			realSamples: 500,
			syntheticSamples: 36,
		});
		// No warning when it worked.
		expect(outcome.warnings.join(' ')).not.toMatch(/interpolation/i);
	});

	// The exact case seen in the field: interpolation ran, but consumption fell behind
	// the sim, so real samples were traded for synthetic ones. The image looks merely
	// under-blurred, which is why it has to be said out loud.
	it('warns when interpolation ran but could not keep up', async () => {
		const harness = makeHarness({
			nativeOverrides: nativeWithInterpolation(
				{
					enabled: true,
					factor: 8,
					reason: null,
					gridSize: 4,
					bidirectional: true,
				},
				14,
				3
			),
		});
		const outcome = await executeRecipe(
			recipe({ interpolationFactor: 8, supersample: 2 }),
			harness.deps
		);

		// The shot still succeeds — this is a quality warning, not a failure.
		expect(outcome.ok).toBe(true);
		expect(outcome.image).not.toBeNull();
		expect(outcome.warnings.join(' ')).toMatch(/could not keep up/i);
		expect(outcome.warnings.join(' ')).toMatch(/supersampling/i);
		expect(outcome.interpolation?.achievedRatio).toBeLessThan(0.6);
		expectAnchorRestored(harness.events);
	});

	// The case that must never look like success: asked for, hardware said no.
	it('still captures, and warns, when the hardware cannot interpolate', async () => {
		const harness = makeHarness({
			nativeOverrides: nativeWithInterpolation({
				enabled: false,
				factor: 1,
				reason: 'nvofapi64.dll could not be loaded (no NVIDIA driver?)',
				gridSize: 0,
				bidirectional: false,
			}),
		});
		const outcome = await executeRecipe(
			recipe({ interpolationFactor: 8 }),
			harness.deps
		);

		// The shot succeeds. That is the whole point of failing soft.
		expect(outcome.ok).toBe(true);
		expect(outcome.image).not.toBeNull();
		expect(outcome.interpolation).toMatchObject({
			requestedFactor: 8,
			enabled: false,
			// Never claim the requested factor when it was declined.
			achievedFactor: 1,
			syntheticSamples: 0,
		});
		expect(outcome.warnings.join(' ')).toMatch(
			/interpolation was requested but is not available/i
		);
		expect(outcome.warnings.join(' ')).toMatch(/nvofapi64/);
		expectAnchorRestored(harness.events);
	});

	// An addon predating the feature reports nothing at all.
	it('treats an addon that reports no interpolation as interpolation-off', async () => {
		const harness = makeHarness({
			nativeOverrides: nativeWithInterpolation(null),
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.ok).toBe(true);
		expect(outcome.interpolation).toMatchObject({
			enabled: false,
			achievedFactor: 1,
		});
		// Nothing was requested, so nothing to warn about.
		expect(outcome.warnings.join(' ')).not.toMatch(/interpolation/i);
	});

	it('carries the per-frame cost through, so a slowdown is visible', async () => {
		const harness = makeHarness({
			nativeOverrides: nativeWithInterpolation(
				{
					enabled: true,
					factor: 2,
					reason: null,
					gridSize: 4,
					bidirectional: true,
				},
				12
			),
		});
		const outcome = await executeRecipe(
			recipe({ interpolationFactor: 2 }),
			harness.deps
		);
		expect(outcome.interpolation?.meanFrameMs).toBe(4.5);
		expect(outcome.interpolation?.maxFrameMs).toBe(9.25);
	});
});

// Highlight recovery is deliberately NOT hardware-conditional: it is a shader
// constant, so unlike interpolation what is asked for is always what happens. These
// tests pin that it is threaded, and that off stays off.
describe('highlight recovery', () => {
	it('passes the recipe value through to the native session', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe({ highlightRecovery: 4.5 }), harness.deps);
		expect(harness.highlightBegunWith).toEqual([4.5]);
	});

	it('defaults to 0, so an untouched recipe changes nothing', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe(), harness.deps);
		expect(harness.highlightBegunWith).toEqual([0]);
	});

	// It needs no particular GPU, so unlike interpolation it must never produce a
	// "not available on this machine" warning.
	it('never warns about hardware support', async () => {
		const harness = makeHarness();
		const outcome = await executeRecipe(
			recipe({ highlightRecovery: 8 }),
			harness.deps
		);
		expect(outcome.ok).toBe(true);
		expect(outcome.warnings.join(' ')).not.toMatch(/highlight/i);
	});
});

describe('buildInterpolationReport', () => {
	it('never claims a factor the hardware declined', () => {
		const report = buildInterpolationReport({
			requestedFactor: 8,
			status: {
				enabled: false,
				factor: 8,
				reason: 'pre-Turing GPU',
				gridSize: 0,
				bidirectional: false,
			},
			realSamples: 100,
			syntheticSamples: 0,
			meanFrameMs: null,
			maxFrameMs: null,
			setupFrameMs: null,
			renderWidth: 2560,
			renderHeight: 1440,
			predictedSamples: 100,
		});
		expect(report.requestedFactor).toBe(8);
		expect(report.enabled).toBe(false);
		expect(report.achievedFactor).toBe(1);
		expect(report.reason).toBe('pre-Turing GPU');
	});

	it('treats a missing status as off rather than throwing', () => {
		const report = buildInterpolationReport({
			requestedFactor: 4,
			status: undefined,
			realSamples: 50,
			syntheticSamples: 0,
			meanFrameMs: null,
			maxFrameMs: null,
			setupFrameMs: null,
			renderWidth: 2560,
			renderHeight: 1440,
			predictedSamples: 100,
		});
		expect(report.enabled).toBe(false);
		expect(report.achievedFactor).toBe(1);
		expect(report.reason).toBeNull();
	});

	it('keeps real and synthetic counts separate', () => {
		const report = buildInterpolationReport({
			requestedFactor: 4,
			status: {
				enabled: true,
				factor: 4,
				reason: null,
				gridSize: 4,
				bidirectional: true,
			},
			realSamples: 200,
			syntheticSamples: 597,
			meanFrameMs: 6.1,
			maxFrameMs: 20,
			setupFrameMs: 33,
			renderWidth: 2560,
			renderHeight: 1440,
			predictedSamples: 200,
		});
		// The two must never be merged: comparing realSamples across interpolation
		// on/off at the same settings is the only way to see whether synthetic
		// samples were bought with real ones.
		expect(report.realSamples).toBe(200);
		expect(report.syntheticSamples).toBe(597);
	});

	it('computes load as render megapixels x achieved factor', () => {
		const report = buildInterpolationReport({
			requestedFactor: 8,
			status: {
				enabled: true,
				factor: 8,
				reason: null,
				gridSize: 4,
				bidirectional: true,
			},
			realSamples: 3,
			syntheticSamples: 14,
			meanFrameMs: 30.7,
			maxFrameMs: 53,
			setupFrameMs: 33,
			renderWidth: 5120,
			renderHeight: 2880,
			predictedSamples: 11,
		});
		// 5120x2880 = 14.7456 Mpx, x8 = 117.965
		expect(report.load).toBeCloseTo(117.965, 2);
		expect(report.achievedRatio).toBeCloseTo(3 / 11, 3);
	});

	// A declined request has an achieved factor of 1, so its load must reflect what
	// actually ran — otherwise the machine would "learn" a limit from work it never did.
	it('bases load on the achieved factor, not the requested one', () => {
		const report = buildInterpolationReport({
			requestedFactor: 8,
			status: {
				enabled: false,
				factor: 8,
				reason: 'no NVIDIA driver',
				gridSize: 0,
				bidirectional: false,
			},
			realSamples: 100,
			syntheticSamples: 0,
			meanFrameMs: 2,
			maxFrameMs: 5,
			setupFrameMs: 1,
			renderWidth: 2560,
			renderHeight: 1440,
			predictedSamples: 100,
		});
		expect(report.load).toBeCloseTo(3.6864, 3);
	});
});

// The failure the user actually hit: interpolation ran, but consumption fell behind
// the sim, so real samples were traded for synthetic ones and the image came out
// under-blurred rather than obviously broken.
describe('diagnoseInterpolationShortfall', () => {
	const report = (over: Partial<LongExposureInterpolationReport> = {}) =>
		({
			requestedFactor: 8,
			enabled: true,
			achievedFactor: 8,
			reason: null,
			gridSize: 4,
			bidirectional: true,
			realSamples: 3,
			syntheticSamples: 14,
			meanFrameMs: 30.7,
			maxFrameMs: 53,
			setupFrameMs: 33,
			load: 117.965,
			achievedRatio: 3 / 11,
			...over,
		}) as LongExposureInterpolationReport;

	it('flags a capture that fell well short of its predicted real samples', () => {
		const message = diagnoseInterpolationShortfall(report(), {
			supersample: 2,
		});
		expect(message).toMatch(/could not keep up/i);
		expect(message).toMatch(/3 real frames/);
		// Supersample on is the cheapest thing to give up, and it buys samples twice.
		expect(message).toMatch(/supersampling/i);
	});

	it('suggests a lower factor when supersampling is already off', () => {
		const message = diagnoseInterpolationShortfall(report(), {
			supersample: 1,
		});
		expect(message).toMatch(/lower the interpolation factor/i);
		expect(message).not.toMatch(/supersampling/i);
	});

	it('stays silent when the capture kept up', () => {
		expect(
			diagnoseInterpolationShortfall(
				report({ realSamples: 13, achievedRatio: 13 / 12 }),
				{ supersample: 2 }
			)
		).toBeNull();
	});

	// Sample counts bounce run to run and the predictor is only good to ~6%, so a
	// modest shortfall must not cry wolf. Five interpolation-off shots at identical
	// 5120x2880 settings varied +/-13% in sample count, and the WORST unaffected shot
	// landed at exactly 1.00 of prediction — so the tolerated band has to reach
	// meaningfully below 1.0.
	it('tolerates a modest shortfall', () => {
		expect(
			diagnoseInterpolationShortfall(report({ achievedRatio: 0.9 }), {
				supersample: 1,
			})
		).toBeNull();
	});

	// THE REGRESSION THIS THRESHOLD EXISTS FOR. Shot 25 at 5120x2880 landed at 0.636
	// of prediction — 7 real samples against an interpolation-off baseline of 15, so
	// it lost more than half of them — and the original 0.6 threshold passed it in
	// silence. That is the worst possible outcome here, because the image comes out
	// looking merely under-blurred rather than obviously broken, so the user has no
	// reason to suspect the setting rather than the scene.
	it('flags the mid-range shortfall the original threshold let through', () => {
		const message = diagnoseInterpolationShortfall(
			report({ realSamples: 7, achievedRatio: 0.636 }),
			{ supersample: 2 }
		);
		expect(message).toMatch(/could not keep up/i);
		expect(message).toMatch(/7 real frames/);
	});

	// The two consumers of this constant — the post-shot warning here and the
	// load-limit learning in index.ts — must fire on identical evidence. index.ts used
	// to re-type the number and was left behind when it changed.
	it('draws the line where SAMPLE_SHORTFALL_RATIO says, on both sides', () => {
		const justUnder = SAMPLE_SHORTFALL_RATIO - 0.001;
		const justOver = SAMPLE_SHORTFALL_RATIO + 0.001;
		expect(
			diagnoseInterpolationShortfall(report({ achievedRatio: justUnder }), {
				supersample: 1,
			})
		).toMatch(/could not keep up/i);
		expect(
			diagnoseInterpolationShortfall(report({ achievedRatio: justOver }), {
				supersample: 1,
			})
		).toBeNull();
	});

	it('says nothing when interpolation never ran', () => {
		expect(
			diagnoseInterpolationShortfall(
				report({ enabled: false, achievedFactor: 1, achievedRatio: 0.1 }),
				{ supersample: 1 }
			)
		).toBeNull();
	});
});

describe('executeRecipe — reporting', () => {
	// The user must be told when their cursor did not come back exactly, because
	// re-shooting the same moment then will not match.
	it('warns when the anchor could not be restored exactly', async () => {
		const harness = makeHarness({ restoreLands: false });
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.restore.landedExactly).toBe(false);
		expect(outcome.warnings.join(' ')).toMatch(
			/could not be returned exactly/
		);
	});

	it('carries plan warnings through to the outcome', async () => {
		const harness = makeHarness();
		const outcome = await executeRecipe(
			recipe({ shutter: '1/1000' }),
			harness.deps
		);
		expect(outcome.warnings.join(' ')).toMatch(/no motion blur/);
	});

	it('treats a resolve warning that still produced an image as a warning', async () => {
		const harness = makeHarness({
			nativeOverrides: {
				longExposureFinish: () => ({
					data: Buffer.alloc(640 * 360 * 8),
					width: 640,
					height: 360,
					accepted: 20,
					rejected: 3,
					backend: 'd3d11-compute',
					samples: [],
					error: 'one frame was skipped',
				}),
			},
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.ok).toBe(true);
		expect(outcome.warnings.join(' ')).toMatch(/one frame was skipped/);
	});

	it('reports progress phases as the capture proceeds', async () => {
		const harness = makeHarness();
		const phases: string[] = [];
		harness.deps.onProgress = (update) => phases.push(update.phase);
		await executeRecipe(recipe(), harness.deps);
		expect(phases).toContain('seeking');
		expect(phases).toContain('accumulating');
		expect(phases).toContain('resolving');
		expect(phases).toContain('restoring');
	});

	// The delivered frame size is WGC's to report — DPI and client-area geometry
	// mean it can differ from the size we asked the window to be.
	it('derives the output size from the frame WGC actually delivered', async () => {
		const captured: number[] = [];
		const harness = makeHarness({
			nativeOverrides: {
				longExposureStats: () => ({
					accepted: 12,
					rejected: 0,
					sawFrame: true,
					frameWidth: 1280,
					frameHeight: 720,
					error: null,
				}),
				longExposureFinish: (_s, w, h) => {
					captured.push(w, h);
					return {
						data: Buffer.alloc(w * h * 8),
						width: w,
						height: h,
						accepted: 12,
						rejected: 0,
						backend: 'd3d11-compute',
						samples: [],
						error: null,
					};
				},
			},
		});
		await executeRecipe(recipe({ supersample: 2 }), harness.deps);
		// 1280x720 delivered at 2x supersample resolves to 640x360.
		expect(captured).toEqual([640, 360]);
	});
});
