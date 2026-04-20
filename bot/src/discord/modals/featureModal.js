'use strict';

// ---------------------------------------------------------------------------
// Feature modal — 4-field Discord modal for /feature intake (D-11).
// ---------------------------------------------------------------------------
// Mirrors bugModal.js in construction but asks feature-shaped questions
// (use case, why, nice-to-have). niceToHave is the sole optional field.
// Field custom IDs are a contract with intakeHandler.js — do not rename
// without updating the handler at the same time.
// ---------------------------------------------------------------------------

import {
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';

export const FEATURE_MODAL_ID = 'feature-modal-v1';

export function buildFeatureModal() {
	const modal = new ModalBuilder()
		.setCustomId(FEATURE_MODAL_ID)
		.setTitle('Request a feature');

	const title = new TextInputBuilder()
		.setCustomId('title')
		.setLabel('Short summary')
		.setStyle(TextInputStyle.Short)
		.setMaxLength(100)
		.setRequired(true);

	const useCase = new TextInputBuilder()
		.setCustomId('useCase')
		.setLabel('Use case — what are you trying to do?')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(2000)
		.setRequired(true);

	const why = new TextInputBuilder()
		.setCustomId('why')
		.setLabel('Why does this matter?')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(1000)
		.setRequired(true);

	const niceToHave = new TextInputBuilder()
		.setCustomId('niceToHave')
		.setLabel('Nice-to-have extras (optional)')
		.setStyle(TextInputStyle.Paragraph)
		.setMaxLength(1000)
		.setRequired(false);

	modal.addComponents(
		new ActionRowBuilder().addComponents(title),
		new ActionRowBuilder().addComponents(useCase),
		new ActionRowBuilder().addComponents(why),
		new ActionRowBuilder().addComponents(niceToHave)
	);
	return modal;
}
