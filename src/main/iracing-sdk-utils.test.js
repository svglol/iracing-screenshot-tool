'use strict';

// Mock irsdk-node before requiring the module under test.
// The native addon cannot be loaded in Jest, so we provide the CameraState enum.
vi.mock('irsdk-node', () => ({
	CameraState: {
		IsSessionScreen: 1,
		IsScenicActive: 2,
		CamToolActive: 4,
		UIHidden: 8,
		UseAutoShotSelection: 16,
		UseTemporaryEdits: 32,
		UseKeyAcceleration: 64,
		UseKey10xAcceleration: 128,
		UseMouseAimMode: 256,
	},
}));

const {
	normalizeTelemetryValue,
	decodeCameraState,
	flattenTelemetry,
} = require('./iracing-sdk-utils');

// ---------------------------------------------------------------------------
// normalizeTelemetryValue
// ---------------------------------------------------------------------------
describe('normalizeTelemetryValue', () => {
	test('returns non-array values as-is', () => {
		expect(normalizeTelemetryValue(42)).toBe(42);
		expect(normalizeTelemetryValue('hello')).toBe('hello');
		expect(normalizeTelemetryValue(true)).toBe(true);
		expect(normalizeTelemetryValue(null)).toBe(null);
		expect(normalizeTelemetryValue(undefined)).toBe(undefined);
		expect(normalizeTelemetryValue(0)).toBe(0);
	});

	test('unwraps single-element arrays', () => {
		expect(normalizeTelemetryValue([42])).toBe(42);
		expect(normalizeTelemetryValue(['hello'])).toBe('hello');
		expect(normalizeTelemetryValue([null])).toBe(null);
		expect(normalizeTelemetryValue([0])).toBe(0);
	});

	test('returns a copy of multi-element arrays', () => {
		const original = [1, 2, 3];
		const result = normalizeTelemetryValue(original);
		expect(result).toEqual([1, 2, 3]);
		expect(result).not.toBe(original); // must be a shallow copy
	});

	test('returns a copy for two-element arrays', () => {
		expect(normalizeTelemetryValue([10, 20])).toEqual([10, 20]);
	});

	test('returns empty array for empty array input', () => {
		const result = normalizeTelemetryValue([]);
		expect(result).toEqual([]);
		expect(Array.isArray(result)).toBe(true);
	});

	test('handles objects as values', () => {
		const obj = { a: 1 };
		expect(normalizeTelemetryValue(obj)).toBe(obj);
	});

	test('handles nested arrays', () => {
		const result = normalizeTelemetryValue([
			[1, 2],
			[3, 4],
		]);
		expect(result).toEqual([
			[1, 2],
			[3, 4],
		]);
	});
});

