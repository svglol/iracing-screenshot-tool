'use strict';

// ---------------------------------------------------------------------------
// Webhook event dispatcher — turns GitHub issues.* events into Discord
// message edits + reporter pings (D-13, D-17).
// ---------------------------------------------------------------------------
// The "delight moment" of the bot: a reporter files a bug via `/bug`, a
// maintainer closes the issue on GitHub, and the reporter's original
// Discord post is updated with a state icon AND they get a ping letting
// them know the result. Without this dispatcher the closure is silent.
//
// Design:
//   - `dispatch(event, payload)` is the single entry point called by
//     server.js after HMAC + replay checks pass.
//   - Non-issues events (push, pull_request, …) are dropped silently —
//     we register the webhook for `issues` only, but GitHub users can
//     misconfigure and we don't want a noisy error log for those.
//   - Only three issue actions are handled: `closed`, `reopened`,
//     `labeled`. Others are logged and dropped.
//   - Every handler looks up the Discord ↔ GitHub mapping via
//     `mappings.findByIssueNumber`. Missing mapping → orphaned issue
//     (e.g., filed manually on GitHub, not via bot) → silent skip.
//   - `editAndPing` wraps channel.fetch / messages.fetch / edit / reply
//     in one try/catch. If any step fails (permission revoked, message
//     deleted, user left server), we log and continue — throwing would
//     bubble up to the Fastify handler, which would respond 500 and
//     cause GitHub to retry the same event in an infinite loop.
//   - `allowedMentions: { users: [reporterId] }` (D-17): the reporter
//     can still mute bot pings via Discord's per-user/role settings;
//     omitting allowedMentions would let @-mentions in the original
//     issue body pass through and ping arbitrary users.
//   - `votes:*` labeled events are suppressed — Plan 02-09's aggregator
//     thrashes this label on every reaction change, and pinging the
//     reporter on every upvote would be unbearable.
// ---------------------------------------------------------------------------

import * as mappings from '../storage/mappings.js';
import { getClient } from '../discord/client.js';
import { createLogger } from '../logger.js';

const log = createLogger('webhook:handlers');

// Map GitHub's state_reason values to the Discord icon + human-readable
// verb shown in the reporter ping. `completed` is the default when no
// state_reason is supplied (legacy closures from before GitHub added it).
const CLOSED_META = {
	completed: { icon: '✅', verb: 'closed as completed' },
	not_planned: { icon: '🔒', verb: 'closed (wontfix)' },
	duplicate: { icon: '🔁', verb: 'closed as a duplicate' }
};

function describeStateChange(payload, kind) {
	if (kind === 'reopened') {
		return { icon: '🔄', verb: 'reopened' };
	}
	// kind === 'closed'
	const reason =
		payload && payload.issue && payload.issue.state_reason
			? payload.issue.state_reason
			: 'completed';
	return CLOSED_META[reason] || CLOSED_META.completed;
}

// ---------------------------------------------------------------------------
// editAndPing — fetches the Discord message, edits its content prefix with
// the new icon, and sends a threaded reply pinging the reporter (D-17).
// ---------------------------------------------------------------------------
async function editAndPing(mapping, { icon, verb }) {
	try {
		const client = getClient();
		const channel = await client.channels.fetch(mapping.discord_channel_id);
		const msg = await channel.messages.fetch(mapping.discord_message_id);
		const oldContent = msg.content || '';
		// Replace the leading emoji+space prefix with the new icon. The
		// intake format from Plan 02-06 is `${icon} **${type} #${N}: ${title}**`
		// so stripping the first whitespace-delimited token is safe.
		const newContent = `${icon} ` + oldContent.replace(/^\S+\s+/, '');
		await msg.edit({ content: newContent });
		await msg.reply({
			content: `<@${mapping.reporter_discord_id}> your report #${mapping.issue_number} was ${verb}.`,
			allowedMentions: { users: [mapping.reporter_discord_id] }
		});
	} catch (err) {
		// Permissions revoked, message deleted, user left server — any of
		// these must NOT throw across the dispatch boundary. The 500 that
		// Fastify would send back would cause GitHub to retry indefinitely.
		log.error('editAndPing failed', {
			issue: mapping.issue_number,
			err: String((err && err.message) || err)
		});
	}
}

async function onIssueStateChanged(payload, kind) {
	const n = payload && payload.issue && payload.issue.number;
	if (!n) {
		return;
	}
	const mapping = mappings.findByIssueNumber(n);
	if (!mapping) {
		log.info('State change but no mapping', { issue: n, kind });
		return;
	}
	const desc = describeStateChange(payload, kind);
	await editAndPing(mapping, desc);
}

async function onIssueLabeled(payload) {
	const n = payload && payload.issue && payload.issue.number;
	const labelName = payload && payload.label && payload.label.name;
	if (!n || !labelName) {
		return;
	}
	// votes:N thrashes on every reaction change (Plan 02-09 aggregator).
	// Pinging the reporter on every upvote would be unusable — drop these.
	if (/^votes:/.test(labelName)) {
		return;
	}
	const mapping = mappings.findByIssueNumber(n);
	if (!mapping) {
		log.info('Label change but no mapping', { issue: n, label: labelName });
		return;
	}
	try {
		const client = getClient();
		const channel = await client.channels.fetch(mapping.discord_channel_id);
		const msg = await channel.messages.fetch(mapping.discord_message_id);
		await msg.reply({
			content: `<@${mapping.reporter_discord_id}> a maintainer added the **${labelName}** label to #${n}.`,
			allowedMentions: { users: [mapping.reporter_discord_id] }
		});
	} catch (err) {
		log.error('onIssueLabeled failed', {
			issue: n,
			err: String((err && err.message) || err)
		});
	}
}

// ---------------------------------------------------------------------------
// dispatch — the single public entry point. Called by server.js AFTER the
// HMAC signature verifies and the delivery UUID is accepted as fresh.
// ---------------------------------------------------------------------------
export async function dispatch(event, payload) {
	if (event !== 'issues') {
		log.debug('Ignoring event', { event });
		return;
	}
	const action = payload && payload.action;
	switch (action) {
		case 'closed':
			return onIssueStateChanged(payload, 'closed');
		case 'reopened':
			return onIssueStateChanged(payload, 'reopened');
		case 'labeled':
			return onIssueLabeled(payload);
		default:
			log.debug('Ignoring issue action', { action });
			return;
	}
}
