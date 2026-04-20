'use strict';

// ---------------------------------------------------------------------------
// messageReactionAdd — schedules a debounced votes:N mirror when a human
// adds a 👍 reaction to a bot-posted FEATURE message (D-04).
// ---------------------------------------------------------------------------
// Flow:
//   1. Ignore bots (Discord emits this event for the bot's own seed reactions
//      in some races — the check is cheap and prevents self-counted votes).
//   2. If the reaction is a partial (uncached message), fetch it — otherwise
//      `emoji.name` would be null and the filter below would silently drop a
//      legitimate vote. See RESEARCH.md §Pitfall 9.
//   3. Filter to 👍 only — other emoji are ignored at the event layer so we
//      don't burn a mappings lookup per arbitrary reaction.
//   4. Look up the Discord ↔ GitHub mapping. No mapping → someone reacted to
//      a message this bot didn't file, ignore.
//   5. Feature-only: D-04 scopes upvoting to feature requests. Bug reactions
//      never touch the votes:N label, matching the CONTEXT.md intent.
//   6. Schedule a debounced mirror — the aggregator coalesces bursts.
// ---------------------------------------------------------------------------

import { Events } from 'discord.js';
import * as mappings from '../../storage/mappings.js';
import { scheduleMirror, countThumbsUp } from '../voteAggregator.js';
import { createLogger } from '../../logger.js';

const log = createLogger('event:reaction-add');

export const name = Events.MessageReactionAdd;

export async function execute(reaction, user) {
	if (!user || user.bot) {
		return;
	}
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch {
			// Partial fetch failed (message deleted, permissions revoked,
			// transient API error). Dropping this event is safer than
			// throwing — the next reaction will re-schedule the mirror.
			return;
		}
	}
	if (!reaction.emoji || reaction.emoji.name !== '👍') {
		return;
	}
	const mapping = mappings.findByMessageId(reaction.message.id);
	if (!mapping) {
		return;
	}
	if (mapping.issue_type !== 'feature') {
		return;
	}
	log.debug('Scheduling mirror', {
		issue: mapping.issue_number,
		user: user.id
	});
	scheduleMirror(mapping.issue_number, {
		fetchCount: async () => countThumbsUp(reaction.message)
	});
}
