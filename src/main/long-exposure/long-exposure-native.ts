// Availability gate for the long-exposure compute backend.
//
// Two independent things have to be true, and they fail at different times:
//   1. the addon exposes the longExposure* surface (an older .node does not), and
//   2. the compute kernels actually build on THIS machine's driver.
//
// (2) is checked by calling into the addon's probe, which compiles the four HLSL
// kernels and throws with a reason. It needs no device and does no GPU work, so it
// is cheap — and doing it up front is the difference between "your GPU can't run
// this" before the user commits, and a black frame sixteen seconds into a capture.
//
// Everything fails soft: an unavailable backend produces a reason string the UI can
// show, never a crash.

import { getLongExposureAddon } from '../wgc-capture';
import type { WgcLongExposureAddon } from '../wgc-capture';
import { createLogger } from '../../utilities/logger';

const log = createLogger('long-exposure/native');

export type { WgcLongExposureAddon };

export interface LongExposureAvailability {
	available: boolean;
	// Compute backend identifier ('d3d11-compute') when available; null otherwise.
	backend: string | null;
	// Why it is unavailable, for the UI and the diagnostics log. null when available.
	reason: string | null;
	// Which physical GPU the capture/accumulate device landed on, when the addon
	// can report it. WGC creates its device against the DEFAULT adapter, which on a
	// hybrid machine need not be the card iRacing renders on — so this turns two
	// otherwise-baffling problems into one log line: compute silently running on an
	// iGPU, and NVIDIA-only features being unable to bind.
	adapter: string | null;
	isNvidia: boolean | null;
	// Whether NVIDIA's hardware optical-flow accelerator can drive frame
	// interpolation here. SEPARATE from `available` on purpose: interpolation is an
	// optional accelerator on top of the base feature, so this being false must
	// never disable long exposure. NVOFA needs Turing-or-newer NVIDIA, and cannot
	// bind at all when WGC's device landed on a hybrid machine's iGPU — which is
	// exactly why `adapter` is reported beside it.
	interpolation: {
		available: boolean;
		reason: string | null;
		gridSize: number;
		bidirectional: boolean;
	} | null;
}

// Frame size the interpolation probe runs at. NVOFA has a maximum supported input
// size, so probing at a plausible worst case (4K at 2x supersample) means the UI
// never offers interpolation that a real capture would then decline.
const INTERPOLATION_PROBE_WIDTH = 7680;
const INTERPOLATION_PROBE_HEIGHT = 4320;

// undefined = not probed yet. The probe result is cached for the session: neither
// the addon's presence nor the driver's shader support changes while we run.
let cached: LongExposureAvailability | undefined;

export function getLongExposureAvailability(): LongExposureAvailability {
	if (cached !== undefined) {
		return cached;
	}

	const addon = getLongExposureAddon();
	if (!addon) {
		cached = {
			available: false,
			backend: null,
			reason: 'the native capture addon does not provide long exposure',
			adapter: null,
			isNvidia: null,
			interpolation: null,
		};
		log.warn('Long exposure unavailable', { reason: cached.reason });
		return cached;
	}

	// Best-effort and independent of the probe: knowing which GPU we are on is
	// useful even when the kernels fail to build.
	let adapter: string | null = null;
	let isNvidia: boolean | null = null;
	try {
		const info = addon.longExposureDeviceInfo?.();
		if (info) {
			adapter = info.adapter;
			isNvidia = info.isNvidia;
		}
	} catch (error) {
		log.debug('Could not query the capture adapter', {
			error: (error as Error)?.message || String(error),
		});
	}

	// Probed independently of the compute backend, and never allowed to affect it: a
	// throw here is caught and becomes "interpolation unavailable", not "long
	// exposure unavailable". An addon predating the feature omits the method
	// entirely, which is the same outcome.
	let interpolation: LongExposureAvailability['interpolation'] = null;
	try {
		const info = addon.longExposureInterpolationInfo?.(
			INTERPOLATION_PROBE_WIDTH,
			INTERPOLATION_PROBE_HEIGHT
		);
		if (info) {
			interpolation = {
				available: info.available,
				reason: info.reason ?? null,
				gridSize: info.gridSize,
				bidirectional: info.bidirectional,
			};
		}
	} catch (error) {
		interpolation = {
			available: false,
			reason: (error as Error)?.message || String(error),
			gridSize: 0,
			bidirectional: false,
		};
	}

	try {
		const backend = addon.longExposureProbe();
		cached = {
			available: true,
			backend,
			reason: null,
			adapter,
			isNvidia,
			interpolation,
		};
		log.info('Long exposure available', {
			backend,
			adapter,
			isNvidia,
			interpolation,
		});
	} catch (error) {
		const message = (error as Error)?.message || String(error);
		cached = {
			available: false,
			backend: null,
			reason: message,
			adapter,
			isNvidia,
			interpolation,
		};
		log.warn('Long exposure unavailable', { reason: message, adapter });
	}
	return cached;
}

export function isLongExposureAvailable(): boolean {
	return getLongExposureAvailability().available;
}

// The addon, or null when unavailable. Callers must handle null — there is no
// portable fallback for GPU accumulation, so an unsupported machine gets a clear
// message rather than a degraded shot.
export function getLongExposureApi(): WgcLongExposureAddon | null {
	return getLongExposureAvailability().available
		? getLongExposureAddon()
		: null;
}

// Test-only seam, mirroring __setWgcApiForTests: reset the cached probe so a suite
// can exercise both the available and unavailable branches. Never called by
// production code.
export function __resetLongExposureAvailabilityForTests(): void {
	cached = undefined;
}
