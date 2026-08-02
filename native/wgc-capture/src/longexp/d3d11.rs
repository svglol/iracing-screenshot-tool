//! DirectCompute implementation of `AccumulateBackend` (design note §1).
//!
//! Runs on the D3D11 device WGC already created for us, so the captured frame
//! texture is used in place with no interop layer, no copy across devices, and — a
//! detail that bites CUDA implementations on hybrid-graphics laptops — **no adapter
//! matching problem at all**, because there is only ever one device involved.
//!
//! Everything here is used from exactly one thread (the WGC capture thread), which
//! is why nothing is synchronised internally: the D3D11 immediate context requires
//! external synchronisation and single-thread ownership provides it.

use std::collections::HashMap;
use std::ffi::CString;

use windows::core::{Interface, PCSTR};
use windows::Win32::Graphics::Direct3D::Fxc::{D3DCompile, D3DCOMPILE_OPTIMIZATION_LEVEL3};
use windows::Win32::Graphics::Direct3D::{
    ID3DBlob, D3D_SRV_DIMENSION_BUFFEREX, D3D_SRV_DIMENSION_TEXTURE2D,
};
use windows::Win32::Graphics::Direct3D11::{
    ID3D11Buffer, ID3D11ComputeShader, ID3D11Device, ID3D11DeviceContext, ID3D11Resource,
    ID3D11SamplerState, ID3D11ShaderResourceView, ID3D11Texture2D, ID3D11UnorderedAccessView,
    D3D11_BIND_CONSTANT_BUFFER, D3D11_BIND_RENDER_TARGET, D3D11_BIND_SHADER_RESOURCE,
    D3D11_BIND_UNORDERED_ACCESS, D3D11_BUFFER_DESC, D3D11_BUFFER_UAV, D3D11_BUFFER_UAV_FLAG_RAW,
    D3D11_BUFFEREX_SRV, D3D11_COMPARISON_NEVER, D3D11_CPU_ACCESS_READ, D3D11_CPU_ACCESS_WRITE,
    D3D11_FEATURE_DATA_FORMAT_SUPPORT2, D3D11_FEATURE_FORMAT_SUPPORT2,
    D3D11_FILTER_MIN_MAG_MIP_LINEAR, D3D11_FORMAT_SUPPORT2_UAV_TYPED_STORE,
    D3D11_MAP_FLAG_DO_NOT_WAIT, D3D11_MAP_READ,
    D3D11_MAP_WRITE_DISCARD, D3D11_MAPPED_SUBRESOURCE, D3D11_RESOURCE_MISC_BUFFER_STRUCTURED,
    D3D11_SAMPLER_DESC, D3D11_SHADER_RESOURCE_VIEW_DESC, D3D11_SHADER_RESOURCE_VIEW_DESC_0,
    D3D11_SUBRESOURCE_DATA, D3D11_TEX2D_SRV, D3D11_TEX2D_UAV, D3D11_TEXTURE2D_DESC,
    D3D11_TEXTURE_ADDRESS_CLAMP, D3D11_UAV_DIMENSION_BUFFER, D3D11_UAV_DIMENSION_TEXTURE2D,
    D3D11_UNORDERED_ACCESS_VIEW_DESC, D3D11_UNORDERED_ACCESS_VIEW_DESC_0, D3D11_USAGE_DEFAULT,
    D3D11_USAGE_DYNAMIC, D3D11_USAGE_STAGING,
};
use windows::Win32::Graphics::Dxgi::Common::{
    DXGI_FORMAT, DXGI_FORMAT_R16G16_SINT, DXGI_FORMAT_R8_UNORM, DXGI_FORMAT_UNKNOWN,
    DXGI_SAMPLE_DESC,
};

use super::backend::{
    AccumulateBackend, BackendError, InterpolationStatus, ResolveParams, ResolvedImage,
    SampleOutcome,
};
use super::nvof::{self, NvOfBuffer, NvOfConfig, NvOpticalFlow};

const SHADER_SOURCE: &str = include_str!("shaders.hlsl");

/// Must match TILE in shaders.hlsl.
const TILE: u32 = 8;
/// Must match DIGEST_STRIDE in shaders.hlsl.
const DIGEST_STRIDE: u32 = 4;

/// Staging buffers in the digest readback ring. Needs to cover the frames the GPU
/// can have in flight; 4 is comfortably past D3D11's usual 3-frame depth, and each
/// slot is 8 bytes, so there is no reason to be stingy.
const DIGEST_RING: usize = 4;

fn div_ceil(value: u32, divisor: u32) -> u32 {
    if divisor == 0 {
        return 0;
    }
    value.div_ceil(divisor)
}

/// One sink's accumulator: a structured buffer of float4 (rgb = weighted linear
/// colour, a = accumulated weight), plus the views used to write and read it.
struct Sink {
    width: u32,
    height: u32,
    #[allow(dead_code)]
    buffer: ID3D11Buffer,
    uav: ID3D11UnorderedAccessView,
    srv: ID3D11ShaderResourceView,
}

/// How far the forward and backward flow fields may disagree, in pixels, before the
/// warp stops trusting them and falls back to a cross-dissolve.
///
/// Good flow over a coherently moving car agrees to well under a pixel. A
/// disocclusion — background revealed from behind a moving object, visible in only
/// one of the two frames — produces a large residual because there is no true
/// correspondence to find. 2 px sits above the noise of a grid-4 field that has been
/// bilinearly upsampled, and below any genuine occlusion boundary.
const FLOW_CONSISTENCY_PX: f32 = 2.0;

/// Everything the optional NVOFA interpolation path owns.
///
/// FIELD ORDER IS LOAD-BEARING. Rust drops fields in declaration order, and every
/// `NvOfBuffer` must unregister itself *before* the `NvOpticalFlow` session is
/// destroyed and `nvofapi64.dll` is unloaded — otherwise the unregister call jumps
/// into a freed module. `flow` is therefore last, deliberately.
struct Interpolation {
    factor: u32,
    width: u32,
    height: u32,
    config: NvOfConfig,

    /// Luma planes (R8_UNORM), ping-ponged so the previous frame's plane survives
    /// without a copy. `cur` indexes the one written this frame.
    luma: [ID3D11Texture2D; 2],
    luma_uav: [ID3D11UnorderedAccessView; 2],
    luma_registration: [NvOfBuffer; 2],
    cur: usize,

    /// Retained previous frame in full colour, for the warp. WGC's frame textures are
    /// recycled by the frame pool, so keeping our own copy is what makes a previous
    /// frame available at all — and it removes a dependence on that recycling.
    prev_rgba: ID3D11Texture2D,
    prev_srv: ID3D11ShaderResourceView,

    flow_fwd_srv: ID3D11ShaderResourceView,
    flow_fwd_registration: NvOfBuffer,
    /// Present only when the driver granted NV_OF_PRED_DIRECTION_BOTH.
    flow_bwd_srv: Option<ID3D11ShaderResourceView>,
    flow_bwd_registration: Option<NvOfBuffer>,
    /// Kept alive for the SRVs/registrations above.
    _flow_textures: Vec<ID3D11Texture2D>,

    /// False until a first frame has been retained; no in-betweens exist before then.
    have_prev: bool,
    /// The weight the retained frame was accumulated with, so a synthetic sample at
    /// position t can take lerp(prev, cur, t) — which is the weighting curve
    /// evaluated at the interpolated position, for free.
    prev_weight: f32,

    // MUST BE LAST. See the note above.
    flow: NvOpticalFlow,
}

pub struct D3d11Backend {
    device: ID3D11Device,
    context: ID3D11DeviceContext,

    cs_clear: ID3D11ComputeShader,
    cs_accumulate: ID3D11ComputeShader,
    cs_digest: ID3D11ComputeShader,
    cs_resolve: ID3D11ComputeShader,
    cs_luma: ID3D11ComputeShader,
    cs_warp: ID3D11ComputeShader,

    cb_accumulate: ID3D11Buffer,
    cb_resolve: ID3D11Buffer,
    cb_warp: ID3D11Buffer,
    sampler_linear: ID3D11SamplerState,

    interpolation: Option<Interpolation>,
    interpolation_status: InterpolationStatus,

    /// Linear gain the highlight-recovery curve reaches at full clip. 1.0 = off,
    /// which is the default and is exactly identity — see `expand_highlights` in
    /// shaders.hlsl for why this exists at all.
    highlight_gain: f32,

