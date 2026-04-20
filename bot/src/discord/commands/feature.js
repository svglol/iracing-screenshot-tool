'use strict';

// ---------------------------------------------------------------------------
// /feature slash command handler.
// ---------------------------------------------------------------------------
// Mirrors /bug exactly (rate-limit-first, then showModal) but opens the
// feature-modal. Keeping the two files parallel rather than parameterising
// makes it trivial for /bug or /feature to diverge later (e.g., if features
// gain a vote preview or bugs gain a log-file shortcut) without refactoring
// both.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { buildFeatureModal } from '../modals/featureModal.js';
import { check as checkRateLimit } from '../../rateLimit.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:feature');

export const data = new SlashCommandBuilder()
	.setName('feature')
	.setDescription('Request a feature');

export async function execute(interaction) {
	log.info('Command invoked', { cmd: 'feature', user: interaction.user.id });

	const rl = checkRateLimit(interaction.user.id);
	if (!rl || !rl.ok) {
		log.info('Command rejected', {
			cmd: 'feature',
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

	await interaction.showModal(buildFeatureModal());
}
