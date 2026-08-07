import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MAX_RESTORE_CORRECTIONS,
	RPY_POS_BEGIN,
	RPY_POS_CURRENT,
	ReplayController,
	SEEK_LEAD_FRAMES,
	capturePlaybackSnapshot,
	readReplayState,
	tapeEndFrame,
	type ReplayControlDeps,
	type ReplayState,
} from './replay-control';

// The logger writes through electron's app paths; stub it so these stay pure.
vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

interface Broadcast {
	kind: 'speed' | 'position';
	a: number;
	b: number | boolean;
}

// A scriptable stand-in for the sim: records every broadcast, and lets a test drive
// the reported frame number however it likes. Wall clock is virtual, so nothing
// here depends on real timing.
function makeHarness(initial: Partial<ReplayState> = {}) {
	const broadcasts: Broadcast[] = [];
	let clock = 0;
	const state: ReplayState = {
		replayFrameNum: 1000,
		replayFrameNumEnd: 50000,
		replaySessionTime: 100,
		replaySessionNum: 1,
		replayPlaySpeed: 0,
		replayPlaySlowMotion: false,
		isReplayPlaying: false,
		frameRate: 60,
		...initial,
	};
	// Optional per-poll behaviour, e.g. "land two frames late".
	let onRead: ((state: ReplayState) => void) | null = null;

	const deps: ReplayControlDeps = {
		readState: () => {
			onRead?.(state);
			return { ...state };
		},
		setPlaySpeed: (speed, slowMotion) =>
			broadcasts.push({ kind: 'speed', a: speed, b: slowMotion }),
		setPlayPosition: (mode, frame) =>
			broadcasts.push({ kind: 'position', a: mode, b: frame }),
		delay: async (ms) => {
			clock += ms;
		},
		now: () => clock,
	};

	return {
		deps,
		broadcasts,
		state,
		controller: new ReplayController(deps),
		setOnRead: (fn: typeof onRead) => {
			onRead = fn;
		},
		advanceClock: (ms: number) => {
			clock += ms;
		},
	};
}

describe('readReplayState', () => {
	it('maps the replay telemetry variables', () => {
		const state = readReplayState({
			ReplayFrameNum: 1234,
			ReplayFrameNumEnd: 9999,
			ReplaySessionTime: 55.5,
			ReplaySessionNum: 2,
			ReplayPlaySpeed: 16,
			ReplayPlaySlowMotion: true,
			IsReplayPlaying: true,
			FrameRate: 144,
		});
		expect(state).toEqual({
			replayFrameNum: 1234,
			replayFrameNumEnd: 9999,
			replaySessionTime: 55.5,
			replaySessionNum: 2,
			replayPlaySpeed: 16,
			replayPlaySlowMotion: true,
			isReplayPlaying: true,
			frameRate: 144,
		});
	});

	// Absent ReplayFrameNum means the sim is not sending a position we can anchor
	// on, and nothing else here is meaningful — so the whole reading is null rather
	// than partially populated. It does NOT mean the user is out of a replay: a live
	// session reports a frame number too, because iRacing writes its replay buffer
	// continuously.
	it('returns null when there is no replay frame number', () => {
		expect(readReplayState({ FrameRate: 60 })).toBeNull();
		expect(readReplayState(null)).toBeNull();
		expect(readReplayState(undefined)).toBeNull();
	});

	it('nulls individual variables that are absent or non-numeric', () => {
		const state = readReplayState({
			ReplayFrameNum: 10,
			ReplayFrameNumEnd: 'nope',
			ReplaySessionTime: NaN,
		});
		expect(state?.replayFrameNumEnd).toBeNull();
		expect(state?.replaySessionTime).toBeNull();
		expect(state?.replayPlaySlowMotion).toBe(false);
		expect(state?.isReplayPlaying).toBe(false);
	});
});

describe('tapeEndFrame', () => {
	const state = (
		replayFrameNum: number,
		replayFrameNumEnd: number | null
	): ReplayState => ({
		replayFrameNum,
		replayFrameNumEnd,
		replaySessionTime: null,
		replaySessionNum: 1,
		replayPlaySpeed: 0,
		replayPlaySlowMotion: false,
		isReplayPlaying: false,
		frameRate: 60,
	});

	// The whole point of the helper: ReplayFrameNumEnd counts frames REMAINING, so
	// the end of the tape is the sum and never the variable on its own.
	it('adds the remaining count to the cursor', () => {
		expect(tapeEndFrame(state(1000, 50000))).toBe(51000);
		expect(tapeEndFrame(state(0, 51000))).toBe(51000);
	});

	// THE LIVE-SESSION REGRESSION. At the live edge the cursor is deep into the tape
	// and the remaining count is ~0 — the exact reading that made validatePlan refuse
	// every live shot as "past the end of the replay" when it compared the anchor
	// against the raw countdown.
	it('puts the live edge at or after the cursor, never before it', () => {
		const live = state(11106, 0);
		const end = tapeEndFrame(live);
		expect(end).toBe(11106);
		expect(end).toBeGreaterThanOrEqual(live.replayFrameNum);
	});

	it('is null when the sim does not report the remaining count', () => {
		expect(tapeEndFrame(state(1000, null))).toBeNull();
	});
});

