'use strict';

// ---------------------------------------------------------------------------
// 'ready' event handler — fires once the client has logged in and populated
// its caches.
// ---------------------------------------------------------------------------
// Uses Events.ClientReady (discord.js v14 naming) rather than the raw string
// 'ready' so a breaking change in the library would surface as an import
// error, not a silently dropped listener.
// ---------------------------------------------------------------------------

import { Events } from 'discord.js';
import { createLogger } from '../../logger.js';

const log = createLogger('event:ready');

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
	log.info('Discord ready', {
		user: (client && client.user && client.user.tag) || 'unknown',
		guilds:
			client && client.guilds && client.guilds.cache
				? client.guilds.cache.size
				: 0
	});
}
