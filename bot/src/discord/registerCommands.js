'use strict';

// ---------------------------------------------------------------------------
// Slash-command registration script (RESEARCH.md §Pattern 2, Pitfall 6).
// ---------------------------------------------------------------------------
// One-shot: invoked via `npm run register-commands` whenever slash command
// definitions change — NOT on every bot boot (Discord has a daily creation
// limit for command registration).
//
// Scope:
//   - If DISCORD_GUILD_ID is set (dev), register to that guild (instant
//     propagation — ideal for iterating).
//   - Otherwise (prod), register globally (up to 1 hour propagation).
//
// The module exports `main()` for testing; it is also auto-invoked when run
// directly (`node src/discord/registerCommands.js`) via the ESM
// `import.meta.url === process.argv[1]` idiom.
// ---------------------------------------------------------------------------

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { REST, Routes } from 'discord.js';

import config from '../config.js';
import { createLogger } from '../logger.js';
import { loadCommands } from './commands/index.js';

const log = createLogger('discord:register');

export async function main() {
	const here = fileURLToPath(import.meta.url);
	const commandsDir = path.join(path.dirname(here), 'commands');
	const cmds = await loadCommands(commandsDir);
	const body = [...cmds.values()].map((c) => c.data.toJSON());

	const rest = new REST({ version: '10' }).setToken(config.discordToken);
	const route = config.discordGuildId
		? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
		: Routes.applicationCommands(config.discordClientId);

	await rest.put(route, { body });
	log.info('Slash commands registered', {
		count: body.length,
		scope: config.discordGuildId ? 'guild' : 'global'
	});
	return body;
}

// Only run main() when this file is the entry point — not during tests.
// `process.argv[1]` is the script the user invoked; if that resolves to the
// same file URL as this module, we're being executed directly.
const isDirect =
	typeof process !== 'undefined' &&
	Array.isArray(process.argv) &&
	process.argv[1] &&
	pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirect) {
	main().catch((err) => {
		log.error('registerCommands failed', {
			err: String((err && err.message) || err)
		});
		process.exit(1);
	});
}
