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

// gSource carries the frame that just arrived, bound through a plain _UNORM view,
// so CSAccumulate / CSDigest see sRGB-ENCODED values and convert in the shader.
Texture2D<float4>          gSource    : register(t0);
StructuredBuffer<float4>   gAccumRead : register(t1);

RWStructuredBuffer<float4> gAccum     : register(u0);
RWStructuredBuffer<uint>   gDigest    : register(u1);
RWStructuredBuffer<uint2>  gOutput    : register(u2);

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
    // Same value as gHighlightGain in b0, and it MUST be the same or the resolve
    // would invert a curve the accumulate pass did not apply. Carried in a second
    // cbuffer rather than shared because the two passes bind different registers.
    float gResolveHighlightGain;
    float2 gPadR;
};

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
// surfaces too, but they are present in EVERY sample, so they average to ~gain --
// and `compress_highlights` at resolve, being the EXACT INVERSE of this curve, maps
// that straight back to where it started. A transient highlight averages to
// gain x (its small duty cycle), lands below the knee, and comes back untouched and
// genuinely bright. The correction is therefore self-limiting on anything that does
// not move, by construction rather than by luck.
//
// HISTORY, so this does not get "simplified" back. Until 2026-08-03 the compressive
// half was ACES, on the reasoning that a tonemapper is compressive so it would do.
// It does not: `tonemap` defaults to none, so most shots had NOTHING putting the
// expansion back, and a plain sky at 3 stops blew to flat white with a hard edge
// along the 0.797-linear contour and banded below it (the transfer slope reaches ~8x
// just under the clip point, which magnifies single 8-bit input steps). Coupling
// recovery to ACES was the stopgap; it fixed the blow-out but repainted the whole
// image's look to buy it, and a static pixel still did not round-trip. The inverse
// does both properly and leaves `tonemap` free to be a look control again.

// Where expansion begins. Below this, values pass through untouched, so midtones
// and shadows are bit-for-bit unaffected.
#define HIGHLIGHT_KNEE  0.75f
// Shoulder shape. 2.0 ramps gently off the knee rather than kinking.
#define HIGHLIGHT_POWER 2.0f
// Bisection steps used to invert the curve at resolve. The bracket is [knee, 1], so
// 20 halvings pin the answer to 0.25 / 2^20 = 2.4e-7 -- two orders of magnitude
// finer than a 16-bit output step is worth (~3.4e-5 in linear near the knee), and
// the loop runs once per OUTPUT pixel in a pass that already runs once per capture.
#define HIGHLIGHT_SOLVE_STEPS 20

// The multiplier the expansion applies at a given peak. Factored out because
// `compress_highlights` has to invert EXACTLY this expression -- if the two ever
// drifted apart, the round-trip property below would quietly stop holding and the
// only symptom would be a slightly wrong sky.
float highlight_scale(float peak, float gain)
{
    float t = saturate((peak - HIGHLIGHT_KNEE) / (1.0f - HIGHLIGHT_KNEE));
    // Continuous at the knee (t = 0 gives scale 1), reaching `gain` at full clip.
    return 1.0f + (gain - 1.0f) * pow(t, HIGHLIGHT_POWER);
}

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

    // A SCALAR gain, so hue and saturation survive: a red light gets brighter rather
    // than turning white on the way up. Desaturating hot highlights toward white is
    // ACES's job at resolve, and doing it here as well would double-apply it.
    return linearRGB * highlight_scale(peak, gain);
}

// The exact inverse of expand_highlights, applied ONCE to the finished average at
// resolve. This is the second half of the pair described above.
//
// THE PROPERTY IT BUYS: a pixel that did not change during the exposure round-trips
// to exactly itself. Every sample of a static pixel is the same value v, so the
// weighted mean of expand(v) is expand(v), and compress(expand(v)) == v. The sky,
// the barriers, the car bodywork -- anything that held still -- is returned
// untouched, and the gain can be raised without a budget for what it will do to the
// rest of the frame. A transient highlight's mean is diluted by its duty cycle down
// below the knee, so it passes through this untouched and keeps everything the
// expansion bought it.
//
// WHY IT IS SOLVED RATHER THAN EVALUATED. expand() multiplies by a scale that
// depends on the peak, so inverting it means solving
//
//     p * (1 + (gain - 1) * ((p - knee) / (1 - knee))^2) = outPeak
//
// for p -- a cubic. Its derivative on [knee, 1] is 1 + a(3p - knee)(p - knee) with
// both factors non-negative, so the curve is STRICTLY INCREASING there and the root
// is unique: bisection cannot converge on the wrong one, needs no discriminant
// cases, and has an error bound you can read off the step count. Cardano would be
// exact and faster and is not worth the branchy edge cases at this cost.
float3 compress_highlights(float3 linearRGB, float gain)
{
    // Same guard as the expansion, for the same reason: OFF must be EXACTLY identity
    // so a one-sample box exposure stays bit-for-bit the still-capture path.
    if (gain <= 1.0f)
    {
        return linearRGB;
    }

    float outPeak = max(linearRGB.r, max(linearRGB.g, linearRGB.b));
    // Below the knee nothing was expanded, so nothing is compressed. This is also
    // what makes the correction free for the entire midtone and shadow range.
    if (outPeak <= HIGHLIGHT_KNEE)
    {
        return linearRGB;
    }

    // The source is 8-bit UNORM, so no input peak exceeds 1.0 and no expanded value
    // exceeds `gain`; an average of them cannot either. An outPeak above `gain` is
    // therefore unreachable, but if float slop ever produced one the search below
    // simply saturates at 1.0, which is the right answer anyway.
    float lo = HIGHLIGHT_KNEE;
    float hi = 1.0f;
    [unroll]
    for (uint i = 0; i < HIGHLIGHT_SOLVE_STEPS; ++i)
    {
        float mid = 0.5f * (lo + hi);
        if (mid * highlight_scale(mid, gain) < outPeak)
        {
            lo = mid;
        }
        else
        {
            hi = mid;
        }
    }

    // Scalar, exactly as the expansion was, so the hue it preserved on the way up
    // survives the way back down too.
    return linearRGB * (0.5f * (lo + hi) / outPeak);
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

    float3 linearRGB = sum / max(float(taps), 1.0f);

    // Put the highlight expansion back. ORDER IS LOAD-BEARING, in both directions:
    //
    //   AFTER the box downsample, because the accumulator holds scene-referred-ish
    //   values and an area average belongs in that space. Compressing per tap would
    //   run the box filter through a concave curve and darken edges -- the same
    //   mistake as downsampling after the tonemap, which the comment above rejects.
    //
    //   BEFORE gExposureMul, because EV is a look control the user dials on top of
    //   the finished image, not part of the round trip. Multiplying first would push
    //   midtones over the knee and hand them to the compressor, which would eat most
    //   of the boost: +1 EV on a 0.5 pixel would land at 0.797, not 1.0.
    linearRGB = compress_highlights(linearRGB, gResolveHighlightGain);

    linearRGB *= gExposureMul;

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
