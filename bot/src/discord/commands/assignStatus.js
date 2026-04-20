'use strict';

// ---------------------------------------------------------------------------
// /assign-status <issue> <status> — Maintainer-gated status label setter.
// ---------------------------------------------------------------------------
// Status is single-valued: an issue can only be in one of
//   triaged | in-progress | fixed | wontfix | needs-repro
// at a time. This command replaces whatever status label is currently on the
// issue with the new one.
//
// Flow:
//   1. canTriage() guard FIRST (reject with ephemeral before ANY GitHub call).
//   2. deferReply ephemeral.
//   3. getIssue to read existing labels. If the issue doesn't exist, surface
//      "not found" and stop.
//   4. Remove any status label ∈ STATUS_VALUES that is present AND differs
//      from the target. (If the target is already present we skip the whole
//      remove pass — no-op in, no-op out.)
//   5. addLabels([status]).
//   6. editReply summarising the new status.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:assign-status');

// The complete set of status labels. Anything NOT in this set is either a
// type label (bug/feature/duplicate) — never touched here — or an unknown
// custom label, also untouched. Adding a new status label requires adding
// it here AND to LABEL_TAXONOMY (the former so the cleanup pass recognises
// it, the latter so the seeder creates it on the GitHub side).
const STATUS_VALUES = Object.freeze([
	'triaged',
	'in-progress',
	'fixed',
	'wontfix',
	'needs-repro'
]);

export const data = new SlashCommandBuilder()
	.setName('assign-status')
	.setDescription('Replace the status label on an issue (Maintainer only)')
	.addIntegerOption((o) =>
		o
			.setName('issue')
			.setDescription('Issue number')
			.setRequired(true)
			.setMinValue(1)
	)
	.addStringOption((o) =>
		o
			.setName('status')
			.setDescription('New status')
			.setRequired(true)
			.addChoices(
				...STATUS_VALUES.map((v) => ({ name: v, value: v }))
			)
	);

export async function execute(interaction) {
	// Guard-first: reject non-maintainers BEFORE any GitHub call.
	if (!canTriage(interaction)) {
		log.info('Rejected', {
			cmd: 'assign-status',
			reason: 'not-maintainer',
			user: interaction.user?.id
		});
		return interaction.reply({
			content: '🚫 You need the Maintainer role to use this command.',
			flags: MessageFlags.Ephemeral
		});
	}

	const number = interaction.options.getInteger('issue');
	const status = interaction.options.getString('status');

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const issue = await issues.getIssue(number);
	if (!issue) {
		return interaction.editReply({
			content: `Issue #${number} not found.`
		});
	}

	// Build the set of currently-attached label names. Tolerate missing
	// labels field or null elements.
	const currentNames = new Set(
		((issue.labels || [])
			.map((l) => l && l.name)
			.filter(Boolean))
	);

	// Only remove status labels that differ from the target. Skipping the
	// remove when the target is already present means an idempotent re-assign
	// is a true no-op on GitHub (no spurious label-removed events).
	for (const s of STATUS_VALUES) {
		if (s !== status && currentNames.has(s)) {
			await issues.removeLabel(number, s);
		}
	}

	await issues.addLabels(number, [status]);

	log.info('Status assigned', { number, status });
	await interaction.editReply({
		content: `✅ Set status **${status}** on #${number}.`
	});
}
