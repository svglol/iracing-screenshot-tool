import en from '../locales/en';
import {
	SETTINGS,
	settingId,
	labelKey,
	helpKey,
	findSetting,
	validateValue,
} from './iracing-settings-schema';

function resolve(catalogue: unknown, dotPath: string): unknown {
	let node: unknown = catalogue;
	for (const part of dotPath.split('.')) {
		if (node === null || typeof node !== 'object') {
			return undefined;
		}
		node = (node as Record<string, unknown>)[part];
	}
	return node;
}

describe('the curated settings schema', () => {
	test('ids are unique', () => {
		const ids = SETTINGS.map(settingId);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test('every setting belongs to a known tab', () => {
		for (const setting of SETTINGS) {
			expect(['monitor', 'graphics']).toContain(setting.tab);
		}
	});

	test('the graphics tab is curated and carries replay pairing', () => {
		const graphics = SETTINGS.filter((s) => s.tab === 'graphics');
		expect(graphics.length).toBeGreaterThanOrEqual(38);
		expect(graphics.some((s) => s.pairedReplay)).toBe(true);
		for (const setting of graphics) {
			expect(setting.section).toBe('Graphics Options');
		}
	});

	test('every label resolves in the English catalogue', () => {
		for (const setting of SETTINGS) {
			const key = labelKey(setting).replace(/^iniEditor\./, 'iniEditor.');
			expect(typeof resolve(en, key), key).toBe('string');
		}
	});

	test('every hasHelp flag has its help string, and none is stranded', () => {
		for (const setting of SETTINGS) {
			const help = resolve(en, helpKey(setting));
			if (setting.hasHelp) {
				expect(typeof help, helpKey(setting)).toBe('string');
			} else {
				// A help string the schema does not announce would never render.
				expect(help, helpKey(setting)).toBeUndefined();
			}
		}
	});

	test('every group label resolves', () => {
		for (const setting of SETTINGS) {
			const key = `iniEditor.groups.${setting.group}`;
			expect(typeof resolve(en, key), key).toBe('string');
		}
	});

	test('every enum option label resolves', () => {
		for (const setting of SETTINGS) {
			for (const option of setting.enumValues || []) {
				expect(typeof resolve(en, option.labelKey), option.labelKey).toBe(
					'string'
				);
			}
		}
	});

	test('enum settings carry options; nothing else does', () => {
		for (const setting of SETTINGS) {
			if (setting.type === 'enum') {
				expect(setting.enumValues.length).toBeGreaterThan(1);
			} else {
				expect(setting.enumValues).toBeUndefined();
			}
		}
	});

	test('numeric bounds are sane', () => {
		for (const setting of SETTINGS) {
			if (setting.min !== undefined && setting.max !== undefined) {
				expect(setting.min, settingId(setting)).toBeLessThan(setting.max);
			}
		}
	});

	test('pairedReplay only appears on [Graphics Options] settings', () => {
		for (const setting of SETTINGS) {
			if (setting.pairedReplay) {
				expect(setting.section).toBe('Graphics Options');
			}
		}
	});

	test('findSetting round-trips every id', () => {
		for (const setting of SETTINGS) {
			expect(findSetting(settingId(setting))).toBe(setting);
		}
	});
});

describe('validateValue', () => {
	const of = (id: string) => {
		const setting = findSetting(id);
		expect(setting, id).toBeDefined();
		return setting;
	};

	test('bool accepts only 0 and 1', () => {
		const fullScreen = of('Display/fullScreen');
		expect(validateValue(fullScreen, '0')).toBe(true);
		expect(validateValue(fullScreen, '1')).toBe(true);
		expect(validateValue(fullScreen, '2')).toBe(false);
		expect(validateValue(fullScreen, 'true')).toBe(false);
		expect(validateValue(fullScreen, '')).toBe(false);
	});

	test('only known sections remain after the MonitorSetup removal', () => {
		for (const setting of SETTINGS) {
			expect(['Display', 'Graphics Options']).toContain(setting.section);
		}
	});

	test('int accepts integers within bounds', () => {
		const width = of('Display/windowedWidth');
		expect(validateValue(width, '1920')).toBe(true);
		expect(validateValue(width, ' 1920 ')).toBe(true);
		expect(validateValue(width, '1920.5')).toBe(false);
		expect(validateValue(width, '100')).toBe(false); // below min 640
		expect(validateValue(width, '99999')).toBe(false); // above max
		expect(validateValue(width, 'wide')).toBe(false);
	});

	test('int accepts negatives where the bounds allow them', () => {
		const left = of('Display/windowedXPos');
		expect(validateValue(left, '-1920')).toBe(true);
		expect(validateValue(left, '-99999')).toBe(false);
	});

	test('float accepts decimals, still bounded', () => {
		const rate = of('Display/RefreshRate');
		expect(validateValue(rate, '59.94')).toBe(true);
		expect(validateValue(rate, '60')).toBe(true);
		expect(validateValue(rate, '-1')).toBe(false); // below min
		expect(validateValue(rate, '9999')).toBe(false); // above max
		expect(validateValue(rate, '59,94')).toBe(false);
	});

	test('enum accepts only its listed values', () => {
		const quality = of('Graphics Options/ShaderQuality');
		expect(validateValue(quality, '0')).toBe(true);
		expect(validateValue(quality, '3')).toBe(true);
		expect(validateValue(quality, '4')).toBe(false);
	});
});
