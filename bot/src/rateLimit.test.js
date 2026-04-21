'use strict';

// Mock both config and the underlying storage module. The facade is a pure
// thin wrapper — it MUST delegate to storage.rateLimits and MUST NOT invent
// its own counting logic. The mocks let us assert the exact call shape.
jest.mock('./config.js', () => ({
	__esModule: true,
	default: { rateLimitPerDay: 3 }
}));

jest.mock('./storage/rateLimits.js', () => ({
	__esModule: true,
	canSubmit: jest.fn(),
	increment: jest.fn()
}));

import { check, record } from './rateLimit.js';
import * as store from './storage/rateLimits.js';

afterEach(() => {
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// check — delegates to storage.canSubmit with config.rateLimitPerDay
// ---------------------------------------------------------------------------
describe('rateLimit.check', () => {
	test('calls storage.canSubmit with userId and config cap', () => {
		store.canSubmit.mockReturnValue({ ok: true });
		const result = check('u1');
		expect(store.canSubmit).toHaveBeenCalledTimes(1);
		expect(store.canSubmit).toHaveBeenCalledWith('u1', 3);
		expect(result).toEqual({ ok: true });
	});

	test('propagates resetAt when storage reports blocked', () => {
		store.canSubmit.mockReturnValue({
			ok: false,
			resetAt: '2026-04-20T00:00:00.000Z'
		});
		expect(check('u1')).toEqual({ ok: false, resetAt: '2026-04-20T00:00:00.000Z' });
	});

	test('does not call increment', () => {
		store.canSubmit.mockReturnValue({ ok: true });
		check('u1');
		expect(store.increment).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// record — delegates to storage.increment
// ---------------------------------------------------------------------------
describe('rateLimit.record', () => {
	test('calls storage.increment with userId', () => {
		record('u2');
		expect(store.increment).toHaveBeenCalledTimes(1);
		expect(store.increment).toHaveBeenCalledWith('u2');
	});

	test('does not call canSubmit', () => {
		record('u2');
		expect(store.canSubmit).not.toHaveBeenCalled();
	});
});
