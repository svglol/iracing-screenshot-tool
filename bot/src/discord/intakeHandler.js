'use strict';

// ---------------------------------------------------------------------------
// Intake handler — modal-submit path for /bug and /feature.
// ---------------------------------------------------------------------------
// This is the critical path for the phase:
//   1. `deferReply({ flags: MessageFlags.Ephemeral })` FIRST — Discord gives
//      us 3 seconds to ack an interaction (Pitfall 7). GitHub API calls can
//      easily exceed that. deferReply extends the window to 15 minutes.
//   2. Read fields from `interaction.fields.getTextInputValue(id)`.
//   3. Render the GitHub issue body using the Plan 02-05 renderer (reporter
//      attribution for D-17, mention neutralisation, fenced code blocks).
//   4. `createIssue({ title, body, labels: ['bug'] })` — labels are EXACTLY
//      one of `['bug']` or `['feature']`. The 'triaged' label is NEVER
//      applied at intake; it is reserved for Plan 02-08 /assign-status which
//      marks the issue as reviewed and accepted into the queue. Auto-applying
//      'triaged' here would make that triage command a no-op.
//   5. Fetch the reports channel and post a public message with the reporter
//      mention, issue link, and "React with 👍" prompt (D-02, D-04).
//   6. Insert the Discord ↔ GitHub mapping so Plan 02-09's webhook handler
//      can find the original Discord message and ping the reporter on
//      status changes (D-05, D-17).
//   7. Record the rate-limit bucket (D-14 — only on successful submit, not
//      on modal open).
//   8. Launch the 2-minute attachment collector (Pattern 4). Each attachment
//      is fetched from the Discord CDN BEFORE the URL expires and re-hosted
//      to the orphan `bug-attachments` branch (D-18). The issue body is
//      updated with markdown links to the re-hosted copies.
//
// Every failure branch (createIssue returned null, channel fetch threw,
// public send threw) falls back to an editReply that contains the issue
// URL so the reporter still has something actionable. Mapping insert is
// skipped on public-post failure — without a posted message there's nothing
// for the webhook to edit later.
// ---------------------------------------------------------------------------

import { MessageFlags } from 'discord.js';
import config from '../config.js';
import { createLogger } from '../logger.js';
import * as issues from '../github/issues.js';
import * as mappings from '../storage/mappings.js';
import { record as recordRate } from '../rateLimit.js';
import {
	renderBugBody,
	renderFeatureBody,
	appendAttachmentsToBody
} from '../github/renderIssueBody.js';
import { collectAttachments } from './attachmentCollector.js';

const log = createLogger('intake');

async function runIntake(interaction, kind) {
	// Step 1 — defer IMMEDIATELY (Pitfall 7: 3s interaction timeout).
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		const reporter = {
			id: interaction.user.id,
			username: interaction.user.username
		};

		let title;
		let body;
		let labels;
		let icon;
		let typeWord;

		if (kind === 'bug') {
			const fields = {
				title: interaction.fields.getTextInputValue('title'),
				steps: interaction.fields.getTextInputValue('steps'),
				expected: interaction.fields.getTextInputValue('expected'),
				actual: interaction.fields.getTextInputValue('actual'),
				version: interaction.fields.getTextInputValue('version') || ''
			};
			title = fields.title;
			body = renderBugBody({ ...fields, reporter });
			// Type label ONLY — 'triaged' is NEVER auto-applied (see module header).
			labels = ['bug'];
			icon = '🐛';
			typeWord = 'Bug';
		} else {
			const fields = {
				title: interaction.fields.getTextInputValue('title'),
				useCase: interaction.fields.getTextInputValue('useCase'),
				why: interaction.fields.getTextInputValue('why'),
				niceToHave:
					interaction.fields.getTextInputValue('niceToHave') || ''
			};
			title = fields.title;
			body = renderFeatureBody({ ...fields, reporter });
			// Type label ONLY — 'triaged' is NEVER auto-applied (see module header).
			labels = ['feature'];
			icon = '✨';
			typeWord = 'Feature';
		}

		// Step 2 — create GitHub issue.
		const issue = await issues.createIssue({ title, body, labels });
		if (!issue) {
			log.error('createIssue returned null', { kind, user: reporter.id });
			await interaction.editReply({
				content:
					'Failed to create the GitHub issue — please try again in a minute.'
			});
			return;
		}

		// Step 3 — fetch the reports channel.
		let channel;
		try {
			channel = await interaction.client.channels.fetch(
				config.discordReportsChannelId
			);
		} catch (err) {
			log.error('Could not fetch reports channel', {
				err: String((err && err.message) || err)
			});
			await interaction.editReply({
				content: `Issue filed as #${issue.number} but I couldn't post publicly. Link: ${issue.html_url}`
			});
			return;
		}

		// Step 4 — post public message.
		let posted;
		try {
			posted = await channel.send({
				content:
					`${icon} **${typeWord} #${issue.number}: ${title}**\n` +
					`by <@${reporter.id}> → ${issue.html_url}\n` +
					`React with 👍 if this affects you.`
			});
		} catch (err) {
			log.error('Could not post public message', {
				err: String((err && err.message) || err)
			});
			await interaction.editReply({
				content: `Issue filed as #${issue.number} but public post failed. ${issue.html_url}`
			});
			return;
		}

		// Step 5 — record Discord ↔ GitHub mapping (for D-17 status pings).
		try {
			mappings.insert({
				issue_number: issue.number,
				issue_type: kind,
				reporter_discord_id: reporter.id,
				discord_channel_id: posted.channel.id,
				discord_message_id: posted.id,
				created_at: Date.now()
			});
		} catch (err) {
			// Mapping insert failure is logged but not fatal — the issue and
			// public message already exist; worst case is a missed ping.
			log.error('mappings.insert failed', {
				err: String((err && err.message) || err)
			});
		}

		// Step 6 — increment the daily rate-limit bucket AFTER a successful
		// submit. Modal opens that never submit do NOT consume a slot.
		try { recordRate(reporter.id); } catch (err) {
			log.error('rateLimit.record failed', {
				err: String((err && err.message) || err)
			});
		}

		// Step 7 — ephemeral reply inviting attachments.
		await interaction.editReply({
			content: `Filed as #${issue.number}. You have 2 minutes to drop screenshots or log files in <#${channel.id}> — send "done" or wait to skip.`
		});

		// Step 8 — collect attachments. Caps the wait at 2 min / 5 messages.
		const attachments = await collectAttachments(
			channel,
			reporter.id,
			issue.number
		);

		if (attachments.length > 0) {
			const newBody = appendAttachmentsToBody(body, attachments);
			await issues.updateIssue(issue.number, { body: newBody });
		}

		// Step 9 — final confirmation.
		await interaction.editReply({
			content: `Filed as #${issue.number} with ${attachments.length} attachment(s). ${issue.html_url}`
		});
	} catch (err) {
		log.error('Intake handler threw', {
			kind,
			err: String((err && err.message) || err),
			stack: (err && err.stack) || ''
		});
		try {
			await interaction.editReply({
				content: 'Something went wrong while filing your report. Please try again.'
			});
		} catch {
			// Final fallback — nothing else to do.
		}
	}
}

export async function handleBugModalSubmit(interaction) {
	return runIntake(interaction, 'bug');
}

export async function handleFeatureModalSubmit(interaction) {
	return runIntake(interaction, 'feature');
}
