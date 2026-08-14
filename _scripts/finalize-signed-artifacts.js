'use strict';

// Prepares signed executables for release upload. Runs in release.yml after
// the SignPath-signed executables have been copied back over build/, and
// before anything is uploaded:
//
//   1. Renames every top-level .exe to the dash-separated name the release
//      assets use (see githubAssetName for why the name is load-bearing).
//   2. Rebuilds the .blockmap and rewrites latest.yml's sha512/size from the
//      SIGNED bytes — the values electron-builder wrote describe the unsigned
//      build, and electron-updater refuses a download whose hash mismatches.
//
// Usage: node _scripts/finalize-signed-artifacts.js [dir]   (default: build)
//
// Idempotent: re-running renames nothing and recomputes the same hashes, so a
// re-run of the workflow's upload steps is safe.

const fs = require('fs');
const path = require('path');
const { githubAssetName, patchUpdateManifest } = require('./sign-helpers.js');
// Deliberately the SAME implementation electron-builder used at package time
// (reached through its internals, so pinned by the electron-builder version in
// package-lock). It streams the file, writes the compressed blockmap, and
// returns the { sha512, size } of the signed bytes in one pass.
const {
	buildBlockMap,
} = require('app-builder-lib/out/targets/blockmap/blockmap');

async function main() {
	const dir = process.argv[2] || 'build';
	const manifestPath = path.join(dir, 'latest.yml');
	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			`${manifestPath} not found — electron-builder did not produce an update manifest, so there is nothing safe to upload.`
		);
	}

	// Rename first, so blockmap regeneration and manifest patching only ever
	// see the names the release will actually serve.
	for (const name of fs.readdirSync(dir)) {
		if (!name.endsWith('.exe')) {
			continue;
		}
		const sanitized = githubAssetName(name);
		if (sanitized !== name) {
			fs.renameSync(path.join(dir, name), path.join(dir, sanitized));
			console.log(`renamed: ${name} -> ${sanitized}`);
		}
	}

	// Every existing blockmap describes unsigned bytes; drop them all and
	// rebuild only what the manifest actually references.
	for (const name of fs.readdirSync(dir)) {
		if (name.endsWith('.blockmap')) {
			fs.unlinkSync(path.join(dir, name));
		}
	}

	const yaml = require('js-yaml');
	const manifestText = fs.readFileSync(manifestPath, 'utf8');
	const manifest = yaml.load(manifestText);
	const hashesByUrl = {};
	for (const entry of manifest.files || []) {
		const file = path.join(dir, entry.url);
		if (!fs.existsSync(file)) {
			throw new Error(
				`latest.yml lists ${entry.url} but ${file} does not exist.`
			);
		}
		hashesByUrl[entry.url] = await buildBlockMap(
			file,
			'gzip',
			`${file}.blockmap`
		);
		console.log(
			`hashed:  ${entry.url} (${hashesByUrl[entry.url].size} bytes)`
		);
	}

	fs.writeFileSync(
		manifestPath,
		patchUpdateManifest(manifestText, hashesByUrl)
	);
	console.log(`patched: ${manifestPath}`);
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
