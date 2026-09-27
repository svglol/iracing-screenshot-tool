//! Windows.Graphics.Capture (WGC) N-API addon for the iRacing Screenshot Tool.
//!
//! Exposes to Node/Electron:
//!   - `isSupported()` -> bool
//!   - `captureWindow(hwnd, timeoutMs?)` -> { data: Buffer, width, height }
//!   - `captureConsentStatus()` -> the screenshots-privacy consent registry
//!     values (diagnostics-only; see `capture_consent_status`)
//!   - the `longExposure*` family (see `longexp`), which holds a live WGC capture
//!     open and accumulates its frames on the GPU via a D3D11 compute shader.
//!
//! WGC delivers true, un-subsampled 8-bit RGBA frames (unlike the
//! desktopCapturer/getUserMedia path, which chroma-subsamples to I420). We use
//! the `windows-capture` crate (WGC-only, no GDI fallback), so a successful grab
//! unambiguously proves WGC worked.
//!
//! Thread model: `OneShot::start()` BLOCKS its calling thread and pumps a
//! per-thread dispatcher queue; the frame handler runs on that same thread.
//! `Window` is not `Send`, so we spawn a std::thread, move only the numeric
//! HWND into it, construct the `Window` there, run the blocking capture, then
//! hand the first frame back over an mpsc channel. `capture_window` waits with a
//! bounded `recv_timeout`, so it can never hang the Electron main process. A
//! pathological never-arriving frame leaks the worker thread (documented,
//! acceptable) but never calls `process::exit`.

mod longexp;

use std::sync::mpsc;
use std::sync::mpsc::RecvTimeoutError;
use std::sync::{Arc, Mutex, Once, OnceLock};
use std::thread;
use std::time::Duration;

use napi::bindgen_prelude::Buffer;
use napi_derive::napi;

use windows_capture::capture::{Context, GraphicsCaptureApiHandler};
use windows_capture::frame::Frame;
use windows_capture::graphics_capture_api::{GraphicsCaptureApi, InternalCaptureControl};
use windows_capture::settings::{
    ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
    MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
};
use windows_capture::window::Window;

use windows::Win32::UI::HiDpi::{
    SetProcessDpiAwarenessContext, DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
};

/// Set per-monitor-DPI-aware-v2 exactly once so captured sizes are physical
/// pixels. Safe to attempt repeatedly; the `Once` guarantees a single call.
static DPI_ONCE: Once = Once::new();
fn ensure_dpi_awareness() {
    DPI_ONCE.call_once(|| unsafe {
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    });
}

/// Result returned to JS: tightly-packed RGBA bytes + dimensions.
#[napi(object)]
pub struct CaptureResult {
    pub data: Buffer,
    pub width: u32,
    pub height: u32,
}

/// Shared slot the handler drops the first frame into: (RGBA bytes, w, h).
type Shared = Arc<Mutex<Option<(Vec<u8>, u32, u32)>>>;

/// One-shot capture handler: grabs the first real frame into the shared slot,
/// then stops the capture (which unblocks `OneShot::start`).
struct OneShot {
    slot: Shared,
}

impl GraphicsCaptureApiHandler for OneShot {
    // The handler's `Flags` payload is the shared result slot.
    type Flags = Shared;
    type Error = Box<dyn std::error::Error + Send + Sync>;

    fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
        Ok(Self { slot: ctx.flags })
    }

    fn on_frame_arrived(
        &mut self,
        frame: &mut Frame,
        capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        // frame.buffer() maps a STAGING texture; the mapped rows carry the GPU
        // RowPitch (usually NOT width*4). as_nopadding_buffer copies row-by-row
        // honoring RowPitch into `scratch` and returns a tightly-packed
        // width*height*4 RGBA slice. (Rgba8 was requested, so byte order is
        // R,G,B,A already — no swizzle needed.)
        let fb = frame.buffer()?;
        let width = fb.width();
        let height = fb.height();
        let mut scratch: Vec<u8> = Vec::new();
        let data = fb.as_nopadding_buffer(&mut scratch);

        if let Ok(mut guard) = self.slot.lock() {
            *guard = Some((data.to_vec(), width, height));
        }

        // Unblocks OneShot::start() on the worker thread.
        capture_control.stop();
        Ok(())
    }

    fn on_closed(&mut self) -> Result<(), Self::Error> {
        Ok(())
    }
}

