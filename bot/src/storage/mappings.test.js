'use strict';

jest.mock('../config.js', () => {
	const stub = { logDir: '', logLevel: 'info' };
	return { __esModule: true, default: stub };
});

import { getDb, closeDb } from './db.js';
import * as mappings from './mappings.js';

beforeEach(() => {
	getDb({ path: ':memory:' });
});

afterEach(() => {
	closeDb();
});

const fixture = (n, overrides = {}) => ({
	issue_number: n,
	issue_type: 'bug',
	reporter_discord_id: 'u1',
	discord_channel_id: 'c1',
	discord_message_id: `m${n}`,
	created_at: 1700000000000 + n,
	...overrides
});

// ---------------------------------------------------------------------------
// insert + finders
// ---------------------------------------------------------------------------
describe('mappings', () => {
	test('insert + findByIssueNumber round-trips', () => {
		mappings.insert(fixture(1));
		const row = mappings.findByIssueNumber(1);
		expect(row).toMatchObject({
			issue_number: 1,
			issue_type: 'bug',
			reporter_discord_id: 'u1',
			discord_channel_id: 'c1',
			discord_message_id: 'm1'
		});
	});

	test('findByMessageId resolves by discord_message_id', () => {
		mappings.insert(fixture(2));
		const row = mappings.findByMessageId('m2');
		expect(row).not.toBeNull();
		expect(row.issue_number).toBe(2);
	});

	test('findByIssueNumber returns null for missing', () => {
		expect(mappings.findByIssueNumber(999)).toBeNull();
	});

	test('findByMessageId returns null for missing', () => {
		expect(mappings.findByMessageId('does-not-exist')).toBeNull();
	});

	test('listByReporter returns all rows for a user, newest first', () => {
		mappings.insert(fixture(1));
		mappings.insert(fixture(2));
		mappings.insert(fixture(3, { reporter_discord_id: 'u2' }));
		const rows = mappings.listByReporter('u1');
		expect(rows.map((r) => r.issue_number)).toEqual([2, 1]);
	});

	test('listByReporter returns empty array for unknown reporter', () => {
		mappings.insert(fixture(1));
		expect(mappings.listByReporter('nobody')).toEqual([]);
	});

	test('deleteByIssueNumber returns 1 on delete, 0 on miss', () => {
		mappings.insert(fixture(3));
		expect(mappings.deleteByIssueNumber(3)).toBe(1);
		expect(mappings.deleteByIssueNumber(3)).toBe(0);
	});

	test('duplicate issue_number rejected by PRIMARY KEY', () => {
		mappings.insert(fixture(4));
		expect(() => mappings.insert(fixture(4, { discord_message_id: 'different' }))).toThrow();
	});

	test('duplicate discord_message_id rejected by UNIQUE constraint', () => {
		mappings.insert(fixture(5));
		expect(() =>
			mappings.insert(fixture(6, { discord_message_id: 'm5' }))
		).toThrow();
	});

	test('issue_type CHECK constraint rejects arbitrary values', () => {
		expect(() =>
			mappings.insert(fixture(7, { issue_type: 'other' }))
		).toThrow();
	});
});
