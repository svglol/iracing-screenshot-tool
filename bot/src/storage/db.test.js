'use strict';

// Mock config so db.js → logger.js → config.js chain does not read process.env.
jest.mock('../config.js', () => {
	const stub = { logDir: '', logLevel: 'info' };
	return { __esModule: true, default: stub };
});

import { getDb, closeDb, initSchema } from './db.js';

afterEach(() => {
	closeDb();
});

// ---------------------------------------------------------------------------
// initSchema
// ---------------------------------------------------------------------------
describe('initSchema', () => {
	test('creates all four tables idempotently', () => {
		const db = getDb({ path: ':memory:' });
		initSchema(db);
		initSchema(db); // second call must not throw (IF NOT EXISTS)
		const rows = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
			.all()
			.map((r) => r.name);
		expect(rows).toEqual(
			expect.arrayContaining([
				'issue_mapping',
				'rate_limits',
				'reaction_snapshots',
				'webhook_deliveries'
			])
		);
	});

	test('issue_mapping has expected indexes', () => {
		const db = getDb({ path: ':memory:' });
		const indexNames = db
			.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='issue_mapping'")
			.all()
			.map((r) => r.name);
		expect(indexNames).toEqual(
			expect.arrayContaining(['idx_mapping_reporter', 'idx_mapping_message'])
		);
	});
});

// ---------------------------------------------------------------------------
// getDb / closeDb
// ---------------------------------------------------------------------------
describe('getDb / closeDb', () => {
	test('getDb returns a singleton — second call reuses the instance', () => {
		const a = getDb({ path: ':memory:' });
		const b = getDb();
		expect(a).toBe(b);
	});

	test('closeDb lets getDb re-open a fresh handle', () => {
		const a = getDb({ path: ':memory:' });
		closeDb();
		const b = getDb({ path: ':memory:' });
		expect(a).not.toBe(b);
	});

	test('pragma journal_mode is queryable (returns a string)', () => {
		const db = getDb({ path: ':memory:' });
		expect(typeof db.pragma('journal_mode', { simple: true })).toBe('string');
	});
});
