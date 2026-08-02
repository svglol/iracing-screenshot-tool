//! Long-exposure accumulation session (design note §3, §4, §7).
//!
//! A session is a live WGC capture of the iRacing window whose frames are
//! accumulated on the GPU. JavaScript drives the replay and owns all timing
//! authority; this module owns the GPU frames and nothing else. The split is
//! deliberate and total:
//!
//!   JS (main process)   replay position, playback speed, window boundaries,
//!                       termination, weighting — all decided from ReplayFrameNum
//!                       and ReplaySessionTime telemetry.
//!   Rust (here)         capture frames, reject duplicates, accumulate, resolve.
//!
//! JS pushes the current normalised window position + weight (`set_sample_weight`)
//! roughly once per telemetry tick; frames arriving between pushes use the last
//! known value. That staleness is bounded by one telemetry tick (~16 ms wall =
//! ~1 ms of sim time at 1/16 playback) and affects only the taper weight — never
//! termination, which JS decides on ReplayFrameNum.
//!
//! THREADING. All D3D11 work happens on the capture worker thread: the backend is
//! created there (from the device WGC itself created), every frame is accumulated
//! there, and the final resolve runs there too, after the blocking capture loop
//! returns. Nothing else ever touches the device, so no synchronisation is needed
//! around it. `finish` unblocks the worker by posting WM_QUIT to it — the same
//! mechanism `windows-capture`'s own `CaptureControl::stop` uses — which works even
//! if iRacing has stopped presenting entirely.

mod backend;
mod d3d11;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU32, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

use napi::bindgen_prelude::Buffer;
use napi_derive::napi;

use windows::Win32::Foundation::{LPARAM, WPARAM};
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::{PostThreadMessageW, WM_QUIT};

use windows_capture::capture::{Context, GraphicsCaptureApiHandler};
use windows_capture::frame::Frame;
use windows_capture::graphics_capture_api::InternalCaptureControl;
use windows_capture::settings::{
    ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
    MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
};
use windows_capture::window::Window;

use backend::{AccumulateBackend, ResolveParams, ResolvedImage, Tonemap};
use d3d11::D3d11Backend;

/// v1 accumulates into exactly one sink. The backend and the router both support N
/// (that is the bracketing seam); only the session's `create_sink` call is singular.
const PRIMARY_SINK: &str = "primary";

/// Cap on the per-sample diagnostic log handed back to JS. Enough for a 1-second
/// exposure at 1/16 playback and 120 fps (1920 samples) with headroom, bounded so a
/// runaway session cannot grow memory without limit.
const MAX_SAMPLE_LOG: usize = 8192;

/// One accumulated (or rejected) frame, for the evenness / duplicate report.
struct SampleRecord {
    u: f32,
    session_time: f64,
    replay_frame: i64,
    digest: u64,
    presented_at: i64,
    accepted: bool,
}

/// State shared between the JS thread and the capture worker. Everything here is
/// plain atomics or a Mutex over Send data — the D3D11 backend deliberately lives
/// elsewhere (see `BackendSlot`) so this stays trivially Send + Sync.
#[derive(Default)]
struct SessionShared {
    /// Win32 thread id of the capture worker, stashed by the handler's `new` so
    /// `finish` can post WM_QUIT to it.
    thread_id: AtomicU32,
    /// Frames are only accumulated while this is true. Closed during the pre-roll
    /// seek and again the moment the anchor is reached, so a frame that arrives
    /// after termination can never join the exposure.
    gate_open: AtomicBool,
    /// f32 bits of the current sample weight.
    weight_bits: AtomicU32,
    /// f32 bits of the current normalised window position.
    u_bits: AtomicU32,
    /// f64 bits of the current ReplaySessionTime.
    session_time_bits: AtomicU64,
    replay_frame: AtomicI64,

    finish_requested: AtomicBool,
    accepted: AtomicU32,
    rejected: AtomicU32,
    /// Set once the handler has processed at least one frame — proves the capture
    /// is genuinely live rather than merely started.
    saw_frame: AtomicBool,

    log: Mutex<Vec<SampleRecord>>,
    last_error: Mutex<Option<String>>,
    resolve_params: Mutex<Option<ResolveParams>>,
    /// Render dimensions of the first frame seen, used to create the sink lazily
    /// (WGC decides the real size, not us).
    frame_dims: Mutex<Option<(u32, u32)>>,
    backend_name: Mutex<Option<String>>,
}

