# Long exposure — multi-pass accumulation

Status: **designed, not built.** `feat/long-exposure-replay`.
Prerequisite reading: `long-exposure.md` §3 (sampling) and §5 (the sink model and the
weight-by-position rule this depends on), then `long-exposure-frame-interpolation.md`
§9.4–§9.7 (why we drop frames at all) and §10 (why this beats tiling the image).

**The idea in one line:** the exposure window is a *replay* segment, so we can visit
it more than once — capture it N times without clearing the accumulator, and every
pass contributes real samples at instants the other passes missed.

**Why it is nearly free:** the accumulator is already additive and the resolve
already normalises per pixel by accumulated weight. Summing passes is not a new
maths; it is the existing maths run for longer.

---

## 1. What already exists — do NOT rebuild any of it

Read this section before writing code. Four of the five properties this feature needs
are already implemented, and three of them were implemented deliberately for reasons
that make this work.

1. **The accumulator is additive.** `CSAccumulate` (`shaders.hlsl:311`) does
   `acc.rgb += linear * gWeight; acc.a += gWeight`. There is no per-capture state in
   it beyond the buffer itself.
2. **Resolve normalises by ACCUMULATED WEIGHT, per pixel** — not by a nominal sample
   count (`shaders.hlsl:584`). Its own comment says this is what keeps exposure
   correct after duplicate rejection and dropped frames. It is what makes an
   arbitrary number of passes come out at the correct brightness with no scaling
   anywhere.
3. **Weight is a function of position in the window `u`, never of sample index**
   (`exposure-math.ts`, weighting curves; main note §5). A pass that lands on
   different instants therefore composes correctly instead of double-weighting. Had
   weight been index-parameterised this whole design would be unbuildable.
4. **The gate already separates "rolling" from "accumulating"**
   (`mod.rs:411`, `:854`). Re-seeking with the gate closed costs nothing.
5. **Anchor restoration is already a `finally`-guaranteed, non-abortable cleanup**
   (`capture-session.ts:487`, `replay-control.ts:281`). It runs once at the end
   regardless of how many passes ran. Do not put a restore inside the pass loop.

**Nothing in the shaders changes. Nothing in `accumulator-sinks.ts` changes.** The
sink's `startFrame`/`endFrame` are identical on every pass — it is the same window,
visited repeatedly.

---

## 2. What actually has to change

### 2.1 Native — one mandatory change, and it is not optional

`on_frame_arrived` early-returns when the gate is closed (`mod.rs:411`), so
`handle_frame` — and with it the retained colour copy and the `have_prev` flip
(`d3d11.rs:594-598`) — runs **only for gated-in frames**.

Consequence: at the first frame of pass 2, `interp.have_prev` is `true` and the
retained predecessor is **the last frame of pass 1** — content from the anchor end of
the window. Interpolating between it and the window start would warp across the
entire exposure in a single dispatch, at weights `(anchor, start)`. That is not a
subtle artifact; it is a smear of the whole window laid over the first in-betweens of
every pass after the first.

**Add `long_exposure_begin_pass(session, pass_index)`.** It sets an
`AtomicBool` + `AtomicU32` on `SessionShared`; `handle_frame` swaps the flag on the
capture thread and, when set, clears `interp.have_prev` (and `prev_weight`), resets
the digest predecessor (`last_digest` / `last_presented_at`), and adopts the new pass
index. Cross-thread via the flag, not by inferring an edge from `gate_open` — the JS
loop stores the gate value on every 16 ms tick, so there is no reliable edge there.

Cost of the reset: `factor − 1` synthetic samples lost per pass. Negligible.

**Stamp `pass_index` onto each sample-log record** while you are in there. §2.4
depends on it and adding it later means a second native rebuild.

### 2.2 Capture session — wrap steps 2 and 4 in a pass loop

`runCapture` (`capture-session.ts:551`) currently runs: resize → seek → begin session
→ roll and accumulate → pause → resolve. **Steps 2 and 4 become the loop body.** The
resize, the `longExposureBegin`, the resolve and the restore all stay outside it — one
GPU session spans every pass, which is the entire point.

```
resize once
begin session once
for pass in 0 .. passes-1:
    seekToWindowStart(sink.startFrame)         # existing, unchanged
    dither the settle by pass                   # §2.3
    native.longExposureBeginPass(session, pass) # §2.1, skip or no-op on pass 0
    setCaptureSpeed(divisor)
    roll until frameNum >= sink.endFrame        # existing loop body, unchanged
    pause()
resolve once
restore once (finally)
```

**Per-pass state.** All six of these currently live above the loop and are wrong on
pass 2 if left there:

