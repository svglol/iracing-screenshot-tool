// Salvage a settings file that electron-store refuses to open.
//
// electron-store (conf 6) validates the WHOLE file against the schema on every
// open, get and set. One bad value therefore makes the store unusable, and
// config.ts used to answer that by deleting config.json — every setting the user
// had (screenshot folder, hotkey, ReShade path, iRacing folder, active graphics
// profile) lost for one field. The field case is a non-finite number: ajv accepts
// NaN as a 'number', conf serialises it as null, and from then on every read
// throws "Config schema violation".
//
// This drops only the values that cannot pass the schema, so the store opens with
// those keys back at their defaults and everything else intact. Unknown keys are
// kept: the schema does not forbid them, and a newer build may own them.
//
// Pure — no fs, no electron — so it is tested against the real schema and the
// real conf in config-repair.test.ts.

interface SchemaEntry {
	type?: string;
	enum?: readonly unknown[];
	minimum?: number;
	maximum?: number;
}

export interface ConfigRepair {
	data: Record<string, unknown>;
	// Keys whose stored value was invalid and has been removed.
	dropped: string[];
}

function isValid(entry: SchemaEntry, value: unknown): boolean {
	switch (entry.type) {
		case 'number':
			if (typeof value !== 'number' || !Number.isFinite(value)) {
				return false;
			}
			if (entry.minimum !== undefined && value < entry.minimum) {
				return false;
			}
			if (entry.maximum !== undefined && value > entry.maximum) {
				return false;
			}
			break;
		case 'string':
			if (typeof value !== 'string') {
				return false;
			}
			break;
		case 'boolean':
			if (typeof value !== 'boolean') {
				return false;
			}
			break;
		default:
			// A schema type this repair does not model: leave the value alone
			// rather than guess. The store's own validation is still the judge.
			return true;
	}
	return entry.enum === undefined || entry.enum.includes(value);
}

// Null when `parsed` is not a settings object at all (nothing to salvage).
export function repairConfigData(
	parsed: unknown,
	schema: Record<string, SchemaEntry>
): ConfigRepair | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return null;
	}
	const data: Record<string, unknown> = { ...(parsed as object) };
	const dropped: string[] = [];
	for (const [key, entry] of Object.entries(schema)) {
		if (key in data && !isValid(entry, data[key])) {
			delete data[key];
			dropped.push(key);
		}
	}
	return { data, dropped };
}
