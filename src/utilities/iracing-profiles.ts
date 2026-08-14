// Pure logic for graphics-config profiles: naming rules, ini validation, and
// deciding which stored profile the live rendererDX11Monitor.ini corresponds to.
//
// Deliberately free of fs and Electron — every function here takes strings and
// returns data, so the rules that decide whether a file is safe to apply are
// testable without touching a disk. The fs layer lives in
// src/main/iracing-profiles-store.ts.
//
// Everything user-facing is returned as a CODE, never an English sentence: the
// app ships 13 locales and these messages surface in the UI.

// Typed CJS require: Vite's renderer target rewrites bare `import ... from
// 'crypto'` to a browser shim. Same convention as the sibling utilities.
const crypto: typeof import('crypto') = require('crypto');

/** Longest profile name we accept. Well under the 255-char filename limit. */
export const MAX_PROFILE_NAME_LENGTH = 64;

/**
 * Sections that must be present for a file to be a plausible renderer config.
 * This is what stops someone importing app.ini — a real file in the same folder,
 * with the same extension — and destroying their graphics setup on apply.
 */
const REQUIRED_SECTIONS = ['Graphics Options', 'Display'];

/**
 * Excluded from every comparison. iRacing fills these in with the detected
 * driver DLL, version and vendor, so they describe the MACHINE, not the user's
 * settings. Including them would make a graphics-driver update look like an
 * edited profile.
 */
const IGNORED_SECTIONS = ['Debug'];

// Windows filename rules: exactly the characters the filesystem rejects, plus
// control characters, plus the reserved DOS device names — which fail in
// confusing ways rather than cleanly. Spaces and hyphens are deliberately NOT in
// this set: "Triple Screen" and "Long-Exposure" are good profile names.
const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/;
const RESERVED_DEVICE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Control characters are illegal in filenames too, checked without a regex. */
function hasControlCharacters(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		if (value.charCodeAt(i) < 32) {
			return true;
		}
	}
	return false;
}

export type ParsedIni = Record<string, Record<string, string>>;

export type NameError =
	| 'empty'
	| 'illegalCharacters'
	| 'reservedName'
	| 'trailingDotOrSpace'
	| 'tooLong'
	| 'duplicate';

export type IniError = 'empty' | 'missingSections';
export type IniWarning = 'autoCfgIncomplete';

export interface IniValidation {
	valid: boolean;
	error: IniError | null;
	warnings: IniWarning[];
}

/**
 * The optional `error?: undefined` / `name?: undefined` members are load-bearing:
 * this project compiles with `strictNullChecks: false`, and TypeScript cannot
 * narrow a union by a BOOLEAN discriminant in that mode. Declaring both members
 * on both branches keeps `check.error` accessible after an `if (!check.ok)`
 * without every call site needing a cast. Do not "tidy" them away.
 */
export type NameCheck =
	| { ok: true; name: string; error?: undefined }
	| { ok: false; error: NameError; name?: undefined };

/** The three states the active config can be in, relative to what we stored. */
export type ActiveState = 'clean' | 'modified' | 'unknown';

export interface ProfileFingerprint {
	name: string;
	hash: string;
}

export interface ActiveProfile {
	name: string | null;
	state: ActiveState;
}

/**
 * Parse a whole ini into `{ section: { key: value } }`.
 *
 * Values are stripped of iRacing's inline `; explanation` trailer and trimmed,
 * so `SSAO=1                \t; 0=off, 1=on` yields `'1'`. Keys appearing before
 * any section header are dropped — the renderer ini has none. A repeated section
 * header merges into the earlier one, with later keys winning.
 */
