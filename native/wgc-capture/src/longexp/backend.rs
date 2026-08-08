//! The compute-backend boundary for long-exposure accumulation.
//!
//! Design note §5: accumulate / digest / resolve sit behind this narrow interface,
//! chosen at runtime. A D3D11 texture goes in, accumulator state is updated, an
//! image comes out. **Nothing above this line knows which backend is active** — the
//! capture session, the sink router, the replay control and all of the TypeScript
//! are backend-agnostic.
//!
//! That is what makes a non-NVIDIA path additive later rather than a rewrite, and
//! it is why the v2 accumulator-sink model (bracketing) sits ABOVE this boundary
//! rather than inside it: sinks are just ids to a backend.
//!
//! v1 ships exactly one implementation, `D3d11Backend`. See the design note §1 for
//! why CUDA is not it: the work is a weighted running average plus one tonemap
//! pass, which is memory-bandwidth-bound by roughly two orders of magnitude, and
//! WGC already hands us a D3D11 texture on a device we own — so DirectCompute is
//! simultaneously the more portable AND the simpler choice, with no interop layer,
//! no fatbinary, no LUID adapter matching and no user-installed toolkit. A future
//! CUDA backend (for optical-flow frame interpolation, which does have dedicated
//! hardware) implements this same trait.

use windows::Win32::Graphics::Direct3D11::ID3D11Texture2D;

/// Tonemapping operator applied once, at resolve, in linear space.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tonemap {
    None = 0,
    Reinhard = 1,
    Aces = 2,
}

impl Tonemap {
    pub fn from_u32(value: u32) -> Self {
        match value {
            1 => Self::Reinhard,
            2 => Self::Aces,
            _ => Self::None,
        }
    }
}

/// Everything the resolve pass needs. Deliberately a plain value type so it can be
/// handed across the thread boundary and stored until the session finishes.
#[derive(Clone, Copy, Debug)]
pub struct ResolveParams {
    /// Final image size. `render_size / supersample`.
    pub out_width: u32,
    pub out_height: u32,
    /// 1 or 2. Box-downsampled in linear space during resolve.
    pub supersample: u32,
    pub tonemap: Tonemap,
    /// Linear multiplier: 2^EV.
    pub exposure_mul: f32,
}

/// A resolved image: tightly packed 16-bit-per-channel RGBA, little-endian, which
/// is byte-for-byte what `sharp` expects for `{ raw: { channels: 4, depth: 'ushort' } }`.
pub struct ResolvedImage {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// What one offered frame actually contributed to the exposure.
///
/// `real` and `synthetic` are counted separately and never merged, because the whole
/// risk of frame interpolation is that manufacturing synthetic samples slows frame
/// consumption below iRacing's present rate and thereby costs us REAL ones. A single
/// blended total would hide exactly the regression worth watching for.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct SampleOutcome {
    /// 1 when the captured frame itself was accumulated, 0 when it was rejected.
    pub real: u32,
    /// Interpolated in-between frames accumulated alongside it (0 when off).
    pub synthetic: u32,
}

/// Whether hardware frame interpolation is live, and what it negotiated.
#[derive(Clone, Debug, Default)]
pub struct InterpolationStatus {
    pub enabled: bool,
    /// 1 = off. 2/4/8 emit factor-1 synthetic frames per captured frame.
    pub factor: u32,
    /// Why it is not enabled. `None` when it is, or when it was never asked for.
    pub reason: Option<String>,
    pub grid_size: u32,
    pub bidirectional: bool,
}

#[derive(Debug)]
pub struct BackendError(pub String);

impl std::fmt::Display for BackendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for BackendError {}

impl From<windows::core::Error> for BackendError {
    fn from(error: windows::core::Error) -> Self {
        Self(format!("{error}"))
    }
}

/// The accumulate/resolve backend contract.
///
/// Implementations are used from EXACTLY ONE thread (the WGC capture thread) for
/// their whole lifetime, so they need no internal synchronisation.
pub trait AccumulateBackend {
    /// Identifier recorded in the metadata sidecar so a shot records which compute
    /// path produced it.
    fn name(&self) -> &'static str;

    /// Allocate an accumulator for a sink. v1 creates one; bracketing creates N.
    /// Memory scales with the number of SINKS, not the number of samples — which is
    /// what removes JRT's RAM wall entirely.
    fn create_sink(&mut self, sink_id: &str, width: u32, height: u32) -> Result<(), BackendError>;

    /// Take a private copy of the frame's pixels and return the texture every later
    /// pass must read instead of WGC's own. **Blocks until the copy has executed.**
    ///
    /// THIS IS A CORRECTNESS REQUIREMENT, NOT AN OPTIMISATION, and it is the one place
    /// in this file that is allowed to stall.
    ///
    /// `windows-capture` creates the WGC frame pool with `numberOfBuffers = 1`
    /// (`graphics_capture_api.rs`), so the session owns exactly ONE surface, and it
    /// hands that surface back to the pool the instant `on_frame_arrived` returns.
    /// Every other pass here merely RECORDS GPU commands; the D3D11 immediate context
    /// orders them against our own work and against nothing else, because the
    /// compositor writes the pool surface from outside our device. So a digest or an
    /// accumulate that has been submitted but not yet executed reads whatever the
    /// surface holds when the GPU eventually gets to it — the next frame, a frame the
    /// pool has just recycled, or a surface `Direct3D11CaptureFramePool::Recreate`
    /// has reallocated and not yet filled.
    ///
    /// The one-shot still-capture path never had this problem and that is exactly why
    /// it kept working on a machine where this one did not: `Frame::buffer()` copies
    /// to a staging texture and MAPS it — a full GPU sync — while the frame is still
    /// alive. Consuming the pixels before releasing the frame is the contract; this
    /// method is how the accumulation path finally honours it.
    ///
    /// The returned texture is owned by the backend and is stable across frames, so
    /// callers may hold views on it. Implementations must accept being called once per
    /// frame with the same dimensions.
    fn retain_frame(
        &mut self,
        source: &ID3D11Texture2D,
    ) -> Result<ID3D11Texture2D, BackendError>;

