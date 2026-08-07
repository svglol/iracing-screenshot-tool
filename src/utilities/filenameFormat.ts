// Session/telemetry shapes come from irsdk-node which has no @types/*.
// Use `any` freely here per D-12-08 (pragmatic typing; internal escape hatch).
type SessionInfo = any;
type Telemetry = any;

import { t } from './i18n';

export interface FilenameField {
	token: string;
	// Translation KEYS, not text. These are shown in Settings, so they have to
	// follow the user's language — but this array is a module-scope const built at
	// import time, long before a locale is resolved, so it cannot hold finished
	// sentences. The UI resolves them through `filenameFieldLabel` /
	// `filenameFieldCategory` below at render time.
	labelKey: string;
	categoryKey: string;
	resolve: (sessionInfo: SessionInfo, telemetry: Telemetry) => string;
}

/**
 * Returns the Drivers[] entry matching the CamCarIdx from telemetry.
 */
function findDriver(
	sessionInfo: SessionInfo,
	telemetry: Telemetry
): any | undefined {
	const camCarIdx =
		telemetry && telemetry.values ? telemetry.values.CamCarIdx : undefined;
	if (camCarIdx === undefined || !sessionInfo || !sessionInfo.data)
		return undefined;
	const drivers =
		sessionInfo.data.DriverInfo && sessionInfo.data.DriverInfo.Drivers;
	if (!drivers) return undefined;
	return drivers.find((d: any) => d.CarIdx === camCarIdx);
}

/**
 * All available filename format fields, organised by category.
 * Each field exposes:
 *   token       – the placeholder string (with braces)
 *   labelKey    – translation key for the name shown in the UI
 *   categoryKey – translation key for the grouping shown in the UI
 *   resolve     – function(sessionInfo, telemetry) => string value (may return '' on missing data)
 */