/// Holds the D3D11 backend. Touched ONLY from the capture worker thread: created in
/// the handler's `new`, used in `on_frame_arrived`, resolved after the capture loop
/// returns — all on that one thread.
///
/// SAFETY: the contained COM interfaces are not `Send`, but this value never
/// crosses a thread boundary while in use. The `Arc` is cloned into the worker
/// thread closure and into the handler (which lives on that thread); the JS thread
/// holds no clone. Marking it `Send`/`Sync` is required only so the handler — which
/// `windows-capture` requires to be `Send` — can hold it.
struct BackendSlot(Mutex<Option<Box<dyn AccumulateBackend>>>);

unsafe impl Send for BackendSlot {}
unsafe impl Sync for BackendSlot {}

impl BackendSlot {
    fn new() -> Self {
        Self(Mutex::new(None))
    }
}

struct HandlerFlags {
    shared: Arc<SessionShared>,
    backend: Arc<BackendSlot>,
}

/// What the worker thread sends back once the capture loop has ended and (if
/// requested) the resolve has run.
struct SessionOutcome {
    image: Option<ResolvedImage>,
    error: Option<String>,
}

struct SessionEntry {
    shared: Arc<SessionShared>,
    outcome_rx: Receiver<SessionOutcome>,
    join: Option<thread::JoinHandle<()>>,
}

fn sessions() -> &'static Mutex<HashMap<u32, SessionEntry>> {
    static SESSIONS: OnceLock<Mutex<HashMap<u32, SessionEntry>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn next_session_id() -> u32 {
    static NEXT: AtomicU32 = AtomicU32::new(1);
    NEXT.fetch_add(1, Ordering::Relaxed)
}

fn record_error(shared: &SessionShared, message: String) {
    if let Ok(mut guard) = shared.last_error.lock() {
        if guard.is_none() {
            *guard = Some(message);
        }
    }
}

// --- capture handler -------------------------------------------------------

struct Accumulator {
    shared: Arc<SessionShared>,
    backend: Arc<BackendSlot>,
    last_digest: Option<u64>,
    last_presented_at: i64,
    sink_ready: bool,
}

impl Accumulator {
    /// Returns Err only for faults that should abort the session; a per-frame
    /// hiccup is recorded and skipped so one bad frame cannot kill a long capture.
    fn handle_frame(&mut self, frame: &mut Frame) -> Result<(), String> {
        let mut guard = self
            .backend
            .0
            .lock()
            .map_err(|_| "backend mutex poisoned".to_string())?;
        let backend = guard
            .as_mut()
            .ok_or_else(|| "backend not initialised".to_string())?;

        let width = frame.width();
        let height = frame.height();

        if !self.sink_ready {
            backend
                .create_sink(PRIMARY_SINK, width, height)
                .map_err(|e| format!("create_sink failed: {e}"))?;
            self.sink_ready = true;
            if let Ok(mut dims) = self.shared.frame_dims.lock() {
                *dims = Some((width, height));
            }
        }

        let texture = frame.as_raw_texture().clone();
        let digest = backend
            .digest(&texture)
            .map_err(|e| format!("digest failed: {e}"))?;
        let presented_at = frame.timestamp().map(|t| t.Duration).unwrap_or(0);

        let u = f32::from_bits(self.shared.u_bits.load(Ordering::Relaxed));
        let session_time = f64::from_bits(self.shared.session_time_bits.load(Ordering::Relaxed));
        let replay_frame = self.shared.replay_frame.load(Ordering::Relaxed);

        // Duplicate rejection. Because resolve normalises by ACCUMULATED WEIGHT, a
        // rejected frame contributes to neither numerator nor denominator and the
        // exposure stays correct — there is no separate reweighting step.
        let is_duplicate = self.last_digest == Some(digest);
        if is_duplicate {
            self.shared.rejected.fetch_add(1, Ordering::Relaxed);
        } else {
            let weight = f32::from_bits(self.shared.weight_bits.load(Ordering::Relaxed));
            backend
                .accumulate(PRIMARY_SINK, &texture, weight)
                .map_err(|e| format!("accumulate failed: {e}"))?;
            self.shared.accepted.fetch_add(1, Ordering::Relaxed);
            self.last_digest = Some(digest);
        }

        if let Ok(mut log) = self.shared.log.lock() {
            if log.len() < MAX_SAMPLE_LOG {
                log.push(SampleRecord {
                    u,
                    session_time,
                    replay_frame,
                    digest,
                    presented_at,
                    accepted: !is_duplicate,
                });
            }
        }
        self.last_presented_at = presented_at;
        Ok(())
    }
}

