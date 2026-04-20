'use strict';

// ---------------------------------------------------------------------------
// /close <issue> [reason] — Maintainer-gated issue closer (D-15).
// ---------------------------------------------------------------------------
// Flow:
//   1. canTriage() guard FIRST (reject with ephemeral before ANY GitHub call).
//   2. deferReply ephemeral (buys 15 minutes against the 3-sec ack timeout).
//   3. Map the user-facing reason to the GitHub state_reason + optional label:
//        fixed       → state_reason='completed'   + label 'fixed'
//        wontfix     → state_reason='not_planned' + label 'wontfix'
//        not-planned → state_reason='not_planned' + NO label
//        duplicate   → state_reason='duplicate'   + label 'duplicate'
//      Default reason when unset: 'fixed'.
//   4. Apply the label BEFORE closing so the issue ends up in the closed-with-
//      reason state AND has the matching status label.
//   5. editReply summarising the action; failure paths edit to an error line.
//
// Rejection paths log `{reason: 'not-maintainer', user}` so an audit of who
// attempted triage without role is possible from logs alone.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:close');

// User-facing reason → (GitHub state_reason, optional status label to apply).
// Defined at module scope so a single source of truth governs both the
// SlashCommandBuilder choices and the runtime mapping.
const REASON_MAP = Object.freeze({
	fixed:         { state_reason: 'completed',   label: 'fixed' },
	wontfix:       { state_reason: 'not_planned', label: 'wontfix' },
	'not-planned': { state_reason: 'not_planned', label: null },
	duplicate:     { state_reason: 'duplicate',   label: 'duplicate' }
});

export const data = new SlashCommandBuilder()
	.setName('close')
	.setDescription('Close an issue (Maintainer only)')
	.addIntegerOption((o) =>
		o
			.setName('issue')
			.setDescription('Issue number')
			.setRequired(true)
			.setMinValue(1)
	)
	.addStringOption((o) =>
		o
			.setName('reason')
			.setDescription('Close reason (default: fixed)')
			.addChoices(
				{ name: 'fixed',       value: 'fixed' },
				{ name: 'wontfix',     value: 'wontfix' },
				{ name: 'not-planned', value: 'not-planned' },
				{ name: 'duplicate',   value: 'duplicate' }
			)
	);

export async function execute(interaction) {
	// Guard-first: reject non-maintainers BEFORE any GitHub call.
	if (!canTriage(interaction)) {
		log.info('Rejected', {
			cmd: 'close',
			reason: 'not-maintainer',
			user: interaction.user?.id
		});
		return interaction.reply({
			content: '🚫 You need the Maintainer role to use this command.',
			flags: MessageFlags.Ephemeral
		});
	}

	const number = interaction.options.getInteger('issue');
	const reason = interaction.options.getString('reason') || 'fixed';
	const mapped = REASON_MAP[reason];

	if (!mapped) {
		// Discord's addChoices should already prevent this, but defend anyway.
		return interaction.reply({
			content: `Unknown reason: ${reason}`,
			flags: MessageFlags.Ephemeral
		});
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Apply the status label BEFORE closing so the closed issue ends up with
	// a consistent label alongside the GitHub-native state_reason.
	if (mapped.label) {
		await issues.addLabels(number, [mapped.label]);
	}

	const result = await issues.closeIssue(number, {
		state_reason: mapped.state_reason
	});

	if (!result) {
		log.error('close: closeIssue failed', { number, reason });
		return interaction.editReply({
			content: `Failed to close #${number}.`
		});
	}

	log.info('Issue closed', { number, reason });
	await interaction.editReply({
		content: `✅ Closed #${number} as **${reason}**.`
	});
}
