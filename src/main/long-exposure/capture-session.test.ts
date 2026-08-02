import { describe, expect, it, vi } from 'vitest';
import { GiB } from '../../utilities/vram-prediction';
import {
	createDefaultRecipe,
	normalizeRecipe,
	type LongExposureRecipe,
} from '../../utilities/long-exposure/shot-recipe';
import { ReplayController, type ReplayState } from './replay-control';
import {
	executeRecipe,
	type CaptureSessionDeps,
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

	const defaultNative: NativeSessionApi = {
		longExposureBegin: () => {
			nativeCalls.push('begin');
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

	return { deps, events, nativeCalls, state, replay };
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