impl GraphicsCaptureApiHandler for Accumulator {
    type Flags = HandlerFlags;
    type Error = Box<dyn std::error::Error + Send + Sync>;

    fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
        let shared = ctx.flags.shared;
        let backend_slot = ctx.flags.backend;

        // The worker's Win32 thread id, so `finish` can unblock its message loop.
        // SAFETY: GetCurrentThreadId has no preconditions.
        shared
            .thread_id
            .store(unsafe { GetCurrentThreadId() }, Ordering::SeqCst);

        // Build the compute backend on the device WGC just created for this capture.
        // Using WGC's own device is what removes the interop layer AND the
        // multi-adapter matching problem — there is only ever one device in play.
        let backend = D3d11Backend::new(ctx.device.clone(), ctx.device_context.clone())
            .map_err(|e| -> Self::Error { Box::new(e) })?;
        if let Ok(mut name) = shared.backend_name.lock() {
            *name = Some(backend.name().to_string());
        }
        if let Ok(mut slot) = backend_slot.0.lock() {
            *slot = Some(Box::new(backend));
        }

        Ok(Self {
            shared,
            backend: backend_slot,
            last_digest: None,
            last_presented_at: 0,
            sink_ready: false,
        })
    }

    fn on_frame_arrived(
        &mut self,
        frame: &mut Frame,
        capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        self.shared.saw_frame.store(true, Ordering::Relaxed);

        if self.shared.finish_requested.load(Ordering::SeqCst) {
            capture_control.stop();
            return Ok(());
        }
        if !self.shared.gate_open.load(Ordering::SeqCst) {
            return Ok(());
        }

        if let Err(message) = self.handle_frame(frame) {
            // Record and keep going: a single failed frame must not lose a capture
            // that is otherwise ten seconds into a sixteen-second exposure.
            record_error(&self.shared, message);
        }
        Ok(())
    }

    fn on_closed(&mut self) -> Result<(), Self::Error> {
        // The captured window went away (iRacing exited / closed). Stop accumulating
        // so the session finishes with whatever it has instead of hanging.
        self.shared.gate_open.store(false, Ordering::SeqCst);
        record_error(
            &self.shared,
            "capture target closed during exposure".to_string(),
        );
        Ok(())
    }
}

// --- worker ----------------------------------------------------------------

fn run_session(
    hwnd: isize,
    shared: Arc<SessionShared>,
    backend_slot: Arc<BackendSlot>,
    outcome_tx: Sender<SessionOutcome>,
) {
    let hwnd_ptr = hwnd as *mut std::ffi::c_void;
    let window = Window::from_raw_hwnd(hwnd_ptr);

    let settings = Settings::new(
        window,
        CursorCaptureSettings::WithoutCursor,
        DrawBorderSettings::WithoutBorder,
        SecondaryWindowSettings::Default,
        MinimumUpdateIntervalSettings::Default,
        DirtyRegionSettings::Default,
        // 8-bit RGBA. HDR / Rgba16F is a later question (design note open items);
        // the accumulator is fp32 either way, so widening the source is additive.
        ColorFormat::Rgba8,
        HandlerFlags {
            shared: shared.clone(),
            backend: backend_slot.clone(),
        },
    );

    // Blocks on a message loop until WM_QUIT (posted by `finish`/`abort`) or until
    // the handler stops the capture.
    let capture_result = Accumulator::start(settings);

    if let Err(error) = &capture_result {
        record_error(&shared, format!("capture failed: {error}"));
    }

    // Resolve on THIS thread — the same one that created every D3D11 resource and
    // ran every accumulate. No cross-thread device use anywhere in the session.
    let mut image = None;
    let params = shared.resolve_params.lock().ok().and_then(|g| *g);
    if let Some(params) = params {
        if shared.accepted.load(Ordering::SeqCst) > 0 {
            match backend_slot.0.lock() {
                Ok(mut guard) => match guard.as_mut() {
                    Some(backend) => match backend.resolve(PRIMARY_SINK, &params) {
                        Ok(resolved) => image = Some(resolved),
                        Err(error) => record_error(&shared, format!("resolve failed: {error}")),
                    },
                    None => record_error(&shared, "backend unavailable at resolve".to_string()),
                },
                Err(_) => record_error(&shared, "backend mutex poisoned at resolve".to_string()),
            }
        } else {
            record_error(
                &shared,
                "no frames were accumulated during the exposure".to_string(),
            );
        }
    }

    // Release GPU resources before signalling completion, so the caller can start a
    // new session (or iRacing can reclaim VRAM) without waiting on a drop.
    if let Ok(mut guard) = backend_slot.0.lock() {
        *guard = None;
    }

    let error = shared.last_error.lock().ok().and_then(|g| g.clone());
    let _ = outcome_tx.send(SessionOutcome { image, error });
}

