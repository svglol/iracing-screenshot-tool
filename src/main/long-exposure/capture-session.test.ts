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
	// FRACTIONAL values model slow motion honestly: at 1/16 playback a replay frame
	// lasts 267 ms of wall clock, so ~16 control ticks share one frame number and
	// the sub-frame interpolation is what distinguishes them. That is the only
	// regime in which a sub-replay-frame window means anything.
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
	// What the post-raise #10 re-sample reports: a refusal message, or null to
	// proceed. Undefined leaves the dep off entirely, which is the shape a caller
	// that never supplies it produces.
	fullscreenRefusal?: string | null;
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

	// Continuous cursor position. ReplayFrameNum is integral, so a fractional
	// advance rate has to accumulate somewhere the floor can be taken from.
	let framePosition = startFrame;

	// Simulated transport: reading telemetry advances the cursor while "playing",
	// which is how the accumulation loop makes progress.
	const replay = new ReplayController({
		readState: () => {
			if (playing) {
				framePosition += framesPerPoll;
				state.replayFrameNum = Math.floor(framePosition);
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
			framePosition = state.replayFrameNum;
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

	// Every sample that actually landed, as the addon would see it. The window is
	// only observable through these — a test that looks at counts alone cannot tell
	// a shorter window from a slower render.
	const pushes: Array<{
		weight: number;
		u: number;
		frameNum: number;
		sessionTime: number;
	}> = [];

	// What the recipe asked the native side for, so a test can assert the factor was
	// actually threaded rather than merely accepted by the type checker.
	const begunWith: Array<number | undefined> = [];
	const highlightBegunWith: Array<number | undefined> = [];

	// Index into `pushes` at which each pass began, so a test can slice the samples
	// per pass. Recorded from the addon's own pass declaration rather than inferred,
	// because inferring it from the sample stream is exactly what the pass index
	// exists to avoid.
	const passBoundaries: number[] = [];

	const defaultNative: NativeSessionApi = {
		longExposureBegin: (
			_hwnd,
			interpolationFactor,
			highlightRecoveryStops
		) => {
			nativeCalls.push('begin');
			begunWith.push(interpolationFactor);
			highlightBegunWith.push(highlightRecoveryStops);
			return 7;
		},
		longExposureSetSample: (_session, weight, u, frameNum, sessionTime) => {
			// A frame only lands while the gate is open — mirroring the addon, where
			// the gate is what stops pre-roll and post-anchor frames joining.
			if (gateOpen) {
				accepted += 1;
				pushes.push({ weight, u, frameNum, sessionTime });
			}
		},
		longExposureSetGate: (_session, open) => {
			gateOpen = open;
		},
		longExposureBeginPass: (_session, passIndex) => {
			nativeCalls.push(`beginPass:${passIndex}`);
			passBoundaries.push(pushes.length);
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
		...(options.fullscreenRefusal === undefined
			? {}
			: {
					exclusiveFullscreenRefusal: () => {
						events.push('fullscreenCheck');
						return options.fullscreenRefusal ?? null;
					},
				}),
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
		pushes,
		passBoundaries,
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

// The tape stores positions at 60 Hz, but iRacing renders ~10 distinct
// interpolated frames between each pair — so a window shorter than one replay
// frame is capturable, and the fast half of the shutter ladder stops resolving to
// 1/60. This is the same thing the hardware check looks for (streak length halving
// per stop), measured here as the sim-time span the samples actually cover.
describe('executeRecipe — sub-replay-frame exposure windows', () => {
	// 1/16 of a replay frame per tick is what 1/16 playback looks like: ~16 control
	// ticks share one frame number, distinguished only by sub-frame interpolation.
	const SLOW_MOTION = { framesPerPoll: 1 / 16 };

	async function shoot(shutter: string) {
		const harness = makeHarness(SLOW_MOTION);
		const outcome = await executeRecipe(
			recipe({ shutter, playbackSpeed: 16 }),
			harness.deps
		);
		const times = harness.pushes.map((push) => push.sessionTime);
		return {
			outcome,
			pushes: harness.pushes,
			// The sim time the exposure actually covered — the streak length.
			span: times.length ? times[times.length - 1] - times[0] : 0,
		};
	}

	it('halves the exposed window for each faster stop', async () => {
		const slow = await shoot('1/60');
		const mid = await shoot('1/125');
		const fast = await shoot('1/250');

		expect(slow.outcome.ok).toBe(true);
		expect(mid.outcome.ok).toBe(true);
		expect(fast.outcome.ok).toBe(true);
		// 1/60 is one whole replay frame, unchanged by any of this.
		expect(slow.span).toBeCloseTo(1 / 60, 5);

		// Each stop covers its nominal window, plus at most the one control tick the
		// gate opens early so the boundary weight has something to scale. At 1/16
		// playback a 16 ms tick is 1 ms of sim time.
		const TICK_SECONDS = 0.001;
		for (const [shot, nominal] of [
			[mid, 1 / 125],
			[fast, 1 / 250],
		] as const) {
			expect(shot.span).toBeGreaterThanOrEqual(nominal);
			expect(shot.span).toBeLessThanOrEqual(nominal + TICK_SECONDS * 1.5);
			// ...and that early tick is scaled by how much of it fell inside, so the
			// weighted window is the nominal one rather than a tick too long.
			expect(shot.pushes[0].weight).toBeLessThan(1);
		}

		// Fewer samples, and that is the correct result rather than a shortfall:
		// a shorter shutter collects less of the same stream.
		expect(mid.pushes.length).toBeLessThan(slow.pushes.length);
		expect(fast.pushes.length).toBeLessThan(mid.pushes.length);
	});

	// Before this, all five of these produced a byte-identical plan and therefore
	// the same image out of five differently-named files.
	it('no longer delivers 1/60 when asked for 1/1000', async () => {
		const slow = await shoot('1/60');
		const fastest = await shoot('1/1000');
		expect(fastest.span).toBeLessThan(slow.span / 8);
	});

	// Every sample has to sit inside the window it claims, and the window has to
	// end on the anchor. Only the START moved.
	it('accumulates only the tail of the last replay frame, ending on the anchor', async () => {
		const { pushes } = await shoot('1/250');
		expect(pushes.length).toBeGreaterThan(1);

		const anchorTime = pushes[pushes.length - 1].sessionTime;
		expect(pushes[pushes.length - 1].frameNum).toBe(ANCHOR);
		for (const push of pushes) {
			// Inside the window, allowing the one control tick the boundary weight
			// covers rather than excludes.
			expect(anchorTime - push.sessionTime).toBeLessThanOrEqual(
				1 / 250 + 0.002
			);
			expect(push.frameNum).toBeGreaterThanOrEqual(ANCHOR - 1);
			expect(push.weight).toBeGreaterThan(0);
			expect(push.weight).toBeLessThanOrEqual(1);
		}
		// u sweeps the whole window, so a tapered curve works inside one replay
		// frame instead of reporting a single flat position.
		expect(pushes[pushes.length - 1].u).toBeCloseTo(1, 2);
		expect(pushes[0].u).toBeLessThan(0.3);
	});

	// The frame-indexed safety net is what bounds a bad sub-frame time estimate to
	// one replay frame, so nothing may be accumulated before the seek target.
	it('never accumulates before the frame it seeked to', async () => {
		const { pushes } = await shoot('1/1000');
		for (const push of pushes) {
			expect(push.frameNum).toBeGreaterThanOrEqual(ANCHOR - 1);
		}
	});
});

// Multi-pass visits the same window repeatedly and sums into ONE accumulator, so the
// properties worth pinning are (a) the session outlives every pass and (b) each pass
// starts from a clean slate of per-pass loop state. See
// docs/design/long-exposure-multi-pass.md.
describe('executeRecipe — multi-pass accumulation', () => {
	// The pre-roll seek is the FIRST absolute seek of a capture; the last one is the
	// restore. Derived rather than spelled out, so these tests do not silently pass
	// when the shutter ladder or the seek lead changes.
	function preRollSeeks(events: string[]): string[] {
		const first = events.find((event) => event.startsWith('seek:0:'));
		return events.filter((event) => event === first);
	}

	it('visits the window once per pass on a single GPU session', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe({ passes: 3 }), harness.deps);

		// One accumulator, opened once and resolved once — that is the whole design.
		expect(
			harness.nativeCalls.filter((call) => call === 'begin')
		).toHaveLength(1);
		expect(
			harness.nativeCalls.filter((call) => call === 'finish')
		).toHaveLength(1);
		// Three pre-roll seeks to the window start, plus the unconditional restore.
		expect(preRollSeeks(harness.events)).toHaveLength(3);
		expectAnchorRestored(harness.events);
	});

	it('declares every pass boundary, including the first', async () => {
		const harness = makeHarness();
		await executeRecipe(recipe({ passes: 3 }), harness.deps);

		// Pass 0 is declared too, so every sample carries a correct pass index whether
		// or not multi-pass was used.
		expect(
			harness.nativeCalls.filter((call) => call.startsWith('beginPass:'))
		).toEqual(['beginPass:0', 'beginPass:1', 'beginPass:2']);
	});

	it('accumulates across passes rather than restarting', async () => {
		const single = makeHarness();
		await executeRecipe(recipe({ passes: 1 }), single.deps);
		const triple = makeHarness();
		await executeRecipe(recipe({ passes: 3 }), triple.deps);

		// Nothing clears the accumulator between passes, so three visits to the same
		// window contribute three times the samples.
		expect(triple.pushes).toHaveLength(single.pushes.length * 3);
		expect(triple.passBoundaries).toEqual([
			0,
			single.pushes.length,
			single.pushes.length * 2,
		]);
	});

	// Passes must be INTERCHANGEABLE: nothing about being the second or third visit
	// may change how the window is traversed or weighted. Weight and u are the whole
	// observable contract with the accumulator, so they are what is compared.
	//
	// This is a broad invariant rather than a probe for one bug. `accumulateWindow`
	// owns every piece of per-pass loop state, so leaking it across a boundary is
	// unrepresentable rather than merely untested — see the note on that function.
	it('weights every pass identically, so no pass boundary biases the taper', async () => {
		const harness = makeHarness({ framesPerPoll: 0.05 });
		await executeRecipe(
			recipe({ shutter: '1/60', playbackSpeed: 16, passes: 3 }),
			harness.deps
		);

		expect(harness.passBoundaries).toHaveLength(3);
		const perPass = harness.passBoundaries.map((start, index) =>
			harness.pushes
				.slice(start, harness.passBoundaries[index + 1])
				// sessionTime is absolute and legitimately differs between passes; the
				// window-relative quantities are what must not.
				.map((push) => ({ weight: push.weight, u: push.u }))
		);
		expect(perPass[0].length).toBeGreaterThan(1);
		expect(perPass[1]).toEqual(perPass[0]);
		expect(perPass[2]).toEqual(perPass[0]);
	});

	it('degrades to one pass, loudly, on an addon that cannot declare one', async () => {
		// Without the declaration the retained frame survives the seek and every pass
		// after the first would warp its in-betweens across the whole window. Refusing
		// to run them is the only safe answer; saying so is the rest of it.
		const harness = makeHarness({
			nativeOverrides: { longExposureBeginPass: undefined },
		});
		const outcome = await executeRecipe(recipe({ passes: 4 }), harness.deps);

		expect(outcome.ok).toBe(true);
		expect(preRollSeeks(harness.events)).toHaveLength(1);
		expect(outcome.warnings.join(' ')).toContain('single pass');
		expectAnchorRestored(harness.events);
	});

	// Passes only buy new samples if they land on DIFFERENT presentation instants. If
	// consumption happened to lock in phase with iRacing's presents, every pass would
	// re-sample the same moments and buy noise reduction instead of density — so the
	// phases are forced apart rather than hoped for.
	it('spreads the passes across one replay frame of wall clock', async () => {
		const harness = makeHarness();
		const settles: number[] = [];
		const realSeek = harness.deps.replay.seekToWindowStart.bind(
			harness.deps.replay
		);
		harness.deps.replay.seekToWindowStart = (frame, opts = {}) => {
			settles.push(opts.extraSettleMs ?? 0);
			return realSeek(frame, opts);
		};

		// 1/4 playback: one replay frame is 1000/60 * 4 = 66.67 ms of wall clock,
		// so four passes step by a sixth of that each.
		await executeRecipe(
			recipe({ playbackSpeed: 4, passes: 4 }),
			harness.deps
		);

		const frameMs = (1000 / 60) * 4;
		expect(settles).toHaveLength(4);
		// Pass 0 is never held back, so a single-pass capture is unchanged.
		expect(settles[0]).toBe(0);
		expect(settles[1]).toBeCloseTo(frameMs / 4, 6);
		expect(settles[2]).toBeCloseTo(frameMs / 2, 6);
		expect(settles[3]).toBeCloseTo((frameMs * 3) / 4, 6);
	});

	it('never dithers a single-pass capture', async () => {
		const harness = makeHarness();
		const settles: number[] = [];
		const realSeek = harness.deps.replay.seekToWindowStart.bind(
			harness.deps.replay
		);
		harness.deps.replay.seekToWindowStart = (frame, opts = {}) => {
			settles.push(opts.extraSettleMs ?? 0);
			return realSeek(frame, opts);
		};
		await executeRecipe(recipe({ passes: 1 }), harness.deps);
		expect(settles).toEqual([0]);
	});

	// A cancelled single-pass capture is a half-open window and correctly fails. After
	// a whole pass the exposure is COMPLETE and merely noisier, because every pass
	// covers the whole window — so throwing it away would discard a finished image.
	it('resolves a cancelled capture once a whole pass has landed', async () => {
		const signal = { aborted: false };
		const harness = makeHarness({ signal });
		const native = harness.deps.native as NativeSessionApi;
		const declare = native.longExposureBeginPass as (
			s: number,
			p: number
		) => void;
		// Cancel exactly on the pass-1 boundary: pass 0 is whole, pass 1 contributes
		// nothing, so there is no partial contribution to confess to.
		native.longExposureBeginPass = (s, p) => {
			declare(s, p);
			if (p === 1) {
				signal.aborted = true;
			}
		};

		const outcome = await executeRecipe(recipe({ passes: 4 }), harness.deps);

		expect(outcome.ok).toBe(true);
		expect(outcome.image).not.toBeNull();
		expect(outcome.warnings.join(' ')).toContain('Cancelled after 1 of 4');
		// Nothing was mid-flight, so the taper caveat must NOT be raised.
		expect(outcome.warnings.join(' ')).not.toContain('more weight');
		expectAnchorRestored(harness.events);
	});

	it('admits when the cancelled pass had already contributed', async () => {
		const signal = { aborted: false };
		const harness = makeHarness({ signal });
		const native = harness.deps.native as NativeSessionApi;
		const push = native.longExposureSetSample.bind(native);
		native.longExposureSetSample = (s, w, u, f, t) => {
			push(s, w, u, f, t);
			// Cancel once the SECOND pass has genuinely summed samples in — measured
			// from that pass's own boundary, which is what the addon records.
			const started =
				harness.passBoundaries[harness.passBoundaries.length - 1];
			if (
				harness.passBoundaries.length > 1 &&
				harness.pushes.length - started >= 1
			) {
				signal.aborted = true;
			}
		};

		const outcome = await executeRecipe(recipe({ passes: 4 }), harness.deps);

		expect(outcome.ok).toBe(true);
		// The partial pass cannot be subtracted from the accumulator, so the bias it
		// leaves is stated rather than hidden.
		expect(outcome.warnings.join(' ')).toContain('more weight');
		expectAnchorRestored(harness.events);
	});

	it('still fails a cancel that lands before any pass completed', async () => {
		const signal = { aborted: false };
		const harness = makeHarness({ signal });
		const native = harness.deps.native as NativeSessionApi;
		const declare = native.longExposureBeginPass as (
			s: number,
			p: number
		) => void;
		native.longExposureBeginPass = (s, p) => {
			declare(s, p);
			signal.aborted = true;
		};

		const outcome = await executeRecipe(recipe({ passes: 4 }), harness.deps);

		expect(outcome.ok).toBe(false);
		expect(outcome.failure).toBe('aborted');
		expect(outcome.image).toBeNull();
		expectAnchorRestored(harness.events);
	});

	it('reports which pass is running, so progress cannot look like a restart', async () => {
		const harness = makeHarness();
		const updates: Array<{ pass?: number; passes?: number }> = [];
		harness.deps.onProgress = (update) => {
			if (update.phase === 'seeking') {
				updates.push({ pass: update.pass, passes: update.passes });
			}
		};
		await executeRecipe(recipe({ passes: 3 }), harness.deps);

		expect(updates).toEqual([
			{ pass: 0, passes: 3 },
			{ pass: 1, passes: 3 },
			{ pass: 2, passes: 3 },
		]);
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

	// The native side records a concrete cause in `last_error` and hands it back on
	// every stats call. Dropping it left a bug report reading "iRacing did not present
	// any frames" with nothing to act on, so it rides along with the sentence.
	it('surfaces the native cause when no frames arrived', async () => {
		const harness = makeHarness({
			nativeOverrides: {
				longExposureStats: () => ({
					accepted: 0,
					rejected: 0,
					sawFrame: false,
					frameWidth: 0,
					frameHeight: 0,
					error: 'capture failed: ItemConvertFailed',
				}),
			},
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('no-samples');
		expect(outcome.message).toContain('did not present any frames');
		expect(outcome.message).toContain('ItemConvertFailed');
		expectAnchorRestored(harness.events);
	});

	// Same branch, no native string to add: the sentence must not grow an empty
	// parenthetical.
	it('says only the sentence when the addon reports no cause', async () => {
		const harness = makeHarness({
			nativeOverrides: {
				longExposureStats: () => ({
					accepted: 0,
					rejected: 0,
					sawFrame: false,
					frameWidth: 0,
					frameHeight: 0,
					error: null,
				}),
			},
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.message).toBe(
			'iRacing did not present any frames to capture.'
		);
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
		expect(outcome.message).toContain('stopped rendering');
		expectAnchorRestored(harness.events);
	});

	// A window shorter than one replay frame is ~16 ms of wall clock at 1/16
	// playback — about one rendered frame — so catching none of them is a coin
	// toss, not a malfunction. Saying "iRacing may have stopped rendering" would
	// send the user hunting a fault that is not there.
	it('explains an empty sub-frame window instead of blaming iRacing', async () => {
		const harness = makeHarness({
			framesPerPoll: 1 / 16,
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
		const outcome = await executeRecipe(
			recipe({ shutter: '1/1000', playbackSpeed: 16 }),
			harness.deps
		);
		expect(outcome.failure).toBe('no-samples');
		expect(outcome.message).toContain('shorter than one replay frame');
		expect(outcome.message).not.toContain('stopped rendering');
		expectAnchorRestored(harness.events);
	});

	// The addon writes "no frames were accumulated during the exposure" whenever the
	// accumulator is empty — including the sub-frame case, where that is the expected
	// outcome and not a fault. Appending it would dress a non-problem up as one.
	it('withholds the native cause on a sub-frame window', async () => {
		const harness = makeHarness({
			framesPerPoll: 1 / 16,
			nativeOverrides: {
				longExposureStats: () => ({
					accepted: 0,
					rejected: 0,
					sawFrame: true,
					frameWidth: 640,
					frameHeight: 360,
					error: 'no frames were accumulated during the exposure',
				}),
			},
		});
		const outcome = await executeRecipe(
			recipe({ shutter: '1/1000', playbackSpeed: 16 }),
			harness.deps
		);
		expect(outcome.message).toContain('shorter than one replay frame');
		expect(outcome.message).not.toContain('no frames were accumulated');
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

	// #10, re-sampled after the resize raised iRacing. Main's own pre-flight runs
	// while OUR window is foreground, so its attribution can never succeed on this
	// path — this is the sample that can actually refuse.
	it('refuses exclusive fullscreen found after the window is raised', async () => {
		const harness = makeHarness({
			fullscreenRefusal: 'iRacing is in exclusive fullscreen',
		});
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('exclusive-fullscreen');
		expect(outcome.message).toContain('exclusive fullscreen');
		// Refused BEFORE any GPU work: opening a session for a window that presents
		// nothing is the multi-minute failure this check exists to prevent.
		expect(harness.nativeCalls).not.toContain('begin');
		// And it happens after the raise, not before it — that ordering is the whole
		// point, since attribution is meaningless until iRacing is foreground.
		expect(harness.events.indexOf('fullscreenCheck')).toBeGreaterThan(
			harness.events.indexOf('resize')
		);
		expectAnchorRestored(harness.events);
	});

	it('restores the window it already resized when it refuses', async () => {
		const harness = makeHarness({
			fullscreenRefusal: 'iRacing is in exclusive fullscreen',
		});
		await executeRecipe(recipe(), harness.deps);
		expect(harness.events).toContain('restoreWindow');
	});

	it('proceeds when the re-sample reports no exclusive fullscreen', async () => {
		const harness = makeHarness({ fullscreenRefusal: null });
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.ok).toBe(true);
		expect(harness.events).toContain('fullscreenCheck');
	});

	// The dep is optional so an older caller keeps working; absent must mean
	// "proceed", never "refuse".
	it('captures normally when no fullscreen check is supplied', async () => {
		const harness = makeHarness();
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.ok).toBe(true);
		expect(harness.events).not.toContain('fullscreenCheck');
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
			recipe({ width: 7680, height: 4320 }),
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

	// No telemetry to anchor on — which is NOT "the user is out of a replay". iRacing
	// writes its replay buffer continuously, so a live session reports a frame number
	// too and a long exposure works there. The message has to name the thing that
	// would actually help, so it is pinned against the old "open a replay" wording.
	it('refuses when iRacing is not sending replay telemetry', async () => {
		const harness = makeHarness();
		harness.deps.replay.state = () => null;
		const outcome = await executeRecipe(recipe(), harness.deps);
		expect(outcome.failure).toBe('invalid-recipe');
		expect(outcome.message).toMatch(/not sending replay telemetry/);
		expect(outcome.message).not.toMatch(/open a replay/i);
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

	// BRACKETING AND INTERPOLATION CANNOT BOTH RUN, and this is the guard that makes
	// that true rather than a preference.
	//
	// The native session keeps ONE retained-frame ping-pong and advances it inside
	// `accumulate_sample`, which the frame handler calls once per OPEN SINK. On the
	// second and later stops of a captured frame both slots already hold that same
	// frame, so the flow runs between identical inputs and the warp deposits
	// `factor - 1` zero-motion COPIES of the real frame instead of in-betweens: every
	// stop but the primary comes out quietly wrong, in the way that reads as merely
	// under-blurred rather than as broken.
	describe('with bracketing', () => {
		it('forces the factor to 1 for the native session', async () => {
			const harness = makeHarness();
			await executeRecipe(
				recipe({ bracket: true, interpolationFactor: 8 }),
				harness.deps
			);
			expect(harness.begunWith).toEqual([1]);
		});

		it('leaves the factor alone when the bracket resolves to one sink', async () => {
			const harness = makeHarness();
			// The fastest stop: the at-or-faster set is the chosen stop alone, so
			// there is only ever one accumulator and nothing to protect.
			await executeRecipe(
				recipe({
					shutter: '1/1000',
					bracket: true,
					interpolationFactor: 8,
				}),
				harness.deps
			);
			expect(harness.begunWith).toEqual([8]);
		});

		// The decision was OURS, so the sidecar must not blame the machine for it —
		// and the capture must not add a second, wrong-reasoned warning on top of the
		// accurate one `validatePlan` already raised.
		it('records our own reason and does not blame the hardware', async () => {
			const harness = makeHarness({
				nativeOverrides: nativeWithInterpolation(null),
			});
			const outcome = await executeRecipe(
				recipe({ bracket: true, interpolationFactor: 4 }),
				harness.deps
			);
			// What was ASKED for is still recorded — a sidecar that dropped it would
			// read as though the user never turned interpolation on.
			expect(outcome.interpolation?.requestedFactor).toBe(4);
			expect(outcome.interpolation?.enabled).toBe(false);
			expect(outcome.interpolation?.achievedFactor).toBe(1);
			expect(outcome.interpolation?.reason).toMatch(/bracket/i);
			expect(
				outcome.warnings.some((w) =>
					/not available on this machine/i.test(w)
				)
			).toBe(false);
		});
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
			recipe({ interpolationFactor: 8 }),
			harness.deps
		);

		// The shot still succeeds — this is a quality warning, not a failure.
		expect(outcome.ok).toBe(true);
		expect(outcome.image).not.toBeNull();
		expect(outcome.warnings.join(' ')).toMatch(/could not keep up/i);
		expect(outcome.warnings.join(' ')).toMatch(/passes/i);
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

	// `predictedSamples` is PER PASS while `realSamples` is cumulative, so a multi-pass
	// capture that fell just as far behind as a single-pass one must report the same
	// ratio. Get this wrong and an 8-pass shot reports ~8.0, which is above every
	// threshold there is — the shortfall guardrail switched off by the feature that
	// makes shortfalls easiest to miss.
	it('measures the shortfall per pass, not against one pass of prediction', () => {
		const common = {
			requestedFactor: 8,
			status: {
				enabled: true,
				factor: 8,
				reason: null,
				gridSize: 4,
				bidirectional: true,
			},
			syntheticSamples: 0,
			meanFrameMs: 30,
			maxFrameMs: 50,
			setupFrameMs: 30,
			renderWidth: 2560,
			renderHeight: 1440,
			predictedSamples: 10,
		};
		const single = buildInterpolationReport({ ...common, realSamples: 4 });
		const quad = buildInterpolationReport({
			...common,
			realSamples: 16,
			passes: 4,
		});
		expect(quad.achievedRatio).toBeCloseTo(0.4, 3);
		expect(quad.achievedRatio).toBe(single.achievedRatio);
		// Both are shortfalls, and both must still say so.
		expect(quad.achievedRatio).toBeLessThan(SAMPLE_SHORTFALL_RATIO);
	});

	it('treats an absent pass count as a single pass', () => {
		const report = buildInterpolationReport({
			requestedFactor: 1,
			status: null,
			realSamples: 50,
			syntheticSamples: 0,
			meanFrameMs: 2,
			maxFrameMs: 5,
			setupFrameMs: 1,
			renderWidth: 2560,
			renderHeight: 1440,
			predictedSamples: 100,
		});
		expect(report.achievedRatio).toBeCloseTo(0.5, 3);
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
		const message = diagnoseInterpolationShortfall(report());
		expect(message).toMatch(/could not keep up/i);
		expect(message).toMatch(/3 real frames/);
	});

	// The remedy used to be conditional on supersampling, which no longer exists.
	// What is left are the two levers that still do, plus passes -- which buy real
	// samples with wall clock rather than with the GPU time this warning says ran out.
	it('offers only remedies that still exist', () => {
		const message = diagnoseInterpolationShortfall(report());
		expect(message).toMatch(/lower the interpolation factor/i);
		expect(message).toMatch(/resolution/i);
		expect(message).toMatch(/passes/i);
		expect(message).not.toMatch(/supersampl/i);
	});

	it('stays silent when the capture kept up', () => {
		expect(
			diagnoseInterpolationShortfall(
				report({ realSamples: 13, achievedRatio: 13 / 12 })
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
			diagnoseInterpolationShortfall(report({ achievedRatio: 0.9 }))
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
			report({ realSamples: 7, achievedRatio: 0.636 })
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
			diagnoseInterpolationShortfall(report({ achievedRatio: justUnder }))
		).toMatch(/could not keep up/i);
		expect(
			diagnoseInterpolationShortfall(report({ achievedRatio: justOver }))
		).toBeNull();
	});

	it('says nothing when interpolation never ran', () => {
		expect(
			diagnoseInterpolationShortfall(
				report({ enabled: false, achievedFactor: 1, achievedRatio: 0.1 })
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
		await executeRecipe(recipe(), harness.deps);
		// WGC delivered 1280x720 rather than the requested size, and since
		// supersampling was removed the saved image IS the delivered frame.
		expect(captured).toEqual([1280, 720]);
	});
});
