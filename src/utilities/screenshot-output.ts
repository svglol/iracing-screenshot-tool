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
import { resolveFilenameFormat } from './filenameFormat';

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
// doesn't collide; a format without {counter} gets a `-N` suffix on collision.
// `exists(baseName)` must report whether a file for that base name already
// exists (the caller appends the extension + directory) — matching Worker.vue's
// getScreenshotPath-based check exactly.
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

	// {counter}: first non-colliding integer starting at 0.
	if (resolved.includes('{counter}')) {
		let count = 0;
		let name = resolved.replace('{counter}', String(count));
		while (exists(name)) {
			count += 1;
			name = resolved.replace('{counter}', String(count));
		}
		return name;
	}

	// No {counter}: keep the resolved name, but disambiguate a collision with a
	// `-N` suffix starting at 1.
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