| variable | what breaks if it is not reset |
|---|---|
| `started` (`:642`) | the wall-clock timeout is per pass, not per capture |
| `rolling` (`:643`) | the `playback-stalled` detector never fires again after pass 1 |
| `lastFrameNum` (`:644`) | carries the anchor across the seek |
| `reachedAnchor` (`:645`) | a stalled later pass reports success |
| `frameChangedAt` (`:657`) | stale by the whole inter-pass pause, so the pass's first `subFramePosition` saturates at 0.999 |
| `lastTickAt` (`:665`) | `tickSeconds = (now − lastTickAt)/1000/divisor`; stale it spans the seek and settle, so `startBoundaryCoverage` reports near-full cover for a tick that may lie outside the window |

**Do not reset them — move the loop into its own function and make them locals.**
Then leaking one is unrepresentable rather than merely untested, which is worth more
than any test of the reset.

**Correction to an earlier draft of this section, which called the last two
"silent bias" defects.** Measured, they are bounded: the first tick of a pass lands
during the pre-roll lead (`SEEK_LEAD_FRAMES`, 3 frames before the window), where
`sinksOpenAt`'s frame-indexed net `replayFrameNum >= sink.startFrame` rejects it, and
`lastTickAt` refreshes on every tick thereafter. They could only bite if a seek landed
inside the window. Hazards with no upside, removed by construction — not demonstrated
defects, and a test claiming to catch them would be claiming too much.

**Also measured, and it matters for §2.4:** `startFrameTime` cancels out of both `u`
and `coverage`, because the window bounds are derived through the same `frameTimeOf`.
Re-anchoring per pass therefore affects only the ABSOLUTE `sessionTime` written to the
sample log — which is exactly what the merged gap analysis reads, and nothing else.

`frameTimeOf` re-anchors per pass on a post-seek reading (`:616-619`), which is
already what the code does; keep it inside the loop. The same replay frame yields the
same `ReplaySessionTime` on every pass, so sample times stay comparable across passes
— which §2.4 relies on.

`timeoutMs` (`:638`) is computed from `plan.predictedWallClockSeconds`; that stays
per-pass, so leave the formula alone and just recompute `started`.

The `no-samples` check (`:802`) reads the cumulative counter after the loop, so it
already does the right thing: a sub-frame window where one pass caught no present but
others did is a success, not a failure. Do not tighten it to per-pass.

### 2.3 Phase dither — cheap insurance, and the thing that makes it work at all

If our consumption locks in phase with iRacing's presentation, pass 2 re-samples the
same instants and buys noise reduction rather than density. Force the phases apart:
after `seekToWindowStart` lands, delay a further

```
pass * replayFrameWallMs(divisor) / passes
```

before `setCaptureSpeed`. At 1/16 that is 267 ms / passes — 33 ms steps at 8 passes,
comparable to the ~23 ms present interval, so the passes interleave rather than stack.
`replayFrameWallMs` already exists in `exposure-math.ts`.

This delays when playback *rolls*; it does not move the window, which stays
frame-indexed and gate-enforced. It is not a new use of wall clock — it is the
existing `SEEK_SETTLE_MS` (`replay-control.ts:58`) with a term added.

### 2.4 Sample stats — evenness must stay PER PASS

`summarizeSamples` (`sample-stats.ts:99`) computes gaps between consecutive accepted
entries **in log order** and filters `gap > 0`. Under multi-pass the log is
pass-ordered, so the boundary gap is negative and gets dropped — the function does not
crash, it quietly reports pass-local statistics with one gap missing.

Do not "fix" that by sorting the merged log by `sessionTime`. Merged samples from N
independent passes have near-exponentially distributed gaps, so `median/max` collapses
and `EVENNESS_WARN_THRESHOLD` (0.5) would fire on every healthy multi-pass shot. Worse,
`medianGapSeconds` is the metric §9.7 established as the *only* reliable read on
per-frame cost — merging destroys it.

**Group by `pass_index` (§2.1):**

- `evenness`, `medianGapSeconds`, `dropouts` — computed per pass; report the **worst**
  pass. Meaning preserved, threshold stays calibrated, and §9.7's cost metric survives.
- `maxGapSeconds` and `windowSeconds` — computed on the **merged, time-sorted** log.
  The largest hole in the merged sampling is what actually shows in the image as a
  clump, and no single pass can measure it.
- `accepted` stays the native counter, as today.

Add `passes` to `SampleStats` so `describeSampleStats` can say "3 passes" rather than
implying one.

### 2.5 Guardrails — `achievedRatio` must divide by passes

