import { beforeEach, describe, expect, it, vi } from 'vitest';

// The addon accessor is the seam under test: this suite drives every branch of the
// availability gate without needing a real .node, a GPU, or a live window.
const getLongExposureAddon = vi.fn();

vi.mock('../wgc-capture', () => ({
	getLongExposureAddon: () => getLongExposureAddon(),
}));

vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

import {
	__resetLongExposureAvailabilityForTests,
	getLongExposureApi,
	getLongExposureAvailability,
	isLongExposureAvailable,
} from './long-exposure-native';

function fakeAddon(probe: () => string) {
	return {
		longExposureProbe: probe,
		longExposureBegin: vi.fn(),
		longExposureSetSample: vi.fn(),
		longExposureSetGate: vi.fn(),
		longExposureStats: vi.fn(),
		longExposureFinish: vi.fn(),
		longExposureAbort: vi.fn(),
	};
}

beforeEach(() => {
	__resetLongExposureAvailabilityForTests();
	getLongExposureAddon.mockReset();
});

describe('getLongExposureAvailability', () => {
	it('reports the backend when the probe succeeds', () => {
		getLongExposureAddon.mockReturnValue(fakeAddon(() => 'd3d11-compute'));
		expect(getLongExposureAvailability()).toEqual({
			available: true,
			backend: 'd3d11-compute',
			reason: null,
		});
		expect(isLongExposureAvailable()).toBe(true);
	});

	// An older .node that predates the feature must degrade to "unavailable" with a
	// reason, not crash the main process on load.
	it('degrades with a reason when the addon has no long-exposure surface', () => {
		getLongExposureAddon.mockReturnValue(null);
		const availability = getLongExposureAvailability();
		expect(availability.available).toBe(false);
		expect(availability.backend).toBeNull();
		expect(availability.reason).toMatch(/does not provide long exposure/);
		expect(getLongExposureApi()).toBeNull();
	});

	// The probe compiles the compute kernels, so a driver that cannot build them
	// surfaces here — up front, rather than as a black frame sixteen seconds into a
	// capture.
	it('surfaces the probe failure reason when the kernels will not build', () => {
		getLongExposureAddon.mockReturnValue(
			fakeAddon(() => {
				throw new Error(
					'long-exposure compute unavailable: d3dcompiler missing'
				);
			})
		);
		const availability = getLongExposureAvailability();
		expect(availability.available).toBe(false);
		expect(availability.reason).toMatch(/d3dcompiler missing/);
		expect(isLongExposureAvailable()).toBe(false);
		expect(getLongExposureApi()).toBeNull();
	});

	// A native addon can reject with something that is not an Error; the gate must
	// still produce a usable reason string rather than "undefined".
	it('survives a probe that throws a non-Error', () => {
		getLongExposureAddon.mockReturnValue(
			fakeAddon(() => {
				// eslint-disable-next-line no-throw-literal
				throw 'plain string';
			})
		);
		expect(getLongExposureAvailability().reason).toBe('plain string');
	});

	// Neither the addon's presence nor the driver's shader support changes while we
	// run, so the probe — which compiles four shaders — is a once-per-session cost.
	// (getLongExposureAddon itself may be called again by getLongExposureApi; that
	// is a cached lookup in wgc-capture, not a repeat of the expensive work.)
	it('caches the result so the probe runs only once', () => {
		const probe = vi.fn(() => 'd3d11-compute');
		getLongExposureAddon.mockReturnValue(fakeAddon(probe));

		getLongExposureAvailability();
		getLongExposureAvailability();
		isLongExposureAvailable();
		getLongExposureApi();

		expect(probe).toHaveBeenCalledTimes(1);
	});

	it('caches an unavailable verdict too, so a failing probe is not retried', () => {
		const probe = vi.fn(() => {
			throw new Error('nope');
		});
		getLongExposureAddon.mockReturnValue(fakeAddon(probe));

		getLongExposureAvailability();
		getLongExposureAvailability();

		expect(probe).toHaveBeenCalledTimes(1);
	});
});

describe('getLongExposureApi', () => {
	it('returns the addon only when the probe passed', () => {
		const addon = fakeAddon(() => 'd3d11-compute');
		getLongExposureAddon.mockReturnValue(addon);
		expect(getLongExposureApi()).toBe(addon);
	});

	// There is no portable fallback for GPU accumulation, so callers get null and
	// must surface a message rather than silently degrading the shot.
	it('returns null rather than a half-working addon when the probe failed', () => {
		getLongExposureAddon.mockReturnValue(
			fakeAddon(() => {
				throw new Error('unsupported');
			})
		);
		expect(getLongExposureApi()).toBeNull();
	});
});
