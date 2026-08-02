# Long exposure — frame interpolation, and the "unnatural blending" problem

Status: **not started.** This is a handoff brief for the next session.
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

## 4. Known adjacent issue

`D3d11Backend::digest` does a **blocking `Map` every frame** to read back the
64-bit content hash before deciding whether to accumulate. That is a full GPU sync
per sample. It was affordable at the measured margins, and duplicates have never
actually been observed (`rejected: 0` on every field shot) — but it is the first
thing to move off the critical path if sample throughput becomes the constraint.

Options: a ring of staging buffers read with `D3D11_MAP_FLAG_DO_NOT_WAIT` and a
one-frame lag; or gate the digest behind a setting, defaulting off, since the
telemetry-side evidence says duplicates do not occur in this pipeline.

---

## 5. Do this in order

1. Shoot `box` vs `ease` at the same frame. (free)
2. Shoot a static trackside camera vs a chase camera. (free)
3. Implement highlight expansion (H1) and compare. (~half a day)
4. Only if a ladder of separable copies remains: measure per-sample displacement.
5. Only if that is > ~1 px: evaluate NvOFFRUC, then build the D3D11 NVOFA path.