`buildInterpolationReport` (`capture-session.ts:319`) computes
`realSamples / predictedSamples`, and `predictedSamples` is per pass. Left alone, an
8-pass capture reports ~8.0 and `diagnoseInterpolationShortfall` (`:358`) can never
fire — a genuine shortfall would be masked by exactly the mechanism meant to detect it.

Pass `passes` into `buildInterpolationReport` and divide by `predictedSamples * passes`.

**`index.ts` reads `SAMPLE_SHORTFALL_RATIO` to LEARN this machine's interpolation load
limit** (`capture-session.ts:349-352` says so explicitly). It consumes the same
`achievedRatio`, so fixing it in one place fixes both — but verify it, because the two
diverging is the failure mode that comment exists to prevent.

### 2.6 Planner, recipe, sidecar, UI

- `LongExposureRecipe` (`shot-recipe.ts:88`) gains `passes: number`, default 1.
- `resolvePlan` gains `predictedWallClockSeconds` × passes, plus a per-pass seek and
  settle overhead (`SEEK_TIMEOUT_MS` is a timeout, not a cost; budget ~`SEEK_SETTLE_MS`
  + the dither + a seek round-trip). `predictedSamples` stays **per pass** — it is the
  affordability gate — and a separate `predictedSamplesTotal` carries passes × that.
- The existing long-capture warning (`shot-recipe.ts:530`) already speaks in wall-clock
  seconds, so it needs the multiplied figure and nothing else.
- `validatePlan` gains one warning: passes × predicted samples above `MAX_SAMPLE_LOG`
  (65536) means `logTruncated` and prefix-only diagnostics. Accumulation is unaffected.
- **VRAM is unchanged** — still one sink (`capture-session.ts:426`). No `vram-budget.ts`
  change. Say so in the commit; it is the first question a reviewer will ask.
- Sidecar: `passes` is a reproducibility field, so **`SIDECAR_VERSION` 2 → 3**
  (`metadata.ts:29`). A v2 reader seeing a 3-pass shot would otherwise reproduce a
  materially different image from an identical-looking recipe.
- UI (`LongExposurePanel.vue`): a passes control, and it belongs next to interpolation
  rather than next to resolution — the two are alternatives, which §4 spells out.

---

## 3. Three things that will bite you

### 3.1 Aborting mid-pass biases the taper — but a completed pass is a whole image

A partial single-pass capture is an under-exposed window and correctly fails. A
partial *multi*-pass capture is different in kind: after k complete passes the image
is finished and merely noisier, because every pass covers the whole window.

So: abort stops immediately as it does now, and **if ≥1 pass completed, resolve and
return `ok: true`** with a warning naming the completed count. `passes = 1` keeps
today's behaviour exactly (0 complete passes → `failure: 'aborted'`).

The honest caveat, which belongs in the warning: the partial final pass cannot be
removed from the accumulator, so the window positions it did reach are over-weighted
by roughly `(k+1)/k`. With box weighting that is uneven exposure across the window —
the same defect `evenness` measures. Bounded and small for k ≥ 3; say it rather than
hide it.

### 3.2 The failure mode is soft, and that is a feature — but check it on smoke

Anything iRacing does not drive from telemetry — tyre smoke, spray, particles, crowd,
flags, temporal-AA history — decorrelates between passes. Under accumulation those
regions **average**, so they go soft and slightly mushy rather than breaking. That is
the whole reason this design was chosen over tiling the image (§10.3 of the
interpolation note), where the same decorrelation produces a hard straight-line seam.

Soft is not the same as free. **A smoke-heavy scene is the acceptance test**, not a
clean one — a clean scene cannot distinguish this design from a broken one.

### 3.3 It only pays where it is cheap, and that is a real constraint on the UI

Wall clock is passes × window × divisor. The regime that needs this — sub-frame
windows, 7–15 real samples, ~350 ms of playback at 1/16 — costs ~3 s of capture plus
seek overhead at 8 passes. A 1″ exposure at 1/16 is 16 s **per pass** and unaffordable
at 8 — but it already has hundreds of samples and does not need any.

Passes are needed exactly where they are cheap and pointless exactly where they are
not. Let the UI say so: default 1, and surface the control (or a suggestion) when
`plan.isSubFrameWindow` or `predictedSamples` is low.

---

## 4. Interaction with frame interpolation — they are alternatives, not partners

The point of multi-pass is that it supplies **real** samples where interpolation
supplies synthetic ones, at a lower per-frame cost (23 ms vs 34.6 at 5K, §9.7). Eight
passes with interpolation **off** is ~120 real samples against today's 7 real + ~49
synthetic.

