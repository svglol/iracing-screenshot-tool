'use strict';

// ---------------------------------------------------------------------------
// Discord Client singleton — built once at startup, reused everywhere.
// ---------------------------------------------------------------------------
// Intents and partials are chosen to support this phase's full feature set:
//   - Guilds                     → slash commands
//   - GuildMessages              → reporter follow-up attachment messages
//   - GuildMessageReactions      → Plan 02-09 vote aggregator
//   - Partials.Message|Channel|Reaction → receive reactions on messages the
//     bot hasn't cached (RESEARCH.md §Pitfall 9 — without partials, reactions
//     on old feature-request messages silently never fire)
//
// MESSAGE CONTENT and SERVER MEMBERS intents are NOT enabled — we never read
// arbitrary message content (only attachments on scoped follow-ups from the
// reporter) and don't need the member list. Keep the Developer Portal
// matching this shape.
//
// resetClient() is exported so tests can destroy the singleton between runs.
// ---------------------------------------------------------------------------

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { createLogger } from '../logger.js';

const log = createLogger('discord:client');

let _client = null;

export function getClient() {
	if (_client) {
		return _client;
	}
	_client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions
		],
		partials: [Partials.Message, Partials.Channel, Partials.Reaction]
	});
	log.info('Discord client constructed');
	return _client;
}

export function resetClient() {
	if (_client) {
		try {
			_client.destroy();
		} catch {
			// never crash on reset
		}
		_client = null;
	}
}
