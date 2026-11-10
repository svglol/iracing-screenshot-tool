import {
	decideCaptureBlock,
	captureBlockMessage,
	decideCaptureBackend,
	classifyWgcResult,
	decideLongExposureAvailability,
	decideWgcSupport,
	NATIVE_CAPTURE_REQUIRED_REASON,
	WGC_CURSOR_CAVEAT,
	clampCaptureDimension,
	isRgbaBufferBlack,
	BLACK_FRAME_MAX_BRIGHTNESS,
	MAX_CAPTURE_DIMENSION,
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
		expect(result.caveat).toBe(WGC_CURSOR_CAVEAT());
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
			reason: NATIVE_CAPTURE_REQUIRED_REASON(),
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

describe('decideCaptureBlock', () => {
	const DENIED = { allowed: false, hresult: '0x80070005' };

	test('elevated + refused → elevated (the field case)', () => {
		expect(
			decideCaptureBlock({
				reshade: false,
				permission: DENIED,
				elevated: true,
			})
		).toBe('elevated');
	});

	test('refused without elevation (or unknown elevation) → denied', () => {
		expect(
			decideCaptureBlock({
				reshade: false,
				permission: DENIED,
				elevated: false,
			})
		).toBe('denied');
		expect(
			decideCaptureBlock({
				reshade: false,
				permission: DENIED,
				elevated: null,
			})
		).toBe('denied');
	});

	test('elevated but allowed is NOT blocked — never warn on elevation alone', () => {
		expect(
			decideCaptureBlock({
				reshade: false,
				permission: { allowed: true, hresult: null },
				elevated: true,
			})
		).toBeNull();
	});

	test('a non-access-denied refusal fails open (Win11 23H2 taskbar, 0x80070057)', () => {
		for (const elevated of [false, true, null]) {
			expect(
				decideCaptureBlock({
					reshade: false,
					permission: { allowed: false, hresult: '0x80070057' },
					elevated,
				})
			).toBeNull();
		}
		expect(
			decideCaptureBlock({
				reshade: false,
				permission: { allowed: false, hresult: null },
				elevated: false,
			})
		).toBeNull();
	});

	test('ReShade is never blocked — it captures inside iRacing', () => {
		expect(
			decideCaptureBlock({
				reshade: true,
				permission: DENIED,
				elevated: true,
			})
		).toBeNull();
	});

	test('an unknowable probe fails open', () => {
		expect(
			decideCaptureBlock({
				reshade: false,
				permission: null,
				elevated: true,
			})
		).toBeNull();
	});
});

describe('captureBlockMessage', () => {
	test('elevated names the Run-as-administrator setting', () => {
		expect(captureBlockMessage('elevated', '0x80070005')).toContain(
			'Run this program as an administrator'
		);
	});

	test('denied carries the HRESULT, or "unknown" without one', () => {
		expect(captureBlockMessage('denied', '0x80070005')).toContain(
			'0x80070005'
		);
		expect(captureBlockMessage('denied', null)).toContain('unknown');
	});
});

describe('clampCaptureDimension', () => {
	test('passes a sane dimension through, rounded', () => {
		expect(clampCaptureDimension(3840, 1920)).toBe(3840);
		expect(clampCaptureDimension(1439.6, 1920)).toBe(1440);
		expect(clampCaptureDimension('2560', 1920)).toBe(2560);
	});

	test('caps at the capture ceiling', () => {
		expect(clampCaptureDimension(20000, 1920)).toBe(MAX_CAPTURE_DIMENSION);
	});

	test.each([NaN, 0, -1, undefined, null, 'wide', {}])(
		'falls back for %j',
		(value) => {
			expect(clampCaptureDimension(value, 1920)).toBe(1920);
		}
	);
});

describe('isRgbaBufferBlack', () => {
	function frame(width: number, height: number, fill = 0): Buffer {
		return Buffer.alloc(width * height * 4, fill);
	}
	function setPixel(
		buffer: Buffer,
		width: number,
		x: number,
		y: number,
		rgb: [number, number, number]
	): void {
		const i = (y * width + x) * 4;
		[buffer[i], buffer[i + 1], buffer[i + 2]] = rgb;
	}

	test('an all-black frame is black', () => {
		expect(isRgbaBufferBlack(frame(640, 360), 640, 360)).toBe(true);
	});

	test('a dark-but-real frame is not', () => {
		// 10 per channel: a night scene, well under any "black" a person sees,
		// yet over the floor.
		expect(isRgbaBufferBlack(frame(640, 360, 10), 640, 360)).toBe(false);
	});

	test('the floor is inclusive: a sum of exactly the threshold is still black', () => {
		const width = 64;
		const buffer = frame(width, 36);
		setPixel(buffer, width, 0, 0, [8, 8, BLACK_FRAME_MAX_BRIGHTNESS - 16]);
		expect(isRgbaBufferBlack(buffer, width, 36)).toBe(true);
		setPixel(buffer, width, 0, 0, [8, 8, BLACK_FRAME_MAX_BRIGHTNESS - 15]);
		expect(isRgbaBufferBlack(buffer, width, 36)).toBe(false);
	});

	test('alpha is ignored', () => {
		expect(
			isRgbaBufferBlack(frame(64, 36).fill(0).fill(255, 3, 4), 64, 36)
		).toBe(true);
	});

	// Characterisation of the sampling, not an endorsement: one bright pixel that
	// falls between grid points is not seen. A real scene is never a single pixel.
	test('samples a coarse grid: a lone pixel between grid points is not seen', () => {
		const width = 640;
		const buffer = frame(width, 360);
		setPixel(buffer, width, 1, 1, [255, 255, 255]);
		expect(isRgbaBufferBlack(buffer, width, 360)).toBe(true);
		setPixel(buffer, width, 20, 20, [255, 255, 255]);
		expect(isRgbaBufferBlack(buffer, width, 360)).toBe(false);
	});

	test('a frame narrower than the grid samples every pixel', () => {
		const buffer = frame(8, 4);
		setPixel(buffer, 8, 7, 3, [200, 0, 0]);
		expect(isRgbaBufferBlack(buffer, 8, 4)).toBe(false);
	});
});