Running both is legal and the code will do it, but it is the worst of the trade: the
interpolation cost cuts each pass's real-sample yield by ~half, so 8 passes at 8× buys
~56 real + ~400 synthetic for the same wall clock that plain multi-pass spends on 120
real. **Default `passes > 1` to interpolation off**, and if both are set explicitly,
warn.

Interaction with **bracketing**: unchanged and additive — bracketing multiplies sinks,
multi-pass multiplies visits, and the two compose without touching each other. But
bracketing's VRAM problem (`long-exposure-bracketing.md` §3.3, 2.6 GB at 5K) is
untouched by this; the fix for *that* is the tiling idea, filed in §10.4 of the
interpolation note.

---

## 5. Open questions

1. **Does presentation phase actually drift, or does the dither carry it?** Falsifiable
   from data already recorded — every sample logs `u`, so the sidecar's `u` histogram
   shows interleaving vs stacking directly. Check it on the first hardware run before
   tuning anything.
2. **Does iRacing re-render a replay segment identically enough?** §3.2 is the test.
   If a scene decorrelates badly, the fallback is fewer passes, not a different design.
3. **Should `passes` be solved rather than chosen?** A "target real samples" that picks
   passes the way `solvePlaybackDivisor` (`exposure-math.ts:294`) picks a divisor is the
   natural end state — the divisor ladder caps at 16 (`:26`), so passes are the only
   remaining lever on sample density for short windows. Ship the explicit control first.

---

## 6. Do this in order

**Status 2026-08-03: ALL EIGHT STEPS ARE DONE.** 681 JS tests + 28 Rust tests,
vue-tsc and prettier clean, `npm run pack` builds, addon rebuilt and installed.
One hardware run so far (§7): checks 1 and 2 pass, 3 and 4 outstanding.

Two items were pulled forward out of order, both because shipping without them would
have made something LIE rather than merely be incomplete: step 4, because
`achievedRatio` unadjusted disables the shortfall guardrail exactly when multi-pass
makes shortfalls hardest to see; and the totals in step 6, because a UI that quotes
one pass of an eight-pass wait is worse than no UI at all.

**Step 5 was then taken before step 3, reversing the order below,** because the first
hardware run showed the interleaving question is unmeasurable without per-pass
grouping — and the dither in step 3 is an intervention aimed at exactly that. Measure,
then intervene. The cost of that choice: **no no-dither baseline was ever captured**,
so if interleaving later looks good, it cannot be attributed to the dither rather than
to luck. If interleaving looks BAD, re-testing with the dither disabled is the first
thing to try.

1. **Native**: `long_exposure_begin_pass` + `have_prev`/digest reset + `pass_index` on
   the sample log. Rebuild (`cargo build --release`, recopy `wgc-capture.node`) — the
   app must be stopped first. Rust tests for the reset.
2. **Capture session**: the pass loop, with the roll extracted into a per-pass
   function so all six pieces of loop state are locals (§2.2). Test the broad
   invariant — passes are interchangeable, weight and `u` identical across them —
   rather than probing for a specific leak.
3. **Phase dither** (§2.3), with a test that pass *k* waits the expected amount.
4. **`achievedRatio` ÷ passes** (§2.5), and confirm `index.ts` learns on the same
   number. Pin the boundary on both sides as the existing test does.
5. **Sample stats**: per-pass grouping, merged `maxGapSeconds` (§2.4).
6. **Planner / recipe / validation / sidecar v3** (§2.6).
7. **Abort-with-completed-passes** (§3.1).
8. **UI** (§2.6), defaulting interpolation off when passes > 1 (§4).

Steps 1–2 alone are a testable feature: hard-code `passes` and shoot. Do not do 3–8
before that has run on hardware once.

---

## 7. Hardware verification — the falsifiable claims

**FIRST RUN 2026-08-03. Checks 1 and 2 PASS; 3 and 4 are still outstanding.**

Road America, panning shot of an LMP2, anchor 3537, 1/250 at 1/16, 2× supersample,
interpolation off, 3 stops recovery, box. Shot 36 = 1 pass, shot 37 = 4 passes,
identical in every other field. Measured by decoding both 16-bit masters with pngjs
(NOT sharp — it reduces to 8-bit on read).

| | 1 pass | 4 passes |
|---|---|---|
| real samples | 4 | 13 (3.25×) |
| **mean luma** | **0.357534** | **0.357029** — ratio **0.99859** |
| achieved window | 0.00365 s | 0.00390 s |