fn post_quit(shared: &SessionShared) {
    let thread_id = shared.thread_id.load(Ordering::SeqCst);
    if thread_id == 0 {
        return;
    }
    // SAFETY: posting WM_QUIT to a thread id is safe regardless of whether the
    // thread still exists; the call simply fails. This is the same mechanism
    // windows-capture's CaptureControl::stop uses, and unlike stopping from the
    // frame handler it works even when the target has stopped presenting.
    unsafe {
        let _ = PostThreadMessageW(thread_id, WM_QUIT, WPARAM::default(), LPARAM::default());
    }
}

// --- N-API surface ---------------------------------------------------------

/// Per-sample diagnostic record handed back to JS for the evenness / duplicate
/// report (design note §7).
#[napi(object)]
pub struct LongExposureSample {
    pub u: f64,
    pub session_time: f64,
    pub replay_frame_num: f64,
    /// Hex, because a 64-bit digest does not survive f64.
    pub digest: String,
    /// WGC SystemRelativeTime in 100ns units, as a string for the same reason.
    pub presented_at: String,
    pub accepted: bool,
}

#[napi(object)]
pub struct LongExposureStats {
    pub accepted: u32,
    pub rejected: u32,
    pub saw_frame: bool,
    /// Dimensions WGC is actually delivering, once the first frame has arrived.
    /// The caller resized the window, but DPI and client-area geometry mean the
    /// delivered size is WGC's to report, not ours to assume — the resolve output
    /// size is derived from these rather than from the requested render size.
    pub frame_width: u32,
    pub frame_height: u32,
    pub error: Option<String>,
}

#[napi(object)]
pub struct LongExposureResult {
    /// Tightly packed 16-bit RGBA, little-endian — the exact layout sharp wants for
    /// `{ raw: { channels: 4, depth: 'ushort' } }`.
    pub data: Option<Buffer>,
    pub width: u32,
    pub height: u32,
    pub accepted: u32,
    pub rejected: u32,
    pub backend: String,
    pub samples: Vec<LongExposureSample>,
    pub error: Option<String>,
}

/// Whether a long-exposure session can run at all. WGC support is checked by the
/// existing `isSupported`; this additionally proves the compute shaders build on
/// this driver, so an unsupported GPU degrades to a clear message rather than
/// failing halfway through a sixteen-second capture.
#[napi(catch_unwind)]
pub fn long_exposure_probe() -> napi::Result<String> {
    // Compiling the kernels needs no device and no GPU work, so this is a cheap,
    // side-effect-free proof that d3dcompiler is present and the source is valid.
    match d3d11::probe_shaders() {
        Ok(()) => Ok("d3d11-compute".to_string()),
        Err(error) => Err(napi::Error::from_reason(format!(
            "long-exposure compute unavailable: {error}"
        ))),
    }
}

/// Which GPU the capture/accumulate path actually runs on.
///
/// `windows-capture` creates its D3D11 device against the DEFAULT adapter, which on
/// a hybrid machine need not be the card iRacing renders on. Surfacing it early
/// turns two otherwise-baffling problems into one log line: compute silently
/// running on an iGPU, and NVIDIA-only features (optical flow) being unable to bind.
#[napi(object)]
pub struct LongExposureDeviceInfo {
    pub adapter: String,
    /// PCI vendor id: 0x10DE NVIDIA, 0x1002 AMD, 0x8086 Intel.
    pub vendor_id: u32,
    pub is_nvidia: bool,
    pub dedicated_video_memory: f64,
}

