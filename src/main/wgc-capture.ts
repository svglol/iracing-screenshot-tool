import { app } from 'electron';
import path from 'node:path';

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
		console.error(
			'[wgc-capture] addon unavailable; native capture disabled',
			error
		);
		return null;
	}

	if (
		!addon ||
		typeof addon.captureWindow !== 'function' ||
		typeof addon.isSupported !== 'function'
	) {
		console.error('[wgc-capture] addon loaded but ABI is unexpected');
		return null;
	}

	// Gate on OS support once, at load. isSupported() is a pure IsSupported() call
	// and shouldn't throw, but guard it anyway so a broken addon can't take down
	// the whole main process.
	try {
		if (!addon.isSupported()) {
			console.warn(
				'[wgc-capture] Windows.Graphics.Capture not supported on this OS'
			);
			return null;
		}
	} catch (error) {
		console.error('[wgc-capture] isSupported() threw; disabling', error);
		return null;
	}

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

// Whether the WGC path is available this session (used to gate UI / pre-flight).
export function isWgcAvailable(): boolean {
	return getWgcApi() !== null;
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
		console.warn(
			'[wgc-capture] captureWindow failed; falling back to getUserMedia',
			error
		);
		return null;
	}
}