**Check 2 (exposure invariance) passes decisively: 0.9986, not 4.0.** Per region: sky
0.99994, car 0.99960, grass 0.99920, crowd 0.99497. The per-pixel weight
normalisation in `CSResolve` carries multi-pass with no change, as designed.

**Check 1 (density) passes, and the difference lands where it should.** The two
images are not identical — they should not be — and the difference is CONCENTRATED
rather than uniform (block max/median ratio 7.0×):

| region | mean per-pixel abs difference |
|---|---|
| sky (static) | 0.00054 |
| car body (tracked, sharp) | 0.00303 |
| crowd band (panned blur) | 0.02250 |
| foreground grass (panned blur) | 0.02588 |

40–48× more difference in the motion-blurred regions than in the static sky. **That
is also the strongest available evidence against §3.2's decorrelation risk**: TAA
jitter, particles or crowd animation would move the sky and the sharp car too, and
they do not (sky max deviation 0.5%, at the noise floor). The extra samples change
the streak where there is a streak, and nothing where there is not.

The achieved window grew only 6.8% while sample count grew 3.25× — passes repeat the
window rather than lengthening it, which is the other thing that had to be true.

**SECOND RUN 2026-08-03 — check 3 (the interpolation reset) PASSES.**

Road America, anchor 6215, 2560×1440, 1/60, recovery 0. Shot 40 is **2 passes at
8× interpolation** (25 real + 161 synthetic); shot 41 is the 1-pass
interpolation-off reference at the same anchor (14 real).

`begin_pass` clearing `have_prev` works. Had it not, pass 2's first warp would have
interpolated between the window's END and its START, depositing 7 synthetic samples
of full-window displacement at ~4% of total weight — on a pan this wide, an obvious
frame-spanning ghost. **There is none.** The car is sharp, the background streaks
along the pan axis, and whole-frame luma sits at 0.99961 of the reference.

Real samples 25 across 2 passes against 14 in one, i.e. ×1.79 — multi-pass density
confirmed at a second anchor.

**Interleaving (§5 Q1) is now measurable but the answer is WEAK.** Merged
`maxGapSeconds` went 0.00169 (1 pass) → 0.00156 (2 passes), only **8% better**,
where genuine interleaving predicts closer to half. Do not read that as settled:
this pair is a poor test of it — two passes only, and interpolation on in one of
them but not the other, so per-pass sample yield differs. **The clean test is
interpolation OFF, 1 pass vs 4, comparing merged `maxGapSeconds`.** If that also
comes back near 1.0, the phase dither is not doing its job and §5 Q1 reopens.

**What the first run did NOT establish, and cannot:**

- **Interleaving (§5 Q1) is still open, but is now measurable.** Shots 36/37 were
  taken on a build where step 5 did not exist, so `summarizeSamples` still walked the
  log in ARRIVAL order and dropped the negative pass-boundary gaps — making
  `evenness` (0.5102) and `maxGapSeconds` (0.003062, apparently doubled) pass-LOCAL
  figures rather than merged ones. **Do not read that 0.5102 as uneven sampling.**
  Step 5 has since landed, so the NEXT multi-pass shot reports a genuinely merged
  `maxGapSeconds`: if the passes interleave it should fall well below the single-pass
  0.001438, and if they stack it will sit at roughly the per-pass figure.
- **Check 3 (interpolation reset) is untested.** Interpolation was off in both shots,
  so `begin_pass` clearing `have_prev` — the one mandatory native change — has never
  executed against a real pass boundary.
- **Check 4 (smoke) is untested.** Clean scene, no smoke or spray. The confounder in
  this one: iRacing's crowd is animated AND is the most motion-blurred region, so
  those two contributions cannot be separated here.

Never run against live iRacing; replay only.

1. **Density.** Same anchor, sub-frame shutter, 2560×1440, supersample and
   interpolation off. 1 pass vs 4 passes: `accepted` should scale ~4×, and the merged
   `maxGapSeconds` should fall. If `accepted` scales but `maxGapSeconds` does not, the
   passes stacked in phase — go to §5 Q1.
2. **Exposure invariance.** The same shot at 1 and 8 passes must have the **same
   brightness**, not 8× — that is the resolve's per-pixel weight normalisation working,
   and it is the single most falsifiable property here. If it is not, something is
   scaling by sample count somewhere.
3. **Interpolation reset.** 2 passes with interpolation ON, and look at the first
   in-betweens of pass 2. §2.1 not done shows as a full-window smear; there is no
   subtle version of this failure.
4. **Smoke.** §3.2. A scene with tyre smoke or spray, 8 passes. Expect soft; reject
   seams, ghosting or structured artifacts.
