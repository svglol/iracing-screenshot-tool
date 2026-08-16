// The filesystem layer for the iRacing configuration editor.
//
// Sibling of iracing-profiles-store, with one crucial difference: profiles
// swap whole files as opaque bytes, while this store edits individual VALUES
// inside a file iRacing owns — through the span-replacing writer in
// utilities/ini-document, which cannot create keys or sections, only change
// what already exists. Combined with the curated schema, the writable surface
// is a closed set.
//
// Same safety rules as the profiles store, applied to EVERY write (profiles
// only guard apply):
//
//   1. Never while iRacing runs — it holds these settings in memory and
//      rewrites the file on exit, silently discarding anything written now.
//   2. Never without a backup — into this feature's OWN backups directory,
//      with its own rotation, so rapid setting-tweak saves cannot evict the
//      profiles feature's pre-apply backups.
//   3. Never blind — a save carries the mtime the editor read, and a mismatch
//      (iRacing rewrote the file, the user restored a backup) refuses with
//      'staleFile' instead of clobbering state the editor never saw.

import * as fs from 'fs';
import * as path from 'path';

import {
	parseIniDocument,
	getValue,
	patchValues,
	type IniEdit,
} from '../utilities/ini-document';
import {
	SETTINGS,
	settingId,
	findSetting,
	validateValue,
} from '../utilities/iracing-settings-schema';
import {
	getIracingFolder,
	rendererModeFromFileName,
	rendererIniFileName,
	splitRendererMode,
} from '../utilities/iracing-paths';
import { ensureDir, writeAtomic, backupFile } from './atomic-file';

const CONFIG_DIR_NAME = 'iracing-config';
const BACKUPS_DIR_NAME = '.backups';

export type ConfigStoreError =
	| 'fileNotFound'
	| 'iracingRunning'
	| 'staleFile'
	| 'keyNotFound'
	| 'validationFailed'
	| 'ioError';

// `error?: undefined` on the success branch is load-bearing: strictNullChecks
// is off, so TypeScript will not narrow this union by its boolean discriminant
// without it (same pattern as the profiles store).
export type ConfigStoreResult<T = object> =
	| ({ ok: true; error?: undefined } & T)
	| { ok: false; error: ConfigStoreError };

export interface RendererMode {
	/** Display mode: 'Monitor', 'OpenXR', … or 'Legacy' for rendererDX11.ini. */
	mode: string;
	fileName: string;
	mtimeMs: number;
}

export interface ConfigStoreContext {
	/** Stored `iracingFolder` setting; '' means auto-resolve. */
	iracingFolder: string;
	iracingRunning: boolean;
}

/** One changed setting: id is the schema's 'Section/key'. */
export interface SettingEdit {
	id: string;
	value: string;
}

// --- location ----------------------------------------------------------------

let configDirOverride: string | null = null;

/** Test seam: point this feature's userData corner at a scratch directory. */
export function setConfigDirForTesting(dir: string | null): void {
	configDirOverride = dir;
}

function getConfigDir(): string {
	if (configDirOverride) {
		return configDirOverride;
	}
	// Required lazily so importing this module does not need an Electron host.
	const { app } = require('electron');
	return path.join(app.getPath('userData'), CONFIG_DIR_NAME);
}

function getBackupsDir(): string {
	return path.join(getConfigDir(), BACKUPS_DIR_NAME);
}

function iniPathForMode(mode: string, ctx: ConfigStoreContext): string {
	return path.join(
		getIracingFolder(ctx.iracingFolder),
		rendererIniFileName(mode)
	);
}

// --- reading -----------------------------------------------------------------

// Sort helper: Monitor's group leads (it is the mode this tool's capture
// pipeline cares about, and the default selection), other base modes follow
// alphabetically — with each mode's custom configs (`Monitor - Screenshot`)
// kept directly behind their base so the dropdown reads as groups.
function modeSortKey(mode: string): {
	base: string;
	monitorFirst: number;
	custom: string;
} {
	const { base, custom } = splitRendererMode(mode);
	return {
		base,
		monitorFirst: base.toLowerCase() === 'monitor' ? 0 : 1,
		// '' sorts the base config itself ahead of its custom configs.
		custom: custom ?? '',
	};
}

/**
 * Every renderer config present in the iRacing folder, Monitor and its custom
 * configs first, the remaining modes alphabetical with their own custom
 * configs behind them. An unreadable or absent folder lists as empty rather
 * than failing — the page explains and offers the folder picker.
 */
export function listModes(
	ctx: ConfigStoreContext
): ConfigStoreResult<{ modes: RendererMode[]; folder: string }> {
	const folder = getIracingFolder(ctx.iracingFolder);
	let entries: string[];
	try {
		entries = fs.readdirSync(folder);
	} catch {
		return { ok: true, modes: [], folder };
	}

	const modes: RendererMode[] = [];
	for (const entry of entries) {
		const mode = rendererModeFromFileName(entry);
		if (mode === null) {
			continue;
		}
		try {
			const stats = fs.statSync(path.join(folder, entry));
			if (!stats.isFile()) {
				continue;
			}
			modes.push({ mode, fileName: entry, mtimeMs: stats.mtimeMs });
		} catch {
			// Vanished between readdir and stat — skip.
		}
	}

	modes.sort((a, b) => {
		const ka = modeSortKey(a.mode);
		const kb = modeSortKey(b.mode);
		return (
			ka.monitorFirst - kb.monitorFirst ||
			ka.base.localeCompare(kb.base, undefined, { sensitivity: 'base' }) ||
			ka.custom.localeCompare(kb.custom, undefined, { sensitivity: 'base' })
		);
	});

	return { ok: true, modes, folder };
}

