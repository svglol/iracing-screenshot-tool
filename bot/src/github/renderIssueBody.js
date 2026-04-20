'use strict';

// ---------------------------------------------------------------------------
// Issue body rendering + Discord mention safety.
// ---------------------------------------------------------------------------
// `/bug` and `/feature` modal submissions produce a dict of user-supplied
// text fields. This module turns that dict into well-formatted GitHub
// markdown, wraps user content in fenced code blocks (so stray markdown
// inside their text doesn't break the layout), neutralizes Discord ping
// mentions so GitHub Notifications can't be weaponized as a cross-platform
// ping, and embeds a reporter attribution line containing the Discord user
// ID — D-17's status-change ping flow reads that ID from the issue body.
//
// Pure functions — no I/O, no async, safe to call synchronously anywhere.
// ---------------------------------------------------------------------------

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

// ---------------------------------------------------------------------------
// escapeDiscordMentions
// ---------------------------------------------------------------------------
// Insert a zero-width space between `@` and `everyone`/`here`. Discord sees
// `@\u200beveryone` as plain text and does NOT trigger a broadcast ping.
// GitHub renders the zero-width space invisibly, so the message reads the
// same for humans. Normal user mentions `<@1234>` are left untouched —
// they're already scoped to individuals and are the standard way to address
// a reporter.
export function escapeDiscordMentions(s) {
	if (s === null || s === undefined) {
		return '';
	}
	return String(s).replace(/@(everyone|here)/g, '@\u200b$1');
}

// Wrap user content in a fenced code block. Neutralize any embedded triple
// backticks so they can't close the fence early and leak markdown back into
// the renderer.
function fencedBlock(content) {
	const safe = String(content === null || content === undefined ? '' : content).replace(
		/```/g,
		'\u200b```\u200b'
	);
	return '```\n' + safe + '\n```';
}

// Reporter attribution — embeds the Discord user ID so D-17's status-change
// ping flow can ping the original reporter when the issue closes/labels.
// The username is mention-neutralized because it's user-controlled.
function attributionLine(reporter) {
	const username = escapeDiscordMentions((reporter && reporter.username) || 'unknown');
	const id = String((reporter && reporter.id) || '0');
	return `_Reported by Discord user <@${id}> (${username})_`;
}

// Title is not wrapped in a fenced block (we want it rendered as heading),
// so mention neutralization is especially important here. Also hard-cap the
// length — very long titles look terrible in the GitHub issues list.
function renderTitle(title) {
	return `**${escapeDiscordMentions(String(title || '').slice(0, 200))}**`;
}

// ---------------------------------------------------------------------------
// renderBugBody — D-11 bug modal shape
// ---------------------------------------------------------------------------
export function renderBugBody({ title, steps, expected, actual, version, reporter }) {
	return [
		renderTitle(title),
		'',
		'### Steps to reproduce',
		fencedBlock(steps),
		'### Expected',
		fencedBlock(expected),
		'### Actual',
		fencedBlock(actual),
		'### App version',
		fencedBlock(version || 'not provided'),
		'',
		attributionLine(reporter)
	].join('\n');
}

// ---------------------------------------------------------------------------
// renderFeatureBody — D-11 feature modal shape
// ---------------------------------------------------------------------------
export function renderFeatureBody({ title, useCase, why, niceToHave, reporter }) {
	return [
		renderTitle(title),
		'',
		'### Use case',
		fencedBlock(useCase),
		'### Why',
		fencedBlock(why),
		'### Nice-to-have',
		fencedBlock(niceToHave || 'n/a'),
		'',
		attributionLine(reporter)
	].join('\n');
}

// ---------------------------------------------------------------------------
// appendAttachmentsToBody
// ---------------------------------------------------------------------------
// Called after `uploadAttachment` returns a list of `{ name, url }` objects
// so the GitHub issue body links to the re-hosted orphan-branch URLs. Image
// extensions render as inline markdown images; everything else renders as a
// plain markdown link. Extension matching is case-insensitive.
export function appendAttachmentsToBody(existingBody, attachments) {
	const safeExisting = String(existingBody === null || existingBody === undefined ? '' : existingBody);
	if (!attachments || attachments.length === 0) {
		return safeExisting;
	}
	const lines = ['', '### Attachments'];
	for (const att of attachments) {
		const name = String((att && att.name) || '');
		const url = String((att && att.url) || '');
		const lower = name.toLowerCase();
		const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
		if (IMAGE_EXT.has(ext)) {
			lines.push(`![${name}](${url})`);
		} else {
			lines.push(`- [${name}](${url})`);
		}
	}
	return safeExisting + '\n' + lines.join('\n');
}
