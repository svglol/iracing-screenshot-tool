'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BUILD_DIR = path.resolve(__dirname, '..', 'build');
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
const bump = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bump)) {
  fail('Usage: node _scripts/release.js <major|minor|patch>');
}

// ---------------------------------------------------------------------------
// 2. Pre-flight checks
// ---------------------------------------------------------------------------
const status = runCapture('git status --porcelain');
if (status) {
  fail('Working tree is not clean. Commit or stash your changes first.');
}

try {
  runCapture('gh --version');
} catch {
  fail('GitHub CLI (gh) is required but not found. Install it from https://cli.github.com');
}

// ---------------------------------------------------------------------------
// 3. Run tests
// ---------------------------------------------------------------------------
console.log('\n— Running tests…');
run('npm test');

// ---------------------------------------------------------------------------
// 4. Determine previous tag (before any version changes)
// ---------------------------------------------------------------------------
let previousTag = '';
try {
  previousTag = runCapture('git describe --tags --abbrev=0 HEAD');
} catch {
  // No tags exist yet
}

// ---------------------------------------------------------------------------
// 5. Bump version
// ---------------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
const oldVersion = pkg.version;
const [major, minor, patch] = oldVersion.split('.').map(Number);

const newVersion = bump === 'major' ? `${major + 1}.0.0`
  : bump === 'minor' ? `${major}.${minor + 1}.0`
  : `${major}.${minor}.${patch + 1}`;

console.log(`\n— Bumping version: ${oldVersion} → ${newVersion}`);

pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 4) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// 6. Build installer
// ---------------------------------------------------------------------------
console.log('\n— Building installer…');
run('npm run build:installer');

// ---------------------------------------------------------------------------
// 7. Collect build artifacts (current version only)
// ---------------------------------------------------------------------------
const versionPattern = newVersion.replace(/\./g, '\\.');
const artifactRegex = new RegExp(`${versionPattern}\\.(exe|msi|dmg|AppImage|snap|deb|rpm|zip)$`, 'i');

const artifacts = fs.readdirSync(BUILD_DIR)
  .filter((f) => artifactRegex.test(f))
  .map((f) => path.join(BUILD_DIR, f));

if (artifacts.length === 0) {
  fail('No installer artifacts found in build/ for version ' + newVersion);
}

console.log(`\n— Found ${artifacts.length} artifact(s):`);
artifacts.forEach((a) => console.log(`  ${path.basename(a)}`));

// ---------------------------------------------------------------------------
// 8. Commit, tag
// ---------------------------------------------------------------------------
const tag = `v${newVersion}`;
console.log(`\n— Committing and tagging ${tag}…`);

run('git add package.json');
run(`git commit -m "Release ${tag}"`);
run(`git tag ${tag}`);

// ---------------------------------------------------------------------------
// 9. Generate changelog from previous tag
// ---------------------------------------------------------------------------
const logRange = previousTag ? `${previousTag}..${tag}` : tag;
const changelog = runCapture(`git log ${logRange} --pretty=format:"- %s (%h)" --no-merges`);

console.log('\n— Changelog:');
console.log(changelog || '(no changes)');

// ---------------------------------------------------------------------------
// 10. Push commit + tag
// ---------------------------------------------------------------------------
const remotes = runCapture('git remote').split('\n');
const remote = remotes.includes('alessandro') ? 'alessandro' : remotes[0];
const branch = runCapture('git rev-parse --abbrev-ref HEAD');

console.log(`\n— Pushing to ${remote}/${branch}…`);
run(`git push ${remote} ${branch}`);
run(`git push ${remote} ${tag}`);

// ---------------------------------------------------------------------------
// 11. Create GitHub release
// ---------------------------------------------------------------------------
console.log('\n— Creating GitHub release…');

const repoSlug = getRepoSlug(remote);
const releaseTitle = `${pkg.productName || pkg.name} ${tag}`;
const releaseNotes = `## What's Changed\n\n${changelog || 'No changes.'}\n`;
const assetFlags = artifacts.map((a) => `"${a}"`).join(' ');

run(`gh release create ${tag} --repo ${repoSlug} --title "${releaseTitle}" --notes "${releaseNotes}" ${assetFlags}`);

console.log(`\n✓ Released ${tag} successfully!`);
