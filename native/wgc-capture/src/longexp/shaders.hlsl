// Long-exposure compute kernels (design note §1, §7).
//
// Four passes, all D3D11 compute shader 5.0, feature level 11_0 — no vendor
// extensions, no CUDA, no per-architecture artefact. HLSL compiles once to DXBC and
// the display driver JITs it to native ISA on every past and future D3D11 GPU. That
// is the whole reason this is not CUDA: there is no fatbinary to get wrong, which
// is precisely how the reference implementation broke on RTX 3000.
//
//   CSClear      zero a sink's accumulator
//   CSAccumulate sRGB -> linear, weighted add into an fp32 accumulator
//   CSDigest     reduce the source frame to a 64-bit content hash (duplicate detect)
//   CSResolve    normalise by accumulated weight, expose, tonemap, box-downsample
//                the supersample, linear -> sRGB, pack to 16-bit UNORM RGBA
//
// Two further kernels serve the OPTIONAL NVIDIA optical-flow interpolation path.
// They are compiled with the rest (so a compile break is caught by the probe on
// every machine) but only ever dispatched when NVOFA is present and enabled:
//
//   CSLuma            RGBA8 -> R8_UNORM luma plane, the input NVOFA consumes
//   CSWarpAccumulate  warp both frames along the flow field to EVERY synthetic
//                     position, sum them weighted in registers, and pay for the
//                     accumulator exactly once — one dispatch per captured frame,
//                     not one per synthetic sample
//
// PORTABILITY NOTE — why the accumulator is a StructuredBuffer and not an
// RWTexture2D<float4>: at D3D11 feature level 11_0, typed UAV *loads* are only
// guaranteed for R32_{FLOAT,UINT,SINT}. A read-modify-write of an
// R32G32B32A32_FLOAT texture UAV needs TypedUAVLoadAdditionalFormats, which older
// parts in our target matrix do not advertise. Structured-buffer loads and stores
// carry no such restriction, so this runs everywhere. Same reason CSResolve writes
// a packed uint2 buffer rather than an R16G16B16A16_UNORM texture UAV.
//
// The accumulator is float4 and that is not tunable — see the fp16 ULP argument in
// design note §3. `.a` carries the accumulated WEIGHT, not alpha, which is what
// makes rejected duplicates and dropped frames unable to change exposure: resolve
// divides by whatever weight actually landed.

// 8x8 = 64 threads: one full wave on AMD, two on NVIDIA. Ample for a purely
// bandwidth-bound kernel.
#define TILE 8

// Digest samples every DIGEST_STRIDE'th texel on each axis.
#define DIGEST_STRIDE 4

// --- Resources -------------------------------------------------------------
// Distinct registers throughout: fxc rejects overlapping bindings across a single
// translation unit even when a given entry point uses only one of them.

// gSource carries the frame that just arrived. CSAccumulate / CSDigest / CSLuma bind
// WGC's own texture here through a plain _UNORM view, so they see sRGB-ENCODED
// values and convert in the shader. CSWarpAccumulate instead binds our owned
// _TYPELESS copy through an _UNORM_SRGB view, so the texture unit has already
// linearised — see the note above CSWarpAccumulate for why that is a correctness fix
// and not merely a saving.
Texture2D<float4>          gSource    : register(t0);
StructuredBuffer<float4>   gAccumRead : register(t1);
// Interpolation inputs. int2 because the flow buffers are R16G16_SINT.
Texture2D<int2>            gFlowFwd   : register(t2);   // prev -> cur
Texture2D<int2>            gFlowBwd   : register(t3);   // cur  -> prev
Texture2D<float4>          gPrev      : register(t4);   // retained previous frame,
                                                        // also through an _SRGB view

RWStructuredBuffer<float4> gAccum     : register(u0);
RWStructuredBuffer<uint>   gDigest    : register(u1);
RWStructuredBuffer<uint2>  gOutput    : register(u2);
RWTexture2D<float>         gLuma      : register(u3);

// Bilinear, clamped at the edges. Only the warp uses it; integer flow textures are
// not filterable so they are sampled by hand below.
SamplerState               gLinear    : register(s0);