/// Returns whether Windows.Graphics.Capture is available on this OS build.
#[napi]
pub fn is_supported() -> bool {
    windows::Graphics::Capture::GraphicsCaptureSession::IsSupported().unwrap_or(false)
}

/// Per-capability report for the WGC path — see `probe_capture_support`.
#[napi(object)]
pub struct CaptureSupport {
    /// WGC itself: UniversalApiContract 8 (Win10 1903) AND `IsSupported()`.
    pub api_supported: bool,
    /// `GraphicsCaptureSession.IsCursorCaptureEnabled` exists (Win10 2004).
    pub cursor_config_supported: bool,
    /// `GraphicsCaptureSession.IsBorderRequired` exists (Windows 11 22000).
    pub border_config_supported: bool,
}

/// Report which parts of the WGC path this OS build can actually run.
///
/// `is_supported()` above answers only "does WGC exist here", which is NOT the
/// same question as "what may our capture ASK FOR". The two session settings we
/// care about are each gated on a WinRT property that arrived later than WGC
/// itself — `IsCursorCaptureEnabled` in Win10 2004, `IsBorderRequired` in Windows
/// 11 — and the crate REFUSES rather than degrades when one is missing:
/// `GraphicsCaptureApi::new` returns `CursorConfigUnsupported` /
/// `BorderConfigUnsupported` before a session is ever created.
///
/// So the settings are negotiated against this report rather than demanded (see
/// `negotiated_cursor_settings` / `negotiated_border_settings`), and the JS gate
/// uses it to describe what a capture on this machine will actually look like.
///
/// Cheap and side-effect free: three `ApiInformation` lookups, no device, no
/// window, no capture.
#[napi(catch_unwind)]
pub fn probe_capture_support() -> CaptureSupport {
    CaptureSupport {
        api_supported: GraphicsCaptureApi::is_supported().unwrap_or(false),
        cursor_config_supported: cursor_config_supported(),
        border_config_supported: border_config_supported(),
    }
}

/// Whether `GraphicsCaptureSession.IsCursorCaptureEnabled` exists (Win10 2004).
/// Cached: the answer cannot change while the process runs, and both capture
/// paths ask on every session.
fn cursor_config_supported() -> bool {
    static CACHED: OnceLock<bool> = OnceLock::new();
    *CACHED.get_or_init(|| GraphicsCaptureApi::is_cursor_settings_supported().unwrap_or(false))
}

/// Whether `GraphicsCaptureSession.IsBorderRequired` exists (Windows 11 22000).
fn border_config_supported() -> bool {
    static CACHED: OnceLock<bool> = OnceLock::new();
    *CACHED.get_or_init(|| GraphicsCaptureApi::is_border_settings_supported().unwrap_or(false))
}

/// The strongest cursor setting this OS build accepts.
///
/// Asking for `WithoutCursor` where the property is missing is a hard error, not
/// a no-op, so pre-2004 Windows 10 gets `Default` instead. That does mean the
/// cursor is composited into the frame there (WGC's own default is cursor-on),
/// which the JS gate reports as a caveat — a capture with a cursor in it beats no
/// capture at all, and 2004 is old enough that no serviced Windows 10 misses it.
pub(crate) fn negotiated_cursor_settings() -> CursorCaptureSettings {
    if cursor_config_supported() {
        CursorCaptureSettings::WithoutCursor
    } else {
        CursorCaptureSettings::Default
    }
}

