'use strict';

// ---------------------------------------------------------------------------
// Replay protection for GitHub webhook deliveries.
// ---------------------------------------------------------------------------
// GitHub stamps each delivery with a unique UUID in the `X-GitHub-Delivery`
// header. GitHub also retries failed deliveries — sometimes aggressively —
// so the webhook endpoint MUST be idempotent. Rather than trusting our own
// 2xx/5xx contract to the letter, we record every accepted delivery UUID
// and reject any reappearance inside a 5-minute window. After 5 minutes a
// legitimate retry would be indistinguishable from a replay attack, so we
// let it through.
//
// The `webhook_deliveries` table (created in Plan 02-03's initSchema) stores
// `(delivery_id PRIMARY KEY, received_at INTEGER)`. Writes use UPSERT so a
// genuine replay attempt cannot cause a PRIMARY-KEY-violation crash.
//
// `pruneOlderThan` is exported so a future scheduled-maintenance task can
// drop stale rows; the table is tiny (~12 bytes/row) so this is low-priority
// and can run once a day.
// ---------------------------------------------------------------------------

import { getDb } from '../storage/db.js';

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function isReplay(deliveryId, now = Date.now()) {
	const row = getDb()
		.prepare(
			'SELECT received_at FROM webhook_deliveries WHERE delivery_id = ?'
		)
		.get(String(deliveryId));
	if (!row) {
		return false;
	}
	return now - row.received_at < WINDOW_MS;
}

export function recordDelivery(deliveryId, now = Date.now()) {
	getDb()
		.prepare(`
			INSERT INTO webhook_deliveries (delivery_id, received_at) VALUES (?, ?)
			ON CONFLICT(delivery_id) DO UPDATE SET
				received_at = excluded.received_at
		`)
		.run(String(deliveryId), now);
}

export function pruneOlderThan(cutoffMs) {
	return getDb()
		.prepare('DELETE FROM webhook_deliveries WHERE received_at < ?')
		.run(cutoffMs).changes;
}
