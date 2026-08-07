// Pure capture-path decision cores extracted from index.ts so they are testable
// without importing the whole main process (index.ts pulls electron/sharp/koffi/
// irsdk at module scope and cannot load under vitest) — cq-tests#2. These are pure
// functions: no I/O, no module state, no electron. index.ts calls them where it
// used to inline the same expressions; capture-decisions.test.ts locks the logic.

import { t } from '../utilities/i18n';

// Which capture backend a request uses.
export type CaptureBackend = 'reshade' | 'wgc' | 'getUserMedia';

export interface CaptureBackendInputs {
	// config.get('reshade') — ReShade hardware capture is enabled.
	reshade: boolean;
	// config.get('nativeCapture') — the WGC native path is enabled.
	nativeCapture: boolean;
	// isWgcAvailable() — the WGC addon loaded and the OS supports it this session.
	wgcAvailable: boolean;
}

// Select the capture backend (mirrors the dispatch in index.ts): ReShade wins when
// enabled; otherwise the in-process WGC path is used only when nativeCapture is on
// AND the addon/OS gate reports available; otherwise the legacy getUserMedia path.
// Fails safe toward getUserMedia — the backend that works on every machine.
export function decideCaptureBackend({
	reshade,
	nativeCapture,
	wgcAvailable,
}: CaptureBackendInputs): CaptureBackend {
	if (reshade) {
		return 'reshade';
	}
	if (nativeCapture && wgcAvailable) {
		return 'wgc';
	}
	return 'getUserMedia';
}

// What the native probe reports about this OS build. Each flag is one WinRT
// property/contract lookup performed by the capture crate's OWN predicates, so
// these are exactly the conditions its session constructor tests.
export interface WgcCapabilities {
	// UniversalApiContract 8 (Win10 1903) AND GraphicsCaptureSession.IsSupported().
	apiSupported: boolean;
	// GraphicsCaptureSession.IsCursorCaptureEnabled exists (Win10 2004).
	cursorConfigSupported: boolean;
	// GraphicsCaptureSession.IsBorderRequired exists (Windows 11 22000).
	borderConfigSupported: boolean;
}

export interface WgcSupportInputs {
	// The addon file loaded and its ABI is what we expect.
	addonLoaded: boolean;
	// Why it did not load; null when it did. Passed straight through — the loader
	// already phrases these.
	loaderReason: string | null;
	// isSupported(): the coarse "does WGC exist here" gate.
	apiSupported: boolean;
	// probeCaptureSupport(), or null when this addon build predates the probe (or
	// it threw). Null means fall back to the coarse gate alone, i.e. the pre-probe
	// behaviour — an older .node must degrade, not hard-fail.
	capabilities: WgcCapabilities | null;
}

// Shown when the cursor cannot be suppressed. The ONLY capability degradation a
// user can see in the image, so it is the only one that gets a caveat.
//
// A function rather than a const because it is user-facing text: a module-scope
// const is evaluated at import time, which is before the process has resolved the
// user's language, and would freeze English into every caller.
export const WGC_CURSOR_CAVEAT = (): string => t('wgc.cursorCaveat');

export interface WgcSupport {
	supported: boolean;
	// Short, stable string for logs and failure diagnostics; null when supported.
	reason: string | null;
	// One sentence written for a person, shown under the Settings toggle and in
	// the toast when a toggle attempt is refused; null when supported.
	message: string | null;
	// Set when capture WORKS but had to give something up. Distinct from `message`
	// on purpose: this never blocks the feature, it only says what to expect.
	caveat: string | null;
}

