'use strict';

// Pure helpers for the post-signing step of the release workflow, extracted so
// they can be unit-tested (sign-helpers.test.js) without touching the
// filesystem. finalize-signed-artifacts.js is the CLI that applies them.

// js-yaml rides along with electron-builder AND electron-updater — the very
// library that will parse the manifest this code rewrites, so a round-trip
// through it cannot produce YAML the updater chokes on.
const yaml = require('js-yaml');

// The asset name a file will be released under.
//
// electron-builder's GitHub publisher uploads assets with spaces replaced by
// dashes, and writes that PRE-SANITIZED name into latest.yml's `url` — every
// shipped release has `iRacing-Screenshot-Tool-Setup-X.Y.Z.exe`. Uploading the
// space-named file from disk via `gh release upload` instead would let GitHub
// apply its own sanitization, which is DOTS ("iRacing.Screenshot.Tool...", as
// v3.1.1 shipped) — a name latest.yml does not point at, so every update check
// would 404. Artifacts are therefore renamed to this before upload.
function githubAssetName(fileName) {
	return fileName.replace(/ /g, '-');
}

// Rewrite latest.yml's hashes and sizes from the map `hashesByUrl`
// (url -> { sha512, size }), covering both the `files` entries and the
// legacy top-level `path`/`sha512` pair.
//
// Signing appends a certificate to the executable, so every hash and size
// electron-builder computed at package time describes bytes that no longer
// exist. electron-updater verifies the downloaded installer against `sha512`
// before running it, which turns a stale manifest into an update that
// downloads and is then refused — strictly worse than no update at all.
//
// Throws rather than skips when a manifest entry has no replacement hash: a
// silently half-patched manifest is exactly the failure mode this exists to
// prevent.
function patchUpdateManifest(yamlText, hashesByUrl) {
	const manifest = yaml.load(yamlText);
	if (!manifest || !Array.isArray(manifest.files) || !manifest.files.length) {
		throw new Error('latest.yml has no files list — refusing to patch it.');
	}

	for (const entry of manifest.files) {
		const replacement = hashesByUrl[entry.url];
		if (!replacement) {
			throw new Error(
				`latest.yml lists ${entry.url} but no signed hash was computed for it.`
			);
		}
		entry.sha512 = replacement.sha512;
		entry.size = replacement.size;
	}

	if (manifest.path) {
		const replacement = hashesByUrl[manifest.path];
		if (!replacement) {
			throw new Error(
				`latest.yml's top-level path ${manifest.path} has no signed hash.`
			);
		}
		manifest.sha512 = replacement.sha512;
	}

	// lineWidth -1: never wrap — a folded base64 sha512 is still valid YAML but
	// needless churn to diff against electron-builder's unwrapped output.
	return yaml.dump(manifest, { lineWidth: -1 });
}

module.exports = { githubAssetName, patchUpdateManifest };