/// Re-attempt the FIRST step of a WGC capture — turning the HWND into a
/// `GraphicsCaptureItem` via `IGraphicsCaptureItemInterop::CreateForWindow` —
/// purely to recover the HRESULT. `windows-capture` maps every conversion
/// failure to the same `ItemConvertFailed` string, discarding the code, and a
/// field log carrying only that string cannot distinguish an access denial
/// (screenshots-privacy consent, window display affinity) from a dead HWND or a
/// broken WinRT activation. Diagnostic-only: called AFTER a capture already
/// failed, on the same worker thread, so an extra conversion attempt costs
/// nothing and changes no behavior.
pub(crate) fn describe_create_for_window(hwnd_int: isize) -> String {
    use windows::Graphics::Capture::GraphicsCaptureItem;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::WinRT::Graphics::Capture::IGraphicsCaptureItemInterop;

    let hwnd = HWND(hwnd_int as *mut std::ffi::c_void);

    // An anti-capture display affinity — set by whoever owns the window (an
    // overlay, a privacy tool, conceivably the sim itself) — fails
    // CreateForWindow with the SAME 0x80070005 as a privacy-consent Deny, so an
    // access-denied log line is only attributable with this field beside it.
    let affinity = display_affinity_suffix(hwnd);

    // Same acquisition path the crate itself uses; a failure HERE (not at
    // CreateForWindow) means WinRT activation of the capture class is broken on
    // this machine — a distinct, registry-level fault worth naming.
    let interop = match windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>()
    {
        Ok(interop) => interop,
        Err(e) => {
            return format!(
                "activation factory failed: HRESULT=0x{:08X} {}{affinity}",
                e.code().0 as u32,
                e.message()
            )
        }
    };

    match unsafe { interop.CreateForWindow::<GraphicsCaptureItem>(hwnd) } {
        // The retry succeeding right after the capture failed is itself a
        // finding: the conversion is racy/transient on this machine, not durable.
        Ok(_) => format!("CreateForWindow retry succeeded (transient failure){affinity}"),
        Err(e) => format!(
            "CreateForWindow HRESULT=0x{:08X} {}{affinity}{}",
            e.code().0 as u32,
            e.message(),
            describe_control_probe(&interop)
        ),
    }
}

/// The same `CreateForWindow`, from this process, against the taskbar
/// (`Shell_TrayWnd`) — a window every interactive session has and that WGC
/// converts unconditionally. Field case 2026-08: a third process (Discord)
/// converted the very iRacing window our capture had just failed on, so the
/// machine, the consent store and the window were all fine and the fault was
/// specific to THIS process. This probe splits that family: the control failing
/// too means WGC refuses the process as a whole (policy, injection, token); the
/// control succeeding pins the fault to the target HWND as this process sees it.
fn describe_control_probe(
    interop: &windows::Win32::System::WinRT::Graphics::Capture::IGraphicsCaptureItemInterop,
) -> String {
    use windows::core::{w, PCWSTR};
    use windows::Graphics::Capture::GraphicsCaptureItem;
    use windows::Win32::UI::WindowsAndMessaging::FindWindowW;

    let control = match unsafe { FindWindowW(w!("Shell_TrayWnd"), PCWSTR::null()) } {
        Ok(hwnd) if !hwnd.0.is_null() => hwnd,
        _ => return "; control window absent".to_string(),
    };
    match unsafe { interop.CreateForWindow::<GraphicsCaptureItem>(control) } {
        Ok(_) => "; control(Shell_TrayWnd)=OK".to_string(),
        Err(e) => format!(
            "; control(Shell_TrayWnd) HRESULT=0x{:08X} {}",
            e.code().0 as u32,
            e.message()
        ),
    }
}

/// `"; displayAffinity=0x…"` for the target window, empty when the query itself
/// fails (dead HWND — the CreateForWindow HRESULT already tells that story).
/// 0x00 is the normal state; 0x01 (WDA_MONITOR) and 0x11
/// (WDA_EXCLUDEFROMCAPTURE) mark the window as capture-protected.
pub(crate) fn display_affinity_suffix(hwnd: windows::Win32::Foundation::HWND) -> String {
    use windows::Win32::UI::WindowsAndMessaging::GetWindowDisplayAffinity;

    let mut affinity = 0u32;
    if unsafe { GetWindowDisplayAffinity(hwnd, &mut affinity) }.is_err() {
        return String::new();
    }
    let label = match affinity {
        0x00 => "",
        0x01 | 0x11 => " (anti-capture)",
        _ => " (unknown)",
    };
    format!("; displayAffinity=0x{affinity:02X}{label}")
}