cbuffer AccumulateParams : register(b0)
{
    uint2 gSize;          // render (== accumulator) dimensions
    float gWeight;        // this sample's weight, from the sink's weighting curve
    float gHighlightGain; // linear gain at full clip; 1.0 == recovery off
};

cbuffer ResolveParams : register(b1)
{
    uint2 gOutSize;     // final image dimensions = render size / supersample
    uint  gSupersample; // 1 or 2
    uint  gTonemap;     // 0 none, 1 Reinhard, 2 ACES
    float gExposureMul; // 2^EV
    float3 gPadR;
};

cbuffer WarpParams : register(b2)
{
    uint2 gWarpSize;      // render (== accumulator) dimensions
    uint2 gFlowSize;      // flow field dimensions = ceil(render / gFlowGrid)
    // The whole synthetic run is described by three numbers rather than dispatched
    // once per sample: positions are k/gFactor for k in 1..gFactor-1, and each
    // sample's weight is the weighting curve at that position — which, because the
    // curve is parameterised by POSITION and not by sample index, is exactly the
    // lerp between the two real frames' weights.
    uint  gFactor;        // 2/4/8; this dispatch emits gFactor-1 synthetic samples
    float gPrevWeight;    // weight the retained frame was accumulated with
    float gCurWeight;     // weight the frame that just arrived will be
    uint  gFlowGrid;      // 1, 2 or 4 pixels per flow vector
    uint  gHasBwd;        // 1 when the driver gave us a backward field too
    float gConsistencyPx; // fwd/bwd disagreement, in px, at which trust hits zero
    float gWarpHighlightGain; // same as gHighlightGain; synthetic samples must be
                              // treated identically to real ones or the streak
                              // would pulse in brightness between the two
    float gPadW;
};

// Flow vectors are S10.5 fixed point: sign, 10 integer bits, 5 fractional bits
// (NV_OF_FLOW_VECTOR in nvOpticalFlowCommon.h). 2^5 = 32 units per pixel.
// KEEP IN SYNC with FLOW_FIXED_POINT_SCALE in nvof.rs — a test asserts they match.
#define FLOW_FIXED_POINT_SCALE 32.0f

// --- Colour ----------------------------------------------------------------
// Exact sRGB transfer functions, not the 2.2 power approximation. Accumulating in
// a mismatched space is the classic long-exposure artefact: the average of
// gamma-encoded values is not the gamma encoding of the average, so highlights
// bloom and midtones go muddy.
// Written per-scalar rather than with vector selects so this compiles identically
// under fxc (SM 5.0) with no reliance on HLSL 2021 intrinsics.

float srgb_to_linear1(float c)
{
    return (c <= 0.04045f) ? (c / 12.92f) : pow(max(c + 0.055f, 0.0f) / 1.055f, 2.4f);
}

float linear_to_srgb1(float c)
{
    c = max(c, 0.0f);
    return (c <= 0.0031308f) ? (c * 12.92f) : (1.055f * pow(c, 1.0f / 2.4f) - 0.055f);
}

float3 srgb_to_linear(float3 c)
{
    return float3(srgb_to_linear1(c.r), srgb_to_linear1(c.g), srgb_to_linear1(c.b));
}

float3 linear_to_srgb(float3 c)
{
    return float3(linear_to_srgb1(c.r), linear_to_srgb1(c.g), linear_to_srgb1(c.b));
}

// --- Highlight recovery ----------------------------------------------------
//
// THE PROBLEM. A sensor integrates unbounded photon energy and saturates ONCE, at
// the end. We do the opposite: iRacing hands us display-referred SDR that has
// already been tonemapped and clipped, we average that, and we tonemap again. Since
// tonemapping is concave, Jensen's inequality gives
//
//     mean(tonemap(E))  <=  tonemap(mean(E))
//
// so our result is provably too dark, and the size of the error is exactly how much
// the pixel varied during the exposure — zero for static background, maximal for a
// swept specular highlight. Clipping is the infinitely-compressive extreme: a
// headlight at 100x the midtone and a white wall both arrive as exactly 1.0, so a
// light occupying 1% of the exposure contributes 0.01 instead of dominating. That is
// why our streaks read as flat grey smudges rather than bright trails.
//
// THE FIX. Approximately invert the display curve BEFORE integrating, so the
// nonlinearity sits where a sensor puts it. This cannot recover the true value — it
// was destroyed before we saw the frame — so it is a guess, but a controllable one,
// and it is what VFX motion blur does for the same reason.
//
// WHY IT DOES NOT BLOW OUT THE SKY. The expansion is applied to persistent bright
// surfaces too, but they are present in EVERY sample, so they average to ~gain and
// the ACES pass at resolve compresses them straight back to white. A transient
// highlight averages to gain x (its small duty cycle) and lands genuinely bright.
// The correction is therefore self-limiting on anything that does not move.

