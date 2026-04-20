'use strict';

// ---------------------------------------------------------------------------
// deliveries — replay protection via webhook_deliveries table (RESEARCH.md
// §"Known Threat Patterns"). Rejects any delivery UUID seen in the last
// 5 minutes; accepts anything older as a fresh delivery.
// ---------------------------------------------------------------------------

jest.mock('../config.js', () => ({ __esModule: true, default: {} }));

import { getDb, closeDb } from '../storage/db.js';
import {
	isReplay,
	recordDelivery,
	pruneOlderThan
} from './deliveries.js';

beforeEach(() => {
	getDb({ path: ':memory:' });
});

afterEach(() => {
	closeDb();
});

describe('webhook deliveries', () => {
	test('unseen delivery is not a replay', () => {
		expect(isReplay('uuid-1')).toBe(false);
	});

	test('recent record is a replay', () => {
		const now = 1_700_000_000_000;
		recordDelivery('uuid-1', now);
		expect(isReplay('uuid-1', now + 60_000)).toBe(true);
	});

	test('old record is NOT a replay (outside 5-min window)', () => {
		const now = 1_700_000_000_000;
		recordDelivery('uuid-1', now);
		expect(isReplay('uuid-1', now + 10 * 60_000)).toBe(false);
	});

	test('pruneOlderThan deletes old rows', () => {
		recordDelivery('a', 1000);
		recordDelivery('b', 2000);
		expect(pruneOlderThan(1500)).toBe(1);
	});

	test('recordDelivery is idempotent (re-record updates timestamp)', () => {
		recordDelivery('uuid-1', 1000);
		recordDelivery('uuid-1', 2000);
		// Second call replaces the timestamp — still one row, now at 2000.
		expect(isReplay('uuid-1', 2000 + 60_000)).toBe(true);
		expect(isReplay('uuid-1', 2000 + 10 * 60_000)).toBe(false);
	});
});
