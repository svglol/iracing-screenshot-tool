// Repair is judged against the REAL schema and the REAL conf (the library
// electron-store wraps), so "the store opens again" is observed, not assumed.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { repairConfigData } from './config-repair';
import { schema } from './config-schema';

// conf is CommonJS with a default-export class.
const Conf = require('conf');

let dir: string;
beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-repair-'));
});
afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

function writeConfig(data: unknown): void {
	fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(data));
}

function openStore() {
	return new Conf({ cwd: dir, schema });
}

describe('repairConfigData', () => {
	test('reproduces the field failure: a NaN write leaves a file the store cannot open', () => {
		const store = openStore();
		store.set('screenshotKeybind', 'F12');
		// ajv accepts NaN as a number; conf then serialises it as null.
		store.set('defaultScreenLeft', NaN);
		expect(() => openStore()).toThrow(/schema violation/i);
	});

	test('drops only the invalid value, so the store opens with everything else intact', () => {
		writeConfig({
			defaultScreenLeft: null,
			screenshotKeybind: 'F12',
			screenshotFolder: 'D:\\Shots',
			customWidth: 2560,
		});
		expect(() => openStore()).toThrow(/schema violation/i);

		const raw = JSON.parse(
			fs.readFileSync(path.join(dir, 'config.json'), 'utf8')
		);
		const repair = repairConfigData(raw, schema);
		expect(repair.dropped).toEqual(['defaultScreenLeft']);
		writeConfig(repair.data);

		const store = openStore();
		expect(store.get('defaultScreenLeft')).toBe(0);
		expect(store.get('screenshotKeybind')).toBe('F12');
		expect(store.get('screenshotFolder')).toBe('D:\\Shots');
		expect(store.get('customWidth')).toBe(2560);
	});

	test('drops wrong types, out-of-enum and out-of-range values', () => {
		const repair = repairConfigData(
			{
				crop: 'yes',
				outputFormat: 'tiff',
				longExposurePasses: 99,
				longExposureWarmUpSeconds: -1,
				customHeight: '1080',
				resolution: 4,
			},
			schema
		);
		expect(repair.dropped.sort()).toEqual(
			[
				'crop',
				'customHeight',
				'longExposurePasses',
				'longExposureWarmUpSeconds',
				'outputFormat',
				'resolution',
			].sort()
		);
		writeConfig(repair.data);
		expect(() => openStore()).not.toThrow();
	});

	test('keeps valid values and keys the schema does not know', () => {
		const data = {
			crop: false,
			outputFormat: 'png',
			longExposurePasses: 4,
			someNewerBuildSetting: { nested: true },
		};
		const repair = repairConfigData(data, schema);
		expect(repair.dropped).toEqual([]);
		expect(repair.data).toEqual(data);
	});

	test('does not mutate its input', () => {
		const data = { defaultScreenTop: null };
		repairConfigData(data, schema);
		expect(data).toEqual({ defaultScreenTop: null });
	});

	test('returns null when there is no settings object to salvage', () => {
		expect(repairConfigData(null, schema)).toBeNull();
		expect(repairConfigData([1, 2], schema)).toBeNull();
		expect(repairConfigData('config', schema)).toBeNull();
	});

	test('a file of nothing but defaults-shaped values is already valid for the store', () => {
		const defaults = Object.fromEntries(
			Object.entries(schema).map(([key, entry]) => [key, entry.default])
		);
		expect(repairConfigData(defaults, schema).dropped).toEqual([]);
		writeConfig(defaults);
		expect(() => openStore()).not.toThrow();
	});
});