    /// Queue a content digest of a source frame. **Does not block.**
    ///
    /// This used to be a synchronous `digest()` that mapped the result back on the
    /// spot — a full GPU sync once per frame. Field data showed that sync dominating
    /// the per-frame cost at large render sizes (12.1 ms/frame at 5120x2880), and
    /// once frame interpolation was added on top it pushed consumption past iRacing's
    /// present interval, so we started DROPPING REAL FRAMES. Losing real samples is a
    /// far worse defect than the duplicates this was guarding against — which have
    /// never once been observed in the field (`rejected: 0` on every shot to date).
    ///
    /// So the digest is now submitted here and collected later, and duplicates are
    /// REPORTED rather than rejected. That is safe because resolve normalises by
    /// accumulated weight: a duplicate merely gives one instant double weight among
    /// hundreds of samples, which is negligible, whereas the sync was costing us
    /// two frames in three.
    fn submit_digest(&mut self, source: &ID3D11Texture2D) -> Result<(), BackendError>;

    /// Digests that have become readable since the last call, in submission order.
    /// Never blocks: a frame whose GPU work is still in flight simply is not
    /// returned yet.
    fn poll_digests(&mut self) -> Vec<u64>;

    /// Block until every outstanding digest is readable. Called once, after the
    /// capture loop has ended, where a stall costs nothing.
    fn drain_digests(&mut self) -> Vec<u64>;

    /// sRGB -> linear, then add `weight * colour` into the sink's accumulator and
    /// `weight` into its accumulated-weight channel.
    fn accumulate(
        &mut self,
        sink_id: &str,
        source: &ID3D11Texture2D,
        weight: f32,
    ) -> Result<(), BackendError>;

    /// Set highlight recovery, in STOPS of gain applied at full clip. 0 disables it.
    ///
    /// iRacing hands us display-referred SDR that has already been tonemapped and
    /// clipped, so a headlight and a white wall both arrive as 1.0 and a light that
    /// sweeps through 1% of the exposure contributes 0.01 instead of dominating it.
    /// This approximately inverts the display curve BEFORE accumulation, putting the
    /// nonlinearity where a sensor puts it. It cannot recover the true value — that
    /// was destroyed before we saw the frame — so it is a controllable guess.
    ///
    /// 0 stops must remain bit-for-bit identity: the one-sample-equals-still-capture
    /// equivalence depends on it.
    fn set_highlight_recovery(&mut self, _stops: f32) {}

    /// Ask for hardware frame interpolation at `factor` (1 disables it).
    ///
    /// Returns the resulting status rather than an error, and NEVER fails the
    /// session: interpolation is an optional accelerator layered on top of a feature
    /// that must keep working without it. A backend with no such hardware — or a
    /// machine whose GPU is not NVIDIA Turing-or-newer — reports `enabled: false`
    /// with a reason and the capture proceeds exactly as before.
    /// `source` is a real captured frame: the backend takes width, height AND pixel
    /// format from it rather than being told, so the retained copy can never
    /// disagree with what WGC is actually delivering.
    fn enable_interpolation(
        &mut self,
        _factor: u32,
        _source: &ID3D11Texture2D,
    ) -> InterpolationStatus {
        InterpolationStatus {
            enabled: false,
            factor: 1,
            reason: Some("this backend has no frame interpolation".to_string()),
            grid_size: 0,
            bidirectional: false,
        }
    }

    /// Offer one captured frame: accumulate it, plus any synthetic frames between it
    /// and the previously accumulated one.
    ///
    /// The default is the honest no-interpolation behaviour, so a backend that does
    /// not override this is automatically correct.
    fn accumulate_sample(
        &mut self,
        sink_id: &str,
        source: &ID3D11Texture2D,
        weight: f32,
    ) -> Result<SampleOutcome, BackendError> {
        self.accumulate(sink_id, source, weight)?;
        Ok(SampleOutcome {
            real: 1,
            synthetic: 0,
        })
    }

    /// Called after a frame is REJECTED as a duplicate, so a backend retaining a
    /// previous frame can decide what to do about it. Default: nothing.
    fn note_rejected_frame(&mut self) {}

    /// Discard retained INTER-FRAME state: the next frame offered is not temporally
    /// adjacent to the last one. Accumulator contents are untouched.
    ///
    /// Multi-pass accumulation (see `docs/design/long-exposure-multi-pass.md`) visits
    /// the same exposure window repeatedly WITHOUT clearing the accumulator, so at a
    /// pass boundary the retained "previous frame" is the END of the window while the
    /// next frame offered is its START. Interpolating across that pair would warp the
    /// entire exposure into the first in-betweens of every pass after the first — and
    /// it is not a subtle artifact.
    ///
    /// Default: nothing retained, nothing to discard.
    fn begin_pass(&mut self) {}

    /// Normalise by accumulated weight, apply exposure, tonemap, box-downsample the
    /// supersample, encode to 16-bit sRGB and read back.
    fn resolve(
        &mut self,
        sink_id: &str,
        params: &ResolveParams,
    ) -> Result<ResolvedImage, BackendError>;
}
