'use strict';

// ---------------------------------------------------------------------------
// SQLite database bootstrap + schema migrations for the bot.
// ---------------------------------------------------------------------------
// Uses better-sqlite3 (synchronous by design — matches RESEARCH.md §Pitfall 5
// recommendation for Node 24 compatibility). A single cached instance backs
// every domain module (mappings, rateLimits, reactionSnapshots, webhook
// deliveries). `getDb()` is a singleton factory; `closeDb()` is exposed so
// tests can tear down and reopen with `:memory:`.
//
// Schema is declared inline in `initSchema` and wrapped in `IF NOT EXISTS`
// so a second boot (or a test that calls init twice) is a no-op. Future
// migrations should append new `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX
// IF NOT EXISTS` / `ALTER TABLE` statements — they run idempotently.
// ---------------------------------------------------------------------------

// Bare `fs` / `path` specifiers (not `node:fs` / `node:path`) for Jest 25
// resolver compatibility — same rationale as bot/src/logger.js.
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createLogger } from '../logger.js';

const log = createLogger('storage:db');

let _db = null;
let _dbPath = null;

function resolveDataDir() {
	return process.env.BOT_DATA_DIR || path.join(process.cwd(), 'data');
}

// ---------------------------------------------------------------------------
// getDb — cached singleton.
// ---------------------------------------------------------------------------
// Accepts an `opts.path` override so tests can open `:memory:` without
// touching disk. On first call, resolves the file path, ensures the parent
// directory exists, opens the handle, sets pragmas, and runs schema init.
// Subsequent calls return the cached instance regardless of opts.
export function getDb(opts = {}) {
	if (_db) {
		return _db;
	}
	const target = opts.path || path.join(resolveDataDir(), 'bot.db');
	if (target !== ':memory:') {
		fs.mkdirSync(path.dirname(target), { recursive: true });
	}
	_db = new Database(target);
	_dbPath = target;
	_db.pragma('journal_mode = WAL');
	_db.pragma('foreign_keys = ON');
	_db.pragma('synchronous = NORMAL');
	initSchema(_db);
	log.info('Database opened', { path: target });
	return _db;
}

// ---------------------------------------------------------------------------
// closeDb — release the handle so the next getDb() re-opens fresh.
// ---------------------------------------------------------------------------
export function closeDb() {
	if (_db) {
		try {
			_db.close();
		} catch {
			// never crash on close
		}
		_db = null;
		_dbPath = null;
	}
}

// ---------------------------------------------------------------------------
// initSchema — idempotent CREATE TABLE / CREATE INDEX for every domain table.
// ---------------------------------------------------------------------------
// Safe to call on every boot. `IF NOT EXISTS` makes it a no-op after the
// first run. Re-exported so tests can call it explicitly on a fresh handle.
export function initSchema(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS issue_mapping (
			issue_number        INTEGER PRIMARY KEY,
			issue_type          TEXT NOT NULL CHECK(issue_type IN ('bug','feature')),
			reporter_discord_id TEXT NOT NULL,
			discord_channel_id  TEXT NOT NULL,
			discord_message_id  TEXT NOT NULL UNIQUE,
			created_at          INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_mapping_reporter ON issue_mapping(reporter_discord_id);
		CREATE INDEX IF NOT EXISTS idx_mapping_message  ON issue_mapping(discord_message_id);

		CREATE TABLE IF NOT EXISTS rate_limits (
			user_id     TEXT NOT NULL,
			bucket_date TEXT NOT NULL,
			count       INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (user_id, bucket_date)
		);

		CREATE TABLE IF NOT EXISTS reaction_snapshots (
			issue_number INTEGER PRIMARY KEY,
			vote_count   INTEGER NOT NULL,
			updated_at   INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS webhook_deliveries (
			delivery_id TEXT PRIMARY KEY,
			received_at INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_webhook_received ON webhook_deliveries(received_at);
	`);
}
