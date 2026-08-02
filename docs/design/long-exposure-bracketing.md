# Long exposure — exposure bracketing

Status: **not started.** This is a handoff brief for the next session.
Prerequisite reading: `docs/design/long-exposure.md` §5 (the sink model), then
`docs/design/long-exposure-frame-interpolation.md` §6–§7 for what landed most
recently.
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

### 3.1 The fused warp kernel becomes a pessimisation at N > 1

`CSWarpAccumulate` fuses "warp to time t" with "accumulate into the sink", which was a
genuine win at one sink (no full-resolution intermediate is ever written — it is why
the measured interpolation cost came in under the estimate).

**With N sinks that fusion redoes the entire warp N times.** The warped image is
identical for every sink; only the weight differs. At 8 stops and factor 4 that is
`3 × 8 = 24` full warp dispatches per captured frame instead of 3.

Fix: keep both paths. `N == 1` uses the existing fused kernel; `N > 1` splits into
`CSWarp` → one scratch texture, then N cheap `CSAccumulate` passes against it. Budget
one extra full-res RGBA (or RGBA16F) scratch surface for that.

**Do not discover this by measuring a slow capture — it is structural.**

### 3.2 Sink ids are filename-hostile

Sink ids are shutter keys: `'1/8'`, `'1/1000'`. They go into the native sink map
(fine) **and into output filenames (not fine)** — `/` is a path separator. `'0.5'` is
also awkward next to an extension.

Sanitise at the output layer only; do not change the ids themselves, because they are
the stable key shared by the planner, the native map and the sidecar. Something like
`1/8 → 1-8`, `0.5 → 0s5`. Note `variantSuffix()` already appends `--{variantId}` for
the Spotter Pack seam, so pick a scheme that composes with it rather than collides.

### 3.3 Most of the fast end of the bracket set is redundant, and it is expensive

`framesForExposure()` is `max(1, round(seconds × 60))`. So on the ladder:

| stop | 1/1000 | 1/500 | 1/250 | 1/125 | 1/60 | 1/30 | 1/15 | 1/8 | 1/4 | 0.5" | 1" |
|---|---|---|---|---|---|---|---|---|---|---|---|
| window frames | 1 | 1 | 1 | 1 | 1 | 2 | 4 | 8 | 15 | 30 | 60 |

**Five stops all collapse to a one-frame window and would produce five essentially
identical images**, each costing a full accumulator.

At 5120×2880 an accumulator is `14.75 Mpx × 16 B = 236 MB`. Bracketing from 1" is 11
stops = **2.6 GB**, of which ~1.2 GB is those duplicates. At 4K with 2× supersample it
is 531 MB per sink — 11 stops = **5.8 GB**, which will hard-refuse on a lot of cards.

So `planBracketSinks` should **dedupe by window length**, keeping the slowest stop of
each distinct frame count. That turns 11 sinks into 7 and is a few lines in a function
that already has tests around it. The VRAM pre-flight then tells the truth, and the
existing hard-refuse path (§7 of the main design note) does its job.

---

## 4. Interactions with what landed this session

- **Highlight recovery** is a per-session shader constant, applied identically to
  every sink. Nothing to do.
- **Interpolation** needs §3.1 handled. Also note the flow field is computed **once
  per captured frame** regardless of sink count — only the warp/accumulate multiplies —
  so NVOFA cost does not scale with the bracket set.
- **Interpolation VRAM** (`INTERPOLATION_BYTES_PER_PIXEL`) is per-session, not per
  sink, and `estimateLongExposureVram` already treats it that way. Adding the §3.1
  scratch surface means adding to that constant, not to the per-sink one.

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

1. Dedupe `planBracketSinks` by window length, with a test. (§3.3 — cheapest, and it
   changes the VRAM maths everything else is sized against.)
2. Native: multi-sink create / per-sink weights / multi-image finish.
3. Capture session: plan N, route N, `sinkCount: sinks.length`.
4. Split the warp kernel for `N > 1`. (§3.1)
5. Output: N files, with id sanitising. (§3.2)
6. UI toggle + predicted stop list and VRAM.
7. Measure: one bracketed capture should cost the same wall-clock as one unbracketed
   one at the slowest stop. If it does not, something is being done per-sink that
   should be done per-frame.