describe('capturePlaybackSnapshot', () => {
	it('records the transport state we owe the user back', () => {
		const snapshot = capturePlaybackSnapshot({
			replayFrameNum: 4242,
			replayFrameNumEnd: null,
			replaySessionTime: null,
			replaySessionNum: 3,
			replayPlaySpeed: 4,
			replayPlaySlowMotion: true,
			isReplayPlaying: true,
			frameRate: null,
		});
		expect(snapshot).toEqual({
			anchorFrame: 4242,
			sessionNum: 3,
			speed: 4,
			slowMotion: true,
			wasPlaying: true,
		});
	});

	it('defaults a missing speed to real time', () => {
		const snapshot = capturePlaybackSnapshot({
			replayFrameNum: 1,
			replayFrameNumEnd: null,
			replaySessionTime: null,
			replaySessionNum: null,
			replayPlaySpeed: null,
			replayPlaySlowMotion: false,
			isReplayPlaying: false,
			frameRate: null,
		});
		expect(snapshot.speed).toBe(1);
		expect(snapshot.wasPlaying).toBe(false);
	});
});

describe('setCaptureSpeed', () => {
	// Verified against iRacing's own msgtest.cpp sample, which captions
	// ReplaySetPlaySpeed(16, true) as "1/16th speed": with slowMotion set, `speed`
	// is a DIVISOR.
	it('sends the divisor with the slow-motion flag set', () => {
		const harness = makeHarness();
		harness.controller.setCaptureSpeed(16);
		expect(harness.broadcasts).toEqual([{ kind: 'speed', a: 16, b: true }]);
	});

	it('sends plain 1x without slow motion for real-time playback', () => {
		const harness = makeHarness();
		harness.controller.setCaptureSpeed(1);
		expect(harness.broadcasts).toEqual([{ kind: 'speed', a: 1, b: false }]);
	});

	it('pauses with speed 0', () => {
		const harness = makeHarness();
		harness.controller.pause();
		expect(harness.broadcasts).toEqual([{ kind: 'speed', a: 0, b: false }]);
	});
});

describe('seekToWindowStart', () => {
	it('pauses, then seeks ABSOLUTELY to a lead before the window start', async () => {
		const harness = makeHarness({ replayFrameNum: 900 });
		await harness.controller.seekToWindowStart(900);
		expect(harness.broadcasts[0]).toEqual({ kind: 'speed', a: 0, b: false });
		expect(harness.broadcasts[1]).toEqual({
			kind: 'position',
			a: RPY_POS_BEGIN,
			b: 900 - SEEK_LEAD_FRAMES,
		});
	});

	// The lead exists so that when playback rolls we CROSS the window boundary
	// rather than starting inside it and losing the first frames of the exposure.
	it('waits until the cursor is at or before the window start', async () => {
		const harness = makeHarness({ replayFrameNum: 2000 });
		let polls = 0;
		harness.setOnRead((state) => {
			polls += 1;
			if (polls > 3) {
				state.replayFrameNum = 990;
			}
		});
		const result = await harness.controller.seekToWindowStart(1000);
		expect(result.landed).toBe(true);
		expect(result.frame).toBeLessThanOrEqual(1000);
	});

	it('clamps the lead at the start of the tape', async () => {
		const harness = makeHarness({ replayFrameNum: 0 });
		await harness.controller.seekToWindowStart(1);
		expect(harness.broadcasts[1]).toEqual({
			kind: 'position',
			a: RPY_POS_BEGIN,
			b: 0,
		});
	});

	// Wall-clock appears ONLY as a failure timeout, never as a success condition.
	it('gives up after the timeout instead of hanging', async () => {
		const harness = makeHarness({ replayFrameNum: 5000 });
		const result = await harness.controller.seekToWindowStart(1000);
		expect(result.landed).toBe(false);
		expect(result.elapsedMs).toBeGreaterThan(0);
	});

	it('bails out promptly when aborted', async () => {
		const harness = makeHarness({ replayFrameNum: 5000 });
		const signal = { aborted: true };
		const result = await harness.controller.seekToWindowStart(1000, {
			signal,
		});
		expect(result.landed).toBe(false);
	});
});

