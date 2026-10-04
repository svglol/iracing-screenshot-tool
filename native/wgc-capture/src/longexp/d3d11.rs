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
    ID3D11Buffer, ID3D11ComputeShader, ID3D11Device, ID3D11DeviceContext, ID3D11Query,
    ID3D11ShaderResourceView, ID3D11Texture2D, ID3D11UnorderedAccessView,
    D3D11_BIND_CONSTANT_BUFFER, D3D11_BIND_SHADER_RESOURCE, D3D11_BIND_UNORDERED_ACCESS,
    D3D11_BUFFEREX_SRV, D3D11_BUFFER_DESC, D3D11_BUFFER_UAV, D3D11_BUFFER_UAV_FLAG_RAW,
    D3D11_CPU_ACCESS_READ, D3D11_CPU_ACCESS_WRITE, D3D11_MAPPED_SUBRESOURCE,
    D3D11_MAP_FLAG_DO_NOT_WAIT, D3D11_MAP_READ, D3D11_MAP_WRITE_DISCARD, D3D11_QUERY_DESC,
    D3D11_QUERY_EVENT, D3D11_RESOURCE_MISC_BUFFER_STRUCTURED, D3D11_SHADER_RESOURCE_VIEW_DESC,
    D3D11_SHADER_RESOURCE_VIEW_DESC_0, D3D11_SUBRESOURCE_DATA, D3D11_TEX2D_SRV,
    D3D11_TEXTURE2D_DESC, D3D11_UAV_DIMENSION_BUFFER, D3D11_UNORDERED_ACCESS_VIEW_DESC,
    D3D11_UNORDERED_ACCESS_VIEW_DESC_0, D3D11_USAGE_DEFAULT, D3D11_USAGE_DYNAMIC,
    D3D11_USAGE_STAGING,
};
use windows::Win32::Graphics::Dxgi::Common::{DXGI_FORMAT, DXGI_FORMAT_UNKNOWN, DXGI_SAMPLE_DESC};

use super::backend::{AccumulateBackend, BackendError, ResolveParams, ResolvedImage};

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

pub struct D3d11Backend {
    device: ID3D11Device,
    context: ID3D11DeviceContext,

    cs_clear: ID3D11ComputeShader,
    cs_accumulate: ID3D11ComputeShader,
    cs_digest: ID3D11ComputeShader,
    cs_resolve: ID3D11ComputeShader,

    cb_accumulate: ID3D11Buffer,
    cb_resolve: ID3D11Buffer,

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

    /// Our private copy of the frame currently being consumed, and the query used to
    /// prove the copy has actually run. See `retain_frame` on the trait for why this
    /// exists at all — without it every pass here races the WGC frame pool.
    frame_copy: Option<RetainedFrame>,
    sync_query: ID3D11Query,
}

/// A backend-owned copy of one captured frame, plus the view every pass reads it
/// through.
///
/// The SRV is created ONCE and reused for the life of the copy, which is also why
/// this pays for itself: the digest and the accumulate each used to build a fresh
/// `CreateShaderResourceView` over WGC's texture every frame, and both now share this
/// one. The added `CopyResource` is therefore not purely additive cost.
struct RetainedFrame {
    texture: ID3D11Texture2D,
    srv: ID3D11ShaderResourceView,
    width: u32,
    height: u32,
    format: DXGI_FORMAT,
}

