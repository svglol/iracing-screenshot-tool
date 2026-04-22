'use strict';

const path = require('path');
const os = require('os');
const { normalizeCaptureBounds } = require('../utilities/desktop-capture.ts');

const knownUserProfileFolders = new Set([
	'desktop',
	'documents',
	'downloads',
	'music',
	'pictures',
	'videos',
]);

function isPlainObject(value) {
	return value && typeof value === 'object' && !Array.isArray(value);
}

function mergePlainObjects(...objects) {
	return objects.reduce((result, value) => {
		if (!isPlainObject(value)) {
			return result;
		}

		Object.entries(value).forEach(([key, entryValue]) => {
			if (isPlainObject(entryValue) && isPlainObject(result[key])) {
				result[key] = mergePlainObjects(result[key], entryValue);
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

function serializeBounds(bounds) {
	return normalizeCaptureBounds(bounds);
}

function serializeDisplay(display) {
	if (!display || typeof display !== 'object') {
		return null;
	}

	return {
		id: display.id,
		label: String(display.label || ''),
		bounds: serializeBounds(display.bounds),
		workArea: serializeBounds(display.workArea),
		scaleFactor: Number(display.scaleFactor || 0),
		rotation: Number(display.rotation || 0),
		internal: Boolean(display.internal),
		touchSupport: String(display.touchSupport || 'unknown'),
	};
}

function summarizeDesktopSource(source) {
	return {
		id: String(source?.id || ''),
		name: String(source?.name || ''),
		display_id: String(source?.display_id || ''),
	};
}

function summarizeDesktopSources(sources = [], limit = 10) {
	return sources.slice(0, limit).map(summarizeDesktopSource);
}

function createScreenshotErrorPayload(errorLike, defaults = {}) {
	const payload =
		errorLike &&
		typeof errorLike === 'object' &&
		!Array.isArray(errorLike) &&
		(typeof errorLike.message === 'string' ||
			typeof errorLike.error === 'string')
			? errorLike
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

function trimWrappedQuotes(value = '') {
	return String(value)
		.trim()
		.replace(/^"(.*)"$/, '$1');
}

function expandWindowsEnvironmentVariables(value = '') {
	return String(value).replace(/%([^%]+)%/g, (match, name) => {
		const envValue = process.env[name];
		return typeof envValue === 'string' && envValue.length > 0
			? envValue
			: match;
	});
}

function normalizeComparableWindowsPath(value = '') {
	return path.win32
		.normalize(String(value || ''))
		.replace(/[\\\/]+$/, '')
		.toLowerCase();
}

function getWindowsUserProfileRoot(value = '') {
	const match = String(value || '').match(/^[a-z]:\\users\\[^\\]+/i);
	return match ? match[0] : '';
}

function resolveReshadeBasePath(reshadeIni = {}, reshadeIniPath = '') {
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

function remapForeignUserProfileFolder(folder) {
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
	const [topLevelFolder] = relativePath.split(/[\\\/]+/);

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

function createReshadeConfigError(message, meta = {}) {
	const error = new Error(message);
	error.meta = meta;
	return error;
}

function getReshadeScreenshotFolder(reshadeIni = {}, reshadeIniPath = '') {
	const rawFolder =
		reshadeIni.SCREENSHOT?.SavePath || reshadeIni.GENERAL?.ScreenshotPath;

	if (!rawFolder) {
		throw createReshadeConfigError(
			'Unable to determine the ReShade screenshot folder'
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
		console.log(
			`ReShade screenshot folder remapped from "${remappedFrom}" to "${folder}"`
		);
	}

	return {
		folder,
		rawFolder,
		basePath,
		remappedFrom,
	};
}

function normalizeFileKey(filePath) {
	return path.resolve(filePath).toLowerCase();
}

function parseCameraState(iracingCameraState = []) {
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

module.exports = {
	isPlainObject,
	mergePlainObjects,
	serializeBounds,
	serializeDisplay,
	summarizeDesktopSource,
	summarizeDesktopSources,
	createScreenshotErrorPayload,
	trimWrappedQuotes,
	expandWindowsEnvironmentVariables,
	normalizeComparableWindowsPath,
	getWindowsUserProfileRoot,
	resolveReshadeBasePath,
	remapForeignUserProfileFolder,
	createReshadeConfigError,
	getReshadeScreenshotFolder,
	normalizeFileKey,
	parseCameraState,
};
