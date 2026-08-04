# Long exposure — frame interpolation, and the "unnatural blending" problem

Status: **implemented and hardware-verified, including on a live iRacing replay.**
The §9 warp optimisation landed a measured **2.63× on per-frame consumption** at
5120×2880 (§9.3) — real but **not sufficient**: 8× still reaches only ~47% of the
interpolation-off sample count.

**Before touching this path again, read §9.4–§9.7.** A bench that runs the same kernel
without iRacing shows 8× at 5120×2880 keeping up comfortably when it has the GPU to
itself, so the remaining field gap is **contention with iRacing's own rendering**, not
an inefficient kernel. Three obvious follow-ups have since been measured and are all
dead — group shape (§9.6, zero effect), dropping 8× to 4× (§9.5, saves nothing), and
`NV_OF_PERF_LEVEL_FAST` (§9.5, faster on the bench and ~35% SLOWER on a replay).
§9.7 records the metric to use and the noise floor, because most of those questions
cannot be answered from sample counts at all.
Prerequisite reading: `docs/design/long-exposure.md`.
Feature branch: `feat/long-exposure-replay` (commits `d7c5cc0`, `70a89ca`).

---

## 1. What we actually know, measured

From a field session on RTX 4090 / Road America replay (2026-08-02), sidecars in
`~/Pictures/Screenshots/*.json`:

| | measured |
|---|---|
| render size used | 5120×2880 (2560×1440 output at 2× supersample) |
| iRacing render rate at that size | ~39 fps (~73 fps at the user's normal window) |
| samples for a 1 s exposure at 1/16 | **620** |
| duplicates rejected | **0**, on every shot |
| distinct renders per replay frame | ~10 |
| seeks landed exactly / restore corrections | all / 0 |

Two conclusions worth not re-deriving:

- **iRacing genuinely renders distinct interpolated frames during slow-motion
  replay.** ~10 per positional frame at 1/16. The core premise of the design holds,
  and zero duplicates were ever rejected.
- **Sample density is the binding constraint, and it is bounded by iRacing's render
  rate at the capture resolution.** Not by us, not by memory, not by WGC.

Per-sample displacement for a car crossing frame in 1 s at 620 samples is ~4 px.
A continuous streak needs ≲1 px. Hence the ghosting.

After halving the render size (supersample off) the user reported **"less ghosting
but the blending is still unnatural."** That phrasing matters: two different
defects are in play and they have different fixes.

---

## 2. Rank the hypotheses before writing any CUDA

Frame interpolation is expensive to build. Do not start it until the cheaper
candidates are excluded, because at least one of them is more likely to be what
"unnatural" means.

### H1 — Clipped highlights carry no energy. **Most likely. Cheapest to test.**

iRacing hands us display-referred SDR that has *already* been tonemapped, so every
highlight is clamped at 1.0. In a real long exposure a specular glint or a headlight
is 100–1000× the midtone, so as it sweeps it leaves a **bright** trail. In ours it
is 1.0, and averaged over 620 samples where it occupies 1 % of them it contributes
0.01 — a dim grey smudge.

**This is why the streak has no sparkle, and it is exactly the kind of thing that
reads as "unnatural" without the viewer being able to name it.** It is also the
single biggest perceptual difference between a real long exposure and a naive
frame average, and it is well known in VFX motion blur.

Fix: expand near-clipped values back into HDR before accumulating —
`if (v > t) v = t + pow((v - t) / (1 - t), k) * boost` in `CSAccumulate`, in linear
space, with `t ≈ 0.8` and a user-facing "highlight boost" parameter. Then let the
ACES tonemapper bring it back down at resolve (which is what ACES is for, and why
it is already wired). Roughly a dozen lines of HLSL plus one recipe field.

Test it before anything else. If the user's complaint is "the bright bits look
dull and flat", this is the whole answer.

### H2 — Tapered curves look digital

`linear` and `ease` are artistic effects. A photographic exposure is a **box**
integration: shutter open, constant weight. If the reference in the user's head is
photography, tapered curves will always look wrong. The banding bug that made them
worse is fixed (`70a89ca`), but the curves are still not photographic.

Cost to test: zero. Shoot the same frame with `box`.

### H3 — Nothing in the frame is sharp

With a static camera the background is sharp and the car smears (correct, and what
a tripod shot looks like). With a chase/onboard camera **everything** smears and the
eye has nothing to anchor on. That reads as mush, not as a photograph.

Cost to test: zero. Compare a static trackside camera against a chase camera. This
may be a documentation/guidance answer rather than a code one.

### H4 — Discrete ghosts from sample density

The one interpolation actually fixes. Only pursue it once H1–H3 are excluded, and
only if the residual defect is specifically *a ladder of separable copies* rather
than *flat, energy-less blur*.

---

## 3. Frame interpolation: the design

### 3.0 Verified on hardware, 2026-08-02 — do not re-derive

- **`nvofapi64.dll` ships with the NVIDIA driver** (found in `System32`, file version
  tracking the driver's). **Nothing for the end user to install**, which preserves
  the constraint JRT violated.
- Its exports include **`NvOFAPICreateInstanceD3D11`**, alongside `…Cuda`, `…D3D12`
  and `…Vk`, plus `NvOFInit` / `NvOFExecute` / `NvOFDestroy` /
  `NvOFGetMaxSupportedApiVersion`. The D3D11 path is real and reachable.
- **The public SDK repo does NOT contain a D3D11 header.** `NVIDIA/NVIDIAOpticalFlowSDK`
  ships exactly two headers — `nvOpticalFlowCommon.h` and `nvOpticalFlowCuda.h`
  (verified against the git tree). `NV_OF_D3D11_API_FUNCTION_LIST` is only in the
  gated SDK download from developer.nvidia.com. **Do not guess its layout**: a wrong
  function-pointer table calls arbitrary addresses rather than failing cleanly.
- **Adapter risk is real and now instrumented.** `windows-capture` creates its
  device against the DEFAULT adapter. The dev box has an AMD iGPU beside the RTX
  4090; it resolved to the 4090, but a hybrid laptop may not. `longExposureDeviceInfo()`
  reports adapter / vendor id / `isNvidia`, threaded through the availability gate.
  NVOFA cannot bind to a non-NVIDIA device, so this must gate the interpolation
  path — and must NOT gate the base feature.

Known from `nvOpticalFlowCommon.h` (public, so no download needed for these):
`NV_OF_FLOW_VECTOR` is `{ int16_t flowx; int16_t flowy; }`;
`NV_OF_OUTPUT_VECTOR_GRID_SIZE` ∈ {1, 2, 4}; `NV_OF_BUFFER_FORMAT` includes
`ABGR8`, `GRAYSCALE8` and `NV12`; `NV_OF_PERF_LEVEL` ∈ {SLOW=5, MEDIUM=10, FAST=20};
`NV_OF_API_VERSION` is `(major << 4) | minor`, currently 2.0.
**Still unverified — get from the real header, do not assume:** the fixed-point
scale of the flow vectors, and the exact `NV_OF_D3D11_API_FUNCTION_LIST` layout.

### 3.1 "CUDA level" almost certainly needs no CUDA

The reference tool calls this its CUDA level, which framed the whole thing as a
CUDA problem. **It is not.** NVIDIA's Optical Flow SDK exposes the Turing+ hardware
optical flow accelerator (NVOFA) through **CUDA, DirectX 11, DirectX 12 and
Vulkan** interfaces — the SDK ships an `NvOFD3D11` class alongside `NvOFCuda`.

We already own an `ID3D11Device` (WGC's), and our whole accumulate path runs on it.
A D3D11 NVOFA path therefore:

- plugs into the existing device with **no interop layer**,
- needs **no fatbinary**, no per-architecture SASS, no PTX,
- needs **no LUID adapter matching** (there is only one device in play),
- requires **no CUDA runtime to bundle**.

Every argument in `long-exposure.md` §1 for choosing DirectCompute over CUDA
survives intact. **Verify this against the current SDK before committing** — but if
it holds, the CUDA backend contemplated in §1 may never need to exist at all.

Also in the SDK: **NvOFFRUC**, a ready-made frame-rate up-conversion library built
on NVOFA that does flow + warp + occlusion handling. Evaluate it before writing a
custom warp — it may be the entire feature.

Sources: [Optical Flow SDK](https://developer.nvidia.com/optical-flow-sdk),
[NVOFA Application Note](https://docs.nvidia.com/video-technologies/optical-flow-sdk/nvofa-application-note/index.html),
[SDK repo](https://github.com/NVIDIA/NVIDIAOpticalFlowSDK).

### 3.2 Where it slots in

`AccumulateBackend` (`native/wgc-capture/src/longexp/backend.rs`) already takes a
D3D11 texture in and owns accumulator state. Interpolation sits **behind** that
interface, not above it:

```
on_frame_arrived(frame N):
    if interpolation enabled and we have frame N-1:
        flow = nvofa.calc(prev, current)              // hardware, ~1-2 ms
        for k in 1..=factor-1:
            t = k / factor
            warped = warp(prev, current, flow, t)     // compute shader
            backend.accumulate(sink, warped, lerp(w_prev, w_cur, t))
    backend.accumulate(sink, current, w_cur)
    prev = current                                    // needs a retained copy
```

Nothing above the backend changes: not the capture session, not replay control, not
the sink router, not output. The weight for a synthesised sample is the weighting
curve evaluated at the interpolated position — which the existing
position-parameterised `weightAt`/`windowPosition` already gives for free.

### 3.3 What has to be added

- **Retain the previous frame.** We currently use `frame.as_raw_texture()` in place
  and never keep it. Interpolation needs frame N-1 to still exist, so add a
  ping-pong pair of owned textures and `CopyResource` into them. Cost: one full-res
  copy per frame (~0.8 ms at 5K) — acceptable, and it also removes our dependence on
  the WGC frame pool's recycling behaviour.
- **A warp compute shader.** Backward-warp both frames along the flow field to time
  `t` and blend. Naive warp is a few lines; the quality lives in occlusion handling
  (disocclusions produce smearing at object edges — the classic interpolation
  artefact). NvOFFRUC handles this; a hand-rolled warp will need a forward/backward
  flow consistency check.
- **A `interpolationFactor` recipe field** (1 = off, 2/4/8), matching the reference
  tool's ×2/×4/×8/×16 vocabulary. Threads through `shot-recipe.ts`, the sidecar,
  and the panel exactly like `supersample` does.
- **Availability probe + fail-soft.** NVOFA is Turing+ NVIDIA only. `longExposureProbe`
  already returns a backend string; extend it to report interpolation availability
  separately, and degrade to factor 1 with a clear message on AMD/Intel/pre-Turing.
  **This must not gate the base feature.**

### 3.4 Cost model, so this is not a surprise

Per captured frame at 5120×2880, factor 4 adds: 1 flow calc (~1–2 ms, dedicated
hardware, does not touch the SMs) + 3 warps + 3 accumulates. The accumulate pass is
already ~0.6 ms, so 3 extra ≈ 1.8 ms, plus 3 warps at maybe 0.5 ms each.

**Total ≈ 5 ms added per captured frame.** Our budget is one iRacing present —
~25 ms at the measured 39 fps. It fits, but it is no longer comfortable, and if it
slows our consumption below iRacing's present rate we start dropping real frames to
manufacture synthetic ones, which is a net loss.

**Instrument before shipping**: log achieved samples with interpolation on vs off at
the same settings. If real-sample throughput drops, reduce the factor or move the
digest off the critical path (see §4).

### 3.5 Sanity check the premise first

Before building any of it: take one capture, and from the sample log compute the
actual screen-space displacement between consecutive accepted samples (the digest
log already records enough to correlate frames). If it is already ≲1 px after
turning supersample off, **interpolation will change nothing visible** and the
defect is H1/H2/H3.

---

## 4. ~~Known adjacent issue~~ — RESOLVED 2026-08-02, see §8

`D3d11Backend::digest` used to do a **blocking `Map` every frame**. It became the
constraint exactly as predicted, and it is now a staging ring read with
`D3D11_MAP_FLAG_DO_NOT_WAIT`. See §8.

---

## 5. Do this in order

1. Shoot `box` vs `ease` at the same frame. (free)
2. Shoot a static trackside camera vs a chase camera. (free)
3. Implement highlight expansion (H1) and compare. (~half a day)
4. Only if a ladder of separable copies remains: measure per-sample displacement.
5. Only if that is > ~1 px: evaluate NvOFFRUC, then build the D3D11 NVOFA path.

**Step 5 was taken first (interpolation, chosen explicitly over H1). H1 was then
implemented too — see §7. H2 and H3 remain untested and cost nothing to try.**

---

## 6. As built, 2026-08-02 — verified facts, do not re-derive

### 6.1 Licensing: the headers are MIT, and we vendor nothing

`nvOpticalFlowCommon.h`, `nvOpticalFlowD3D11.h` and the `NvOFBase` sample sources
each carry a **per-file MIT grant** that opens *"This copyright notice applies to
this header file only"* and then grants use/copy/modify/publish/distribute/sublicense
without restriction. That grant is independent of `LicenseAgreement.pdf` (the NVIDIA
DesignWorks SDK EULA), whose relevant clauses are 1(b)/1(c) (may modify and
distribute *sample source* in object form), 4(b) (no distribution of the SDK as such)
and 4(e) (must not subject the SDK to an open-source licence).

**Decision: hand-write the Rust FFI, vendor nothing.** `native/wgc-capture/src/longexp/nvof.rs`
transcribes the ABI from the MIT headers and cites them. No SDK file is copied into
this repo and none is shipped, so the EULA's distribution requirements and its
4(e) anti-copyleft clause never meet our MIT licence at all. It also avoids a
`bindgen` build dependency. `nvofapi64.dll` is resolved at runtime from the user's
NVIDIA driver.

**`NvOFFRUC` is rejected**, and this is not close. Its header is EULA-governed, not
MIT; **no `NvOFFRUC` binary ships with the driver, and none is in the SDK download**
(searched `System32`, `DriverStore\FileRepository`, and both `NVIDIA Corporation`
program directories — nothing); and its error enum contains
`NvOFFRUC_ERR_OPENCV_NOT_AVAILABLE`, i.e. it wants an OpenCV runtime too. Adopting it
would mean shipping a redistributable plus OpenCV, which breaks the
nothing-for-the-user-to-install constraint that ruled this whole approach in.

### 6.2 Corrections to §3.0 above

- **`NV_OF_API_VERSION` is 5.0 (`0x50`), not 2.0.** §3.0 recorded 2.0 from an older
  public header. SDK 5.0.7 defines MAJOR 5 / MINOR 0, and a current driver rejects a
  version it does not implement. `NvOFGetMaxSupportedApiVersion` is used to negotiate
  and we decline rather than guess an older struct layout.
- **The flow fixed-point scale is S10.5, i.e. divide raw `int16` by 32.0.** From
  `NV_OF_FLOW_VECTOR`'s own comment. Pinned by tests on both sides
  (`nvof.rs::FLOW_FIXED_POINT_SCALE` and the HLSL `#define`, asserted equal).
- **`NV_OF_BUFFER_FORMAT_ABGR8` maps to `DXGI_FORMAT_B8G8R8A8_UNORM`** — BGRA, the
  opposite order to our RGBA8 capture. So a conversion pass is unavoidable, and we
  feed **GRAYSCALE8** (`R8_UNORM` luma) instead: format-correct, a quarter of the
  bandwidth into the engine, and what a block-matching flow accelerator reduces
  colour to anyway.

### 6.3 What the driver actually negotiated (RTX 4090, driver 32.0.15.9636)

`longExposureInterpolationInfo()` at both 2560×1440 and 5120×2880 returns:

```
{ available: true, gridSize: 4, bidirectional: true,
  inputFormat: "grayscale8", apiVersion: "5.0" }
```

`bidirectional: true` matters — it is what makes the forward/backward consistency
check possible, and therefore occlusion handling rather than edge smearing.

### 6.4 Measured cost and sample throughput

Exercised end to end (WGC frame → luma → `NvOFExecute` → warp → accumulate →
resolve) against a real animating window at **1266×753**, 3 s exposures:

| factor | real samples | synthetic | mean ms/frame | max ms/frame |
|---|---|---|---|---|
| 1 | 143 | 0 | 0.51 | 3.49 |
| 2 | 124 | 123 | 0.97 | 31.30 |
| 4 | 121 | 360 | 0.95 | 31.28 |
| 8 | 143 | 994 | 0.90 | 32.08 |
| 1 (repeat) | 142 | 0 | 0.55 | 2.51 |

Reading these honestly:

- **Real-sample throughput is not systematically harmed.** The spread (121–143) is
  run-to-run noise in the source window's own presentation, not interpolation cost:
  factor 8 — by far the most work — matched the factor-1 baseline exactly, so the
  ordering is not monotonic in cost.
- **Per-frame cost roughly doubles, from ~0.5 ms to ~0.95 ms.**
- **`maxFrameMs` ≈ 31 ms is one-time setup, not steady state.** It is essentially
  identical at factors 2, 4 and 8; if it were per-sample work it would scale with the
  factor. It is the first frame, where the NVOFA session, its textures and their
  registrations are created.
- Synthetic counts are exactly `(factor - 1) × (real - 1)` — one gap fewer than
  frames, because the first frame has no predecessor. 143 real at factor 8 → 994. ✓

**Extrapolation to iRacing's 5120×2880 is ~15× the pixels, i.e. roughly +6 ms per
frame against a ~25 ms budget at the measured 39 fps.** That fits, but it is an
extrapolation from a 0.95 Mpx measurement and is exactly the thing §3.4 warned would
stop being comfortable. It must be confirmed on a real replay (§6.6).

### 6.5 What it looks like

At 1266×753 over a 3 s exposure of three objects sweeping at different speeds past
static verticals:

- factor 1: the streaks contain a clearly visible **ladder of discrete copies**.
- factor 4: substantially smoothed; the ladder is mostly gone.
- factor 8: **continuous streak, ladder eliminated.**
- At every factor the static content (window chrome, the fixed posts) stays sharp
  and unsmeared — which is the forward/backward consistency check working. A warp
  without it smears static edges next to moving ones.

### 6.6 Still owed

**This has not been run against a live iRacing replay.** Specifically unverified:
per-frame cost at 5120×2880, whether real-sample throughput holds at that size, and
whether the result actually reads as more natural on a car rather than on a CSS
animation. The instrumentation to answer the first two ships in the sidecar
(`sampling.achieved` vs `sampling.synthesized`, `interpolation.meanFrameMs`) and in
the capture log — shoot the same moment twice, interpolation off then on, and compare
`achieved`.

### 6.7 Design decisions worth not re-litigating

- **Warp and accumulate are fused into one pass** (`CSWarpAccumulate`), not the
  separate warp-then-accumulate of §3.2. A synthetic sample therefore never writes a
  full-resolution intermediate texture, which is most of why the measured cost came
  in under the §3.4 estimate. **Since §9.1 the fusion goes further**: one dispatch
  covers every synthetic sample between a pair of real frames, so they never exist
  simultaneously at all. Anything that proposes materialising them — including the
  original text of the bracketing brief §3.1 — is undoing this.
- **Where flow is untrustworthy the shader falls back to a cross-dissolve of the
  unwarped frames.** That is precisely the image produced with interpolation off, so
  the worst case of a bad flow field is the status quo rather than a new artefact.
  This is the property that makes shipping it safe.
- **Synthetic weights are `lerp(prev_weight, cur_weight, t)`.** Because the weighting
  curve is parameterised by position rather than sample index (design note §5), that
  lerp *is* the curve evaluated at the interpolated position. No new plumbing.
- **A duplicate frame does not update the retained previous frame.** It carries no new
  motion, so the next genuine frame interpolates across the whole stalled gap.
- **`Interpolation`'s field order is load-bearing**: every `NvOfBuffer` must
  unregister before the `NvOpticalFlow` session is destroyed and `nvofapi64.dll` is
  unloaded, and Rust drops fields in declaration order. `flow` is last, deliberately.

---

## 7. Highlight recovery (H1), implemented 2026-08-02

### 7.1 The defect is an ordering error, not a missing feature

A sensor **integrates unbounded energy, then saturates once**. We do the opposite:
iRacing hands us `tonemap(E)` — already compressed and clipped — we average that, and
we tonemap again. Tonemapping is concave, so by Jensen's inequality

```
mean(tonemap(E))  <=  tonemap(mean(E))
```

**our result is provably too dark, and the size of the error is exactly how much the
pixel varied during the exposure.** Zero for static background. Maximal for a swept
specular highlight. That single line explains why the streaks looked flat while the
rest of the frame looked fine, and it is a better account of "unnatural" than sample
density ever was.

Clipping is the infinitely-compressive extreme of this: a headlight at 100× the
midtone and a white wall both arrive as exactly `1.0`, so a light occupying 1% of the
exposure contributes `0.01` instead of dominating.

### 7.2 The fix: move the nonlinearity, don't add a brightness knob

`expand_highlights()` in `shaders.hlsl` approximately inverts the display curve
**before** accumulation, so the nonlinearity sits where a sensor puts it:

```
peak  = max(r, g, b)                       // per-CHANNEL clipping detector
t     = (peak - 0.75) / (1 - 0.75)
scale = 1 + (gain - 1) * t^2
rgb  *= scale                              // scalar gain -> hue preserved
```

Four decisions worth not re-litigating:

- **Driven by `max(r,g,b)`, not luma.** Clipping happens per channel: a saturated red
  tail light (`r=1, g=b=0.2`) has clipped even though its luma is ~0.35, and a
  luma-driven test misses it entirely.
- **Scalar gain, so hue and saturation survive.** A red light gets brighter rather
  than turning white on the way up; desaturating hot highlights toward white is ACES's
  job at resolve, and doing it here too would double-apply it.
- **Continuous at the knee** (`t=0` ⇒ `scale=1`). A step there would ring around every
  highlight — far more obviously wrong than the problem being fixed.
- **`gain == 1` is an early-out and therefore EXACTLY identity.** The
  one-sample-equals-still-capture equivalence (38,640/38,640 channel samples) depends
  on it, and `exp2(0)` is exactly `1.0`.
- **Applied in `CSWarpAccumulate` too.** If only real samples were expanded, the
  streak would pulse in brightness between real and synthetic contributions.

### 7.3 Why it does not blow out the sky — ONLY WITH A COMPRESSIVE RESOLVE

This is the property that makes a blind expansion safe. A persistent bright surface is
present in *every* sample, so it averages to ~`gain` and ACES compresses it straight
back to white. A transient highlight averages to `gain ×` its small duty cycle and
lands genuinely bright. **The correction is self-limiting on anything that does not
move**, which is why no spatial "is this a light or a wall?" heuristic was needed.

**AMENDED 2026-08-03 — "and ACES compresses it" was doing more work in that sentence
than it looked.** Field report: 3 stops on a plain sky produced a banded gradient and
a hard-edged white patch. Both are this section's premise failing, because `tonemap`
defaults to `none` and nothing was compressing anything.

Run the arithmetic at `gain = 8`, `knee = 0.75`, squared shoulder:

| linear in | scale | out | d(out)/d(in) |
|---|---|---|---|
| 0.75 | 1.00 | 0.75 | 1.0 |
| 0.76 | 1.01 | 0.77 | 2.7 |
| 0.79 | 1.18 | 0.93 | 8.3 |
| **0.797** | 1.23 | **1.00** | clips |
| 0.85 | 1.90 | 1.62 | clips |

So a static surface above **0.797 linear (~231/255 sRGB)** lands past 1.0 and clamps
flat — a white patch with a hard edge along that contour — while the slope reaching
~8× just below it magnifies single 8-bit input steps into visible bands. The
expansion is self-limiting only in the sense that *the second half of the pair*
limits it; on its own it is a straightforward blow-out.

`normalizeRecipe` coupled them as a stopgap: highlight recovery implied ACES unless
the recipe named a tonemap explicitly. That was a recipe-layer fix, so it needed no
shader change and no rebuild.

**SUPERSEDED 2026-08-03 — the shader change has now been made, and the coupling is
gone.** `compress_highlights` in shaders.hlsl is the exact inverse of
`expand_highlights` and runs unconditionally in `CSResolve`. The coupling was removed
from `normalizeRecipe` in the same change; `tonemap` is a look control again and
defaults to `none`.

What the inverse buys that ACES could not:

- **A static pixel round-trips to exactly itself.** Every sample of an unchanging
  pixel is the same value `v`, so the weighted mean of `expand(v)` is `expand(v)`, and
  `compress(expand(v)) == v`. Self-limiting *by construction* rather than by a second
  curve that happens to be compressive. ACES stopped the blow-out but landed the sky
  somewhere else than where it started.
- **The rest of the image's look is untouched.** ACES repaints the whole frame to fix
  a highlight problem; the inverse is identity below the knee, so midtones and shadows
  are bit-for-bit unaffected exactly as the expansion left them.
- **The transient highlight keeps everything the expansion bought it.** Its mean is
  diluted by its duty cycle down below the knee, so it passes through the compressor
  untouched while the static wall beside it is pulled back to 1.0. The *gap* is the
  streak.

**How it is solved.** `expand` multiplies by a scale that depends on the peak, so
inverting it means solving `p · (1 + (gain−1)·((p−knee)/(1−knee))²) = outPeak` for
`p` — a cubic. On `[knee, 1]` its derivative is `1 + a(3p−knee)(p−knee)` with both
factors non-negative, so the curve is strictly increasing and the root is unique.
20 bisection steps on that bracket pin it to 0.25/2²⁰ = 2.4e-7, two orders of
magnitude finer than a 16-bit output step is worth, with no discriminant cases and an
error bound you can read off the step count. Cardano would be exact and faster and is
not worth the branchy edge cases in a pass that runs once per capture.

**Order in `CSResolve` is load-bearing in both directions.** The compression runs
*after* the supersample box-downsample, because the accumulator holds scene-referred
values and an area average belongs in that space — compressing per tap would run the
box filter through a concave curve and darken edges, the same mistake as downsampling
after the tonemap. And it runs *before* `gExposureMul`, because EV is a look control
applied on top of the finished image: multiplying first would push midtones over the
knee and hand them to the compressor, so +1 EV on a 0.5 pixel would land at 0.797
instead of 1.0.

**What this changes for reproduction.** A sidecar written during the coupling's brief
life records `tonemap: "aces"` explicitly, so re-shooting it still applies ACES — now
on top of the inverse, which the original shot did not have. Those files will not
re-shoot pixel-identical. That is the intended direction: the recorded look was a
workaround for a shader bug that no longer exists.

Confirmed visually: at 5 stops the browser chrome, favicons and background in the test
capture are indistinguishable from the 0-stop version, while the moving lamps go from
invisible to hot white cores.

### 7.4 Measured, same rig and scene as §6

Interpolation off, ACES at resolve, so this isolates the highlight change:

| stops | mean R | max R | stdev R |
|---|---|---|---|
| 0 | 11146 | 59521 | 9995 |
| 3 | 23710 | 65535 | 25084 |
| 5 | 26127 | 65535 | 28368 |

The **stdev nearly tripling** is the tell: highlights are separating from midtones
rather than the whole frame getting uniformly brighter, which is exactly the intent.
3 stops looks balanced; 5 is strong for that scene. Hence a control, not a constant.

### 7.4b The round-trip property, verified on hardware 2026-08-03

§7.2 claims `compress_highlights` inverts `expand_highlights` exactly, so a pixel
whose value does not vary across the exposure comes back to itself while one that
does gains. That is falsifiable, and it is what the ACES coupling failed.

Road America, anchor 6215, 2560×1440, 1/30, interpolation off, one pass. Shots
44 (0 stops) and 45 (3 stops), same anchor, recovery the only change.

| region | luma at 0 → 3 stops | change | mean abs diff |
|---|---|---|---|
| sky — near-uniform, so static in VALUE | 0.7403 → 0.7403 | **0.000%** | 0.00053 |
| car bodywork — tracked, bright speculars | 0.2849 → 0.2856 | +0.234% | 0.00338 (max **0.342**) |
| grass/trees — swept by the pan | 0.4827 → 0.4824 | −0.067% | 0.00366 |

**The sky is unchanged to four decimal places**, and its 0.00053 mean deviation is
the measured noise floor between any two shots at one anchor (0.00054, from the
multi-pass pair of the same day). Meanwhile individual bright pixels on the
bodywork move by up to 34%. Static returns to itself; varying highlights gain.

Whole-frame mean moves +0.13%, i.e. this is not a brightness control — which is the
distinction §7.3 insisted on and the reason the ACES coupling had to go.

### 7.5 Deliberately NOT done: HDR capture

`ColorFormat::Rgba16F` exists in `windows-capture` (`= 10`, `R16G16B16A16_FLOAT`) and
WGC composites HDR windows to scRGB where highlights genuinely exceed 1.0 — that would
be exact rather than a guess. **Rejected because it only works when the user's display
AND iRacing are both in HDR**, and the tool must not behave differently depending on
one machine's configuration. Highlight recovery is a shader constant: identical on
every GPU, every display, HDR or not. If HDR is ever revisited it must be an addition
that degrades to this, never a replacement for it.

### 7.6 Defaults

**Off (0 stops).** Not because it is unhelpful — it is probably the single biggest
perceptual improvement in the feature — but because a sidecar written before this
existed carries no such field, so a non-zero default would silently make old recipes
reproduce differently. Reproducibility outranks a better-looking first shot. The panel
explains the setting instead.

---

## 8. The blocking digest, and the failure it caused — fixed 2026-08-02

### 8.1 Caught in the field, exactly as §4 predicted

Two shots of the same anchor at 5120×2880, from the user's own screenshots folder:

| shot | render | interp | **real samples** | synth | mean ms | median gap |
|---|---|---|---|---|---|---|
| 19 | 5120×2880 | off | 13 | 0 | 12.1 | 0.0015 |
| **20** | 5120×2880 | **8×** | **3** | 14 | **30.7** | **0.0049** |

At that size iRacing renders ~39 fps, so a frame arrives every **~25.6 ms** and shot
20 spent **30.7 ms** consuming each one. It caught roughly one frame in three — the
median gap tripling says so directly.

The visible result was "almost no motion blur", for two compounding reasons: three
real positions instead of thirteen, **and** a shorter streak (0.0098 s of sim time
covered against 0.018 s). The same run at 2560×1440 (shots 17/18) was completely
unaffected — 12 real vs 14 with interpolation off.

**The §3.4 extrapolation was wrong.** It predicted ~+5 ms; the real cost at 8× was
+18.6 ms. Do not trust per-pixel scaling of this pipeline across a 4× size jump.

### 8.2 The fix

The digest is now submitted and collected asynchronously: a ring of `DIGEST_RING = 4`
staging buffers, read with `D3D11_MAP_FLAG_DO_NOT_WAIT`, with the stragglers drained
(blocking, harmlessly) after the capture loop ends.

**Duplicates are now REPORTED, not rejected.** That is safe because resolve normalises
by accumulated weight, so a duplicate merely gives one instant double weight among
hundreds of samples. Weigh that against what the sync was costing — two real frames in
three — and it is not a close call.

Measured after the change, 1266×753:

| | before | after |
|---|---|---|
| factor 1, mean ms/frame | 0.51 | **0.04** |
| factor 8, mean ms/frame | ~0.90 | **0.30** |

Verified on hardware that detection still works, which is the part that could have
silently broken: a canvas redrawing identical pixels every `requestAnimationFrame`
produced **95 duplicates detected out of 96 samples**, while the animated scene
produced **0 out of 92**. All digests were collected in both cases (96/96, 92/92).

### 8.3 `meanFrameMs` no longer means what it used to — read this before using it

The old blocking `Map` waited for **all** queued GPU work, so `meanFrameMs`
accidentally measured GPU cost too. It no longer does: it is now CPU-side submit time
only, and **a small value does not prove we kept up.**

The ground truth is `sampling.achieved` against `plan.predictedSamples`. Everything
that judges whether interpolation is affordable keys off that ratio, not off timing.

Two related corrections shipped with it:

- **Setup is reported separately** (`setupFrameMs`). The first frame allocates the
  sink and creates the NVOFA session — ~30 ms, and it is identical at factors 2, 4 and
  8, which is how we know it is one-time. Averaged in, it dominated any short exposure:
  shot 17's "4.7 ms mean" over 12 samples was mostly that one frame.
- **Two guardrails**, in `capture-session.ts` and `shot-recipe.ts`. After a shot,
  `diagnoseInterpolationShortfall` warns when real samples came in below
  `SAMPLE_SHORTFALL_RATIO` (0.6 when written; **raised to 0.8**, see §9.8) of
  prediction, naming the remedy. Before a shot,
  `validatePlan` warns when the planned `interpolationLoad` (render Mpx × factor)
  reaches one this machine has already been seen to choke on.

  That limit is **learned, never hard-coded** (`longExposureLossyInterpolationLoad`,
  written by `index.ts` after each capture). Where interpolation stops being free
  depends entirely on the GPU, so a constant measured on a 4090 would be wrong
  everywhere else — and the warning stays silent until this machine has produced
  evidence of its own.

### 8.4 Measured after the fix — the bottleneck moved, it did not go away

Four shots of the same anchor at 5120×2880, ss2, 1/60, 1/16 playback:

| shot | build | interp | pred | **real** | mean ms | median gap |
|---|---|---|---|---|---|---|
| 22 | old | off | 11 | 12 | 1.63 | 0.00156 |
| 21 | old | 8× | 11 | 3 | 28.73 | 0.00497 |
| 23 | **new** | off | 11 | 13 | **0.04** | 0.00144 |
| 24 | **new** | 8× | 11 | **4** | **0.71** | 0.00569 |

**The CPU cost is gone and the sample loss remains.** 28.73 → 0.71 ms, yet real samples
only moved 3 → 4. A median gap of 0.0057 s of sim time at 1/16 playback is ~91 ms of
wall clock per accepted frame, against iRacing presenting every ~25.6 ms — so we are
still catching roughly one frame in four, and nothing CPU-side is waiting.

Conclusion: **at 5120×2880 the interpolation path is GPU-bound.** Seven full-resolution
warp passes at 14.7 Mpx, each doing a read-modify-write of a 236 MB fp32 accumulator,
is more work than fits in the budget. At 2560×1440 the same settings are completely
unaffected (12–13 real, identical to interpolation off).

**Corollary worth internalising: `meanFrameMs` is now actively misleading.** 0.71 ms
looks perfect while three frames in four are being dropped. Judge affordability from
`achievedRatio` only.

---

## 9. Making the warp path cheaper — implemented 2026-08-02

~91 ms for seven passes was ~13 ms each, i.e. roughly 46 GB/s effective on a card that
does ~1000 GB/s. That looked like a latency-bound path with an order of magnitude of
headroom in it. **It was not** — §9.4 shows the 46 GB/s was our share of a GPU that
iRacing is also using, not a kernel running at 5% of peak. The two changes below are
still worth what they cost, but read §9.4 before believing the framing above.

§9.1 and §9.2 are the changes; §9.3–§9.7 are what measuring them actually established,
including three follow-ups that are now dead; §9.8 is a guardrail §9.1 broke and this
work fixed; §9.9 is what is left.

### 9.1 One accumulator read-modify-write per frame, not per synthetic sample — DONE

`CSWarpAccumulate` used to run once per synthetic sample, and each run read AND wrote
the whole accumulator: at 14.75 Mpx that is 236 MB in + 236 MB out, about **80% of the
pass's traffic**, repeated `factor - 1` times.

The loop now lives inside the kernel. One dispatch computes every warped sample, sums
them weighted **in registers**, and does a **single** accumulator read-modify-write.

The part worth not re-deriving: **no per-sample data crosses the CPU boundary either.**
`WarpParams` carries `gFactor`, `gPrevWeight` and `gCurWeight`, and the shader derives
position as `k / gFactor` and weight as `lerp(gPrevWeight, gCurWeight, position)`. That
lerp *is* the weighting curve evaluated at the interpolated position, because the curve
is parameterised by position rather than by sample index (design note §5) — so three
scalars describe the whole run and the constant buffer is written once per frame
instead of `factor - 1` times.

Traffic per captured pixel, at 5120×2880 and factor 8:

| | before | after |
|---|---|---|
| accumulator (32 B/px RW) | 7 × 32 = 224 B | **32 B** |
| colour taps (2 × RGBA8) | 7 × 8 = 56 B | 7 × 8 = 56 B |
| total | 280 B | **88 B** |

≈3.2×, which is the predicted figure. Note it is only a saving from factor 4 up: at
factor 2 there is exactly one synthetic sample and nothing to fold. **Factor 8 is now
much closer in cost to factor 2 than it was**, which changes the shape of the learned
guardrail — hence §9.3.

Also: the flow field and the trust derived from it do not depend on `t`, so they are
now sampled once for the whole run rather than once per synthetic sample. That was
free and is the same insight applied to the flow reads.

### 9.2 Let the hardware do sRGB→linear — DONE

The retained frames are bound through an `R8G8B8A8_UNORM_SRGB` SRV, so the texture unit
decodes sRGB **as part of bilinear filtering**. That removes every `pow()` from the warp
(21 per pixel per frame at factor 8) and fixes a real correctness compromise: hardware
bilinear used to filter sRGB-ENCODED values with a single linearisation afterwards, and
the average of gamma-encoded values is not the gamma encoding of the average. The blend,
the cross-dissolve and the prev/cur lerp now all happen in linear light.

**A side benefit worth knowing about:** synthetic samples are now consistent with real
ones. `CSAccumulate` has always linearised *then* averaged; the warp used to average
*then* linearise. They now agree, so there is one less reason for a streak to differ in
character between real and synthetic contributions.

Four implementation facts, none of which are guesses:

- **It needed TWO owned frames, not one.** An `_SRGB` view requires the resource to have
  been created `_TYPELESS`, and WGC's frame-pool textures are created `_UNORM`. The path
  already owned a copy of `prev`; the *current* frame had to become an owned copy too.
  So the retained frames are a `_TYPELESS` ping-pong pair viewed as `_UNORM_SRGB`, and
  `INTERPOLATION_BYTES_PER_PIXEL` went from `4+1+1` to `4+4+1+1`. **The number of full-res
  copies per frame is unchanged at one** — this costs a surface, not bandwidth.
- **`CopyResource` from WGC's `_UNORM` texture into our `_TYPELESS` one is legal**
  because they are in the same type group. That is the whole mechanism.
- **The plain (unwarped) taps use `SampleLevel` at the texel centre, not `Load`.**
  Whether a `Load` through an `_SRGB` view applies the decode is not something the
  shader should have to be right about — if it did not, those values would be encoded
  while the warped ones are linear, and the mix would be wrong exactly at the
  disocclusions around a moving car. Sampling goes through the filter path, where the
  decode is unambiguous. **Do not "optimise" this back to a `Load`.**
- **A capture format with no sRGB pair declines interpolation** with a reason, rather
  than falling back to an in-shader conversion. We ask WGC for `Rgba8` so this never
  fires in practice; BGRA is covered too. It keeps the kernel branch-free, and
  declining costs nothing because interpolation is an optional accelerator. A format we
  do not recognise is also one whose channel layout the warp cannot assume, so
  proceeding would have been the riskier choice.

Correction to what §9.2 originally claimed: the sRGB-blending compromise was documented
in the `CSWarpAccumulate` source comment, not in §7. §7's four decisions are unaffected
by this change.

### 9.3 Measured on a live replay, 2026-08-02 — 2.6× faster, still short

Same anchor, 5120×2880, ss2, 1/60, 1/16 playback, as §8.4. Shots 25/26 against the
pre-optimisation 23/24:

| shot | build | interp | pred | **real** | synth | achievedRatio | median gap | **ms/frame** |
|---|---|---|---|---|---|---|---|---|
| 23 | old | off | 11 | 13 | 0 | — | 0.00144 | 23.0 |
| 24 | old | 8× | 11 | **4** | 21 | — | 0.00569 | **91.0** |
| 26 | **new** | off | 11 | 15 | 0 | 1.364 | 0.00144 | 23.0 |
| 25 | **new** | 8× | 11 | **7** | 42 | **0.636** | 0.00216 | **34.6** |

(ms/frame is the median sim-time gap converted to wall clock at 1/16 playback — the
honest per-frame consumption cost, and the one number `meanFrameMs` stopped reporting.)

**Per-frame consumption fell 2.63×, from 91 ms to 34.6 ms, and real samples went 4 → 7.**
Against a predicted 3× on the warp alone that is right where it should be: the fixed
costs per frame — luma pass, the retained-frame copy, the NVOFA call, the real sample's
own accumulate — do not shrink, so the whole-frame figure lands slightly under the
warp's own improvement.

**But it is still not enough, and the reason matters.** iRacing presents every ~23–26 ms
and we now consume in 34.6 ms, so we still miss roughly one frame in three. 8× reached
47% of the interpolation-off baseline (7 against 15), up from 31% (4 against 13).

It is tempting to compute an effective bandwidth from this (~1.3 GB in ~28 ms ≈
46 GB/s, on a card that does ~1000 GB/s) and conclude the kernel is desperately
inefficient. **That inference is wrong, and §9.4 is the measurement that shows why: we
do not have the card to ourselves.** iRacing is rendering 5120×2880 frames throughout.

Two consequences that were NOT cosmetic — **both since fixed, see §9.8:**

- **`SAMPLE_SHORTFALL_RATIO` (0.6) was mis-calibrated by this change.** Shot 25's ratio
  of 0.636 cleared it, so `diagnoseInterpolationShortfall` stayed SILENT on a shot that
  lost more than half its real samples against the off baseline. The threshold was
  calibrated against a bimodal field sample (1.08 unaffected vs 0.27 lossy); §9.1
  created the middle case it was never fitted to.
- **`longExposureLossyInterpolationLoad` stayed 0** for the same reason — neither shot
  dipped under 0.6, so the machine learned nothing and the pre-shot warning was silent
  at this configuration too.

**Already verified on hardware, so do NOT spend a replay session re-deriving it:** the
colour path is correct end to end. Capturing a uniformly-grey, continuously-presenting
window twice — interpolation off, then 8× — gave mean red **32798 vs 32796**, a ratio
of 0.9999, with `259 = 7 × (38 - 1)` synthetic samples from 38 real ones. That single
number rules out the whole class of silent failures this change could have introduced:

- **`CopyResource` into the `_TYPELESS` destination lands.** It returns nothing, so a
  rejected copy would have left the retained frames black; at 8× that is seven black
  samples per real one and the mean would have collapsed to ~1/8, not matched to 6×10⁻⁵.
- **The `_SRGB` views decode exactly once.** Not decoding, or decoding twice, both move
  a mid-grey by far more than two parts in 32,000.
- **The folded loop's derived positions and weights are right**, since the synthetic
  count matches `(factor - 1) × (real - 1)` exactly and the weighted mean is unchanged.

What that test deliberately does NOT tell you is anything about throughput: at 640×480
nothing was ever going to be dropped. It is a correctness check, and the sample-count
question in the list above is still open.

### 9.4 The bench that reframed all of this — GPU contention, not a slow kernel

A benchmark harness was built to measure the warp path **without a replay session**: a
window that presents continuously at a chosen physical size, captured for a fixed
wall-clock window at factor 1 and factor 8, reporting real samples per second. Same
ground truth as the field measurement, no iRacing required.

Two traps it had to survive, both of which silently produce flattering numbers:

- **The window gets clamped to `SM_CXMAXTRACK` × `SM_CYMAXTRACK`** — the primary
  monitor plus border slop, 2580×1460 on this machine. The first run reported a perfect
  1.003 ratio at "5120×2880" while actually measuring a quarter of the pixels. A window
  escapes only by answering `WM_GETMINMAXINFO` with a larger `ptMaxTrackSize`; iRacing's
  own window proc does not impose the default, which is why the app's ordinary
  `SetWindowPos` resize reaches 8K with none of this. The bench now asks the addon what
  WGC is **delivering** and refuses to run on a mis-sized window.
- **At 5120×2880 the new build is source-limited**, so it cannot discriminate anything.
  Measurements that need to separate variants were taken at 7680×4320.

**Results, alone on the GPU:**

| build | 5120×2880 8× | 7680×4320 8× |
|---|---|---|
| pre-optimisation | 32.1 ms | 60.0 ms |
| new | **≤21.0 ms** (source-limited at 48 fps) | **40.9 ms** |

**And here is the finding that matters.** At 5120×2880 alone on the GPU, the new build
keeps up with a 48 fps source — 8× interpolation at 5K is comfortably affordable. On a
live replay at the *same resolution* it needs 34.6 ms. The kernel did not change between
those two measurements; **what changed is that iRacing is rendering 5120×2880 frames at
the same time.** We are getting roughly 60% of the GPU, and the ~46 GB/s "effective
bandwidth" is our share of a contended card, not evidence of an inefficient kernel.

**Corollary: reducing per-frame WORK is the only lever, and §9.1 already pulled it.**
Under contention, time scales with work issued. That is also why §9.1's traffic cut
translated almost proportionally into wall clock.

### 9.5 Where the remaining cost actually is: NVOFA, not the warp

The bench swept the whole ladder at 7680×4320, alone on the GPU:

| factor | ms/frame | real | synthetic |
|---|---|---|---|
| 1 (off) | 20.9 | 288 | 0 |
| 2 | 41.4 | 145 | 156 |
| 4 | 41.7 | 144 | 465 |
| 8 | 41.2 | 146 | 1099 |

**Factors 2, 4 and 8 cost the same.** That is §9.1 working exactly as designed — the
marginal cost of an extra synthetic sample is now nearly nil — but it also means the
whole +20.5 ms over interpolation-off is **fixed per-frame overhead**: the luma pass,
the retained copy, and the NVOFA flow call. Luma + copy move only ~430 MB at 8K, ~1.4 ms
at any plausible bandwidth, so NVOFA is the bulk.

Changing one line appeared to confirm it — **on the bench**:

| NVOFA perf level | 8× ms/frame (bench, 8K) | real | vs off |
|---|---|---|---|
| `MEDIUM` | 41.7 | 144 | 0.502 |
| `FAST` | **31.3** | **192** | **0.667** |

1.33× off the entire per-frame cost. It was built, installed, and shot on a live replay.

**On the replay it went the OTHER WAY** (shot 34 against shot 25, same anchor and
settings, adjacent interpolation-off baselines):

| build | ms/frame (field, 5K) | real | vs adjacent off |
|---|---|---|---|
| `MEDIUM` (shot 25) | **34.6** | 7 | 0.47 |
| `FAST` (shot 34) | **46.6** | 5 | 0.42 |

**~35% slower where the bench predicted 25% faster. `FAST` is REJECTED**: it costs flow
accuracy and buys nothing. `MEDIUM` stays, and the constant carries this history inline
so it is not re-litigated.

**The lesson is about the bench, and it is the important part of this section.** The
bench runs alone on the GPU; the field does not. NVOFA is a **dedicated hardware unit**
that does not compete with our compute for the same resources — so alone it dominates
the critical path (nothing else is competing), while under contention with iRacing it is
not what we are waiting on at all. The bench measured a regime this code never runs in.

**So: trust the bench for changes that reduce SM work** — that is what contends with
iRacing, and it is why §9.1's fold transferred to the field almost proportionally
(2.4× on the bench-equivalent metric, 2.63× measured in the field). **Do not trust it
for anything that shifts work between GPU units.** Confirm those on a replay or not at
all.

There is no intermediate rung to retry: `NV_OF_PERF_LEVEL` is only SLOW(5) /
MEDIUM(10) / FAST(20).

### 9.6 Group-shape tuning: measured, and it does NOTHING. Do not repeat it.

An earlier draft of this section proposed occupancy and coalescing as the top
candidates. **Both were measured at 7680×4320 and both are refuted:**

| variant | threads/group | width | 8× ms/frame |
|---|---|---|---|
| pre-optimisation | 64 | 8 | 60.0 |
| warp 8×8 (shipped) | 64 | 8 | **40.9** |
| warp 32×2 | 64 | 32 | 40.5 |
| warp 32×8 | 256 | 32 | 40.6 |
| warp 64×4 | 256 | 64 | 40.9 |

All four post-optimisation variants land within 1% — noise. 8×8 vs 32×2 isolates
*width* at constant thread count; 32×2 vs 32×8 isolates *occupancy* at constant width.
Neither moves anything.

**Why the coalescing argument was wrong, since it sounds so plausible:** it reasoned
that an 8-wide group makes each 32-thread wave straddle four rows 80 KB apart. True,
but irrelevant — *every* accumulator element is visited by some group, so L2 coalesces
across groups and the per-wave pattern does not survive to DRAM. A scattered access
pattern only costs when the data is scattered, not when the traversal order is.

The variants were built and then **reverted**: a knob that buys nothing should not ship.
`CSWarpAccumulate` uses `TILE` (8×8) like every other kernel.

### 9.7 How to measure this at all — the metric, and the noise floor

Five interpolation-off shots at identical settings produced **13, 15, 13, 11, 12** real
samples: mean 12.75, **sd 1.71, i.e. ±13%**. A single-pair A/B on raw sample count
therefore cannot resolve anything smaller than roughly a 30% effect, which is why
"7 vs 5" between two 8× shots is *not* by itself evidence of anything.

**Use `sampling.medianGapSeconds`, converted to wall clock (× the playback divisor).**
Every one of those same five shots reported a median gap of **0.00144 s to three
significant figures** — it is an average over the frames within a shot rather than a
count of them, so it is dramatically more stable, and it is a direct per-frame cost in
ms rather than a proxy. The whole §9 story reads cleanly in it and is ambiguous without
it:

| | ms/frame |
|---|---|
| interpolation off | 23.0 (= iRacing's present interval; we are not the bottleneck) |
| 8×, pre-§9 | 77.9 / 79.5 / 91.0 |
| 8×, post-§9 `MEDIUM` | **34.6** |
| 8×, post-§9 `FAST` | 46.6 |

`meanFrameMs` remains useless for this (§8.3), and `achievedRatio` is the right
*affordability gate* but too noisy to compare two builds with.

**Consequence for §9.9: dropping 8× to 4× saves NOTHING.** The bench says so directly.
That was a plausible prediction from the traffic model and it is simply wrong, because
after §9.1 the factor barely enters the cost. Do not spend a replay session on it.

### 9.8 The guardrail, recalibrated — and de-duplicated

§9.3 flagged that §9.1 had quietly broken the shortfall warning. Fixed.

**`SAMPLE_SHORTFALL_RATIO` raised 0.6 → 0.8.** The original was fitted to a bimodal
field sample — unaffected captures at ~1.08, badly affected ones at ~0.27 — so the
middle was never tested. §9.1 put a shot right in it: 0.636, which is 7 real samples
against an interpolation-off baseline of 15, i.e. more than half of them lost, passing
in silence. That is the worst failure mode this warning has, because the image comes out
looking merely under-blurred rather than obviously broken, so the user has no reason to
suspect the setting rather than the scene.

Recalibrated against every 5120×2880 shot to date:

| | achievedRatio |
|---|---|
| unaffected (off, or on and keeping up) | 1.00, 1.08, 1.09, 1.30, 1.36 |
| affected (real samples lost) | 0.27, 0.36, 0.46, 0.64 |

The classes separate cleanly in **(0.64, 1.00)**. 0.8 sits in that gap and deliberately
nearer the affected side — 26% above the worst affected shot, 20% below the worst
unaffected one — so the bias stays toward missing a marginal case rather than crying
wolf, which is the policy the original comment set out. Against the ±13% run-to-run
spread measured in §9.7, 0.8 is ~2.4 standard deviations below the unaffected mean.

**And the number was in two places.** `index.ts` re-typed `0.6` to decide when to LEARN
this machine's interpolation load limit. Raising only the constant would have left the
pre-shot guardrail learning on different evidence than the post-shot warning fires on —
a divergence nothing would have caught, since each looks correct in isolation. `index.ts`
now imports `SAMPLE_SHORTFALL_RATIO`, and a test pins the boundary on both sides of it.

**Consequence worth expecting:** on this machine, a 5120×2880 shot at 8× now both warns
*and* records its load (117.965), so subsequent shots at that configuration also get the
pre-flight warning. That is the guardrail working as designed — it was simply never
reaching its own trigger before.

### 9.9 What is left

Given §9.4, the honest ordering has changed. **The kernel is close to as good as it
gets for the work it does; the remaining field gap is contention plus the sheer volume
of work that 8× at 5K with 2× supersample asks for.**

**Three of the obvious candidates have now been measured and are dead. Read §9.4–§9.7
before proposing anything here:**

1. ~~Group shape / occupancy~~ — **zero effect**, four variants within 1% (§9.6).
2. ~~Drop 8× to 4×~~ — **saves nothing**; after §9.1 the factor barely enters the cost
   (§9.5).
3. ~~`NV_OF_PERF_LEVEL_FAST`~~ — **1.33× on the bench, ~35% SLOWER on a replay** (§9.5).

**What is left that is actually supported by measurement:**

1. **Turn supersampling off.** The main design note §3 is blunt that supersampling buys
   pixels at the direct cost of samples, and it quarters the interpolation cost as well.
   2560×1440 is documented as completely unaffected at any factor. This is a settings
   answer needing no code, and it is now the leading candidate by some distance.
2. Reduce **SM** work — that is the resource that contends with iRacing (§9.5). The
   remaining SM-side costs are the luma pass, the retained copy, and the real sample's
   own accumulate.

If more is wanted from the code, in value order:

- **Merge the real sample into the warp dispatch — the best remaining lead.** Per
  captured frame we currently do **two** full accumulator read-modify-writes: one in
  `CSWarpAccumulate` for the synthetic sum, then another in `CSAccumulate` for the real
  frame. At 5120×2880 that is 32 B/px each. Per-frame SM-side traffic at 8×:

  | | now | merged |
  |---|---|---|
  | warp: accumulator RMW + taps | 32 + 8 | 32 + 8 |
  | real sample: accumulator RMW + source read | 32 + 4 | (folded in) + 4 |
  | **total** | **76 B/px** | **44 B/px** |

  **~42% off, and it is SM work — exactly the resource §9.5 identifies as the one that
  contends with iRacing.** It is the same insight as §9.1 applied once more: the
  accumulator RMW is the expensive part, so touch it once per frame rather than once
  per contribution.

  **The open question is bit-exactness, and it needs deciding before building.** The
  real sample currently reads WGC's texture through a `_UNORM` view and linearises in
  the shader; the warp reads the owned `_SRGB` copies. Merging means the real sample
  takes the `_SRGB` path too, so real samples would differ subtly between
  interpolation-on and interpolation-off. The one-sample-equals-still-capture
  equivalence itself is safe (one sample has no predecessor, so no warp dispatch runs
  and `CSAccumulate` still handles it), but "the same shot reproduces differently with
  interpolation toggled" is a reproducibility claim worth making deliberately rather
  than by accident.

- **A half-resolution warp — smaller than it sounds.** An earlier draft of this section
  said it would "quarter the remaining texture traffic". **That was wrong.** After
  §9.1 the warp pass is ~40 B/px, of which 32 is the accumulator RMW and only ~8 is
  taps (the 2·(factor−1) fetches are highly cache-local, so DRAM sees each source
  texture about once). Halving resolution touches only the tap half, so it is worth
  ~15% of the pass, not 75% — and it costs the synthetic/real symmetry §9.2 restored.
  Low value; do the merge above first.

- **Throttling `MinimumUpdateIntervalSettings`** (main design note §10, open question 4)
  is the opposite lever: consume fewer frames on purpose so the ones we do consume are
  never dropped. It does not touch the GPU at all.

- **Not worth trying without new evidence:** group shape (§9.6), factor reduction and
  NVOFA perf level (§9.5), and anything else that reshapes the kernel or moves work
  between GPU units rather than reducing SM work.

---

## 10. Spending WALL CLOCK instead of GPU — tiling, and the thing that beats it

Everything in §9 tries to fit the per-frame work inside iRacing's present interval.
This section is about the other axis: the replay can be *replayed*, so the same
exposure window can be visited more than once. Two designs do that, and the
comparison between them is the useful part.

### 10.1 The tiling proposal, taken seriously

Capture the window N times; on pass *k* accumulate only slice *k* of the image;
stitch. Per-frame SM work drops ~N×, so each pass keeps up with the source.

Mechanically this is easy, and easier than it looks: every kernel already dispatches
over the whole frame (`d3d11.rs:698`, `:725`, `:793`), so restricting one to a
sub-rect is an offset and a bound. **The warp needs no halo either** — the retained
frames stay full-resolution, so a tile-edge pixel can still sample a source position
outside its tile.

But only part of the 34.6 ms scales with tile area:

| per captured frame | shrinks with the tile? |
|---|---|
| `CSWarpAccumulate` + `CSAccumulate` — the SM work that contends with iRacing | yes |
| `CSLuma`, `CSDigest` | yes, but both feed full-frame consumers |
| `CopyResource` of the retained RGBA frame (`d3d11.rs:554`; 59 MB at 5K) | no |
| NVOFA flow execute | ROI is expressible (`nvof.rs:121`, `:146`) — but §9.5 measured NVOFA as a *separate hardware unit* that is not what we wait on under contention, so shrinking it buys nothing in the field |
| waiting for iRacing to present | no |

So tiling would work. **Its problem is a ceiling, not a cost.** Once a pass is
source-limited it captures every presented frame and no more: 15 real samples, the
interpolation-off baseline. Eight passes to go from 7 real samples to 15. Tiling can
never produce a sample of a moment iRacing never rendered — which is precisely the
gap NVOFA exists to fake.

### 10.2 What beats it: accumulate N passes into the same buffer

Run the window N times at **full resolution** and don't clear the accumulator between
passes.

Two properties already in the code make this correct with no shader change at all:

- The accumulator is `float4` = (weighted linear RGB, accumulated weight), and
  `CSAccumulate` does `acc.rgb += linear * gWeight; acc.a += gWeight`
  (`shaders.hlsl:311`). Purely additive.
- `CSResolve` normalises **per pixel by accumulated weight**, not by nominal sample
  count (`shaders.hlsl:584`), with a comment saying this is what keeps exposure
  correct "after duplicate rejection and dropped frames".

And weights come from position-in-window `u`, never from sample index (main note §5),
so a pass that lands on different instants composes correctly instead of
double-weighting.

**Why it has no ceiling.** Each pass still drops ~1/3 of presented frames — but a
*different* 1/3, because presentation phase drifts run to run (the ±13% spread in
§9.7 *is* that drift). The digest comment at `shaders.hlsl:330` establishes that
sub-replay-frame presents carry "genuinely different interpolated motion", so the
frames a second pass catches are new information, not duplicates.

| 8 passes, 5120×2880 | real samples/px | wall clock |
|---|---|---|
| today, 8× interpolation | 7 real + ~49 synthetic | 1× |
| 8-way tiling | 15 real + synthetic | 8× |
| 8 accumulated passes, **interpolation off** | ~120 real, no synthetic | 8× |

The last row runs at 23 ms/frame rather than 34.6, needs no NVOFA, no flow-trust
heuristic and no warp artifacts. **It attacks the thing interpolation was a
workaround for, rather than making the workaround cheaper.** Even N=2 gives ~30
genuine samples against today's 7.

### 10.3 The two failure modes hit the two designs in opposite directions

Both designs assume iRacing re-renders the same replay segment the same way. It does
not, exactly — and that asymmetry decides the choice:

- **Non-telemetry-driven rendering** (tyre smoke, spray, particles, crowd, flags,
  any temporal-AA history) decorrelates between passes. Under accumulation those
  regions simply **average** — soft, slightly mushier smoke. Under tiling they
  produce a hard straight-line seam, the artifact human vision is most sensitive to.
  Accumulation fails gracefully; tiling fails ugly.
- **Phase might not drift.** If consumption locks in phase with presentation, pass 2
  re-samples the same instants and buys noise reduction only. That is cheap to
  insure against, and — this is the part worth keeping — it is **falsifiable from
  data already recorded**: every sample logs its `u`, so the `u` histogram in the
  sidecar says directly whether the passes interleaved or stacked.

### 10.4 Where the tiling idea still wins, and it is not nothing

VRAM. The accumulator is 32 B/px, so tiling divides it by N. That is the lever for
**bracketing**, whose brief now needs 2.6 GB at 5K for 11 sinks
(`long-exposure-bracketing.md` §3.3) — tiling makes that affordable, though the 8-UAV
cap still forces two batches. File it there, not here.

### 10.5 Consequence for §9.9

Multi-pass accumulation is now the leading item, ahead of merging the real sample
into the warp dispatch. The merge is a ~42% cut to SM work; multi-pass is a ~17×
increase in real samples that also lets interpolation be switched **off**, which
removes the cost §9 has been chipping at rather than reducing it. The merge stays
worth doing — it makes each pass cheaper — but it is no longer the headline.

Full design and implementation order: **`docs/design/long-exposure-multi-pass.md`**.

---
