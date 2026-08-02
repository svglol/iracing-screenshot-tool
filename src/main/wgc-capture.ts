import { app } from 'electron';
import path from 'node:path';
import { createLogger } from '../utilities/logger';

const log = createLogger('wgc-capture');

// ---------------------------------------------------------------------------
// Windows.Graphics.Capture (WGC) native capture loader (#11)
//
// Loads the prebuilt napi-rs addon (native/wgc-capture.node) that grabs a
// single true-RGBA frame of a window via Windows.Graphics.Capture. Unlike the
// desktopCapturer/getUserMedia path — which routes frames through an I420 4:2:0
// pipeline and chroma-subsamples every capture — WGC delivers un-subsampled
// 8-bit RGBA, removing the fidelity ceiling documented in the capture notes.
//
// The addon ships as an ABI-stable N-API prebuild (napi8), so it loads in
// Electron with NO electron-rebuild — the same low-risk packaging model as
// koffi. It is loaded via a computed-path require() (resolveAddonPath below)
// that rollup cannot statically analyze, so electron-vite leaves it as a
// runtime require rather than bundling it — no `external` entry needed. The
// .node is asarUnpacked in package.json (native/*.node) so the runtime path
// resolves in a packaged build.
//
// Everything here fails open: if the addon is missing, the OS is too old, or a
// grab throws, the caller falls back to the legacy getUserMedia capture path.
// ---------------------------------------------------------------------------

// Tightly-packed RGBA (width*height*4 bytes) plus the physical-pixel dimensions
// the frame was captured at. Mirrors the Rust `CaptureResult` napi object.
export interface WgcCaptureResult {
	data: Buffer;
	width: number;
	height: number;
}

// One entry of the native per-sample diagnostic log (long exposure). See
// utilities/long-exposure/sample-stats.ts for what it is used for.
export interface NativeLongExposureSample {
	u: number;
	sessionTime: number;
	replayFrameNum: number;
	digest: string;
	presentedAt: string;
	accepted: boolean;
}

// What NVIDIA's hardware optical-flow accelerator did for a capture. Optional
// throughout: an addon build predating interpolation omits it entirely, and a
// non-NVIDIA machine reports `enabled: false` with a reason. Neither is an error.
export interface NativeLongExposureInterpolation {
	enabled: boolean;
	factor: number;
	reason: string | null;
	// One flow vector per gridSize × gridSize pixels.
	gridSize: number;
	// Whether backward flow was available too, which is what enables the
	// forward/backward consistency check and so occlusion handling.
	bidirectional: boolean;
}

export interface NativeLongExposureResult {
	// Tightly packed 16-bit RGBA, little-endian. null when the resolve produced
	// nothing (no accumulated samples, or a GPU fault — see `error`).
	data: Buffer | null;
	width: number;
	height: number;
	// REAL captured frames. Never merged with `synthesized`: the risk of
	// interpolation is that its GPU cost slows frame consumption below iRacing's
	// present rate, buying synthetic samples with real ones. Comparing this number
	// across interpolation on/off at identical settings is how that stays visible.
	accepted: number;
	synthesized?: number;
	rejected: number;
	backend: string;
	// Wall time per consumed frame. The budget is one iRacing present.
	meanFrameMs?: number;
	maxFrameMs?: number;
	interpolation?: NativeLongExposureInterpolation | null;
	samples: NativeLongExposureSample[];
	error: string | null;
}

export interface NativeLongExposureStats {
	accepted: number;
	synthesized?: number;
	rejected: number;
	sawFrame: boolean;
	meanFrameMs?: number;
	maxFrameMs?: number;
	interpolation?: NativeLongExposureInterpolation | null;
	// Dimensions WGC is actually delivering, once the first frame has arrived (0
	// before that). The caller resized the window, but DPI and client-area geometry
	// mean the delivered size is WGC's to report, not ours to assume.
	frameWidth: number;
	frameHeight: number;
	error: string | null;
}