#[napi(catch_unwind)]
pub fn long_exposure_device_info() -> napi::Result<LongExposureDeviceInfo> {
    // Created exactly the way the capture session's device is, so this reports the
    // adapter we genuinely use rather than a best guess.
    let (device, _context) = windows_capture::d3d11::create_d3d_device()
        .map_err(|e| napi::Error::from_reason(format!("device creation failed: {e}")))?;
    let info = d3d11::describe_device_adapter(&device)
        .map_err(|e| napi::Error::from_reason(format!("adapter query failed: {e}")))?;
    Ok(LongExposureDeviceInfo {
        adapter: info.description,
        vendor_id: info.vendor_id,
        is_nvidia: info.vendor_id == 0x10DE,
        dedicated_video_memory: info.dedicated_video_memory as f64,
    })
}

/// Start accumulating frames of `hwnd`. Returns a session handle. The gate starts
/// CLOSED — call `long_exposure_open_gate` when the replay reaches the window start.
#[napi(catch_unwind)]
pub fn long_exposure_begin(hwnd: f64) -> napi::Result<u32> {
    let shared = Arc::new(SessionShared::default());
    shared.gate_open.store(false, Ordering::SeqCst);
    shared.weight_bits.store(1.0f32.to_bits(), Ordering::SeqCst);
    shared.u_bits.store(0.0f32.to_bits(), Ordering::SeqCst);

    let backend_slot = Arc::new(BackendSlot::new());
    let (outcome_tx, outcome_rx) = mpsc::channel::<SessionOutcome>();

    let hwnd_int = hwnd as isize;
    let worker_shared = shared.clone();
    let worker_backend = backend_slot.clone();

    // Builder::spawn so an OS thread-creation failure surfaces as a catchable Err
    // instead of panicking across the N-API boundary.
    let join = thread::Builder::new()
        .name("wgc-long-exposure".into())
        .spawn(move || {
            run_session(hwnd_int, worker_shared, worker_backend, outcome_tx);
        })
        .map_err(|e| napi::Error::from_reason(format!("long-exposure thread spawn failed: {e}")))?;

    let id = next_session_id();
    sessions()
        .lock()
        .map_err(|_| napi::Error::from_reason("session registry poisoned"))?
        .insert(
            id,
            SessionEntry {
                shared,
                outcome_rx,
                join: Some(join),
            },
        );
    Ok(id)
}

fn with_session<T>(
    id: u32,
    f: impl FnOnce(&SessionEntry) -> napi::Result<T>,
) -> napi::Result<T> {
    let registry = sessions()
        .lock()
        .map_err(|_| napi::Error::from_reason("session registry poisoned"))?;
    let entry = registry
        .get(&id)
        .ok_or_else(|| napi::Error::from_reason(format!("unknown long-exposure session {id}")))?;
    f(entry)
}

/// Push the current sample weight and replay position. Called once per telemetry
/// tick; frames arriving between calls use the last pushed value.
#[napi(catch_unwind)]
pub fn long_exposure_set_sample(
    session: u32,
    weight: f64,
    u: f64,
    replay_frame_num: f64,
    session_time: f64,
) -> napi::Result<()> {
    with_session(session, |entry| {
        entry
            .shared
            .weight_bits
            .store((weight as f32).to_bits(), Ordering::Relaxed);
        entry
            .shared
            .u_bits
            .store((u as f32).to_bits(), Ordering::Relaxed);
        entry
            .shared
            .session_time_bits
            .store(session_time.to_bits(), Ordering::Relaxed);
        entry
            .shared
            .replay_frame
            .store(replay_frame_num as i64, Ordering::Relaxed);
        Ok(())
    })
}

/// Open or close the accumulation gate. Closing is how termination is enforced: a
/// frame arriving after the anchor can never join the exposure.
#[napi(catch_unwind)]
pub fn long_exposure_set_gate(session: u32, open: bool) -> napi::Result<()> {
    with_session(session, |entry| {
        entry.shared.gate_open.store(open, Ordering::SeqCst);
        Ok(())
    })
}

#[napi(catch_unwind)]
pub fn long_exposure_stats(session: u32) -> napi::Result<LongExposureStats> {
    with_session(session, |entry| {
        let (frame_width, frame_height) = entry
            .shared
            .frame_dims
            .lock()
            .ok()
            .and_then(|g| *g)
            .unwrap_or((0, 0));
        Ok(LongExposureStats {
            accepted: entry.shared.accepted.load(Ordering::Relaxed),
            rejected: entry.shared.rejected.load(Ordering::Relaxed),
            saw_frame: entry.shared.saw_frame.load(Ordering::Relaxed),
            frame_width,
            frame_height,
            error: entry.shared.last_error.lock().ok().and_then(|g| g.clone()),
        })
    })
}

