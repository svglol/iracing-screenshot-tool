'use strict';

// ---------------------------------------------------------------------------
// /list [filter] — list issues with a filter (open / closed / mine).
// ---------------------------------------------------------------------------
// Filter behaviour:
//   - open / closed → github.listIssues({ state, per_page: 50 }).slice(0, 15)
//   - mine → look up the reporter's mapping rows in our local SQLite (D-05
//     reporters do NOT have GitHub accounts, so a GitHub `author:` query
//     wouldn't find anything). Fetch up to 10 of the reporter's issues.
//
// Defaults to 'open' when no filter supplied.
// Every command path defers ephemeral BEFORE hitting GitHub (Pitfall 7).
// ---------------------------------------------------------------------------

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import config from '../../config.js';
import * as issues from '../../github/issues.js';
import * as mappings from '../../storage/mappings.js';
import { formatIssueList } from '../formatters.js';
import { createLogger } from '../../logger.js';

const log = createLogger('cmd:list');

export const data = new SlashCommandBuilder()
	.setName('list')
	.setDescription('List issues')
	.addStringOption((o) =>
		o
			.setName('filter')
			.setDescription('open | closed | mine')
			.addChoices(
				{ name: 'open', value: 'open' },
				{ name: 'closed', value: 'closed' },
				{ name: 'mine', value: 'mine' }
			)
	);

export async function execute(interaction) {
	const filter = interaction.options.getString('filter') || 'open';
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	let list;
	if (filter === 'mine') {
		const rows = mappings.listByReporter(interaction.user.id) || [];
		const slice = rows.slice(0, 10);
		const fetched = [];
		for (const r of slice) {
			const i = await issues.getIssue(r.issue_number);
			if (i) fetched.push(i);
		}
		list = fetched;
	} else {
		const raw = await issues.listIssues({ state: filter, per_page: 50 });
		list = (raw || []).slice(0, 15);
	}

	const owner = config.githubOwner;
	const repo = config.githubRepo;
	const footerUrl =
		filter === 'mine'
			? `https://github.com/${owner}/${repo}/issues?q=is:issue+author:${interaction.user.username}`
			: `https://github.com/${owner}/${repo}/issues?q=is:${filter}`;

	const content = formatIssueList(list, {
		header: `**${filter.toUpperCase()} issues** (${list.length})`,
		footerUrl
	});

	log.info('List rendered', { filter, count: list.length });
	await interaction.editReply({ content });
}