// The long-exposure accumulation surface (design note §3/§7). Kept as a separate
// interface from the still-capture pair so a build of the addon that predates the
// feature degrades to "long exposure unavailable" rather than crashing on load.
export interface WgcLongExposureAddon {
	// Compiles the compute kernels and throws with a reason if this machine can't
	// run them. Cheap and side-effect-free — no device, no GPU work.
	longExposureProbe(): string;
	// Open a live capture of the window. The accumulation gate starts CLOSED.
	// `interpolationFactor` is optional and defaults to 1 (off) — an addon build
	// predating interpolation simply ignores the extra argument.
	longExposureBegin(hwnd: number, interpolationFactor?: number): number;
	longExposureSetSample(
		session: number,
		weight: number,
		u: number,
		replayFrameNum: number,
		sessionTime: number
	): void;
	longExposureSetGate(session: number, open: boolean): void;
	longExposureStats(session: number): NativeLongExposureStats;
	longExposureFinish(
		session: number,
		outWidth: number,
		outHeight: number,
		supersample: number,
		tonemap: number,
		exposureMul: number,
		timeoutMs: number
	): NativeLongExposureResult;
	longExposureAbort(session: number, timeoutMs: number): void;
	// Which physical GPU the capture/accumulate device landed on. Optional: an
	// addon build predating this reports nothing rather than failing to load.
	longExposureDeviceInfo?(): {
		adapter: string;
		vendorId: number;
		isNvidia: boolean;
		dedicatedVideoMemory: number;
	};
	// Whether NVIDIA's optical-flow hardware can drive interpolation at this frame
	// size, and what it negotiated. Optional for the same reason as the above: an
	// older addon reports nothing and interpolation stays off.
	longExposureInterpolationInfo?(
		width: number,
		height: number
	): {
		available: boolean;
		reason: string | null;
		gridSize: number;
		bidirectional: boolean;
		inputFormat: string;
		apiVersion: string;
	};
}

interface WgcAddon {
	// Whether Windows.Graphics.Capture is available on this OS build. WGC's
	// CreateForWindow needs Win10 1903 (build 18362) or newer.
	isSupported(): boolean;
	// Capture one frame of the window identified by the numeric HWND. Throws on a
	// bad handle, no frame, or timeout so the JS side can fall back.
	captureWindow(hwnd: number, timeoutMs?: number): WgcCaptureResult;
}

// undefined = not yet initialized; null = unavailable (fall back to getUserMedia)
let wgcApi: WgcAddon | null | undefined;

// WHY WGC is unavailable this session (obs-capture-diagnostics#2) — so the
// failure-time diagnostics record a concrete cause instead of a bare
// wgcAvailable:false. Set in each createWgcApi() null branch; cleared on success.
let wgcUnavailableReason: string | null = null;

// The reason WGC is unavailable, or null when it IS available. Self-initializing:
// forces createWgcApi() to run (via getWgcApi) so the reason is populated
// regardless of call order — the invariant "reason===null iff isWgcAvailable()"
// then holds even if this is read before any capture.
export function getWgcUnavailableReason(): string | null {
	getWgcApi();
	return wgcUnavailableReason;
}

// Resolve the prebuilt addon on disk. Packaged: app.getAppPath() is
// .../resources/app.asar and the .node is asarUnpacked to
// .../resources/app.asar.unpacked/native/, so swap the segment. Dev: getAppPath()
// is the project root (no app.asar), so the replace is a no-op and this resolves
// to <root>/native/wgc-capture.node.
function resolveAddonPath(): string {
	const base = app.getAppPath().replace('app.asar', 'app.asar.unpacked');
	return path.join(base, 'native', 'wgc-capture.node');
}

function createWgcApi(): WgcAddon | null {
	if (process.platform !== 'win32') {
		wgcUnavailableReason = 'wgc-unavailable (non-Windows platform)';
		return null;
	}

	// The addon is a prebuilt .node; require() only throws if it's missing or the
	// N-API ABI mismatches. Its surface is a hand-written native binding, so it is
	// typed via the WgcAddon interface rather than inferred.
	let addon: WgcAddon;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		addon = require(resolveAddonPath());
	} catch (error) {
		const msg = (error as Error)?.message || String(error);
		wgcUnavailableReason = 'addon missing / ABI mismatch: ' + msg;
		log.warn('WGC addon unavailable; native capture disabled', {
			error: msg,
		});
		return null;
	}

	if (
		!addon ||
		typeof addon.captureWindow !== 'function' ||
		typeof addon.isSupported !== 'function'
	) {
		wgcUnavailableReason = 'addon ABI unexpected';
		log.error('WGC addon loaded but ABI is unexpected');
		return null;
	}

	// Gate on OS support once, at load. isSupported() is a pure IsSupported() call
	// and shouldn't throw, but guard it anyway so a broken addon can't take down
	// the whole main process.
	try {
		if (!addon.isSupported()) {
			wgcUnavailableReason = 'OS unsupported (needs Win10 1903+)';
			log.warn('Windows.Graphics.Capture not supported on this OS');
			return null;
		}
	} catch (error) {
		const msg = (error as Error)?.message || String(error);
		wgcUnavailableReason = 'isSupported() threw: ' + msg;
		log.error('WGC isSupported() threw; disabling', { error: msg });
		return null;
	}

	wgcUnavailableReason = null;
	return addon;
}

