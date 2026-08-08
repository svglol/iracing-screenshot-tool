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
mod nvof;

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
    ColorFormat, DirtyRegionSettings, MinimumUpdateIntervalSettings, SecondaryWindowSettings,
    Settings,
};
use windows_capture::window::Window;

use backend::{
    AccumulateBackend, InterpolationStatus, ResolveParams, ResolvedImage, SampleOutcome, Tonemap,
};
use d3d11::D3d11Backend;

/// v1 accumulates into exactly one sink. The backend and the router both support N
/// (that is the bracketing seam); only the session's `create_sink` call is singular.
const PRIMARY_SINK: &str = "primary";

/// Cap on the per-sample diagnostic log handed back to JS.
///
/// Sized so no EXPRESSIBLE recipe can reach it. The worst case the UI can build is
/// the slowest stop at the slowest playback speed against the highest render rate we
/// will believe: 10" x 16 x 360 fps (MAX_USABLE_RENDER_FPS) = 57,600 samples. The
/// previous 8192 was sized for a 1-second exposure and the 2"/5"/10" stops outran it
/// — a 10" at 1/16 and a routine 73 fps is ~11,700 samples, so the log held the first
/// 71% of the shot and every metric derived from it (gaps, evenness, achieved window)
/// silently described that prefix. Accumulation was never affected; the accepted
/// COUNT comes from an uncapped counter and the accumulator is the shot.
///
/// Still a bound, not a removal: the exposure terminates on ReplayFrameNum, and if
/// that safety net ever failed this caps a runaway session at ~3 minutes of 360 fps
/// delivery. 65536 records is ~3 MB resident, and the log is a Vec that only grows to
/// what a shot actually uses.
const MAX_SAMPLE_LOG: usize = 65536;

/// One accumulated (or rejected) frame, for the evenness / duplicate report.
struct SampleRecord {
    u: f32,
    session_time: f64,
    replay_frame: i64,
    digest: u64,
    presented_at: i64,
    accepted: bool,
    /// Which pass of a multi-pass capture produced this sample. The evenness metrics
    /// are computed PER PASS — merged across passes, sample gaps are near-exponential
    /// and `median/max` collapses on a perfectly healthy shot.
    pass: u32,
}

/// Bookkeeping for the asynchronous digest readback: which sample each outstanding
/// digest belongs to, and the last one seen, so duplicates can be spotted in order.
#[derive(Default)]
struct DigestTracking {
    /// Log index per submitted digest, in submission order. `None` once the sample
    /// log has hit its cap and the sample was not recorded.
    pending: std::collections::VecDeque<Option<usize>>,
    last: Option<u64>,
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

    /// Sink ids for this session, in the order weights are pushed. Exactly one
    /// ("primary") for an ordinary shot; N shutter keys for a bracket, where every
    /// stop shares the same terminal frame and differs only in how far back its
    /// window reaches (`docs/design/long-exposure-bracketing.md`).
    sink_ids: Mutex<Vec<String>>,
    /// Current weight for each sink, parallel to `sink_ids`.
    ///
    /// NEGATIVE MEANS CLOSED, and that is load-bearing rather than a convention of
    /// convenience: a weight of exactly ZERO is a legitimate contribution — linear
    /// weighting is 0 at the start of its own window — and the single-sink path has
    /// always accumulated those frames, counting them in `accepted`. Skipping on
    /// `w == 0.0` would silently change the sample count of every linear/ease shot.
    /// So the router sends -1 for a sink whose window is not open on this tick, and
    /// only that is skipped.
    sink_weights: Mutex<Vec<f32>>,
    /// REAL frames each sink actually took, parallel to `sink_ids`.
    ///
    /// Per-SINK, unlike `accepted` below, which counts frames CONSUMED by the
    /// session. The two differ precisely when bracketing is on: a fast stop's
    /// window opens later, so it takes a subset of the frames the session
    /// consumed. Without this, every stop's sidecar reported the session count and
    /// a 1/1000 stop claimed the same sample count as the 1/30 it came from.
    sink_accepted: Mutex<Vec<u32>>,
    /// f64 bits of the current ReplaySessionTime.
    session_time_bits: AtomicU64,
    replay_frame: AtomicI64,

