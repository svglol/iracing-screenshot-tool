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

    /// Content digest of a source frame, for duplicate rejection. Must be
    /// deterministic for identical pixel content and independent of thread
    /// scheduling — a nondeterministic digest would manufacture false duplicates.
    fn digest(&mut self, source: &ID3D11Texture2D) -> Result<u64, BackendError>;

    /// sRGB -> linear, then add `weight * colour` into the sink's accumulator and
    /// `weight` into its accumulated-weight channel.
    fn accumulate(
        &mut self,
        sink_id: &str,
        source: &ID3D11Texture2D,
        weight: f32,
    ) -> Result<(), BackendError>;

    /// Normalise by accumulated weight, apply exposure, tonemap, box-downsample the
    /// supersample, encode to 16-bit sRGB and read back.
    fn resolve(
        &mut self,
        sink_id: &str,
        params: &ResolveParams,
    ) -> Result<ResolvedImage, BackendError>;
}