// Where expansion begins. Below this, values pass through untouched, so midtones
// and shadows are bit-for-bit unaffected.
#define HIGHLIGHT_KNEE  0.75f
// Shoulder shape. 2.0 ramps gently off the knee rather than kinking.
#define HIGHLIGHT_POWER 2.0f

float3 expand_highlights(float3 linearRGB, float gain)
{
    // gain == 1 is OFF and must be EXACTLY identity. A one-sample box exposure with
    // recovery off is bit-for-bit the existing still capture (38,640/38,640 channel
    // samples verified), and that equivalence is worth keeping.
    if (gain <= 1.0f)
    {
        return linearRGB;
    }

    // Driven by the MAX channel rather than luma, because clipping happens per
    // channel: a saturated red tail light (r=1, g=b=0.2) has clipped even though its
    // luma is only ~0.35, and a luma-driven test would miss it completely.
    float peak = max(linearRGB.r, max(linearRGB.g, linearRGB.b));
    if (peak <= HIGHLIGHT_KNEE)
    {
        return linearRGB;
    }

    float t = saturate((peak - HIGHLIGHT_KNEE) / (1.0f - HIGHLIGHT_KNEE));
    // Continuous at the knee (t = 0 gives scale 1), reaching `gain` at full clip.
    float scale = 1.0f + (gain - 1.0f) * pow(t, HIGHLIGHT_POWER);

    // A SCALAR gain, so hue and saturation survive: a red light gets brighter rather
    // than turning white on the way up. Desaturating hot highlights toward white is
    // ACES's job at resolve, and doing it here as well would double-apply it.
    return linearRGB * scale;
}

// --- Pass 0: clear ---------------------------------------------------------

[numthreads(TILE, TILE, 1)]
void CSClear(uint3 tid : SV_DispatchThreadID)
{
    if (tid.x >= gSize.x || tid.y >= gSize.y)
    {
        return;
    }
    gAccum[tid.y * gSize.x + tid.x] = float4(0.0f, 0.0f, 0.0f, 0.0f);
}

// --- Pass 1: accumulate ----------------------------------------------------

[numthreads(TILE, TILE, 1)]
void CSAccumulate(uint3 tid : SV_DispatchThreadID)
{
    if (tid.x >= gSize.x || tid.y >= gSize.y)
    {
        return;
    }

    float3 linearRGB = expand_highlights(
        srgb_to_linear(gSource[tid.xy].rgb),
        gHighlightGain);

    // Each thread owns a unique element, so this needs no atomics.
    uint idx = tid.y * gSize.x + tid.x;
    float4 acc = gAccum[idx];
    acc.rgb += linearRGB * gWeight;
    acc.a   += gWeight;   // accumulated weight, NOT alpha
    gAccum[idx] = acc;
}

// --- Pass 2: content digest (duplicate detection) --------------------------
//
// WGC delivers on present, so iRacing presenting identical content twice yields a
// duplicate sample that would unevenly weight the exposure. ReplayFrameNum CANNOT
// detect this: at 1/16 playback, 16 consecutive rendered frames legitimately share
// one replay frame number while showing genuinely different interpolated motion.
// Deduping on the telemetry counter would discard 15 of every 16 samples and
// destroy the entire premise of the feature — so we hash pixels instead.
//
// Both InterlockedAdd and InterlockedXor are order-independent, so the digest is
// deterministic regardless of thread scheduling. That matters: a nondeterministic
// digest would manufacture false duplicates.

