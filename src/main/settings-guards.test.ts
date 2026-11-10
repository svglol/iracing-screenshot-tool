import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
	isRestoreGeometryKey,
	normalizeRestoreGeometry,
	writeConfig,
} from './settings-guards';
import { schema } from '../utilities/config-schema';

// The real library electron-store wraps, against the real schema.
const Conf = require('conf');

let dir: string;
let store: { get(key: string): unknown; set(key: string, v: unknown): void };
beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-guards-'));
	store = new Conf({ cwd: dir, schema });
});
afterEach(() => {
	fs.rmSync(dir, { recursive: true, force: true });
});

describe('writeConfig', () => {
	test('writes a valid value and reports the previous one', () => {
		expect(
			writeConfig(store, { key: 'defaultScreenLeft', value: -1920 })
		).toEqual({
			ok: true,
			key: 'defaultScreenLeft',
			value: -1920,
			oldValue: 0,
		});
		expect(store.get('defaultScreenLeft')).toBe(-1920);
	});

	// Regression: NaN passed the schema, was saved as null, and from then on every
	// read and write threw.
	test.each([NaN, Infinity, -Infinity])(
		'refuses %s and leaves the store readable',
		(value) => {
			const result = writeConfig(store, { key: 'defaultScreenLeft', value });
			expect(result.ok).toBe(false);
			expect(store.get('defaultScreenLeft')).toBe(0);
			expect(store.get('screenshotKeybind')).toBe('Control+PrintScreen');
			expect(() => new Conf({ cwd: dir, schema })).not.toThrow();
		}
	);

	test('refuses undefined instead of throwing', () => {
		expect(writeConfig(store, { key: 'crop', value: undefined })).toEqual({
			ok: false,
			key: 'crop',
			reason: 'value is undefined',
		});
	});

	test('contains a schema violation instead of throwing, and writes nothing', () => {
		const result = writeConfig(store, { key: 'customWidth', value: '2560' });
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.reason).toMatch(/schema violation/i);
		expect(store.get('customWidth')).toBe(1920);
	});

	test.each([null, 'crop', 42, { value: true }, { key: '', value: true }])(
		'refuses a malformed payload (%j)',
		(payload) => {
			expect(writeConfig(store, payload).ok).toBe(false);
		}
	);
});

describe('normalizeRestoreGeometry', () => {
	test('passes finite values through, rounded', () => {
		expect(normalizeRestoreGeometry('defaultScreenWidth', 2560)).toBe(2560);
		expect(normalizeRestoreGeometry('defaultScreenHeight', 1439.6)).toBe(
			1440
		);
		expect(normalizeRestoreGeometry('defaultScreenLeft', -1920)).toBe(-1920);
		expect(normalizeRestoreGeometry('defaultScreenTop', 0)).toBe(0);
	});

	// Regression: an empty or half-typed Settings field sent NaN, which reached
	// SetWindowPos as 0.
	test.each([NaN, Infinity, undefined, null, '1920', {}])(
		'ignores %s',
		(value) => {
			expect(
				normalizeRestoreGeometry('defaultScreenWidth', value)
			).toBeNull();
			expect(
				normalizeRestoreGeometry('defaultScreenLeft', value)
			).toBeNull();
		}
	);

	test('a size must be at least one pixel; a position may be zero or negative', () => {
		expect(normalizeRestoreGeometry('defaultScreenWidth', 0)).toBeNull();
		expect(normalizeRestoreGeometry('defaultScreenHeight', -720)).toBeNull();
		expect(normalizeRestoreGeometry('defaultScreenTop', -5)).toBe(-5);
	});

	test('isRestoreGeometryKey recognises exactly the four keys', () => {
		expect(isRestoreGeometryKey('defaultScreenWidth')).toBe(true);
		expect(isRestoreGeometryKey('defaultScreenTop')).toBe(true);
		expect(isRestoreGeometryKey('winWidth')).toBe(false);
	});
});