    // 2 x u32 digest lanes, plus a RING of staging buffers to read them back.
    //
    // The ring is what makes the readback asynchronous: frame N's result is copied
    // into slot N % DIGEST_RING and collected a frame or two later with
    // D3D11_MAP_FLAG_DO_NOT_WAIT, instead of stalling the capture thread until the
    // GPU catches up. `digest_buffer` itself needs no ring — the clear, dispatch and
    // copy are ordered on the GPU timeline, so each copy captures its own frame.
    digest_buffer: ID3D11Buffer,
    digest_uav: ID3D11UnorderedAccessView,
    digest_staging: Vec<ID3D11Buffer>,
    digest_submitted: u64,
    digest_collected: u64,
    // Zero-filled source used to reset the digest lanes each frame without a
    // dedicated clear shader.
    digest_zero: ID3D11Buffer,

    sinks: HashMap<String, Sink>,

    // Lazily created scratch texture used only when the WGC frame texture lacks the
    // SHADER_RESOURCE bind flag (so we can never fail on a bind-flag mismatch).
    scratch_source: Option<(ID3D11Texture2D, u32, u32)>,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct AccumulateCb {
    size: [u32; 2],
    weight: f32,
    /// Linear gain applied at full clip by the highlight-recovery curve. Exactly
    /// 1.0 means off, and off is bit-for-bit identity.
    highlight_gain: f32,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct ResolveCb {
    out_size: [u32; 2],
    supersample: u32,
    tonemap: u32,
    exposure_mul: f32,
    _pad: [f32; 3],
}

/// Mirrors `cbuffer WarpParams : register(b2)`. HLSL packs this as three 16-byte
/// registers and so does `repr(C)` here; the layout test at the bottom pins it.
#[repr(C)]
#[derive(Clone, Copy)]
struct WarpCb {
    warp_size: [u32; 2],
    flow_size: [u32; 2],
    t: f32,
    weight: f32,
    flow_grid: u32,
    has_bwd: u32,
    consistency_px: f32,
    highlight_gain: f32,
    _pad: [f32; 2],
}

fn compile(entry: &str) -> Result<ID3DBlob, BackendError> {
    let entry_c = CString::new(entry).map_err(|e| BackendError(e.to_string()))?;
    let target_c = CString::new("cs_5_0").map_err(|e| BackendError(e.to_string()))?;
    let name_c = CString::new("long-exposure.hlsl").map_err(|e| BackendError(e.to_string()))?;

    let mut code: Option<ID3DBlob> = None;
    let mut errors: Option<ID3DBlob> = None;

    // SAFETY: all pointers are to live, correctly sized local data; D3DCompile does
    // not retain them beyond the call.
    let result = unsafe {
        D3DCompile(
            SHADER_SOURCE.as_ptr() as *const std::ffi::c_void,
            SHADER_SOURCE.len(),
            PCSTR(name_c.as_ptr() as *const u8),
            None,
            None,
            PCSTR(entry_c.as_ptr() as *const u8),
            PCSTR(target_c.as_ptr() as *const u8),
            D3DCOMPILE_OPTIMIZATION_LEVEL3,
            0,
            &mut code,
            Some(&mut errors),
        )
    };

    if let Err(error) = result {
        // fxc's diagnostics are far more useful than the HRESULT, so surface them.
        let detail = errors
            .as_ref()
            .map(|blob| unsafe {
                let ptr = blob.GetBufferPointer() as *const u8;
                let len = blob.GetBufferSize();
                String::from_utf8_lossy(std::slice::from_raw_parts(ptr, len)).into_owned()
            })
            .unwrap_or_default();
        return Err(BackendError(format!(
            "compiling {entry} failed: {error} {detail}"
        )));
    }

    code.ok_or_else(|| BackendError(format!("compiling {entry} produced no bytecode")))
}

impl D3d11Backend {
    pub fn new(
        device: ID3D11Device,
        context: ID3D11DeviceContext,
    ) -> Result<Self, BackendError> {
        let make_shader = |entry: &str| -> Result<ID3D11ComputeShader, BackendError> {
            let blob = compile(entry)?;
            let mut shader: Option<ID3D11ComputeShader> = None;
            unsafe {
                let bytes = std::slice::from_raw_parts(
                    blob.GetBufferPointer() as *const u8,
                    blob.GetBufferSize(),
                );
                device.CreateComputeShader(bytes, None, Some(&mut shader))?;
            }
            shader.ok_or_else(|| BackendError(format!("CreateComputeShader({entry}) returned null")))
        };

        let cs_clear = make_shader("CSClear")?;
        let cs_accumulate = make_shader("CSAccumulate")?;
        let cs_digest = make_shader("CSDigest")?;
        let cs_resolve = make_shader("CSResolve")?;
        // Compiled unconditionally so a break in them is caught by the probe on every
        // machine, not only on the NVIDIA boxes that can dispatch them.
        let cs_luma = make_shader("CSLuma")?;
        let cs_warp = make_shader("CSWarpAccumulate")?;

        let cb_accumulate = create_constant_buffer(&device, std::mem::size_of::<AccumulateCb>())?;
        let cb_resolve = create_constant_buffer(&device, std::mem::size_of::<ResolveCb>())?;
        let cb_warp = create_constant_buffer(&device, std::mem::size_of::<WarpCb>())?;

        let sampler_linear = create_linear_clamp_sampler(&device)?;

        // Digest lanes: a 2-element raw buffer so the shader's InterlockedAdd /
        // InterlockedXor can target it. Raw (BYTEADDRESS) rather than structured
        // because atomics on a structured buffer of uint are legal but raw views are
        // the better-supported path for interlocked ops at FL11_0.
        let digest_buffer = create_uav_buffer(&device, 8, 4, true)?;
        let digest_uav = create_raw_uav(&device, &digest_buffer, 2)?;
        let digest_staging = (0..DIGEST_RING)
            .map(|_| create_staging_buffer(&device, 8))
            .collect::<Result<Vec<_>, _>>()?;
        let digest_zero = create_immutable_buffer(&device, &[0u8; 8])?;

        Ok(Self {
            device,
            context,
            cs_clear,
            cs_accumulate,
            cs_digest,
            cs_resolve,
            cs_luma,
            cs_warp,
            cb_accumulate,
            cb_resolve,
            cb_warp,
            sampler_linear,
            interpolation: None,
            interpolation_status: InterpolationStatus {
                enabled: false,
                factor: 1,
                reason: None,
                grid_size: 0,
                bidirectional: false,
            },
            highlight_gain: 1.0,
            digest_buffer,
            digest_uav,
            digest_staging,
            digest_submitted: 0,
            digest_collected: 0,
            digest_zero,
            sinks: HashMap::new(),
            scratch_source: None,
        })
    }

    /// Stand up every resource the interpolation path needs, or explain why not.
    ///
    /// Split out from `enable_interpolation` so that method can turn ANY failure —
    /// including a driver returning an error mid-way — into a reason string rather
    /// than propagating it. Nothing in here may be allowed to fail a capture.
    fn build_interpolation(
        &mut self,
        factor: u32,
        source_format: DXGI_FORMAT,
        width: u32,
        height: u32,
    ) -> Result<Interpolation, BackendError> {
        // The luma plane is written through a typed UAV. At feature level 11_0 only
        // R32_{FLOAT,UINT,SINT} typed stores are guaranteed, so check rather than
        // assume — even though every Turing-or-newer NVIDIA part supports it, and this
        // path runs nowhere else.
        if !self.supports_typed_uav_store(DXGI_FORMAT_R8_UNORM) {
            return Err(BackendError(
                "this device cannot write an R8_UNORM typed UAV, which the luma pass needs".into(),
            ));
        }

        let flow = NvOpticalFlow::create(
            &self.device,
            &self.context,
            width,
            height,
            nvof::NV_OF_PERF_LEVEL_MEDIUM,
        )?;
        let config = flow.config();

        // Luma planes: NVOFA's input surfaces. RENDER_TARGET is included to match the
        // bind flags NVIDIA's own D3D11 sample registers with.
        let luma_desc = texture_desc(
            width,
            height,
            DXGI_FORMAT_R8_UNORM,
            (D3D11_BIND_SHADER_RESOURCE.0 | D3D11_BIND_UNORDERED_ACCESS.0 | D3D11_BIND_RENDER_TARGET.0)
                as u32,
        );
        let luma0 = create_texture(&self.device, &luma_desc)?;
        let luma1 = create_texture(&self.device, &luma_desc)?;
        let luma_uav0 = create_texture_uav(&self.device, &luma0, DXGI_FORMAT_R8_UNORM)?;
        let luma_uav1 = create_texture_uav(&self.device, &luma1, DXGI_FORMAT_R8_UNORM)?;
        let luma_reg0 = flow.register(&luma0.cast::<ID3D11Resource>()?)?;
        let luma_reg1 = flow.register(&luma1.cast::<ID3D11Resource>()?)?;

        // Flow outputs: one S10.5 int2 per grid cell.
        let flow_desc = texture_desc(
            config.flow_width,
            config.flow_height,
            DXGI_FORMAT_R16G16_SINT,
            (D3D11_BIND_SHADER_RESOURCE.0 | D3D11_BIND_UNORDERED_ACCESS.0 | D3D11_BIND_RENDER_TARGET.0)
                as u32,
        );
        let flow_fwd = create_texture(&self.device, &flow_desc)?;
        let flow_fwd_srv = create_texture_srv(&self.device, &flow_fwd, DXGI_FORMAT_R16G16_SINT)?;
        let flow_fwd_registration = flow.register(&flow_fwd.cast::<ID3D11Resource>()?)?;

        let mut flow_textures = vec![flow_fwd];
        let (flow_bwd_srv, flow_bwd_registration) = if config.bidirectional {
            let flow_bwd = create_texture(&self.device, &flow_desc)?;
            let srv = create_texture_srv(&self.device, &flow_bwd, DXGI_FORMAT_R16G16_SINT)?;
            let registration = flow.register(&flow_bwd.cast::<ID3D11Resource>()?)?;
            flow_textures.push(flow_bwd);
            (Some(srv), Some(registration))
        } else {
            (None, None)
        };

        // Retained previous frame, in the capture's own format.
        let prev_desc = texture_desc(
            width,
            height,
            source_format,
            D3D11_BIND_SHADER_RESOURCE.0 as u32,
        );
        let prev_rgba = create_texture(&self.device, &prev_desc)?;
        let prev_srv = create_texture_srv(&self.device, &prev_rgba, source_format)?;

        Ok(Interpolation {
            factor,
            width,
            height,
            config,
            luma: [luma0, luma1],
            luma_uav: [luma_uav0, luma_uav1],
            luma_registration: [luma_reg0, luma_reg1],
            cur: 0,
            prev_rgba,
            prev_srv,
            flow_fwd_srv,
            flow_fwd_registration,
            flow_bwd_srv,
            flow_bwd_registration,
            _flow_textures: flow_textures,
            have_prev: false,
            prev_weight: 0.0,
            flow,
        })
    }

    /// The full per-frame interpolation sequence.
    ///
    /// Order matters and is not rearrangeable: the warp reads the retained previous
    /// frame, so the retain must happen LAST, after every synthetic sample has been
    /// accumulated.
    ///
    ///   1. current frame -> luma plane (ping-pong slot `cur`)
    ///   2. NVOFA: flow between the previous luma plane and this one
    ///   3. for k in 1..factor: warp to t = k/factor and accumulate
    ///   4. accumulate the REAL frame
    ///   5. retain this frame as `prev`, and flip the ping-pong
    ///
    /// Step 2 is asynchronous — it only submits work. We never read flow back on the
    /// CPU, so unlike the digest there is no sync point here at all; the D3D11 driver
    /// orders the warp's reads after NVOFA's writes for us.
    fn accumulate_interpolated(
        &mut self,
        sink_id: &str,
        source: &ID3D11Texture2D,
        weight: f32,
        interp: &mut Interpolation,
    ) -> Result<SampleOutcome, BackendError> {
        let (sink_width, sink_height, sink_uav) = {
            let sink = self
                .sinks
                .get(sink_id)
                .ok_or_else(|| BackendError(format!("unknown sink '{sink_id}'")))?;
            (sink.width, sink.height, sink.uav.clone())
        };

        // A resize mid-capture would invalidate every registered surface. It cannot
        // happen (the window is fixed for the shot) but silently warping against
        // mismatched dimensions would be far worse than declining.
        if sink_width != interp.width || sink_height != interp.height {
            return Err(BackendError(format!(
                "interpolation is set up for {}x{} but the sink is {sink_width}x{sink_height}",
                interp.width, interp.height
            )));
        }

        let source_srv = self.source_srv(source)?;

        // 1. Luma for the flow engine.
        self.dispatch_luma(interp, &source_srv)?;

        // 2 & 3. Only once a previous frame exists.
        let mut synthetic = 0u32;
        if interp.have_prev {
            let prev_index = 1 - interp.cur;
            let flow_result = interp.flow.execute(
                &interp.luma_registration[prev_index],
                &interp.luma_registration[interp.cur],
                &interp.flow_fwd_registration,
                interp.flow_bwd_registration.as_ref(),
                // Consecutive frames of continuous motion: the previous call's
                // vectors are a good starting guess, so let the engine use them.
                false,
            );

            match flow_result {
                Ok(()) => {
                    for k in 1..interp.factor {
                        let t = k as f32 / interp.factor as f32;
                        // The synthetic sample's weight is the weighting curve at the
                        // interpolated position — which, because the curve is
                        // parameterised by POSITION rather than sample index, is just
                        // the lerp between the two real samples' weights.
                        let synthetic_weight = interp.prev_weight + (weight - interp.prev_weight) * t;
                        self.dispatch_warp(interp, &sink_uav, &source_srv, t, synthetic_weight)?;
                        synthetic += 1;
                    }
                }
                // A flow failure mid-capture costs us the in-betweens for this frame
                // and nothing else. The real sample below still lands, so the exposure
                // stays correct — it is merely sampled as sparsely as it would have
                // been with interpolation off.
                Err(_) => {}
            }
        }

        // 4. The real frame.
        self.accumulate_with_srv(sink_width, sink_height, &sink_uav, &source_srv, weight)?;

        // 5. Retain, and flip the ping-pong so this frame's luma becomes next frame's
        //    previous without a copy.
        // SAFETY: both textures are the same size and format by construction.
        unsafe {
            self.context.CopyResource(&interp.prev_rgba, source);
        }
        interp.cur = 1 - interp.cur;
        interp.have_prev = true;
        interp.prev_weight = weight;

        Ok(SampleOutcome {
            real: 1,
            synthetic,
        })
    }

    /// Read the oldest outstanding digest slot.
    ///
    /// `blocking = false` uses `D3D11_MAP_FLAG_DO_NOT_WAIT`, which returns
    /// `DXGI_ERROR_WAS_STILL_DRAWING` rather than stalling when the GPU has not
    /// finished — that HRESULT is the entire point of this change and is treated as
    /// "not ready yet", not as an error.
    fn collect_digest(&mut self, blocking: bool) -> Option<u64> {
        // 0x887A000A. Compared numerically to avoid dragging in the DXGI error
        // constants for one value.
        const WAS_STILL_DRAWING: i32 = 0x887A000Au32 as i32;

        if self.digest_collected >= self.digest_submitted {
            return None;
        }
        let slot = (self.digest_collected as usize) % DIGEST_RING;
        let flags = if blocking {
            0
        } else {
            D3D11_MAP_FLAG_DO_NOT_WAIT.0 as u32
        };

        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        // SAFETY: `slot` is in range, and the staging buffer is 8 bytes of two u32
        // lanes written by CSDigest.
        let result = unsafe {
            self.context.Map(
                &self.digest_staging[slot],
                0,
                D3D11_MAP_READ,
                flags,
                Some(&mut mapped),
            )
        };
        if let Err(error) = result {
            if !blocking && error.code().0 == WAS_STILL_DRAWING {
                return None;
            }
            // A real fault. Give up on this slot rather than wedging the ring, and let
            // the sample simply carry no digest.
            self.digest_collected += 1;
            return None;
        }

        // SAFETY: the map succeeded, so pData points at the mapped 8 bytes.
        let value = unsafe {
            let ptr = mapped.pData as *const u32;
            let value = (*ptr as u64) | ((*ptr.add(1) as u64) << 32);
            self.context.Unmap(&self.digest_staging[slot], 0);
            value
        };
        self.digest_collected += 1;
        Some(value)
    }

    /// D3D11_FEATURE_FORMAT_SUPPORT2 for a typed UAV store of `format`.
    fn supports_typed_uav_store(&self, format: DXGI_FORMAT) -> bool {
        let mut data = D3D11_FEATURE_DATA_FORMAT_SUPPORT2 {
            InFormat: format,
            OutFormatSupport2: 0,
        };
        // SAFETY: `data` is a live local of exactly the size passed.
        let ok = unsafe {
            self.device.CheckFeatureSupport(
                D3D11_FEATURE_FORMAT_SUPPORT2,
                &mut data as *mut _ as *mut std::ffi::c_void,
                std::mem::size_of::<D3D11_FEATURE_DATA_FORMAT_SUPPORT2>() as u32,
            )
        }
        .is_ok();
        ok && (data.OutFormatSupport2 & D3D11_FORMAT_SUPPORT2_UAV_TYPED_STORE.0 as u32) != 0
    }

    /// The accumulate dispatch itself, against an SRV the caller already built.
    /// Split out so the interpolation path creates the source SRV once and reuses it
    /// across the luma pass, every warp, and the real sample.
    fn accumulate_with_srv(
        &self,
        width: u32,
        height: u32,
        uav: &ID3D11UnorderedAccessView,
        srv: &ID3D11ShaderResourceView,
        weight: f32,
    ) -> Result<(), BackendError> {
        self.write_accumulate_cb(width, height, weight)?;
        unsafe {
            self.context.CSSetShader(&self.cs_accumulate, None);
            self.context
                .CSSetConstantBuffers(0, Some(&[Some(self.cb_accumulate.clone())]));
            self.context.CSSetShaderResources(0, Some(&[Some(srv.clone())]));
            self.context
                .CSSetUnorderedAccessViews(0, 1, Some([Some(uav.clone())].as_ptr()), None);
            self.context
                .Dispatch(div_ceil(width, TILE), div_ceil(height, TILE), 1);
        }
        self.unbind();
        Ok(())
    }

    /// RGBA -> luma for the frame currently bound as `gSource`, into the ping-pong
    /// slot NVOFA will read as this frame's input.
    fn dispatch_luma(
        &self,
        interp: &Interpolation,
        srv: &ID3D11ShaderResourceView,
    ) -> Result<(), BackendError> {
        self.write_accumulate_cb(interp.width, interp.height, 0.0)?;
        unsafe {
            self.context.CSSetShader(&self.cs_luma, None);
            self.context
                .CSSetConstantBuffers(0, Some(&[Some(self.cb_accumulate.clone())]));
            self.context.CSSetShaderResources(0, Some(&[Some(srv.clone())]));
            // gLuma is register(u3).
            self.context.CSSetUnorderedAccessViews(
                3,
                1,
                Some([Some(interp.luma_uav[interp.cur].clone())].as_ptr()),
                None,
            );
            self.context
                .Dispatch(div_ceil(interp.width, TILE), div_ceil(interp.height, TILE), 1);
        }
        self.unbind();
        Ok(())
    }

    /// Warp prev and current to position `t` and accumulate the result with `weight`.
    /// One fused pass — no intermediate full-resolution texture is ever written.
    fn dispatch_warp(
        &self,
        interp: &Interpolation,
        sink_uav: &ID3D11UnorderedAccessView,
        source_srv: &ID3D11ShaderResourceView,
        t: f32,
        weight: f32,
    ) -> Result<(), BackendError> {
        let data = WarpCb {
            warp_size: [interp.width, interp.height],
            flow_size: [interp.config.flow_width, interp.config.flow_height],
            t,
            weight,
            flow_grid: interp.config.grid_size,
            has_bwd: u32::from(interp.flow_bwd_srv.is_some()),
            consistency_px: FLOW_CONSISTENCY_PX,
            highlight_gain: self.highlight_gain,
            _pad: [0.0; 2],
        };
        write_constant_buffer(&self.context, &self.cb_warp, &data)?;

        // A backward field is required by the shader's binding even when unused; bind
        // the forward one twice rather than leaving a null SRV, which would read as
        // zeroes and be indistinguishable from "no motion".
        let bwd = interp
            .flow_bwd_srv
            .clone()
            .unwrap_or_else(|| interp.flow_fwd_srv.clone());

        unsafe {
            self.context.CSSetShader(&self.cs_warp, None);
            // WarpParams is register(b2).
            self.context
                .CSSetConstantBuffers(2, Some(&[Some(self.cb_warp.clone())]));
            self.context.CSSetSamplers(0, Some(&[Some(self.sampler_linear.clone())]));
            // t0 gSource, t2 gFlowFwd, t3 gFlowBwd, t4 gPrev.
            self.context
                .CSSetShaderResources(0, Some(&[Some(source_srv.clone())]));
            self.context.CSSetShaderResources(
                2,
                Some(&[
                    Some(interp.flow_fwd_srv.clone()),
                    Some(bwd),
                    Some(interp.prev_srv.clone()),
                ]),
            );
            self.context
                .CSSetUnorderedAccessViews(0, 1, Some([Some(sink_uav.clone())].as_ptr()), None);
            self.context
                .Dispatch(div_ceil(interp.width, TILE), div_ceil(interp.height, TILE), 1);
        }
        self.unbind();
        Ok(())
    }

    fn write_accumulate_cb(&self, width: u32, height: u32, weight: f32) -> Result<(), BackendError> {
        let data = AccumulateCb {
            size: [width, height],
            weight,
            highlight_gain: self.highlight_gain,
        };
        write_constant_buffer(&self.context, &self.cb_accumulate, &data)
    }

    fn write_resolve_cb(&self, params: &ResolveParams) -> Result<(), BackendError> {
        let data = ResolveCb {
            out_size: [params.out_width, params.out_height],
            supersample: params.supersample.max(1),
            tonemap: params.tonemap as u32,
            exposure_mul: params.exposure_mul,
            _pad: [0.0; 3],
        };
        write_constant_buffer(&self.context, &self.cb_resolve, &data)
    }

    /// An SRV over the captured frame. WGC's frame-pool textures are normally
    /// SHADER_RESOURCE-capable, but we never depend on that: if the bind flags say
    /// otherwise we copy into a scratch texture we own. Costs one full-res GPU copy
    /// in the fallback case and removes an entire class of failure.
    fn source_srv(
        &mut self,
        source: &ID3D11Texture2D,
    ) -> Result<ID3D11ShaderResourceView, BackendError> {
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { source.GetDesc(&mut desc) };

        let usable = if (desc.BindFlags & D3D11_BIND_SHADER_RESOURCE.0 as u32) != 0 {
            source.clone()
        } else {
            self.ensure_scratch_source(&desc)?;
            let (scratch, _, _) = self
                .scratch_source
                .as_ref()
                .ok_or_else(|| BackendError("scratch source missing".into()))?;
            unsafe { self.context.CopyResource(scratch, source) };
            scratch.clone()
        };

        let srv_desc = D3D11_SHADER_RESOURCE_VIEW_DESC {
            Format: desc.Format,
            ViewDimension: D3D_SRV_DIMENSION_TEXTURE2D,
            Anonymous: D3D11_SHADER_RESOURCE_VIEW_DESC_0 {
                Texture2D: D3D11_TEX2D_SRV {
                    MostDetailedMip: 0,
                    MipLevels: 1,
                },
            },
        };
        let mut srv: Option<ID3D11ShaderResourceView> = None;
        unsafe {
            self.device
                .CreateShaderResourceView(&usable, Some(&srv_desc), Some(&mut srv))?;
        }
        srv.ok_or_else(|| BackendError("CreateShaderResourceView returned null".into()))
    }

    fn ensure_scratch_source(&mut self, desc: &D3D11_TEXTURE2D_DESC) -> Result<(), BackendError> {
        if let Some((_, w, h)) = self.scratch_source.as_ref() {
            if *w == desc.Width && *h == desc.Height {
                return Ok(());
            }
        }
        let mut scratch_desc = *desc;
        scratch_desc.Usage = D3D11_USAGE_DEFAULT;
        scratch_desc.BindFlags = D3D11_BIND_SHADER_RESOURCE.0 as u32;
        scratch_desc.CPUAccessFlags = 0;
        scratch_desc.MiscFlags = 0;

        let mut texture: Option<ID3D11Texture2D> = None;
        unsafe {
            self.device
                .CreateTexture2D(&scratch_desc, None, Some(&mut texture))?;
        }
        let texture =
            texture.ok_or_else(|| BackendError("CreateTexture2D(scratch) returned null".into()))?;
        self.scratch_source = Some((texture, desc.Width, desc.Height));
        Ok(())
    }

    fn unbind(&self) {
        // D3D11 will not let a resource be bound as SRV and UAV simultaneously, and
        // the debug layer is loud about leftover bindings. Clear every slot any of
        // the six kernels uses — t0..t4 and u0..u3 — between passes.
        unsafe {
            self.context
                .CSSetShaderResources(0, Some(&[None, None, None, None, None]));
            self.context.CSSetUnorderedAccessViews(
                0,
                4,
                Some([None, None, None, None].as_ptr()),
                None,
            );
        }
    }
}

impl AccumulateBackend for D3d11Backend {
    fn name(&self) -> &'static str {
        "d3d11-compute"
    }

    fn create_sink(&mut self, sink_id: &str, width: u32, height: u32) -> Result<(), BackendError> {
        if width == 0 || height == 0 {
            return Err(BackendError("sink dimensions must be non-zero".into()));
        }
        let elements = width as u64 * height as u64;
        let bytes = elements
            .checked_mul(16)
            .ok_or_else(|| BackendError("accumulator size overflow".into()))?;
        if bytes > u32::MAX as u64 {
            // A single D3D11 buffer is capped at 4 GiB; 4K at 2x supersample is
            // 531 MB, so this only trips on absurd requests.
            return Err(BackendError(format!(
                "accumulator would need {bytes} bytes, beyond the 4 GiB buffer limit"
            )));
        }

        let buffer = create_uav_buffer(&self.device, bytes as u32, 16, false)?;
        let uav = create_structured_uav(&self.device, &buffer, elements as u32)?;
        let srv = create_structured_srv(&self.device, &buffer, elements as u32)?;

        // Zero the accumulator up front — otherwise the first frame reads garbage.
        self.write_accumulate_cb(width, height, 0.0)?;
        unsafe {
            self.context.CSSetShader(&self.cs_clear, None);
            self.context
                .CSSetConstantBuffers(0, Some(&[Some(self.cb_accumulate.clone())]));
            self.context
                .CSSetUnorderedAccessViews(0, 1, Some([Some(uav.clone())].as_ptr()), None);
            self.context
                .Dispatch(div_ceil(width, TILE), div_ceil(height, TILE), 1);
        }
        self.unbind();

        self.sinks.insert(
            sink_id.to_string(),
            Sink {
                width,
                height,
                buffer,
                uav,
                srv,
            },
        );
        Ok(())
    }

    fn submit_digest(&mut self, source: &ID3D11Texture2D) -> Result<(), BackendError> {
        // If the ring is full the GPU is further behind than it should ever be. Rather
        // than overwrite an uncollected slot, block on the oldest — correctness first,
        // and it costs one stall in a situation that should not arise.
        if self.digest_submitted - self.digest_collected >= DIGEST_RING as u64 {
            let _ = self.collect_digest(true);
        }

        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { source.GetDesc(&mut desc) };

        let srv = self.source_srv(source)?;
        self.write_accumulate_cb(desc.Width, desc.Height, 0.0)?;

        let slot = (self.digest_submitted as usize) % DIGEST_RING;
        unsafe {
            // Reset both lanes by copying an 8-byte zero buffer over them.
            self.context.CopyResource(&self.digest_buffer, &self.digest_zero);

            self.context.CSSetShader(&self.cs_digest, None);
            self.context
                .CSSetConstantBuffers(0, Some(&[Some(self.cb_accumulate.clone())]));
            self.context.CSSetShaderResources(0, Some(&[Some(srv)]));
            // gDigest is register(u1).
            self.context.CSSetUnorderedAccessViews(
                1,
                1,
                Some([Some(self.digest_uav.clone())].as_ptr()),
                None,
            );
            self.context.Dispatch(
                div_ceil(div_ceil(desc.Width, DIGEST_STRIDE), TILE),
                div_ceil(div_ceil(desc.Height, DIGEST_STRIDE), TILE),
                1,
            );

            // Clear -> dispatch -> copy are ordered on the GPU timeline, so this slot
            // receives THIS frame's digest even though later frames are already being
            // submitted behind it.
            self.context
                .CopyResource(&self.digest_staging[slot], &self.digest_buffer);
        }
        self.unbind();

        self.digest_submitted += 1;
        Ok(())
    }

    fn poll_digests(&mut self) -> Vec<u64> {
        let mut out = Vec::new();
        while self.digest_collected < self.digest_submitted {
            match self.collect_digest(false) {
                Some(value) => out.push(value),
                // Still in flight. Stop here rather than skipping ahead, so results
                // stay in submission order.
                None => break,
            }
        }
        out
    }

    fn drain_digests(&mut self) -> Vec<u64> {
        let mut out = Vec::new();
        while self.digest_collected < self.digest_submitted {
            match self.collect_digest(true) {
                Some(value) => out.push(value),
                // A blocking collect only returns None on a genuine device error, in
                // which case the rest will fail too.
                None => break,
            }
        }
        out
    }

    fn accumulate(
        &mut self,
        sink_id: &str,
        source: &ID3D11Texture2D,
        weight: f32,
    ) -> Result<(), BackendError> {
        let (width, height, uav) = {
            let sink = self
                .sinks
                .get(sink_id)
                .ok_or_else(|| BackendError(format!("unknown sink '{sink_id}'")))?;
            (sink.width, sink.height, sink.uav.clone())
        };

        let srv = self.source_srv(source)?;
        self.accumulate_with_srv(width, height, &uav, &srv, weight)
    }

    fn set_highlight_recovery(&mut self, stops: f32) {
        // Expressed in stops so it reads like every other photographic control, and
        // so 0 is unambiguously "off". Clamped rather than rejected: a stale recipe
        // should degrade, not fail a shot. 8 stops is a 256x gain at full clip, well
        // past anything useful.
        let stops = if stops.is_finite() {
            stops.clamp(0.0, 8.0)
        } else {
            0.0
        };
        // exp2(0) is exactly 1.0, so "off" stays exactly identity.
        self.highlight_gain = stops.exp2();
    }

    fn enable_interpolation(
        &mut self,
        factor: u32,
        source: &ID3D11Texture2D,
    ) -> InterpolationStatus {
        self.interpolation = None;
        if factor <= 1 {
            self.interpolation_status = InterpolationStatus {
                enabled: false,
                factor: 1,
                reason: None,
                grid_size: 0,
                bidirectional: false,
            };
            return self.interpolation_status.clone();
        }

        // Width, height and pixel format all come from the real frame, so the
        // retained copy cannot disagree with what WGC is delivering.
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { source.GetDesc(&mut desc) };

        self.interpolation_status = match self.build_interpolation(
            factor,
            desc.Format,
            desc.Width,
            desc.Height,
        ) {
            Ok(interp) => {
                let config = interp.config;
                self.interpolation = Some(interp);
                InterpolationStatus {
                    enabled: true,
                    factor,
                    reason: None,
                    grid_size: config.grid_size,
                    bidirectional: config.bidirectional,
                }
            }
            // Every failure lands here as a REASON, never an error. NVOFA is an
            // optional accelerator; the base long exposure must not depend on it.
            Err(error) => InterpolationStatus {
                enabled: false,
                factor: 1,
                reason: Some(error.0),
                grid_size: 0,
                bidirectional: false,
            },
        };
        self.interpolation_status.clone()
    }

    fn accumulate_sample(
        &mut self,
        sink_id: &str,
        source: &ID3D11Texture2D,
        weight: f32,
    ) -> Result<SampleOutcome, BackendError> {
        let Some(mut interp) = self.interpolation.take() else {
            self.accumulate(sink_id, source, weight)?;
            return Ok(SampleOutcome {
                real: 1,
                synthetic: 0,
            });
        };
        // Taken out so the borrow checker permits `&self` dispatch calls below; put
        // back on every exit path, including the error one.
        let result = self.accumulate_interpolated(sink_id, source, weight, &mut interp);
        self.interpolation = Some(interp);
        result
    }

    fn note_rejected_frame(&mut self) {
        // A duplicate carries no new motion: the retained frame already holds exactly
        // this content, so there is nothing between them to interpolate and nothing to
        // update. Leaving `prev` alone also means the NEXT genuine frame interpolates
        // across the whole stalled gap rather than across a zero-motion pair.
    }

    fn resolve(
        &mut self,
        sink_id: &str,
        params: &ResolveParams,
    ) -> Result<ResolvedImage, BackendError> {
        let srv = {
            let sink = self
                .sinks
                .get(sink_id)
                .ok_or_else(|| BackendError(format!("unknown sink '{sink_id}'")))?;
            sink.srv.clone()
        };

        let out_pixels = params.out_width as u64 * params.out_height as u64;
        let out_bytes = out_pixels
            .checked_mul(8)
            .ok_or_else(|| BackendError("resolve output size overflow".into()))?;
        if out_bytes > u32::MAX as u64 {
            return Err(BackendError("resolve output exceeds buffer limit".into()));
        }

        let output = create_uav_buffer(&self.device, out_bytes as u32, 8, false)?;
        let output_uav = create_structured_uav(&self.device, &output, out_pixels as u32)?;
        let staging = create_staging_buffer(&self.device, out_bytes as u32)?;

        self.write_resolve_cb(params)?;

        unsafe {
            self.context.CSSetShader(&self.cs_resolve, None);
            // ResolveParams is register(b1).
            self.context
                .CSSetConstantBuffers(1, Some(&[Some(self.cb_resolve.clone())]));
            // gAccumRead is register(t1).
            self.context.CSSetShaderResources(1, Some(&[Some(srv)]));
            // gOutput is register(u2).
            self.context.CSSetUnorderedAccessViews(
                2,
                1,
                Some([Some(output_uav)].as_ptr()),
                None,
            );
            self.context.Dispatch(
                div_ceil(params.out_width, TILE),
                div_ceil(params.out_height, TILE),
                1,
            );
            self.context.CopyResource(&staging, &output);
        }
        self.unbind();

        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        let data = unsafe {
            self.context
                .Map(&staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped))?;
            let slice =
                std::slice::from_raw_parts(mapped.pData as *const u8, out_bytes as usize);
            let copied = slice.to_vec();
            self.context.Unmap(&staging, 0);
            copied
        };

        Ok(ResolvedImage {
            data,
            width: params.out_width,
            height: params.out_height,
        })
    }
}