/// The Windows screenshots-privacy consent values for programmatic capture, as
/// stored in the registry — one field per hive/scope, `None` when the key or
/// value is absent (pre-24H2 Windows has no such store; that absence is itself
/// the answer). Field names surface in JS camelCased (`hkcuNonPackaged`).
#[napi(object)]
pub struct CaptureConsentStatus {
    pub hkcu: Option<String>,
    pub hkcu_non_packaged: Option<String>,
    pub hklm: Option<String>,
    pub hklm_non_packaged: Option<String>,
}

/// Read one ConsentStore `Value` (REG_SZ, typically "Allow"/"Deny"/"Prompt").
/// Fail-open: any error — absent key, wrong type, truncation — reads as `None`.
fn read_consent_value(
    root: windows::Win32::System::Registry::HKEY,
    subkey: windows::core::PCWSTR,
) -> Option<String> {
    use windows::core::w;
    use windows::Win32::Foundation::ERROR_SUCCESS;
    use windows::Win32::System::Registry::{RegGetValueW, RRF_RT_REG_SZ};

    // Real values are single words; 64 UTF-16 units is generous headroom.
    let mut buf = [0u16; 64];
    let mut size_bytes = (buf.len() * 2) as u32;
    let status = unsafe {
        RegGetValueW(
            root,
            subkey,
            w!("Value"),
            RRF_RT_REG_SZ,
            None,
            Some(buf.as_mut_ptr().cast()),
            Some(&mut size_bytes),
        )
    };
    if status != ERROR_SUCCESS {
        return None;
    }
    // size_bytes counts the terminating NUL; strip it (and any padding NULs).
    let mut chars = ((size_bytes as usize) / 2).min(buf.len());
    while chars > 0 && buf[chars - 1] == 0 {
        chars -= 1;
    }
    Some(String::from_utf16_lossy(&buf[..chars]))
}

/// Report the screenshots-privacy consent (Settings > Privacy & security >
/// "Screenshots and apps", enforced from Windows 11 24H2) as the registry
/// actually stores it. The Settings UI can disagree with the effective policy —
/// an HKLM value overrides what the user sees — and a `Deny` in any of these
/// makes `CreateForWindow` fail for EVERY capture backend at once, which no
/// contract probe can see (`probe_capture_support` is ApiInformation-only).
/// Diagnostic-only and fail-open; read live on each call so a toggle flipped
/// between attempts shows up.
#[napi(catch_unwind)]
pub fn capture_consent_status() -> CaptureConsentStatus {
    use windows::core::w;
    use windows::Win32::System::Registry::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE};

    CaptureConsentStatus {
        hkcu: read_consent_value(
            HKEY_CURRENT_USER,
            w!(
                r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\graphicsCaptureProgrammatic"
            ),
        ),
        hkcu_non_packaged: read_consent_value(
            HKEY_CURRENT_USER,
            w!(
                r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\graphicsCaptureProgrammatic\NonPackaged"
            ),
        ),
        hklm: read_consent_value(
            HKEY_LOCAL_MACHINE,
            w!(
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\graphicsCaptureProgrammatic"
            ),
        ),
        hklm_non_packaged: read_consent_value(
            HKEY_LOCAL_MACHINE,
            w!(
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\graphicsCaptureProgrammatic\NonPackaged"
            ),
        ),
    }
}

/// Process-side facts for the diagnostics log, exposed as an object so the
/// contract can grow without an ABI break. Field names surface camelCased.
#[napi(object)]
pub struct ProcessCaptureContext {
    /// Whether this process holds an elevated (administrator) token; `None`
    /// when the token cannot be queried.
    pub elevated: Option<bool>,
}

/// Who the capturing process is, as Windows sees it. An elevated capturer is a
/// different subject for the capability-access checks behind `CreateForWindow`
/// than the un-elevated Discord/OBS that work beside it, and "run as
/// administrator" is a durable per-exe setting that survives the reboot which
/// the field case showed did not help — so the log has to name it rather than
/// ask. Diagnostic-only and fail-open.
#[napi(catch_unwind)]
pub fn process_capture_context() -> ProcessCaptureContext {
    ProcessCaptureContext {
        elevated: token_elevated(),
    }
}