export const FILENAME_FIELDS: FilenameField[] = [
	// ── Track ─────────────────────────────────────────────────────────────────
	{
		token: '{track}',
		labelKey: 'filenameFields.track',
		categoryKey: 'filenameFields.categories.Track',
		resolve(sessionInfo) {
			return (
				(sessionInfo &&
					sessionInfo.data &&
					sessionInfo.data.WeekendInfo &&
					sessionInfo.data.WeekendInfo.TrackDisplayShortName) ||
				''
			);
		},
	},
	{
		token: '{trackFull}',
		labelKey: 'filenameFields.trackFull',
		categoryKey: 'filenameFields.categories.Track',
		resolve(sessionInfo) {
			return (
				(sessionInfo &&
					sessionInfo.data &&
					sessionInfo.data.WeekendInfo &&
					sessionInfo.data.WeekendInfo.TrackDisplayName) ||
				''
			);
		},
	},
	{
		token: '{trackCity}',
		labelKey: 'filenameFields.trackCity',
		categoryKey: 'filenameFields.categories.Track',
		resolve(sessionInfo) {
			return (
				(sessionInfo &&
					sessionInfo.data &&
					sessionInfo.data.WeekendInfo &&
					sessionInfo.data.WeekendInfo.TrackCity) ||
				''
			);
		},
	},
	{
		token: '{trackCountry}',
		labelKey: 'filenameFields.trackCountry',
		categoryKey: 'filenameFields.categories.Track',
		resolve(sessionInfo) {
			return (
				(sessionInfo &&
					sessionInfo.data &&
					sessionInfo.data.WeekendInfo &&
					sessionInfo.data.WeekendInfo.TrackCountry) ||
				''
			);
		},
	},
	{
		token: '{trackType}',
		labelKey: 'filenameFields.trackType',
		categoryKey: 'filenameFields.categories.Track',
		resolve(sessionInfo) {
			return (
				(sessionInfo &&
					sessionInfo.data &&
					sessionInfo.data.WeekendInfo &&
					sessionInfo.data.WeekendInfo.TrackType) ||
				''
			);
		},
	},

	// ── Driver ────────────────────────────────────────────────────────────────
	{
		token: '{driver}',
		labelKey: 'filenameFields.driver',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			if (!sessionInfo || !sessionInfo.data) return '';
			if (
				sessionInfo.data.WeekendInfo &&
				sessionInfo.data.WeekendInfo.TeamRacing === 1
			) {
				// Team racing: use TeamName for the DriverCarIdx driver
				const driverCarIdx =
					sessionInfo.data.DriverInfo &&
					sessionInfo.data.DriverInfo.DriverCarIdx;
				const drivers =
					sessionInfo.data.DriverInfo &&
					sessionInfo.data.DriverInfo.Drivers;
				if (!drivers) return '';
				const found = drivers.find((d: any) => d.CarIdx === driverCarIdx);
				return (found && found.TeamName) || '';
			}
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.UserName) || '';
		},
	},
	{
		token: '{driverAbbrev}',
		labelKey: 'filenameFields.driverAbbrev',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.AbbrevName) || '';
		},
	},
	{
		token: '{driverInitials}',
		labelKey: 'filenameFields.driverInitials',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			if (!d || !d.UserName) return '';
			return d.UserName.split(' ')
				.map((p: string) => p.charAt(0).toUpperCase())
				.join('');
		},
	},
	{
		token: '{team}',
		labelKey: 'filenameFields.team',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.TeamName) || '';
		},
	},
	{
		token: '{carNumber}',
		labelKey: 'filenameFields.carNumber',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarNumber) || '';
		},
	},
	{
		token: '{car}',
		labelKey: 'filenameFields.car',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarScreenNameShort) || '';
		},
	},
	{
		token: '{carFull}',
		labelKey: 'filenameFields.carFull',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarScreenName) || '';
		},
	},
	{
		token: '{carClass}',
		labelKey: 'filenameFields.carClass',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarClassShortName) || '';
		},
	},
	{
		token: '{iRating}',
		labelKey: 'filenameFields.iRating',
		categoryKey: 'filenameFields.categories.Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return d && d.IRating !== undefined ? String(d.IRating) : '';
		},
	},

	// ── Session ───────────────────────────────────────────────────────────────
	{
		token: '{sessionType}',
		labelKey: 'filenameFields.sessionType',
		categoryKey: 'filenameFields.categories.Session',
		resolve(sessionInfo, telemetry) {
			if (!sessionInfo || !sessionInfo.data || !sessionInfo.data.SessionInfo)
				return '';
			const sessions = sessionInfo.data.SessionInfo.Sessions;
			if (!sessions) return '';
			const sessionNum =
				telemetry && telemetry.values ? telemetry.values.SessionNum : 0;
			const session = sessions[sessionNum];
			return (session && session.SessionType) || '';
		},
	},
	{
		token: '{sessionName}',
		labelKey: 'filenameFields.sessionName',
		categoryKey: 'filenameFields.categories.Session',
		resolve(sessionInfo, telemetry) {
			if (!sessionInfo || !sessionInfo.data || !sessionInfo.data.SessionInfo)
				return '';
			const sessions = sessionInfo.data.SessionInfo.Sessions;
			if (!sessions) return '';
			const sessionNum =
				telemetry && telemetry.values ? telemetry.values.SessionNum : 0;
			const session = sessions[sessionNum];
			return (session && session.SessionName) || '';
		},
	},
	{
		token: '{lap}',
		labelKey: 'filenameFields.lap',
		categoryKey: 'filenameFields.categories.Session',
		resolve(sessionInfo, telemetry) {
			if (!telemetry || !telemetry.values) return '';
			return telemetry.values.Lap !== undefined
				? String(telemetry.values.Lap)
				: '';
		},
	},

	// ── Meta ──────────────────────────────────────────────────────────────────
	{
		token: '{date}',
		labelKey: 'filenameFields.date',
		categoryKey: 'filenameFields.categories.Meta',
		resolve() {
			const now = new Date();
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, '0');
			const d = String(now.getDate()).padStart(2, '0');
			return `${y}-${m}-${d}`;
		},
	},
	{
		token: '{time}',
		labelKey: 'filenameFields.time',
		categoryKey: 'filenameFields.categories.Meta',
		resolve() {
			const now = new Date();
			const h = String(now.getHours()).padStart(2, '0');
			const min = String(now.getMinutes()).padStart(2, '0');
			const sec = String(now.getSeconds()).padStart(2, '0');
			return `${h}-${min}-${sec}`;
		},
	},
	{
		token: '{datetime}',
		labelKey: 'filenameFields.datetime',
		categoryKey: 'filenameFields.categories.Meta',
		resolve() {
			const now = new Date();
			const y = now.getFullYear();
			const m = String(now.getMonth() + 1).padStart(2, '0');
			const d = String(now.getDate()).padStart(2, '0');
			const h = String(now.getHours()).padStart(2, '0');
			const min = String(now.getMinutes()).padStart(2, '0');
			const sec = String(now.getSeconds()).padStart(2, '0');
			return `${y}-${m}-${d}_${h}-${min}-${sec}`;
		},
	},
	{
		token: '{counter}',
		labelKey: 'filenameFields.counter',
		categoryKey: 'filenameFields.categories.Meta',
		resolve() {
			// Intentionally left unresolved here; Worker.vue handles counter separately.
			return '{counter}';
		},
	},
];

