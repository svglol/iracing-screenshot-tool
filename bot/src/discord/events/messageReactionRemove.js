'use strict';

// ---------------------------------------------------------------------------
// messageReactionRemove — mirror-inverse of messageReactionAdd.
// ---------------------------------------------------------------------------
// A user un-reacting is treated identically to a user reacting: schedule a
// debounced mirror that re-reads the current 👍 count from the message and
// updates the votes:N label. Using the same scheduler means a flurry of
// add/remove toggles collapses to a single mirror per debounce window.
//
// See messageReactionAdd.js for the guard sequence — this file mirrors it
// exactly except for the log label.
// ---------------------------------------------------------------------------

import { Events } from 'discord.js';
import * as mappings from '../../storage/mappings.js';
import { scheduleMirror, countThumbsUp } from '../voteAggregator.js';
import { createLogger } from '../../logger.js';

const log = createLogger('event:reaction-remove');

export const name = Events.MessageReactionRemove;

export async function execute(reaction, user) {
	if (!user || user.bot) {
		return;
	}
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch {
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
	log.debug('Scheduling mirror (remove)', {
		issue: mapping.issue_number,
		user: user.id
	});
	scheduleMirror(mapping.issue_number, {
		fetchCount: async () => countThumbsUp(reaction.message)
	});
}
