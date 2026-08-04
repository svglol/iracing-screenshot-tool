// Replay positioning, playback speed and — above all — anchor restoration.
// Design note §4.
//
// Everything here goes through the iRacing SDK's documented broadcast messages.
// No synthesised keyboard/mouse input, no driving of iRacing's replay UI, no
// hooking of the sim process.
//
// Two invariants this file exists to hold:
//
//   1. TELEMETRY IS THE ONLY POSITION AUTHORITY. ReplayFrameNum decides where we
//      are, whether a seek landed, where the window starts and ends, and when to
//      stop. Wall-clock time is used ONLY as a timeout on operations that can
//      fail — never to decide replay position, window boundaries, or termination.
//      Playback-speed drift or a stalled frame can therefore make a capture slow
//      or make it fail loudly, but it can never silently change the exposure.
//
//   2. THE CURSOR ALWAYS COMES BACK TO THE ANCHOR. restoreAnchor() is a guaranteed
//      cleanup path, not a happy-path step — the session runs it from a `finally`.
//      It seeks absolutely, verifies EXACTLY (not "close enough"), and corrects
//      with relative seeks if the landing was off.
//
// SDK argument semantics were checked against the header and iRacing's own
// msgtest.cpp sample rather than assumed:
//   ReplaySetPlaySpeed(speed, slowMotion) — with slowMotion=1, `speed` is a
//     DIVISOR: the sample captions `(16, true)` as "1/16th speed".
//   ReplaySetPlayPosition(mode, frame) — mode 0 = RpyPos_Begin (absolute from the
//     start of the tape), 1 = RpyPos_Current (relative), 2 = RpyPos_End.
//
// All deps are injected so the whole state machine is unit-testable with no sim.

import { createLogger } from '../../utilities/logger';

const log = createLogger('long-exposure/replay');

// irsdk_RpyPosMode. Mirrors ReplayPositionCommand in @irsdk-node/types; redeclared
// here so this module stays dependency-free and testable without the native SDK.
export const RPY_POS_BEGIN = 0;
export const RPY_POS_CURRENT = 1;
export const RPY_POS_END = 2;

// Seek this many replay frames BEFORE the window start, so that when playback
// rolls we are guaranteed to cross the window boundary rather than land inside it
// and lose the first frames of the exposure. Clamped at the start of the tape.
export const SEEK_LEAD_FRAMES = 3;

// A pre-roll seek only has to land at-or-before the window start (the lead absorbs
// the rest). Restoration, by contrast, requires an EXACT landing.
export const RESTORE_TOLERANCE_FRAMES = 0;

// How long to wait for a seek to be reflected in telemetry before giving up.
// Wall-clock, and used ONLY as a failure timeout.
export const SEEK_TIMEOUT_MS = 4000;
// Telemetry polling interval — one 60 Hz tick.
export const POLL_INTERVAL_MS = 16;
// After telemetry confirms the seek, give the renderer time to actually present at
// the new position before we start sampling. Without this the first samples are
// the pre-seek frame.
export const SEEK_SETTLE_MS = 250;
// Corrective relative seeks allowed while restoring before we report an inexact
// landing.
export const MAX_RESTORE_CORRECTIONS = 3;
// Total wall-clock budget for restoration. Restoration is NOT abortable — abandoning
// it would leave the user's cursor somewhere they never chose — so it gets its own
// bounded budget instead.
export const RESTORE_TIMEOUT_MS = 6000;
// Budget for ONE settle attempt. Each attempt must be bounded well below the total,
// or the first wait consumes the whole budget and no corrective seek ever gets
// issued — which is precisely the case the corrections exist for.
export const RESTORE_ATTEMPT_TIMEOUT_MS = 1200;