[numthreads(TILE, TILE, 1)]
void CSDigest(uint3 tid : SV_DispatchThreadID)
{
    uint2 p = tid.xy * DIGEST_STRIDE;
    if (p.x >= gSize.x || p.y >= gSize.y)
    {
        return;
    }

    float4 c = gSource[p];
    // The source is 8-bit UNORM, so quantising back to 8 bits is lossless and makes
    // the digest insensitive to any float representation drift.
    uint packed = (uint(saturate(c.r) * 255.0f + 0.5f)      ) |
                  (uint(saturate(c.g) * 255.0f + 0.5f) <<  8) |
                  (uint(saturate(c.b) * 255.0f + 0.5f) << 16);

    // Position-dependent mixing, so motion that merely moves existing colours around
    // still changes the digest — a purely value-based sum would not notice it.
    uint mixed = packed * 0x9E3779B1u + (p.x * 0x85EBCA6Bu) + (p.y * 0xC2B2AE35u);
    mixed ^= mixed >> 15;

    InterlockedAdd(gDigest[0], mixed);
    InterlockedXor(gDigest[1], mixed * 0x27D4EB2Fu);
}

// --- Optional pass A: luma plane for the optical-flow engine ----------------
//
// NVOFA's GRAYSCALE8 input format is DXGI_FORMAT_R8_UNORM. Our capture is RGBA8, and
// NVOFA's only packed-colour format (ABGR8) is B8G8R8A8_UNORM — the opposite channel
// order — so a conversion pass is required either way. Luma is the cheaper target:
// a quarter of the bytes into the flow engine, and what a block-matching optical
// flow accelerator reduces colour to internally regardless.
//
// Rec.709 luma on the GAMMA-ENCODED values, deliberately: this is the same Y' a
// video pipeline would hand NVOFA, and the engine is tuned for it. Linearising first
// would stretch the shadows and change the contrast the block matcher sees.

[numthreads(TILE, TILE, 1)]
void CSLuma(uint3 tid : SV_DispatchThreadID)
{
    if (tid.x >= gSize.x || tid.y >= gSize.y)
    {
        return;
    }
    float3 c = gSource[tid.xy].rgb;
    gLuma[tid.xy] = saturate(0.2126f * c.r + 0.7152f * c.g + 0.0722f * c.b);
}

// --- Optional pass B: warp to every synthetic position, and accumulate once ---
//
// The flow field is defined on a coarse grid, so read it with an explicit bilinear
// filter (integer texture formats are not hardware-filterable).

float2 loadFlow(Texture2D<int2> field, int2 c)
{
    c = clamp(c, int2(0, 0), int2(gFlowSize) - int2(1, 1));
    return float2(field.Load(int3(c, 0))) / FLOW_FIXED_POINT_SCALE;
}

float2 sampleFlow(Texture2D<int2> field, float2 p)
{
    // `p` is a full-resolution pixel centre. Flow cell (i,j) covers the pixel block
    // [i*grid, (i+1)*grid), so its centre lies at (i + 0.5) * grid — hence the -0.5.
    float2 g = p / float(gFlowGrid) - 0.5f;
    float2 base = floor(g);
    float2 frac = g - base;
    int2 i0 = int2(base);

    float2 f00 = loadFlow(field, i0);
    float2 f10 = loadFlow(field, i0 + int2(1, 0));
    float2 f01 = loadFlow(field, i0 + int2(0, 1));
    float2 f11 = loadFlow(field, i0 + int2(1, 1));

    return lerp(lerp(f00, f10, frac.x), lerp(f01, f11, frac.x), frac.y);
}

