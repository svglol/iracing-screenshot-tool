import { describe, expect, it, vi } from 'vitest';
import {
	ROOMIER_BY_METERS,
	isClear,
	measureClearance,
	roomier,
	type Clearance,
} from './clearance';
import type { GridTelemetry } from './roster';

// clearance → position-search → replay-control creates a logger on import.
vi.mock('../../utilities/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}),
}));

const TRACK = 5000; // metres

function telemetry(
	cars: Record<number, { pct: number; surface?: number; pit?: boolean }>
): GridTelemetry {
	const lapDistPct = new Array(64).fill(-1);
	const trackSurface = new Array(64).fill(-1);
	const onPitRoad = new Array(64).fill(false);
	for (const [idx, car] of Object.entries(cars)) {
		lapDistPct[Number(idx)] = car.pct;
		trackSurface[Number(idx)] = car.surface ?? 3;
		onPitRoad[Number(idx)] = car.pit === true;
	}
	return {
		camCarIdx: null,
		lapDistPct,
		trackSurface,
		racePosition: null,
		lapCompleted: null,
		onPitRoad,
	};
}

describe('measureClearance', () => {
	it('finds the nearest other car either way, in metres along the track', () => {
		const c = measureClearance(
			telemetry({
				1: { pct: 0.5 },
				2: { pct: 0.5 + 30 / TRACK }, // 30 m ahead
				3: { pct: 0.5 - 12 / TRACK }, // 12 m behind
			}),
			1,
			TRACK
		);
		expect(c.nearestCarIdx).toBe(3);
		expect(c.gapMeters).toBeCloseTo(12, 6);
		expect(c.nearestOffsetMeters).toBeCloseTo(-12, 6);
	});

	it('measures across the start/finish line', () => {
		const c = measureClearance(
			telemetry({ 1: { pct: 0.999 }, 2: { pct: 0.001 } }),
			1,
			TRACK
		);
		expect(c.gapMeters).toBeCloseTo(0.002 * TRACK, 6);
		expect(c.nearestOffsetMeters).toBeGreaterThan(0);
	});

	it('ignores cars off the world and cars on the other side of the pit wall', () => {
		const c = measureClearance(
			telemetry({
				1: { pct: 0.5 },
				2: { pct: 0.5, surface: -1 }, // towed
				3: { pct: 0.5, pit: true }, // in the pit lane beside it
				4: { pct: 0.6 },
			}),
			1,
			TRACK
		);
		expect(c.nearestCarIdx).toBe(4);
	});

	it('compares a car on pit road with the other cars on pit road', () => {
		const c = measureClearance(
			telemetry({
				1: { pct: 0.5, pit: true },
				2: { pct: 0.5 + 1 / TRACK },
				3: { pct: 0.5 + 8 / TRACK, pit: true },
			}),
			1,
			TRACK
		);
		expect(c.nearestCarIdx).toBe(3);
	});

	it('reports no gap when the car is alone or not on track', () => {
		expect(
			measureClearance(telemetry({ 1: { pct: 0.5 } }), 1, TRACK).gapMeters
		).toBeNull();
		expect(
			measureClearance(telemetry({ 2: { pct: 0.5 } }), 1, TRACK).gapMeters
		).toBeNull();
	});
});

describe('isClear and roomier', () => {
	const gap = (gapMeters: number | null): Clearance => ({
		gapMeters,
		nearestCarIdx: gapMeters === null ? null : 2,
		nearestOffsetMeters: gapMeters,
	});

	it('is clear at or beyond the minimum, alone, or with the check off', () => {
		expect(isClear(gap(20), 20)).toBe(true);
		expect(isClear(gap(19.9), 20)).toBe(false);
		expect(isClear(gap(null), 20)).toBe(true);
		expect(isClear(gap(1), 0)).toBe(true);
	});

	it('prefers more room only by a real margin', () => {
		expect(roomier(gap(10), gap(5))).toBe(true);
		expect(roomier(gap(5 + ROOMIER_BY_METERS / 2), gap(5))).toBe(false);
		expect(roomier(gap(null), gap(50))).toBe(true);
		expect(roomier(gap(50), gap(null))).toBe(false);
	});
});
