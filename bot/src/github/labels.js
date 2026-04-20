'use strict';

// ---------------------------------------------------------------------------
// Label taxonomy + idempotent seeder.
// ---------------------------------------------------------------------------
// D-11: /bug and /feature must apply the correct label from the moment the
// issue is filed. If the label does not already exist on the repo, the
// create call returns 422 — which would break the intake flow. To prevent
// that, the bot seeds the full taxonomy on startup.
//
// Seeding is idempotent: we LIST the repo's labels first, then only create
// those missing from the taxonomy. Existing labels are NEVER updated —
// preserving any human edits to color or description.
//
// The 'votes:N' labels (D-04) are NOT seeded here. They are created on
// demand by the reaction aggregator (Plan 02-09) so the taxonomy stays
// manageable — the vote count changes over time and is a runtime concern.
// ---------------------------------------------------------------------------

import config from '../config.js';
import { getOctokit } from './client.js';
import { createLogger } from '../logger.js';

const log = createLogger('github:labels');

// Frozen so downstream modules can rely on shape stability. Colors are
// 6-char hex without a leading '#' because the REST API accepts the hex
// digits directly.
export const LABEL_TAXONOMY = Object.freeze([
	{ name: 'bug',         color: 'd73a4a', description: 'Something is broken' },
	{ name: 'feature',     color: 'a2eeef', description: 'New feature request' },
	{ name: 'duplicate',   color: 'cfd3d7', description: 'Duplicate of another issue (D-16)' },
	{ name: 'triaged',     color: '0e8a16', description: 'Seen and accepted into the queue' },
	{ name: 'in-progress', color: 'fbca04', description: 'Actively being worked on' },
	{ name: 'fixed',       color: '6f42c1', description: 'Fix landed in a release' },
	{ name: 'wontfix',     color: '800000', description: 'Will not be worked on' },
	{ name: 'needs-repro', color: 'd93f0b', description: 'Awaiting reproduction steps' }
]);

// ---------------------------------------------------------------------------
// seedLabels — called once on startup. Idempotent.
// ---------------------------------------------------------------------------
// Returns { created: string[], skipped: string[] } on success, or
// { created: [], skipped: [], error: <msg> } if the list-labels call
// itself fails. Never throws across the module boundary.
export async function seedLabels() {
	const octokit = getOctokit();
	const owner = config.githubOwner;
	const repo = config.githubRepo;

	// Step 1 — LIST existing labels. If this fails we bail without attempting
	// any create; re-seeding under the 422-missing-label failure mode is worse
	// than leaving the taxonomy as-is until the next startup.
	let existing;
	try {
		const { data } = await octokit.rest.issues.listLabelsForRepo({
			owner,
			repo,
			per_page: 100
		});
		existing = new Set(data.map((l) => l.name));
	} catch (error) {
		const msg = String((error && error.message) || error);
		log.error('seedLabels: listLabelsForRepo failed', { err: msg });
		return { created: [], skipped: [], error: msg };
	}

	// Step 2 — for each taxonomy entry not present, create it. Failures on
	// individual creates are logged but do not abort the seeding loop; a
	// transient failure on one label should not prevent the others from
	// being created.
	const created = [];
	const skipped = [];
	for (const spec of LABEL_TAXONOMY) {
		if (existing.has(spec.name)) {
			skipped.push(spec.name);
			continue;
		}
		try {
			await octokit.rest.issues.createLabel({
				owner,
				repo,
				name: spec.name,
				color: spec.color,
				description: spec.description
			});
			created.push(spec.name);
			log.info('Label created', { name: spec.name });
		} catch (error) {
			log.error('Label create failed', {
				name: spec.name,
				err: String((error && error.message) || error)
			});
		}
	}

	log.info('seedLabels complete', { created, skipped });
	return { created, skipped };
}
