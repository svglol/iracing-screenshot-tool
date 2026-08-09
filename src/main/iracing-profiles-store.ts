// The filesystem layer for graphics-config profiles.
//
// Every decision about WHETHER something is legal lives in
// utilities/iracing-profiles (pure, heavily tested). This module owns only the
// I/O: where files live, how they are copied, and how the previous state is
// preserved before anything is overwritten.
//
// Two rules run through all of it:
//
//   1. Profiles are copied BYTE FOR BYTE. Never read-as-string-and-rewrite —
//      that is how an encoding or line-ending change sneaks into a file another
//      program parses.
//   2. Nothing is overwritten without a backup first. Applying a profile
//      destroys the live config, and the live config may be settings the user
//      spent an evening tuning and never saved.

import * as fs from 'fs';
import * as path from 'path';

import {
	checkProfileName,
	hashIni,
	countIniDifferences,
	profileFileName,
	profileNameFromFile,
	resolveActiveProfile,
	validateRendererIni,
	type ActiveState,
	type IniError,
	type IniWarning,
	type NameError,
} from '../utilities/iracing-profiles';
import { getRendererIniPath } from '../utilities/iracing-paths';

const PROFILES_DIR_NAME = 'graphics-profiles';
const BACKUPS_DIR_NAME = '.backups';
/** Backups of the live config kept before it is overwritten. */
const MAX_BACKUPS = 10;
/** Suffix for the staging file used to make writes atomic. */
const TEMP_SUFFIX = '.iRST-tmp';

export type StoreError =
	| 'profileNotFound'
	| 'profileExists'
	| 'noActiveConfig'
	| 'invalidIni'
	| 'iracingRunning'
	| 'ioError';

export interface StoredProfile {
	name: string;
	hash: string;
	sizeBytes: number;
	modifiedAt: number;
	valid: boolean;
	error: IniError | null;
	warnings: IniWarning[];
}

export interface ProfilesSnapshot {
	profiles: StoredProfile[];
	profilesDir: string;
	activeIniPath: string;
	activeExists: boolean;
	active: { name: string | null; state: ActiveState };
	/** Settings differing between the live config and the profile it came from. */
	activeDifferences: number | null;
	iracingRunning: boolean;
}

export interface StoreContext {
	/** Stored `iracingFolder` setting; '' means auto-resolve. */
	iracingFolder: string;
	/** Stored `activeGraphicsProfile` setting; '' means nothing applied yet. */
	lastAppliedName: string;
	iracingRunning: boolean;
}

// `object` rather than `Record<string, never>` as the default: intersecting the
// latter with `{ ok: true }` yields a type nothing can satisfy, because `ok`
// collides with its `never` index signature.
export type StoreResult<T = object> =
	| ({ ok: true } & T)
	| { ok: false; error: StoreError | NameError };

// --- location ---------------------------------------------------------------

let profilesDirOverride: string | null = null;

/** Test seam: point the store at a scratch directory. */
export function setProfilesDirForTesting(dir: string | null): void {
	profilesDirOverride = dir;
}

export function getProfilesDir(): string {
	if (profilesDirOverride) {
		return profilesDirOverride;
	}
	// Required lazily so importing this module does not need an Electron host.
	const { app } = require('electron');
	return path.join(app.getPath('userData'), PROFILES_DIR_NAME);
}

function getBackupsDir(): string {
	return path.join(getProfilesDir(), BACKUPS_DIR_NAME);
}

function profilePath(name: string): string {
	return path.join(getProfilesDir(), profileFileName(name));
}

function ensureDir(dir: string): void {
	fs.mkdirSync(dir, { recursive: true });
}

// --- deletion ---------------------------------------------------------------

type TrashFn = (fullPath: string) => Promise<void>;
let trashImpl: TrashFn | null = null;

/** Test seam: stand in for Electron's shell.trashItem. */
export function setTrashImplForTesting(fn: TrashFn | null): void {
	trashImpl = fn;
}

function trashItem(fullPath: string): Promise<void> {
	if (trashImpl) {
		return trashImpl(fullPath);
	}
	const { shell } = require('electron');
	return shell.trashItem(fullPath);
}

// --- reading ----------------------------------------------------------------

/**
 * Every stored profile, with its fingerprint and validation verdict.
 *
 * A file that fails validation is still LISTED — hiding it would leave the user
 * staring at a folder containing a profile the app pretends not to see. It is
 * marked invalid instead, and apply refuses it.
 */
export function listProfiles(): StoredProfile[] {
	const dir = getProfilesDir();
	let entries: string[];
	try {
		entries = fs.readdirSync(dir);
	} catch {
		// No directory yet — the normal state before the first profile is saved.
		return [];
	}

	const profiles: StoredProfile[] = [];
	for (const entry of entries) {
		const name = profileNameFromFile(entry);
		if (name === null) {
			continue;
		}
		const fullPath = path.join(dir, entry);
		try {
			const stats = fs.statSync(fullPath);
			if (!stats.isFile()) {
				continue;
			}
			const content = fs.readFileSync(fullPath, 'utf8');
			const validation = validateRendererIni(content);
			profiles.push({
				name,
				hash: hashIni(content),
				sizeBytes: stats.size,
				modifiedAt: stats.mtimeMs,
				valid: validation.valid,
				error: validation.error,
				warnings: validation.warnings,
			});
		} catch {
			// Unreadable file — skip rather than fail the whole listing.
		}
	}

	return profiles.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
	);
}

