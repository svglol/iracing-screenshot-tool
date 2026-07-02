//! Windows.Graphics.Capture (WGC) N-API addon for the iRacing Screenshot Tool.
//!
//! Exposes two functions to Node/Electron:
//!   - `isSupported()` -> bool
//!   - `captureWindow(hwnd, timeoutMs?)` -> { data: Buffer, width, height }
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

use std::sync::mpsc;
use std::sync::{Arc, Mutex, Once};
use std::thread;
use std::time::Duration;

use napi::bindgen_prelude::Buffer;
use napi_derive::napi;

use windows_capture::capture::{Context, GraphicsCaptureApiHandler};
use windows_capture::frame::Frame;
use windows_capture::graphics_capture_api::InternalCaptureControl;
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

/// Capture a single true-RGBA frame of the window identified by `hwnd`.
///
/// `hwnd` arrives from JS as a number (f64) and is cast to the native HWND
/// integer. `timeout_ms` defaults to 1500ms. Any failure (bad HWND, no frame,
/// timeout) is returned as an `Err` so the JS side can fall back to the legacy
/// capture path.
#[napi]
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
    thread::spawn(move || {
        let hwnd_ptr = hwnd_int as *mut std::ffi::c_void;
        let window = Window::from_raw_hwnd(hwnd_ptr);

        let settings = Settings::new(
            window,
            CursorCaptureSettings::WithoutCursor,
            DrawBorderSettings::WithoutBorder,
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
            Err(e) => Err(format!("WGC capture failed: {e}")),
        };
        let _ = tx.send(outcome);
    });

    // Bounded wait so we can never hang the caller. Give the worker a little
    // headroom beyond the requested timeout.
    match rx.recv_timeout(Duration::from_millis(timeout as u64 + 500)) {
        Ok(Ok((data, width, height))) => Ok(CaptureResult {
            data: Buffer::from(data),
            width,
            height,
        }),
        Ok(Err(msg)) => Err(napi::Error::from_reason(msg)),
        Err(_) => Err(napi::Error::from_reason("WGC capture timed out")),
    }
}
