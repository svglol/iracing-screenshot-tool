# Long-exposure photo mode — design note

Status: design accepted, v1 implemented on `feat/long-exposure-replay`.
Reference behaviour: Joel Real Timing (JRT) photo mode. Architecture: ours.

**Hardware verification to date** (RTX 4090, Windows 11, 2026-08-02):

- All four HLSL kernels compile via `D3DCompile`; `longExposureProbe()` returns
  `d3d11-compute`, and the running app logs the backend as available.
- **Colour chain is bit-exact.** A one-sample long exposure with box weighting, no
  exposure compensation and no tonemap was compared against the existing still
  capture of the same window: **38,640 of 38,640 channel samples matched exactly.**
  That validates sRGB→linear on accumulate, normalise-by-accumulated-weight, and
  linear→sRGB on resolve as a round-trip identity.
- **Accumulation is physically correct.** A synthetic window with a horizontally
  sweeping white square, accumulated over ~60 frames with a box weight, produces a
  flat luminance plateau across the swept band with partial-coverage ramps at both
  ends, at the duty cycle the sweep geometry predicts.
- The 16-bit PNG encoder round-trips every sample of a 386×293 image bit-exactly.

Not yet verified on hardware: everything that needs a live iRacing replay — seek
landing precision, slow-motion divisor behaviour, duplicate rejection under real
render-rate divergence, and anchor restoration against the sim. See §10.

---

## 1. Compute backend: DirectCompute (D3D11 compute shader). CUDA is not
justified in v1.

**Recommendation: ship a D3D11 compute-shader backend. Do not ship CUDA in v1.**

### The work is memory-bound, so CUDA cannot be faster

The per-sample kernel is: sample one RGBA texel, sRGB→linear (3 `pow`/lerp), multiply
by a scalar weight, read-modify-write one RGBA32F accumulator texel. That is ~10 ALU
ops against 4 bytes read + 16 bytes read + 16 bytes written = 36 B/px of traffic.
It is bandwidth-bound by roughly two orders of magnitude.

Worst realistic case — 3840×2160 target at 2× supersample = 7680×4320 = 33.2 Mpx:

| | per sample |
|---|---|
| accumulator traffic | 33.2 Mpx × 32 B (RW) = 1.06 GB |
| source read | 33.2 Mpx × 4 B = 0.13 GB |
| total | ~1.2 GB |

On the slowest card in our target matrix (RTX 2060, 336 GB/s) that is ~3.6 ms per
sample. Our sample cadence is one iRacing present — 8.3 ms at 120 fps, 16.7 ms at
60 fps. We are 2.3–4.6× inside budget on the *slowest* supported GPU at the
*largest* supported frame. CUDA optimises occupancy and scheduling; neither is the
constraint here. There is no headroom for CUDA to recover because there is no
compute bottleneck to recover it from.

### DirectCompute is also the *simpler* option, not a portability tax

