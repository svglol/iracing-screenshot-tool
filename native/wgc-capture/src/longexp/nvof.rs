//! Hand-written FFI for NVIDIA's Optical Flow API (NVOFA), D3D11 interface.
//!
//! ## Why this file exists in this form
//!
//! The ABI below is transcribed by hand from NVIDIA's Optical Flow SDK 5.0.7
//! headers (`NvOFInterface/nvOpticalFlowCommon.h`, `NvOFInterface/nvOpticalFlowD3D11.h`).
//! Those two headers carry their own per-file grant — *"This copyright notice
//! applies to this header file only … Permission is hereby granted, free of charge
//! … to deal in the Software without restriction"* — i.e. MIT, independent of the
//! SDK's `LicenseAgreement.pdf`. So transcribing them is unambiguously permitted.
//!
//! We nonetheless vendor **nothing**: no SDK file is copied into this repo and no
//! SDK file is shipped. We resolve `nvofapi64.dll`, which arrives with the user's
//! NVIDIA display driver, at runtime. That keeps the SDK EULA's distribution
//! requirements and its clause 4(e) anti-copyleft language entirely off this
//! MIT-licensed repository's back, and it avoids a `bindgen` build dependency.
//!
//! ## The layouts here are load-bearing — do not "tidy" them
//!
//! A wrong function-pointer table does not fail cleanly; it calls arbitrary
//! addresses. Every struct is `#[repr(C)]` and every field is in header order with
//! the header's type width. The `layout` unit tests at the bottom pin the sizes and
//! offsets that MSVC x86-64 produces for the C structs, so a careless edit fails the
//! suite rather than the GPU.
//!
//! Sizes asserted (MSVC x64, default packing):
//!   NV_OF_INIT_PARAMS            64
//!   NV_OF_BUFFER_DESCRIPTOR      16
//!   NV_OF_EXECUTE_INPUT_PARAMS   56
//!   NV_OF_EXECUTE_OUTPUT_PARAMS  48
//!   NV_OF_D3D11_API_FUNCTION_LIST 80  (10 pointers, header order)
//!
//! ## Calling convention
//!
//! The headers declare `NVOFAPI` as `__stdcall`. On x86-64 Windows `__stdcall` is
//! the standard convention, and Rust's `extern "system"` resolves to exactly that on
//! both x86 and x86-64 — which is why it is used throughout rather than `extern "C"`.

#![allow(non_camel_case_types, non_snake_case)]

use std::ffi::{c_void, CString};

use windows::core::{Interface, PCSTR};
use windows::Win32::Foundation::{FreeLibrary, HMODULE};
use windows::Win32::Graphics::Direct3D11::{ID3D11Device, ID3D11DeviceContext, ID3D11Resource};
use windows::Win32::Graphics::Dxgi::Common::DXGI_FORMAT;
use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};

use super::backend::BackendError;

// --- constants transcribed from nvOpticalFlowCommon.h -----------------------

/// `NV_OF_API_VERSION == (NV_OF_API_MAJOR_VERSION << 4) | NV_OF_API_MINOR_VERSION`.
/// SDK 5.0.7 defines MAJOR = 5, MINOR = 0, so this is 0x50 = 80.
///
/// NOTE: an earlier design note recorded this as "currently 2.0". That was read off
/// an older public header; the SDK we build against says 5.0. The value matters —
/// `NvOFAPICreateInstanceD3D11` rejects a version the driver does not implement.
pub const NV_OF_API_VERSION: u32 = (5 << 4) | 0;

pub const NV_OF_SUCCESS: u32 = 0;

// NV_OF_MODE
pub const NV_OF_MODE_OPTICALFLOW: u32 = 1;

// NV_OF_PERF_LEVEL
pub const NV_OF_PERF_LEVEL_SLOW: u32 = 5;
pub const NV_OF_PERF_LEVEL_MEDIUM: u32 = 10;
pub const NV_OF_PERF_LEVEL_FAST: u32 = 20;

// NV_OF_BUFFER_USAGE
pub const NV_OF_BUFFER_USAGE_INPUT: u32 = 1;
pub const NV_OF_BUFFER_USAGE_OUTPUT: u32 = 2;

// NV_OF_BUFFER_FORMAT
pub const NV_OF_BUFFER_FORMAT_GRAYSCALE8: u32 = 1;
pub const NV_OF_BUFFER_FORMAT_ABGR8: u32 = 3;
pub const NV_OF_BUFFER_FORMAT_SHORT2: u32 = 5;

// NV_OF_PRED_DIRECTION
pub const NV_OF_PRED_DIRECTION_FORWARD: u32 = 0;
pub const NV_OF_PRED_DIRECTION_BOTH: u32 = 2;

// NV_OF_CAPS
pub const NV_OF_CAPS_SUPPORTED_OUTPUT_GRID_SIZES: u32 = 0;
pub const NV_OF_CAPS_WIDTH_MAX: u32 = 6;
pub const NV_OF_CAPS_HEIGHT_MAX: u32 = 7;