    /// Which pass of a multi-pass capture is currently accumulating. 0 for an
    /// ordinary single-pass shot, so every sample carries a meaningful value whether
    /// or not the feature is used.
    pass_index: AtomicU32,
    /// Set by `long_exposure_begin_pass`, consumed by the capture thread on the next
    /// gated-in frame. A FLAG rather than an edge on `gate_open`, because JS re-stores
    /// the gate on every telemetry tick and there is no reliable edge in it.
    pass_reset: AtomicBool,

    finish_requested: AtomicBool,
    /// REAL captured frames accumulated. Deliberately never merged with
    /// `synthesized`: the specific risk of interpolation is that the extra GPU work
    /// slows frame consumption below iRacing's present rate, so we manufacture
    /// synthetic samples at the cost of real ones. A combined total would hide
    /// exactly that. Compare this number with interpolation on vs off.
    accepted: AtomicU32,
    /// Interpolated in-between frames accumulated. 0 when interpolation is off.
    synthesized: AtomicU32,
    rejected: AtomicU32,
    /// Wall time spent inside the frame handler, for the same reason: it is the
    /// direct measure of whether we can still keep up with the sim.
    ///
    /// The FIRST frame is excluded and reported separately as `setup_ns`. It does
    /// sink allocation, shader constant setup and — when interpolation is on — the
    /// whole NVOFA session creation, which ran ~30 ms and swamped the mean on short
    /// exposures. Folding one-time cost into a steady-state average made the metric
    /// lie exactly when the exposure was shortest.
    frame_time_total_ns: AtomicU64,
    frame_time_max_ns: AtomicU64,
    /// Frames counted into the total above; excludes the setup frame.
    timed_frames: AtomicU32,
    setup_ns: AtomicU64,

    digests: Mutex<DigestTracking>,

