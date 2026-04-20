'use strict';

// ---------------------------------------------------------------------------
// /status <issue> — show the current state of an issue.
// ---------------------------------------------------------------------------
// Flow:
//   1. deferReply({ flags: MessageFlags.Ephemeral }) FIRST — GitHub calls
//      can exceed the 3-second interaction timeout (RESEARCH.md §Pitfall 7).
//   2. Look up the issue via github/issues.getIssue(n). Returns null on
//      missing issue or API failure.
//   3. Render a multi-line ephemeral reply with state, labels (excluding
//      votes:N), assignee, vote count, and the GitHub URL.
//
// Public per D-12 — no permission gate. setMinValue(1) rejects negative or
// zero issue numbers at the Discord-client layer before the interaction
// ever reaches the bot.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import * as issues from '../../github/issues.js';
import { parseVotesLabel, truncateForDiscord } from '../formatters.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:status');

export const data = new SlashCommandBuilder()
	.setName('status')
	.setDescription('Show current state of an issue')
	.addIntegerOption((o) =>
		o
			.setName('issue')
			.setDescription('Issue number')
			.setRequired(true)
			.setMinValue(1)
	);

export async function execute(interaction) {
	const n = interaction.options.getInteger('issue');
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const issue = await issues.getIssue(n);
	if (!issue) {
		return interaction.editReply({
			content: `Issue #${n} not found.`
		});
	}

	const labels = (issue.labels || [])
		.map((l) => l && l.name)
		.filter((name) => name && !/^votes:/.test(name));
	const votes = parseVotesLabel(issue);
	const assignee =
		issue.assignee && issue.assignee.login
			? `@${issue.assignee.login}`
			: 'unassigned';

	const body =
		`**#${issue.number} [${issue.state}] ${issue.title}**\n` +
		`Labels: ${labels.length > 0 ? labels.join(', ') : '—'}\n` +
		`Assignee: ${assignee}\n` +
		`Votes: ${votes}\n` +
		`<${issue.html_url}>`;

	log.info('Status', { number: n, state: issue.state });
	await interaction.editReply({ content: truncateForDiscord(body) });
}
