'use strict';

// ---------------------------------------------------------------------------
// /mark-duplicate <issue> <of-issue> — D-15 Maintainer-gated, D-16 duplicate
// marker.
// ---------------------------------------------------------------------------
// Flow (D-16 mandates all three steps):
//   1. canTriage() guard FIRST (reject with ephemeral before ANY GitHub call).
//   2. Reject self-duplication (issue === of-issue) — no-op on GitHub that
//      would produce a confusing "Duplicate of #N" comment with a self-link.
//   3. deferReply ephemeral.
//   4. issues.addLabels(dup, ['duplicate']) — label first so the issue is
//      visibly flagged even if the subsequent calls fail.
//   5. issues.addComment(dup, 'Duplicate of #<orig> ...') — explicit GitHub
//      audit trail pointing at the primary.
//   6. issues.closeIssue(dup, { state_reason: 'duplicate' }) — GitHub-native
//      duplicate state_reason (UI badge, search filter, GraphQL expose it).
//   7. Best-effort Discord cross-link: if a local mapping exists for the
//      duplicate issue, post a reply in the ORIGINAL Discord message linking
//      to the primary. Uses messageReference + failIfNotExists=false for
//      proper Discord threading that survives deleted original messages.
//      Failures here are logged but do NOT abort the flow — the GitHub-side
//      work is already done and the maintainer has the confirmation they
//      need via editReply.
//   8. editReply with success summary (or partial-success if closeIssue failed).
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { canTriage } from '../../permissions.js';
import * as issues from '../../github/issues.js';
import * as mappings from '../../storage/mappings.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:mark-duplicate');

export const data = new SlashCommandBuilder()
	.setName('mark-duplicate')
	.setDescription('Mark an issue as a duplicate of another (Maintainer only)')
	.addIntegerOption((o) =>
		o
			.setName('issue')
			.setDescription('Duplicate issue number')
			.setRequired(true)
			.setMinValue(1)
	)
	.addIntegerOption((o) =>
		o
			.setName('of-issue')
			.setDescription('Original (primary) issue number')
			.setRequired(true)
			.setMinValue(1)
	);

export async function execute(interaction) {
	// Guard-first: reject non-maintainers BEFORE any GitHub call.
	if (!canTriage(interaction)) {
		log.info('Rejected', {
			cmd: 'mark-duplicate',
			reason: 'not-maintainer',
			user: interaction.user?.id
		});
		return interaction.reply({
			content: '🚫 You need the Maintainer role to use this command.',
			flags: MessageFlags.Ephemeral
		});
	}

	const dup = interaction.options.getInteger('issue');
	const orig = interaction.options.getInteger('of-issue');

	if (dup === orig) {
		log.info('Rejected', {
			cmd: 'mark-duplicate',
			reason: 'self-duplicate',
			dup
		});
		return interaction.reply({
			content: 'An issue cannot be a duplicate of itself.',
			flags: MessageFlags.Ephemeral
		});
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Step 1: label. Do this first so the issue is visibly flagged even if
	// addComment or closeIssue later fail (partial state is better than an
	// unmarked duplicate sitting open).
	await issues.addLabels(dup, ['duplicate']);

	// Step 2: human-readable audit comment. <@id> expands to a Discord
	// mention in the Discord cross-link below, but on GitHub it's just
	// literal text which is fine — GitHub doesn't resolve Discord snowflakes.
	await issues.addComment(
		dup,
		`Marked as duplicate of #${orig} by <@${interaction.user.id}> via bot.`
	);

	// Step 3: close with GitHub-native duplicate state_reason.
	const closed = await issues.closeIssue(dup, {
		state_reason: 'duplicate'
	});

	// Best-effort Discord cross-link. Never rethrow from here — the GitHub
	// side is already done. A failed send (missing access, message deleted,
	// rate limit) must not block the editReply the maintainer is waiting for.
	const mapping = mappings.findByIssueNumber(dup);
	if (mapping) {
		try {
			const channel = await interaction.client.channels.fetch(
				mapping.discord_channel_id
			);
			await channel.send({
				content: `↪ #${dup} is a duplicate of #${orig}.`,
				reply: {
					messageReference: mapping.discord_message_id,
					failIfNotExists: false
				}
			});
		} catch (err) {
			log.error('Could not post Discord duplicate cross-link', {
				dup,
				orig,
				err: String((err && err.message) || err)
			});
		}
	}

	if (!closed) {
		log.error('mark-duplicate: closeIssue failed', { dup, orig });
		return interaction.editReply({
			content: `Labeled #${dup} duplicate but close failed.`
		});
	}

	log.info('Duplicate marked', { dup, orig });
	await interaction.editReply({
		content: `✅ Marked #${dup} as a duplicate of #${orig}.`
	});
}
