// Typed CJS requires for Node built-ins so Vite's renderer target does NOT
// rewrite them to the __vite-browser-external shim (which lacks join/homedir).
// Electron's Node integration resolves bare-name requires at runtime. Same
// convention as utilities/config.ts, utilities/logger.ts and
// utilities/iracing-config-checks.ts.
const path: typeof import('path') = require('path');
const os: typeof import('os') = require('os');

// The ACTIVE graphics config. iRacing reads this at startup and rewrites it on
// exit, so it is the one filename that matters: a stored profile is just this
// file's bytes kept under a different name, and applying one means putting those
// bytes back here.
export const RENDERER_INI_NAME = 'rendererDX11Monitor.ini';

const IRACING_FOLDER_NAME = 'iRacing';

// Deliberately NOT importing utilities/config here. config.ts constructs an
// electron-store at module load, which throws outside an Electron host and would
// make this module — and everything importing it — impossible to unit test. The
// stored override is passed in by callers, who already hold a config handle.

// Cached: in the renderer this lookup crosses a synchronous IPC boundary, and the
// answer cannot change while the app is running.
let documentsDirCache: string | null = null;

/**
 * The user's Documents folder, as Windows itself reports it.
 *
 * Resolved through Electron (`app.getPath('documents')`, or the equivalent sync
 * IPC from the renderer) rather than assembled from the home directory, because
 * that call goes through SHGetKnownFolderPath and therefore follows Known Folder
 * REDIRECTION. A OneDrive-backed Documents folder lives at
 * `%USERPROFILE%\OneDrive\Documents`, which `homedir()/Documents` misses
 * entirely — and that is a very common setup.
 *
 * Falls back to the conventional location when there is no Electron host (unit
 * tests) so importing this module never requires one.
 */
export function getDocumentsDir(): string {
	if (documentsDirCache !== null) {
		return documentsDirCache;
	}

	documentsDirCache =
		documentsDirFromHost() ?? path.join(os.homedir(), 'Documents');
	return documentsDirCache;
}

function documentsDirFromHost(): string | null {
	try {
		// process.type is Electron-injected at runtime. Cast through a loose shape
		// so this compiles under both the src/utilities-only tsc scope (no electron
		// types) and the src/main expanded scope (which declares process.type).
		if ((process as { type?: string }).type === 'renderer') {
			const { ipcRenderer } = require('electron');
			const documents = ipcRenderer.sendSync(
				'app:getPath-sync',
				'documents'
			);
			return typeof documents === 'string' && documents ? documents : null;
		}

		const { app } = require('electron');
		const documents = app.getPath('documents');
		return typeof documents === 'string' && documents ? documents : null;
	} catch {
		// No Electron host, or the path is not registered on this platform.
		return null;
	}
}

/**
 * Where iRacing keeps its configuration.
 *
 * A non-empty `override` wins outright — the escape hatch for an install we
 * cannot discover (Documents moved to another drive, a relocated iRacing dir).
 * Pure, so the precedence rule is testable without an Electron host.
 */
export function resolveIracingFolder(
	documentsDir: string,
	override = ''
): string {
	const trimmed = (override || '').trim();
	if (trimmed) {
		return trimmed;
	}
	return path.join(documentsDir, IRACING_FOLDER_NAME);
}

/** `resolveIracingFolder` against the live Documents folder. */
export function getIracingFolder(override = ''): string {
	return resolveIracingFolder(getDocumentsDir(), override);
}

/** Full path to the active `rendererDX11Monitor.ini`. */
export function getRendererIniPath(override = ''): string {
	return path.join(getIracingFolder(override), RENDERER_INI_NAME);
}

// --- per-display-mode renderer files -----------------------------------------
//
// iRacing keeps one renderer config PER DISPLAY MODE: rendererDX11Monitor.ini,
// rendererDX11Oculus.ini, rendererDX11OpenVR.ini, rendererDX11OpenXR.ini —
// plus a bare rendererDX11.ini that only launches from the old members site
// still read. The config-editor page edits whichever of these the user picks;
// the profiles feature above deliberately stays pinned to the Monitor file.

export const RENDERER_INI_PREFIX = 'rendererDX11';

/** The bare `rendererDX11.ini`, presented as its own pseudo-mode. */
export const RENDERER_LEGACY_MODE = 'Legacy';

/**
 * The display mode a renderer ini filename belongs to, or null for files that
 * are not renderer configs at all. `rendererDX11OpenXR.ini` -> 'OpenXR';
 * the suffix-less `rendererDX11.ini` -> 'Legacy'. Case-insensitive on the
 * prefix/extension, but the returned mode keeps the file's own casing so the
 * path can be rebuilt exactly.
 */
export function rendererModeFromFileName(fileName: string): string | null {
	const match = /^rendererDX11(.*)\.ini$/i.exec(fileName.trim());
	if (!match) {
		return null;
	}
	return match[1] === '' ? RENDERER_LEGACY_MODE : match[1];
}

/** Filename for a display mode; inverse of `rendererModeFromFileName`. */
export function rendererIniFileName(mode: string): string {
	const suffix = mode === RENDERER_LEGACY_MODE ? '' : mode;
	return `${RENDERER_INI_PREFIX}${suffix}.ini`;
}

/** The display modes iRacing itself ships renderer configs for. */
export const RENDERER_BASE_MODES = ['Monitor', 'Oculus', 'OpenVR', 'OpenXR'];

/**
 * A mode string split into its base display mode and custom-config name.
 *
 * iRacing's UI can keep several graphics configs per display mode; a custom
 * one is stored as `rendererDX11<Base> - <Name>.ini`, so its mode string
 * arrives here as `<Base> - <Name>`. iRacing's own config switcher lists such
 * a config by its bare <Name>, and this split is what lets ours do the same.
 *
 * The base must be one of iRacing's known display modes (matched
 * case-insensitively, like the filename prefix) — anything else, including
 * 'Legacy', is a base mode with `custom: null`. The name keeps every byte
 * after the ` - ` separator, dashes included, so the filename can be rebuilt
 * exactly.
 */
export function splitRendererMode(mode: string): {
	base: string;
	custom: string | null;
} {
	for (const base of RENDERER_BASE_MODES) {
		const separator = base.length + ' - '.length;
		if (
			mode.slice(0, separator).toLowerCase() ===
				`${base.toLowerCase()} - ` &&
			mode.length > separator
		) {
			return {
				base: mode.slice(0, base.length),
				custom: mode.slice(separator),
			};
		}
	}
	return { base: mode, custom: null };
}

/** Full path to the renderer ini for a display mode. */
export function rendererIniPathForMode(mode: string, override = ''): string {
	return path.join(getIracingFolder(override), rendererIniFileName(mode));
}

/** Test seam: drop the memoised Documents lookup. */
export function resetDocumentsDirCache(): void {
	documentsDirCache = null;
}
