// Whether the file the user pointed us at is a ReShade config we can actually
// use, and — when it is not — which of the several quite different mistakes they
// made. One rule, shared by both processes: main refuses the capture with it,
// the renderer warns before a capture is ever requested.
//
// TWO field cases, a week apart, both v3.3.0, both users pressing the button
// a dozen times in ten minutes because the message told them nothing:
//
//   2026-08-21 (14 reports). `reshade` on, `reshadeFile` still our shipped
//   default guess `C:\Program Files (x86)\iRacing\ReShade.ini`, nothing at that
//   path. The read that discovers this sat deep inside the capture, after the
//   iRacing window had been resized to 8K and its UI hidden, so every press cost
//   a full resize/restore cycle (3-7 GB of iRacing render targets, one attempt
//   reaching 93.7% of a 12 GB card) and surfaced a raw Node "ENOENT: no such
//   file or directory". The user read that as a resolution problem and spent ten
//   minutes brute-forcing capture sizes up to the 10000px ceiling.
//
//   2026-08-28 (12 reports). Opposite mistake: the file was there and parsed
//   fine, but it was a ReShade PRESET (`Dylan_shared_reshade.ini`, then
//   `ReShadePreset normal.ini`) rather than ReShade's own config. A preset holds
//   effect parameters and has no screenshot path, so the lookup found nothing
//   and said "Unable to determine the ReShade screenshot folder" — a symptom,
//   naming neither the mistake nor the fix. The user swapped one preset for
//   another and tried eleven more times.
//
// Hence: name what is actually wrong, phrase it in the user's language, and
// answer it before anything has been done to the sim. One implementation,
// because two would drift and the drift would only ever be visible to people
// who do not read English.
//
// CJS require, and it is not optional: this
// module is imported by the renderer, and vite rewrites a bare `import 'path'`
// in the client bundle to __vite-browser-external, whose `win32` is undefined.
// The ESM form built clean and would have thrown at the first candidate join.
// A bare require survives the bundler and resolves to Node's real module.
const path: typeof import('path') = require('path');

// Bare require for the same bundler reason, and it is how main already loads it.
// read-ini-file is a thin `ini.parse(stripBom(text))` wrapper — pure JS, a
// production dependency, so it resolves from the asar in the renderer too, where
// requiring npm packages at module scope is long-established (sharp,
// electron-store, image-size). Sharing the PARSER as well as the rule is the
// point: a second ini reader in the renderer could disagree with main about the
// very file main is about to refuse.
//
// It reads through Node's `fs` singleton, so a test spying on fs.readFileSync
// intercepts these reads too — which is how the suite drives this module.
const loadIniFile = require('read-ini-file');

import { t } from './i18n';

// Every state that stops a ReShade capture, each with its own remedy:
//
//   missing     nothing at that path
//   unreadable  something is there, but we cannot read it
//   preset      a ReShade PRESET, not ReShade's config — the 2026-08-28 case
//   noSavePath  genuinely ReShade's config, but no screenshot folder set in it
//   notConfig   parses, but nothing identifies it as either of the above
//
// An errno we do not recognise is deliberately absent — see
// classifyReshadeIniError.
export type ReshadeIniProblem =
	| 'missing'
	| 'unreadable'
	| 'preset'
	| 'noSavePath'
	| 'notConfig';

/**
 * Map a filesystem error onto a problem we can phrase actionably.
 *
 * Returns null when we cannot name it, which is a real answer and not a
 * failure: the caller must then surface the original error rather than invent a
 * confident explanation for an errno we have never seen. Guessing "the file is
 * missing" at an EBUSY or an EIO would send the user to the file picker to fix
 * something that is not broken.
 */
