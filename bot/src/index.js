'use strict';

// ---------------------------------------------------------------------------
// Bot entrypoint — wires config → storage → labels → Discord client → events → login.
// ---------------------------------------------------------------------------
// Order matters. Every later step assumes the earlier ones succeeded:
//   1. `import config` — module-level validation throws MissingConfigError
//      if a required env var is absent (fail-fast before partial boot).
//   2. `getDb()` — opens the SQLite handle and runs idempotent schema init
//      so downstream modules can issue prepared statements immediately.
//   3. `await seedLabels()` — idempotent, NON-fatal; logs the created/skipped
//      pair but does not abort boot on failure (D-11 label correctness is
//      desired but a transient GitHub error shouldn't take the bot offline).
//   4. `loadCommands()` — dynamic-imports every .js under discord/commands/
//      so handlers are registered before the interactionCreate listener fires.
//   5. `getClient()` — constructs the Discord client with the correct intents
//      and partials (see discord/client.js for the why).
//   6. Wire events (ready once, interactionCreate on every interaction).
//   7. `client.login()` — opens the gateway connection.
//   8. SIGTERM/SIGINT handlers destroy the client and close the DB so
//      systemd/NSSM restarts don't leave orphan WAL files.
// ---------------------------------------------------------------------------

import path from 'path';
import { fileURLToPath } from 'url';

import config from './config.js';
import { createLogger } from './logger.js';
import { getDb, closeDb } from './storage/db.js';
import { seedLabels } from './github/labels.js';
import { getClient } from './discord/client.js';
import { loadCommands } from './discord/commands/index.js';
import * as readyEvt from './discord/events/ready.js';
import * as interactionEvt from './discord/events/interactionCreate.js';

const log = createLogger('bot:main');

async function main() {
	log.info('Bot starting', { nodeEnv: process.env.NODE_ENV || 'unknown' });

	// 1. Storage — opens DB and runs IF-NOT-EXISTS schema.
	getDb();

	// 2. Label taxonomy — non-fatal on failure.
	try {
		const seed = await seedLabels();
		log.info('Label seed result', seed);
	} catch (err) {
		log.error('seedLabels threw', { err: String((err && err.message) || err) });
	}

	// 3. Command loader — must run BEFORE interactionCreate is wired.
	const here = fileURLToPath(import.meta.url);
	const commandsDir = path.join(path.dirname(here), 'discord', 'commands');
	const commands = await loadCommands(commandsDir);
	log.info('Commands loaded', { count: commands.size });

	// 4. Client construction + command map attachment (the interactionCreate
	//    router looks for `client.commands.get(name)`).
	const client = getClient();
	client.commands = commands;

	// 5. Event wiring.
	if (readyEvt.once) {
		client.once(readyEvt.name, (...args) => readyEvt.execute(...args));
	} else {
		client.on(readyEvt.name, (...args) => readyEvt.execute(...args));
	}
	client.on(interactionEvt.name, (...args) => interactionEvt.execute(...args));

	// 6. Login — opens the gateway connection.
	await client.login(config.discordToken);

	// 7. Graceful shutdown.
	const shutdown = (sig) => {
		log.info('Shutting down', { sig });
		try { client.destroy(); } catch { /* ignore */ }
		closeDb();
		process.exit(0);
	};
	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
	log.error('Fatal bot bootstrap error', {
		err: String((err && err.message) || err),
		stack: (err && err.stack) || ''
	});
	process.exit(1);
});