export function parseIni(content: string): ParsedIni {
	const result: ParsedIni = {};
	let current: Record<string, string> | null = null;

	for (const line of String(content ?? '').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(';')) {
			continue;
		}

		if (trimmed.startsWith('[')) {
			const end = trimmed.indexOf(']');
			if (end > 1) {
				const name = trimmed.slice(1, end).trim();
				result[name] = result[name] || {};
				current = result[name];
			} else {
				// Malformed header — stop collecting rather than attribute its keys
				// to the previous section.
				current = null;
			}
			continue;
		}

		if (!current) {
			continue;
		}

		const eqIndex = trimmed.indexOf('=');
		if (eqIndex > 0) {
			const rawValue = trimmed.slice(eqIndex + 1);
			const commentIndex = rawValue.indexOf(';');
			current[trimmed.slice(0, eqIndex).trim()] = (
				commentIndex >= 0 ? rawValue.slice(0, commentIndex) : rawValue
			).trim();
		}
	}

	return result;
}

/**
 * Canonical text form of an ini's SETTINGS, ignoring everything that is not one.
 *
 * Line endings, the column padding before comments, the comment text itself,
 * section order and key order are all discarded, and `[Debug]` is dropped
 * entirely. Two files that configure iRacing identically therefore produce the
 * same string even if iRacing rewrote them on different days or a game update
 * reworded a comment.
 */
export function canonicaliseIni(content: string): string {
	const parsed = parseIni(content);
	const lines: string[] = [];

	for (const section of Object.keys(parsed).sort()) {
		if (IGNORED_SECTIONS.includes(section)) {
			continue;
		}
		lines.push(`[${section}]`);
		const keys = Object.keys(parsed[section]).sort();
		for (const key of keys) {
			lines.push(`${key}=${parsed[section][key]}`);
		}
	}

	return lines.join('\n');
}

/** Stable fingerprint of an ini's settings. Equal hash means equal settings. */
export function hashIni(content: string): string {
	return crypto
		.createHash('sha1')
		.update(canonicaliseIni(content), 'utf8')
		.digest('hex');
}

/**
 * How many individual settings differ between two configs.
 *
 * Drives the "N settings differ" hint next to a modified profile — the concrete
 * number is what tells someone whether they nudged one slider or are looking at
 * a different setup altogether.
 */
export function countIniDifferences(a: string, b: string): number {
	const left = parseIni(a);
	const right = parseIni(b);
	const sections = new Set([...Object.keys(left), ...Object.keys(right)]);
	let differences = 0;

	for (const section of sections) {
		if (IGNORED_SECTIONS.includes(section)) {
			continue;
		}
		const leftKeys = left[section] || {};
		const rightKeys = right[section] || {};
		const keys = new Set([
			...Object.keys(leftKeys),
			...Object.keys(rightKeys),
		]);
		for (const key of keys) {
			if (leftKeys[key] !== rightKeys[key]) {
				differences++;
			}
		}
	}

	return differences;
}

/**
 * Is this file safe to store as a profile and later write over the live config?
 *
 * The section check is the load-bearing one: applying a non-renderer ini would
 * leave iRacing without the settings it expects. `AutoCfgCompleted=0` is only a
 * warning, but a pointed one — iRacing re-runs its 3D auto-configuration at
 * startup when it sees that and overwrites the whole file, so a profile carrying
 * it will appear to "not stick".
 */
export function validateRendererIni(content: string): IniValidation {
	const warnings: IniWarning[] = [];

	if (!String(content ?? '').trim()) {
		return { valid: false, error: 'empty', warnings };
	}

	const parsed = parseIni(content);
	const hasRequiredSections = REQUIRED_SECTIONS.every(
		(section) => parsed[section] !== undefined
	);

	if (!hasRequiredSections) {
		return { valid: false, error: 'missingSections', warnings };
	}

	if (parsed.AutoCfg && parsed.AutoCfg.AutoCfgCompleted === '0') {
		warnings.push('autoCfgIncomplete');
	}

	return { valid: true, error: null, warnings };
}

/**
 * Validate a profile name, which is also its filename on disk.
 *
 * `existingNames` is compared case-insensitively because Windows filesystems
 * are: "Racing" and "racing" would be the same file, and silently overwriting
 * one with the other is exactly the data loss this feature must not cause.
 */