// --- resource helpers ------------------------------------------------------

fn create_constant_buffer(
    device: &ID3D11Device,
    size: usize,
) -> Result<ID3D11Buffer, BackendError> {
    // Constant buffers must be a multiple of 16 bytes.
    let byte_width = ((size + 15) / 16 * 16) as u32;
    let desc = D3D11_BUFFER_DESC {
        ByteWidth: byte_width,
        Usage: D3D11_USAGE_DYNAMIC,
        BindFlags: D3D11_BIND_CONSTANT_BUFFER.0 as u32,
        CPUAccessFlags: D3D11_CPU_ACCESS_WRITE.0 as u32,
        MiscFlags: 0,
        StructureByteStride: 0,
    };
    let mut buffer: Option<ID3D11Buffer> = None;
    unsafe { device.CreateBuffer(&desc, None, Some(&mut buffer))? };
    buffer.ok_or_else(|| BackendError("CreateBuffer(constant) returned null".into()))
}

fn write_constant_buffer<T: Copy>(
    context: &ID3D11DeviceContext,
    buffer: &ID3D11Buffer,
    data: &T,
) -> Result<(), BackendError> {
    let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
    unsafe {
        context.Map(buffer, 0, D3D11_MAP_WRITE_DISCARD, 0, Some(&mut mapped))?;
        std::ptr::copy_nonoverlapping(
            data as *const T as *const u8,
            mapped.pData as *mut u8,
            std::mem::size_of::<T>(),
        );
        context.Unmap(buffer, 0);
    }
    Ok(())
}

