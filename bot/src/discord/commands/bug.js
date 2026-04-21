'use strict';

// ---------------------------------------------------------------------------
// /bug slash command handler.
// ---------------------------------------------------------------------------
// Flow (RESEARCH.md §Pattern 3):
//   1. Rate-limit check FIRST (D-14). Rejection is ephemeral and does NOT
//      open the modal — the cap should feel like a polite "come back
//      tomorrow", not a "you clicked through the form and then got yelled
//      at" experience.
//   2. If accepted, showModal. Note that rateLimit.record is called AFTER
//      successful modal submit (in intakeHandler.js), not here — opening
//      a modal the user abandons must NOT consume a daily slot.
//
// Ephemeral replies use `{ flags: MessageFlags.Ephemeral }`. NEVER
// `{ ephemeral: true }` — RESEARCH.md §Pitfall 8.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildBugModal } from '../modals/bugModal.js';
import { check as checkRateLimit } from '../../rateLimit.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:bug');

export const data = new SlashCommandBuilder()
	.setName('bug')
	.setDescription('File a bug report');

export async function execute(interaction) {
	log.info('Command invoked', { cmd: 'bug', user: interaction.user.id });

	const rl = checkRateLimit(interaction.user.id);
	if (!rl || !rl.ok) {
		log.info('Command rejected', {
			cmd: 'bug',
			reason: 'rate-limited',
			user: interaction.user.id
		});
		const resetAt =
			(rl && rl.resetAt) || 'tomorrow (00:00 UTC)';
		return interaction.reply({
			content: `You've hit the daily report cap. Resets at ${resetAt}.`,
			flags: MessageFlags.Ephemeral
		});
	}

	await interaction.showModal(buildBugModal());
}
