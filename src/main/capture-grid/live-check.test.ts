import { describe, expect, it } from 'vitest';
import {
	LIVE_PROBE_INTERVAL_MS,
	LIVE_PROBE_READS,
	probeTelemetrySource,
	type LiveProbeDeps,
} from './live-check';

// A clock-driven fake: `frameAt` and `pctsAt` say what the sim reports at each
// moment, so a test describes a replay or a live race as functions of time.
function fake(
	frameAt: (ms: number) => number | null,
	pctsAt: (ms: number) => number[] | null
): LiveProbeDeps & { elapsed: () => number } {
	let clock = 0;
	return {
		readFrame: () => frameAt(clock),
		readLapDistPct: () => pctsAt(clock),
		delay: async (ms) => {
			clock += ms;
		},
		elapsed: () => clock,
	};
}

describe('probeTelemetrySource', () => {
	it('a paused replay: frame and distances hold still → replay', async () => {
		const deps = fake(
			() => 74500,
			() => [0.25, 0.5, -1]
		);
		const out = await probeTelemetrySource(deps);
		expect(out.result).toBe('replay');
		expect(deps.elapsed()).toBe(LIVE_PROBE_READS * LIVE_PROBE_INTERVAL_MS);
	});

	it('the 2026-11-17 live session: frame held, cars kept racing → live', async () => {
		// ~100 s laps: a car covers 1/100 of a lap per second.
		const deps = fake(
			() => 71725,
			(ms) => [-1, 0.3 + ms / 100_000, 0.9 + ms / 100_000]
		);
		const out = await probeTelemetrySource(deps);
		expect(out.result).toBe('live');
		expect(out.movedCarIdx).toBe(1);
		expect(out.frame).toBe(71725);
	});

	it('a parked car alone is not evidence; any moving car is', async () => {
		const deps = fake(
			() => 100,
			(ms) => [0.5, 0.5, ms >= 500 ? 0.7001 : 0.7]
		);
		const out = await probeTelemetrySource(deps);
		expect(out.result).toBe('live');
		expect(out.movedCarIdx).toBe(2);
	});

	it('crossing the line is a small move, not a whole lap', async () => {
		const deps = fake(
			() => 100,
			(ms) => [ms === 0 ? 0.9999999 : 0.0000001]
		);
		// 2e-7 of a lap: under the threshold, so still a frozen replay.
		expect((await probeTelemetrySource(deps)).result).toBe('replay');
	});

	it('a replay still moving (pause not yet in effect) restarts the baseline', async () => {
		// Frame advances for the first 500 ms, then holds; distances follow the
		// frame, as a replay's do.
		const frame = (ms: number) => 1000 + Math.min(ms, 500) / 16;
		const deps = fake(frame, (ms) => [frame(ms) / 6000]);
		expect((await probeTelemetrySource(deps)).result).toBe('replay');
	});

	it('a frame that never holds still is unsettled, not live', async () => {
		const frame = (ms: number) => 1000 + ms;
		const deps = fake(frame, (ms) => [frame(ms) / 6000]);
		expect((await probeTelemetrySource(deps)).result).toBe('unsettled');
	});

	it('cars entering or leaving the world are ignored', async () => {
		const deps = fake(
			() => 100,
			(ms) => [ms === 0 ? -1 : 0.4, 0.2]
		);
		expect((await probeTelemetrySource(deps)).result).toBe('replay');
	});

	it('no telemetry, and aborts', async () => {
		expect(
			(
				await probeTelemetrySource(
					fake(
						() => null,
						() => null
					)
				)
			).result
		).toBe('no-telemetry');
		expect(
			(
				await probeTelemetrySource(
					fake(
						() => 1,
						() => [0.1]
					),
					{ aborted: true }
				)
			).result
		).toBe('aborted');
	});
});
