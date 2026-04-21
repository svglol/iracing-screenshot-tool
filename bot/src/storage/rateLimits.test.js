'use strict';

jest.mock('../config.js', () => {
	const stub = { logDir: '', logLevel: 'info' };
	return { __esModule: true, default: stub };
});

import { getDb, closeDb } from './db.js';
import * as rl from './rateLimits.js';

beforeEach(() => {
	getDb({ path: ':memory:' });
});

afterEach(() => {
	closeDb();
});

// Fixed noon UTC on 2026-04-19 — timezone-stable reference point for tests.
const NOW = Date.UTC(2026, 3, 19, 12, 0, 0);

// ---------------------------------------------------------------------------
// canSubmit + increment
// ---------------------------------------------------------------------------
describe('rateLimits', () => {
	test('empty bucket allows submission', () => {
		expect(rl.canSubmit('u1', 3, NOW)).toEqual({ ok: true });
	});

	test('increments and blocks the 4th submission when cap is 3', () => {
		rl.increment('u1', NOW);
		rl.increment('u1', NOW);
		rl.increment('u1', NOW);
		const r = rl.canSubmit('u1', 3, NOW);
		expect(r.ok).toBe(false);
		expect(r.resetAt).toBe('2026-04-20T00:00:00.000Z');
	});

	test('resets on next UTC day', () => {
		rl.increment('u1', NOW);
		rl.increment('u1', NOW);
		rl.increment('u1', NOW);
		const tomorrow = NOW + 86_400_000;
		expect(rl.canSubmit('u1', 3, tomorrow)).toEqual({ ok: true });
	});

	test('per-user isolation — one user hitting cap does not block others', () => {
		rl.increment('u1', NOW);
		rl.increment('u1', NOW);
		rl.increment('u1', NOW);
		expect(rl.canSubmit('u2', 3, NOW)).toEqual({ ok: true });
	});

	test('cap of 1 allows 1, blocks 2nd', () => {
		expect(rl.canSubmit('u3', 1, NOW).ok).toBe(true);
		rl.increment('u3', NOW);
		expect(rl.canSubmit('u3', 1, NOW).ok).toBe(false);
	});

	test('resetAt is ISO-8601 UTC midnight of the next day', () => {
		rl.increment('u1', NOW);
		const r = rl.canSubmit('u1', 1, NOW);
		expect(r.ok).toBe(false);
		expect(r.resetAt).toBe('2026-04-20T00:00:00.000Z');
	});

	test('late-evening UTC still buckets by the current UTC day', () => {
		// 23:59 UTC on 2026-04-19 — increment lands in 2026-04-19 bucket.
		const lateEvening = Date.UTC(2026, 3, 19, 23, 59, 0);
		rl.increment('u4', lateEvening);
		// 00:01 UTC on 2026-04-20 — different bucket, so the user is fresh.
		const justAfterMidnight = Date.UTC(2026, 3, 20, 0, 1, 0);
		expect(rl.canSubmit('u4', 1, justAfterMidnight).ok).toBe(true);
	});
});
