// Pure capture-path decision cores extracted from index.ts so they are testable
// without importing the whole main process (index.ts pulls electron/sharp/koffi/
// irsdk at module scope and cannot load under vitest) — cq-tests#2. These are pure
// functions: no I/O, no module state, no electron. index.ts calls them where it
// used to inline the same expressions; capture-decisions.test.ts locks the logic.

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