pub const NV_OF_FALSE: u32 = 0;
pub const NV_OF_TRUE: u32 = 1;

/// Minimum buffer `NvOFGetLastError` will write into.
const MIN_ERROR_STRING_SIZE: usize = 80;

/// Flow vectors are `int16` pairs in **S10.5** fixed point: sign bit, 10 integer
/// bits, 5 fractional bits (`nvOpticalFlowCommon.h`, `NV_OF_FLOW_VECTOR`). So one
/// pixel is 32 units, and the shader divides by this to get pixels.
///
/// This is the constant the brief said must not be guessed. It is 32, from the
/// header, not from memory.
pub const FLOW_FIXED_POINT_SCALE: f32 = 32.0;

// --- structs ----------------------------------------------------------------

pub type NvOFHandle = *mut c_void;
pub type NvOFGPUBufferHandle = *mut c_void;

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NV_OF_INIT_PARAMS {
    pub width: u32,
    pub height: u32,
    pub outGridSize: u32,
    pub hintGridSize: u32,
    pub mode: u32,
    pub perfLevel: u32,
    pub enableExternalHints: u32,
    pub enableOutputCost: u32,
    pub hPrivData: *mut c_void,
    pub disparityRange: u32,
    pub enableRoi: u32,
    pub predDirection: u32,
    pub enableGlobalFlow: u32,
    pub inputBufferFormat: u32,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct NV_OF_BUFFER_DESCRIPTOR {
    pub width: u32,
    pub height: u32,
    pub bufferUsage: u32,
    pub bufferFormat: u32,
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct NV_OF_EXECUTE_INPUT_PARAMS {
    pub inputFrame: NvOFGPUBufferHandle,
    pub referenceFrame: NvOFGPUBufferHandle,
    pub externalHints: NvOFGPUBufferHandle,
    pub disableTemporalHints: u32,
    pub padding: u32,
    pub hPrivData: *mut c_void,
    pub padding2: u32,
    pub numRois: u32,
    pub roiData: *mut c_void,
}

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct NV_OF_EXECUTE_OUTPUT_PARAMS {
    pub outputBuffer: NvOFGPUBufferHandle,
    pub outputCostBuffer: NvOFGPUBufferHandle,
    pub hPrivData: *mut c_void,
    pub bwdOutputBuffer: NvOFGPUBufferHandle,
    pub bwdOutputCostBuffer: NvOFGPUBufferHandle,
    pub globalFlowBuffer: NvOFGPUBufferHandle,
}

impl Default for NV_OF_EXECUTE_INPUT_PARAMS {
    fn default() -> Self {
        Self {
            inputFrame: std::ptr::null_mut(),
            referenceFrame: std::ptr::null_mut(),
            externalHints: std::ptr::null_mut(),
            disableTemporalHints: 0,
            padding: 0,
            hPrivData: std::ptr::null_mut(),
            padding2: 0,
            numRois: 0,
            roiData: std::ptr::null_mut(),
        }
    }
}

impl Default for NV_OF_EXECUTE_OUTPUT_PARAMS {
    fn default() -> Self {
        Self {
            outputBuffer: std::ptr::null_mut(),
            outputCostBuffer: std::ptr::null_mut(),
            hPrivData: std::ptr::null_mut(),
            bwdOutputBuffer: std::ptr::null_mut(),
            bwdOutputCostBuffer: std::ptr::null_mut(),
            globalFlowBuffer: std::ptr::null_mut(),
        }
    }
}

// --- function-pointer table -------------------------------------------------
//
// ORDER IS THE ABI. This mirrors `_NV_OF_D3D11_API_FUNCTION_LIST` field for field.

type PFNNVCREATEOPTICALFLOWD3D11 = unsafe extern "system" fn(
    *mut c_void, // ID3D11Device*
    *mut c_void, // ID3D11DeviceContext*
    *mut NvOFHandle,
) -> u32;
type PFNNVOFINIT = unsafe extern "system" fn(NvOFHandle, *const NV_OF_INIT_PARAMS) -> u32;
type PFNNVOFGETSURFACEFORMATCOUNTD3D11 =
    unsafe extern "system" fn(NvOFHandle, u32, u32, *mut u32) -> u32;
type PFNNVOFGETSURFACEFORMATD3D11 =
    unsafe extern "system" fn(NvOFHandle, u32, u32, *mut DXGI_FORMAT) -> u32;
type PFNNVOFREGISTERRESOURCED3D11 = unsafe extern "system" fn(
    NvOFHandle,
    *mut c_void, // ID3D11Resource*
    *mut NvOFGPUBufferHandle,
) -> u32;
type PFNNVOFUNREGISTERRESOURCED3D11 = unsafe extern "system" fn(NvOFGPUBufferHandle) -> u32;
type PFNNVOFEXECUTE = unsafe extern "system" fn(
    NvOFHandle,
    *const NV_OF_EXECUTE_INPUT_PARAMS,
    *mut NV_OF_EXECUTE_OUTPUT_PARAMS,
) -> u32;
type PFNNVOFDESTROY = unsafe extern "system" fn(NvOFHandle) -> u32;
type PFNNVOFGETLASTERROR = unsafe extern "system" fn(NvOFHandle, *mut u8, *mut u32) -> u32;
type PFNNVOFGETCAPS = unsafe extern "system" fn(NvOFHandle, u32, *mut u32, *mut u32) -> u32;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct NV_OF_D3D11_API_FUNCTION_LIST {
    pub nvCreateOpticalFlowD3D11: Option<PFNNVCREATEOPTICALFLOWD3D11>,
    pub nvOFInit: Option<PFNNVOFINIT>,
    pub nvOFGetSurfaceFormatCountD3D11: Option<PFNNVOFGETSURFACEFORMATCOUNTD3D11>,
    pub nvOFGetSurfaceFormatD3D11: Option<PFNNVOFGETSURFACEFORMATD3D11>,
    pub nvOFRegisterResourceD3D11: Option<PFNNVOFREGISTERRESOURCED3D11>,
    pub nvOFUnregisterResourceD3D11: Option<PFNNVOFUNREGISTERRESOURCED3D11>,
    pub nvOFExecute: Option<PFNNVOFEXECUTE>,
    pub nvOFDestroy: Option<PFNNVOFDESTROY>,
    pub nvOFGetLastError: Option<PFNNVOFGETLASTERROR>,
    pub nvOFGetCaps: Option<PFNNVOFGETCAPS>,
}

impl Default for NV_OF_D3D11_API_FUNCTION_LIST {
    fn default() -> Self {
        // All-null: `NvOFAPICreateInstanceD3D11` fills it. Starting from null means a
        // driver that only partially populates the table leaves `None` rather than
        // garbage, and every call site checks.
        // SAFETY: an all-zero bit pattern is a valid `Option<fn>` (None) for every
        // field, and there are no other fields.
        unsafe { std::mem::zeroed() }
    }
}

type PFNNvOFAPICreateInstanceD3D11 =
    unsafe extern "system" fn(u32, *mut NV_OF_D3D11_API_FUNCTION_LIST) -> u32;
type PFNNvOFGetMaxSupportedApiVersion = unsafe extern "system" fn(*mut u32) -> u32;

// --- the loaded library -----------------------------------------------------

/// `nvofapi64.dll` ships with the NVIDIA display driver — there is nothing for the
/// end user to install, which is the constraint that ruled the whole approach in.
struct NvOfLibrary {
    module: HMODULE,
    create_instance: PFNNvOFAPICreateInstanceD3D11,
    max_api_version: Option<PFNNvOFGetMaxSupportedApiVersion>,
}

impl NvOfLibrary {
    fn load() -> Result<Self, BackendError> {
        let name = windows::core::w!("nvofapi64.dll");
        // SAFETY: a static, null-terminated wide string; failure is reported as Err.
        let module = unsafe { LoadLibraryW(name) }.map_err(|e| {
            BackendError(format!(
                "nvofapi64.dll could not be loaded (no NVIDIA driver?): {e}"
            ))
        })?;
        if module.is_invalid() {
            return Err(BackendError("nvofapi64.dll handle is invalid".into()));
        }

        let create_instance = unsafe { proc_address(module, "NvOFAPICreateInstanceD3D11") }
            .ok_or_else(|| {
                BackendError(
                    "nvofapi64.dll has no NvOFAPICreateInstanceD3D11 (driver too old)".into(),
                )
            })?;
        // SAFETY: the export's signature is fixed by the SDK header; we transcribe it
        // above. GetProcAddress returned non-null.
        let create_instance: PFNNvOFAPICreateInstanceD3D11 =
            unsafe { std::mem::transmute(create_instance) };

        let max_api_version = unsafe { proc_address(module, "NvOFGetMaxSupportedApiVersion") }
            .map(|p| unsafe { std::mem::transmute::<_, PFNNvOFGetMaxSupportedApiVersion>(p) });

        Ok(Self {
            module,
            create_instance,
            max_api_version,
        })
    }

    /// The largest API version the installed driver implements, encoded
    /// `(major << 4) | minor`. `None` when the export is missing.
    fn driver_api_version(&self) -> Option<u32> {
        let f = self.max_api_version?;
        let mut version = 0u32;
        // SAFETY: `version` is a live, correctly typed local.
        let status = unsafe { f(&mut version) };
        (status == NV_OF_SUCCESS).then_some(version)
    }
}

impl Drop for NvOfLibrary {
    fn drop(&mut self) {
        // SAFETY: the module handle came from LoadLibraryW and is freed exactly once.
        unsafe {
            let _ = FreeLibrary(self.module);
        }
    }
}

/// SAFETY: `GetProcAddress` on a live module handle with a NUL-terminated name.
unsafe fn proc_address(module: HMODULE, name: &str) -> Option<unsafe extern "system" fn() -> isize> {
    let c_name = CString::new(name).ok()?;
    GetProcAddress(module, PCSTR(c_name.as_ptr() as *const u8))
}

// --- safe wrapper -----------------------------------------------------------

/// A registered NVOFA buffer. Unregistering is tied to the Rust value's lifetime so
/// no path can leak a driver-side registration.
pub struct NvOfBuffer {
    handle: NvOFGPUBufferHandle,
    unregister: Option<PFNNVOFUNREGISTERRESOURCED3D11>,
}

impl NvOfBuffer {
    pub fn handle(&self) -> NvOFGPUBufferHandle {
        self.handle
    }
}

impl Drop for NvOfBuffer {
    fn drop(&mut self) {
        if let Some(unregister) = self.unregister {
            if !self.handle.is_null() {
                // SAFETY: the handle came from nvOFRegisterResourceD3D11 and is
                // released exactly once, here.
                unsafe {
                    let _ = unregister(self.handle);
                }
            }
        }
    }
}

/// What a successfully created optical-flow session negotiated with the driver.
#[derive(Clone, Copy, Debug)]
pub struct NvOfConfig {
    /// 1, 2 or 4 — one flow vector per `grid_size` × `grid_size` pixel block.
    pub grid_size: u32,
    /// Flow buffer dimensions: `ceil(width / grid_size)` × `ceil(height / grid_size)`.
    pub flow_width: u32,
    pub flow_height: u32,
    /// Whether the driver gave us backward flow as well as forward. Bidirectional
    /// flow is what makes the forward/backward consistency check — and therefore
    /// occlusion handling — possible.
    pub bidirectional: bool,
    /// Input surface format actually used (`GRAYSCALE8` or `ABGR8`).
    pub input_format: u32,
    pub perf_level: u32,
    /// API version negotiated with the driver.
    pub api_version: u32,
}

/// An initialised NVOFA optical-flow session bound to our D3D11 device.
///
/// Every failure path here is soft: the caller drops this and runs with
/// interpolation off. NVOFA must never be able to break the base long exposure.
pub struct NvOpticalFlow {
    // Dropped last; keeps nvofapi64.dll loaded while the handle lives.
    _library: NvOfLibrary,
    api: NV_OF_D3D11_API_FUNCTION_LIST,
    handle: NvOFHandle,
    config: NvOfConfig,
}

impl NvOpticalFlow {
    /// Create and initialise a session for `width` × `height` input frames.
    ///
    /// `device`/`context` must be the very device the frames live on — NVOFA cannot
    /// bind to a different adapter, which is exactly why `longExposureDeviceInfo()`
    /// reports which GPU WGC landed on.
    pub fn create(
        device: &ID3D11Device,
        context: &ID3D11DeviceContext,
        width: u32,
        height: u32,
        perf_level: u32,
    ) -> Result<Self, BackendError> {
        let library = NvOfLibrary::load()?;

        // Negotiate rather than assume. Passing an API version the driver does not
        // implement is rejected outright, and guessing an OLDER one would mean
        // guessing an older struct layout too — which is precisely the class of
        // mistake that calls arbitrary addresses. So: require at least ours.
        let driver_version = library.driver_api_version();
        if let Some(driver_version) = driver_version {
            if driver_version < NV_OF_API_VERSION {
                return Err(BackendError(format!(
                    "driver's optical-flow API is {}.{} but this build needs {}.{}",
                    driver_version >> 4,
                    driver_version & 0xF,
                    NV_OF_API_VERSION >> 4,
                    NV_OF_API_VERSION & 0xF
                )));
            }
        }

        let mut api = NV_OF_D3D11_API_FUNCTION_LIST::default();
        // SAFETY: `api` is a live, correctly sized table the driver fills in.
        let status = unsafe { (library.create_instance)(NV_OF_API_VERSION, &mut api) };
        if status != NV_OF_SUCCESS {
            return Err(BackendError(format!(
                "NvOFAPICreateInstanceD3D11 failed with status {status}"
            )));
        }

        let create = api
            .nvCreateOpticalFlowD3D11
            .ok_or_else(|| BackendError("driver left nvCreateOpticalFlowD3D11 null".into()))?;

        let mut handle: NvOFHandle = std::ptr::null_mut();
        // SAFETY: both COM pointers are live for the duration of the call; the driver
        // takes its own references.
        let status = unsafe {
            create(
                device.as_raw(),
                context.as_raw(),
                &mut handle,
            )
        };
        if status != NV_OF_SUCCESS || handle.is_null() {
            return Err(BackendError(format!(
                "nvCreateOpticalFlowD3D11 failed with status {status}"
            )));
        }

        // From here on a failure must still destroy the handle, so build the value
        // first and let `Drop` handle unwinding.
        let mut flow = Self {
            _library: library,
            api,
            handle,
            config: NvOfConfig {
                grid_size: 4,
                flow_width: 0,
                flow_height: 0,
                bidirectional: false,
                input_format: NV_OF_BUFFER_FORMAT_GRAYSCALE8,
                perf_level,
                api_version: driver_version.unwrap_or(NV_OF_API_VERSION),
            },
        };

        flow.negotiate_and_init(width, height, perf_level)?;
        Ok(flow)
    }

    fn negotiate_and_init(
        &mut self,
        width: u32,
        height: u32,
        perf_level: u32,
    ) -> Result<(), BackendError> {
        // 1. Frame size against the engine's limits. A 5120x2880 render is well
        //    inside Turing's 8192 ceiling, but a future supersample setting might not
        //    be, and silently producing garbage flow would be worse than declining.
        if let Some(max_w) = self.caps_first(NV_OF_CAPS_WIDTH_MAX) {
            if width > max_w {
                return Err(BackendError(format!(
                    "frame width {width} exceeds the optical-flow engine's maximum {max_w}"
                )));
            }
        }
        if let Some(max_h) = self.caps_first(NV_OF_CAPS_HEIGHT_MAX) {
            if height > max_h {
                return Err(BackendError(format!(
                    "frame height {height} exceeds the optical-flow engine's maximum {max_h}"
                )));
            }
        }

        // 2. Input format. Enumerate rather than assume: ABGR8 maps to
        //    DXGI_FORMAT_B8G8R8A8_UNORM while our capture is RGBA8, so we feed the
        //    engine a luma plane instead — which is both format-correct and a quarter
        //    of the bandwidth. ABGR8 is kept as a fallback for a driver that somehow
        //    declines grayscale.
        let input_formats = self.surface_formats(NV_OF_BUFFER_USAGE_INPUT)?;
        let input_format = if input_formats.contains(&nvof_format_to_dxgi(
            NV_OF_BUFFER_FORMAT_GRAYSCALE8,
        )) {
            NV_OF_BUFFER_FORMAT_GRAYSCALE8
        } else if input_formats.contains(&nvof_format_to_dxgi(NV_OF_BUFFER_FORMAT_ABGR8)) {
            NV_OF_BUFFER_FORMAT_ABGR8
        } else {
            return Err(BackendError(
                "the optical-flow engine advertises no input format we can produce".into(),
            ));
        };

        // 3. Output grid size. Bigger grid = fewer, coarser vectors and less work.
        //    Our displacements are ~4 px, so a 4x4 grid with a bilinear upsample of
        //    the field is ample and it is the cheapest option. Fall back to whatever
        //    the driver does advertise.
        let grids = self
            .caps(NV_OF_CAPS_SUPPORTED_OUTPUT_GRID_SIZES)
            .unwrap_or_default();
        let grid_size = [4u32, 2, 1]
            .into_iter()
            .find(|candidate| grids.contains(candidate))
            .or_else(|| grids.iter().copied().max())
            .ok_or_else(|| {
                BackendError("the optical-flow engine advertises no output grid size".into())
            })?;

        let flow_width = width.div_ceil(grid_size);
        let flow_height = height.div_ceil(grid_size);

        // 4. Initialise. Try bidirectional first — the backward field is what lets the
        //    warp detect disocclusions instead of smearing through them. If the driver
        //    refuses, retry forward-only and accept the weaker occlusion handling.
        let mut init = NV_OF_INIT_PARAMS {
            width,
            height,
            outGridSize: grid_size,
            hintGridSize: 0,
            mode: NV_OF_MODE_OPTICALFLOW,
            perfLevel: perf_level,
            enableExternalHints: NV_OF_FALSE,
            enableOutputCost: NV_OF_FALSE,
            hPrivData: std::ptr::null_mut(),
            disparityRange: 0,
            enableRoi: NV_OF_FALSE,
            predDirection: NV_OF_PRED_DIRECTION_BOTH,
            enableGlobalFlow: NV_OF_FALSE,
            inputBufferFormat: input_format,
        };

        let init_fn = self
            .api
            .nvOFInit
            .ok_or_else(|| BackendError("driver left nvOFInit null".into()))?;

        // SAFETY: `init` is a live, correctly laid out parameter block.
        let mut status = unsafe { init_fn(self.handle, &init) };
        let mut bidirectional = true;
        if status != NV_OF_SUCCESS {
            init.predDirection = NV_OF_PRED_DIRECTION_FORWARD;
            // SAFETY: as above.
            status = unsafe { init_fn(self.handle, &init) };
            bidirectional = false;
        }
        if status != NV_OF_SUCCESS {
            return Err(BackendError(format!(
                "nvOFInit failed with status {status}{}",
                self.last_error_suffix()
            )));
        }

        self.config = NvOfConfig {
            grid_size,
            flow_width,
            flow_height,
            bidirectional,
            input_format,
            perf_level,
            api_version: self.config.api_version,
        };
        Ok(())
    }

    pub fn config(&self) -> NvOfConfig {
        self.config
    }

    /// Register a D3D11 texture so it can be named in `execute`.
    ///
    /// Input textures must match the negotiated input format; flow outputs must be
    /// `DXGI_FORMAT_R16G16_SINT` at `flow_width` × `flow_height`.
    pub fn register(&self, resource: &ID3D11Resource) -> Result<NvOfBuffer, BackendError> {
        let register = self
            .api
            .nvOFRegisterResourceD3D11
            .ok_or_else(|| BackendError("driver left nvOFRegisterResourceD3D11 null".into()))?;
        let mut handle: NvOFGPUBufferHandle = std::ptr::null_mut();
        // SAFETY: `resource` outlives the returned NvOfBuffer by construction at every
        // call site (both live in the same owning struct, and the buffer is dropped
        // first).
        let status = unsafe { register(self.handle, resource.as_raw(), &mut handle) };
        if status != NV_OF_SUCCESS || handle.is_null() {
            return Err(BackendError(format!(
                "nvOFRegisterResourceD3D11 failed with status {status}{}",
                self.last_error_suffix()
            )));
        }
        Ok(NvOfBuffer {
            handle,
            unregister: self.api.nvOFUnregisterResourceD3D11,
        })
    }

    /// Kick off flow estimation from `input` to `reference`.
    ///
    /// Asynchronous: it returns once the work is submitted. We never read the flow
    /// back on the CPU — the warp shader consumes it on the GPU — so there is no sync
    /// point here at all.
    ///
    /// `disable_temporal_hints` should be false for consecutive frames of continuous
    /// motion (ours), where the previous call's vectors are a good starting guess.
    pub fn execute(
        &self,
        input: &NvOfBuffer,
        reference: &NvOfBuffer,
        forward_out: &NvOfBuffer,
        backward_out: Option<&NvOfBuffer>,
        disable_temporal_hints: bool,
    ) -> Result<(), BackendError> {
        let execute = self
            .api
            .nvOFExecute
            .ok_or_else(|| BackendError("driver left nvOFExecute null".into()))?;

        let in_params = NV_OF_EXECUTE_INPUT_PARAMS {
            inputFrame: input.handle(),
            referenceFrame: reference.handle(),
            disableTemporalHints: if disable_temporal_hints {
                NV_OF_TRUE
            } else {
                NV_OF_FALSE
            },
            ..Default::default()
        };
        let mut out_params = NV_OF_EXECUTE_OUTPUT_PARAMS {
            outputBuffer: forward_out.handle(),
            bwdOutputBuffer: backward_out.map_or(std::ptr::null_mut(), |b| b.handle()),
            ..Default::default()
        };

        // SAFETY: both parameter blocks are live locals with the header's layout, and
        // every handle came from `register` on this same session.
        let status = unsafe { execute(self.handle, &in_params, &mut out_params) };
        if status != NV_OF_SUCCESS {
            return Err(BackendError(format!(
                "nvOFExecute failed with status {status}{}",
                self.last_error_suffix()
            )));
        }
        Ok(())
    }

    fn surface_formats(&self, usage: u32) -> Result<Vec<DXGI_FORMAT>, BackendError> {
        let count_fn = self.api.nvOFGetSurfaceFormatCountD3D11.ok_or_else(|| {
            BackendError("driver left nvOFGetSurfaceFormatCountD3D11 null".into())
        })?;
        let list_fn = self
            .api
            .nvOFGetSurfaceFormatD3D11
            .ok_or_else(|| BackendError("driver left nvOFGetSurfaceFormatD3D11 null".into()))?;

        let mut count = 0u32;
        // SAFETY: `count` is a live local.
        let status = unsafe { count_fn(self.handle, usage, NV_OF_MODE_OPTICALFLOW, &mut count) };
        if status != NV_OF_SUCCESS {
            return Err(BackendError(format!(
                "nvOFGetSurfaceFormatCountD3D11 failed with status {status}"
            )));
        }
        if count == 0 {
            return Ok(Vec::new());
        }
        // Cap defensively: a bogus count would otherwise be a huge allocation.
        let count = count.min(64) as usize;
        let mut formats = vec![DXGI_FORMAT(0); count];
        // SAFETY: the driver writes at most `count` entries into a buffer of exactly
        // that length.
        let status = unsafe {
            list_fn(
                self.handle,
                usage,
                NV_OF_MODE_OPTICALFLOW,
                formats.as_mut_ptr(),
            )
        };
        if status != NV_OF_SUCCESS {
            return Err(BackendError(format!(
                "nvOFGetSurfaceFormatD3D11 failed with status {status}"
            )));
        }
        Ok(formats)
    }

    /// Two-stage caps query: size first with a null buffer, then values.
    fn caps(&self, cap: u32) -> Option<Vec<u32>> {
        let caps_fn = self.api.nvOFGetCaps?;
        let mut size = 0u32;
        // SAFETY: null `capsVal` is the documented "just tell me the size" form.
        let status = unsafe { caps_fn(self.handle, cap, std::ptr::null_mut(), &mut size) };
        if status != NV_OF_SUCCESS || size == 0 {
            return None;
        }
        let count = size.min(64) as usize;
        let mut values = vec![0u32; count];
        // The driver rewrites `size` with how many it actually populated, so pass a
        // named local rather than a temporary and truncate to what came back.
        let mut written = count as u32;
        // SAFETY: buffer is exactly the length the driver just asked for.
        let status = unsafe { caps_fn(self.handle, cap, values.as_mut_ptr(), &mut written) };
        if status != NV_OF_SUCCESS {
            return None;
        }
        values.truncate((written as usize).min(count));
        Some(values)
    }

    fn caps_first(&self, cap: u32) -> Option<u32> {
        self.caps(cap)?.first().copied()
    }

    /// The driver's own description of the last failure, as a `: detail` suffix.
    /// Far more actionable than the numeric status on its own.
    fn last_error_suffix(&self) -> String {
        let Some(get_error) = self.api.nvOFGetLastError else {
            return String::new();
        };
        let mut buffer = vec![0u8; MIN_ERROR_STRING_SIZE * 4];
        let mut size = buffer.len() as u32;
        // SAFETY: buffer and size are live locals; the driver writes at most `size`.
        let status = unsafe { get_error(self.handle, buffer.as_mut_ptr(), &mut size) };
        if status != NV_OF_SUCCESS {
            return String::new();
        }
        let end = size.min(buffer.len() as u32) as usize;
        let text = String::from_utf8_lossy(&buffer[..end]);
        let text = text.trim_end_matches('\0').trim();
        if text.is_empty() {
            String::new()
        } else {
            format!(": {text}")
        }
    }
}

impl Drop for NvOpticalFlow {
    fn drop(&mut self) {
        if let Some(destroy) = self.api.nvOFDestroy {
            if !self.handle.is_null() {
                // SAFETY: the handle came from nvCreateOpticalFlowD3D11 and is
                // destroyed exactly once.
                unsafe {
                    let _ = destroy(self.handle);
                }
            }
        }
    }
}

/// What a probe found out about this machine's optical-flow hardware.
///
/// Reported to JS so an unsupported box says *why* rather than silently producing
/// the same image it would have produced anyway.
#[derive(Clone, Debug)]
pub struct InterpolationSupport {
    pub available: bool,
    pub reason: Option<String>,
    pub grid_size: u32,
    pub bidirectional: bool,
    pub input_format: &'static str,
    /// `"5.0"` style.
    pub api_version: String,
}

impl InterpolationSupport {
    fn unavailable(reason: String) -> Self {
        Self {
            available: false,
            reason: Some(reason),
            grid_size: 0,
            bidirectional: false,
            input_format: "none",
            api_version: String::new(),
        }
    }
}

/// Try to stand up a real optical-flow session at `width` x `height` and report what
/// the driver agreed to. Side-effect free: the session is destroyed on the way out.
///
/// This is a genuine end-to-end exercise of the FFI — instance creation, caps query,
/// format enumeration and `nvOFInit` all run — so a machine that passes this probe
/// has proven the ABI, not merely that a DLL exists.
pub fn probe(
    device: &ID3D11Device,
    context: &ID3D11DeviceContext,
    width: u32,
    height: u32,
) -> InterpolationSupport {
    match NvOpticalFlow::create(device, context, width, height, NV_OF_PERF_LEVEL_MEDIUM) {
        Ok(flow) => {
            let config = flow.config();
            InterpolationSupport {
                available: true,
                reason: None,
                grid_size: config.grid_size,
                bidirectional: config.bidirectional,
                input_format: match config.input_format {
                    NV_OF_BUFFER_FORMAT_GRAYSCALE8 => "grayscale8",
                    NV_OF_BUFFER_FORMAT_ABGR8 => "abgr8",
                    _ => "unknown",
                },
                api_version: format!(
                    "{}.{}",
                    config.api_version >> 4,
                    config.api_version & 0xF
                ),
            }
        }
        Err(error) => InterpolationSupport::unavailable(error.0),
    }
}

/// `NvOFBufferFormatToDxgiFormat` from the SDK's `NvOFD3DCommon.cpp`, for the two
/// formats we can actually produce plus the flow output.
pub fn nvof_format_to_dxgi(format: u32) -> DXGI_FORMAT {
    use windows::Win32::Graphics::Dxgi::Common::{
        DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_FORMAT_R16G16_SINT, DXGI_FORMAT_R8_UNORM, DXGI_FORMAT_UNKNOWN,
    };
    match format {
        NV_OF_BUFFER_FORMAT_GRAYSCALE8 => DXGI_FORMAT_R8_UNORM,
        NV_OF_BUFFER_FORMAT_ABGR8 => DXGI_FORMAT_B8G8R8A8_UNORM,
        NV_OF_BUFFER_FORMAT_SHORT2 => DXGI_FORMAT_R16G16_SINT,
        _ => DXGI_FORMAT_UNKNOWN,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// These pin the C ABI. If one fails, the FFI is calling into the driver with a
    /// layout the driver does not agree with — which corrupts memory rather than
    /// returning an error, so it must be caught here.
    #[test]
    fn struct_layouts_match_the_c_abi() {
        use std::mem::{align_of, size_of};

        assert_eq!(size_of::<NV_OF_INIT_PARAMS>(), 64);
        assert_eq!(align_of::<NV_OF_INIT_PARAMS>(), 8);

        assert_eq!(size_of::<NV_OF_BUFFER_DESCRIPTOR>(), 16);

        assert_eq!(size_of::<NV_OF_EXECUTE_INPUT_PARAMS>(), 56);
        assert_eq!(align_of::<NV_OF_EXECUTE_INPUT_PARAMS>(), 8);

        assert_eq!(size_of::<NV_OF_EXECUTE_OUTPUT_PARAMS>(), 48);

        // Ten function pointers, in header order.
        assert_eq!(size_of::<NV_OF_D3D11_API_FUNCTION_LIST>(), 10 * 8);
    }

    #[test]
    fn init_params_field_offsets_match_the_header() {
        let params = NV_OF_INIT_PARAMS::default();
        let base = &params as *const _ as usize;
        let offset = |field: *const _| field as usize - base;

        assert_eq!(offset(&params.width as *const _ as *const u8), 0);
        assert_eq!(offset(&params.height as *const _ as *const u8), 4);
        assert_eq!(offset(&params.outGridSize as *const _ as *const u8), 8);
        assert_eq!(offset(&params.hintGridSize as *const _ as *const u8), 12);
        assert_eq!(offset(&params.mode as *const _ as *const u8), 16);
        assert_eq!(offset(&params.perfLevel as *const _ as *const u8), 20);
        assert_eq!(
            offset(&params.enableExternalHints as *const _ as *const u8),
            24
        );
        assert_eq!(offset(&params.enableOutputCost as *const _ as *const u8), 28);
        // The pointer forces 8-byte alignment here; everything after it shifts.
        assert_eq!(offset(&params.hPrivData as *const _ as *const u8), 32);
        assert_eq!(offset(&params.disparityRange as *const _ as *const u8), 40);
        assert_eq!(offset(&params.enableRoi as *const _ as *const u8), 44);
        assert_eq!(offset(&params.predDirection as *const _ as *const u8), 48);
        assert_eq!(offset(&params.enableGlobalFlow as *const _ as *const u8), 52);
        assert_eq!(
            offset(&params.inputBufferFormat as *const _ as *const u8),
            56
        );
    }

    #[test]
    fn execute_params_field_offsets_match_the_header() {
        let params = NV_OF_EXECUTE_INPUT_PARAMS::default();
        let base = &params as *const _ as usize;
        let offset = |field: *const _| field as usize - base;

        assert_eq!(offset(&params.inputFrame as *const _ as *const u8), 0);
        assert_eq!(offset(&params.referenceFrame as *const _ as *const u8), 8);
        assert_eq!(offset(&params.externalHints as *const _ as *const u8), 16);
        assert_eq!(
            offset(&params.disableTemporalHints as *const _ as *const u8),
            24
        );
        assert_eq!(offset(&params.padding as *const _ as *const u8), 28);
        assert_eq!(offset(&params.hPrivData as *const _ as *const u8), 32);
        assert_eq!(offset(&params.padding2 as *const _ as *const u8), 40);
        assert_eq!(offset(&params.numRois as *const _ as *const u8), 44);
        assert_eq!(offset(&params.roiData as *const _ as *const u8), 48);
    }

    #[test]
    fn api_version_is_five_zero() {
        // (5 << 4) | 0. Recorded because an older note said 2.0, which would be
        // rejected by a current driver.
        assert_eq!(NV_OF_API_VERSION, 0x50);
        assert_eq!(NV_OF_API_VERSION >> 4, 5);
        assert_eq!(NV_OF_API_VERSION & 0xF, 0);
    }

    #[test]
    fn flow_scale_is_s10_5() {
        // S10.5: 5 fractional bits => 32 units per pixel. From the header, and the
        // one constant the brief explicitly said not to guess.
        assert_eq!(FLOW_FIXED_POINT_SCALE, 32.0);
        // A raw vector of -96 is therefore exactly -3 px.
        assert_eq!(-96.0 / FLOW_FIXED_POINT_SCALE, -3.0);
    }

    #[test]
    fn buffer_formats_map_to_the_sdk_dxgi_formats() {
        use windows::Win32::Graphics::Dxgi::Common::{
            DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_FORMAT_R16G16_SINT, DXGI_FORMAT_R8_UNORM,
        };
        assert_eq!(
            nvof_format_to_dxgi(NV_OF_BUFFER_FORMAT_GRAYSCALE8),
            DXGI_FORMAT_R8_UNORM
        );
        // ABGR8 is B8G8R8A8_UNORM, NOT R8G8B8A8 — the exact trap that makes feeding
        // our RGBA capture straight in wrong.
        assert_eq!(
            nvof_format_to_dxgi(NV_OF_BUFFER_FORMAT_ABGR8),
            DXGI_FORMAT_B8G8R8A8_UNORM
        );
        assert_eq!(
            nvof_format_to_dxgi(NV_OF_BUFFER_FORMAT_SHORT2),
            DXGI_FORMAT_R16G16_SINT
        );
    }
}