/** Default format matching the original hardcoded behavior. */
export const DEFAULT_FORMAT = '{track}-{driver}-{counter}';

/**
 * Resolves a format string against session data, replacing all known tokens
 * with their corresponding values EXCEPT {counter}, which is left in place
 * for the caller (Worker.vue) to handle.
 *
 * After token replacement, characters that are invalid in Windows filenames
 * (\ / : * ? " < > |) are replaced with underscores.
 */
/** Fallback name used when no session info is available — every session-derived
 *  token would resolve to '', producing degenerate filenames like '--0'. */
export const FALLBACK_FORMAT = 'iRacingScreenshotTool-{counter}';

export function resolveFilenameFormat(
	formatString: string,
	sessionInfo: SessionInfo,
	telemetry: Telemetry
): string {
	if (!sessionInfo) return FALLBACK_FORMAT;

	let result = formatString;

	for (const field of FILENAME_FIELDS) {
		if (field.token === '{counter}') continue; // leave {counter} for Worker
		if (result.includes(field.token)) {
			const value = field.resolve(sessionInfo, telemetry);
			// Use split/join to do a literal (non-regex) global replace
			result = result.split(field.token).join(value);
		}
	}

	// Transliterate accented / special Unicode characters to ASCII equivalents
	// (e.g. Nürburgring → Nurburgring, Räikkönen → Raikkonen)
	result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

	// Strip ASCII control chars / NUL / DEL (cq-utilities#1): a NUL crashes the
	// sharp write with ERR_INVALID_ARG_VALUE and a tab/newline corrupts the on-disk
	// name. Done BEFORE the empty check below so an all-control-char name collapses
	// to '' and triggers the fallback.
	// eslint-disable-next-line no-control-regex
	result = result.replace(/[\x00-\x1F\x7F]/g, '');

	// Sanitize: replace Windows-filename-unsafe characters with underscore
	result = result.replace(/[\\/:*?"<>|]/g, '_');

	// All-empty fallback (cq-utilities#2): if every session-derived token resolved
	// empty AND the user didn't ask for a bare {counter}, fall back rather than emit
	// a degenerate '.jpg'. Unicode-aware — a purely CJK/Cyrillic name (no Latin
	// a-z0-9) is legitimate content and must be preserved, so test \p{L}/\p{N}.
	const withoutCounter = result.split('{counter}').join('');
	if (!/[\p{L}\p{N}]/u.test(withoutCounter) && !result.includes('{counter}')) {
		return FALLBACK_FORMAT;
	}

	// Windows reserved device names can't be a bare base filename (cq-utilities#3).
	// Exact whole-name match only — 'CON-{counter}' and 'CONWAY' are valid and left
	// alone, matching the real OS rule.
	if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(result)) {
		result = '_' + result;
	}

	return result;
}

/** The field's name in the user's language. */
export function filenameFieldLabel(field: FilenameField): string {
	return t(field.labelKey);
}

/** The field's group heading in the user's language. */
export function filenameFieldCategory(field: FilenameField): string {
	return t(field.categoryKey);
}