// The replay-related telemetry we read. Everything is nullable because a variable
// can be absent when the sim is not sending telemetry at all.
export interface ReplayState {
	replayFrameNum: number;
	replayFrameNumEnd: number | null;
	replaySessionTime: number | null;
	replaySessionNum: number | null;
	replayPlaySpeed: number | null;
	replayPlaySlowMotion: boolean;
	isReplayPlaying: boolean;
	frameRate: number | null;
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Extract the replay state from a flattened telemetry values record. Pure and
// exported so the mapping is locked by tests.
//
// Returns null when ReplayFrameNum is absent — i.e. the sim is not sending
// telemetry we can anchor on. That is NOT the same as "the user is not watching a
// replay": iRacing writes its replay buffer continuously, so a LIVE session
// reports a frame number too, and long exposure works there over the frames just
// past. Everything downstream that gates on this is gating on "have a position",
// never on "is viewing a replay".
export function readReplayState(
	values: Record<string, unknown> | null | undefined
): ReplayState | null {
	if (!values) {
		return null;
	}
	const frameNum = num(values.ReplayFrameNum);
	if (frameNum === null) {
		return null;
	}
	return {
		replayFrameNum: frameNum,
		replayFrameNumEnd: num(values.ReplayFrameNumEnd),
		replaySessionTime: num(values.ReplaySessionTime),
		replaySessionNum: num(values.ReplaySessionNum),
		replayPlaySpeed: num(values.ReplayPlaySpeed),
		replayPlaySlowMotion: values.ReplayPlaySlowMotion === true,
		isReplayPlaying: values.IsReplayPlaying === true,
		frameRate: num(values.FrameRate),
	};
}

// The playback state we owe the user back, captured before anything moves.
export interface PlaybackSnapshot {
	anchorFrame: number;
	sessionNum: number | null;
	speed: number;
	slowMotion: boolean;
	wasPlaying: boolean;
}

export function capturePlaybackSnapshot(state: ReplayState): PlaybackSnapshot {
	return {
		anchorFrame: state.replayFrameNum,
		sessionNum: state.replaySessionNum,
		// A paused replay reports speed 0; restoring 0 would leave it paused, which
		// is correct. A missing reading defaults to 1x forward.
		speed: state.replayPlaySpeed ?? 1,
		slowMotion: state.replayPlaySlowMotion,
		wasPlaying: state.isReplayPlaying,
	};
}

export interface ReplayControlDeps {
	// Latest replay telemetry, or null when unavailable.
	readState(): ReplayState | null;
	// irsdk_BroadcastReplaySetPlaySpeed. slowMotion=true makes `speed` a divisor.
	setPlaySpeed(speed: number, slowMotion: boolean): void;
	// irsdk_BroadcastReplaySetPlayPosition.
	setPlayPosition(mode: number, frame: number): void;
	delay(ms: number): Promise<void>;
	// Monotonic-ish wall clock, for TIMEOUTS ONLY.
	now(): number;
}

export interface SeekResult {
	landed: boolean;
	frame: number | null;
	elapsedMs: number;
}

export interface RestoreResult {
	// True only when ReplayFrameNum equals the anchor exactly.
	landedExactly: boolean;
	finalFrame: number | null;
	corrections: number;
	// Non-null when restoration could not complete (SDK torn down, timeout).
	error: string | null;
}

export class ReplayController {
	private deps: ReplayControlDeps;

	constructor(deps: ReplayControlDeps) {
		this.deps = deps;
	}

	state(): ReplayState | null {
		try {
			return this.deps.readState();
		} catch {
			// A native throw here means the SDK handle went stale (iRacing exited).
			// Treated as "no state", which every caller already handles.
			return null;
		}
	}

	pause(): void {
		this.deps.setPlaySpeed(0, false);
	}

	// Begin slow-motion playback at 1/divisor real time.
	setCaptureSpeed(divisor: number): void {
		if (divisor <= 1) {
			this.deps.setPlaySpeed(1, false);
			return;
		}
		this.deps.setPlaySpeed(Math.round(divisor), true);
	}

	seekAbsolute(frame: number): void {
		this.deps.setPlayPosition(RPY_POS_BEGIN, Math.max(0, Math.round(frame)));
	}

	seekRelative(deltaFrames: number): void {
		this.deps.setPlayPosition(RPY_POS_CURRENT, Math.round(deltaFrames));
	}

	// Poll telemetry until `predicate` accepts the current frame, or the wall-clock
	// budget runs out. The predicate — not a timer — decides success.
	async waitForFrame(
		predicate: (frame: number) => boolean,
		opts: { timeoutMs?: number; signal?: { aborted: boolean } } = {}
	): Promise<SeekResult> {
		const timeoutMs = opts.timeoutMs ?? SEEK_TIMEOUT_MS;
		const started = this.deps.now();
		let lastFrame: number | null = null;

		for (;;) {
			const state = this.state();
			if (state) {
				lastFrame = state.replayFrameNum;
				if (predicate(state.replayFrameNum)) {
					return {
						landed: true,
						frame: state.replayFrameNum,
						elapsedMs: this.deps.now() - started,
					};
				}
			}
			if (opts.signal?.aborted) {
				return {
					landed: false,
					frame: lastFrame,
					elapsedMs: this.deps.now() - started,
				};
			}
			if (this.deps.now() - started >= timeoutMs) {
				return {
					landed: false,
					frame: lastFrame,
					elapsedMs: this.deps.now() - started,
				};
			}
			await this.deps.delay(POLL_INTERVAL_MS);
		}
	}