export interface ConfigReadPayload {
	/** settingId -> raw value string, for schema keys present in the file. */
	values: Record<string, string>;
	/** settingIds the schema curates but the file does not contain. */
	missing: string[];
	mtimeMs: number;
	path: string;
	fileName: string;
}

export function readConfig(
	mode: string,
	ctx: ConfigStoreContext
): ConfigStoreResult<ConfigReadPayload> {
	const filePath = iniPathForMode(mode, ctx);

	let bytes: Buffer;
	let mtimeMs: number;
	try {
		bytes = fs.readFileSync(filePath);
		mtimeMs = fs.statSync(filePath).mtimeMs;
	} catch {
		return { ok: false, error: 'fileNotFound' };
	}

	const doc = parseIniDocument(bytes);
	const values: Record<string, string> = {};
	const missing: string[] = [];
	for (const setting of SETTINGS) {
		const value = getValue(doc, setting.section, setting.key);
		if (value === undefined) {
			missing.push(settingId(setting));
		} else {
			values[settingId(setting)] = value;
		}
	}

	return {
		ok: true,
		values,
		missing,
		mtimeMs,
		path: filePath,
		fileName: path.basename(filePath),
	};
}

// --- writing -----------------------------------------------------------------

/** The section a paired graphics setting mirrors into. */
const REPLAY_GRAPHICS_SECTION = 'Replay Graphics';

/**
 * Apply `edits` to the mode's renderer ini.
 *
 * The full guard pipeline runs before a byte is written; a failure at any step
 * leaves the file untouched. On success the fresh mtime comes back so the
 * editor's stale detection stays armed without a second read.
 *
 * With `pairReplay`, edits to settings flagged `pairedReplay` are mirrored
 * into [Replay Graphics] — but only when the file actually carries the key
 * there. The writer never inserts, and renderer inis routinely omit some
 * replay twins, so an absent twin silently skips its mirror rather than
 * refusing the save.
 */
export function saveConfig(
	mode: string,
	edits: SettingEdit[],
	expectedMtimeMs: number,
	ctx: ConfigStoreContext,
	options: { pairReplay?: boolean } = {}
): ConfigStoreResult<{ mtimeMs: number; backedUp: boolean }> {
	if (ctx.iracingRunning) {
		return { ok: false, error: 'iracingRunning' };
	}

	// Resolve every edit against the schema first: an id outside the curated
	// set or a value outside its rails refuses the whole batch.
	const resolved: Array<{ edit: IniEdit; pairedReplay: boolean }> = [];
	for (const edit of edits) {
		const setting = findSetting(edit.id);
		if (!setting || !validateValue(setting, edit.value)) {
			return { ok: false, error: 'validationFailed' };
		}
		resolved.push({
			edit: {
				section: setting.section,
				key: setting.key,
				value: String(edit.value).trim(),
			},
			pairedReplay: Boolean(setting.pairedReplay),
		});
	}

	const filePath = iniPathForMode(mode, ctx);
	let stats: fs.Stats;
	try {
		stats = fs.statSync(filePath);
	} catch {
		return { ok: false, error: 'fileNotFound' };
	}
	if (stats.mtimeMs !== expectedMtimeMs) {
		return { ok: false, error: 'staleFile' };
	}

	if (resolved.length === 0) {
		// Nothing to change; succeed without touching the file.
		return { ok: true, mtimeMs: stats.mtimeMs, backedUp: false };
	}

	let bytes: Buffer;
	try {
		bytes = fs.readFileSync(filePath);
	} catch {
		return { ok: false, error: 'ioError' };
	}

	const doc = parseIniDocument(bytes);
	const iniEdits: IniEdit[] = resolved.map((entry) => entry.edit);
	if (options.pairReplay) {
		for (const { edit, pairedReplay } of resolved) {
			if (
				pairedReplay &&
				getValue(doc, REPLAY_GRAPHICS_SECTION, edit.key) !== undefined
			) {
				iniEdits.push({
					section: REPLAY_GRAPHICS_SECTION,
					key: edit.key,
					value: edit.value,
				});
			}
		}
	}

	const patched = patchValues(doc, iniEdits);
	if (!patched.ok) {
		// A curated key the file does not contain: the writer never inserts,
		// so this batch cannot be applied to this file.
		return { ok: false, error: 'keyNotFound' };
	}

	let backedUp: boolean;
	try {
		ensureDir(getBackupsDir());
		backedUp = backupFile(
			filePath,
			getBackupsDir(),
			path.basename(filePath, '.ini')
		);
		writeAtomic(filePath, patched.bytes);
	} catch {
		return { ok: false, error: 'ioError' };
	}

	try {
		return { ok: true, mtimeMs: fs.statSync(filePath).mtimeMs, backedUp };
	} catch {
		return { ok: false, error: 'ioError' };
	}
}
