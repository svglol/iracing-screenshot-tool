// The one mapping from the Resolution setting to actual pixels.
//
// This used to live inside SideBar.vue, which meant the MAIN process could not
// reach it — and that is exactly how long exposure came to ignore the Resolution
// setting entirely. Stills emitted their dimensions from the renderer; long
// exposure had its recipe filled in by main, which had no way to ask what '8k'
// meant, so it fell back to `defaultScreenWidth`/`defaultScreenHeight` — iRacing's
// baseline WINDOW size, which is a different thing that merely looks like one.
// A user with Resolution on 8k and a 1680x945 window got 1680x945 long exposures
// and no indication why.
//
// So it lives here, pure, and both paths call it. Two callers of one function
// cannot disagree; two copies of one rule can.
//
// Pure — no Node, Electron, config or DOM deps. Callers supply their own values.

export const RESOLUTION_PRESETS = [
	'1080p',
	'2k',
	'4k',
	'5k',
	'6k',
	'7k',
	'8k',
	'Custom',
] as const;
export type ResolutionPreset = (typeof RESOLUTION_PRESETS)[number];

export interface CaptureDimensions {
	width: number;
	height: number;
}

// Nominal 16:9 dimensions for a preset label. 'Custom' has no nominal size — the
// caller supplies one — and an unrecognised label falls to 1080p rather than
// throwing, so a config written by a future build degrades instead of failing.
export function getResolutionDimensions(label: unknown): CaptureDimensions {
	switch (label) {
		case '1080p':
			return { width: 1920, height: 1080 };
		case '2k':
			return { width: 2560, height: 1440 };
		case '4k':
			return { width: 3840, height: 2160 };
		case '5k':
			return { width: 5120, height: 2880 };
		case '6k':
			return { width: 6400, height: 3600 };
		case '7k':
			return { width: 7168, height: 4032 };
		case '8k':
			return { width: 7680, height: 4320 };
		default:
			return { width: 1920, height: 1080 };
	}
}

function positiveInt(value: unknown): number | null {
	const n = typeof value === 'number' ? value : parseInt(String(value), 10);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Scale height to the screen's aspect ratio while PRESERVING the chosen width, so
// the resolution label keeps meaning what it says. Returns `base` untouched when the
// option is off or the screen dimensions are unusable — a bad reading must never
// silently resize a capture.
export function applyAspectRatio(
	base: CaptureDimensions,
	screen: Partial<CaptureDimensions> | null | undefined,
	keepAspectRatio: boolean
): CaptureDimensions {
	if (!keepAspectRatio) {
		return base;
	}
	const sw = positiveInt(screen?.width);
	const sh = positiveInt(screen?.height);
	if (sw === null || sh === null) {
		return base;
	}
	const adjustedHeight = Math.round((base.width * sh) / sw);
	if (!Number.isFinite(adjustedHeight) || adjustedHeight <= 0) {
		return base;
	}
	return { width: base.width, height: adjustedHeight };
}

// The dimensions a capture should actually target, from stored settings.
//
// Returns null ONLY for a Custom preset with unusable width/height, which is a
// state the UI can legitimately be in mid-typing; callers that must have an answer
// substitute their own default rather than being handed a silent one.
export function resolveCaptureDimensions(opts: {
	resolution: unknown;
	customWidth?: unknown;
	customHeight?: unknown;
	// iRacing's baseline window size, used ONLY as the aspect-ratio reference.
	screen?: Partial<CaptureDimensions> | null;
	keepAspectRatio?: boolean;
}): CaptureDimensions | null {
	let base: CaptureDimensions;
	if (opts.resolution === 'Custom') {
		const w = positiveInt(opts.customWidth);
		const h = positiveInt(opts.customHeight);
		if (w === null || h === null) {
			return null;
		}
		base = { width: w, height: h };
	} else {
		base = getResolutionDimensions(opts.resolution);
	}
	return applyAspectRatio(base, opts.screen, opts.keepAspectRatio === true);
}
