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

use windows::core::PCSTR;
use windows::Win32::Graphics::Direct3D::Fxc::{D3DCompile, D3DCOMPILE_OPTIMIZATION_LEVEL3};
use windows::Win32::Graphics::Direct3D::{
    ID3DBlob, D3D_SRV_DIMENSION_BUFFEREX, D3D_SRV_DIMENSION_TEXTURE2D,
};
use windows::Win32::Graphics::Direct3D11::{
    ID3D11Buffer, ID3D11ComputeShader, ID3D11Device, ID3D11DeviceContext,
    ID3D11ShaderResourceView, ID3D11Texture2D, ID3D11UnorderedAccessView,
    D3D11_BIND_CONSTANT_BUFFER, D3D11_BIND_SHADER_RESOURCE, D3D11_BIND_UNORDERED_ACCESS,
    D3D11_BUFFER_DESC, D3D11_BUFFER_UAV, D3D11_BUFFER_UAV_FLAG_RAW, D3D11_BUFFEREX_SRV,
    D3D11_CPU_ACCESS_READ, D3D11_CPU_ACCESS_WRITE, D3D11_MAP_READ, D3D11_MAP_WRITE_DISCARD,
    D3D11_MAPPED_SUBRESOURCE, D3D11_RESOURCE_MISC_BUFFER_STRUCTURED, D3D11_SHADER_RESOURCE_VIEW_DESC,
    D3D11_SHADER_RESOURCE_VIEW_DESC_0, D3D11_SUBRESOURCE_DATA, D3D11_TEX2D_SRV,
    D3D11_TEXTURE2D_DESC, D3D11_UAV_DIMENSION_BUFFER,
    D3D11_UNORDERED_ACCESS_VIEW_DESC, D3D11_UNORDERED_ACCESS_VIEW_DESC_0, D3D11_USAGE_DEFAULT,
    D3D11_USAGE_DYNAMIC, D3D11_USAGE_STAGING,
};
use windows::Win32::Graphics::Dxgi::Common::DXGI_FORMAT_UNKNOWN;

use super::backend::{AccumulateBackend, BackendError, ResolveParams, ResolvedImage};

const SHADER_SOURCE: &str = include_str!("shaders.hlsl");

/// Must match TILE in shaders.hlsl.
const TILE: u32 = 8;
/// Must match DIGEST_STRIDE in shaders.hlsl.
const DIGEST_STRIDE: u32 = 4;

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

    // 2 x u32 digest lanes, plus a staging buffer to read them back.
    digest_buffer: ID3D11Buffer,
    digest_uav: ID3D11UnorderedAccessView,
    digest_staging: ID3D11Buffer,
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
    _pad: f32,
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

        let cb_accumulate = create_constant_buffer(&device, std::mem::size_of::<AccumulateCb>())?;
        let cb_resolve = create_constant_buffer(&device, std::mem::size_of::<ResolveCb>())?;

        // Digest lanes: a 2-element raw buffer so the shader's InterlockedAdd /
        // InterlockedXor can target it. Raw (BYTEADDRESS) rather than structured
        // because atomics on a structured buffer of uint are legal but raw views are
        // the better-supported path for interlocked ops at FL11_0.
        let digest_buffer = create_uav_buffer(&device, 8, 4, true)?;
        let digest_uav = create_raw_uav(&device, &digest_buffer, 2)?;
        let digest_staging = create_staging_buffer(&device, 8)?;
        let digest_zero = create_immutable_buffer(&device, &[0u8; 8])?;

        Ok(Self {
            device,
            context,
            cs_clear,
            cs_accumulate,
            cs_digest,
            cs_resolve,
            cb_accumulate,
            cb_resolve,
            digest_buffer,
            digest_uav,
            digest_staging,
            digest_zero,
            sinks: HashMap::new(),
            scratch_source: None,
        })
    }

    fn write_accumulate_cb(&self, width: u32, height: u32, weight: f32) -> Result<(), BackendError> {
        let data = AccumulateCb {
            size: [width, height],
            weight,
            _pad: 0.0,
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
        // the debug layer is loud about leftover bindings. Clear both slots between
        // passes.
        unsafe {
            self.context.CSSetShaderResources(0, Some(&[None, None]));
            self.context
                .CSSetUnorderedAccessViews(0, 3, Some([None, None, None].as_ptr()), None);
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

    fn digest(&mut self, source: &ID3D11Texture2D) -> Result<u64, BackendError> {
        let mut desc = D3D11_TEXTURE2D_DESC::default();
        unsafe { source.GetDesc(&mut desc) };

        let srv = self.source_srv(source)?;
        self.write_accumulate_cb(desc.Width, desc.Height, 0.0)?;

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

            self.context
                .CopyResource(&self.digest_staging, &self.digest_buffer);
        }
        self.unbind();

        // Blocking map: this is a GPU sync point once per frame. At the measured
        // margins (design note §1) we are several times inside the per-sample budget,
        // and correctness — knowing whether to accumulate this frame BEFORE we do —
        // is worth more than pipelining it.
        let mut mapped = D3D11_MAPPED_SUBRESOURCE::default();
        let lanes = unsafe {
            self.context
                .Map(&self.digest_staging, 0, D3D11_MAP_READ, 0, Some(&mut mapped))?;
            let ptr = mapped.pData as *const u32;
            let value = (*ptr as u64) | ((*ptr.add(1) as u64) << 32);
            self.context.Unmap(&self.digest_staging, 0);
            value
        };
        Ok(lanes)
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
        self.write_accumulate_cb(width, height, weight)?;

        unsafe {
            self.context.CSSetShader(&self.cs_accumulate, None);
            self.context
                .CSSetConstantBuffers(0, Some(&[Some(self.cb_accumulate.clone())]));
            self.context.CSSetShaderResources(0, Some(&[Some(srv)]));
            self.context
                .CSSetUnorderedAccessViews(0, 1, Some([Some(uav)].as_ptr()), None);
            self.context
                .Dispatch(div_ceil(width, TILE), div_ceil(height, TILE), 1);
        }
        self.unbind();
        Ok(())
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