function readActiveIni(ctx: StoreContext): string | null {
	try {
		return fs.readFileSync(getRendererIniPath(ctx.iracingFolder), 'utf8');
	} catch {
		return null;
	}
}

/** Everything the UI needs in one round trip. */
export function getSnapshot(ctx: StoreContext): ProfilesSnapshot {
	const profiles = listProfiles();
	const activeIniPath = getRendererIniPath(ctx.iracingFolder);
	const activeContent = readActiveIni(ctx);
	const active = resolveActiveProfile(
		activeContent === null ? null : hashIni(activeContent),
		profiles.map((profile) => ({ name: profile.name, hash: profile.hash })),
		ctx.lastAppliedName
	);

	// Only meaningful for a drifted config: how far it has moved from its origin.
	let activeDifferences: number | null = null;
	if (active.state === 'modified' && activeContent !== null && active.name) {
		const origin = profiles.find((profile) => profile.name === active.name);
		if (origin) {
			try {
				activeDifferences = countIniDifferences(
					activeContent,
					fs.readFileSync(profilePath(origin.name), 'utf8')
				);
			} catch {
				activeDifferences = null;
			}
		}
	}

	return {
		profiles,
		profilesDir: getProfilesDir(),
		activeIniPath,
		activeExists: activeContent !== null,
		active,
		activeDifferences,
		iracingRunning: ctx.iracingRunning,
	};
}

// --- writing ----------------------------------------------------------------

/**
 * Replace `destination` with `bytes` without ever leaving a half-written file.
 *
 * Staged in the same directory so the rename stays on one volume — a
 * cross-volume rename degrades to a copy and loses the atomicity that is the
 * entire point. A crash mid-write leaves the original intact and a stray temp
 * file, rather than a truncated ini that would make iRacing re-run its 3D
 * auto-configuration and discard the user's settings.
 */
function writeAtomic(destination: string, bytes: Buffer): void {
	const temp = destination + TEMP_SUFFIX;
	try {
		fs.writeFileSync(temp, bytes);
		fs.renameSync(temp, destination);
	} catch (error) {
		try {
			fs.unlinkSync(temp);
		} catch {
			// Nothing staged, or already gone.
		}
		throw error;
	}
}

/**
 * Preserve the live config before it is overwritten.
 *
 * This is the safety net for the worst outcome this feature could produce:
 * applying a profile over settings the user tuned and never saved.
 */
function backupActiveIni(activeIniPath: string): void {
	let bytes: Buffer;
	try {
		bytes = fs.readFileSync(activeIniPath);
	} catch {
		// Nothing to preserve.
		return;
	}

	const backupsDir = getBackupsDir();
	ensureDir(backupsDir);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	fs.writeFileSync(
		path.join(backupsDir, `rendererDX11Monitor.${stamp}.ini`),
		bytes
	);
	pruneBackups(backupsDir);
}

function pruneBackups(backupsDir: string): void {
	try {
		const files = fs
			.readdirSync(backupsDir)
			.filter((file) => file.toLowerCase().endsWith('.ini'))
			.sort();
		// Names are ISO-stamped, so lexical order is chronological order.
		for (const stale of files.slice(
			0,
			Math.max(0, files.length - MAX_BACKUPS)
		)) {
			fs.unlinkSync(path.join(backupsDir, stale));
		}
	} catch {
		// Pruning is housekeeping — never fail an apply over it.
	}
}

/**
 * Make a stored profile the live configuration.
 *
 * Refuses outright while iRacing is running. iRacing holds its graphics settings
 * in memory and rewrites the ini when it exits, so a swap made now would be
 * silently undone — and the user would not discover it until the next launch,
 * with no indication anything went wrong.
 */
export function applyProfile(
	name: string,
	ctx: StoreContext
): StoreResult<{ applied: string; backedUp: boolean }> {
	if (ctx.iracingRunning) {
		return { ok: false, error: 'iracingRunning' };
	}

	const source = profilePath(name);
	let bytes: Buffer;
	try {
		bytes = fs.readFileSync(source);
	} catch {
		return { ok: false, error: 'profileNotFound' };
	}

	if (!validateRendererIni(bytes.toString('utf8')).valid) {
		return { ok: false, error: 'invalidIni' };
	}

	const activeIniPath = getRendererIniPath(ctx.iracingFolder);
	const hadActive = fs.existsSync(activeIniPath);

	try {
		ensureDir(path.dirname(activeIniPath));
		backupActiveIni(activeIniPath);
		writeAtomic(activeIniPath, bytes);
	} catch {
		return { ok: false, error: 'ioError' };
	}

	return { ok: true, applied: name, backedUp: hadActive };
}

