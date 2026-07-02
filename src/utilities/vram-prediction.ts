// Pure VRAM headroom prediction — shared by the main process (which measures
// VRAM via koffi in vram-utils.ts) and the renderer (SideBar.vue, which colour-
// codes resolution options from the measurement). No Node/Electron/koffi deps so
// it runs in both scopes and is fully unit-testable.
//
// Design (see the #9 VRAM research): a false positive — flagging a capture that
// would have succeeded — is worse than a rare OOM crash the app already recovers
// from, so every estimate is deliberately LOW-biased and nothing here ever hard-
// blocks. The PRIMARY signal is measured live headroom (free = total − used),
// which already reflects the resolution-INDEPENDENT cost that dominates VRAM
// (liveries, shadow maps, MSAA at the current window). The resize only ADDS the
// resolution-dependent surfaces, estimated below.

export const GiB = 1024 ** 3;

// D3D11 max 2D texture dimension — a resize beyond this cannot allocate at all.
// (The capture path already clamps to 10000 well under this; kept for the
// theoretically-impossible guard.)
export const D3D11_MAX_TEXTURE_DIMENSION = 16384;

// Estimated resolution-DEPENDENT VRAM added per extra pixel when iRacing's
// window is grown: the flip-model backbuffer chain (2–3 × 8-bit) + a depth
// buffer + ~2–4 full-res scene/post render targets ≈ 24–32 B/px with MSAA off.
// We assume MSAA off on purpose (low bias): MSAA multiplies this by up to 8×,
// but reading the level from rendererDX11*.ini is fragile, and over-predicting
// causes the false positives this design avoids. The MSAA baseline at the
// current window is already inside the live `used` reading.
export const RESIZE_BYTES_PER_PIXEL = 32;

// Safety headroom kept free below `free`. A flat floor is thin on small cards
// and needless on big ones; the percentage scales it. ResizeBuffers also
// transiently double-allocates during reallocation, which this absorbs.
export const VRAM_MARGIN_FLOOR_BYTES = 2 * GiB;
export const VRAM_MARGIN_FRACTION = 0.12;

export interface VramInfo {
	// True dedicated VRAM of the GPU iRacing renders on, in bytes. 0/absent =>
	// total unknown.
	totalBytes: number;
	// Live system-wide dedicated VRAM in use on that adapter, in bytes. null =>
	// usage query failed; callers must fail open (treat tier as unknown).
	usedBytes: number | null;
	// Where the numbers came from — 'fallback' means an assumed total (be more
	// conservative / label the UI accordingly).
	source: 'native' | 'fallback';
	// Adapter description for display/logging (best-effort, may be '').
	adapterName?: string;
}

export interface Dimensions {
	width: number;
	height: number;
}

// safe    — fits with the full margin to spare; proceed silently.
// caution — fits but eats into the margin (or a modest overshoot); warn.
// risk    — the added surfaces alone exceed free VRAM; near-certain OOM.
// unknown — measurement unavailable; fail open (no prediction, no block).
export type VramTier = 'safe' | 'caution' | 'risk' | 'unknown';

export interface VramAssessment {
	tier: VramTier;
	freeBytes: number | null;
	deltaBytes: number;
	marginBytes: number | null;
}

function isPositive(n: unknown): n is number {
	return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

export function vramMarginBytes(totalBytes: number): number {
	if (!isPositive(totalBytes)) {
		return VRAM_MARGIN_FLOOR_BYTES;
	}
	return Math.max(VRAM_MARGIN_FLOOR_BYTES, totalBytes * VRAM_MARGIN_FRACTION);
}

// Extra VRAM the resize is expected to allocate, in bytes. Only the growth in
// pixel count counts (shrinking or same-size adds nothing). If the baseline is
// unknown (0/invalid), we assume no growth rather than treating the whole target
// as new — under-predicting keeps the design fail-open.
export function predictAddedVramBytes(
	target: Dimensions,
	baseline?: Dimensions | null
): number {
	if (!isPositive(target?.width) || !isPositive(target?.height)) {
		return 0;
	}
	// Baseline unknown → assume no growth (delta 0) rather than treating the
	// whole target as new. Over-predicting here would flag captures that would
	// have worked, the false positive this design avoids.
	if (
		!baseline ||
		!isPositive(baseline.width) ||
		!isPositive(baseline.height)
	) {
		return 0;
	}
	const targetPx = target.width * target.height;
	const basePx = baseline.width * baseline.height;
	return Math.max(0, targetPx - basePx) * RESIZE_BYTES_PER_PIXEL;
}

export function assessVram(
	info: VramInfo | null | undefined,
	target: Dimensions,
	baseline?: Dimensions | null
): VramAssessment {
	const deltaBytes = predictAddedVramBytes(target, baseline);

	// Fail open: with no total or no usage reading we cannot predict, so never
	// warn/block on a guess.
	if (!info || !isPositive(info.totalBytes) || info.usedBytes == null) {
		return {
			tier: 'unknown',
			freeBytes: null,
			deltaBytes,
			marginBytes:
				info && isPositive(info.totalBytes)
					? vramMarginBytes(info.totalBytes)
					: null,
		};
	}

	const freeBytes = Math.max(0, info.totalBytes - Math.max(0, info.usedBytes));
	const marginBytes = vramMarginBytes(info.totalBytes);

	let tier: VramTier;
	if (deltaBytes > freeBytes) {
		tier = 'risk';
	} else if (deltaBytes + marginBytes > freeBytes) {
		tier = 'caution';
	} else {
		tier = 'safe';
	}

	return { tier, freeBytes, deltaBytes, marginBytes };
}

// The largest of the given resolution presets that assesses as 'safe'. Presets
// are evaluated in order; the caller passes them largest-first or smallest-first
// and gets back the biggest safe one (or null if none are safe / info unknown).
export function largestSafeResolution(
	presets: Array<{ label: string; dimensions: Dimensions }>,
	info: VramInfo | null | undefined,
	baseline?: Dimensions | null
): { label: string; dimensions: Dimensions } | null {
	if (!info || !isPositive(info.totalBytes) || info.usedBytes == null) {
		return null;
	}
	let best: { label: string; dimensions: Dimensions } | null = null;
	let bestPx = -1;
	for (const preset of presets) {
		const { width, height } = preset.dimensions;
		if (!isPositive(width) || !isPositive(height)) {
			continue;
		}
		if (assessVram(info, preset.dimensions, baseline).tier !== 'safe') {
			continue;
		}
		const px = width * height;
		if (px > bestPx) {
			best = preset;
			bestPx = px;
		}
	}
	return best;
}

// "6.2 GB" — GiB with one decimal, for warnings/labels. (Uses GB label for the
// familiar GiB value, matching how Windows Task Manager presents VRAM.)
export function formatVramGiB(bytes: number | null | undefined): string {
	if (!isPositive(bytes as number)) {
		return '0 GB';
	}
	const gib = (bytes as number) / GiB;
	return `${gib.toFixed(1)} GB`;
}
