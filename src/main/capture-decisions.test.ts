import {
	decideCaptureBackend,
	classifyWgcResult,
} from './capture-decisions';

describe('decideCaptureBackend (cq-tests#2)', () => {
	test('ReShade wins whenever it is enabled — even if WGC is available', () => {
		expect(
			decideCaptureBackend({
				reshade: true,
				nativeCapture: true,
				wgcAvailable: true,
			})
		).toBe('reshade');
		expect(
			decideCaptureBackend({
				reshade: true,
				nativeCapture: false,
				wgcAvailable: false,
			})
		).toBe('reshade');
	});

	test('WGC only when nativeCapture is on AND the addon is available', () => {
		expect(
			decideCaptureBackend({
				reshade: false,
				nativeCapture: true,
				wgcAvailable: true,
			})
		).toBe('wgc');
	});

	test('falls back to getUserMedia when either WGC input is false', () => {
		expect(
			decideCaptureBackend({
				reshade: false,
				nativeCapture: true,
				wgcAvailable: false,
			})
		).toBe('getUserMedia');
		expect(
			decideCaptureBackend({
				reshade: false,
				nativeCapture: false,
				wgcAvailable: true,
			})
		).toBe('getUserMedia');
		expect(
			decideCaptureBackend({
				reshade: false,
				nativeCapture: false,
				wgcAvailable: false,
			})
		).toBe('getUserMedia');
	});
});

describe('classifyWgcResult (cq-tests#2)', () => {
	test('no-frame carries the native reason when present (H1/H2 distinguisher)', () => {
		expect(
			classifyWgcResult('no-frame', 'WGC capture timed out')
		).toEqual({
			outcome: 'fallback',
			fallbackReason: 'WGC capture timed out',
		});
	});

	test('no-frame falls back to a stable default when no native reason', () => {
		expect(classifyWgcResult('no-frame', null)).toEqual({
			outcome: 'fallback',
			fallbackReason: 'no-frame (native returned null)',
		});
		// Empty string is also treated as "no reason".
		expect(classifyWgcResult('no-frame', '')).toEqual({
			outcome: 'fallback',
			fallbackReason: 'no-frame (native returned null)',
		});
	});

	test('black frame is a fixed marker, ignoring any native reason', () => {
		expect(classifyWgcResult('black', 'ignored')).toEqual({
			outcome: 'fallback',
			fallbackReason: 'black-frame',
		});
	});
});