// WHY THE SYNTHETIC LOOP LIVES INSIDE THE KERNEL.
//
// This used to be dispatched once per synthetic sample, and each dispatch read AND
// wrote the whole accumulator. At 5120x2880 that is 236 MB in + 236 MB out — about
// 80% of the pass's memory traffic — repeated factor-1 times, against ~8 B/px of
// actual texture reads.
//
// So the loop is folded in: one dispatch computes every warped sample, sums them
// WEIGHTED IN REGISTERS, and touches the accumulator exactly once. Texture sampling
// is unchanged; accumulator traffic drops by factor-1. That also makes factor 8
// nearly as cheap as factor 2, since the fixed cost no longer multiplies.
//
// Measured: 8K per-frame consumption 60.0 -> 40.9 ms, and on a live replay at 5K
// 91 -> 34.6 ms. The GROUP SHAPE was then swept (8x8 / 32x2 / 32x8 / 64x4) and made
// no difference at all — within 1%, i.e. noise — so 8x8 stayed. Do not re-litigate
// tile width here expecting a win: every accumulator element is visited by some
// group, so L2 coalesces across groups and the per-wave pattern does not matter.
//
// WHY THE INPUTS ARE BOUND THROUGH _SRGB VIEWS.
//
// gPrev and gSource are our own R8G8B8A8_TYPELESS copies viewed as _UNORM_SRGB, so
// the texture unit decodes sRGB as PART OF the bilinear filter. This is not only
// cheaper (no pow() per tap); it is the fix for a real compromise. Filtering
// sRGB-ENCODED values and linearising afterwards blends in the wrong space — the
// average of gamma-encoded values is not the gamma encoding of the average — and
// every warp tap is a bilinear filter. Now the blend, the cross-dissolve and the
// prev/cur lerp all happen in linear light, which is what they always should have.
//
// Everything below therefore works in LINEAR values from the first line.

[numthreads(TILE, TILE, 1)]
void CSWarpAccumulate(uint3 tid : SV_DispatchThreadID)
{
    if (tid.x >= gWarpSize.x || tid.y >= gWarpSize.y)
    {
        return;
    }

    float2 p = float2(tid.xy) + 0.5f;
    float2 texel = 1.0f / float2(gWarpSize);

    // Backward warp: for the output pixel p at time t, find where that point sat in
    // each source frame. Evaluating the field AT p (rather than solving for the
    // source position that lands on p) is the standard approximation, and it is a
    // good one precisely in our regime — measured per-sample displacement is ~4 px.
    //
    // Neither the flow nor the trust derived from it depends on t, so both are read
    // ONCE for the whole run rather than once per synthetic sample.
    float2 fwd = sampleFlow(gFlowFwd, p);
    float2 bwd = float2(0.0f, 0.0f);
    float trust = 1.0f;   // forward-only: nothing to cross-check against

    if (gHasBwd != 0)
    {
        bwd = sampleFlow(gFlowBwd, p);

        // Forward and backward flow describe the same motion in opposite directions,
        // so fwd + bwd should be ~0. Where it is not, the point is visible in only
        // one of the two frames — a disocclusion — and ANY warp of it is invention.
        // This is the occlusion handling that a naive warp lacks and that shows up as
        // smearing around moving edges.
        float residual = length(fwd + bwd);
        trust = saturate(1.0f - residual / max(gConsistencyPx, 1e-3f));
    }

    // The unwarped pair, fetched once and reused at every position. These feed the
    // cross-dissolve fallback: where flow cannot be trusted the result is a straight
    // dissolve of the UNWARPED frames, which is exactly the image this feature
    // produces with interpolation switched off — so a bad flow field degrades to the
    // status quo rather than inventing a new artefact. That is the property that
    // makes shipping this safe.
    //
    // DELIBERATELY SampleLevel AND NOT Load, even though the coordinate is the exact
    // texel centre and the filter therefore returns that texel unchanged. Whether a
    // `Load` through an _SRGB view applies the sRGB->linear decode is not something
    // this shader should have to be right about: if it did not, these two values
    // would be gamma-ENCODED while `warped` below is linear, and the mix of the two
    // would be wrong precisely at the disocclusions around a moving car — the least
    // forgiving place in the frame. Sampling goes through the filter path, where the
    // decode is unambiguous. The extra taps land in the same cache lines the warp is
    // already reading, and there are two of them against 2*(gFactor-1) in the loop.
    float3 prevPlain = gPrev.SampleLevel(gLinear, p * texel, 0.0f).rgb;
    float3 curPlain  = gSource.SampleLevel(gLinear, p * texel, 0.0f).rgb;

    float3 sum = float3(0.0f, 0.0f, 0.0f);
    float sumWeight = 0.0f;
    float invFactor = 1.0f / max(float(gFactor), 1.0f);

    // gFactor is a constant buffer value, so the trip count is uniform across the
    // whole dispatch — no divergence, and one branch per iteration for a body that
    // does two filtered texture fetches.
    [loop]
    for (uint k = 1; k < gFactor; ++k)
    {
        float t = float(k) * invFactor;
        float weight = lerp(gPrevWeight, gCurWeight, t);

        float2 prevPos = p - t * fwd;
        float2 curPos = (gHasBwd != 0)
            ? (p - (1.0f - t) * bwd)
            : (p + (1.0f - t) * fwd);

        float3 warped = lerp(
            gPrev.SampleLevel(gLinear, prevPos * texel, 0.0f).rgb,
            gSource.SampleLevel(gLinear, curPos * texel, 0.0f).rgb,
            t);

        float3 blended = lerp(lerp(prevPlain, curPlain, t), warped, trust);

        // Expanded AFTER blending, so a synthesised frame is treated exactly like the
        // real frame it stands in for: the sim would have rendered — and clipped — it
        // the same way. Both warp taps carry the highlight (that is what the warp is
        // for), so the blend of two highlights stays above the knee.
        sum += expand_highlights(blended, gWarpHighlightGain) * weight;
        sumWeight += weight;
    }

    // The single read-modify-write this whole kernel shape exists to reach.
    uint idx = tid.y * gWarpSize.x + tid.x;
    float4 acc = gAccum[idx];
    acc.rgb += sum;
    acc.a   += sumWeight;
    gAccum[idx] = acc;
}

