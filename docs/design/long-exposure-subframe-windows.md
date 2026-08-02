# Long exposure — sub-replay-frame exposure windows

Status: **implemented 2026-08-02** on `feat/long-exposure-replay` (`90aa455`).
Not yet verified against live iRacing — see §9.
Prerequisite reading: `docs/design/long-exposure.md` §3 (sampling) and §5 (the sink
model), then §4 and §10 Q1 of the same note for the wall-clock rule this bends. All
three sections have been amended in place; this brief is the reasoning behind them.

**What shipped differs from §4.1 below in one respect, deliberately.** The brief
specifies a `startTime` field on the sink, in absolute session-time seconds. A sink
is planned *before* the seek, and the frame → session-time origin does not exist
until *after* it lands (`capture-session.ts` re-anchors the map on a settled
reading, precisely so bounds and samples share an origin). An absolute start baked
in at plan time would be in the wrong origin. The sink therefore carries
`exposureSeconds` — the window LENGTH — and `sinkStartTime(sink, frameTimeOf)`
derives the start from the anchor, which every sink shares. Same window, no origin
problem, and the sink stays a pure value.

**The idea in one line:** the replay tape stores *positions* at 60 Hz, but iRacing
renders ~10 distinct interpolated frames between each pair of them — so an exposure
shorter than one replay frame is perfectly capturable. Seek to `anchor − 1`, play, and
accumulate only the tail subset of the rendered frames.

---

## 1. The defect this fixes

`framesForExposure()` is `max(1, round(seconds × 60))`, so the fast half of the shutter
ladder quantises to a one-frame window:

| stop | nominal | window frames | **actual exposure** |
|---|---|---|---|
| 1/1000 | 0.0010 s | 1 | **0.0167 s** |
| 1/500 | 0.0020 s | 1 | **0.0167 s** |
| 1/250 | 0.0040 s | 1 | **0.0167 s** |
| 1/125 | 0.0080 s | 1 | **0.0167 s** |
| 1/60 | 0.0167 s | 1 | 0.0167 s |

All five produce a **byte-identical plan** — same `startFrame`, same
`effectiveExposureSeconds`, same derived `playbackDivisor`, same weighting — because
`resolvePlan` quantises first and everything downstream consumes the quantised value.
Five different filenames, one image.

**This is not harmless redundancy. Asking for 1/1000 silently delivers 16× the intended
blur.** The UI reports the honest number (`exposureSecondsForFrames`), so it is not
*lying*, but half the ladder is inert.

Everything from 1/30 up is already distinct and correct; 1/8 is the only slow stop with
a wrinkle (0.125 × 60 = 7.5 → 8 frames → 0.1333 s, i.e. 6.7% slower than its label).

## 2. Why it is capturable — measured, do not re-derive

From the field session recorded in `long-exposure-frame-interpolation.md` §1: at 1/16
playback iRacing produces **~10 distinct rendered frames per replay frame**, with **zero
duplicates rejected on any shot**. Those renders are genuine interpolated sub-frame
moments — that fact is the entire premise of the long-exposure feature and it is already
verified.

The achievable floor is therefore one rendered frame, not one replay frame:

| render size | iRacing fps | renders / replay frame | sim time per sample |
|---|---|---|---|
| 5120×2880 | ~39 | ~10 | **1.6 ms** |
| 2560×1440 | ~73 | ~20 | **0.85 ms** |

A second floor sits at almost exactly the same place: the JS control loop pushes weight
and gate every `SAMPLE_PUSH_INTERVAL_MS` (16 ms wall), which at divisor `P` is `16/P` ms
of sim time — **1.0 ms at P = 16**. So both the sampling granularity and the control
granularity land at ~1 ms of sim time, which is ~1/1000 s.

**Expected outcome per stop at P = 16:**

| stop | exposure | samples @5K | samples @1440p | verdict |
|---|---|---|---|---|
| 1/1000 | 1.0 ms | ~1 | ~1 | at the floor — degenerate, but correctly so |
| 1/500 | 2.0 ms | ~1 | ~2 | marginal at 5K, real at 1440p |
| 1/250 | 4.0 ms | ~2–3 | ~5 | genuinely distinct |
| 1/125 | 8.0 ms | ~5 | ~9 | genuinely distinct |
| 1/60 | 16.7 ms | ~10 | ~20 | unchanged |

A 1/1000 exposure resolving to a single sample is not a bug — that is what a 1/1000
shutter *is*. The bug is 1/1000 resolving to 1/60.

## 3. What already exists — do NOT rebuild any of it

| Thing | Where | State |
|---|---|---|
| `subFramePosition()` | `exposure-math.ts` | written, tested, **already called every sample** |
| sub-frame `sessionTime` | `capture-session.ts` (~line 682) | already computed and already passed to `routeFrame` |
| `windowPosition()` / `weightAt()` | `exposure-math.ts` | continuous in time already — no quantisation anywhere |
| `routeFrame()` / `sinksOpenAt()` | `accumulator-sinks.ts` | pure, tested; the only frame-quantised step |
| Weight-normalised resolve | `shaders.hlsl` `CSResolve` | brightness is independent of sample count, so a short window cannot darken |