// Whether the WGC capture path can actually run on this machine.
//
// Only ONE thing is a genuine floor: Windows.Graphics.Capture itself (Win10 1903).
// The two session settings we ask for are each gated on a WinRT property that
// arrived later — IsCursorCaptureEnabled in Win10 2004, IsBorderRequired in
// Windows 11 — and the capture crate REFUSES rather than degrades when one is
// missing. Demanding both unconditionally therefore made the whole path
// Windows 11-only in practice: a Win10 machine passed isSupported() and then
// failed every grab, silently for stills (they fall back to getUserMedia) and as
// a "no frames to capture" error for long exposure, which has no fallback. That
// is the v3.2.1 bug report.
//
// The native side now negotiates those settings instead of demanding them, so
// this decides only on `apiSupported` and reports the leftovers as caveats:
//   - border: costs NOTHING. The capture border is a Windows 11 feature, so on
//     Windows 10 there is nothing to suppress and Default is already unbordered.
//   - cursor: visible in the image, so it is surfaced. Applies below Win10 2004,
//     which no serviced Windows 10 build is.
export function decideWgcSupport({
	addonLoaded,
	loaderReason,
	apiSupported,
	capabilities,
}: WgcSupportInputs): WgcSupport {
	if (!addonLoaded) {
		return {
			supported: false,
			reason: loaderReason,
			message: t('wgc.addonUnavailable'),
			caveat: null,
		};
	}
	if (!apiSupported || (capabilities && !capabilities.apiSupported)) {
		return {
			supported: false,
			reason: 'OS unsupported (needs Win10 1903+)',
			message: t('wgc.osUnsupported'),
			caveat: null,
		};
	}
	// No probe available (older addon): the coarse gate is all we have, and it
	// passed. Behaves exactly as it did before the probe existed.
	if (!capabilities) {
		return { supported: true, reason: null, message: null, caveat: null };
	}
	return {
		supported: true,
		reason: null,
		message: null,
		caveat: capabilities.cursorConfigSupported ? null : WGC_CURSOR_CAVEAT(),
	};
}

// Reason string for the one long-exposure refusal the user can fix with a switch.
// Kept here beside the decision that produces it so the UI and main cannot drift.
export const NATIVE_CAPTURE_REQUIRED_REASON = (): string =>
	t('wgc.nativeCaptureOff');

export interface LongExposureGateInputs {
	// config.get('nativeCapture') — the WGC native path is enabled.
	nativeCapture: boolean;
	// getLongExposureAvailability().available — the addon exposes the longExposure*
	// surface AND its compute kernels build on this machine's driver.
	machineAvailable: boolean;
	// Why the machine cannot run it; null when it can.
	machineReason: string | null;
}

export interface LongExposureGate {
	available: boolean;
	reason: string | null;
	// True ONLY when the machine is capable and the setting is the sole blocker —
	// the one case where the UI can offer a one-switch remedy instead of declaring
	// the machine incapable.
	needsNativeCapture: boolean;
}

// Whether long exposure can run at all right now.
//
// Long exposure has no portable fallback — it always accumulates through the native
// WGC + D3D11 path regardless of which backend stills use (docs/design/long-
// exposure.md §10). That made the High-Fidelity Capture toggle a no-op here, which
// is worse than it sounds: a user who turned WGC off BECAUSE it misbehaves on their
// machine still got long exposure driving that same path, and found out minutes
// later via a capture that saw no frames. So the toggle gates the feature, and the
// UI can name the switch to flip.
//
// ORDER MATTERS. A machine that cannot build the compute kernels is reported as such
// even when the toggle is also off, because telling that user to enable a setting
// would send them after a fix that cannot work.
export function decideLongExposureAvailability({
	nativeCapture,
	machineAvailable,
	machineReason,
}: LongExposureGateInputs): LongExposureGate {
	if (!machineAvailable) {
		return {
			available: false,
			reason: machineReason,
			needsNativeCapture: false,
		};
	}
	if (!nativeCapture) {
		return {
			available: false,
			reason: NATIVE_CAPTURE_REQUIRED_REASON(),
			needsNativeCapture: true,
		};
	}
	return { available: true, reason: null, needsNativeCapture: false };
}

// The two frame-level triggers that make a WGC grab fall back to getUserMedia.
export type WgcFallbackKind = 'no-frame' | 'black';

export interface WgcFallbackClassification {
	outcome: 'fallback';
	fallbackReason: string;
}

// Map a WGC frame-level fallback trigger to the (outcome, fallbackReason) recorded
// on lastWgcAttempt (mirrors the mutations in captureAndSaveViaWgc). 'no-frame'
// carries the native reason when available (the H1-timeout vs H2-alloc-fail
// distinguisher), falling back to a stable default; 'black' is a fixed marker.
export function classifyWgcResult(
	kind: WgcFallbackKind,
	nativeReason: string | null
): WgcFallbackClassification {
	if (kind === 'no-frame') {
		return {
			outcome: 'fallback',
			fallbackReason: nativeReason || 'no-frame (native returned null)',
		};
	}
	return { outcome: 'fallback', fallbackReason: 'black-frame' };
}