// --- Pass 3: resolve -------------------------------------------------------

float3 tonemap_reinhard(float3 x)
{
    return x / (1.0f + x);
}

// ACES filmic approximation (Narkowicz) — cheap, and the standard photographic
// look for linear input.
float3 tonemap_aces(float3 x)
{
    const float a = 2.51f;
    const float b = 0.03f;
    const float c = 2.43f;
    const float d = 0.59f;
    const float e = 0.14f;
    return saturate((x * (a * x + b)) / (x * (c * x + d) + e));
}

[numthreads(TILE, TILE, 1)]
void CSResolve(uint3 tid : SV_DispatchThreadID)
{
    if (tid.x >= gOutSize.x || tid.y >= gOutSize.y)
    {
        return;
    }

    // Box-downsample the supersample in LINEAR space. Downsampling after tonemap —
    // or in sRGB — is the other classic mistake: it darkens edges and defeats the
    // anti-aliasing the supersample was taken for.
    uint renderWidth = gOutSize.x * gSupersample;
    float3 sum = float3(0.0f, 0.0f, 0.0f);
    uint taps = 0;

    for (uint dy = 0; dy < gSupersample; ++dy)
    {
        for (uint dx = 0; dx < gSupersample; ++dx)
        {
            uint2 sp = tid.xy * gSupersample + uint2(dx, dy);
            float4 acc = gAccumRead[sp.y * renderWidth + sp.x];
            // Normalise by ACCUMULATED WEIGHT, not by nominal sample count. This is
            // what keeps exposure correct after duplicate rejection and dropped
            // frames — they contributed to neither numerator nor denominator.
            sum += acc.rgb / max(acc.a, 1e-8f);
            taps += 1;
        }
    }

    float3 linearRGB = (sum / max(float(taps), 1.0f)) * gExposureMul;

    if (gTonemap == 1)
    {
        linearRGB = tonemap_reinhard(linearRGB);
    }
    else if (gTonemap == 2)
    {
        linearRGB = tonemap_aces(linearRGB);
    }
    else
    {
        // 'none' still has to land in a displayable range; clip rather than wrap.
        linearRGB = saturate(linearRGB);
    }

    float3 encoded = saturate(linear_to_srgb(linearRGB));
    uint r = (uint)(encoded.r * 65535.0f + 0.5f);
    uint g = (uint)(encoded.g * 65535.0f + 0.5f);
    uint b = (uint)(encoded.b * 65535.0f + 0.5f);

    // Packed little-endian, this is byte-for-byte 16-bit RGBA — exactly the layout
    // sharp wants for { raw: { channels: 4, depth: 'ushort' } }, so the readback
    // needs no CPU-side conversion pass.
    gOutput[tid.y * gOutSize.x + tid.x] = uint2(r | (g << 16), b | (65535u << 16));
}