export function checkProfileName(
	rawName: string,
	existingNames: string[] = []
): NameCheck {
	const name = String(rawName ?? '').trim();

	if (!name) {
		return { ok: false, error: 'empty' };
	}
	if (name.length > MAX_PROFILE_NAME_LENGTH) {
		return { ok: false, error: 'tooLong' };
	}
	if (ILLEGAL_FILENAME_CHARS.test(name) || hasControlCharacters(name)) {
		return { ok: false, error: 'illegalCharacters' };
	}
	// Windows silently strips these, so "Racing." would come back as "Racing"
	// and collide with a profile of that name.
	if (name.endsWith('.') || name.endsWith(' ')) {
		return { ok: false, error: 'trailingDotOrSpace' };
	}
	if (name === '.' || name === '..' || RESERVED_DEVICE_NAMES.test(name)) {
		return { ok: false, error: 'reservedName' };
	}
	if (
		existingNames.some(
			(existing) => existing.toLowerCase() === name.toLowerCase()
		)
	) {
		return { ok: false, error: 'duplicate' };
	}

	return { ok: true, name };
}

/**
 * The stored profile whose settings hash equals `hash`, or null.
 *
 * This is the guard behind the invariant that no two profiles may hold the
 * same configuration under different names: save, overwrite and import all ask
 * before writing. The hash is hashIni's — canonicalised settings, not file
 * bytes — so a re-exported file with reshuffled comments still counts as the
 * same configuration.
 *
 * `excludeName` is the profile being overwritten: updating a profile with the
 * content it already holds is a no-op, not a duplicate. Compared
 * case-insensitively like every other name comparison here, because profile
 * names are Windows filenames.
 */
export function findDuplicateProfile(
	hash: string,
	profiles: ProfileFingerprint[],
	excludeName = ''
): string | null {
	if (!hash) {
		return null;
	}
	const excluded = String(excludeName ?? '').toLowerCase();
	const match = profiles.find(
		(profile) =>
			profile.hash === hash && profile.name.toLowerCase() !== excluded
	);
	return match ? match.name : null;
}

/** Profile name -> the file it is stored in. */
export function profileFileName(name: string): string {
	return `${name}.ini`;
}

/**
 * File -> profile name, or null when the file is not a profile. The extension
 * test is case-insensitive because Windows will happily hand back `.INI`.
 */
export function profileNameFromFile(fileName: string): string | null {
	const match = /^(.+)\.ini$/i.exec(String(fileName ?? ''));
	return match ? match[1] : null;
}

/**
 * Work out which stored profile the live config represents.
 *
 * Three outcomes, because two are not enough in practice: iRacing rewrites the
 * ini every time it exits, so an active config drifts away from the profile it
 * came from as soon as the user touches a graphics slider in-sim. Reporting that
 * as "no profile active" would be useless — the answer they need is "Screenshots,
 * with changes".
 *
 * `lastAppliedName` is what we recorded when we last wrote the file, and is used
 * both to break ties between identical profiles and to name a drifted config.
 */
export function resolveActiveProfile(
	activeHash: string | null,
	profiles: ProfileFingerprint[],
	lastAppliedName = ''
): ActiveProfile {
	if (!activeHash) {
		return { name: null, state: 'unknown' };
	}

	const matches = profiles.filter((profile) => profile.hash === activeHash);
	if (matches.length > 0) {
		// Prefer the one we last applied, so duplicate profiles resolve to the name
		// the user actually chose rather than an alphabetical coin toss.
		const preferred =
			matches.find((profile) => profile.name === lastAppliedName) ||
			matches[0];
		return { name: preferred.name, state: 'clean' };
	}

	// No profile matches, but we know which one we last wrote — and it still
	// exists, so the live config is that profile plus edits.
	if (
		lastAppliedName &&
		profiles.some((profile) => profile.name === lastAppliedName)
	) {
		return { name: lastAppliedName, state: 'modified' };
	}

	return { name: null, state: 'unknown' };
}
