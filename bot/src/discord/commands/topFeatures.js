'use strict';

// ---------------------------------------------------------------------------
// /top-features — top-upvoted open feature requests.
// ---------------------------------------------------------------------------
// Queries up to 100 open 'feature'-labeled issues, sorts them by their
// `votes:N` label (set by Plan 02-09's reaction aggregator) descending, and
// renders the top 10 in a public-readable ephemeral reply.
//
// A ~100-issue ceiling is acceptable for the foreseeable project size; if the
// feature list ever exceeds 100, we'd switch to server-side sorting (GitHub
// search with `sort:reactions-+1-desc`), but for now pulling all open features
// and sorting locally is the simplest correct solution.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import config from '../../config.js';
import * as issues from '../../github/issues.js';
import { formatIssueList, parseVotesLabel } from '../formatters.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:top-features');

export const data = new SlashCommandBuilder()
	.setName('top-features')
	.setDescription('Top-upvoted open feature requests');

export async function execute(interaction) {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const all = await issues.listIssues({
		state: 'open',
		labels: 'feature',
		per_page: 100
	});
	const sorted = [...(all || [])]
		.sort((a, b) => parseVotesLabel(b) - parseVotesLabel(a))
		.slice(0, 10);

	const footerUrl = `https://github.com/${config.githubOwner}/${config.githubRepo}/labels/feature`;
	const content = formatIssueList(sorted, {
		header: '🏆 **Top feature requests**',
		footerUrl
	});

	log.info('Top features rendered', { count: sorted.length });
	await interaction.editReply({ content });
}
