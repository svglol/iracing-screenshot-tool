// Shared screenshot output helpers used by BOTH the renderer save path
// (Worker.vue, canvas/getUserMedia capture) and the main-process save path
// (index.ts, WGC native capture). Keeping filename resolution, output extension,
// and crop geometry in one place guarantees the two capture backends produce
// byte-for-byte identical file names, extensions, and crops — otherwise a photo
// taken via WGC could land at a different path or crop than the same shot via
// getUserMedia.
//
// Everything here is pure except buildUniqueScreenshotName, whose only side
// channel is an injected `exists` probe (fs.existsSync in production) — so it is
// fully unit-testable without a filesystem.
import {
	resolveFilenameFormat,
	hasCounterToken,
	fillCounterTokens,
} from './filenameFormat';

// config 'outputFormat' key -> saved-file extension. Single source of truth for
// the extension across both save paths (Worker.vue's FORMAT_MAP derives its
// `ext` from here; the main WGC path calls getOutputExtension directly).
export const OUTPUT_EXTENSIONS: Record<string, string> = {
	jpeg: '.jpg',
	png: '.png',
	webp: '.webp',
};

// Extension for a config output-format key, defaulting to JPEG for any unknown
// / missing value (mirrors getOutputFormat's fallback in Worker.vue).
export function getOutputExtension(formatKey: unknown): string {
	return (
		(typeof formatKey === 'string' && OUTPUT_EXTENSIONS[formatKey]) ||
		OUTPUT_EXTENSIONS.jpeg
	);
}

// Resolve a filename format string against session/telemetry data to a UNIQUE
// base name (no extension). {counter} is expanded to the first integer that
// doesn't collide, and {counter+n} to that integer plus the offset n (so the
// numbering starts at n); a format without a counter token gets a `-N` suffix
// on collision. `exists(baseName)` must report whether a file for that base
// name already exists (the caller appends the extension + directory) —
// matching Worker.vue's getScreenshotPath-based check exactly.
export function buildUniqueScreenshotName(opts: {
	formatString: string;
	// irsdk session/telemetry shapes are untyped upstream (see filenameFormat.ts)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sessionInfo: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	telemetry: any;
	exists: (baseName: string) => boolean;
}): string {
	const { formatString, sessionInfo, telemetry, exists } = opts;
	const resolved = resolveFilenameFormat(formatString, sessionInfo, telemetry);

	// Counter tokens: first non-colliding integer starting at 0, with each
	// {counter+n} rendering that integer plus its offset. fillCounterTokens
	// expands EVERY occurrence (cq-utilities#4: a single String.replace hit only
	// the first, leaving a literal '{counter}' behind in a two-counter format).
	if (hasCounterToken(resolved)) {
		let count = 0;
		let name = fillCounterTokens(resolved, count);
		while (exists(name)) {
			count += 1;
			name = fillCounterTokens(resolved, count);
		}
		return name;
	}

	// No counter token: keep the resolved name, but disambiguate a collision
	// with a `-N` suffix starting at 1.
	if (exists(resolved)) {
		let count = 1;
		while (exists(`${resolved}-${count}`)) {
			count += 1;
		}
		return `${resolved}-${count}`;
	}
	return resolved;
}

export interface CropRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

// Watermark margin, as a fraction of each axis, for the two crop modes:
//   top-left  3% off the bottom-right corner only (the legacy behaviour)
//   centered  3% off every side, i.e. 6% of each axis in total
//
// These were literals duplicated in two places in SideBar.vue, which is why long
// exposure could not honour Crop Watermark: the main process had no way to ask
// what the setting meant in pixels. Same reason capture-resolution.ts exists.
export const WATERMARK_MARGIN_TOP_LEFT = 0.03;
export const WATERMARK_MARGIN_CENTERED = 0.06;

// The SAVED size for a frame rendered at width x height under the current crop
// setting. iRacing is resized to the full render size and the watermark is
// trimmed INWARD from the captured frame, so the file ends up slightly smaller
// than the nominal resolution — deliberately, because the alternative (render
// 6% larger and crop back to nominal) forces ~12% more pixels at exactly the
// resolutions where iRacing OOM-crashes.
//
// Crop off, or a degenerate size, returns the input unchanged.
export function resolveCropTarget(opts: {
	width: number;
	height: number;
	crop: boolean;
	cropTopLeft: boolean;
}): { width: number; height: number } {
	const { width, height, crop, cropTopLeft } = opts;
	if (!crop || !(width > 0) || !(height > 0)) {
		return { width, height };
	}
	const margin = cropTopLeft
		? WATERMARK_MARGIN_TOP_LEFT
		: WATERMARK_MARGIN_CENTERED;
	return {
		width: width - Math.ceil(width * margin),
		height: height - Math.ceil(height * margin),
	};
}

// Compute the extract rectangle for a captured frame given the target output
// size (the render size minus the watermark margin). Returns null when no crop
// applies (crop off, or no target size), in which case the caller saves the full
// frame. Geometry mirrors Worker.vue's saveReshadeImage exactly:
//   - top-left mode: keep the top-left target×target region (drops the
//     bottom-right watermark corner)
//   - centered mode: trim the margin equally from all sides
// It does NOT clamp the rect to the source — the caller validates bounds (the
// legacy paths assume target <= source; the WGC path guards explicitly).
export function resolveCropRect(opts: {
	sourceWidth: number;
	sourceHeight: number;
	targetWidth: number | null | undefined;
	targetHeight: number | null | undefined;
	crop: boolean;
	cropTopLeft: boolean;
}): CropRect | null {
	const {
		sourceWidth,
		sourceHeight,
		targetWidth,
		targetHeight,
		crop,
		cropTopLeft,
	} = opts;
	if (!crop || !targetWidth || !targetHeight) {
		return null;
	}
	if (cropTopLeft) {
		return { left: 0, top: 0, width: targetWidth, height: targetHeight };
	}
	return {
		left: Math.round((sourceWidth - targetWidth) / 2),
		top: Math.round((sourceHeight - targetHeight) / 2),
		width: targetWidth,
		height: targetHeight,
	};
}