// ---------------------------------------------------------------------------
// decodeCameraState
// ---------------------------------------------------------------------------
describe('decodeCameraState', () => {
	test('returns empty array for non-number input', () => {
		expect(decodeCameraState('hello')).toEqual([]);
		expect(decodeCameraState(null)).toEqual([]);
		expect(decodeCameraState(undefined)).toEqual([]);
		expect(decodeCameraState([])).toEqual([]);
		expect(decodeCameraState({})).toEqual([]);
	});

	test('returns empty array for 0', () => {
		expect(decodeCameraState(0)).toEqual([]);
	});

	test('decodes individual camera state flags', () => {
		expect(decodeCameraState(1)).toContain('IsSessionScreen');
		expect(decodeCameraState(2)).toContain('IsScenicActive');
		expect(decodeCameraState(4)).toContain('CamToolActive');
		expect(decodeCameraState(8)).toContain('UIHidden');
		expect(decodeCameraState(16)).toContain('UseAutoShotSelection');
		expect(decodeCameraState(32)).toContain('UseTemporaryEdits');
		expect(decodeCameraState(64)).toContain('UseKeyAcceleration');
		expect(decodeCameraState(128)).toContain('UseKey10xAcceleration');
		expect(decodeCameraState(256)).toContain('UseMouseAimMode');
	});

	test('decodes combined camera state flags', () => {
		// 1 (IsSessionScreen) + 8 (UIHidden) = 9
		const result = decodeCameraState(9);
		expect(result).toContain('IsSessionScreen');
		expect(result).toContain('UIHidden');
		expect(result).not.toContain('IsScenicActive');
	});

	test('returns all flags for max bitmask (511)', () => {
		const result = decodeCameraState(511);
		expect(result).toContain('IsSessionScreen');
		expect(result).toContain('IsScenicActive');
		expect(result).toContain('CamToolActive');
		expect(result).toContain('UIHidden');
		expect(result).toContain('UseAutoShotSelection');
		expect(result).toContain('UseTemporaryEdits');
		expect(result).toContain('UseKeyAcceleration');
		expect(result).toContain('UseKey10xAcceleration');
		expect(result).toContain('UseMouseAimMode');
		expect(result).toHaveLength(9);
	});

	test('does not include flags whose bits are not set', () => {
		// 5 = 1 (IsSessionScreen) + 4 (CamToolActive)
		const result = decodeCameraState(5);
		expect(result).toContain('IsSessionScreen');
		expect(result).toContain('CamToolActive');
		expect(result).toHaveLength(2);
	});

	test('handles NaN', () => {
		expect(decodeCameraState(NaN)).toEqual([]);
	});

	test('handles negative numbers', () => {
		// -1 in two's complement has all bits set
		const result = decodeCameraState(-1);
		expect(result.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// flattenTelemetry
// ---------------------------------------------------------------------------
describe('flattenTelemetry', () => {
	test('flattens telemetry variables to plain values', () => {
		const raw = {
			Speed: { value: 150.5 },
			Gear: { value: [4] },
			TireTemp: { value: [80, 85, 82, 78] },
		};
		const result = flattenTelemetry(raw);
		expect(result.values.Speed).toBe(150.5);
		expect(result.values.Gear).toBe(4);
		expect(result.values.TireTemp).toEqual([80, 85, 82, 78]);
	});

	test('decodes CamCameraState from numeric mask', () => {
		const raw = {
			CamCameraState: { value: [9] }, // 1 (IsSessionScreen) + 8 (UIHidden)
		};
		const result = flattenTelemetry(raw);
		expect(result.values.CamCameraState).toContain('IsSessionScreen');
		expect(result.values.CamCameraState).toContain('UIHidden');
	});

	test('handles empty/null telemetry', () => {
		const result = flattenTelemetry(null);
		expect(result).toEqual({ values: { CamCameraState: [] } });

		const result2 = flattenTelemetry({});
		expect(result2).toEqual({ values: { CamCameraState: [] } });
	});

	test('handles undefined telemetry', () => {
		const result = flattenTelemetry(undefined);
		expect(result.values.CamCameraState).toEqual([]);
	});

	test('CamCameraState defaults to empty array when not present in raw', () => {
		const raw = { Speed: { value: 100 } };
		const result = flattenTelemetry(raw);
		expect(result.values.CamCameraState).toEqual([]);
	});

	test('CamCameraState with 0 returns empty array', () => {
		const raw = { CamCameraState: { value: 0 } };
		const result = flattenTelemetry(raw);
		expect(result.values.CamCameraState).toEqual([]);
	});

	test('result always has values object', () => {
		const result = flattenTelemetry({ Lap: { value: 5 } });
		expect(result).toHaveProperty('values');
		expect(typeof result.values).toBe('object');
	});

	test('preserves all telemetry keys', () => {
		const raw = {
			Speed: { value: 100 },
			RPM: { value: 5000 },
			Lap: { value: [3] },
		};
		const result = flattenTelemetry(raw);
		expect(result.values.Speed).toBe(100);
		expect(result.values.RPM).toBe(5000);
		expect(result.values.Lap).toBe(3);
	});

	test('handles telemetry with CamCameraState as multi-flag mask', () => {
		// 7 = IsSessionScreen(1) + IsScenicActive(2) + CamToolActive(4)
		const raw = { CamCameraState: { value: 7 } };
		const result = flattenTelemetry(raw);
		expect(result.values.CamCameraState).toContain('IsSessionScreen');
		expect(result.values.CamCameraState).toContain('IsScenicActive');
		expect(result.values.CamCameraState).toContain('CamToolActive');
		expect(result.values.CamCameraState).toHaveLength(3);
	});
});