/// How long a single frame copy may take before we give up on it.
///
/// Generous — a full-resolution blit is sub-millisecond even at 8K — because the only
/// thing this guards against is a wedged or removed device, where failing the frame
/// beats hanging the capture thread. A frame we could not safely read is a frame we
/// must not accumulate, so exceeding this is an error rather than a "carry on".
const FRAME_COPY_TIMEOUT_MS: u128 = 100;

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
    /// The gain the accumulate pass expanded with, so resolve can invert it exactly.
    /// Must equal `AccumulateCb::highlight_gain` — both are written from the single
    /// `highlight_gain` field on the backend for that reason.
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
    pub fn new(device: ID3D11Device, context: ID3D11DeviceContext) -> Result<Self, BackendError> {
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
            shader
                .ok_or_else(|| BackendError(format!("CreateComputeShader({entry}) returned null")))
        };

        let cs_clear = make_shader("CSClear")?;
        let cs_accumulate = make_shader("CSAccumulate")?;
        let cs_digest = make_shader("CSDigest")?;
        let cs_resolve = make_shader("CSResolve")?;

        let cb_accumulate = create_constant_buffer(&device, std::mem::size_of::<AccumulateCb>())?;
        let cb_resolve = create_constant_buffer(&device, std::mem::size_of::<ResolveCb>())?;

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

        // An EVENT query is the only fence D3D11 offers: signalled once the GPU has
        // passed the point in the command stream where it was ended.
        let sync_query = {
            let desc = D3D11_QUERY_DESC {
                Query: D3D11_QUERY_EVENT,
                MiscFlags: 0,
            };
            let mut query: Option<ID3D11Query> = None;
            unsafe { device.CreateQuery(&desc, Some(&mut query))? };
            query.ok_or_else(|| BackendError("CreateQuery(event) returned null".into()))?
        };

        Ok(Self {
            device,
            context,
            cs_clear,
            cs_accumulate,
            cs_digest,
            cs_resolve,
            cb_accumulate,
            cb_resolve,
            highlight_gain: 1.0,
            digest_buffer,
            digest_uav,
            digest_staging,
            digest_submitted: 0,
            digest_collected: 0,
            digest_zero,
            sinks: HashMap::new(),
            scratch_source: None,
            frame_copy: None,
            sync_query,
        })
    }

    /// Make sure the private frame copy matches what WGC is delivering.
    ///
    /// Reallocated only when the geometry or the format actually changes, which for a
    /// long exposure means once — the window is fixed for the shot.
    fn ensure_frame_copy(&mut self, desc: &D3D11_TEXTURE2D_DESC) -> Result<(), BackendError> {
        if let Some(existing) = self.frame_copy.as_ref() {
            if existing.width == desc.Width
                && existing.height == desc.Height
                && existing.format == desc.Format
            {
                return Ok(());
            }
        }

        // SHADER_RESOURCE is all we need to read it.
        let copy_desc = texture_desc(
            desc.Width,
            desc.Height,
            desc.Format,
            D3D11_BIND_SHADER_RESOURCE.0 as u32,
        );
        let texture = create_texture(&self.device, &copy_desc)?;
        let srv = create_texture_srv(&self.device, &texture, desc.Format)?;
        self.frame_copy = Some(RetainedFrame {
            texture,
            srv,
            width: desc.Width,
            height: desc.Height,
            format: desc.Format,
        });
        Ok(())
    }

    /// Block until the GPU has passed the last `End(sync_query)`.
    ///
    /// `Flush` first, deliberately: spinning on `GetData` for a query sitting in an
    /// unsubmitted command buffer is the documented way to hang forever. The BOOL is
    /// what carries the answer rather than the HRESULT, because `S_FALSE` ("not ready")
    /// is a SUCCESS code and so arrives here as `Ok(())` — reading readiness off the
    /// `Result` would silently never wait at all.
    fn wait_for_gpu(&self) -> Result<(), BackendError> {
        unsafe { self.context.Flush() };
        let started = std::time::Instant::now();
        loop {
            let mut done: i32 = 0;
            unsafe {
                self.context.GetData(
                    &self.sync_query,
                    Some(&mut done as *mut i32 as *mut std::ffi::c_void),
                    std::mem::size_of::<i32>() as u32,
                    0,
                )
            }
            .map_err(|e| BackendError(format!("frame copy fence failed: {e}")))?;
            if done != 0 {
                return Ok(());
            }
            if started.elapsed().as_millis() > FRAME_COPY_TIMEOUT_MS {
                return Err(BackendError(
                    "the GPU did not finish copying the captured frame in time".into(),
                ));
            }
            // Yield rather than spin hot: this thread has nothing else to do and the
            // capture's own message loop is not on it.
            std::thread::yield_now();
        }
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

    /// The accumulate dispatch itself, against an SRV the caller already built.
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
            self.context
                .CSSetShaderResources(0, Some(&[Some(srv.clone())]));
            self.context
                .CSSetUnorderedAccessViews(0, 1, Some([Some(uav.clone())].as_ptr()), None);
            self.context
                .Dispatch(div_ceil(width, TILE), div_ceil(height, TILE), 1);
        }
        self.unbind();
        Ok(())
    }

    fn write_accumulate_cb(
        &self,
        width: u32,
        height: u32,
        weight: f32,
    ) -> Result<(), BackendError> {
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
            // Read from the backend, NOT from ResolveParams. `set_highlight_recovery`
            // is the one place the gain is decided, and resolve runs on the same
            // backend instance that did every accumulate, so there is no second copy
            // to keep in sync and no way for the two passes to disagree.
            highlight_gain: self.highlight_gain,
            _pad: [0.0; 2],
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
        // The common case since `retain_frame` landed: every pass is handed our own
        // copy, whose view was built once. Identity is by COM pointer because that is
        // what "this is the texture I own" actually means — two textures can share a
        // descriptor and still be different resources.
        if let Some(retained) = self.frame_copy.as_ref() {
            if retained.texture.as_raw() == source.as_raw() {
                return Ok(retained.srv.clone());
            }
        }

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

    fn retain_frame(&mut self, source: &ID3D11Texture2D) -> Result<ID3D11Texture2D, BackendError> {
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { source.GetDesc(&mut desc) };
        self.ensure_frame_copy(&desc)?;

        let texture = self
            .frame_copy
            .as_ref()
            .ok_or_else(|| BackendError("retained frame missing".into()))?
            .texture
            .clone();

        // SAFETY: same dimensions and format by construction (`ensure_frame_copy` is
        // driven off this very descriptor), which is exactly what `CopyResource`
        // requires.
        unsafe {
            self.context.CopyResource(&texture, source);
            self.context.End(&self.sync_query);
        }
        // The stall that makes the whole path correct. It drains our own queue too, so
        // the previous frame's accumulate has landed by the time this returns — which
        // is the real cost, and it is bounded by one frame of GPU work rather than by
        // a staging-buffer round trip the way the old blocking digest readback was.
        self.wait_for_gpu()?;
        Ok(texture)
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
            self.context
                .CopyResource(&self.digest_buffer, &self.digest_zero);

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
            self.context
                .CSSetUnorderedAccessViews(2, 1, Some([Some(output_uav)].as_ptr()), None);
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
            let slice = std::slice::from_raw_parts(mapped.pData as *const u8, out_bytes as usize);
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
///   * vendor-specific hardware paths cannot bind to a device on the wrong vendor.
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
pub fn probe_shaders() -> Result<(), BackendError> {
    for entry in ["CSClear", "CSAccumulate", "CSDigest", "CSResolve"] {
        compile(entry)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Actually compile every kernel, not merely look for its name.
    ///
    /// This is the same work `probe_shaders()` does at runtime and it needs no device
    /// and no GPU — `D3DCompile` lives in d3dcompiler_47.dll, a Windows system
    /// component since 8.1, and this crate is Windows-only. So an HLSL error is caught
    /// by `cargo test` rather than by a user halfway through a sixteen-second capture.
    #[test]
    fn every_kernel_compiles() {
        if let Err(error) = probe_shaders() {
            panic!("shaders.hlsl does not compile: {}", error.0);
        }
    }

    /// The kernels have to exist under exactly these names or the
    /// probe's `compile()` calls fail at runtime on every machine.
    #[test]
    fn shader_source_defines_every_entry_point() {
        for entry in ["CSClear", "CSAccumulate", "CSDigest", "CSResolve"] {
            assert!(
                SHADER_SOURCE.contains(&format!("void {entry}(")),
                "shaders.hlsl is missing entry point {entry}"
            );
        }
    }

    const KNEE: f32 = 0.75;
    const POWER: f32 = 2.0;
    const SOLVE_STEPS: usize = 20;

    /// A Rust mirror of `highlight_scale` from shaders.hlsl.
    fn highlight_scale(peak: f32, gain: f32) -> f32 {
        let t = ((peak - KNEE) / (1.0 - KNEE)).clamp(0.0, 1.0);
        1.0 + (gain - 1.0) * t.powf(POWER)
    }

    /// A Rust mirror of `expand_highlights` from shaders.hlsl, so the curve's
    /// properties can be asserted without a GPU. Kept deliberately literal.
    fn expand_highlights(rgb: [f32; 3], gain: f32) -> [f32; 3] {
        if gain <= 1.0 {
            return rgb;
        }
        let peak = rgb[0].max(rgb[1]).max(rgb[2]);
        if peak <= KNEE {
            return rgb;
        }
        let scale = highlight_scale(peak, gain);
        [rgb[0] * scale, rgb[1] * scale, rgb[2] * scale]
    }

    /// A Rust mirror of `compress_highlights` from shaders.hlsl — the resolve-side
    /// inverse. Same bisection, same step count, so the properties asserted here are
    /// the ones the shader actually has.
    fn compress_highlights(rgb: [f32; 3], gain: f32) -> [f32; 3] {
        if gain <= 1.0 {
            return rgb;
        }
        let out_peak = rgb[0].max(rgb[1]).max(rgb[2]);
        if out_peak <= KNEE {
            return rgb;
        }
        let mut lo = KNEE;
        let mut hi = 1.0f32;
        for _ in 0..SOLVE_STEPS {
            let mid = 0.5 * (lo + hi);
            if mid * highlight_scale(mid, gain) < out_peak {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        let scale = 0.5 * (lo + hi) / out_peak;
        [rgb[0] * scale, rgb[1] * scale, rgb[2] * scale]
    }

    /// THE property the resolve-side inverse exists for: a pixel that did not change
    /// during the exposure comes back as EXACTLY itself, at every gain.
    ///
    /// This is what ACES could not do. Coupling recovery to ACES stopped the sky
    /// blowing out, but it landed the sky somewhere else than where it started and
    /// repainted the whole frame's look on the way. The regression it replaced —
    /// flat white above 0.797 linear with banding under it — is pinned separately in
    /// `a_static_surface_no_longer_clips_the_way_the_field_report_showed`.
    #[test]
    fn a_static_pixel_round_trips_through_expand_then_compress() {
        for stops in [1.0f32, 2.0, 3.0, 5.0, 8.0] {
            let gain = stops.exp2();
            for value in [0.0f32, 0.2, 0.5, 0.75, 0.8, 0.9, 0.95, 1.0] {
                let rgb = [value, value * 0.6, value * 0.3];
                // A static pixel contributes the same expanded value to every sample,
                // so the weighted mean IS that value — no averaging loop needed.
                let out = compress_highlights(expand_highlights(rgb, gain), gain);
                for c in 0..3 {
                    assert!(
                        (out[c] - rgb[c]).abs() < 1e-4,
                        "{stops} stops, value {value}, channel {c}: \
                         {} did not round-trip ({})",
                        rgb[c],
                        out[c]
                    );
                }
            }
        }
    }

    /// The field report, as an assertion. At 3 stops a static sky above 0.797 linear
    /// used to be multiplied past 1.0 and clamp flat — a white patch with a hard edge
    /// along that contour, banded below it because the transfer slope reached ~8x.
    ///
    /// The inverse has slope exactly 1 across the whole range, so the gradient
    /// survives and the ordering never collapses.
    #[test]
    fn a_static_surface_no_longer_clips_the_way_the_field_report_showed() {
        let gain = 3.0f32.exp2();
        let mut previous = -1.0f32;
        // Straight through the reported clip point at 0.797.
        for step in 0..=40 {
            let value = 0.75 + 0.25 * (step as f32 / 40.0);
            let rgb = [value, value, value];
            let out = compress_highlights(expand_highlights(rgb, gain), gain)[0];
            assert!(
                out <= 1.0 + 1e-4,
                "static {value} still lands past clip at {out}"
            );
            // Strictly increasing — a flat run here IS the banding, and a run of 1.0
            // is the hard-edged white patch.
            assert!(
                out > previous,
                "static gradient collapsed: {previous} -> {out} at {value}"
            );
            previous = out;
        }
    }

    /// The other half of the contract: undoing the expansion must NOT undo what the
    /// expansion was for. A transient highlight's mean is diluted by its duty cycle,
    /// so it sits below the knee and the compressor leaves it alone.
    #[test]
    fn compression_leaves_the_transient_highlight_it_was_meant_to_lift() {
        let gain = 32.0f32;
        let samples = 100;

        // A headlight through one pixel for 1% of the exposure, on a dim background.
        let recovered_mean: f32 = (0..samples)
            .map(|i| {
                let v = if i == 0 { 1.0 } else { 0.05 };
                expand_highlights([v, v, v], gain)[0]
            })
            .sum::<f32>()
            / samples as f32;
        let resolved = compress_highlights([recovered_mean; 3], gain)[0];

        let unrecovered: f32 = (0..samples)
            .map(|i| if i == 0 { 1.0f32 } else { 0.05 })
            .sum::<f32>()
            / samples as f32;

        assert!(
            resolved > unrecovered * 3.0,
            "the streak must survive the round trip: {unrecovered} -> {resolved}"
        );
        // And the static wall in the same frame comes back exactly where it started,
        // so the streak gained RELATIVE to it — which is the whole point.
        let wall = compress_highlights(expand_highlights([1.0; 3], gain), gain)[0];
        assert!((wall - 1.0).abs() < 1e-4, "the wall moved to {wall}");
    }

    /// OFF must be exactly identity on the way back too, or a 0-stop capture would
    /// stop being bit-for-bit the still-capture path.
    #[test]
    fn compression_off_is_exactly_identity() {
        for gain in [0.0f32, 1.0] {
            for value in [0.0f32, 0.5, 0.75, 0.9, 1.0, 8.0] {
                let rgb = [value, value * 0.5, value * 0.25];
                assert_eq!(compress_highlights(rgb, gain), rgb, "value {value}");
            }
        }
    }

    /// The bisection bracket is [knee, 1], so anything the search cannot reach lands
    /// at the top of it. Unreachable from an 8-bit source, but float slop must not
    /// produce a wrapped or negative pixel if it ever happens.
    #[test]
    fn compression_saturates_above_the_reachable_range() {
        let gain = 8.0f32;
        let out = compress_highlights([gain * 1.5, gain * 1.5, gain * 1.5], gain);
        assert!(out[0] <= 1.0 + 1e-4 && out[0] > 0.9, "{}", out[0]);
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
        // The wall lands at the full gain, which the resolve-side inverse maps back
        // to exactly white; the headlight lands well below it and passes through
        // untouched. The gap is what keeps the sky from blowing out while the streak
        // still gains.
        assert!(persistent > transient);
        assert!((persistent - gain).abs() < 1e-3);
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

    /// `cbuffer ResolveParams` is two 16-byte registers. `gResolveHighlightGain` took
    /// one of the three trailing pad floats when the inverse landed, so the size is
    /// unchanged — which is exactly the case a layout test has to catch, since a
    /// wrong offset here would silently feed the compressor someone else's number.
    #[test]
    fn resolve_constant_buffer_matches_the_hlsl_packing() {
        assert_eq!(std::mem::size_of::<ResolveCb>(), 32);
        let cb = ResolveCb {
            out_size: [0; 2],
            supersample: 1,
            tonemap: 0,
            exposure_mul: 1.0,
            highlight_gain: 1.0,
            _pad: [0.0; 2],
        };
        let base = &cb as *const _ as usize;
        // Register 0: uint2 gOutSize, uint gSupersample, uint gTonemap.
        assert_eq!(&cb.out_size as *const _ as usize - base, 0);
        assert_eq!(&cb.supersample as *const _ as usize - base, 8);
        assert_eq!(&cb.tonemap as *const _ as usize - base, 12);
        // Register 1: float gExposureMul, float gResolveHighlightGain, float2 gPadR.
        assert_eq!(&cb.exposure_mul as *const _ as usize - base, 16);
        assert_eq!(&cb.highlight_gain as *const _ as usize - base, 20);
    }
}