	// Position the replay ready to roll into the exposure window. Pauses, seeks a
	// few frames BEFORE the window start (so playback is guaranteed to cross the
	// boundary rather than begin inside it), confirms via telemetry, then settles so
	// the renderer is presenting at the new position before sampling begins.
	//
	// `extraSettleMs` is the multi-pass phase dither. Passes only buy new samples if
	// they land on DIFFERENT presentation instants; if our consumption happened to
	// lock in phase with iRacing's presents, every pass would re-sample the same
	// moments and buy noise reduction instead of density. Holding pass k back by a
	// fraction of a replay frame forces the phases apart rather than hoping for it.
	//
	// It delays when playback ROLLS. It does not move the window, which stays
	// frame-indexed and gate-enforced, so this is the existing SEEK_SETTLE_MS with a
	// term added rather than a new use of wall clock.
	async seekToWindowStart(
		startFrame: number,
		opts: { signal?: { aborted: boolean }; extraSettleMs?: number } = {}
	): Promise<SeekResult> {
		this.pause();
		const target = Math.max(0, startFrame - SEEK_LEAD_FRAMES);
		this.seekAbsolute(target);

		// Landing at or BEFORE the window start is what matters; the lead absorbs
		// seek imprecision. When the tape start clamps the lead away, accept landing
		// on the window start itself.
		const result = await this.waitForFrame(
			(frame) => frame <= Math.max(startFrame, target),
			opts
		);

		const dither =
			Number.isFinite(opts.extraSettleMs) &&
			(opts.extraSettleMs as number) > 0
				? Math.round(opts.extraSettleMs as number)
				: 0;
		if (result.landed) {
			await this.deps.delay(SEEK_SETTLE_MS + dither);
		}
		log.info('Long-exposure pre-roll seek', {
			startFrame,
			target,
			landed: result.landed,
			frame: result.frame,
			elapsedMs: result.elapsedMs,
			ditherMs: dither,
		});
		return result;
	}

	// GUARANTEED CLEANUP PATH. Returns the cursor to the anchor and restores the
	// pre-capture playback state, on every exit path — success, failure, or abort.
	//
	// Deliberately NOT abortable: abandoning restoration would leave the user's
	// cursor somewhere they never chose, which is the one outcome this feature must
	// never produce. It gets its own wall-clock budget instead.
	//
	// Never throws. A torn-down SDK (iRacing exited mid-capture) is reported in the
	// result, because there is genuinely nothing left to restore.
	async restoreAnchor(snapshot: PlaybackSnapshot): Promise<RestoreResult> {
		const anchor = Math.max(0, Math.round(snapshot.anchorFrame));
		const deadline = this.deps.now() + RESTORE_TIMEOUT_MS;
		let corrections = 0;

		// Each settle attempt gets a slice of the budget, never the whole thing, so
		// there is always time left to issue a corrective seek.
		const attemptBudget = () =>
			Math.max(
				0,
				Math.min(RESTORE_ATTEMPT_TIMEOUT_MS, deadline - this.deps.now())
			);
		const settled = () =>
			this.waitForFrame(
				(frame) => Math.abs(frame - anchor) <= RESTORE_TOLERANCE_FRAMES,
				{ timeoutMs: attemptBudget() }
			);

		try {
			// Stop first, so the cursor cannot drift under us while we seek.
			this.pause();
			this.seekAbsolute(anchor);

			let landed = await settled();

			// "Close enough" is not good enough — the user must be able to re-shoot
			// the same moment with different parameters. Correct with relative seeks.
			while (
				!landed.landed &&
				corrections < MAX_RESTORE_CORRECTIONS &&
				this.deps.now() < deadline
			) {
				const current = this.state()?.replayFrameNum;
				if (typeof current !== 'number') {
					break;
				}
				corrections += 1;
				this.seekRelative(anchor - current);
				landed = await settled();
			}

			// Restore the pre-capture transport state. A paused user stays paused
			// (speed 0); a playing user gets their speed and slow-motion flag back.
			if (snapshot.wasPlaying) {
				this.deps.setPlaySpeed(
					Math.round(snapshot.speed),
					snapshot.slowMotion
				);
			} else {
				this.pause();
			}

			const finalFrame = this.state()?.replayFrameNum ?? landed.frame;
			const result: RestoreResult = {
				landedExactly: landed.landed,
				finalFrame: finalFrame ?? null,
				corrections,
				error: null,
			};
			if (!result.landedExactly) {
				log.warn('Long-exposure anchor restore did not land exactly', {
					anchor,
					finalFrame: result.finalFrame,
					corrections,
				});
			} else {
				log.info('Long-exposure anchor restored', { anchor, corrections });
			}
			return result;
		} catch (error) {
			const message = (error as Error)?.message || String(error);
			log.error('Long-exposure anchor restore failed', {
				anchor,
				error: message,
			});
			return {
				landedExactly: false,
				finalFrame: null,
				corrections,
				error: message,
			};
		}
	}
}