/// A GPU-resident buffer usable as a UAV (and, for structured buffers, an SRV).
fn create_uav_buffer(
    device: &ID3D11Device,
    byte_width: u32,
    stride: u32,
    raw: bool,
) -> Result<ID3D11Buffer, BackendError> {
    let desc = D3D11_BUFFER_DESC {
        ByteWidth: byte_width,
        Usage: D3D11_USAGE_DEFAULT,
        BindFlags: (D3D11_BIND_UNORDERED_ACCESS.0 | D3D11_BIND_SHADER_RESOURCE.0) as u32,
        CPUAccessFlags: 0,
        MiscFlags: if raw {
            // D3D11_RESOURCE_MISC_BUFFER_ALLOW_RAW_VIEWS
            0x20
        } else {
            D3D11_RESOURCE_MISC_BUFFER_STRUCTURED.0 as u32
        },
        StructureByteStride: if raw { 0 } else { stride },
    };
    let mut buffer: Option<ID3D11Buffer> = None;
    unsafe { device.CreateBuffer(&desc, None, Some(&mut buffer))? };
    buffer.ok_or_else(|| BackendError("CreateBuffer(uav) returned null".into()))
}

fn create_immutable_buffer(
    device: &ID3D11Device,
    bytes: &[u8],
) -> Result<ID3D11Buffer, BackendError> {
    let desc = D3D11_BUFFER_DESC {
        ByteWidth: bytes.len() as u32,
        Usage: D3D11_USAGE_DEFAULT,
        BindFlags: 0,
        CPUAccessFlags: 0,
        MiscFlags: 0,
        StructureByteStride: 0,
    };
    let init = D3D11_SUBRESOURCE_DATA {
        pSysMem: bytes.as_ptr() as *const std::ffi::c_void,
        SysMemPitch: 0,
        SysMemSlicePitch: 0,
    };
    let mut buffer: Option<ID3D11Buffer> = None;
    unsafe { device.CreateBuffer(&desc, Some(&init), Some(&mut buffer))? };
    buffer.ok_or_else(|| BackendError("CreateBuffer(immutable) returned null".into()))
}

