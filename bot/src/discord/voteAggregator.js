'use strict';

// ---------------------------------------------------------------------------
// Reaction → `votes:N` label aggregator (D-04).
// ---------------------------------------------------------------------------
// Coalesces bursty 👍-reaction events on feature-request messages into a
// single debounced GitHub-label update. Without debouncing, a five-user
// upvote flurry would burn five addLabels + five removeLabel requests in
// quick succession — wasteful and likely to hit the secondary rate-limit
// path. With a 60s debounce, a burst collapses to a single label swap.
//
// Architecture:
//   - _timers: Map<issueNumber, Timeout> — at most one pending flush per
//     issue. The coalesce guard (`if (_timers.has(issueNumber)) return`)
//     makes scheduleMirror idempotent within the window.
//   - fetchCount is INJECTED by the caller (usually the reaction event
//     handler, closing over the Discord message). Keeping it injected
//     makes this module pure: no Discord-client import here, so unit
//     tests can pass a jest.fn() and assert on return values alone.
//   - Snapshot check (reaction_snapshots table, Plan 02-03) ensures a
//     flush where the count has not changed since the last mirror is a
//     zero-I/O no-op — no GitHub calls at all.
//
// Test-only introspection:
//   - `_resetForTests()` clears pending timers between tests.
//   - `_getTimerCountForTests()` exposes the timer-map size so the
//     coalescing test can prove three schedules → one timer WITHOUT
//     jest.useFakeTimers() (Jest 25's fake-timers are fragile around
//     native Promise microtasks).
// ---------------------------------------------------------------------------

import * as issues from '../github/issues.js';
import * as snapshots from '../storage/reactionSnapshots.js';
import { createLogger } from '../logger.js';

const log = createLogger('vote-aggregator');

// At most one pending timer per issue. setTimeout returns are opaque handles
// — we only care about identity for clearTimeout on reset.
const _timers = new Map();

const DEFAULT_DELAY_MS = 60_000;

// ---------------------------------------------------------------------------
// scheduleMirror — debounced entry point.
// ---------------------------------------------------------------------------
// Called by messageReactionAdd/Remove. If a flush is already pending for
// this issue, does nothing (the pending flush will read the latest count
// when it fires). Otherwise schedules one.
export function scheduleMirror(issueNumber, { delayMs = DEFAULT_DELAY_MS, fetchCount } = {}) {
	if (_timers.has(issueNumber)) {
		return;
	}
	const t = setTimeout(async () => {
		_timers.delete(issueNumber);
		try {
			await flushNow(issueNumber, fetchCount);
		} catch (err) {
			log.error('flushNow threw', {
				issueNumber,
				err: String((err && err.message) || err)
			});
		}
	}, delayMs);
	_timers.set(issueNumber, t);
}

// ---------------------------------------------------------------------------
// flushNow — read current count, skip if unchanged, otherwise mirror.
// ---------------------------------------------------------------------------
// Splitting this from scheduleMirror lets tests exercise the flush logic
// without touching the timer map, and lets a future `/votes-flush <issue>`
// triage command reuse the same path.
export async function flushNow(issueNumber, fetchCount) {
	if (typeof fetchCount !== 'function') {
		return;
	}
	const count = await fetchCount(issueNumber);
	if (typeof count !== 'number' || count < 0) {
		return;
	}
	const snap = snapshots.getSnapshot(issueNumber);
	if (snap && snap.vote_count === count) {
		// Snapshot equals the live count — no label change needed. This path
		// fires frequently when reactions toggle rapidly and settle back at
		// the previously-mirrored number; the early return saves two GitHub
		// requests per wasted debounce cycle.
		return;
	}
	await updateVotesLabel(issueNumber, count);
	snapshots.setSnapshot(issueNumber, count, Date.now());
	log.info('Votes mirrored', { issueNumber, count });
}

// ---------------------------------------------------------------------------
// updateVotesLabel — idempotent label swap.
// ---------------------------------------------------------------------------
// `votes:N` is a single-valued label — there must be at most one on any
// issue. Iterate existing labels matching /^votes:\d+$/, remove any that
// don't equal the target, then add the target (skipping addLabels when the
// target already exists as the only votes: label). count === 0 still runs
// the remove pass but skips the add — an issue with zero votes carries no
// votes: label at all, matching the intuition "no vote label when no votes".
export async function updateVotesLabel(issueNumber, count) {
	const issue = await issues.getIssue(issueNumber);
	if (!issue) {
		return;
	}
	const newLabel = `votes:${count}`;
	const existingVoteLabels = (issue.labels || [])
		.map((l) => l.name)
		.filter((n) => /^votes:\d+$/.test(n));

	// Fast path: the target is the only votes: label already present.
	if (
		existingVoteLabels.length === 1 &&
		existingVoteLabels[0] === newLabel
	) {
		return;
	}

	for (const old of existingVoteLabels) {
		if (old !== newLabel) {
			await issues.removeLabel(issueNumber, old);
		}
	}
	if (count > 0) {
		await issues.addLabels(issueNumber, [newLabel]);
	}
}

// ---------------------------------------------------------------------------
// countThumbsUp — helper used by the reaction event handlers.
// ---------------------------------------------------------------------------
// Resolves a Discord message's current unique-human 👍-reaction count.
// Bots are filtered out (the bot itself may react to test). Errors return
// 0 rather than throwing — a transient Discord API hiccup must not crash
// the event handler.
export async function countThumbsUp(message) {
	try {
		const r = message && message.reactions && message.reactions.cache
			? message.reactions.cache.find(
				(rx) => rx.emoji && rx.emoji.name === '👍'
			)
			: null;
		if (!r) {
			return 0;
		}
		const users = await r.users.fetch({ limit: 100 });
		let n = 0;
		for (const u of users.values()) {
			if (!u.bot) {
				n += 1;
			}
		}
		return n;
	} catch (err) {
		log.error('countThumbsUp failed', {
			err: String((err && err.message) || err)
		});
		return 0;
	}
}

// ---------------------------------------------------------------------------
// Test-only introspection.
// ---------------------------------------------------------------------------
export function _resetForTests() {
	for (const t of _timers.values()) {
		clearTimeout(t);
	}
	_timers.clear();
}

// Number of pending flush timers. Used by the coalescing tests to assert
// "only one timer exists per issue" without fake-timer/microtask gymnastics.
export function _getTimerCountForTests() {
	return _timers.size;
}
