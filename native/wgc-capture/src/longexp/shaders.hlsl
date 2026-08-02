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

Texture2D<float4>          gSource    : register(t0);
StructuredBuffer<float4>   gAccumRead : register(t1);

RWStructuredBuffer<float4> gAccum     : register(u0);
RWStructuredBuffer<uint>   gDigest    : register(u1);
RWStructuredBuffer<uint2>  gOutput    : register(u2);

cbuffer AccumulateParams : register(b0)
{
    uint2 gSize;     // render (== accumulator) dimensions
    float gWeight;   // this sample's weight, from the sink's weighting curve
    float gPadA;
};

cbuffer ResolveParams : register(b1)
{
    uint2 gOutSize;     // final image dimensions = render size / supersample
    uint  gSupersample; // 1 or 2
    uint  gTonemap;     // 0 none, 1 Reinhard, 2 ACES
    float gExposureMul; // 2^EV
    float3 gPadR;
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

    float3 linearRGB = srgb_to_linear(gSource[tid.xy].rgb);

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