fn create_staging_buffer(
    device: &ID3D11Device,
    byte_width: u32,
) -> Result<ID3D11Buffer, BackendError> {
    let desc = D3D11_BUFFER_DESC {
        ByteWidth: byte_width,
        Usage: D3D11_USAGE_STAGING,
        BindFlags: 0,
        CPUAccessFlags: D3D11_CPU_ACCESS_READ.0 as u32,
        MiscFlags: 0,
        StructureByteStride: 0,
    };
    let mut buffer: Option<ID3D11Buffer> = None;
    unsafe { device.CreateBuffer(&desc, None, Some(&mut buffer))? };
    buffer.ok_or_else(|| BackendError("CreateBuffer(staging) returned null".into()))
}

fn create_structured_uav(
    device: &ID3D11Device,
    buffer: &ID3D11Buffer,
    elements: u32,
) -> Result<ID3D11UnorderedAccessView, BackendError> {
    let desc = D3D11_UNORDERED_ACCESS_VIEW_DESC {
        Format: DXGI_FORMAT_UNKNOWN,
        ViewDimension: D3D11_UAV_DIMENSION_BUFFER,
        Anonymous: D3D11_UNORDERED_ACCESS_VIEW_DESC_0 {
            Buffer: D3D11_BUFFER_UAV {
                FirstElement: 0,
                NumElements: elements,
                Flags: 0,
            },
        },
    };
    let mut uav: Option<ID3D11UnorderedAccessView> = None;
    unsafe { device.CreateUnorderedAccessView(buffer, Some(&desc), Some(&mut uav))? };
    uav.ok_or_else(|| BackendError("CreateUnorderedAccessView returned null".into()))
}

