'use strict';

// Sums the download_count of every artifact on every published GitHub release
// and rewrites the Download Statistics section of README.md (the block between
// the download-stats markers).
//
// The all-assets total is dominated by update checks: electron-updater fetches
// latest.yml from the newest release every time an installed copy looks for an
// update (v1.1.3 alone served ~113k of them while it sat as the latest release
// for five years). The published figure therefore counts only installer and
// portable downloads instead of presenting one inflated number.
//
// Usage: node _scripts/download-stats.js [--dry-run]
// Unauthenticated GitHub API calls are rate-limited to 60/hour; set
// GITHUB_TOKEN (or GH_TOKEN) to raise the limit. Drafts are excluded.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const BADGE_PATH = path.join(ROOT, '.github', 'badges', 'downloads.json');
const START_MARKER = '<!-- download-stats:start -->';
const END_MARKER = '<!-- download-stats:end -->';

function fail(message) {
	console.error(`\n✗ ${message}`);
	process.exit(1);
}

function repoSlug() {
	const pkgPath = path.join(ROOT, 'package.json');
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	const repo =
		typeof pkg.repository === 'string'
			? pkg.repository
			: (pkg.repository && pkg.repository.url) || '';
	const slug = repo
		.replace(/^git\+/, '')
		.replace(/^https?:\/\/github\.com\//, '')
		.replace(/^git@github\.com:/, '')
		.replace(/\.git$/, '');
	if (!/^[^/]+\/[^/]+$/.test(slug)) {
		fail(`Cannot derive owner/repo from package.json repository: "${repo}"`);
	}
	return slug;
}

async function fetchReleases(slug) {
	const headers = {
		accept: 'application/vnd.github+json',
		'user-agent': slug,
	};
	const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}
	const releases = [];
	for (let page = 1; ; page++) {
		const url = `https://api.github.com/repos/${slug}/releases?per_page=100&page=${page}`;
		const res = await fetch(url, { headers });
		if (!res.ok) {
			fail(`GitHub API returned ${res.status} ${res.statusText} for ${url}`);
		}
		const batch = await res.json();
		releases.push(...batch);
		if (batch.length < 100) {
			break;
		}
	}
	return releases.filter((release) => !release.draft);
}

// latest.yml is fetched by installed copies checking for updates; blockmaps
// are fetched during differential updates. Neither is a person downloading
// the app, so they only ever count toward the all-assets total.
function classify(name) {
	if (name.endsWith('.blockmap')) {
		return 'other';
	}
	if (name.endsWith('.yml')) {
		return 'updateChecks';
	}
	if (name.endsWith('.exe')) {
		return /setup/i.test(name) ? 'installer' : 'portable';
	}
	return 'other';
}

function summarize(releases) {
	const totals = {
		installer: 0,
		portable: 0,
		updateChecks: 0,
		other: 0,
		allAssets: 0,
	};
	for (const release of releases) {
		for (const asset of release.assets) {
			totals.allAssets += asset.download_count;
			totals[classify(asset.name)] += asset.download_count;
		}
	}
	return { totals, releaseCount: releases.length };
}

function formatCount(n) {
	return n.toLocaleString('en-US');
}

function renderMarkdown({ totals, releaseCount }, updatedOn) {
	const combined = totals.installer + totals.portable;
	return [
		`**Total downloads: ${formatCount(combined)}** — installer and portable, across ${releaseCount} releases`,
		'',
		'<sub>Excludes update checks — downloads of `latest.yml`, made by',
		'installed copies looking for a new version — and differential-update',
		'blockmaps, neither of which is a person downloading the app.',
		`Updated ${updatedOn} · refresh with \`npm run stats:downloads\`.</sub>`,
	].join('\n');
}

// The README's downloads badge is a shields.io endpoint badge fed by this
// file. Shields' built-in github/downloads counter cannot exclude latest.yml,
// so it would permanently read ~127k instead of the real download count.
function writeBadge(combined) {
	const badge = {
		schemaVersion: 1,
		label: 'downloads',
		message: formatCount(combined),
		color: 'brightgreen',
	};
	fs.mkdirSync(path.dirname(BADGE_PATH), { recursive: true });
	fs.writeFileSync(BADGE_PATH, JSON.stringify(badge, null, '\t') + '\n');
}

function spliceReadme(markdown) {
	const readme = fs.readFileSync(README_PATH, 'utf8');
	const start = readme.indexOf(START_MARKER);
	const end = readme.indexOf(END_MARKER);
	if (start === -1 || end === -1 || end < start) {
		fail('README.md is missing the download-stats markers');
	}
	const updated =
		readme.slice(0, start + START_MARKER.length) +
		'\n\n' +
		markdown +
		'\n\n' +
		readme.slice(end);
	fs.writeFileSync(README_PATH, updated);
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');
	const slug = repoSlug();
	const summary = summarize(await fetchReleases(slug));
	const updatedOn = new Date().toISOString().slice(0, 10);
	const markdown = renderMarkdown(summary, updatedOn);
	if (dryRun) {
		console.log(markdown);
	} else {
		spliceReadme(markdown);
		writeBadge(summary.totals.installer + summary.totals.portable);
		console.log(
			`Updated ${path.relative(ROOT, README_PATH)} and ` +
				path.relative(ROOT, BADGE_PATH)
		);
	}
	const { totals, releaseCount } = summary;
	console.log(
		`${slug}: ${formatCount(totals.installer + totals.portable)} downloads ` +
			`(${formatCount(totals.installer)} installer + ` +
			`${formatCount(totals.portable)} portable), ` +
			`${formatCount(totals.updateChecks)} update checks, ` +
			`${formatCount(totals.allAssets)} artifacts total ` +
			`across ${releaseCount} releases`
	);
}

main();
