'use strict';

// ---------------------------------------------------------------------------
// formatters.test.js — shared renderers for query commands (Plan 02-07).
// ---------------------------------------------------------------------------
// Pins:
//   - parseVotesLabel: returns N from a `votes:N` label, 0 if absent/undefined.
//   - renderIssueSummary: one-line `#<num> [STATE] title (labels, N votes, @who)`
//     with non-vote labels only and "unassigned" when assignee is null.
//   - truncateForDiscord: leaves short strings alone, truncates long ones with
//     the given suffix so total length equals `max` exactly.
//   - formatIssueList: renders empty state; appends footer link only when
//     truncation happened; final string never exceeds 1900 chars.
// ---------------------------------------------------------------------------

import {
	parseVotesLabel,
	renderIssueSummary,
	truncateForDiscord,
	formatIssueList
} from './formatters.js';

describe('parseVotesLabel', () => {
	test('returns number from votes:N label', () => {
		expect(
			parseVotesLabel({ labels: [{ name: 'bug' }, { name: 'votes:12' }] })
		).toBe(12);
	});
	test('returns 0 when no votes label present', () => {
		expect(parseVotesLabel({ labels: [{ name: 'bug' }] })).toBe(0);
	});
	test('returns 0 when labels undefined', () => {
		expect(parseVotesLabel({})).toBe(0);
	});
	test('returns 0 when issue is null', () => {
		expect(parseVotesLabel(null)).toBe(0);
	});
	test('returns 0 when votes label has non-numeric suffix', () => {
		expect(parseVotesLabel({ labels: [{ name: 'votes:abc' }] })).toBe(0);
	});
});

describe('renderIssueSummary', () => {
	test('includes number, state, title, labels, votes, assignee', () => {
		const s = renderIssueSummary({
			number: 7,
			state: 'open',
			title: 'foo',
			labels: [
				{ name: 'bug' },
				{ name: 'triaged' },
				{ name: 'votes:3' }
			],
			assignee: { login: 'alice' }
		});
		expect(s).toContain('#7');
		expect(s).toContain('[open]');
		expect(s).toContain('foo');
		expect(s).toContain('bug, triaged');
		expect(s).toContain('3 votes');
		expect(s).toContain('@alice');
	});
	test('unassigned when no assignee', () => {
		expect(
			renderIssueSummary({
				number: 1,
				state: 'open',
				title: 't',
				labels: [],
				assignee: null
			})
		).toContain('unassigned');
	});
	test('em-dash when no non-vote labels', () => {
		const s = renderIssueSummary({
			number: 1,
			state: 'open',
			title: 't',
			labels: [{ name: 'votes:2' }],
			assignee: null
		});
		expect(s).toContain('—');
	});
	test('excludes votes:N from rendered label list', () => {
		const s = renderIssueSummary({
			number: 2,
			state: 'open',
			title: 't',
			labels: [{ name: 'feature' }, { name: 'votes:5' }],
			assignee: null
		});
		expect(s).not.toMatch(/votes:5/);
		// But it should still say "5 votes"
		expect(s).toContain('5 votes');
	});
	test('returns empty string when issue is null/undefined', () => {
		expect(renderIssueSummary(null)).toBe('');
		expect(renderIssueSummary(undefined)).toBe('');
	});
});

describe('truncateForDiscord', () => {
	test('no-op under max', () => {
		expect(truncateForDiscord('hi', { max: 10 })).toBe('hi');
	});
	test('truncates with suffix to exactly max length', () => {
		const r = truncateForDiscord('a'.repeat(20), { max: 10, suffix: '...' });
		expect(r.length).toBe(10);
		expect(r.endsWith('...')).toBe(true);
	});
	test('default max=1900 leaves headroom under Discord 2000 limit', () => {
		const long = 'x'.repeat(3000);
		const r = truncateForDiscord(long);
		expect(r.length).toBeLessThanOrEqual(1900);
	});
	test('null/undefined coerces to empty string', () => {
		expect(truncateForDiscord(null)).toBe('');
		expect(truncateForDiscord(undefined)).toBe('');
	});
});

describe('formatIssueList', () => {
	test('renders empty state', () => {
		expect(formatIssueList([], { header: 'Issues' })).toContain(
			'No matching'
		);
	});
	test('includes header when provided', () => {
		const out = formatIssueList(
			[
				{
					number: 1,
					state: 'open',
					title: 't',
					labels: [],
					assignee: null
				}
			],
			{ header: 'My Header' }
		);
		expect(out).toContain('My Header');
		expect(out).toContain('#1');
	});
	test('appends footer when truncated', () => {
		const many = Array.from({ length: 100 }, (_, i) => ({
			number: i,
			state: 'open',
			title: 'x'.repeat(50),
			labels: [],
			assignee: null
		}));
		const out = formatIssueList(many, {
			header: 'A',
			footerUrl: 'https://x.y/issues'
		});
		expect(out).toContain('…');
		expect(out).toContain('https://x.y/issues');
		expect(out.length).toBeLessThanOrEqual(1900);
	});
	test('does NOT add footer when output fits under limit', () => {
		const out = formatIssueList(
			[
				{
					number: 1,
					state: 'open',
					title: 't',
					labels: [],
					assignee: null
				}
			],
			{ header: 'Short', footerUrl: 'https://x.y/issues' }
		);
		expect(out).not.toContain('more on GitHub');
	});
});