fn create_raw_uav(
    device: &ID3D11Device,
    buffer: &ID3D11Buffer,
    dword_count: u32,
) -> Result<ID3D11UnorderedAccessView, BackendError> {
    use windows::Win32::Graphics::Dxgi::Common::DXGI_FORMAT_R32_TYPELESS;
    let desc = D3D11_UNORDERED_ACCESS_VIEW_DESC {
        Format: DXGI_FORMAT_R32_TYPELESS,
        ViewDimension: D3D11_UAV_DIMENSION_BUFFER,
        Anonymous: D3D11_UNORDERED_ACCESS_VIEW_DESC_0 {
            Buffer: D3D11_BUFFER_UAV {
                FirstElement: 0,
                NumElements: dword_count,
                Flags: D3D11_BUFFER_UAV_FLAG_RAW.0 as u32,
            },
        },
    };
    let mut uav: Option<ID3D11UnorderedAccessView> = None;
    unsafe { device.CreateUnorderedAccessView(buffer, Some(&desc), Some(&mut uav))? };
    uav.ok_or_else(|| BackendError("CreateUnorderedAccessView(raw) returned null".into()))
}

/// A plain 2D texture descriptor: one mip, one slice, GPU-resident.
fn texture_desc(
    width: u32,
    height: u32,
    format: DXGI_FORMAT,
    bind_flags: u32,
) -> D3D11_TEXTURE2D_DESC {
    D3D11_TEXTURE2D_DESC {
        Width: width,
        Height: height,
        MipLevels: 1,
        ArraySize: 1,
        Format: format,
        SampleDesc: DXGI_SAMPLE_DESC {
            Count: 1,
            Quality: 0,
        },
        Usage: D3D11_USAGE_DEFAULT,
        BindFlags: bind_flags,
        CPUAccessFlags: 0,
        MiscFlags: 0,
    }
}