/**
 * Store the live configuration as a profile.
 *
 * `overwrite` is the answer to a drifted config: the user tuned settings in-sim
 * and wants the profile they came from to catch up. The existing profile is
 * backed up first, so an accidental overwrite is recoverable.
 */
export function saveActiveAs(
	rawName: string,
	ctx: StoreContext,
	options: { overwrite?: boolean } = {}
): StoreResult<{ name: string }> {
	const existing = listProfiles().map((profile) => profile.name);
	// When overwriting, the target legitimately already exists, so it must not
	// count as a collision — but every other naming rule still applies.
	const check = checkProfileName(
		rawName,
		options.overwrite
			? existing.filter(
					(name) =>
						name.toLowerCase() !==
						String(rawName ?? '')
							.trim()
							.toLowerCase()
				)
			: existing
	);
	if (!check.ok) {
		return { ok: false, error: check.error };
	}

	const content = readActiveIni(ctx);
	if (content === null) {
		return { ok: false, error: 'noActiveConfig' };
	}
	if (!validateRendererIni(content).valid) {
		return { ok: false, error: 'invalidIni' };
	}

	const destination = profilePath(check.name);
	const alreadyExists = fs.existsSync(destination);
	if (alreadyExists && !options.overwrite) {
		return { ok: false, error: 'profileExists' };
	}

	try {
		ensureDir(getProfilesDir());
		if (alreadyExists) {
			backupProfile(destination);
		}
		// Byte-for-byte from the live file rather than writing back the string we
		// parsed, so nothing about the encoding can shift.
		writeAtomic(
			destination,
			fs.readFileSync(getRendererIniPath(ctx.iracingFolder))
		);
	} catch {
		return { ok: false, error: 'ioError' };
	}

	return { ok: true, name: check.name };
}

/** Keep a copy of a profile that is about to be replaced. */
function backupProfile(profileFilePath: string): void {
	try {
		const backupsDir = getBackupsDir();
		ensureDir(backupsDir);
		const stamp = new Date().toISOString().replace(/[:.]/g, '-');
		fs.writeFileSync(
			path.join(
				backupsDir,
				`${path.basename(profileFilePath, '.ini')}.${stamp}.ini`
			),
			fs.readFileSync(profileFilePath)
		);
		pruneBackups(backupsDir);
	} catch {
		// Best effort — do not block the save.
	}
}

/** Copy an arbitrary ini in as a profile, refusing anything that is not one. */
export function importProfile(
	sourcePath: string,
	rawName: string
): StoreResult<{ name: string }> {
	const check = checkProfileName(
		rawName,
		listProfiles().map((profile) => profile.name)
	);
	if (!check.ok) {
		return { ok: false, error: check.error };
	}

	let bytes: Buffer;
	try {
		bytes = fs.readFileSync(sourcePath);
	} catch {
		return { ok: false, error: 'profileNotFound' };
	}

	// The guard that stops app.ini becoming a graphics profile.
	if (!validateRendererIni(bytes.toString('utf8')).valid) {
		return { ok: false, error: 'invalidIni' };
	}

	try {
		ensureDir(getProfilesDir());
		writeAtomic(profilePath(check.name), bytes);
	} catch {
		return { ok: false, error: 'ioError' };
	}

	return { ok: true, name: check.name };
}

/** Copy a profile out to a user-chosen path. */
export function exportProfile(
	name: string,
	destinationPath: string
): StoreResult {
	try {
		fs.copyFileSync(profilePath(name), destinationPath);
	} catch {
		return { ok: false, error: 'ioError' };
	}
	return { ok: true };
}

export function renameProfile(
	from: string,
	to: string
): StoreResult<{
	name: string;
}> {
	const existing = listProfiles().map((profile) => profile.name);
	if (!existing.some((name) => name === from)) {
		return { ok: false, error: 'profileNotFound' };
	}

	// A profile may always be renamed to a different casing of its own name.
	const check = checkProfileName(
		to,
		existing.filter((name) => name !== from)
	);
	if (!check.ok) {
		return { ok: false, error: check.error };
	}

	try {
		fs.renameSync(profilePath(from), profilePath(check.name));
	} catch {
		return { ok: false, error: 'ioError' };
	}

	return { ok: true, name: check.name };
}

/**
 * Delete a profile to the Recycle Bin.
 *
 * Deliberately NOT fs.unlink: a mis-click here destroys a configuration the user
 * may have spent a long time building, and the recycle bin is the difference
 * between an annoyance and a loss. A trash failure is reported rather than
 * quietly escalated to a permanent delete.
 */
export async function deleteProfile(name: string): Promise<StoreResult> {
	const target = profilePath(name);
	if (!fs.existsSync(target)) {
		return { ok: false, error: 'profileNotFound' };
	}

	try {
		await trashItem(target);
	} catch {
		return { ok: false, error: 'ioError' };
	}

	return { ok: true };
}