// Cached accessor. Returns null when WGC is unavailable for the session (bad
// platform, missing addon, unsupported OS). A per-capture failure does NOT null
// this — see captureIracingWindowNative.
export function getWgcApi(): WgcAddon | null {
	if (wgcApi === undefined) {
		wgcApi = createWgcApi();
	}
	return wgcApi;
}

// The long-exposure accumulation surface of the SAME addon, or null when this
// build predates the feature (or WGC is unavailable at all). Kept separate from
// getWgcApi so an older .node degrades to "long exposure unavailable" while still
// serving still captures — the addon is loaded once either way.
export function getLongExposureAddon(): WgcLongExposureAddon | null {
	const api = getWgcApi() as unknown as
		| (WgcAddon & Partial<WgcLongExposureAddon>)
		| null;
	if (!api || typeof api.longExposureBegin !== 'function') {
		return null;
	}
	return api as unknown as WgcLongExposureAddon;
}

// Whether the WGC path is available this session (used to gate UI / pre-flight).
export function isWgcAvailable(): boolean {
	return getWgcApi() !== null;
}

// Test-only seam (cq-tests#3): inject a fake WgcAddon — or null (unavailable) /
// undefined (restore the lazy createWgcApi path) — so the failure-reason state
// machine below can be exercised without a real .node or a live window. NEVER
// called by production code; it exists solely so wgc-capture.test.ts can drive
// captureIracingWindowNative's lastNativeFailureReason transitions deterministically.
export function __setWgcApiForTests(api: WgcAddon | null | undefined): void {
	wgcApi = api;
}

// #11 diagnostics (observability-only): the reason the LAST
// captureIracingWindowNative call returned null. Lets the failure-time diagnostics
// distinguish the WGC fallback triggers (H1 timeout/no-frame vs H2 D3D/VRAM alloc
// fail) instead of collapsing them all to 'fallback'. Holds the EXACT underlying
// reason: 'wgc-unavailable ...' when the addon/OS gate is off, or the native error
// message thrown by captureWindow ("WGC capture timed out" / "WGC capture produced
// no frame" / "WGC capture failed: {e}" / "WGC worker thread spawn failed").
// Cleared to null on a successful grab. Never influences capture flow.
let lastNativeFailureReason: string | null = null;

// The reason the most recent native grab returned null (null if the last grab
// succeeded or none has run). Read by the main-process failure diagnostics.
export function getLastNativeFailureReason(): string | null {
	return lastNativeFailureReason;
}

// Capture one true-RGBA frame of the given window handle, or null on any failure.
//
// A grab failure (bad HWND, no frame, timeout) is treated as TRANSIENT: return
// null so the caller falls back to getUserMedia for THIS capture, but leave the
// addon enabled — the next capture may well succeed (mirrors the koffi layer's
// "window unresolved" policy). Only load-time faults (handled in createWgcApi)
// disable WGC for the session.
export function captureIracingWindowNative(
	hwnd: number,
	timeoutMs?: number
): WgcCaptureResult | null {
	const api = getWgcApi();
	if (!api) {
		lastNativeFailureReason =
			'wgc-unavailable (missing addon / unsupported OS)';
		return null;
	}
	try {
		const result = api.captureWindow(hwnd, timeoutMs);
		lastNativeFailureReason = null;
		return result;
	} catch (error) {
		// Surface the exact native message so diagnostics can tell timeout from
		// alloc-fail; the observed behaviour (fall back to getUserMedia) is unchanged.
		lastNativeFailureReason =
			(error as Error)?.message || String(error) || 'unknown native error';
		log.warn('WGC captureWindow failed; falling back to getUserMedia', {
			hwnd,
			error: (error as Error)?.message || String(error),
		});
		return null;
	}
}
