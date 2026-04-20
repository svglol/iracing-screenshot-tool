'use strict';

// ---------------------------------------------------------------------------
// CRUD for the issue_mapping table (Discord msg ↔ GitHub issue).
// ---------------------------------------------------------------------------
// Every function goes through `getDb()` so a single shared handle is reused.
// Prepared statements are created on each call because `better-sqlite3`
// caches them internally and the call-site overhead is negligible compared
// to a round-trip. Row shape is normalised (id fields coerced to string)
// because Discord snowflake IDs sometimes arrive as BigInt-adjacent numbers.
// ---------------------------------------------------------------------------

import { getDb } from './db.js';

export function insert(row) {
	const db = getDb();
	db.prepare(`
		INSERT INTO issue_mapping (
			issue_number, issue_type, reporter_discord_id,
			discord_channel_id, discord_message_id, created_at
		) VALUES (
			@issue_number, @issue_type, @reporter_discord_id,
			@discord_channel_id, @discord_message_id, @created_at
		)
	`).run({
		issue_number: row.issue_number,
		issue_type: row.issue_type,
		reporter_discord_id: String(row.reporter_discord_id),
		discord_channel_id: String(row.discord_channel_id),
		discord_message_id: String(row.discord_message_id),
		created_at: row.created_at ?? Date.now()
	});
}

export function findByIssueNumber(n) {
	return (
		getDb()
			.prepare('SELECT * FROM issue_mapping WHERE issue_number = ?')
			.get(n) ?? null
	);
}

export function findByMessageId(mid) {
	return (
		getDb()
			.prepare('SELECT * FROM issue_mapping WHERE discord_message_id = ?')
			.get(String(mid)) ?? null
	);
}

export function listByReporter(uid) {
	return getDb()
		.prepare(
			'SELECT * FROM issue_mapping WHERE reporter_discord_id = ? ORDER BY created_at DESC'
		)
		.all(String(uid));
}

export function deleteByIssueNumber(n) {
	return getDb()
		.prepare('DELETE FROM issue_mapping WHERE issue_number = ?')
		.run(n).changes;
}
