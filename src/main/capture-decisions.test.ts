import {
	decideCaptureBackend,
	classifyWgcResult,
	decideLongExposureAvailability,
	decideWgcSupport,
	NATIVE_CAPTURE_REQUIRED_REASON,
	WGC_CURSOR_CAVEAT,
} from './capture-decisions';

describe('decideWgcSupport', () => {
	const ALL_CAPABLE = {
		apiSupported: true,
		cursorConfigSupported: true,
		borderConfigSupported: true,
	};

	test('supported when the addon loaded and every capability is present', () => {
		expect(
			decideWgcSupport({
				addonLoaded: true,
				loaderReason: null,
				apiSupported: true,
				capabilities: ALL_CAPABLE,
			})
		).toEqual({
			supported: true,
			reason: null,
			message: null,
			caveat: null,
		});
	});

	test('passes the loader reason through when the addon did not load', () => {
		const result = decideWgcSupport({
			addonLoaded: false,
			loaderReason: 'addon missing / ABI mismatch: boom',
			apiSupported: false,
			capabilities: null,
		});
		expect(result.supported).toBe(false);
		expect(result.reason).toBe('addon missing / ABI mismatch: boom');
		expect(result.message).toBeTruthy();
	});

	// Windows 10. This is the v3.2.1 bug report: the capture-border control is
	// Windows 11-only, and demanding it failed every grab. Windows 10 draws no
	// capture border at all, so the native side negotiates it away and loses
	// NOTHING — which must show up here as plain support, with no caveat.
	test('supported with no caveat when only the border control is missing', () => {
		expect(
			decideWgcSupport({
				addonLoaded: true,
				loaderReason: null,
				apiSupported: true,
				capabilities: { ...ALL_CAPABLE, borderConfigSupported: false },
			})
		).toEqual({
			supported: true,
			reason: null,
			message: null,
			caveat: null,
		});
	});

	// Below Win10 2004 the cursor cannot be suppressed. Still supported — a
	// capture with a cursor in it beats no capture — but the user is told.
	test('supported WITH a caveat when the cursor control is missing', () => {
		const result = decideWgcSupport({
			addonLoaded: true,
			loaderReason: null,
			apiSupported: true,
			capabilities: { ...ALL_CAPABLE, cursorConfigSupported: false },
		});
		expect(result.supported).toBe(true);
		expect(result.caveat).toBe(WGC_CURSOR_CAVEAT);
		// A caveat is not a refusal, so nothing that blocks the feature is set.
		expect(result.reason).toBeNull();
		expect(result.message).toBeNull();
	});

	// WGC itself is the one real floor.
	test('refuses only when WGC itself is absent', () => {
		const result = decideWgcSupport({
			addonLoaded: true,
			loaderReason: null,
			apiSupported: false,
			capabilities: ALL_CAPABLE,
		});
		expect(result.supported).toBe(false);
		expect(result.reason).toBe('OS unsupported (needs Win10 1903+)');
		expect(result.message).toContain('1903');
	});

	// An addon build predating probe_capture_support reports no capabilities. It
	// must degrade to the coarse gate, not hard-fail, or a stale .node in a dev
	// tree would silently disable the whole feature.
	test('falls back to the coarse gate when the addon has no probe', () => {
		expect(
			decideWgcSupport({
				addonLoaded: true,
				loaderReason: null,
				apiSupported: true,
				capabilities: null,
			})
		).toEqual({
			supported: true,
			reason: null,
			message: null,
			caveat: null,
		});
		expect(
			decideWgcSupport({
				addonLoaded: true,
				loaderReason: null,
				apiSupported: false,
				capabilities: null,
			}).supported
		).toBe(false);
	});
});

describe('decideLongExposureAvailability', () => {
	test('available only when the machine can run it AND WGC is on', () => {
		expect(
			decideLongExposureAvailability({
				nativeCapture: true,
				machineAvailable: true,
				machineReason: null,
			})
		).toEqual({ available: true, reason: null, needsNativeCapture: false });
	});

	// Long exposure is native-WGC-only — there is no getUserMedia fallback for GPU
	// accumulation — so the toggle is a prerequisite, not a preference.
	test('the High-Fidelity Capture toggle closes the gate', () => {
		expect(
			decideLongExposureAvailability({
				nativeCapture: false,
				machineAvailable: true,
				machineReason: null,
			})
		).toEqual({
			available: false,
			reason: NATIVE_CAPTURE_REQUIRED_REASON,
			needsNativeCapture: true,
		});
	});

	test('an incapable machine reports its own reason, not the toggle', () => {
		expect(
			decideLongExposureAvailability({
				nativeCapture: true,
				machineAvailable: false,
				machineReason: 'compute unavailable: no D3D11 device',
			})
		).toEqual({
			available: false,
			reason: 'compute unavailable: no D3D11 device',
			needsNativeCapture: false,
		});
	});

	// Both blocked at once: telling this user to flip a switch would send them after
	// a fix that cannot work, so the machine reason wins and no remedy is offered.
	test('machine incapability outranks the toggle when both are false', () => {
		expect(
			decideLongExposureAvailability({
				nativeCapture: false,
				machineAvailable: false,
				machineReason:
					'the native capture addon does not provide long exposure',
			})
		).toEqual({
			available: false,
			reason: 'the native capture addon does not provide long exposure',
			needsNativeCapture: false,
		});
	});
});

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
		expect(classifyWgcResult('no-frame', 'WGC capture timed out')).toEqual({
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