    /// 1 = off. Read once, when the first frame establishes the frame size.
    interpolation_factor: AtomicU32,
    /// f32 bits of the highlight-recovery strength, in stops. 0 = off.
    highlight_recovery_bits: AtomicU32,
    /// Filled in once the backend has reported what it could negotiate.
    interpolation: Mutex<Option<InterpolationStatus>>,
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
    /// One entry per sink that resolved, in `sink_ids` order. A single-sink shot
    /// yields exactly one, which is what `finish` reports as the master.
    images: Vec<(String, ResolvedImage)>,
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

/// The session's sink ids, defaulting to the single primary sink so a caller that
/// never declared any behaves exactly as it did before bracketing existed.
fn sink_ids_of(shared: &SessionShared) -> Vec<String> {
    let ids = shared
        .sink_ids
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default();
    if ids.is_empty() {
        vec![PRIMARY_SINK.to_string()]
    } else {
        ids
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
    /// Snapshot of the session's sink ids. Cloned rather than held, because the
    /// backend calls below take `&mut` and must not run under this lock.
    fn sink_ids(&self) -> Vec<String> {
        sink_ids_of(&self.shared)
    }

    /// Snapshot of the current per-sink weights. Same reason as above, and it is a
    /// short lock on a vector of at most a dozen floats — the same shape as the
    /// per-frame `digests` lock this path already takes.
    fn sink_weights(&self) -> Vec<f32> {
        self.shared
            .sink_weights
            .lock()
            .map(|guard| guard.clone())
            .unwrap_or_default()
    }

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

        // A pass boundary, consumed exactly once. Must happen BEFORE anything touches
        // the retained frame, or this pass's first in-betweens warp across the whole
        // window (see `AccumulateBackend::begin_pass`).
        if self.shared.pass_reset.swap(false, Ordering::SeqCst) {
            backend.begin_pass();
            // Cross-pass digest comparison is meaningless: the last frame of a pass and
            // the first of the next are the two ENDS of the window, and on a static
            // scene they can legitimately hash equal — which would report a duplicate
            // that is nothing of the kind, once per pass. Cost of clearing it: a
            // genuine duplicate in the two or three frames still in flight from the
            // previous pass goes uncounted. Under-reporting beats manufacturing.
            if let Ok(mut tracking) = self.shared.digests.lock() {
                tracking.last = None;
            }
        }

        let width = frame.width();
        let height = frame.height();

        // FIRST, BEFORE ANYTHING ELSE TOUCHES THE PIXELS, and before this function can
        // return and hand the surface back to WGC: take our own copy and wait for it.
        //
        // The frame pool `windows-capture` creates is ONE buffer deep, and the frame is
        // released the moment `on_frame_arrived` returns — so every pass below used to
        // be reading a surface the compositor was free to overwrite, because the D3D11
        // immediate context orders our submissions against our own work and against
        // nothing the compositor does. It was a race whose outcome depended on how far
        // behind the GPU happened to be running, which is why it never showed on the
        // development machine and reproduced on every shot on a loaded one: a field
        // report on Windows 10 22H2 came back with EVERY frame content-identical
        // (`rejected == accepted - passes` on every run, against `rejected: 0` on every
        // dev-box shot) and a black master, in the same app session where an ordinary
        // still screenshot of the same window at the same size succeeded — that path
        // maps the frame synchronously while it is still alive, and so was never
        // exposed. See `AccumulateBackend::retain_frame`.
        let texture = backend
            .retain_frame(frame.as_raw_texture())
            .map_err(|e| format!("retaining the captured frame failed: {e}"))?;

        if !self.sink_ready {
            // Every sink is created here, on the first real frame, because this is
            // where the frame size is established — the same reason interpolation is
            // set up here. A bracket's accumulators are all the same size.
            for id in self.sink_ids() {
                backend
                    .create_sink(&id, width, height)
                    .map_err(|e| format!("create_sink '{id}' failed: {e}"))?;
            }
            self.sink_ready = true;
            if let Ok(mut dims) = self.shared.frame_dims.lock() {
                *dims = Some((width, height));
            }

            // Highlight recovery is a pure shader constant, so it only has to be set
            // before the first accumulate.
            backend.set_highlight_recovery(f32::from_bits(
                self.shared.highlight_recovery_bits.load(Ordering::SeqCst),
            ));

            // Interpolation is set up from the FIRST REAL FRAME, so its width, height
            // and pixel format come from what WGC is actually delivering rather than
            // from what we asked for. It cannot fail the session: an unsupported GPU
            // reports a reason and the capture proceeds without it.
            let factor = self.shared.interpolation_factor.load(Ordering::SeqCst);
            let status = backend.enable_interpolation(factor, &texture);
            if let Ok(mut slot) = self.shared.interpolation.lock() {
                *slot = Some(status);
            }
        }
        // Submitted, never awaited. See `submit_digest` for why this stopped being a
        // blocking readback: the sync was costing two real frames in three at 5K.
        backend
            .submit_digest(&texture)
            .map_err(|e| format!("digest failed: {e}"))?;
        let presented_at = frame.timestamp().map(|t| t.Duration).unwrap_or(0);

        let u = f32::from_bits(self.shared.u_bits.load(Ordering::Relaxed));
        let session_time = f64::from_bits(self.shared.session_time_bits.load(Ordering::Relaxed));
        let replay_frame = self.shared.replay_frame.load(Ordering::Relaxed);

        // Every frame is accumulated. Duplicates are DETECTED, a frame or two later,
        // and reported — never excluded. Resolve normalises by accumulated weight, so
        // a duplicate only gives one instant double weight among hundreds of samples;
        // that is negligible next to the real frames the old synchronous check cost us.
        //
        // One accumulate per OPEN sink. With interpolation off each is a plain
        // dispatch against that sink's own accumulator, so the cost is linear in
        // sinks and nothing else changes. With interpolation ON the fused warp
        // kernel re-warps per sink — known, structural, and documented in
        // `long-exposure-bracketing.md` §3.1; it is a cost, not a defect.
        let ids = self.sink_ids();
        let weights = self.sink_weights();
        let mut outcome = SampleOutcome {
            real: 0,
            synthetic: 0,
        };
        let mut counted = false;
        for (index, id) in ids.iter().enumerate() {
            // Negative = this sink's window is not open on this tick. Zero is a real
            // contribution and is accumulated — see `sink_weights`.
            let weight = weights.get(index).copied().unwrap_or(-1.0);
            if weight < 0.0 {
                continue;
            }
            let sample = backend
                .accumulate_sample(id, &texture, weight)
                .map_err(|e| format!("accumulate '{id}' failed: {e}"))?;
            // This sink's OWN tally — the only number that can answer "how many
            // samples went into THIS stop".
            if let Ok(mut tally) = self.shared.sink_accepted.lock() {
                if let Some(slot) = tally.get_mut(index) {
                    *slot = slot.saturating_add(sample.real);
                }
            }
            // `accepted`/`synthesized` count frames CONSUMED, which is a property of
            // the session and not of a sink — so they are folded once, from the first
            // sink to take this frame, however many sinks it then lands in.
            if !counted {
                outcome = sample;
                counted = true;
            }
        }
        self.shared
            .accepted
            .fetch_add(outcome.real, Ordering::Relaxed);
        self.shared
            .synthesized
            .fetch_add(outcome.synthetic, Ordering::Relaxed);

        // Remember where this sample's log entry went so its digest can be filled in
        // when the GPU hands it back. `None` once the log is capped.
        let log_index = if let Ok(mut log) = self.shared.log.lock() {
            if log.len() < MAX_SAMPLE_LOG {
                log.push(SampleRecord {
                    u,
                    session_time,
                    replay_frame,
                    digest: 0,
                    presented_at,
                    accepted: true,
                    pass: self.shared.pass_index.load(Ordering::Relaxed),
                });
                Some(log.len() - 1)
            } else {
                None
            }
        } else {
            None
        };
        if let Ok(mut tracking) = self.shared.digests.lock() {
            tracking.pending.push_back(log_index);
        }

        // Collect whatever the GPU has finished. Non-blocking by construction, so a
        // frame still in flight simply arrives on a later call.
        let ready = backend.poll_digests();
        drop(guard);
        absorb_digests(&self.shared, &ready);

        self.last_presented_at = presented_at;
        Ok(())
    }

}

/// Match completed digests to the samples that produced them, in submission order,
/// and count duplicates.
///
/// Lives on `SessionShared` rather than on the handler so the worker thread can do
/// the final blocking drain after the capture loop has already torn the handler down.
fn absorb_digests(shared: &SessionShared, digests: &[u64]) {
    if digests.is_empty() {
        return;
    }
    let (Ok(mut tracking), Ok(mut log)) = (shared.digests.lock(), shared.log.lock()) else {
        return;
    };
    for &digest in digests {
        let Some(log_index) = tracking.pending.pop_front() else {
            break;
        };
        let is_duplicate = tracking.last == Some(digest);
        if let Some(index) = log_index {
            if let Some(record) = log.get_mut(index) {
                record.digest = digest;
                // `accepted` now means "carried NEW CONTENT", not "was accumulated" —
                // every frame is accumulated. A false here is what the evenness report
                // reads as a duplicate.
                record.accepted = !is_duplicate;
            }
        }
        if is_duplicate {
            shared.rejected.fetch_add(1, Ordering::Relaxed);
        }
        tracking.last = Some(digest);
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

        // Timed because interpolation's whole risk is that it makes this slower than
        // iRacing presents, at which point we drop real samples to manufacture
        // synthetic ones — a net loss. Measuring is how that stays visible.
        let is_setup_frame = !self.sink_ready;
        let started = std::time::Instant::now();
        let result = self.handle_frame(frame);
        let elapsed = started.elapsed().as_nanos() as u64;
        if is_setup_frame {
            // One-time cost. Reported on its own rather than averaged in.
            self.shared.setup_ns.store(elapsed, Ordering::Relaxed);
        } else {
            self.shared
                .frame_time_total_ns
                .fetch_add(elapsed, Ordering::Relaxed);
            self.shared
                .frame_time_max_ns
                .fetch_max(elapsed, Ordering::Relaxed);
            self.shared.timed_frames.fetch_add(1, Ordering::Relaxed);
        }

        if let Err(message) = result {
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
        // Negotiated, not demanded: asking for a setting whose backing WinRT
        // property is missing is a hard error that would fail every frame of the
        // exposure. See the helpers in lib.rs for what each degradation costs.
        crate::negotiated_cursor_settings(),
        crate::negotiated_border_settings(),
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

    // The capture loop has stopped, so blocking costs nothing: collect the two or
    // three digests still in flight and finish the diagnostic log. Done on this
    // thread, which owns the device, and before resolve.
    {
        let remaining = match backend_slot.0.lock() {
            Ok(mut guard) => match guard.as_mut() {
                Some(backend) => backend.drain_digests(),
                None => Vec::new(),
            },
            Err(_) => Vec::new(),
        };
        absorb_digests(&shared, &remaining);
    }

    // Resolve on THIS thread — the same one that created every D3D11 resource and
    // ran every accumulate. No cross-thread device use anywhere in the session.
    //
    // EVERY sink is resolved before the session is torn down, because `finish`
    // consumes it — there is no second chance to read a bracket stop's accumulator.
    // A sink that fails to resolve is recorded and skipped rather than failing the
    // shot: losing one bracket stop must not lose the ten that worked.
    let mut images: Vec<(String, ResolvedImage)> = Vec::new();
    let params = shared.resolve_params.lock().ok().and_then(|g| *g);
    if let Some(params) = params {
        if shared.accepted.load(Ordering::SeqCst) > 0 {
            match backend_slot.0.lock() {
                Ok(mut guard) => match guard.as_mut() {
                    Some(backend) => {
                        for id in sink_ids_of(&shared) {
                            match backend.resolve(&id, &params) {
                                Ok(resolved) => images.push((id, resolved)),
                                Err(error) => record_error(
                                    &shared,
                                    format!("resolve '{id}' failed: {error}"),
                                ),
                            }
                        }
                    }
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
    let _ = outcome_tx.send(SessionOutcome { images, error });
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
    /// Which pass of a multi-pass capture produced this sample; 0 on a single-pass
    /// shot. Evenness and gap metrics are computed within a pass, never across.
    pub pass: u32,
}

/// What frame interpolation actually did, reported alongside every capture.
///
/// `enabled: false` with a `reason` is normal and expected on non-NVIDIA hardware.
#[napi(object)]
pub struct LongExposureInterpolationReport {
    pub enabled: bool,
    pub factor: u32,
    pub reason: Option<String>,
    pub grid_size: u32,
    pub bidirectional: bool,
}

#[napi(object)]
pub struct LongExposureStats {
    pub accepted: u32,
    /// Interpolated in-between frames. Kept separate from `accepted` on purpose —
    /// see the note on `SessionShared::accepted`.
    pub synthesized: u32,
    pub rejected: u32,
    pub saw_frame: bool,
    /// Mean and worst wall time spent consuming one frame, in milliseconds,
    /// EXCLUDING the first frame. The budget is one iRacing present (~25 ms at the
    /// measured 39 fps at 5K); crossing it means we are the bottleneck rather than
    /// the sim.
    pub mean_frame_ms: f64,
    pub max_frame_ms: f64,
    /// The first frame on its own: sink allocation plus, when interpolation is on,
    /// NVOFA session creation. One-time, and large enough (~30 ms) to swamp the mean
    /// on a short exposure if it were folded in.
    pub setup_frame_ms: f64,
    pub interpolation: Option<LongExposureInterpolationReport>,
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
    ///
    /// The FIRST sink's image, which for a single-sink shot is the only one and for
    /// a bracket is the stop the user actually chose. Kept as a top-level field so
    /// every caller written before bracketing keeps working unchanged.
    pub data: Option<Buffer>,
    pub width: u32,
    pub height: u32,
    /// Every resolved sink, in the order the ids were given to `begin` — one entry
    /// for an ordinary shot, N for a bracket. Additive: `data` above is this list's
    /// first entry.
    pub images: Vec<LongExposureSinkImage>,
    pub accepted: u32,
    pub synthesized: u32,
    pub rejected: u32,
    pub backend: String,
    pub mean_frame_ms: f64,
    pub max_frame_ms: f64,
    pub setup_frame_ms: f64,
    pub interpolation: Option<LongExposureInterpolationReport>,
    pub samples: Vec<LongExposureSample>,
    pub error: Option<String>,
}

/// One resolved accumulator. `sink_id` is the id given to `begin` — 'primary' for
/// an ordinary shot, a shutter key such as '1/125' for a bracket stop.
#[napi(object)]
pub struct LongExposureSinkImage {
    pub sink_id: String,
    pub data: Option<Buffer>,
    pub width: u32,
    pub height: u32,
    /// REAL frames THIS sink took. Equal to the session's `accepted` for an
    /// ordinary shot; strictly smaller for a bracket stop whose window opened
    /// later than the primary's.
    pub accepted: u32,
}

/// Shared by `stats` and `finish` so the two can never disagree.
fn interpolation_report(shared: &SessionShared) -> Option<LongExposureInterpolationReport> {
    shared
        .interpolation
        .lock()
        .ok()
        .and_then(|g| g.clone())
        .map(|status| LongExposureInterpolationReport {
            enabled: status.enabled,
            factor: status.factor,
            reason: status.reason,
            grid_size: status.grid_size,
            bidirectional: status.bidirectional,
        })
}

/// Mean and max frame-handler wall time, in ms. `frames` is the number of frames the
/// handler actually ran for — accepted plus rejected, since both were processed.
fn frame_timings(shared: &SessionShared) -> (f64, f64, f64) {
    let frames = shared.timed_frames.load(Ordering::Relaxed);
    let total_ns = shared.frame_time_total_ns.load(Ordering::Relaxed) as f64;
    let max_ns = shared.frame_time_max_ns.load(Ordering::Relaxed) as f64;
    let setup_ns = shared.setup_ns.load(Ordering::Relaxed) as f64;
    let mean_ms = if frames == 0 {
        0.0
    } else {
        total_ns / frames as f64 / 1.0e6
    };
    (mean_ms, max_ns / 1.0e6, setup_ns / 1.0e6)
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

/// Whether NVIDIA's hardware optical-flow accelerator can drive frame interpolation
/// on this machine, and what it negotiated.
///
/// NVOFA is Turing-and-newer NVIDIA only. It is an OPTIONAL accelerator: everything
/// here fails soft to interpolation-off, and none of it may gate the base
/// long-exposure feature. `available: false` with a `reason` is a normal, expected
/// outcome on AMD, Intel, pre-Turing NVIDIA, and hybrid laptops where WGC's device
/// landed on the iGPU.
#[napi(object)]
pub struct LongExposureInterpolationInfo {
    pub available: bool,
    pub reason: Option<String>,
    /// One flow vector per `grid_size` x `grid_size` pixels (1, 2 or 4).
    pub grid_size: u32,
    /// True when the driver gave us backward flow too — that is what makes the
    /// forward/backward consistency check, and so occlusion handling, possible.
    pub bidirectional: bool,
    pub input_format: String,
    pub api_version: String,
}

#[napi(catch_unwind)]
pub fn long_exposure_interpolation_info(
    width: u32,
    height: u32,
) -> napi::Result<LongExposureInterpolationInfo> {
    // Probed on a device created exactly the way the capture session's is, because
    // NVOFA binds to a specific adapter and "which GPU did WGC land on" is the whole
    // question on a hybrid machine.
    let (device, context) = windows_capture::d3d11::create_d3d_device()
        .map_err(|e| napi::Error::from_reason(format!("device creation failed: {e}")))?;
    let support = nvof::probe(&device, &context, width.max(1), height.max(1));
    Ok(LongExposureInterpolationInfo {
        available: support.available,
        reason: support.reason,
        grid_size: support.grid_size,
        bidirectional: support.bidirectional,
        input_format: support.input_format.to_string(),
        api_version: support.api_version,
    })
}

/// Start accumulating frames of `hwnd`. Returns a session handle. The gate starts
/// CLOSED — call `long_exposure_open_gate` when the replay reaches the window start.
/// `interpolation_factor`: 1 disables interpolation entirely (the default and the
/// only behaviour before this existed); 2, 4 or 8 request that many samples per
/// captured frame, of which factor-1 are synthesised. Requesting it on hardware that
/// cannot do it is not an error — the session reports `interpolation.enabled: false`
/// with a reason and captures exactly as it would have.
///
/// `highlight_recovery_stops`: gain applied to near-clipped values before
/// accumulation, in stops. 0 (the default) is off and is exactly identity. Unlike
/// interpolation this needs no special hardware and behaves identically on every GPU.
///
/// `sink_ids`: one accumulator is created per id, all the same size, and `finish`
/// returns one image per id. Omitted or empty means the single "primary" sink, which
/// is exactly what every shot did before bracketing. Each accumulator costs
/// width x height x 16 bytes of VRAM, so the caller is responsible for pre-flighting
/// the total — see `estimateLongExposureVram`.
#[napi(catch_unwind)]
pub fn long_exposure_begin(
    hwnd: f64,
    interpolation_factor: Option<u32>,
    highlight_recovery_stops: Option<f64>,
    sink_ids: Option<Vec<String>>,
) -> napi::Result<u32> {
    let shared = Arc::new(SessionShared::default());
    shared.gate_open.store(false, Ordering::SeqCst);
    shared.weight_bits.store(1.0f32.to_bits(), Ordering::SeqCst);
    shared.u_bits.store(0.0f32.to_bits(), Ordering::SeqCst);

    let ids = match sink_ids {
        Some(ids) if !ids.is_empty() => ids,
        _ => vec![PRIMARY_SINK.to_string()],
    };
    if let Ok(mut guard) = shared.sink_weights.lock() {
        // Full weight until the router says otherwise, matching `weight_bits` above.
        // The gate is closed here, so nothing accumulates before the first push.
        *guard = vec![1.0f32; ids.len()];
    }
    if let Ok(mut guard) = shared.sink_accepted.lock() {
        *guard = vec![0u32; ids.len()];
    }
    if let Ok(mut guard) = shared.sink_ids.lock() {
        *guard = ids;
    }
    // Clamped rather than rejected: an out-of-range factor from a stale recipe should
    // degrade, not fail a shot.
    shared.interpolation_factor.store(
        interpolation_factor.unwrap_or(1).clamp(1, 8),
        Ordering::SeqCst,
    );
    shared.highlight_recovery_bits.store(
        (highlight_recovery_stops.unwrap_or(0.0) as f32).to_bits(),
        Ordering::SeqCst,
    );

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
///
/// `sink_weights`: one weight per sink, in the order the ids were given to `begin`.
/// A NEGATIVE entry means that sink's window is not open on this tick and the frame
/// is not offered to it; zero is a real contribution and IS accumulated, because
/// linear weighting is legitimately 0 at the start of its own window. Omitted means
/// the single-sink shape, where `weight` alone drives the one accumulator.
#[napi(catch_unwind)]
pub fn long_exposure_set_sample(
    session: u32,
    weight: f64,
    u: f64,
    replay_frame_num: f64,
    session_time: f64,
    sink_weights: Option<Vec<f64>>,
) -> napi::Result<()> {
    with_session(session, |entry| {
        if let Ok(mut guard) = entry.shared.sink_weights.lock() {
            match sink_weights.as_ref() {
                // Written element-wise into the existing vector so a caller that
                // sends the wrong length cannot resize the session's sink set.
                Some(values) => {
                    for (slot, value) in guard.iter_mut().zip(values.iter()) {
                        *slot = *value as f32;
                    }
                }
                None => {
                    if let Some(first) = guard.first_mut() {
                        *first = weight as f32;
                    }
                }
            }
        }
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

/// Declare that the replay has been re-positioned and the exposure window is about
/// to be visited again — the multi-pass entry point
/// (`docs/design/long-exposure-multi-pass.md`).
///
/// The ACCUMULATOR IS NOT CLEARED, which is the entire point: passes sum, and the
/// resolve normalises per pixel by accumulated weight, so N passes of the same window
/// come out at the same brightness as one, with N times the real samples. What IS
/// discarded is retained inter-frame state, because the pass's first frame is not
/// temporally adjacent to the previous pass's last.
///
/// Call it with the gate CLOSED, before rolling each pass — including pass 0, so
/// every sample carries a correct `pass` whether or not more than one is used.
#[napi(catch_unwind)]
pub fn long_exposure_begin_pass(session: u32, pass_index: u32) -> napi::Result<()> {
    with_session(session, |entry| {
        entry
            .shared
            .pass_index
            .store(pass_index, Ordering::SeqCst);
        entry.shared.pass_reset.store(true, Ordering::SeqCst);
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
        let (mean_frame_ms, max_frame_ms, setup_frame_ms) = frame_timings(&entry.shared);
        Ok(LongExposureStats {
            setup_frame_ms,
            accepted: entry.shared.accepted.load(Ordering::Relaxed),
            synthesized: entry.shared.synthesized.load(Ordering::Relaxed),
            rejected: entry.shared.rejected.load(Ordering::Relaxed),
            saw_frame: entry.shared.saw_frame.load(Ordering::Relaxed),
            mean_frame_ms,
            max_frame_ms,
            interpolation: interpolation_report(&entry.shared),
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
) -> napi::Result<(Vec<(String, ResolvedImage)>, Option<String>, SessionEntry)> {
    post_quit(&entry.shared);

    let outcome = match entry
        .outcome_rx
        .recv_timeout(Duration::from_millis(timeout_ms as u64))
    {
        Ok(outcome) => outcome,
        Err(RecvTimeoutError::Timeout) => SessionOutcome {
            images: Vec::new(),
            error: Some("long-exposure session did not finish in time".to_string()),
        },
        Err(RecvTimeoutError::Disconnected) => SessionOutcome {
            images: Vec::new(),
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

    Ok((outcome.images, outcome.error, entry))
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

    let (resolved_images, error, entry) = finalize(entry, timeout_ms)?;

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
                    pass: record.pass,
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

    // Sink ids and their tallies share an index, assigned at `begin` and preserved
    // by the resolve loop.
    let sink_order = sink_ids_of(&entry.shared);
    let tallies = entry
        .shared
        .sink_accepted
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default();
    let images: Vec<LongExposureSinkImage> = resolved_images
        .into_iter()
        .map(|(sink_id, resolved)| {
            let accepted = sink_order
                .iter()
                .position(|id| *id == sink_id)
                .and_then(|index| tallies.get(index).copied())
                .unwrap_or(0);
            LongExposureSinkImage {
                sink_id,
                data: Some(Buffer::from(resolved.data)),
                width: resolved.width,
                height: resolved.height,
                accepted,
            }
        })
        .collect();
    // The primary is the first sink, by construction: `begin` puts the chosen stop
    // at index 0 and the resolve loop preserves that order.
    let (data, width, height) = match images.first() {
        Some(first) => (
            first.data.as_ref().map(|b| Buffer::from(b.to_vec())),
            first.width,
            first.height,
        ),
        None => (None, 0, 0),
    };

    let (mean_frame_ms, max_frame_ms, setup_frame_ms) = frame_timings(&entry.shared);
    Ok(LongExposureResult {
        setup_frame_ms,
        data,
        width,
        height,
        images,
        accepted: entry.shared.accepted.load(Ordering::SeqCst),
        synthesized: entry.shared.synthesized.load(Ordering::SeqCst),
        rejected: entry.shared.rejected.load(Ordering::SeqCst),
        backend,
        mean_frame_ms,
        max_frame_ms,
        interpolation: interpolation_report(&entry.shared),
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
