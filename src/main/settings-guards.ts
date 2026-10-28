// Guards for settings arriving over IPC, before they reach electron-store or the
// sim.
//
// config:set is a SYNC channel: the renderer blocks in sendSync until main sets
// event.returnValue. Two things used to go wrong there:
//   - a NaN (e.g. parseInt of a number input holding ".5") passed the schema —
//     ajv accepts NaN as a 'number' — and conf saved it as null, after which every
//     get and set threw "Config schema violation" and the next launch could not
//     open the file at all;
//   - any throw from the store (a wrong type, `undefined`) escaped the handler
//     before returnValue was set, leaving the renderer blocked until Electron
//     garbage-collected the reply (~30 s), then handed an error object back as
//     the "value".
// writeConfig() refuses the first and contains the second, and always answers.
//
// Pure apart from the injected store, so settings-guards.test.ts runs it against
// the real conf and schema.

export interface SettingsStore {
	get(key: string): unknown;
	set(key: string, value: unknown): void;
}

export type ConfigWriteResult =
	| { ok: true; key: string; value: unknown; oldValue: unknown }
	| { ok: false; key: string | null; reason: string };

export function writeConfig(
	store: SettingsStore,
	payload: unknown
): ConfigWriteResult {
	if (!payload || typeof payload !== 'object') {
		return { ok: false, key: null, reason: 'payload is not an object' };
	}
	const { key, value } = payload as { key?: unknown; value?: unknown };
	if (typeof key !== 'string' || key === '') {
		return { ok: false, key: null, reason: 'key is not a non-empty string' };
	}
	if (value === undefined) {
		return { ok: false, key, reason: 'value is undefined' };
	}
	if (typeof value === 'number' && !Number.isFinite(value)) {
		return { ok: false, key, reason: `value is not finite (${value})` };
	}
	try {
		const oldValue = store.get(key);
		// The store validates against the schema BEFORE writing, so a refused
		// value leaves the file exactly as it was.
		store.set(key, value);
		return { ok: true, key, value, oldValue };
	} catch (error) {
		return {
			ok: false,
			key,
			reason: (error as Error)?.message || String(error),
		};
	}
}

// The manual-restore geometry main holds in memory (and resizes iRacing to). The
// renderer sends parseInt results, which are NaN for an empty or half-typed field;
// koffi converts NaN to 0, so an unchecked value resized iRacing to zero width or
// moved it to the screen edge. Null means "ignore this value".
//
// Deliberately looser than the Settings form's own ranges: those are UI policy
// and live there. Main only refuses what cannot be a window at all.
export type RestoreGeometryKey =
	| 'defaultScreenWidth'
	| 'defaultScreenHeight'
	| 'defaultScreenLeft'
	| 'defaultScreenTop';

export const RESTORE_GEOMETRY_KEYS: readonly RestoreGeometryKey[] = [
	'defaultScreenWidth',
	'defaultScreenHeight',
	'defaultScreenLeft',
	'defaultScreenTop',
];

export function isRestoreGeometryKey(key: string): key is RestoreGeometryKey {
	return (RESTORE_GEOMETRY_KEYS as readonly string[]).includes(key);
}

export function normalizeRestoreGeometry(
	key: RestoreGeometryKey,
	value: unknown
): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return null;
	}
	const rounded = Math.round(value);
	const isSize = key === 'defaultScreenWidth' || key === 'defaultScreenHeight';
	if (isSize && rounded < 1) {
		return null;
	}
	return rounded;
}
