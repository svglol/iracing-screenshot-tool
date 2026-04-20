'use strict';

// Mock config.js so the permission gate reads synthetic owner/role IDs
// and never touches process.env. Matches the pattern from logger.test.js.
jest.mock('./config.js', () => {
	const stub = { discordOwnerId: 'owner-123', discordMaintainerRoleId: 'role-abc' };
	return { __esModule: true, default: stub };
});

import { isOwner, hasMaintainerRole, canTriage } from './permissions.js';

// ---------------------------------------------------------------------------
// isOwner
// ---------------------------------------------------------------------------
describe('isOwner', () => {
	test('matches configured owner id as string', () => {
		expect(isOwner('owner-123')).toBe(true);
	});

	test('does not match a different id', () => {
		expect(isOwner('other')).toBe(false);
	});

	test('rejects null / undefined / empty string', () => {
		expect(isOwner(null)).toBe(false);
		expect(isOwner(undefined)).toBe(false);
		expect(isOwner('')).toBe(false);
	});

	test('does not coerce numeric id that happens to differ', () => {
		expect(isOwner(123)).toBe(false);
		expect(isOwner('123')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// hasMaintainerRole
// ---------------------------------------------------------------------------
describe('hasMaintainerRole', () => {
	test('true when roles.cache has maintainer role id', () => {
		const member = { roles: { cache: new Map([['role-abc', {}]]) } };
		expect(hasMaintainerRole(member)).toBe(true);
	});

	test('false when cache lacks the role', () => {
		const member = { roles: { cache: new Map() } };
		expect(hasMaintainerRole(member)).toBe(false);
	});

	test('false for null / missing roles / missing cache', () => {
		expect(hasMaintainerRole(null)).toBe(false);
		expect(hasMaintainerRole(undefined)).toBe(false);
		expect(hasMaintainerRole({})).toBe(false);
		expect(hasMaintainerRole({ roles: {} })).toBe(false);
		expect(hasMaintainerRole({ roles: { cache: null } })).toBe(false);
	});

	test('false when cache lacks a .has method', () => {
		expect(hasMaintainerRole({ roles: { cache: {} } })).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canTriage
// ---------------------------------------------------------------------------
describe('canTriage', () => {
	test('owner passes even without the maintainer role', () => {
		expect(canTriage({ user: { id: 'owner-123' }, member: null })).toBe(true);
	});

	test('maintainer role passes when user is not the owner', () => {
		expect(
			canTriage({
				user: { id: 'other' },
				member: { roles: { cache: new Map([['role-abc', {}]]) } }
			})
		).toBe(true);
	});

	test('plain user rejected (not owner, no role)', () => {
		expect(
			canTriage({
				user: { id: 'other' },
				member: { roles: { cache: new Map() } }
			})
		).toBe(false);
	});

	test('null / undefined interaction is safe and rejected', () => {
		expect(canTriage(null)).toBe(false);
		expect(canTriage(undefined)).toBe(false);
	});

	test('interaction without user or member is rejected', () => {
		expect(canTriage({})).toBe(false);
	});
});
