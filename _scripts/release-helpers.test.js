'use strict';

import { resolveRemotes, parseReleaseArgs } from './release-helpers.js';

describe('resolveRemotes', () => {
	test('defaults to origin when none requested and origin exists', () => {
		expect(resolveRemotes([], ['origin', 'fork'])).toEqual(['origin']);
	});

	test('returns the requested remote when it exists', () => {
		expect(resolveRemotes(['fork'], ['origin', 'fork'])).toEqual(['fork']);
	});

	test('throws on an unknown requested remote (no silent fan-out)', () => {
		expect(() => resolveRemotes(['bogus'], ['origin'])).toThrow(
			/Unknown remote/
		);
	});

	test("throws when no origin exists and none requested", () => {
		expect(() => resolveRemotes([], ['fork'])).toThrow(/No 'origin'/);
	});

	test('de-dups requested remotes preserving order', () => {
		expect(resolveRemotes(['fork', 'fork', 'origin'], ['origin', 'fork'])).toEqual([
			'fork',
			'origin',
		]);
	});
});

describe('parseReleaseArgs', () => {
	test('reads the bump positional', () => {
		expect(parseReleaseArgs(['patch'])).toEqual({
			bump: 'patch',
			requestedRemotes: [],
		});
	});

	test('does not mistake a --remote value for the bump', () => {
		// `--remote origin patch` must pick `patch`, not `origin`.
		expect(parseReleaseArgs(['--remote', 'origin', 'patch'])).toEqual({
			bump: 'patch',
			requestedRemotes: ['origin'],
		});
	});

	test('collects --remote=<name> and comma-splits', () => {
		expect(parseReleaseArgs(['minor', '--remote=origin,fork'])).toEqual({
			bump: 'minor',
			requestedRemotes: ['origin', 'fork'],
		});
	});

	test('supports repeated --remote flags', () => {
		expect(
			parseReleaseArgs(['major', '--remote', 'origin', '--remote', 'fork'])
		).toEqual({ bump: 'major', requestedRemotes: ['origin', 'fork'] });
	});
});