**The sub-frame position is already flowing through the system.** It was added to fix
tapered-curve banding (main note §10, Q1) and is already fed into `routeFrame` as
`sessionTime`. What is missing is only that the window *bounds* ignore it.

## 4. What actually has to change

Small, and concentrated in two pure functions plus one loop condition.

### 4.1 `AccumulatorSink` gains a continuous start

```ts
startFrame: number;   // KEEP — integral, drives the SEEK and stays authoritative
startTime: number;    // NEW — continuous window start, in session-time seconds
endFrame: number;     // unchanged, always the anchor
```

`startFrame` becomes `anchor − ceil(exposureSeconds × 60)` (so ≥ 1) and exists purely to
decide where to seek and when the frame-indexed safety net opens. `startTime` is
`anchorTime − exposureSeconds` and is what actually bounds the exposure.

### 4.2 Gate and route on time, not frame index

- `sinksOpenAt()` compares `sessionTime >= sink.startTime` instead of
  `replayFrameNum >= sink.startFrame`.
- `capture-session.ts` computes `inWindow` from the same continuous comparison — note it
  currently duplicates the frame test inline (~line 669) as well as inside `routeFrame`,
  so **both** must move together.
- `routeFrame()` normalises `u` against `sink.startTime` rather than
  `frameTimeOf(sink.startFrame)`.

### 4.3 Planner

`planPrimarySink` and `planBracketSinks` compute `startTime` alongside `startFrame`.
`resolvePlan` stops forcing `effectiveExposureSeconds` to a whole number of frames for
windows below one frame — though see §5.5, because that value is a reproducibility
contract, not just a display string.

### 4.4 Termination is UNCHANGED

Still frame-indexed on the anchor (`frameNum >= sink.endFrame`). Nothing in this proposal
touches the end of the window — only its start.

## 5. Five things that will bite you

### 5.1 It moves wall clock from "weight only" into "exposure duration" — say so out loud

Main note §4 states plainly: *"Wall-clock time is never used to decide replay position,
window boundaries, or termination."* §10 Q1 then carves out `subFramePosition` as **"a
deliberate, bounded exception… it affects a sample's WEIGHT only, never the window bounds
or termination, so a bad estimate can make the taper slightly uneven but can never change
the exposure."**

**This proposal breaks exactly that sentence.** A bad sub-frame estimate would now change
the exposure duration. Two mitigations make it defensible, and both should be written into
the note rather than assumed:

- The error is **bounded by one replay frame**, because `startFrame` still gates the
  frame-indexed safety net and the frame index stays authoritative.
- The status quo is a **16× error** on 1/1000. A bounded sub-frame estimate is strictly
  better than a guaranteed 16× overshoot.

Do not land this without updating §4 and §10 Q1. Leaving a stated invariant contradicted
by the code is worse than either behaviour.

### 5.2 Determinism §9 weakens, and it is a published guarantee

Main note §9 lists what is guaranteed bit-exactly and the **first item is "the window
boundaries (frame-indexed, integer)"**. Sub-frame bounds are wall-clock-estimated, so two
captures of the same recipe would differ slightly in exposure *duration*, not merely in
sample jitter. That is a real weakening of a documented promise. It needs restating as
something like "window boundaries are exact to one rendered frame", and the sidecar should
record the achieved window so a re-shoot can be compared rather than assumed.

### 5.3 Quantisation is ~1 ms, and the boundary sample is the cheap fix

§2 puts both the sampling and control granularity at ~1 ms of sim time at P = 16. Against
a 4 ms (1/250) exposure that is 25%. Since resolve normalises by accumulated weight, the
failure is graceful — a window 25% too long gives 25% more blur, never wrong brightness —
but it is worth reducing.

**The cheap fix is a fractional boundary weight**: the first sample that straddles
`startTime` gets weight scaled by the fraction of it that lies inside the window, instead
of a binary in/out. That is standard antialiasing, it costs one multiply, and it turns a
hard quantisation into a smooth one. Consider doing it in the same change rather than
discovering the stair-step later.

### 5.4 `isSingleFrame` no longer means "no motion blur"

`resolvePlan` sets `isSingleFrame: windowFrames <= 1`, and `validatePlan` turns that into
*"This shutter is shorter than one replay frame, so the result is a single sample with no
motion blur."* Under sub-frame windows a 1/125 shot spans one replay frame but collects
~5–9 samples **with** blur. The warning becomes wrong for exactly the stops this feature
un-breaks. It should key on predicted *sample count* instead.

### 5.5 The sidecar's `effectiveExposureSeconds` is a re-execution contract

It is not a label — the sidecar is a re-executable recipe (main note §6). If it starts
carrying sub-frame values, confirm a round-trip still reproduces the same plan, and decide
what an old sidecar (whole-frame value, written before this existed) should mean. The
safe reading is that old recipes keep their quantised behaviour.

