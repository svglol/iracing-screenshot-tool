'use strict';

// ---------------------------------------------------------------------------
// /search <query> — search issue titles/bodies scoped to this repo.
// ---------------------------------------------------------------------------
// Delegates to github.searchIssues (which prefixes `repo:owner/repo` so the
// GitHub search endpoint is repo-scoped). per_page=20 caps the cost of any
// single search; the footer link lets users dig deeper on github.com.
//
// The footer URL uses encodeURIComponent so a query like "q&p" becomes
// "q%26p" — GitHub's issue search URL uses `q=` as a query parameter, and an
// un-encoded ampersand would split the query at the "&p" boundary.
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import config from '../../config.js';
import * as issues from '../../github/issues.js';
import { formatIssueList } from '../formatters.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:search');

export const data = new SlashCommandBuilder()
	.setName('search')
	.setDescription('Search issues')
	.addStringOption((o) =>
		o
			.setName('query')
			.setDescription('Search terms')
			.setRequired(true)
	);

export async function execute(interaction) {
	const q = interaction.options.getString('query');
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const results = await issues.searchIssues(q, { per_page: 20 });

	const footerUrl = `https://github.com/${config.githubOwner}/${config.githubRepo}/issues?q=${encodeURIComponent(q)}`;
	const content = formatIssueList(results || [], {
		header: `🔎 **Search:** "${q}"`,
		footerUrl
	});

	log.info('Search rendered', { q, count: (results || []).length });
	await interaction.editReply({ content });
}
