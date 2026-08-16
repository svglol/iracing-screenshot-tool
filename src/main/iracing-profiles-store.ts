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
	findDuplicateProfile,
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
import { ensureDir, writeAtomic, backupFile } from './atomic-file';

const PROFILES_DIR_NAME = 'graphics-profiles';
const BACKUPS_DIR_NAME = '.backups';

export type StoreError =
	| 'profileNotFound'
	| 'profileExists'
	| 'duplicateContent'
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
//
// `error?: undefined` on the success branch is load-bearing for the same reason
// as NameCheck: with `strictNullChecks: false` TypeScript will not narrow a
// union by a boolean discriminant, so without it `result.error` is inaccessible
// in the `else` of an `if (result.ok)`. Do not remove it.
//
// `duplicateOf` accompanies exactly the 'duplicateContent' error: the name of
// the profile that already holds these settings, so the message can point the
// user at it instead of leaving them to diff configs by hand.
export type StoreResult<T = object> =
	| ({ ok: true; error?: undefined; duplicateOf?: undefined } & T)
	| { ok: false; error: StoreError | NameError; duplicateOf?: string };

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
 * Preserve the live config before it is overwritten.
 *
 * This is the safety net for the worst outcome this feature could produce:
 * applying a profile over settings the user tuned and never saved.
 * Write-atomicity and backup mechanics live in ./atomic-file, shared with the
 * config-editor store (which keeps its OWN backups directory and rotation).
 */
function backupActiveIni(activeIniPath: string): void {
	backupFile(activeIniPath, getBackupsDir(), 'rendererDX11Monitor');
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
	const profiles = listProfiles();
	const existing = profiles.map((profile) => profile.name);
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

	// No two profiles may store the same configuration under different names —
	// the second copy adds nothing and later leaves the active-profile display
	// picking a name by tie-break. When overwriting, the target itself is
	// exempt: re-saving a profile over its own content is a no-op, not a
	// duplicate.
	const duplicateOf = findDuplicateProfile(
		hashIni(content),
		profiles,
		options.overwrite ? check.name : ''
	);
	if (duplicateOf !== null) {
		return { ok: false, error: 'duplicateContent', duplicateOf };
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
		backupFile(
			profileFilePath,
			getBackupsDir(),
			path.basename(profileFilePath, '.ini')
		);
	} catch {
		// Best effort — do not block the save.
	}
}

/** Copy an arbitrary ini in as a profile, refusing anything that is not one. */
export function importProfile(
	sourcePath: string,
	rawName: string
): StoreResult<{ name: string }> {
	const profiles = listProfiles();
	const check = checkProfileName(
		rawName,
		profiles.map((profile) => profile.name)
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

	// Same invariant as saveActiveAs: an import whose SETTINGS match a stored
	// profile is the same configuration wearing a different filename — the
	// hash ignores comments and ordering, so a re-exported copy still counts.
	const duplicateOf = findDuplicateProfile(
		hashIni(bytes.toString('utf8')),
		profiles
	);
	if (duplicateOf !== null) {
		return { ok: false, error: 'duplicateContent', duplicateOf };
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
