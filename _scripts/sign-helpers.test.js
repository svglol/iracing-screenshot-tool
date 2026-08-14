'use strict';

import yaml from 'js-yaml';
import { githubAssetName, patchUpdateManifest } from './sign-helpers.js';

describe('githubAssetName', () => {
	test('replaces spaces with dashes, matching the GitHub publisher', () => {
		expect(githubAssetName('iRacing Screenshot Tool Setup 3.4.0.exe')).toBe(
			'iRacing-Screenshot-Tool-Setup-3.4.0.exe'
		);
	});

	test('leaves an already-sanitized name alone', () => {
		expect(githubAssetName('latest.yml')).toBe('latest.yml');
	});
});

// The shape electron-builder writes for this project's nsis target: one files
// entry plus the legacy top-level path/sha512 pair pointing at the same file.
const MANIFEST = [
	'version: 3.4.0',
	'files:',
	'  - url: iRacing-Screenshot-Tool-Setup-3.4.0.exe',
	'    sha512: OLDHASH==',
	'    size: 111',
	'path: iRacing-Screenshot-Tool-Setup-3.4.0.exe',
	'sha512: OLDHASH==',
	"releaseDate: '2026-08-14T00:00:00.000Z'",
	'',
].join('\n');

describe('patchUpdateManifest', () => {
	const hashes = {
		'iRacing-Screenshot-Tool-Setup-3.4.0.exe': {
			sha512: 'NEWHASH==',
			size: 222,
		},
	};

	test('replaces sha512 and size in files entries and the top-level pair', () => {
		const patched = yaml.load(patchUpdateManifest(MANIFEST, hashes));
		expect(patched.files[0].sha512).toBe('NEWHASH==');
		expect(patched.files[0].size).toBe(222);
		expect(patched.sha512).toBe('NEWHASH==');
	});

	test('preserves everything it does not own', () => {
		const patched = yaml.load(patchUpdateManifest(MANIFEST, hashes));
		expect(patched.version).toBe('3.4.0');
		expect(patched.path).toBe('iRacing-Screenshot-Tool-Setup-3.4.0.exe');
		expect(patched.releaseDate).toBe('2026-08-14T00:00:00.000Z');
	});

	// A file the manifest lists but signing did not cover is the silent
	// auto-update breaker; it must stop the release, not ship half-patched.
	test('throws when a listed file has no signed hash', () => {
		expect(() => patchUpdateManifest(MANIFEST, {})).toThrow(/no signed hash/);
	});

	test('throws on a manifest with no files list rather than "patching" it', () => {
		expect(() => patchUpdateManifest('version: 3.4.0\n', hashes)).toThrow(
			/no files list/
		);
	});
});