WGC already hands us an `ID3D11Texture2D` on an `ID3D11Device` we own
(`windows-capture`'s `Frame::as_raw_texture()` / `Frame::device()`). The compute
path binds that texture as an SRV and the accumulator as a UAV. **Zero interop, zero
copies, zero extra device.**

A CUDA path would add, purely to run the same memory-bound loop:

- `cudaGraphicsD3D11RegisterResource` + map/unmap around every frame
- a fatbinary build step with per-architecture SASS
- `IDXGIAdapter` LUID matching against `cudaDeviceGetLuid` (mandatory on hybrid
  laptops, and the single most common way this class of feature ships broken)
- static CUDA runtime linkage or a bundled redistributable in the installer
- a second failure surface that must degrade to the D3D11 path anyway

Every one of those is net-new risk against zero measured benefit.

### It structurally eliminates JRT's failure mode

JRT was built against CUDA 10.0 and its own documentation concedes it may not work
on RTX 3000 cards, because a fatbinary only runs on architectures it was compiled
for (plus whatever PTX JIT can rescue). **DirectCompute has no per-architecture
artefact to get wrong.** HLSL compiles once to DXBC bytecode; the display driver
JITs DXBC to native ISA at `CreateComputeShader` time, on every past and future
D3D11 GPU. A card released in 2030 runs our 2026 bytecode with no rebuild. This is
not a mitigation of JRT's bug — it is the removal of the category.

### It gets AMD and Intel for free

Our stated v1 hardware target (Turing → Blackwell) is a strict subset of "any GPU
supporting D3D11 feature level 11_0". The same shader runs on RDNA and Arc with no
additional code, which makes the "non-NVIDIA backend" v2 item a *validation* task
rather than an implementation one.

### Where CUDA does earn its place — later

Optical-flow-based frame interpolation. NVIDIA exposes the dedicated Optical Flow
Accelerator (NVOFA) via the Optical Flow SDK on Turing and newer; there is no
portable equivalent, and the work is genuinely not memory-bound. That is the
feature that should motivate a CUDA backend, and by then it slots in behind the
`AccumulateBackend` trait described in §5 rather than being retrofitted.

**Decision: `AccumulateBackend` trait, one implementation (`D3d11ComputeBackend`).**

---

## 2. GPU compatibility matrix

### v1 target — satisfied by a single DXBC blob in a single binary

| Vendor | Architectures | Mechanism |
|---|---|---|
| NVIDIA | Turing (RTX 20) → Blackwell (RTX 50) and later | D3D11 FL11_0 compute, driver-JIT from DXBC |
| AMD | GCN / RDNA 1–4 | same |
| Intel | Gen9 → Arc | same |

Requirements: Windows 10 1903+ (already our WGC floor — `GraphicsCaptureSession::IsSupported`),
D3D11 feature level 11_0 (compute shader 5.0, typed UAV load/store on
`R32G32B32A32_FLOAT`), `d3dcompiler_47.dll` (a Windows system component since 8.1;
we compile the HLSL at session start via `D3DCompile`).

**How the build satisfies it:** it does nothing special. There is no `-gencode`
list, no PTX fallback, no toolkit version to pin, no redistributable to bundle. The
shader source is `include_str!`-embedded in the addon and compiled at runtime.

### If a CUDA path is ever added (v2 — verified against current NVIDIA docs, not memory)

Recorded here so the future work starts from checked facts:

| Architecture | Consumer parts | Compute capability | Flag |
|---|---|---|---|
| Turing | RTX 20 | 7.5 | `sm_75` |
| Ampere | RTX 30 | 8.6 | `sm_86` |
| Ada Lovelace | RTX 40 | 8.9 | `sm_89` |
| Blackwell | RTX 50 | 12.0 | `sm_120` |

- `sm_120` (consumer Blackwell) requires **CUDA Toolkit 12.8 or newer** — first
  Blackwell support landed there.
- **CUDA 13.0 dropped Maxwell/Pascal/Volta; Turing (`sm_75`) is the new minimum
  supported architecture**, so `sm_75` remains buildable in 13.x.
- Therefore any toolkit in **12.8 … 13.x** can emit both `sm_75` and `sm_120`. That
  range must be re-verified at the time the work is done, not assumed from this note.
- Fatbinary must carry SASS for 7.5 / 8.6 / 8.9 / 12.0 **plus PTX for the newest
  target** so future architectures JIT.
- Runtime linked statically or bundled. Never the dev kit.
- `cudaDeviceGetLuid` must match the `IDXGIAdapter` LUID of the D3D11 device.
- Missing/unsupported → fall through to `D3d11ComputeBackend`, never crash.

Sources: [Blackwell Compatibility Guide](https://docs.nvidia.com/cuda/blackwell-compatibility-guide/),
[CUDA 12.8 Blackwell announcement](https://developer.nvidia.com/blog/cuda-toolkit-12-8-delivers-nvidia-blackwell-support/),
[CUDA Toolkit release notes](https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/index.html).

---

## 3. Sampling strategy

### Slow-motion playback, not synthesised frames

An iRacing replay stores discrete positional frames at 60 Hz and interpolates
motion between them, and it will play back as slowly as 1/16 real time. So sample
count is bounded by wall-clock patience, not by the sim's tick rate.

With exposure `T` seconds, render rate `R` fps, and slow-motion divisor `P`
(playback speed = 1/P):

```
samples   S = T · R · P
wall time W = T · P
```

`T = N / 60` for a whole-frame window, where `N` is its length in replay frames.
Below one replay frame `T` is the requested exposure itself and `N` is only the
**seek span** — one frame, the frame the window starts inside (see below).

| Shutter | T (s) | N frames | P=1 | P=2 | P=4 | P=8 | P=16 | wall @P=16 |
|---|---|---|---|---|---|---|---|---|
| 1/1000 | 0.001 | 1 | 1 | 1 | 1 | 1 | 1 | 0.02 s |
| 1/125 | 0.008 | 1 | 1 | 1 | 1 | 3 | 7 | 0.13 s |
| 1/60 | 0.017 | 1 | 1 | 2 | 4 | 8 | 16 | 0.27 s |
| 1/30 | 0.033 | 2 | 2 | 4 | 8 | 16 | 32 | 0.53 s |
| 1/15 | 0.067 | 4 | 4 | 8 | 16 | 32 | 64 | 1.1 s |
| 1/8 | 0.125 | 8 | 8 | 15 | 30 | 60 | 120 | 2.0 s |
| 1/4 | 0.25 | 15 | 15 | 30 | 60 | 120 | 240 | 4.0 s |
| 0.5" | 0.5 | 30 | 30 | 60 | 120 | 240 | 480 | 8.0 s |
| 1" | 1.0 | 60 | 60 | 120 | 240 | 480 | **960** | 16 s |
| 2" | 2.0 | 120 | 120 | 240 | 480 | 960 | 1920 | 32 s |
| 5" | 5.0 | 300 | 300 | 600 | 1200 | 2400 | 4800 | 80 s |
| 10" | 10.0 | 600 | 600 | 1200 | 2400 | 4800 | **9600** | 160 s |

(`R = 60`; double every count at 120 fps. Counts floor, and never below 1 — we
always get the frame we stop on. The 1/125 row read 1/2/4/8/15 before sub-frame
windows landed: those were 120 fps numbers against a window that in practice
quantised to 1/60 anyway.)

JRT's ceiling is 512 blended samples of *captured* frames, extended to 8192 only by
synthesising in-betweens. At 1/16 speed and 120 fps we reach **1920 real,
sim-interpolated samples for a 1-second exposure** — past JRT's synthetic ceiling
with genuine geometry, no interpolation, and no CUDA.

Two consequences worth stating plainly: the samples are real interpolated poses
from the sim, so contact patches, suspension travel and wheel rotation are correct
rather than optical-flow-guessed; and because slow motion costs only wall-clock
time, the "expensive" setting is patience, not memory.

### The long end: 2", 5", 10"

Added 2026-08-03, and they cost nothing but time. One fixed-size accumulator holds a
10-second exposure exactly as it holds a 1/1000 one, so there is no memory reason to
stop at 1" — the reason to stop is the user's patience, and 10" at 1/16 playback is
**160 seconds of driven replay**.

So `validatePlan`'s wall-clock warning has two registers rather than one. Past
`LONG_CAPTURE_WARN_SECONDS` (10 s) it quotes the duration; past
`LONG_CAPTURE_ESCALATE_SECONDS` (16 s) it also says the capture cannot be hurried
once started and that a faster playback speed finishes sooner with fewer samples.
16 s is not arbitrary — it was the ceiling of the entire feature before these stops
existed (1" at 1/16), so it is exactly the line past which a capture is longer than
anything that used to be expressible.

**These stops used to outrun the diagnostic sample log, and the cap was raised for
them.** `MAX_SAMPLE_LOG` was 8192 entries, sized back when a 1" exposure was the
ceiling; 10" at 1/16 and 73 fps is ~11,700 samples, so the log held the first 71% of
a shot and every metric derived from it silently described that prefix. It is now
**65536**, chosen so no expressible recipe can reach it: the worst the UI can build
is the slowest stop at the slowest speed against the highest render rate we will
believe, 10" × 16 × 360 fps (`MAX_USABLE_RENDER_FPS`) = 57,600 samples. It remains a
cap rather than an unbounded Vec, because the exposure terminating on
`ReplayFrameNum` is the thing keeping a session finite and a diagnostic buffer should
not be the component that fails if that ever breaks.

The two safeguards built for the old cap stay, and both are still load-bearing: the
accepted count is taken from the session's **uncapped counter** rather than from the
log's length, and the sidecar still writes `sampling.logTruncated` so a reader can
tell a prefix measurement from a whole one — which matters for reading captures
taken before this change, where it was routinely true.

### Supersampling costs samples — and samples usually matter more

Measured on hardware: at 2560×1440 with 2× supersample (5120×2880 render) iRacing
dropped from ~73 fps to ~39 fps, roughly halving the achieved sample count.

This is a real and under-appreciated trade. Temporal undersampling produces
**structured** artefacts — a ladder of discrete ghosts, which the eye reads as a
defect. Spatial undersampling produces **unstructured** artefacts (aliasing), which
the motion blur itself substantially hides. So for a moving subject, spending the
frame budget on samples generally beats spending it on supersampled pixels; a
long-exposure image is already anti-aliased along the direction of motion.

Supersample earns its place on *static* or near-static subjects, where there is no
streak to hide edges and no sample count to protect.

The corollary for prediction: `FrameRate` telemetry is read at the user's CURRENT
window size, before we resize to render size, so an unscaled reading over-predicts
the sample count by roughly the resize factor. `scaleRenderFpsForResize` discounts
it by √(currentPixels / renderPixels) — an empirical fit that matched the measured
capture within ~6%, documented as a prediction shown beside an achieved count
rather than a promise.

### Choosing the playback speed

Two modes, both resolving to the same recipe field:

- **Explicit speed** — user picks P ∈ {1, 2, 4, 8, 16}; we report predicted samples.
- **Target sample count** — we solve `P = ceil(S_target / (T · R))` and clamp to
  the ladder, choosing the *slowest playback that meets the target* (i.e. smallest
  sufficient P), so we never spend wall-clock we don't need.

`R` comes from the `FrameRate` telemetry variable, floored to a conservative 30 and
defaulted to 60 when unavailable. It is only ever a *predictor*: the achieved
sample count is measured and reported, never assumed.

### Exposures shorter than one replay frame

**IMPLEMENTED 2026-08-02.** The table above quantises `T = N / 60`, which used to be
the whole story: 1/1000 … 1/60 all resolved to `N = 1` and produced a byte-identical
plan, so four of those five stops were inert and asking for 1/1000 silently delivered
16× the intended blur.

That was a limitation of our planner, not of the replay format. The tape stores
positions at 60 Hz but iRacing renders ~10 distinct interpolated frames between each
pair (§1 of the frame-interpolation note), so a sub-replay-frame exposure is
capturable: seek to `anchor − 1`, play, and accumulate only the tail subset of the
rendered frames.

So the window is now **continuous at its start and frame-indexed everywhere else**:

| | value | why |
|---|---|---|
| `startFrame` | `anchor − ceil(T × 60)`, integral | the seek target, and the safety net that bounds the start to one replay frame |
| window start | `anchorTime − T`, continuous | what actually bounds the exposure |
| `endFrame` | `anchor`, integral | unchanged — termination never moved |

Exposures of one replay frame or longer are **unchanged**: they still quantise to
whole frames (1/8 is still 8 frames = 0.133 s), and their continuous start lands
exactly on `startFrame`, so no stored recipe changes meaning. Only shutters faster
than 1/60 take the new path.

Two consequences worth stating: a 1/1000 exposure resolving to a single sample is
now the *correct* result rather than a quantisation failure — that is what a 1/1000
shutter is — and the ladder's fast half is genuinely distinct, which is what
`planBracketSinks` needs to be worth wiring up.

This bends two invariants stated elsewhere in this note, both amended in place: §4's
wall-clock rule and §9's bit-exact window bounds. `long-exposure-subframe-windows.md`
is the full brief.

### Accumulation precision — fp32, and here is the proof

The brief allows fp16 "if you can show it's sufficient". It isn't:

fp16 has an 11-bit effective mantissa. Once a box-weighted accumulator of unit-ish
linear values passes 2048, the ULP is 2.0 — adding a sample of ~1.0 rounds to
nothing and **accumulation silently stalls**. Pre-normalising each sample by 1/S
avoids the stall but leaves relative error ≈ √S · 2⁻¹¹ ≈ 3 % at S = 1000, which is
~2000× coarser than the 16-bit master we write.

fp32 has a 24-bit mantissa; the same random-walk bound gives √4096 · 2⁻²⁴ ≈ 3.8 × 10⁻⁶,
comfortably under one 16-bit output LSB (1.5 × 10⁻⁵).

**Accumulator is `R32G32B32A32_FLOAT`. Non-negotiable.** The cost is 16 B/px:
531 MB for 4K at 2× supersample, which is a rounding error next to what iRacing
itself allocates at that window size.

### Supersample and resolution

Capture resolution is independent of exposure (as in JRT). The optional 2×-per-axis
supersample resizes iRacing's window to 2× the target on each axis and box-downsamples
in the resolve pass. This is 4× the accumulator memory and 4× the per-sample
bandwidth — it is the setting that actually costs VRAM, and it is pre-flighted (§7).

---

## 4. Replay control — SDK only

Everything goes through `irsdk-node`, which wraps the documented broadcast messages.
No synthesised input, no replay-UI driving, no process hooking.

### Verified argument semantics

Checked against the SDK header and iRacing's own `msgtest.cpp` sample rather than
assumed:

- `irsdk_BroadcastReplaySetPlaySpeed` — header comment is `speed, slowMotion, unused`.
  The header does **not** document the divisor. The SDK's own sample does:
  `irsdk_broadcastMsg(irsdk_BroadcastReplaySetPlaySpeed, 16, true, 0)` is captioned
  *"Set playback speed to 1/16th speed"*, and `(…, 1, false, 0)` is *"normal speed"*.
  **So with `slowMotion = 1`, `speed` is a divisor: playback = 1/speed.** Exposed as
  `sdk.changeReplaySpeed(speed, slowMotion)`.
- `irsdk_BroadcastReplaySetPlayPosition` — `irsdk_RpyPosMode, Frame Number`, with
  `irsdk_RpyPos_Begin = 0` (absolute from tape start), `Current = 1` (relative),
  `End = 2`. Exposed as `sdk.changeReplayPosition(mode, frame)`.

Sources: [irsdk_defines.h](https://github.com/vipoo/irsdk/blob/master/irsdk_defines.h),
[msgtest.cpp](https://github.com/SIMRacingApps/SIMRacingAppsSIMPluginiRacing/blob/master/irsdk/irsdk_msgtest/msgtest.cpp).

### Telemetry is the only authority on position

`ReplayFrameNum` (60/s, absolute from tape start) decides where we are, whether a
seek landed, where the window starts and ends, and when to stop. `ReplaySessionTime`
supplies the *continuous* position used for weighting (§5). `ReplayFrameNumEnd`,
`ReplayPlaySpeed`, `ReplayPlaySlowMotion` and `IsReplayPlaying` are read to
pre-flight and to restore.

**Wall-clock time is never used to decide replay position or termination. It is
used as a timeout on operations that can fail, and — since sub-replay-frame windows
— to place the START of a window shorter than one replay frame.** A stalled frame or
drifting playback speed can make the capture take longer or time out loudly; it
cannot change where the exposure ends or when we stop.

**AMENDED 2026-08-02: the window START is the one exception, and it is bounded.**
The original rule was absolute, and had to give way to make the fast half of the
shutter ladder mean anything. `ReplaySessionTime` is quantised to replay frames
(§10 Q1), so the only continuous position available inside a frame is interpolated
from elapsed wall time. Two things keep it defensible:

- **The error is bounded by one replay frame.** `startFrame` is still integral, is
  still what the seek targets, and still gates the router: no sample before it can
  ever be accumulated, whatever the clock says. A bad estimate can move the start
  within that frame; it cannot escape it.
- **The status quo it replaced was a 16x error.** 1/1000 through 1/125 all rounded
  onto 1/60 and produced identical images. A start bounded by one replay frame is
  strictly better than a guaranteed 16x overshoot on four stops.

Everything else in this section stands unchanged: `ReplayFrameNum` decides where we
are, whether a seek landed, and when to stop.

### The window trails the anchor: `[anchor − N, anchor]`

The frame the user parked on is the **last** sample, not the midpoint. They framed a
moment; the streak should lead up to and terminate on exactly that moment. Two
consequences designed around:

- An anchor near the end of the replay is always safe — we never need frames after
  it. Only an anchor closer than N frames to the *start* is constrained, and that
  clamps the exposure with an explicit warning rather than failing.
- Tapered weighting is oriented with its heaviest weight at the anchor end (§5), so
  the user's chosen moment is the crisp head of the streak.

### Sequence

```
0.  PRE-FLIGHT   read anchor = ReplayFrameNum, plus ReplayFrameNumEnd,
                 ReplayPlaySpeed, ReplayPlaySlowMotion, IsReplayPlaying.
                 → this snapshot is the restore contract. Stored before anything moves.
1.  PAUSE        changeReplaySpeed(0, false)
2.  SEEK         changeReplayPosition(RpyPos_Begin, anchor − N)
3.  SETTLE       poll telemetry until |ReplayFrameNum − (anchor−N)| <= tolerance,
                 then a fixed grace period for the renderer to present at the new
                 position. Bounded by a wall-clock timeout (failure only).
4.  ARM          open the native accumulate session (gate closed)
5.  ROLL         changeReplaySpeed(P, true); open the gate
6.  ACCUMULATE   every telemetry tick: push u = normalised position to native.
                 STOP when ReplayFrameNum >= anchor.  ← frame-indexed, not timed
7.  HALT         close the gate, changeReplaySpeed(0, false)
8.  RESOLVE      native resolve + tonemap + downsample + readback; write files
9.  REVIEW       present to the user
10. RESTORE      ONLY NOW: seek back to the anchor and restore playback state
```

Step 6 already terminates on the anchor, but overshoot is expected — telemetry is
sampled at 60 Hz and the pause command has latency. **Step 10 is an unconditional
absolute seek regardless of where we stopped.**

### How anchor restoration is guaranteed on *every* exit path

`restoreAnchor()` is not a happy-path step. It is a `finally` on the session:

```ts
try { ...steps 1–9... }
finally { await restoreAnchor(snapshot) }   // always, no exceptions
```

`restoreAnchor` itself:

1. `changeReplaySpeed(0, false)` — stop first, so the cursor cannot drift under us.
2. `changeReplayPosition(RpyPos_Begin, anchor)`.
3. Poll `ReplayFrameNum` until it equals `anchor` **exactly**.
4. If it isn't exact after the settle, issue a corrective *relative* seek
   (`RpyPos_Current, anchor − current`) and re-poll. Up to `MAX_CORRECTIONS` rounds.
5. Restore the pre-capture speed/slow-motion, and re-pause if the user was paused.
6. Report `landedExactly: boolean` — we do not claim success we didn't achieve.

Every listed failure mode routes through it: insufficient VRAM (refused before step 1,
so nothing to restore), failed seek, overshooting seek, capture stall, unsupported
GPU, user abort, native throw, and app-level watchdog. The orchestrator's abort
signal is checked between every step, and abort is *cooperative* — it unwinds through
the same `finally`.

Within a capture the anchor is fixed: `snapshot.anchorFrame` comes from the recipe,
and every seek, the window and the restore use that one value. Playback moving under
us cannot change where the shot ends or where the cursor is returned to.

**CHANGED 2026-08-03: the PANEL no longer pins the anchor across shots.** It used to
stamp the first shot's anchor and reuse it, so re-shooting after scrubbing captured
the original moment and a notice offered "use current frame". Pressing Capture now
takes whatever the replay is parked on at that instant: the panel omits `anchorFrame`
from the recipe entirely and main reads the cursor as it handles the call — fresher
than the renderer's once-a-second poll, and it removes a piece of hidden state whose
whole job was to make the button mean something other than what it says.

Note this is a UI decision, not a recipe one. A recipe still carries its anchor and
`executeRecipe` still honours it exactly, so re-executing a stored recipe (a sidecar,
or a Spotter Pack batch) reproduces the original moment as it always did. Only the
panel's choice of anchor for a NEW shot moved.

**The camera is never touched.** The existing capture path's `UIHidden` camera-state
toggle is reused unchanged (it hides the UI, it does not move the camera); no
`CameraSwitchPos`/`CameraSwitchNum` is ever broadcast.

---

## 5. Accumulator sink model

The capture loop does not own a buffer. It owns a **router** that offers each frame
to a set of independent sinks:

```ts
interface AccumulatorSink {
  id: string;              // 'primary' in v1; bracket stops get their own
  startFrame: number;      // integral: the seek target, and the safety net
  endFrame: number;        // == anchorFrame for every sink, always
  exposureSeconds: number; // the window: [anchorTime − this, anchorTime]
  weighting: WeightingCurve;
  label: string;           // '1/8' — drives output naming
}
```

`offer(frame, replayFrameNum, sessionTime)` forwards to every sink the position is
inside, with **that sink's own weight** for that position. v1 instantiates exactly
one sink.

"Inside" is three tests, and they are not redundant: `replayFrameNum >= startFrame`
(the frame-indexed safety net), `sessionTime >= anchorTime − exposureSeconds` (the
continuous start, which is what actually bounds the exposure), and
`replayFrameNum <= endFrame` (termination). For a window of one replay frame or
longer the first two coincide exactly; below one frame the second is what makes the
stop mean anything. See §3.

One further wrinkle the router handles: the control loop pushes one weight per tick
and that weight governs every frame iRacing presents until the next push, so a tick
covers a *span* of sim time — ~1 ms at 1/16 playback, which is a quarter of a 1/250
exposure. The tick that straddles the window start is therefore weighted by the
fraction of itself that fell inside, rather than being all-or-nothing. Standard
antialiasing, one multiply, and it turns a stair-step at the fast end into a smooth
ramp. Only the start is treated this way; the anchor end is never scaled.

### Weighting is a function of *position*, not sample index

```
u = (sessionTime − windowStartTime) / (windowEndTime − windowStartTime)   ∈ [0, 1]
u = 1 at the anchor.
```

| Curve | w(u) | Effect |
|---|---|---|
| `box` (default) | 1 | Even exposure across the window. JRT-equivalent. |
| `linear` | u | Streak fades back from the anchor; anchor is the crisp head. |
| `ease` | u^k, k≈2.5 | Sharper head, longer soft tail. |

Parameterising by position rather than index is what makes the result invariant to
achieved sample count — the same window shot at 60 and 120 fps produces the same
image, only less noisy. Index-parameterised weights would have made frame-rate
variance a *brightness* variance.

`ReplaySessionTime` is used for `u` (continuous) while `ReplayFrameNum` decides the
boundaries (exact). If `ReplaySessionTime` turns out to be frame-quantised on
hardware, `u` degrades to 1/16-of-a-frame steps — visually irrelevant, and flagged
as an open question below.

### Normalisation, and why it is also the reweighting mechanism

Each sink tracks `sum(w · linearRGB)` **and** `sum(w)`. Resolve divides by `sum(w)`.

This single choice buys three things:
- correct brightness for any weighting curve, for free;
- **rejected duplicates and dropped frames cannot change exposure** — they simply
  don't contribute to either sum, so the average stays correct. This is the
  "reweight so the effective exposure stays correct" requirement, and it is
  structural rather than a correction step;
- sinks with different sample ranges are directly comparable, which is what makes
  bracketing work.

### How bracketing attaches (v2 — designed for, not built)

With a trailing window, **every bracket stop shares the same terminal frame** and
differs only in how far back it reaches. A faster shutter is literally the tail
subset of the samples already flowing.

Adding bracketing is: build N sinks instead of 1.

```ts
// 1/60 primary → also emits 1/125 … 1/1000, all ending on the anchor
sinks = shutterLadderAtOrFaster(primary).map(stop => ({
  id: stop.key, label: stop.label,
  exposureSeconds: resolveExposureSeconds(stop.seconds),  // ← the ONLY difference
  startFrame: anchor - windowFramesForExposure(...),      // the seek span
  endFrame: anchor,                                       // ← identical for all
  weighting: primary.weighting,
}))
```

Since §3, **every stop on the ladder produces a distinct window**, including the
fast five that used to collapse onto one frame. That makes bracketing more useful
and more expensive at the same time — see `long-exposure-bracketing.md` §3.3.

No change to the capture loop, the replay control, the backend, or output — the
router already offers to all sinks and skips the ones whose range hasn't opened yet.
The pure planner for this (`planBracketSinks`) is written and unit-tested in v1; it
is simply not wired to the UI.

**Memory scales with sink count, not sample count.** Ten bracket stops at 1080p cost
10 × 33 MB. JRT's RAM wall — where it holds every captured frame and refuses the
shot if they don't fit — does not exist for us at any sample count. This is the
single biggest structural win over the reference implementation and it falls out of
accumulating on the GPU instead of buffering on the host.

### Backend boundary

```rust
trait AccumulateBackend {
    fn create_sink(&mut self, w: u32, h: u32) -> Result<SinkId>;
    fn accumulate(&mut self, sink: SinkId, src: &ID3D11Texture2D, weight: f32) -> Result<()>;
    fn frame_digest(&mut self, src: &ID3D11Texture2D) -> Result<u64>;
    fn resolve(&mut self, sink: SinkId, params: ResolveParams) -> Result<Vec<u16>>;
}
```

D3D11 texture in, accumulator state updated, output texture out. Nothing above this
line knows which backend is active — the session, the router, the replay control and
all of the TypeScript are backend-agnostic. An AMD/Intel path is a validation pass;
a CUDA path is one impl of this trait. **The v2 sink model sits above this boundary,
not inside it**, so bracketing and backend choice are independent axes.

---

## 6. The shot as a recipe (Spotter Pack seam)

A capture is **not** an imperative action. It is a serialisable parameter set that
can be executed repeatedly and unattended:

```ts
interface LongExposureRecipe {
  anchorFrame: number;          // authoritative for THIS execution; never re-read mid-capture
  sessionNum: number;
  shutter: ShutterKey | null;   // '1/8' etc, or null when exposureMs is explicit
  exposureMs: number;
  playbackSpeed: 1|2|4|8|16 | null;   // null = derive from targetSamples
  targetSamples: number | null;
  width: number; height: number; supersample: 1 | 2;
  weighting: WeightingCurve;
  tonemap: 'none' | 'reinhard' | 'aces';   // no UI control — see below
  exposureCompensation: number; // EV      // no UI control — see below
  outputFormat: 'png16' | 'png' | 'jpeg' | 'webp';   // derived from Settings
  outputDir: string;
  variantId: string | null;     // unused in v1 — Spotter Pack writes here
}
```

**Five fields no longer have a UI control** (2026-08-03), and the distinction
matters: they were removed from the PANEL, not from the recipe. `anchorFrame` and
`sessionNum` are the other two — the panel omits both so main reads the live cursor
at the moment Capture is pressed (§4), which also removes the stale-session check's
only failure mode: the two used to be able to come from different instants.

- `outputFormat` is derived from the still-capture `outputFormat` setting, so there
  is one format choice for stills and long exposures both.
  `longExposureFormatForStillFormat` maps it: PNG means the 16-bit master (Settings
  has no 16-bit option and should not grow a long-exposure-only one), jpeg and webp
  map to themselves.
- `tonemap` and `exposureCompensation` keep their recipe fields and their shader
  paths, so **an old sidecar carrying either still reproduces exactly**. Nothing in
  the UI sets them, and their config keys are gone rather than orphaned — persisting
  a value no control can change back is how a setting becomes impossible to undo.
- **`tonemap` was briefly coupled to `highlightRecovery` and no longer is.** For a
  few hours on 2026-08-03, `highlightRecovery > 0` forced `tonemap: 'aces'` when the
  recipe did not name one, because recovery expands near-clipped values before
  integrating and needs a compressive resolve to put static bright surfaces back —
  and with `tonemap: 'none'` a plain sky above ~0.797 linear clipped flat with the
  gradient below it banding. That was a recipe-layer patch on a shader-layer bug.
  `compress_highlights` now inverts the expansion **exactly**, at resolve,
  unconditionally, so the pair is closed inside the shader where it belongs and
  `tonemap` is a pure look control again that defaults to off. A static pixel
  round-trips to itself, which ACES never did. See
  `long-exposure-frame-interpolation.md` §7.3.

The panel deliberately omits these fields from the recipe it sends rather than
sending a default, because an omitted field takes the value resolved in main. That
is what "follow Settings" has to mean: a value still sitting in the renderer must
not be able to beat the setting.

`executeRecipe(recipe, deps)` is the *only* entry point. The UI's job is to build a
recipe; it has no other privileges. Consequences:

- **Re-shoot** = same recipe object, one field changed. The anchor is carried in the
  recipe, so re-executing a STORED recipe is impossible to get wrong. (The panel
  itself no longer replays the previous shot's anchor — pressing Capture anchors on
  the live cursor. See §4.)
- **Spotter Pack** = `for (const paint of paints) { swapPaint(paint); await executeRecipe({...recipe, variantId: paint.id}) }`.
  The only variable between runs is external sim state. Nothing in the capture path
  needs to know that a batch is happening.
- `variantId` already flows into output naming (`{base}--{variantId}{ext}`) and into
  the sidecar. It is threaded end-to-end in v1 and simply always `null`.
- A recipe round-trips through JSON, which means "reproduce this shot" is a
  file-copy — and the sidecar (§8) contains one.

---

## 7. Duplicate and dropped frame detection

WGC delivers on present. If iRacing's render rate and our sampling diverge we get
repeated or missing samples and the exposure is unevenly weighted. This is exactly
what JRT's pair-check view exists to expose visually; we detect it numerically.

### Why `ReplayFrameNum` alone is *not* a duplicate test

At 1/16 playback, replay frames advance at 3.75/s while iRacing renders at 60+ fps —
**16 consecutive rendered frames share one `ReplayFrameNum` and are all genuinely
different** (interpolated motion). Rejecting on repeated frame number would discard
15/16 of our samples and destroy the whole premise of the feature. Any implementation
that dedups on the telemetry frame counter at slow motion is broken.

### Two-tier detection

1. **GPU-side frame digest (primary).** A compute pass reduces the source texture to
   a 64-bit digest per frame (per-group FNV-style mix of a strided pixel sample set,
   `InterlockedXor`/`InterlockedAdd` into a 2×u32 UAV). Cost is a fraction of the
   accumulate pass and it runs on the texture already resident on the GPU — no
   readback of pixels, only 8 bytes. A digest equal to the immediately preceding
   frame's ⇒ iRacing presented identical content ⇒ **recorded as a duplicate**.

   **AMENDED 2026-08-02: duplicates are reported, not rejected.** The readback used to
   be a blocking `Map` so the decision could be made before accumulating — a full GPU
   sync per frame. In the field that sync cost us two real frames in three at
   5120×2880 once interpolation was added, which is a far worse defect than the thing
   it guarded against. It is now an asynchronous staging ring, and every frame is
   accumulated. Safe because resolve normalises by accumulated weight: a duplicate
   only gives one instant double weight among hundreds of samples. See
   `long-exposure-frame-interpolation.md` §8.
2. **Presentation timestamp (corroborating).** `Frame::timestamp()`
   (`SystemRelativeTime`) is recorded per sample for the evenness report. It cannot
   by itself prove duplication, but a repeated digest with a *distinct* timestamp is
   the specific signature of a stalled renderer and is logged as such.

### Dropped frames and temporal evenness

Every accepted sample records `(u, sessionTime, replayFrameNum, digest, timestamp)`
into a capped log (`MAX_SAMPLE_LOG`, 65536 entries). From it we compute:

- achieved sample count and duplicates rejected
- median / max sim-time gap between consecutive accepted samples
- an **evenness score** = `medianGap / maxGap` ∈ (0, 1]

A max gap beyond `k ×` median marks a drop. `evenness < 0.5` surfaces a warning in
the review step — the same information JRT's pair-blend view conveys, as a number
instead of an eyeball test, and available *without* the user having to shoot a
diagnostic capture. Achieved count, rejections and evenness are reported to the user
and written to the sidecar.

Because resolve normalises by `sum(w)` (§5), none of this changes exposure — it is
purely a *quality* report.

### VRAM pre-flight

Predicted bytes = `Σ_sinks (W·SS · H·SS · 16)` + source + resolve target + staging,
checked against measured free VRAM via the existing `vram-prediction` module, and
added to the existing resize-delta prediction for iRacing's own growth. Two-level:

- our own accumulator allocation alone exceeding free VRAM ⇒ **hard refuse**, with
  the largest setting that would fit named in the message. Unlike iRacing's
  allocation, ours is deterministic and ours to be honest about.
- everything else ⇒ warn and proceed, matching the existing capture path's
  deliberate warn-don't-block policy.

---

## 8. Output

- **Master:** 16-bit PNG, written by our own encoder (`utilities/long-exposure/png16.ts`).

  **This was going to be sharp, and sharp cannot do it.** Implementation found two
  separate defeats. First, sharp infers raw input depth from the *TypedArray
  constructor*, not from any option — a plain `Buffer` is `Uint8Array`, so
  `raw: { depth: 'ushort' }` is silently ignored and 16-bit data is misread as
  8-bit. Passing a `Uint16Array` fixes the read, but then the pipeline
  unconditionally reduces to 8-bit sRGB before encoding: a raw→raw round trip turns
  an input sample of 2711 into 10, i.e. divided by 257. Every combination of
  `toColourspace('rgb16')`, `pipelineColourspace('rgb16')`, and PNG or TIFF output
  reproduces the loss, in both directions — sharp's *reader* discards the low byte
  too, so it cannot even be used to verify a correct file.

  Rather than take a new dependency for one format, we emit the PNG directly:
  IHDR/sRGB/gAMA/cHRM/IDAT/IEND, Up-filtered scanlines, big-endian samples, Node's
  built-in `zlib` for deflate and CRC. Byte-exact by construction, and covered by
  tests that decode with a spec-faithful unfilter (all five filter types) and
  additionally confirm libvips accepts the file as a 16-bit PNG.

- **Preview:** 8-bit sRGB in the user's configured format, and the gallery thumbnail
  — both via sharp. A long exposure therefore appears in the existing gallery like
  any other shot.

  **The 16→8 reduction is ours, not sharp's, and it is DITHERED (2026-08-03.)** This
  used to read "sharp's 16→8 reduction is exactly what a preview wants". It is not:
  sharp rounds, and rounding a shallow gradient is what bands it. Measured on a real
  capture that a user reported banding on, one column of sky:

  | | distinct levels | widest flat run |
  |---|---|---|
  | 16-bit master | 279 / 311 px | — smooth |
  | 8-bit, rounded | 28 | 27 px |
  | 8-bit, ordered dither | 30 | 9 px |

  The master was never the problem — the accumulator is fp32 and the gradient
  resolves to steps of 0.02 of an 8-bit LSB. Every 8-bit artefact derived from it
  was, which is why the artefact appeared in the gallery and in the preview while
  the master on disk was clean.

  `reduceTo8BitDithered` applies an ordered 8×8 Bayer bias in [−0.5, +0.5) before
  rounding. **Ordered, not random**, because a recipe must be re-executable: the same
  accumulator has to produce the same file, and an RNG would break that. **Ordered,
  not error-diffused**, because diffusion grows wandering "worm" textures in exactly
  the large flat areas this exists to fix. The bias never reaches ±0.5, so a
  perfectly flat area cannot be pushed across a level boundary and stays perfectly
  flat — stippling a clear sky would be a worse artefact than the one being removed.
- **Sidecar:** `<name>.json` next to the master, carrying the full recipe plus
  achieved sample count, duplicates rejected, evenness, playback speed used, anchor
  frame, window start/end frames, track, car, session, backend used, and
  `variantId`. Reproducing a shot is: read the sidecar, re-execute the recipe.

**EXR is deferred, deliberately.** The installed libvips has no OpenEXR support
(formats: jpeg, png, webp, tiff, magick, …, rad — no exr), so EXR requires a new
third-party dependency, which the constraints say to ask about first. 16-bit PNG
covers the stated master requirement ("16-bit PNG and/or EXR"). **Open question 5**
asks whether you want EXR enough to take the dependency.

---

## 9. Determinism

"The same replay window captured twice must produce near-identical output."

What is guaranteed bit-exactly: the window **end** (frame-indexed, integer — always
the anchor), the seek target and safety net (`startFrame`, frame-indexed, integer),
the weighting function (position-parameterised), the normalisation, the tonemap, and
the output pipeline.

**AMENDED 2026-08-02: the window START is exact to one rendered frame, not
bit-exact.** This list used to open with "the window boundaries (frame-indexed,
integer)", and for a window of one replay frame or longer it still holds exactly —
those quantise to whole frames as they always did, and `sinkStartTime` reads the
start off the frame map rather than deriving it, so it is bit-identical run to run.
A window *shorter* than one replay frame has no frame boundary to start on: its
start is interpolated within the frame from elapsed wall time, so two captures of
the same recipe can differ slightly in exposure **duration**, not merely in sample
jitter. That is a real weakening of what this section promised, and the reasoning
for accepting it is in §4.

What is not guaranteed: *which* wall-clock instants got sampled. That depends on
iRacing's render timing and cannot be controlled without hooking the sim, which is
forbidden (and rightly). Two captures of the same window differ only by sample
jitter, and for S ≫ 1 the normalised average converges — the difference is noise-like
and shrinks as 1/√S, not a structural difference.

The sidecar records achieved sample count, evenness, **and the achieved window**
(`sampling.achievedWindowSeconds` — the sim time from first accepted sample to last)
precisely so the user can verify that two shots were sampled and exposed comparably
rather than having to trust it. It is `SIDECAR_VERSION` 2 that carries that field;
a v1 sidecar reading `shutter: '1/250'` with `effectiveMs: 16.67` is the record of a
shot that asked for 1/250 and got 1/60, and re-executing that recipe on a current
build honours the 1/250 — deliberately, and both sidecars say so.

---

## 10. Open questions

1. ~~**`ReplaySessionTime` granularity.**~~ **ANSWERED 2026-08-02: it is quantised
   to replay frames.** Measured sample logs show a median sim-time gap between
   accepted samples of exactly 1/60 s, with ~10 samples per replay frame at 1/16
   playback. This mattered more than the note predicted: it made `u` take only
   `windowFrames` distinct values, so tapered curves banded visibly — a user
   reported it as "the blending is not so smooth". Fixed by interpolating within a
   replay frame from elapsed wall time (`subFramePosition`).

   **WIDENED 2026-08-02.** This entry used to end: *"it affects a sample's WEIGHT
   only, never the window bounds or termination, so a bad estimate can make the
   taper slightly uneven but can never change the exposure."* That is no longer
   true, and pretending otherwise would be worse than either behaviour. The same
   interpolated position now also decides where a window **shorter than one replay
   frame** opens, because a sub-frame window has no frame boundary to open on. So a
   bad estimate can change the exposure — by at most one replay frame, since
   `startFrame` stays integral and still gates the router. What it still cannot
   touch: the window END, termination, or any window of one replay frame or longer.
   §4 has the full argument, and `long-exposure-subframe-windows.md` has the
   defect it removes.
2. ~~**Seek landing tolerance.**~~ **ANSWERED 2026-08-02: `RpyPos_Begin` lands
   exactly.** Every seek across a field session landed on the requested frame, and
   every anchor restore reported `corrections: 0`. The corrective-seek path remains
   as insurance but has not yet been exercised on hardware.
3. **Slow-motion divisor range.** iRacing's own sample demonstrates 1…16. Are
   non-power-of-two divisors (e.g. 3, 6, 12) accepted and stable? We restrict to
   {1,2,4,8,16} in v1 for safety; if arbitrary integers work, the sample-count solver
   can hit targets more precisely and waste less wall-clock.
4. **Minimum update interval.** WGC exposes `MinimumUpdateIntervalSettings`; leaving
   it `Default` means we sample every present. If iRacing renders far above the rate
   we can accumulate at, throttling here would be cheaper than digesting and
   rejecting. Not needed at the measured margins in §1, but it is the lever if a
   very fast card at low resolution outruns us.
5. **EXR.** Worth a new dependency (`openexr`-capable libvips build, or a small
   dedicated encoder)? See §8. Default answer if you don't care: no.
6. **Exclusive fullscreen.** Unchanged from the existing capture path — WGC is
   DWM-based and cannot capture true exclusive fullscreen, so the existing
   pre-flight guard applies to long exposure identically. Not a new constraint, but
   worth stating: long exposure requires windowed/borderless exactly as normal
   capture does. (We do *not* inherit JRT's window-repositioning or triple-screen
   desktop-origin offset problems, because we capture the window handle.)

7. **ReShade interaction.** Long exposure always accumulates through the native
   WGC + D3D11 path, regardless of which backend the user has selected for stills,
   so ReShade's post-processing does not appear in the result. The panel says so
   rather than hiding itself: gating on the ReShade toggle would deny a working
   capture to anyone running ReShade in borderless, and exclusive fullscreen — the
   case that genuinely cannot work — is already caught by the pre-flight with a
   specific message. If ReShade effects in a long exposure turn out to matter to
   users, that needs hook-based capture and is a much larger question.

---

## 11. What we do not do

- No in-process hooking of iRacing's D3D11 device. WGC only.
- No synthesised keyboard/mouse input, no replay-UI automation. SDK broadcast
  messages only.
- No window repositioning to (0,0), no desktop-origin offset setting. We capture the
  window handle, so triple-screen and multi-monitor layouts are irrelevant to us and
  our own UI can never enter the frame.
- No camera movement. The user's framing is the shot.
- No per-architecture builds, no user-installed GPU toolkits, no driver-branch
  dependency.
- No new third-party dependencies. (EXR would have needed one — hence the question
  rather than the commit.)
