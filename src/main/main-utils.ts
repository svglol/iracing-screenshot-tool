import * as path from 'path';
import * as os from 'os';
import { normalizeCaptureBounds } from '../utilities/desktop-capture';
import { createLogger } from '../utilities/logger';
import {
	classifyReshadeIniError,
	describeReshadeIniProblem,
	inspectReshadeIni,
	readReshadeSavePath,
} from '../utilities/reshade-config';

const log = createLogger('main-utils');

interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface SerializedDisplay {
	id: unknown;
	label: string;
	bounds: Bounds | null;
	workArea: Bounds | null;
	scaleFactor: number;
	rotation: number;
	internal: boolean;
	touchSupport: string;
}

// Loose shape for desktopCapturer sources. We accept extra fields (test
// literals supply `extra: 'ignored'`, Electron's DesktopCapturerSource adds
// `thumbnail`/`appIcon`/etc.). The `any` here is transitional per D-12-08 —
// TypeScript's excess-property check otherwise rejects both callers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DesktopSourceLike = any;

interface DesktopSourceSummary {
	id: string;
	name: string;
	display_id: string;
}

interface ScreenshotErrorPayload {
	message: string;
	stack: string;
	source: string;
	context: string;
	meta: Record<string, unknown>;
	diagnostics: Record<string, unknown>;
}

interface ScreenshotErrorDefaults {
	message?: string;
	stack?: string;
	source?: string;
	context?: string;
	meta?: unknown;
	diagnostics?: unknown;
}

// Exported because index.ts now holds both of these across the capture: it
// parses the ini in the pre-flight and hands the parsed result down to the
// ReShade branch, rather than re-reading it there.
export interface ReshadeIni {
	INSTALL?: { BasePath?: string };
	SCREENSHOT?: { SavePath?: string };
	GENERAL?: { ScreenshotPath?: string };
	[section: string]: unknown;
}

interface ReshadeConfigError extends Error {
	meta?: Record<string, unknown>;
}

export interface ReshadeScreenshotFolder {
	folder: string;
	rawFolder: string;
	basePath: string;
	remappedFrom: string;
}

const knownUserProfileFolders = new Set([
	'desktop',
	'documents',
	'downloads',
	'music',
	'pictures',
	'videos',
]);

export function isPlainObject(
	value: unknown
): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function mergePlainObjects(
	...objects: unknown[]
): Record<string, unknown> {
	return objects.reduce<Record<string, unknown>>((result, value) => {
		if (!isPlainObject(value)) {
			return result;
		}

		Object.entries(value).forEach(([key, entryValue]) => {
			if (isPlainObject(entryValue) && isPlainObject(result[key])) {
				result[key] = mergePlainObjects(
					result[key] as Record<string, unknown>,
					entryValue
				);
				return;
			}

			if (isPlainObject(entryValue)) {
				result[key] = mergePlainObjects(entryValue);
				return;
			}

			if (Array.isArray(entryValue)) {
				result[key] = entryValue.slice();
				return;
			}

			result[key] = entryValue;
		});

		return result;
	}, {});
}

export function serializeBounds(bounds: unknown): Bounds | null {
	return normalizeCaptureBounds(bounds);
}

export function serializeDisplay(display: unknown): SerializedDisplay | null {
	if (!display || typeof display !== 'object') {
		return null;
	}

	const d = display as Record<string, unknown>;
	return {
		id: d.id,
		label: String(d.label || ''),
		bounds: serializeBounds(d.bounds),
		workArea: serializeBounds(d.workArea),
		scaleFactor: Number(d.scaleFactor || 0),
		rotation: Number(d.rotation || 0),
		internal: Boolean(d.internal),
		touchSupport: String(d.touchSupport || 'unknown'),
	};
}

export function summarizeDesktopSource(
	source: DesktopSourceLike | null | undefined
): DesktopSourceSummary {
	return {
		id: String(source?.id || ''),
		name: String(source?.name || ''),
		display_id: String(source?.display_id || ''),
	};
}

export function summarizeDesktopSources(
	sources: DesktopSourceLike[] = [],
	limit = 10
): DesktopSourceSummary[] {
	return sources.slice(0, limit).map(summarizeDesktopSource);
}

