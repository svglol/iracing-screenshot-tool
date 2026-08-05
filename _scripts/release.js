'use strict';

// Local half of the release. Validates, tests, bumps, commits, tags and pushes;
// the tag push triggers .github/workflows/release.yml, which builds the
// installer, uploads the artifacts (including latest.yml, which electron-updater
// needs) and publishes the GitHub release.
//
// This script deliberately does NOT build or upload anything. It used to, which
// meant a release depended on whatever was installed on the operator's machine,
// and a mid-run failure could leave package.json bumped but untagged. Everything
// that can fail a validation now runs before the first mutation.

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { resolveRemotes, parseReleaseArgs } = require('./release-helpers');

const PKG_PATH = path.resolve(__dirname, '..', 'package.json');
const ROOT = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
	console.log(`> ${cmd}`);
	return execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function runCapture(cmd) {
	return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(message) {
	console.error(`\n✗ ${message}`);
	process.exit(1);
}

function getRepoSlug(remote) {
	const url = runCapture(`git remote get-url ${remote}`);
	return url
		.replace(/\.git$/, '')
		.replace(/^https?:\/\/github\.com\//, '')
		.replace(/^git@github\.com:/, '');
}

// ---------------------------------------------------------------------------
// 1. Parse arguments
// ---------------------------------------------------------------------------
const { bump, requestedRemotes } = parseReleaseArgs(process.argv.slice(2));
if (!['major', 'minor', 'patch'].includes(bump)) {
	fail(
		'Usage: node _scripts/release.js <major|minor|patch> [--remote <name>]'
	);
}

// ---------------------------------------------------------------------------
// 2. Pre-flight checks
// ---------------------------------------------------------------------------
const status = runCapture('git status --porcelain');
if (status) {
	fail('Working tree is not clean. Commit or stash your changes first.');
}

// Resolve publish target remotes ONCE, up front, so a bad --remote fails fast
// and so we never fan the tag out to every configured remote (e.g. a personal
// fork). Note that every remote receiving the tag whose repo has this workflow
// will run its own release build.
let remotes;
try {
	const availableRemotes = runCapture('git remote')
		.split('\n')
		.filter(Boolean);
	remotes = resolveRemotes(requestedRemotes, availableRemotes);
} catch (error) {
	fail(error.message);
}
console.log(`\n— Publish target remote(s): ${remotes.join(', ')}`);

// ---------------------------------------------------------------------------
// 3. Determine previous tag and the version we are about to cut
// ---------------------------------------------------------------------------
let previousTag = '';
try {
	previousTag = runCapture('git describe --tags --abbrev=0 HEAD');
} catch {
	// No tags exist yet
}

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const oldVersion = pkg.version;
const [major, minor, patch] = oldVersion.split('.').map(Number);

const newVersion =
	bump === 'major'
		? `${major + 1}.0.0`
		: bump === 'minor'
			? `${major}.${minor + 1}.0`
			: `${major}.${minor}.${patch + 1}`;

const tag = `v${newVersion}`;

// ---------------------------------------------------------------------------
// 4. Curated release notes check
// ---------------------------------------------------------------------------
// CI reads RELEASE-NOTES-v${version}.md *from the tagged commit*, so the file
// must already be committed — the clean-tree check above guarantees that if it
// exists at all. Warn here, before anything is mutated, rather than letting CI
// quietly fall back to the raw commit log.
const curatedNotes = `RELEASE-NOTES-${tag}.md`;
if (fs.existsSync(path.join(ROOT, curatedNotes))) {
	console.log(`\n— Curated notes found: ${curatedNotes}`);
} else {
	console.log(
		`\n! No ${curatedNotes} in the working tree.\n` +
			`  The release will use the auto-generated commit log instead.\n` +
			`  Ctrl-C now if you meant to write curated notes first.`
	);
}

// ---------------------------------------------------------------------------
// 5. Run tests
// ---------------------------------------------------------------------------
// Before the bump, so an abort here leaves package.json untouched. CI runs these
// again against the tagged commit; this is the fast local gate.
console.log('\n— Running tests…');
run('npm test');

// ---------------------------------------------------------------------------
// 6. Bump version — first mutation
// ---------------------------------------------------------------------------
console.log(`\n— Bumping version: ${oldVersion} → ${newVersion}`);

pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 4) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// 7. Commit, tag
// ---------------------------------------------------------------------------
console.log(`\n— Committing and tagging ${tag}…`);

try {
	run('git add package.json');
	run(`git commit -m "Release ${tag}"`);
	run(`git tag ${tag}`);
} catch (error) {
	fail(
		`Failed to commit/tag ${tag}: ${error.message}\n` +
			`  package.json may be left bumped — \`git checkout package.json\` before retrying.`
	);
}

// ---------------------------------------------------------------------------
// 8. Show the changelog for the operator's benefit
// ---------------------------------------------------------------------------
const logRange = previousTag ? `${previousTag}..${tag}` : tag;
const changelog = runCapture(
	`git log ${logRange} --pretty=format:"- %s (%h)" --no-merges`
);

console.log('\n— Changelog:');
console.log(changelog || '(no changes)');

// ---------------------------------------------------------------------------
// 9. Push commit + tag — this is what triggers the release build
// ---------------------------------------------------------------------------
const branch = runCapture('git rev-parse --abbrev-ref HEAD');

// Accumulate push failures so the run exits non-zero at the end instead of
// printing a success line over a release that never reached CI.
const publishFailures = [];

for (const remote of remotes) {
	console.log(`\n— Pushing to ${remote}/${branch}…`);
	try {
		run(`git push ${remote} ${branch}`);
		run(`git push ${remote} ${tag}`);
	} catch (error) {
		console.error(`  Warning: failed to push to ${remote}, skipping.`);
		publishFailures.push(`push to ${remote}: ${error.message}`);
	}
}

if (publishFailures.length > 0) {
	console.error('\n— Push failures:');
	publishFailures.forEach((f) => console.error(`  • ${f}`));
	fail(
		`Release ${tag} was NOT pushed, so no release build was triggered. The ` +
			`local commit + tag ${tag} exist; fix the cause and \`git push <remote> ${tag}\` ` +
			`manually, or \`git tag -d ${tag}\` and retry.`
	);
}

// ---------------------------------------------------------------------------
// 10. Hand off to CI
// ---------------------------------------------------------------------------
console.log(`\n✓ Pushed ${tag}. The release build is now running:`);
for (const remote of remotes) {
	console.log(`  https://github.com/${getRepoSlug(remote)}/actions`);
}
console.log(
	`\n  It builds the installer, uploads the artifacts and publishes the\n` +
		`  release. Nothing is visible to users until that finishes.`
);