## 6. Interaction with bracketing — this invalidated a premise there

**Resolved: this landed first, and `long-exposure-bracketing.md` §3.3 has been
rewritten to match.** The order below was decided in favour of doing this first, so
bracketing never gets a dedupe written and then deleted. The cost — full-price VRAM
and a two-batch warp dispatch — is now recorded in that brief rather than here.

`long-exposure-bracketing.md` §3.3 argues that five stops collapse to a one-frame window,
so `planBracketSinks` should **dedupe by window length, turning 11 sinks into 7**. That
whole argument is a consequence of the defect this brief removes.

With sub-frame windows **all 11 stops are distinct**, so:

- there is nothing to dedupe, and §3.3 must be rewritten;
- VRAM returns to the full **2.6 GB at 5120×2880** (11 × 236 MB), which §3.3 was relied on
  to avoid — the hard-refuse pre-flight becomes load-bearing rather than theoretical;
- **11 sinks exceeds the 8-UAV cap** on the revised multi-sink warp kernel
  (`long-exposure-frame-interpolation.md`, and bracketing §3.1), so that dispatch would
  need to run in two batches.

**Decide the order deliberately.** Doing this first makes bracketing more useful *and*
markedly more expensive. Doing bracketing first means writing a dedupe that this feature
then deletes.

## 7. Open questions

1. **Is the fast end worth it at all?** 1/250 and 1/125 clearly are. 1/500 is marginal at
   5K, and 1/1000 lands on a single sample. Shipping stops that resolve to 1–2 samples may
   be worse than not offering them — but note a 1-sample capture is the *correct* result
   for 1/1000, not a failure.
2. **Native-side gating instead?** Moving the window test into the capture thread would
   give per-rendered-frame precision (~1.6 ms at 5K) rather than per-telemetry-tick
   (~1.0 ms at P=16). They are the same order today, so it is probably not worth the
   complexity — revisit only if §5.3's fractional weighting proves insufficient.
3. **Should `framesForExposure` keep its `max(1, …)` floor?** Yes for the seek; the
   question is whether anything else should still consume it.

## 8. Do this in order — DONE, steps 1–6

1. ✅ Continuous window on `AccumulatorSink` (`exposureSeconds` + `sinkStartTime`,
   see the header note), `sinksOpenAt` / `routeFrame` gate on session time.
2. ✅ The inline `inWindow` test in `capture-session.ts` is gone — the loop asks
   `routeFrame` once and uses an open sink AS the gate condition, so the two can no
   longer disagree.
3. ✅ Fractional boundary weight (`startBoundaryCoverage`), start only.
4. ✅ `resolveExposureSeconds` / `windowFramesForExposure` in the planner;
   `isSingleFrame` → `isSingleSample`, keyed on predicted samples.
5. ✅ Main note §3, §4, §5, §9 and §10 Q1 amended in place.
6. ✅ Bracketing §3.3 rewritten — the dedupe it prescribed is now a regression, and
   the 8-UAV constraint in its §3.1 needs batching instead.
7. ⏳ Verify on hardware: see §9.

**Answers to §7's open questions, as implemented.** Q1 (is the fast end worth it):
all four stops ship — a 1-sample 1/1000 is the correct result for a 1/1000 shutter,
and the plan warns via `isSingleSample` when only one frame will land. Q2 (native-side
gating): not done, and the fractional boundary weight is why — it reduces the
~1 ms control quantum to a weighted ramp, so per-rendered-frame gating buys little.
Q3 (`framesForExposure`'s floor): kept, and it now has exactly one consumer — the
whole-frame quantiser. `windowFramesForExposure` (ceil) owns the seek span.

## 9. Hardware verification — outstanding

Everything above is verified by 628 unit tests, including an end-to-end harness run
at a realistic 1/16-playback tick rate that measures the achieved window per stop:
16.67 / 8.67 / 4.67 ms for 1/60 / 1/125 / 1/250, with the straddling boundary tick at
1/3 weight — i.e. weighted windows of 16.67 / 8.0 / 4.0 ms, exactly nominal.

**That is a simulation of the transport, not the sim.** What it cannot tell you:
whether iRacing really presents ~10 distinct frames inside the last replay frame at
the moment the gate opens, and whether the sub-frame time estimate tracks reality
well enough that the streak actually shortens.

Shoot 1/60, 1/125 and 1/250 at the same anchor, 2560×1440, **supersample off** (the
fast stops get roughly twice the samples there), and confirm the streak length halves
each step. **Streak length is the observable** — sample count alone will not tell you
the window was right, because a shorter window legitimately collects fewer samples.
Sample counts also carry ±13% run-to-run noise; use `sampling.medianGapSeconds` if a
stable number is needed, and `sampling.achievedWindowSeconds` for the window itself,
which is what the sidecar now records for exactly this comparison.
