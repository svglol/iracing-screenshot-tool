'use strict';

// ---------------------------------------------------------------------------
// /label <issue> <action> <name> — Maintainer-gated label manager (D-15).
// ---------------------------------------------------------------------------
// Flow:
//   1. canTriage() guard FIRST (reject with ephemeral before ANY GitHub call).
//   2. Runtime taxonomy allowlist check — defence-in-depth behind Discord's
//      own addChoices restriction. If a name somehow reaches the handler
//      that is NOT in LABEL_TAXONOMY (e.g., a crafted raw API call from a
//      misbehaving client, or a future refactor that drops the addChoices
//      restriction), we still refuse to touch GitHub.
//   3. deferReply ephemeral, then dispatch to issues.addLabels / removeLabel.
//   4. editReply with success or failure summary.
//
// Rejection paths log `{reason: 'not-maintainer' | 'label-not-in-taxonomy'}`
// so operators can audit misuse attempts from logs alone.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import { LABEL_TAXONOMY } from '../../github/labels.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:label');

// Derive the allowlist from the frozen taxonomy so adding a new label in
// labels.js automatically adds it here. votes:N labels are runtime-generated
// by Plan 02-09's aggregator and intentionally NOT in the taxonomy — users
// must not touch them manually.
const ALLOWED_NAMES = new Set(LABEL_TAXONOMY.map((l) => l.name));

export const data = new SlashCommandBuilder()
	.setName('label')
	.setDescription('Add or remove a label on an issue (Maintainer only)')
	.addIntegerOption((o) =>
		o
			.setName('issue')
			.setDescription('Issue number')
			.setRequired(true)
			.setMinValue(1)
	)
	.addStringOption((o) =>
		o
			.setName('action')
			.setDescription('add | remove')
			.setRequired(true)
			.addChoices(
				{ name: 'add',    value: 'add' },
				{ name: 'remove', value: 'remove' }
			)
	)
	.addStringOption((o) =>
		o
			.setName('name')
			.setDescription('Label name (from the taxonomy)')
			.setRequired(true)
			.addChoices(
				...LABEL_TAXONOMY.map((l) => ({ name: l.name, value: l.name }))
			)
	);

export async function execute(interaction) {
	// Guard-first: reject non-maintainers BEFORE any GitHub call.
	if (!canTriage(interaction)) {
		log.info('Rejected', {
			cmd: 'label',
			reason: 'not-maintainer',
			user: interaction.user?.id
		});
		return interaction.reply({
			content: '🚫 You need the Maintainer role to use this command.',
			flags: MessageFlags.Ephemeral
		});
	}

	const number = interaction.options.getInteger('issue');
	const action = interaction.options.getString('action');
	const name   = interaction.options.getString('name');

	// Defence-in-depth — Discord's addChoices should already prevent this.
	if (!ALLOWED_NAMES.has(name)) {
		log.info('Rejected', {
			cmd: 'label',
			reason: 'label-not-in-taxonomy',
			name,
			user: interaction.user?.id
		});
		return interaction.reply({
			content:
				`Label "${name}" is not in the taxonomy. Allowed: ` +
				[...ALLOWED_NAMES].join(', '),
			flags: MessageFlags.Ephemeral
		});
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const ok =
		action === 'add'
			? await issues.addLabels(number, [name])
			: await issues.removeLabel(number, name);

	if (!ok) {
		log.error('label: GitHub call failed', { number, action, name });
		return interaction.editReply({
			content: `Failed to ${action} label on #${number}.`
		});
	}

	log.info('Label updated', { number, action, name });
	await interaction.editReply({
		content:
			`✅ ${action === 'add' ? 'Added' : 'Removed'} label ` +
			`"${name}" on #${number}.`
	});
}