fn create_texture(
    device: &ID3D11Device,
    desc: &D3D11_TEXTURE2D_DESC,
) -> Result<ID3D11Texture2D, BackendError> {
    let mut texture: Option<ID3D11Texture2D> = None;
    unsafe { device.CreateTexture2D(desc, None, Some(&mut texture))? };
    texture.ok_or_else(|| BackendError("CreateTexture2D returned null".into()))
}

fn create_texture_srv(
    device: &ID3D11Device,
    texture: &ID3D11Texture2D,
    format: DXGI_FORMAT,
) -> Result<ID3D11ShaderResourceView, BackendError> {
    let desc = D3D11_SHADER_RESOURCE_VIEW_DESC {
        Format: format,
        ViewDimension: D3D_SRV_DIMENSION_TEXTURE2D,
        Anonymous: D3D11_SHADER_RESOURCE_VIEW_DESC_0 {
            Texture2D: D3D11_TEX2D_SRV {
                MostDetailedMip: 0,
                MipLevels: 1,
            },
        },
    };
    let mut srv: Option<ID3D11ShaderResourceView> = None;
    unsafe { device.CreateShaderResourceView(texture, Some(&desc), Some(&mut srv))? };
    srv.ok_or_else(|| BackendError("CreateShaderResourceView(texture) returned null".into()))
}

fn create_texture_uav(
    device: &ID3D11Device,
    texture: &ID3D11Texture2D,
    format: DXGI_FORMAT,
) -> Result<ID3D11UnorderedAccessView, BackendError> {
    let desc = D3D11_UNORDERED_ACCESS_VIEW_DESC {
        Format: format,
        ViewDimension: D3D11_UAV_DIMENSION_TEXTURE2D,
        Anonymous: D3D11_UNORDERED_ACCESS_VIEW_DESC_0 {
            Texture2D: D3D11_TEX2D_UAV { MipSlice: 0 },
        },
    };
    let mut uav: Option<ID3D11UnorderedAccessView> = None;
    unsafe { device.CreateUnorderedAccessView(texture, Some(&desc), Some(&mut uav))? };
    uav.ok_or_else(|| BackendError("CreateUnorderedAccessView(texture) returned null".into()))
}

/// Bilinear, clamped at the edges — so a warp that reaches off-frame reads the edge
/// pixel rather than wrapping to the opposite side of the image.
fn create_linear_clamp_sampler(device: &ID3D11Device) -> Result<ID3D11SamplerState, BackendError> {
    let desc = D3D11_SAMPLER_DESC {
        Filter: D3D11_FILTER_MIN_MAG_MIP_LINEAR,
        AddressU: D3D11_TEXTURE_ADDRESS_CLAMP,
        AddressV: D3D11_TEXTURE_ADDRESS_CLAMP,
        AddressW: D3D11_TEXTURE_ADDRESS_CLAMP,
        MipLODBias: 0.0,
        MaxAnisotropy: 1,
        ComparisonFunc: D3D11_COMPARISON_NEVER,
        BorderColor: [0.0; 4],
        MinLOD: 0.0,
        MaxLOD: f32::MAX,
    };
    let mut sampler: Option<ID3D11SamplerState> = None;
    unsafe { device.CreateSamplerState(&desc, Some(&mut sampler))? };
    sampler.ok_or_else(|| BackendError("CreateSamplerState returned null".into()))
}

fn create_structured_srv(
    device: &ID3D11Device,
    buffer: &ID3D11Buffer,
    elements: u32,
) -> Result<ID3D11ShaderResourceView, BackendError> {
    let desc = D3D11_SHADER_RESOURCE_VIEW_DESC {
        Format: DXGI_FORMAT_UNKNOWN,
        ViewDimension: D3D_SRV_DIMENSION_BUFFEREX,
        Anonymous: D3D11_SHADER_RESOURCE_VIEW_DESC_0 {
            BufferEx: D3D11_BUFFEREX_SRV {
                FirstElement: 0,
                NumElements: elements,
                Flags: 0,
            },
        },
    };
    let mut srv: Option<ID3D11ShaderResourceView> = None;
    unsafe { device.CreateShaderResourceView(buffer, Some(&desc), Some(&mut srv))? };
    srv.ok_or_else(|| BackendError("CreateShaderResourceView(structured) returned null".into()))
}

/// Which physical adapter a D3D11 device actually landed on.
///
/// This matters more than it looks. `windows-capture` creates its device with a
/// NULL adapter, i.e. whatever DXGI considers default — and on a hybrid machine
/// (an AMD or Intel iGPU alongside a discrete NVIDIA card) that is NOT necessarily
/// the card iRacing renders on. Two consequences:
///   * our accumulate/resolve compute would run on the weaker GPU, and
///   * NVIDIA's optical-flow hardware cannot bind to a non-NVIDIA device at all,
///     so any future frame-interpolation path is dead before it starts.
/// Reporting it is the difference between diagnosing that in seconds and chasing
/// it for an afternoon.
pub struct AdapterInfo {
    pub description: String,
    pub vendor_id: u32,
    pub dedicated_video_memory: u64,
}

pub fn describe_device_adapter(device: &ID3D11Device) -> Result<AdapterInfo, BackendError> {
    use windows::Win32::Graphics::Dxgi::{IDXGIAdapter, IDXGIDevice};
    // SAFETY: every D3D11 device implements IDXGIDevice; the QI is checked.
    let dxgi_device: IDXGIDevice = device.cast()?;
    let adapter: IDXGIAdapter = unsafe { dxgi_device.GetAdapter()? };
    let desc = unsafe { adapter.GetDesc()? };

    let end = desc
        .Description
        .iter()
        .position(|&c| c == 0)
        .unwrap_or(desc.Description.len());
    Ok(AdapterInfo {
        description: String::from_utf16_lossy(&desc.Description[..end]),
        vendor_id: desc.VendorId,
        dedicated_video_memory: desc.DedicatedVideoMemory as u64,
    })
}

