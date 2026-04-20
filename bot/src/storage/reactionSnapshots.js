'use strict';

// ---------------------------------------------------------------------------
// Last-mirrored vote count per GitHub issue.
// ---------------------------------------------------------------------------
// Used by the reaction aggregator (plan 02-09) to decide whether a debounced
// flush actually needs to update the GitHub `votes:N` label — if the latest
// Discord reaction count matches the snapshot, there's nothing to do.
// ---------------------------------------------------------------------------

import { getDb } from './db.js';

export function getSnapshot(issueNumber) {
	return (
		getDb()
			.prepare('SELECT * FROM reaction_snapshots WHERE issue_number = ?')
			.get(issueNumber) ?? null
	);
}

export function setSnapshot(issueNumber, voteCount, now = Date.now()) {
	getDb()
		.prepare(`
			INSERT INTO reaction_snapshots (issue_number, vote_count, updated_at)
			VALUES (?, ?, ?)
			ON CONFLICT(issue_number) DO UPDATE SET
				vote_count = excluded.vote_count,
				updated_at = excluded.updated_at
		`)
		.run(issueNumber, voteCount, now);
}
