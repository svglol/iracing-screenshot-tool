'use strict';

// ---------------------------------------------------------------------------
// interactionCreate router — branches on interaction type and dispatches.
// ---------------------------------------------------------------------------
// Two interaction types currently handled:
//   - ChatInputCommand (slash commands): look up in `client.commands` Map
//     and invoke `execute(interaction)`.
//   - ModalSubmit: dispatch on `customId` — BUG_MODAL_ID and FEATURE_MODAL_ID
//     go to the intake handler. Unknown custom IDs are silently ignored so
//     a future modal (e.g., triage notes) can ship without breaking intake.
//
// Every branch is wrapped in try/catch. If a handler throws, we reply
// (or followUp, if already replied/deferred) with a generic ephemeral
// error so the user never sees "This interaction failed". All ephemeral
// responses use `{ flags: MessageFlags.Ephemeral }` — RESEARCH.md §Pitfall 8.
// ---------------------------------------------------------------------------

import { Events, MessageFlags } from 'discord.js';
import { createLogger } from '../../logger.js';
import { BUG_MODAL_ID } from '../modals/bugModal.js';
import { FEATURE_MODAL_ID } from '../modals/featureModal.js';
import {
	handleBugModalSubmit,
	handleFeatureModalSubmit
} from '../intakeHandler.js';

const log = createLogger('event:interaction');

export const name = Events.InteractionCreate;

export async function execute(interaction) {
	try {
		if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
			const cmd =
				interaction.client &&
				interaction.client.commands &&
				interaction.client.commands.get(interaction.commandName);
			if (!cmd) {
				log.info('Unknown chat-input command', {
					name: interaction.commandName
				});
				return;
			}
			await cmd.execute(interaction);
			return;
		}

		if (interaction.isModalSubmit && interaction.isModalSubmit()) {
			if (interaction.customId === BUG_MODAL_ID) {
				return await handleBugModalSubmit(interaction);
			}
			if (interaction.customId === FEATURE_MODAL_ID) {
				return await handleFeatureModalSubmit(interaction);
			}
			log.info('Unknown modal submit', { customId: interaction.customId });
			return;
		}

		// Buttons, select menus, autocomplete are out of scope for this phase.
	} catch (err) {
		log.error('Interaction handler threw', {
			err: String((err && err.message) || err),
			stack: (err && err.stack) || ''
		});
		try {
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'Something went wrong.',
					flags: MessageFlags.Ephemeral
				});
			} else {
				await interaction.reply({
					content: 'Something went wrong.',
					flags: MessageFlags.Ephemeral
				});
			}
		} catch {
			// Give up — we already logged the original error.
		}
	}
}