export function createScreenshotErrorPayload(
	errorLike: unknown,
	defaults: ScreenshotErrorDefaults = {}
): ScreenshotErrorPayload {
	const payload =
		errorLike &&
		typeof errorLike === 'object' &&
		!Array.isArray(errorLike) &&
		(typeof (errorLike as Record<string, unknown>).message === 'string' ||
			typeof (errorLike as Record<string, unknown>).error === 'string')
			? (errorLike as Record<string, unknown>)
			: null;

	if (payload) {
		return {
			message: String(
				payload.message ||
					payload.error ||
					defaults.message ||
					'Unknown screenshot error'
			),
			stack: String(payload.stack || defaults.stack || ''),
			source: String(payload.source || defaults.source || 'main'),
			context: String(payload.context || defaults.context || ''),
			meta: mergePlainObjects(defaults.meta, payload.meta),
			diagnostics: mergePlainObjects(
				defaults.diagnostics,
				payload.diagnostics
			),
		};
	}

	const message = String(
		errorLike || defaults.message || 'Unknown screenshot error'
	);
	const error = errorLike instanceof Error ? errorLike : new Error(message);

	return {
		message: error.message || message,
		stack: String(error.stack || ''),
		source: String(defaults.source || 'main'),
		context: String(defaults.context || ''),
		meta: mergePlainObjects(defaults.meta),
		diagnostics: mergePlainObjects(defaults.diagnostics),
	};
}

export function trimWrappedQuotes(value: unknown = ''): string {
	return String(value)
		.trim()
		.replace(/^"(.*)"$/, '$1');
}

export function expandWindowsEnvironmentVariables(value: unknown = ''): string {
	return String(value).replace(/%([^%]+)%/g, (match, name: string) => {
		const envValue = process.env[name];
		return typeof envValue === 'string' && envValue.length > 0
			? envValue
			: match;
	});
}

export function normalizeComparableWindowsPath(value: unknown = ''): string {
	return path.win32
		.normalize(String(value || ''))
		.replace(/[\\/]+$/, '')
		.toLowerCase();
}

export function getWindowsUserProfileRoot(value: unknown = ''): string {
	const match = String(value || '').match(/^[a-z]:\\users\\[^\\]+/i);
	return match ? match[0] : '';
}

export function resolveReshadeBasePath(
	reshadeIni: ReshadeIni = {},
	reshadeIniPath = ''
): string {
	const iniDir = reshadeIniPath ? path.dirname(reshadeIniPath) : process.cwd();
	const rawBasePath = trimWrappedQuotes(
		expandWindowsEnvironmentVariables(reshadeIni.INSTALL?.BasePath || '')
	);

	if (!rawBasePath) {
		return iniDir;
	}

	return path.win32.isAbsolute(rawBasePath)
		? path.win32.normalize(rawBasePath)
		: path.win32.resolve(iniDir, rawBasePath);
}

export function remapForeignUserProfileFolder(folder: string): {
	folder: string;
	remappedFrom: string;
} {
	const normalizedFolder = path.win32.normalize(folder);
	const currentProfileRoot = getWindowsUserProfileRoot(
		path.win32.resolve(os.homedir())
	);
	const targetProfileRoot = getWindowsUserProfileRoot(normalizedFolder);

	if (!currentProfileRoot || !targetProfileRoot) {
		return {
			folder: normalizedFolder,
			remappedFrom: '',
		};
	}

	if (
		normalizeComparableWindowsPath(currentProfileRoot) ===
		normalizeComparableWindowsPath(targetProfileRoot)
	) {
		return {
			folder: normalizedFolder,
			remappedFrom: '',
		};
	}

	const relativePath = path.win32.relative(
		targetProfileRoot,
		normalizedFolder
	);
	const [topLevelFolder] = relativePath.split(/[\\/]+/);

	if (
		!relativePath ||
		relativePath.startsWith('..') ||
		!knownUserProfileFolders.has(String(topLevelFolder || '').toLowerCase())
	) {
		return {
			folder: normalizedFolder,
			remappedFrom: '',
		};
	}

	return {
		folder: path.win32.join(currentProfileRoot, relativePath),
		remappedFrom: normalizedFolder,
	};
}

