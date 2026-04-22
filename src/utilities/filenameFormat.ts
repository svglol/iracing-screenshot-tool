// Session/telemetry shapes come from irsdk-node which has no @types/*.
// Use `any` freely here per D-12-08 (pragmatic typing; internal escape hatch).
type SessionInfo = any;
type Telemetry = any;

interface FilenameField {
	token: string;
	label: string;
	category: string;
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
 *   token    – the placeholder string (with braces)
 *   label    – human-readable name shown in the UI
 *   category – grouping name shown in the UI
 *   resolve  – function(sessionInfo, telemetry) => string value (may return '' on missing data)
 */
export const FILENAME_FIELDS: FilenameField[] = [
	// ── Track ─────────────────────────────────────────────────────────────────
	{
		token: '{track}',
		label: 'Track',
		category: 'Track',
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
		label: 'Track Full',
		category: 'Track',
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
		label: 'City',
		category: 'Track',
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
		label: 'Country',
		category: 'Track',
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
		label: 'Track Type',
		category: 'Track',
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
		label: 'Driver',
		category: 'Driver',
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
		label: 'Driver Abbrev',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.AbbrevName) || '';
		},
	},
	{
		token: '{driverInitials}',
		label: 'Initials',
		category: 'Driver',
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
		label: 'Team',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.TeamName) || '';
		},
	},
	{
		token: '{carNumber}',
		label: 'Car #',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarNumber) || '';
		},
	},
	{
		token: '{car}',
		label: 'Car',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarScreenNameShort) || '';
		},
	},
	{
		token: '{carFull}',
		label: 'Car Full',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarScreenName) || '';
		},
	},
	{
		token: '{carClass}',
		label: 'Car Class',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return (d && d.CarClassShortName) || '';
		},
	},
	{
		token: '{iRating}',
		label: 'iRating',
		category: 'Driver',
		resolve(sessionInfo, telemetry) {
			const d = findDriver(sessionInfo, telemetry);
			return d && d.IRating !== undefined ? String(d.IRating) : '';
		},
	},

	// ── Session ───────────────────────────────────────────────────────────────
	{
		token: '{sessionType}',
		label: 'Session Type',
		category: 'Session',
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
		label: 'Session Name',
		category: 'Session',
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
		label: 'Lap',
		category: 'Session',
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
		label: 'Date',
		category: 'Meta',
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
		label: 'Time',
		category: 'Meta',
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
		label: 'Date+Time',
		category: 'Meta',
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
		label: 'Counter',
		category: 'Meta',
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
export function resolveFilenameFormat(
	formatString: string,
	sessionInfo: SessionInfo,
	telemetry: Telemetry
): string {
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

	// Sanitize: replace Windows-filename-unsafe characters with underscore
	result = result.replace(/[\\/:*?"<>|]/g, '_');

	return result;
}
