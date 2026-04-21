'use strict';

// ---------------------------------------------------------------------------
// Bug modal — 5-field Discord modal for /bug intake (D-11, RESEARCH.md §Pattern 3).
// ---------------------------------------------------------------------------
// Discord modals are limited to 5 ActionRows; this one uses every slot.
// The custom IDs here MUST match the names the intake handler reads back via
// `interaction.fields.getTextInputValue(id)` — treat the custom_id list as a
// mini-contract between this file and intakeHandler.js.
//
// BUG_MODAL_ID is versioned (`bug-modal-v1`) so if the schema ever needs to
// change we can roll a new modal alongside the old one for in-flight intakes.
// ---------------------------------------------------------------------------

import {
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';

export const BUG_MODAL_ID = 'bug-modal-v1';

export function buildBugModal() {
	const modal = new ModalBuilder()
		.setCustomId(BUG_MODAL_ID)
		.setTitle('Report a bug');

	const title = new TextInputBuilder()
		.setCustomId('title')
		.setLabel('Short summary')
		.setStyle(TextInputStyle.Short)
		.setMaxLength(100)
		.setRequired(true);

	const steps = new TextInputBuilder()
		.setCustomId('steps')
		.setLabel('Steps to reproduce')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(2000)
		.setRequired(true);

	const expected = new TextInputBuilder()
		.setCustomId('expected')
		.setLabel('What did you expect to happen?')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(1000)
		.setRequired(true);

	const actual = new TextInputBuilder()
		.setCustomId('actual')
		.setLabel('What actually happened?')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(1000)
		.setRequired(true);

	const version = new TextInputBuilder()
		.setCustomId('version')
		.setLabel('App version (e.g. 2.1.0)')
		.setStyle(TextInputStyle.Short)
		.setMaxLength(40)
		.setRequired(false);

	modal.addComponents(
		new ActionRowBuilder().addComponents(title),
		new ActionRowBuilder().addComponents(steps),
		new ActionRowBuilder().addComponents(expected),
		new ActionRowBuilder().addComponents(actual),
		new ActionRowBuilder().addComponents(version)
	);
	return modal;
}
