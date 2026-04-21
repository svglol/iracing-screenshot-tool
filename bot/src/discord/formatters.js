'use strict';

// ---------------------------------------------------------------------------
// Shared renderers for Discord query commands (Plan 02-07).
// ---------------------------------------------------------------------------
// Every query command (/status, /list, /top-features, /search) serialises
// GitHub issue objects into Discord-safe strings. The helpers in this module
// keep that logic in one place so:
//   - the `votes:N` label format (set by Plan 02-09's vote aggregator) is
//     parsed identically everywhere,
//   - the one-line summary shape (`#N [state] title (labels · votes · @who)`)
//     is consistent across commands,
//   - every multi-line reply is capped at 1900 characters, leaving 100-char
//     headroom under Discord's 2000-character hard limit so additional
//     footer links can be appended without truncation failures.
//
// Exports: parseVotesLabel, renderIssueSummary, truncateForDiscord,
//          formatIssueList.
// ---------------------------------------------------------------------------

// Regex identifies "votes:N" labels set by Plan 02-09's reaction aggregator.
// Anchored on both sides so "votes:" by itself, "votes:-1", or "upvotes:5"
// never match.
const VOTES_RE = /^votes:(\d+)$/;

// ---------------------------------------------------------------------------
// parseVotesLabel
// ---------------------------------------------------------------------------
// Returns the vote count encoded in the issue's `votes:N` label, or 0 when
// the label is absent, the issue is null/undefined, or labels is undefined.
// Tolerant of non-Array shapes and non-string label names.
export function parseVotesLabel(issue) {
	const labels = (issue && issue.labels) || [];
	for (const l of labels) {
		const name = String((l && l.name) || '');
		const m = VOTES_RE.exec(name);
		if (m) return Number(m[1]);
	}
	return 0;
}

// ---------------------------------------------------------------------------
// renderIssueSummary
// ---------------------------------------------------------------------------
// One-line `#<num> [STATE] title (labels · N votes · @who)` string.
// Excludes `votes:N` labels from the label list — the vote count is rendered
// separately as `N votes` so the UI is clean.
// Returns '' for null/undefined issue so callers can join freely.
export function renderIssueSummary(issue) {
	if (!issue) return '';
	const num = issue.number;
	const state = String(issue.state || 'unknown');
	const title = String(issue.title || '').slice(0, 120);
	const nonVoteLabels = (issue.labels || [])
		.map((l) => l && l.name)
		.filter((n) => n && !VOTES_RE.test(n));
	const votes = parseVotesLabel(issue);
	const assignee = issue.assignee && issue.assignee.login
		? `@${issue.assignee.login}`
		: 'unassigned';
	const labelStr = nonVoteLabels.length > 0 ? nonVoteLabels.join(', ') : '—';
	return `#${num} [${state}] ${title} (${labelStr} · ${votes} votes · ${assignee})`;
}

// ---------------------------------------------------------------------------
// truncateForDiscord
// ---------------------------------------------------------------------------
// Ensures the returned string never exceeds `max` characters. When truncation
// is necessary, appends `suffix` so the final string ends cleanly (e.g.
// "… (see more on GitHub: <url>)").
// Default max=1900 leaves 100-char headroom under Discord's 2000-char hard
// limit — headroom absorbs trailing newlines and Discord client rendering
// quirks without risking an accidental 400 Bad Request.
export function truncateForDiscord(text, { max = 1900, suffix = '' } = {}) {
	const s = String(text == null ? '' : text);
	if (s.length <= max) return s;
	const cutoff = Math.max(0, max - suffix.length);
	return s.slice(0, cutoff) + suffix;
}

// ---------------------------------------------------------------------------
// formatIssueList
// ---------------------------------------------------------------------------
// Joins `renderIssueSummary` for each issue, prepends a header line, and
// caps the total length at 1900 chars. If the joined list would exceed the
// limit, the output is truncated and a footer link pointing to `footerUrl`
// is appended so users can always reach the full list on GitHub.
// Empty/null issues list → "_No matching issues._" placeholder so the caller
// doesn't have to branch on empty arrays.
export function formatIssueList(issues, { header = '', footerUrl = '' } = {}) {
	const lines = [];
	if (header) lines.push(header);
	if (!issues || issues.length === 0) {
		lines.push('_No matching issues._');
	} else {
		for (const i of issues) lines.push(renderIssueSummary(i));
	}
	const joined = lines.join('\n');
	const suffix = footerUrl
		? `\n… (more on GitHub: <${footerUrl}>)`
		: '';
	return truncateForDiscord(joined, { max: 1900, suffix });
}