export function classifyReshadeIniError(
	error: unknown
): ReshadeIniProblem | null {
	const code = (error as NodeJS.ErrnoException | null)?.code;

	// ENOTDIR is the same user-facing story as ENOENT: a path component that
	// should be a folder is not one, so nothing is there to open.
	if (code === 'ENOENT' || code === 'ENOTDIR') {
		return 'missing';
	}

	// EISDIR joins the permission errors rather than 'missing' because something
	// IS at that path — it is just not a file we can read. "Not found" would be
	// a lie the user could waste time on.
	if (code === 'EACCES' || code === 'EPERM' || code === 'EISDIR') {
		return 'unreadable';
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The screenshot folder ReShade is configured to write to, or '' when it names
 * none.
 *
 * Exported so getReshadeScreenshotFolder reads it through here rather than
 * repeating the expression: this and inspectReshadeIni have to agree about what
 * "usable" means, or the pre-flight would clear a file the capture then refuses.
 */
export function readReshadeSavePath(ini: unknown): string {
	if (!isRecord(ini)) {
		return '';
	}

	const screenshot = isRecord(ini.SCREENSHOT) ? ini.SCREENSHOT : {};
	const general = isRecord(ini.GENERAL) ? ini.GENERAL : {};
	const raw = screenshot.SavePath || general.ScreenshotPath;

	return typeof raw === 'string' ? raw : '';
}

/**
 * What is wrong with an ALREADY-PARSED ini, or null when it is usable.
 *
 * The preset test is `Techniques` / `TechniqueSorting`, verified against real
 * ReShade 5.x files rather than assumed. Note what does NOT work: a preset's
 * giveaway `[LumaSharpen.fx]` sections are gone by the time we see them, because
 * the ini parser treats the dot as a nesting separator and turns them into
 * `{ LumaSharpen: { fx: {...} } }`. `Techniques` is a plain top-level string and
 * survives intact.
 *
 * Order is load-bearing. A usable file wins outright; a preset never carries a
 * save path and a real config never carries `Techniques`, so the two cannot
 * collide. `noSavePath` requires a section only ReShade's own config has, which
 * keeps "you picked the wrong kind of file" apart from "you picked the right
 * file but have not set a screenshot folder in ReShade" — different mistakes
 * with entirely different fixes.
 */
export function inspectReshadeIni(ini: unknown): ReshadeIniProblem | null {
	if (!isRecord(ini)) {
		return 'notConfig';
	}

	if (readReshadeSavePath(ini)) {
		return null;
	}

	if (
		typeof ini.Techniques === 'string' ||
		typeof ini.TechniqueSorting === 'string'
	) {
		return 'preset';
	}

	if (isRecord(ini.GENERAL) || isRecord(ini.SCREENSHOT)) {
		return 'noSavePath';
	}

	// Includes the empty file: a freshly created ReShadePreset.ini parses to {}
	// and identifies itself as nothing at all.
	return 'notConfig';
}

const PROBLEM_MESSAGE_KEYS: Record<ReshadeIniProblem, string> = {
	missing: 'capture.reshadeIniMissing',
	unreadable: 'capture.reshadeIniUnreadable',
	preset: 'capture.reshadeIniPreset',
	noSavePath: 'capture.reshadeIniNoSavePath',
	notConfig: 'capture.reshadeIniNotConfig',
};

/**
 * The user-facing sentence for a problem. Every variant names the path — the
 * setting is a single disabled text field, so the user cannot otherwise see what
 * we tried — and every variant names a way out.
 *
 * Resolved per call, never cached at module scope: a module-level const is
 * evaluated at import time, which in main is before the locale has been
 * resolved, and would freeze English into the message forever.
 */
export function describeReshadeIniProblem(
	problem: ReshadeIniProblem,
	reshadeFile: string
): string {
	return t(PROBLEM_MESSAGE_KEYS[problem] || PROBLEM_MESSAGE_KEYS.notConfig, {
		path: reshadeFile,
	});
}

/**
 * Can we read the configured ini at all? Null means "no problem we can name" —
 * which covers both a healthy file and an errno we refuse to guess at.
 *
 * This is the probe for callers holding only a PATH (the settings UI, the
 * sidebar). Callers that already hold a thrown error — main, whose ini read
 * fails for real — classify that error instead, so the report describes what
 * actually happened rather than what a second, later read found.
 *
 * It PARSES rather than just stats. Opening the file was never the question the
 * user needed answered: the 2026-08-28 reporter's preset opened perfectly and
 * was still unusable, and a probe that stopped at accessSync would have called
 * it healthy and stayed silent through all twelve attempts.
 */
export function probeReshadeIni(reshadeFile: string): ReshadeIniProblem | null {
	// An empty setting can only mean "never chosen"; there is no path to read and
	// reading '' would answer ENOENT anyway, so short-circuit to the same verdict
	// without touching the disk.
	if (!reshadeFile || !String(reshadeFile).trim()) {
		return 'missing';
	}

	let ini: unknown;
	try {
		ini = loadIniFile.sync(reshadeFile);
	} catch (error) {
		// Only filesystem errnos land here. The ini parser is lenient by design and
		// does not throw on junk input — it returns junk, which inspectReshadeIni
		// then calls 'notConfig' on its own.
		return classifyReshadeIniError(error);
	}

	return inspectReshadeIni(ini);
}

/**
 * Warnings for the settings panel and the sidebar, in the same shape
 * checkIracingConfig returns: zero or more finished sentences, empty when there
 * is nothing to say.
 *
 * Silent when ReShade mode is off. The path is still stored and still wrong in
 * that case, but it governs nothing — warning about a setting that cannot
 * affect the next capture is noise, and noise is what makes people stop reading
 * the banner that matters.
 */
export function checkReshadeConfig(
	reshadeEnabled: boolean,
	reshadeFile: string
): string[] {
	if (!reshadeEnabled) {
		return [];
	}

	const problem = probeReshadeIni(reshadeFile);
	return problem ? [describeReshadeIniProblem(problem, reshadeFile)] : [];
}

// The two names ReShade gives its config. `ReShade.ini` is what 4.x and 5.x
// write next to the injected DLL; 3.x named it after the executable it was
// injected into, which for the modern sim is iRacingSim64DX11.exe. Ordered
// most-likely-first because the first hit wins.
export const RESHADE_INI_FILENAMES = ['ReShade.ini', 'iRacingSim64DX11.ini'];

/**
 * Where a ReShade.ini plausibly is, best guess first — for a user who turned
 * ReShade mode on and whose stored path leads nowhere.
 *
 * Two sources, and deliberately only two. The directory of the path already
 * configured comes first: if the user ever picked a file, they picked the right
 * FOLDER even when the install later moved or the filename is the other one, and
 * that beats any guess of ours. Then the real install roots, read from the
 * environment rather than hardcoded — `C:\` is only the default, and a literal
 * would miss every install on another drive while looking authoritative.
 *
 * env is a parameter so this stays a pure function; nothing here touches disk.
 */
export function reshadeIniCandidates(
	currentPath = '',
	env: NodeJS.ProcessEnv = process.env
): string[] {
	const roots: string[] = [];

	const configured = String(currentPath || '').trim();
	if (configured) {
		roots.push(path.win32.dirname(configured));
	}

	// Both Program Files variants: the sim is a 32-bit installer by default (so
	// x86), but ProgramFiles is what an x64 or relocated install answers.
	for (const base of [env['ProgramFiles(x86)'], env.ProgramFiles]) {
		if (base) {
			roots.push(path.win32.join(base, 'iRacing'));
		}
	}

	const seen = new Set<string>();
	const candidates: string[] = [];
	for (const root of roots) {
		for (const filename of RESHADE_INI_FILENAMES) {
			const candidate = path.win32.join(root, filename);
			const key = candidate.toLowerCase();
			if (!seen.has(key)) {
				seen.add(key);
				candidates.push(candidate);
			}
		}
	}

	return candidates;
}

/**
 * The first candidate that is a USABLE ReShade config, or null when none is.
 *
 * Usable, not merely readable — it goes through the same probe, so a folder full
 * of presets cannot satisfy it. That is what makes this reach the 2026-08-28
 * case: `ReShadePreset normal.ini` reads perfectly and is rejected, while the
 * `ReShade.ini` sitting beside it is found.
 *
 * Null is the honest answer and the caller must keep the user's stored path when
 * it comes back: silently rewriting the setting to a path that is ALSO wrong
 * would replace a value the user recognises with one they have never seen, and
 * the warning would then name a file they never chose.
 */
export function discoverReshadeIni(currentPath = ''): string | null {
	for (const candidate of reshadeIniCandidates(currentPath)) {
		if (probeReshadeIni(candidate) === null) {
			return candidate;
		}
	}

	return null;
}