/// Whether Windows lets THIS process create a capture item at all.
#[napi(object)]
pub struct CapturePermission {
    pub allowed: bool,
    /// The refusing HRESULT (unsigned, e.g. 0x80070005); `None` when allowed.
    pub hresult: Option<u32>,
    pub message: Option<String>,
}

/// Ask Windows whether this process may capture, using the taskbar
/// (`Shell_TrayWnd`) — a window we never resize or touch — so the answer is
/// about US, not about iRacing. Field case 2026-09 (reporter #5): with the app
/// set to "Run as administrator", `CreateForWindow` returned 0x80070005 for the
/// taskbar and iRacing alike while an un-elevated PowerShell on the same session
/// converted both. The refusal covers Chromium's WGC-based window capture too,
/// so no capture backend can work; the caller turns that into an actionable
/// message instead of two failed captures and "Could not start video source".
///
/// Converting an item starts no session and grabs no frame — it is cheap and has
/// no visible side effect. `None` when the answer is unknowable (no taskbar, WGC
/// activation itself broken): fail open, the capture paths report those.
#[napi(catch_unwind)]
pub fn probe_capture_permission() -> Option<CapturePermission> {
    use windows::core::{w, PCWSTR};
    use windows::Graphics::Capture::GraphicsCaptureItem;
    use windows::Win32::System::WinRT::Graphics::Capture::IGraphicsCaptureItemInterop;
    use windows::Win32::UI::WindowsAndMessaging::FindWindowW;

    let control = match unsafe { FindWindowW(w!("Shell_TrayWnd"), PCWSTR::null()) } {
        Ok(hwnd) if !hwnd.0.is_null() => hwnd,
        _ => return None,
    };
    let interop =
        windows::core::factory::<GraphicsCaptureItem, IGraphicsCaptureItemInterop>().ok()?;
    Some(
        match unsafe { interop.CreateForWindow::<GraphicsCaptureItem>(control) } {
            Ok(_) => CapturePermission {
                allowed: true,
                hresult: None,
                message: None,
            },
            Err(e) => CapturePermission {
                allowed: false,
                hresult: Some(e.code().0 as u32),
                message: Some(e.message().to_string()),
            },
        },
    )
}

fn token_elevated() -> Option<bool> {
    use windows::Win32::Foundation::{CloseHandle, HANDLE};
    use windows::Win32::Security::{
        GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
    };
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    let mut token = HANDLE::default();
    unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) }.ok()?;
    let mut elevation = TOKEN_ELEVATION::default();
    let mut returned = 0u32;
    let queried = unsafe {
        GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut TOKEN_ELEVATION as *mut std::ffi::c_void),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut returned,
        )
    };
    // Close before inspecting the result so the handle never leaks on the
    // error path.
    let _ = unsafe { CloseHandle(token) };
    queried.ok()?;
    Some(elevation.TokenIsElevated != 0)
}

/// The strongest border setting this OS build accepts.
///
/// This one costs NOTHING to degrade. The yellow capture border is a Windows 11
/// feature, and `IsBorderRequired` is the opt-out that shipped alongside it — so
/// on Windows 10 there is no border to suppress and `Default` already yields an
/// unbordered frame. Demanding `WithoutBorder` there bought nothing and failed
/// every capture, which is what made the whole WGC path look Windows 11-only.
pub(crate) fn negotiated_border_settings() -> DrawBorderSettings {
    if border_config_supported() {
        DrawBorderSettings::WithoutBorder
    } else {
        DrawBorderSettings::Default
    }
}