/// Cheap, side-effect-free capability probe: compile every kernel and throw the
/// bytecode away. Needs no device and does no GPU work, so it proves that
/// d3dcompiler is present and the shaders are valid on this machine BEFORE the user
/// commits to a sixteen-second capture. An unsupported environment therefore
/// produces a clear up-front message instead of failing halfway through a shot.
///
/// The two interpolation kernels are included deliberately: they must compile
/// everywhere even though they only ever DISPATCH on NVIDIA Turing-and-newer, so a
/// break in them is caught on any machine rather than only on the ones that run them.
pub fn probe_shaders() -> Result<(), BackendError> {
    for entry in [
        "CSClear",
        "CSAccumulate",
        "CSDigest",
        "CSResolve",
        "CSLuma",
        "CSWarpAccumulate",
    ] {
        compile(entry)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The shader divides raw flow vectors by a hard-coded constant and the Rust side
    /// documents the same one. If they ever drift, every warp silently moves by the
    /// wrong distance and the output just looks slightly wrong — the worst kind of
    /// bug. Pin them together.
    #[test]
    fn shader_flow_scale_matches_the_rust_constant() {
        let expected = format!(
            "#define FLOW_FIXED_POINT_SCALE {:.1}f",
            super::super::nvof::FLOW_FIXED_POINT_SCALE
        );
        assert!(
            SHADER_SOURCE.contains(&expected),
            "shaders.hlsl must define FLOW_FIXED_POINT_SCALE as {} (S10.5, from \
             NV_OF_FLOW_VECTOR); looked for {expected:?}",
            super::super::nvof::FLOW_FIXED_POINT_SCALE
        );
    }

    /// The interpolation kernels have to exist under exactly these names or the
    /// probe's `compile()` calls fail at runtime on every machine.
    #[test]
    fn shader_source_defines_every_entry_point() {
        for entry in [
            "CSClear",
            "CSAccumulate",
            "CSDigest",
            "CSResolve",
            "CSLuma",
            "CSWarpAccumulate",
        ] {
            assert!(
                SHADER_SOURCE.contains(&format!("void {entry}(")),
                "shaders.hlsl is missing entry point {entry}"
            );
        }
    }

    /// A Rust mirror of `expand_highlights` from shaders.hlsl, so the curve's
    /// properties can be asserted without a GPU. Kept deliberately literal.
    fn expand_highlights(rgb: [f32; 3], gain: f32) -> [f32; 3] {
        const KNEE: f32 = 0.75;
        const POWER: f32 = 2.0;
        if gain <= 1.0 {
            return rgb;
        }
        let peak = rgb[0].max(rgb[1]).max(rgb[2]);
        if peak <= KNEE {
            return rgb;
        }
        let t = ((peak - KNEE) / (1.0 - KNEE)).clamp(0.0, 1.0);
        let scale = 1.0 + (gain - 1.0) * t.powf(POWER);
        [rgb[0] * scale, rgb[1] * scale, rgb[2] * scale]
    }

    /// The property the whole feature rests on: OFF must be exactly identity, because
    /// a one-sample box exposure with recovery off is bit-for-bit the existing still
    /// capture and that equivalence is verified on hardware.
    #[test]
    fn highlight_recovery_off_is_exactly_identity() {
        for gain in [0.0f32, 1.0] {
            for value in [0.0f32, 0.5, 0.74, 0.75, 0.9, 1.0] {
                let rgb = [value, value * 0.5, value * 0.25];
                assert_eq!(expand_highlights(rgb, gain), rgb, "value {value}");
            }
        }
        // exp2(0) is exactly 1.0, so "0 stops" reaches the identity branch.
        assert_eq!(0.0f32.exp2(), 1.0);
    }

    #[test]
    fn highlight_recovery_leaves_midtones_and_shadows_untouched() {
        let gain = 32.0;
        for value in [0.0f32, 0.1, 0.4, 0.6, 0.75] {
            let rgb = [value, value, value];
            assert_eq!(
                expand_highlights(rgb, gain),
                rgb,
                "below the knee, {value} must pass through"
            );
        }
    }

    /// Continuity at the knee. A jump here would show up as a hard edge ringing
    /// around every highlight — far more obviously wrong than the problem it fixes.
    #[test]
    fn highlight_recovery_is_continuous_at_the_knee() {
        let gain = 64.0;
        let below = expand_highlights([0.7499, 0.7499, 0.7499], gain)[0];
        let above = expand_highlights([0.7501, 0.7501, 0.7501], gain)[0];
        assert!(
            (above - below).abs() < 1e-3,
            "discontinuity at the knee: {below} -> {above}"
        );
    }

    #[test]
    fn highlight_recovery_reaches_the_requested_gain_at_full_clip() {
        for stops in [1.0f32, 3.0, 5.0] {
            let gain = stops.exp2();
            let out = expand_highlights([1.0, 1.0, 1.0], gain);
            assert!((out[0] - gain).abs() < 1e-3, "{stops} stops -> {}", out[0]);
        }
    }

    /// Driven by the MAX channel, not luma. A saturated red tail light has clipped
    /// even though its luma is low, and a luma-driven test would miss it entirely.
    #[test]
    fn highlight_recovery_detects_a_clipped_single_channel() {
        let gain = 32.0;
        let red = [1.0f32, 0.2, 0.2];
        let out = expand_highlights(red, gain);
        assert!(out[0] > 1.0, "a clipped red channel must be expanded");
        // Scalar gain, so the ratios — and therefore the hue — survive.
        assert!((out[1] / out[0] - red[1] / red[0]).abs() < 1e-5);
        assert!((out[2] / out[0] - red[2] / red[0]).abs() < 1e-5);
    }

    /// The behaviour that makes this worth doing at all: over an exposure, a
    /// TRANSIENT highlight gains enormously while a PERSISTENT bright surface gains
    /// the same factor uniformly — so the tonemapper puts the surface back where it
    /// was, and only the moving light actually brightens.
    #[test]
    fn highlight_recovery_lifts_transient_highlights_relative_to_persistent_ones() {
        let gain = 32.0f32;
        let samples = 100;

        // A headlight passing through one pixel for 1% of the exposure.
        let transient: f32 = (0..samples)
            .map(|i| {
                let v = if i == 0 { 1.0 } else { 0.05 };
                expand_highlights([v, v, v], gain)[0]
            })
            .sum::<f32>()
            / samples as f32;

        // The same pixel with a static white wall in it for the whole exposure.
        let persistent: f32 = (0..samples)
            .map(|_| expand_highlights([1.0, 1.0, 1.0], gain)[0])
            .sum::<f32>()
            / samples as f32;

        // Without recovery the headlight would average (1.0 + 99*0.05)/100 = 0.0595
        // — a dim grey smudge, which is exactly the reported defect.
        let unrecovered: f32 = (0..samples)
            .map(|i| if i == 0 { 1.0f32 } else { 0.05 })
            .sum::<f32>()
            / samples as f32;

        assert!(
            transient > unrecovered * 5.0,
            "recovery must substantially brighten a transient highlight: \
             {unrecovered} -> {transient}"
        );
        // The wall lands at the full gain, which ACES compresses back to white; the
        // headlight lands well below it. The gap is what keeps the sky from blowing
        // out while the streak still gains.
        assert!(persistent > transient);
        assert!((persistent - gain).abs() < 1e-3);
    }

    /// HLSL packs `cbuffer WarpParams` into three 16-byte registers. The Rust mirror
    /// must agree exactly or every warp reads garbage parameters.
    #[test]
    fn warp_constant_buffer_matches_the_hlsl_packing() {
        assert_eq!(std::mem::size_of::<WarpCb>(), 48);

        let cb = WarpCb {
            warp_size: [0; 2],
            flow_size: [0; 2],
            t: 0.0,
            weight: 0.0,
            flow_grid: 0,
            has_bwd: 0,
            consistency_px: 0.0,
            highlight_gain: 1.0,
            _pad: [0.0; 2],
        };
        let base = &cb as *const _ as usize;
        let offset = |f: *const _| f as usize - base;

        // Register 0: uint2 gWarpSize, uint2 gFlowSize.
        assert_eq!(offset(&cb.warp_size as *const _ as *const u8), 0);
        assert_eq!(offset(&cb.flow_size as *const _ as *const u8), 8);
        // Register 1: float gT, float gWarpWeight, uint gFlowGrid, uint gHasBwd.
        assert_eq!(offset(&cb.t as *const _ as *const u8), 16);
        assert_eq!(offset(&cb.weight as *const _ as *const u8), 20);
        assert_eq!(offset(&cb.flow_grid as *const _ as *const u8), 24);
        assert_eq!(offset(&cb.has_bwd as *const _ as *const u8), 28);
        // Register 2: float gConsistencyPx, float gWarpHighlightGain, float2 gPadW.
        assert_eq!(offset(&cb.consistency_px as *const _ as *const u8), 32);
        assert_eq!(offset(&cb.highlight_gain as *const _ as *const u8), 36);
    }

    /// `cbuffer AccumulateParams` is one 16-byte register: uint2 + float + float.
    #[test]
    fn accumulate_constant_buffer_matches_the_hlsl_packing() {
        assert_eq!(std::mem::size_of::<AccumulateCb>(), 16);
        let cb = AccumulateCb {
            size: [0; 2],
            weight: 0.0,
            highlight_gain: 1.0,
        };
        let base = &cb as *const _ as usize;
        assert_eq!(&cb.size as *const _ as usize - base, 0);
        assert_eq!(&cb.weight as *const _ as usize - base, 8);
        assert_eq!(&cb.highlight_gain as *const _ as usize - base, 12);
    }

    /// Synthetic sample positions must be strictly inside (0, 1) — a sample AT 0 or 1
    /// would duplicate a real frame and double-count it in the exposure.
    #[test]
    fn synthetic_sample_positions_lie_strictly_between_the_real_frames() {
        for factor in [2u32, 4, 8] {
            let positions: Vec<f32> = (1..factor).map(|k| k as f32 / factor as f32).collect();
            assert_eq!(positions.len() as u32, factor - 1);
            for t in &positions {
                assert!(*t > 0.0 && *t < 1.0, "t={t} for factor {factor}");
            }
            // Evenly spaced, so the synthesised samples land where the sim would have
            // rendered them had it presented factor times as often.
            for pair in positions.windows(2) {
                assert!((pair[1] - pair[0] - 1.0 / factor as f32).abs() < 1e-6);
            }
        }
    }

    /// The weight of a synthetic sample is the weighting curve evaluated at its
    /// position, which — because the curve is parameterised by POSITION and not by
    /// sample index — is exactly the lerp between the neighbouring real weights.
    #[test]
    fn synthetic_weights_interpolate_between_the_real_samples() {
        let (prev, cur) = (0.25f32, 0.75f32);
        let lerp = |t: f32| prev + (cur - prev) * t;

        assert!((lerp(0.5) - 0.5).abs() < 1e-6);
        assert!((lerp(0.25) - 0.375).abs() < 1e-6);
        // Monotone between the endpoints, so a taper cannot gain a local bump.
        let mut last = prev;
        for k in 1..8 {
            let w = lerp(k as f32 / 8.0);
            assert!(w > last, "weights must increase with t");
            assert!(w > prev && w < cur);
            last = w;
        }
    }
}