fn take_session(id: u32) -> napi::Result<SessionEntry> {
    sessions()
        .lock()
        .map_err(|_| napi::Error::from_reason("session registry poisoned"))?
        .remove(&id)
        .ok_or_else(|| napi::Error::from_reason(format!("unknown long-exposure session {id}")))
}

fn finalize(
    mut entry: SessionEntry,
    timeout_ms: u32,
) -> napi::Result<(Option<ResolvedImage>, Option<String>, SessionEntry)> {
    post_quit(&entry.shared);

    let outcome = match entry
        .outcome_rx
        .recv_timeout(Duration::from_millis(timeout_ms as u64))
    {
        Ok(outcome) => outcome,
        Err(RecvTimeoutError::Timeout) => SessionOutcome {
            image: None,
            error: Some("long-exposure session did not finish in time".to_string()),
        },
        Err(RecvTimeoutError::Disconnected) => SessionOutcome {
            image: None,
            error: Some("long-exposure worker exited without a result".to_string()),
        },
    };

    if let Some(join) = entry.join.take() {
        // The worker has already sent its outcome, so this join is immediate. If it
        // somehow is not (timeout path), we deliberately leak the thread rather than
        // block the Electron main process — the same trade the one-shot path makes.
        if join.is_finished() {
            let _ = join.join();
        }
    }

    Ok((outcome.image, outcome.error, entry))
}

/// Stop accumulating, resolve, and return the 16-bit master plus the per-sample
/// diagnostic log. Consumes the session.
#[napi(catch_unwind)]
pub fn long_exposure_finish(
    session: u32,
    out_width: u32,
    out_height: u32,
    supersample: u32,
    tonemap: u32,
    exposure_mul: f64,
    timeout_ms: u32,
) -> napi::Result<LongExposureResult> {
    let entry = take_session(session)?;
    entry.shared.gate_open.store(false, Ordering::SeqCst);

    if let Ok(mut params) = entry.shared.resolve_params.lock() {
        *params = Some(ResolveParams {
            out_width,
            out_height,
            supersample: supersample.max(1),
            tonemap: Tonemap::from_u32(tonemap),
            exposure_mul: exposure_mul as f32,
        });
    }
    entry.shared.finish_requested.store(true, Ordering::SeqCst);

    let (image, error, entry) = finalize(entry, timeout_ms)?;

    let samples = entry
        .shared
        .log
        .lock()
        .map(|log| {
            log.iter()
                .map(|record| LongExposureSample {
                    u: record.u as f64,
                    session_time: record.session_time,
                    replay_frame_num: record.replay_frame as f64,
                    digest: format!("{:016x}", record.digest),
                    presented_at: record.presented_at.to_string(),
                    accepted: record.accepted,
                })
                .collect()
        })
        .unwrap_or_default();

    let backend = entry
        .shared
        .backend_name
        .lock()
        .ok()
        .and_then(|g| g.clone())
        .unwrap_or_else(|| "unknown".to_string());

    let (data, width, height) = match image {
        Some(resolved) => (
            Some(Buffer::from(resolved.data)),
            resolved.width,
            resolved.height,
        ),
        None => (None, 0, 0),
    };

    Ok(LongExposureResult {
        data,
        width,
        height,
        accepted: entry.shared.accepted.load(Ordering::SeqCst),
        rejected: entry.shared.rejected.load(Ordering::SeqCst),
        backend,
        samples,
        error,
    })
}

/// Tear a session down without resolving. Used on every failure and abort path, so
/// the GPU resources and the capture thread are always released even when the shot
/// is discarded.
#[napi(catch_unwind)]
pub fn long_exposure_abort(session: u32, timeout_ms: u32) -> napi::Result<()> {
    let entry = match take_session(session) {
        Ok(entry) => entry,
        // Already finished/aborted — idempotent by design, because this is called
        // from cleanup paths that must never themselves throw.
        Err(_) => return Ok(()),
    };
    entry.shared.gate_open.store(false, Ordering::SeqCst);
    if let Ok(mut params) = entry.shared.resolve_params.lock() {
        *params = None;
    }
    entry.shared.finish_requested.store(true, Ordering::SeqCst);
    let _ = finalize(entry, timeout_ms)?;
    Ok(())
}