/// Capture a single true-RGBA frame of the window identified by `hwnd`.
///
/// `hwnd` arrives from JS as a number (f64) and is cast to the native HWND
/// integer. `timeout_ms` defaults to 1500ms. Any failure (bad HWND, no frame,
/// timeout) is returned as an `Err` so the JS side can fall back to the legacy
/// capture path.
// catch_unwind: convert any stray panic on the Node main thread into a thrown JS
// error instead of aborting the whole Electron process (the JS side then falls
// back to getUserMedia). Without it, a panic in a plain #[napi] fn unwinds across
// the C ABI and calls abort().
#[napi(catch_unwind)]
pub fn capture_window(hwnd: f64, timeout_ms: Option<u32>) -> napi::Result<CaptureResult> {
    ensure_dpi_awareness();

    let timeout = timeout_ms.unwrap_or(1500);
    // f64 -> native handle integer. HWND values fit well within f64's exact
    // integer range (<= 2^53), so no precision is lost.
    let hwnd_int = hwnd as isize;

    let (tx, rx) = mpsc::channel::<Result<(Vec<u8>, u32, u32), String>>();
    let slot: Shared = Arc::new(Mutex::new(None));
    let slot_worker = slot.clone();

    // Worker thread: Window is !Send, so build it here from the (Send) integer.
    // Builder::spawn (not thread::spawn) so an OS thread-creation failure surfaces
    // as a catchable Err instead of panicking across the N-API boundary; the JS
    // caller then falls back to getUserMedia rather than crashing the app.
    let spawn_result = thread::Builder::new()
        .name("wgc-capture".into())
        .spawn(move || {
            let hwnd_ptr = hwnd_int as *mut std::ffi::c_void;
            let window = Window::from_raw_hwnd(hwnd_ptr);

            let settings = Settings::new(
                window,
                negotiated_cursor_settings(),
                negotiated_border_settings(),
                SecondaryWindowSettings::Default,
                MinimumUpdateIntervalSettings::Default,
                DirtyRegionSettings::Default,
                ColorFormat::Rgba8,
                slot_worker.clone(),
            );

            // Blocks until the handler calls capture_control.stop().
            let outcome = match OneShot::start(settings) {
                Ok(()) => match slot_worker.lock().ok().and_then(|mut g| g.take()) {
                    Some(frame) => Ok(frame),
                    None => Err("WGC capture produced no frame".to_string()),
                },
                Err(e) => {
                    let mut message = format!("WGC capture failed: {e}");
                    // ItemConvertFailed swallows the HRESULT; re-attempt just the
                    // conversion to name the actual code (see the helper's doc).
                    if message.contains("GraphicsCaptureItem") {
                        message = format!("{message} [{}]", describe_create_for_window(hwnd_int));
                    }
                    Err(message)
                }
            };
            let _ = tx.send(outcome);
        });
    if let Err(e) = spawn_result {
        return Err(napi::Error::from_reason(format!(
            "WGC worker thread spawn failed: {e}"
        )));
    }

    // Bounded wait so we can never hang the caller. Give the worker a little
    // headroom beyond the requested timeout.
    match rx.recv_timeout(Duration::from_millis(timeout as u64 + 500)) {
        Ok(Ok((data, width, height))) => Ok(CaptureResult {
            data: Buffer::from(data),
            width,
            height,
        }),
        Ok(Err(msg)) => Err(napi::Error::from_reason(msg)),
        // Split the two recv_timeout failure modes so the JS diagnostics can tell a
        // genuine slow grab (Timeout, grabElapsedMs ~ timeout+500) from a worker-thread
        // panic (tx dropped -> Disconnected, returns immediately with grabElapsedMs ~ 0),
        // which was previously mislabeled a timeout (cq-capture-path#3).
        //
        // The affinity suffix is here, NOT on ItemConvertFailed enrichment alone:
        // measured on 26200.9168, an anti-capture window (WDA_EXCLUDEFROMCAPTURE)
        // converts fine and starts a session that simply never delivers a frame —
        // it surfaces as exactly this timeout.
        Err(RecvTimeoutError::Timeout) => Err(napi::Error::from_reason(format!(
            "WGC capture timed out{}",
            display_affinity_suffix(windows::Win32::Foundation::HWND(
                hwnd_int as *mut std::ffi::c_void
            ))
        ))),
        Err(RecvTimeoutError::Disconnected) => Err(napi::Error::from_reason(
            "WGC worker exited without result (panic?)",
        )),
    }
}
