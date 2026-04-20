'use strict';

// ---------------------------------------------------------------------------
// Daily-bucket rate limiter backed by SQLite.
// ---------------------------------------------------------------------------
// Bucket key is the UTC calendar day (YYYY-MM-DD). `canSubmit` is a pure
// read; `increment` is an upsert. Both accept an optional `now` (epoch ms)
// so tests can pin the clock without mocking Date. This matches the query
// shape from 02-RESEARCH.md §"Rate-limit: daily bucket in SQLite".
// ---------------------------------------------------------------------------

import { getDb } from './db.js';

function bucketOf(nowMs) {
	// ISO-8601 date portion in UTC — stable across DST and timezones.
	return new Date(nowMs).toISOString().slice(0, 10);
}

function nextUtcMidnightIso(nowMs) {
	const d = new Date(nowMs + 86_400_000);
	d.setUTCHours(0, 0, 0, 0);
	return d.toISOString();
}

// ---------------------------------------------------------------------------
// canSubmit — read-only check against the current UTC day's bucket.
// ---------------------------------------------------------------------------
// Returns `{ ok: true }` when the user's count for today is strictly below
// `cap`, otherwise `{ ok: false, resetAt }` where `resetAt` is ISO-8601
// UTC midnight of the next day — the earliest moment the user can try again.
export function canSubmit(userId, cap, now = Date.now()) {
	const row = getDb()
		.prepare('SELECT count FROM rate_limits WHERE user_id = ? AND bucket_date = ?')
		.get(String(userId), bucketOf(now));
	const count = row?.count ?? 0;
	if (count >= cap) {
		return { ok: false, resetAt: nextUtcMidnightIso(now) };
	}
	return { ok: true };
}

// ---------------------------------------------------------------------------
// increment — upsert the current UTC day's bucket for this user.
// ---------------------------------------------------------------------------
// Uses SQLite `ON CONFLICT DO UPDATE` so the very first submission inserts
// a row with count=1, and subsequent submissions atomically bump the count.
export function increment(userId, now = Date.now()) {
	getDb()
		.prepare(`
			INSERT INTO rate_limits (user_id, bucket_date, count) VALUES (?, ?, 1)
			ON CONFLICT(user_id, bucket_date) DO UPDATE SET count = count + 1
		`)
		.run(String(userId), bucketOf(now));
}
