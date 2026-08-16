'use strict';

// Sums the download_count of every artifact on every published GitHub release
// and rewrites the Download Statistics section of README.md (the block between
// the download-stats markers).
//
// The all-assets total is dominated by update checks: electron-updater fetches
// latest.yml from the newest release every time an installed copy looks for an
// update (v1.1.3 alone served ~113k of them while it sat as the latest release
// for five years). The table therefore separates real installer/portable
// downloads from update checks instead of presenting one inflated number.
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
	const rows = releases
		.map((release) => {
			const row = {
				tag: release.tag_name,
				date: (release.published_at || release.created_at).slice(0, 10),
				installer: 0,
				portable: 0,
				updateChecks: 0,
				allAssets: 0,
			};
			for (const asset of release.assets) {
				row.allAssets += asset.download_count;
				row[classify(asset.name)] += asset.download_count;
			}
			return row;
		})
		.sort((a, b) => {
			if (a.date !== b.date) {
				return a.date < b.date ? 1 : -1;
			}
			return b.tag.localeCompare(a.tag, 'en', { numeric: true });
		});
	const totals = { installer: 0, portable: 0, updateChecks: 0, allAssets: 0 };
	for (const row of rows) {
		totals.installer += row.installer;
		totals.portable += row.portable;
		totals.updateChecks += row.updateChecks;
		totals.allAssets += row.allAssets;
	}
	return { rows, totals };
}

function formatCount(n) {
	return n.toLocaleString('en-US');
}

function renderMarkdown({ rows, totals }, updatedOn) {
	const combined = totals.installer + totals.portable;
	const lines = [
		`**Total downloads: ${formatCount(combined)}** — installer and portable, across ${rows.length} releases`,
		'',
		'<details>',
		'<summary>Per-release breakdown</summary>',
		'',
		'| Version | Released | Installer | Portable | Update checks | All assets |',
		'| :------ | :------- | --------: | -------: | ------------: | ---------: |',
	];
	for (const row of rows) {
		const cells = [
			row.tag,
			row.date,
			formatCount(row.installer),
			formatCount(row.portable),
			formatCount(row.updateChecks),
			formatCount(row.allAssets),
		];
		lines.push(`| ${cells.join(' | ')} |`);
	}
	const totalCells = [
		'**Total**',
		'',
		`**${formatCount(totals.installer)}**`,
		`**${formatCount(totals.portable)}**`,
		`**${formatCount(totals.updateChecks)}**`,
		`**${formatCount(totals.allAssets)}**`,
	];
	lines.push(`| ${totalCells.join(' | ')} |`);
	lines.push(
		'',
		'</details>',
		'',
		'<sub>Update checks are downloads of `latest.yml`, fetched by installed',
		'copies looking for a new version — not people downloading the app — and',
		'the all-assets column additionally includes differential-update',
		'blockmaps. Neither counts toward the total above.',
		`Updated ${updatedOn} · refresh with \`npm run stats:downloads\`.</sub>`
	);
	return lines.join('\n');
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
	const { totals, rows } = summary;
	console.log(
		`${slug}: ${formatCount(totals.installer + totals.portable)} downloads ` +
			`(${formatCount(totals.installer)} installer + ` +
			`${formatCount(totals.portable)} portable), ` +
			`${formatCount(totals.updateChecks)} update checks, ` +
			`${formatCount(totals.allAssets)} artifacts total ` +
			`across ${rows.length} releases`
	);
}

main();
