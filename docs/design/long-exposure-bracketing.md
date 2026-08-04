# Long exposure — exposure bracketing

Status: **not started.** This is a handoff brief for the next session.
Prerequisite reading: `docs/design/long-exposure.md` §5 (the sink model), then
`docs/design/long-exposure-frame-interpolation.md` §6–§7, and
`docs/design/long-exposure-subframe-windows.md` — sub-replay-frame windows have
since landed and they **invalidated §3.3 of this brief**, which is rewritten below.
Feature branch: `feat/long-exposure-replay` (`891864a`, `95ddc80`).

**The idea in one line:** with a trailing window every bracket stop shares the same
terminal frame and differs only in how far back it reaches, so a faster shutter is
literally the tail subset of the samples already flowing past. One capture, N images.

---

## 1. What already exists — do NOT rebuild any of this

The pure planning layer was written and unit-tested during v1 specifically so that
this work would be wiring rather than design. All of it is live and covered:

| Thing | Where | State |
|---|---|---|
| `planBracketSinks()` | `utilities/long-exposure/accumulator-sinks.ts` | written, tested, **never called** |
| `shutterStopsAtOrFaster()` | `utilities/long-exposure/exposure-math.ts` | written, tested, only used by the above |
| `routeFrame()` / `sinksOpenAt()` | `accumulator-sinks.ts` | live — already called with a **one-element array** |
| `earliestStartFrame()` | `accumulator-sinks.ts` | written, tested, unused |
| Per-sink weighting (`u` against each sink's OWN window) | `routeFrame` | done |
| Per-sink continuous window (`exposureSeconds`, `sinkStartTime()`) | `accumulator-sinks.ts` | done — every stop on the ladder is now distinct, see §3.3 |
| Backend N-sink support (`create_sink(sink_id, …)`, `resolve(sink_id, …)`) | `longexp/d3d11.rs` | **already keyed by string id, HashMap-backed** |
| VRAM estimate scaling by `sinkCount` | `utilities/long-exposure/vram-budget.ts` | done, tested at `sinkCount: 10` |

So the backend, the router and the planner are all N-ready. **Nothing above the
backend boundary needs redesigning.**

---

## 2. What actually has to change

### 2.1 Native (`native/wgc-capture/src/longexp/mod.rs`) — the real work

`PRIMARY_SINK` is hard-coded in exactly three places (`create_sink`,
`accumulate_sample`, `resolve`). Those are easy. The awkward part is the **weight
channel**, which is currently scalar:

```rust
weight_bits: AtomicU32,   // ONE weight for the whole session
u_bits: AtomicU32,
```

Every sink needs its own weight per frame, because a 1/1000 stop is at full weight at
the anchor while the 1/8 primary is only part-way through its taper. So:

- `long_exposure_create_sinks(session, ids: Vec<String>)` — or pass the ids to
  `long_exposure_begin` and create them all on the first frame, which is where the
  frame size is established (that is how `enable_interpolation` already works, and it
  is the pattern to copy).
- `long_exposure_set_sample` grows a per-sink dimension. Simplest shape that keeps the
  hot path allocation-free: `set_sample(session, sink_index, weight, u, frame, time)`
  called once per open sink per tick, with sinks identified by a stable index assigned
  at creation. A `Vec<AtomicU32>` behind the existing `SessionShared` works and stays
  lock-free.
- `long_exposure_finish` currently resolves one sink and returns one image. It must
  return `Vec<{ sinkId, data, width, height }>`. **It also consumes the session**, so
  resolve every sink before tearing down.
- `accepted`/`rejected` stay global (they count frames CONSUMED, which is per-session,
  not per-sink). Per-sink sample counts are a separate, additive counter if wanted.

### 2.2 Capture session (`src/main/long-exposure/capture-session.ts`)

- `planPrimarySink(...)` → `planBracketSinks(...)` when bracketing is on. Keep the
  single-sink path; do not make every shot go through the bracket planner.
- Seek target becomes `earliestStartFrame(sinks)`. With an at-or-faster ladder that is
  the primary's own start, so **the seek is unchanged in practice** — but use the
  helper anyway so a future mixed set cannot break it.
- `routeFrame({ sinks, ... })` already returns N contributions; stop destructuring
  `const [contribution] =` and push all of them.
- `sinkCount: 1` in the VRAM pre-flight becomes `sinks.length`. **This matters — see
  §3.3.**
- `LongExposureOutcome.image` becomes a list. Everything downstream follows.

### 2.3 Output (`src/main/long-exposure/output.ts`)

N masters, N previews, N thumbnails, N sidecars. Each sidecar records its own stop's
`exposure.*` and `sampling.*` while sharing the capture-level fields (anchor, backend,
interpolation report, context).

### 2.4 UI

A toggle plus a preview of which stops the current shutter would emit, and the
predicted VRAM. The panel already shows a predicted-samples line; extend that.

---

## 3. Three things that will bite you

### 3.1 The fused warp kernel redoes the warp per sink — but do NOT split it

**REVISED 2026-08-02. The fix this section originally prescribed would now undo a
change that has already landed. Read this version, not the git history.**

The problem is real and unchanged: `CSWarpAccumulate` fuses "warp" with "accumulate
into the sink", so **with N sinks that fusion redoes the entire warp N times.** The
warped image is identical for every sink; only the weight differs.

What changed is the shape of the kernel. Since
`long-exposure-frame-interpolation.md` §9.1, one dispatch computes *all* `factor - 1`
synthetic samples, sums them weighted in registers, and does a **single** accumulator
read-modify-write. So per captured frame per sink it is now 1 dispatch, not
`factor - 1` of them — at 8 stops and factor 4 that is 8 dispatches, not the 24 this
section originally predicted.

**The originally proposed fix — `CSWarp` into a scratch texture, then N cheap
`CSAccumulate` passes — is now actively wrong.** After §9.1 the synthetic samples never
exist simultaneously; they are summed in registers and discarded. Materialising them
would mean writing `factor - 1` full-resolution intermediates (7 surfaces at factor 8)
and reading them back N times, which is precisely the traffic §9.1 removed. It would
be slower at N = 1 *and* at N > 1.

The right shape instead: **keep the fused kernel and give it N accumulator UAVs.** One
dispatch warps once and does N read-modify-writes, one per sink, from values already in
registers. Each sink needs its own `(prevWeight, curWeight)` pair, so `WarpParams`
grows an array of them rather than the two scalars it carries today. The accumulator
traffic is irreducible — every sink has its own accumulator and must be written — but
the warp sampling stops multiplying, which is the whole win.

**Constraint that sizes the design:** D3D11 feature level 11_0 guarantees 8 UAV slots
to a compute shader. That caps a single dispatch at 8 sinks. This used to fit, because
§3.3 deduped 11 stops down to 7 — **it no longer does, and §3.3 has been rewritten**.
A full ladder is 11 distinct sinks, so the dispatch runs twice over disjoint subsets,
re-warping once per batch rather than once per sink. Two warps for 11 sinks still
beats eleven, so the shape of §3.1 is unchanged; only the batching is new.

**Do not discover any of this by measuring a slow capture — it is structural.**

### 3.2 Sink ids are filename-hostile

Sink ids are shutter keys: `'1/8'`, `'1/1000'`. They go into the native sink map
(fine) **and into output filenames (not fine)** — `/` is a path separator. `'0.5'` is
also awkward next to an extension.

Sanitise at the output layer only; do not change the ids themselves, because they are
the stable key shared by the planner, the native map and the sidecar. Something like
`1/8 → 1-8`, `0.5 → 0s5`. Note `variantSuffix()` already appends `--{variantId}` for
the Spotter Pack seam, so pick a scheme that composes with it rather than collides.

### 3.3 Every stop is now distinct — there is nothing to dedupe, and it costs full price

**REWRITTEN 2026-08-02. This section used to prescribe a dedupe. That dedupe is now
dead code waiting to be written — do NOT write it.**

The original argument: `framesForExposure()` was `max(1, round(seconds × 60))`, so
1/1000, 1/500, 1/250, 1/125 and 1/60 all collapsed to a one-frame window and would
have produced five essentially identical images, each costing a full accumulator.
`planBracketSinks` should therefore dedupe by window length, 11 sinks → 7.

That collapse was the defect fixed by `long-exposure-subframe-windows.md`. A sink now
carries a continuous `exposureSeconds`, so the ladder looks like this:

| stop | 1/1000 | 1/500 | 1/250 | 1/125 | 1/60 | 1/30 | 1/15 | 1/8 | 1/4 | 0.5" | 1" |
|---|---|---|---|---|---|---|---|---|---|---|---|
| window (ms) | 1.0 | 2.0 | 4.0 | 8.0 | 16.7 | 33.3 | 66.7 | 133 | 250 | 500 | 1000 |
| seek span (frames) | 1 | 1 | 1 | 1 | 1 | 2 | 4 | 8 | 15 | 30 | 60 |

**All 11 windows are distinct** (there is a test asserting exactly that), so
bracketing emits 11 genuinely different images and there is nothing to collapse.
The seek span row is why the fast five still share a `startFrame`: they all start
inside the last replay frame, at different moments within it.

Three consequences, and they are the ones that size this work:

- **VRAM returns to full price.** At 5120×2880 an accumulator is
  `14.75 Mpx × 16 B = 236 MB`, so 11 stops is **2.6 GB** — none of it recoverable by
  deduping. At 4K with 2× supersample it is 531 MB per sink, **5.8 GB** for 11, which
  will hard-refuse on a lot of cards. The hard-refuse pre-flight (§7 of the main note)
  becomes load-bearing rather than theoretical, and the "bracket to N stops faster"
  control in open question 1 stops being a nicety and starts being the mitigation.
- **11 sinks exceeds the 8-UAV cap** that §3.1 sized the multi-sink warp kernel
  against. D3D11 feature level 11_0 guarantees 8 UAV slots to a compute shader, and
  §3.1 was written assuming this section would dedupe down to 7. It will not. The
  dispatch has to run in two batches over disjoint sink subsets, re-warping once per
  batch — twice, not eleven times, so the §3.1 win survives; it just is not free.
- **The fast stops are cheap in samples, not in memory.** A 1/1000 sink accumulates
  ~1 sample and still costs a full 236 MB accumulator, because memory scales with sink
  count and not sample count (main note §5). That is the whole structural win over JRT
  read backwards: the thing that makes 960 samples free is the same thing that makes
  an eleventh stop expensive.

---

## 4. Interactions with what landed this session

- **Highlight recovery** is a per-session shader constant, applied identically to
  every sink. Nothing to do.
- **Interpolation** needs §3.1 handled, and until it is the two **cannot both run**.
  `executeRecipe` forces the factor to 1 whenever more than one sink is planned;
  `validatePlan` says so before the shot and the sidecar records `requestedFactor`
  alongside `enabled: false` with bracketing as the reason.

  **The claim this bullet used to make was wrong, and the guard exists because of
  it.** It said the flow field is computed "once per captured frame regardless of
  sink count — only the warp/accumulate multiplies". That is true of the design in
  §3.1 and false of the code that ships: `accumulate_sample` is called **once per
  open sink**, and `accumulate_interpolated` advances the whole per-frame
  interpolation state on every call — `dispatch_luma` into `luma_uav[cur]`, a
  full-res `CopyResource` into `rgba[cur]`, `flow.execute`, then the ping-pong flip.
  So for the second and later stops of a frame **both ping-pong slots already hold
  that same frame**: flow runs between identical inputs and the warp deposits
  `factor - 1` zero-motion COPIES of the real frame in place of in-betweens. Every
  stop but the primary comes out quietly wrong — under-blurred rather than visibly
  broken — and NVOFA runs N times per frame rather than once. `prev_weight` also
  ends up holding the last sink's weight, so even the primary's next warp is
  weighted from the wrong stop under a tapered curve.

  Implementing §3.1 is what lifts the guard: one dispatch, one warp, N
  read-modify-writes from registers, and the retained state advanced exactly once
  per captured frame. **Move the luma/retain/flow out of the per-sink loop as part
  of that** — leaving them inside is the actual defect, and the UAV batching alone
  does not remove it.
- **Interpolation VRAM** (`INTERPOLATION_BYTES_PER_PIXEL`) is per-session, not per
  sink, and `estimateLongExposureVram` already treats it that way. It is now `4+4+1+1`
  rather than `4+1+1`: the warp reads both frames through owned `_TYPELESS` copies so
  they can carry `_UNORM_SRGB` views. Under the revised §3.1 there is **no scratch
  surface to add** — the multi-sink kernel writes straight to the accumulators.

---

## 5. Open questions

1. **Does the user want every stop, or a chosen subset?** Eleven files per shot is a
   lot of gallery noise. A "bracket to N stops faster" control may be friendlier than
   "everything at or faster".
2. **Which stop goes to the gallery?** The still path sends one `screenshot-response`.
   Probably the primary, with the rest discoverable on disk — but that is a product
   call.
3. **Should bracket stops share one sidecar or get one each?** One each is more
   reproducible (each is a re-executable recipe); one shared is less clutter.

---

## 6. Do this in order

1. Decide how many stops a bracket emits, and pre-flight the VRAM for that number.
   (§3.3 — this changes the maths everything else is sized against, and it replaces
   the dedupe this step used to say. There is no dedupe to write: all 11 windows are
   distinct. Open question 1 — "bracket to N stops faster" — is now the lever that
   keeps a 5.8 GB shot from being the default.)
2. Native: multi-sink create / per-sink weights / multi-image finish.
3. Capture session: plan N, route N, `sinkCount: sinks.length`.
4. Give the warp kernel N accumulator UAVs, in batches of 8. (§3.1 — and read its
   2026-08-02 revision first: do NOT split it into warp-then-accumulate, which is what
   the original text said and would now be a regression.)
5. Output: N files, with id sanitising. (§3.2)
6. UI toggle + predicted stop list and VRAM.
7. Measure: one bracketed capture should cost the same wall-clock as one unbracketed
   one at the slowest stop. If it does not, something is being done per-sink that
   should be done per-frame.