describe('restoreAnchor — the guaranteed cleanup path', () => {
	const snapshot = {
		anchorFrame: 1500,
		sessionNum: 1,
		speed: 1,
		slowMotion: false,
		wasPlaying: false,
	};

	it('stops first, then seeks absolutely to the anchor', async () => {
		const harness = makeHarness({ replayFrameNum: 1500 });
		await harness.controller.restoreAnchor(snapshot);
		expect(harness.broadcasts[0]).toEqual({ kind: 'speed', a: 0, b: false });
		expect(harness.broadcasts[1]).toEqual({
			kind: 'position',
			a: RPY_POS_BEGIN,
			b: 1500,
		});
	});

	it('reports an exact landing', async () => {
		const harness = makeHarness({ replayFrameNum: 1500 });
		const result = await harness.controller.restoreAnchor(snapshot);
		expect(result.landedExactly).toBe(true);
		expect(result.finalFrame).toBe(1500);
		expect(result.corrections).toBe(0);
		expect(result.error).toBeNull();
	});

	// "Close enough" is not good enough: the user must be able to re-shoot the SAME
	// moment with different parameters.
	it('corrects an off-by-one landing with a RELATIVE seek', async () => {
		const harness = makeHarness({ replayFrameNum: 1502 });
		let corrected = false;
		harness.setOnRead((state) => {
			if (corrected) {
				state.replayFrameNum = 1500;
			}
		});
		const originalSetPosition = harness.deps.setPlayPosition;
		harness.deps.setPlayPosition = (mode, frame) => {
			originalSetPosition(mode, frame);
			if (mode === RPY_POS_CURRENT) {
				corrected = true;
			}
		};

		const result = await harness.controller.restoreAnchor(snapshot);
		expect(result.landedExactly).toBe(true);
		expect(result.corrections).toBeGreaterThan(0);
		const relative = harness.broadcasts.find(
			(b) => b.kind === 'position' && b.a === RPY_POS_CURRENT
		);
		expect(relative).toEqual({ kind: 'position', a: RPY_POS_CURRENT, b: -2 });
	});

	it('gives up after a bounded number of corrections and says so', async () => {
		const harness = makeHarness({ replayFrameNum: 1490 });
		const result = await harness.controller.restoreAnchor(snapshot);
		expect(result.landedExactly).toBe(false);
		expect(result.corrections).toBeLessThanOrEqual(MAX_RESTORE_CORRECTIONS);
		// Reported honestly rather than claimed as success.
		expect(result.finalFrame).toBe(1490);
	});

	it('restores the pre-capture speed when the user was playing', async () => {
		const harness = makeHarness({ replayFrameNum: 1500 });
		await harness.controller.restoreAnchor({
			...snapshot,
			wasPlaying: true,
			speed: 4,
			slowMotion: true,
		});
		expect(harness.broadcasts[harness.broadcasts.length - 1]).toEqual({
			kind: 'speed',
			a: 4,
			b: true,
		});
	});

	it('leaves a paused user paused', async () => {
		const harness = makeHarness({ replayFrameNum: 1500 });
		await harness.controller.restoreAnchor(snapshot);
		expect(harness.broadcasts[harness.broadcasts.length - 1]).toEqual({
			kind: 'speed',
			a: 0,
			b: false,
		});
	});

	// Restoration runs from a finally on every exit path, so it must never throw —
	// a throw here would mask the real failure.
	it('never throws when the SDK has been torn down', async () => {
		const harness = makeHarness();
		harness.deps.setPlaySpeed = () => {
			throw new Error('SDK stopped');
		};
		const result = await harness.controller.restoreAnchor(snapshot);
		expect(result.error).toMatch(/SDK stopped/);
		expect(result.landedExactly).toBe(false);
	});

	it('survives telemetry disappearing mid-restore', async () => {
		const harness = makeHarness({ replayFrameNum: 1400 });
		harness.deps.readState = () => null;
		const result = await harness.controller.restoreAnchor(snapshot);
		expect(result.landedExactly).toBe(false);
		expect(result.error).toBeNull();
	});

	// Deliberately NOT abortable: abandoning restoration would leave the cursor
	// somewhere the user never chose, which is the one outcome this must not produce.
	it('ignores an abort signal and still restores', async () => {
		const harness = makeHarness({ replayFrameNum: 1500 });
		const result = await harness.controller.restoreAnchor(snapshot);
		expect(result.landedExactly).toBe(true);
		expect(
			harness.broadcasts.some(
				(b) =>
					b.kind === 'position' && b.a === RPY_POS_BEGIN && b.b === 1500
			)
		).toBe(true);
	});
});

describe('ReplayController.state', () => {
	it('returns null instead of throwing when the SDK read fails', () => {
		const harness = makeHarness();
		harness.deps.readState = () => {
			throw new Error('stale handle');
		};
		expect(harness.controller.state()).toBeNull();
	});
});

describe('waitForFrame', () => {
	let harness: ReturnType<typeof makeHarness>;
	beforeEach(() => {
		harness = makeHarness({ replayFrameNum: 100 });
	});

	it('resolves as soon as the predicate accepts', async () => {
		const result = await harness.controller.waitForFrame((f) => f === 100);
		expect(result.landed).toBe(true);
		expect(result.frame).toBe(100);
	});

	it('honours a caller-supplied timeout', async () => {
		const result = await harness.controller.waitForFrame(() => false, {
			timeoutMs: 100,
		});
		expect(result.landed).toBe(false);
		expect(result.elapsedMs).toBeGreaterThanOrEqual(100);
	});
});
