'use strict';

jest.mock('../config.js', () => {
	const stub = { logDir: '', logLevel: 'info' };
	return { __esModule: true, default: stub };
});

import { getDb, closeDb } from './db.js';
import * as snap from './reactionSnapshots.js';

beforeEach(() => {
	getDb({ path: ':memory:' });
});

afterEach(() => {
	closeDb();
});

// ---------------------------------------------------------------------------
// getSnapshot / setSnapshot
// ---------------------------------------------------------------------------
describe('reactionSnapshots', () => {
	test('getSnapshot returns null when the table is empty', () => {
		expect(snap.getSnapshot(1)).toBeNull();
	});

	test('setSnapshot then getSnapshot round-trips', () => {
		snap.setSnapshot(1, 7, 1700000000000);
		expect(snap.getSnapshot(1)).toMatchObject({
			issue_number: 1,
			vote_count: 7,
			updated_at: 1700000000000
		});
	});

	test('setSnapshot upserts existing row — last write wins', () => {
		snap.setSnapshot(1, 7, 1000);
		snap.setSnapshot(1, 12, 2000);
		expect(snap.getSnapshot(1)).toMatchObject({ vote_count: 12, updated_at: 2000 });
	});

	test('snapshots for different issues are independent', () => {
		snap.setSnapshot(1, 7, 1000);
		snap.setSnapshot(2, 3, 2000);
		expect(snap.getSnapshot(1).vote_count).toBe(7);
		expect(snap.getSnapshot(2).vote_count).toBe(3);
	});
});