export function createReshadeConfigError(
	message: string,
	meta: Record<string, unknown> = {}
): ReshadeConfigError {
	const error = new Error(message) as ReshadeConfigError;
	error.meta = meta;
	return error;
}

/**
 * Rephrase a failed ReShade ini read as something the user can act on, keeping
 * the original errno in `meta` so the error log still says exactly what the
 * filesystem said.
 *
 * Returns the error UNTOUCHED when we cannot name the problem. A raw errno is a
 * poor message, but a confident wrong one is worse: it sends the user to fix a
 * setting that was never broken, and it erases the only evidence of whatever
 * actually happened. Only the two failures we can name get rewritten.
 */
export function describeReshadeIniError(
	error: unknown,
	reshadeFile: string
): unknown {
	const problem = classifyReshadeIniError(error);
	if (!problem) {
		return error;
	}

	return createReshadeConfigError(
		describeReshadeIniProblem(problem, reshadeFile),
		{
			reshadeFile,
			code: (error as NodeJS.ErrnoException).code,
			problem,
			// The rewrite gives the error a NEW stack, so the filesystem's own
			// wording would otherwise be gone from the log — and that wording is what
			// tells us apart a path that is absent from one that resolved somewhere
			// unexpected. The sentence the user reads is ours; the line the log keeps
			// is still the OS's.
			originalMessage: (error as Error)?.message,
		}
	);
}

export function getReshadeScreenshotFolder(
	reshadeIni: ReshadeIni = {},
	reshadeIniPath = ''
): ReshadeScreenshotFolder {
	const rawFolder = readReshadeSavePath(reshadeIni);

	if (!rawFolder) {
		// Was a flat "Unable to determine the ReShade screenshot folder" — a
		// symptom, in English only, naming neither the mistake nor the fix. The
		// 2026-08-28 reporter read it twelve times while swapping one ReShade
		// PRESET for another. inspectReshadeIni cannot return null here (null means
		// a save path exists, and we just found none), so this always names
		// something specific.
		const problem = inspectReshadeIni(reshadeIni);
		throw createReshadeConfigError(
			describeReshadeIniProblem(problem, reshadeIniPath),
			{
				reshadeFile: reshadeIniPath,
				problem,
				// What the file DID contain. The old error carried no meta at all, so
				// the field report could only imply "that was a preset" from the
				// filename — the log itself could not say.
				iniSections: Object.keys(reshadeIni || {}),
			}
		);
	}

	const expandedFolder = trimWrappedQuotes(
		expandWindowsEnvironmentVariables(rawFolder)
	);
	const basePath = resolveReshadeBasePath(reshadeIni, reshadeIniPath);
	const resolvedFolder = path.win32.isAbsolute(expandedFolder)
		? path.win32.normalize(expandedFolder)
		: path.win32.resolve(basePath, expandedFolder);
	const { folder, remappedFrom } =
		remapForeignUserProfileFolder(resolvedFolder);

	if (remappedFrom) {
		log.info('ReShade screenshot folder remapped', {
			from: remappedFrom,
			to: folder,
		});
	}

	return {
		folder,
		rawFolder,
		basePath,
		remappedFrom,
	};
}

export function normalizeFileKey(filePath: string): string {
	return path.resolve(filePath).toLowerCase();
}

export function parseCameraState(iracingCameraState: string[] = []): number {
	let cameraState = 0;

	iracingCameraState.forEach((state) => {
		switch (state) {
			case 'IsSessionScreen':
				cameraState += 1;
				break;
			case 'IsScenicActive':
				cameraState += 2;
				break;
			case 'CamToolActive':
				cameraState += 4;
				break;
			case 'UIHidden':
				cameraState += 8;
				break;
			case 'UseAutoShotSelection':
				cameraState += 16;
				break;
			case 'UseTemporaryEdits':
				cameraState += 32;
				break;
			case 'UseKeyAcceleration':
				cameraState += 64;
				break;
			case 'UseKey10xAcceleration':
				cameraState += 128;
				break;
			case 'UseMouseAimMode':
				cameraState += 256;
				break;
			default:
				break;
		}
	});

	if (!iracingCameraState.includes('CamToolActive')) {
		cameraState += 4;
	}

	return cameraState;
}
