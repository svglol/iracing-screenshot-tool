'use strict';

// ---------------------------------------------------------------------------
// Dynamic command loader.
// ---------------------------------------------------------------------------
// Walks the given directory (or this directory by default) and imports every
// `.js` file that is not `index.js` or a test file. Builds a Map keyed by
// `module.data.name` (the SlashCommandBuilder-registered command name) so
// the interactionCreate router can O(1) look up the handler.
//
// Uses `pathToFileURL` for the import specifier because Windows absolute
// paths (`C:\...`) are not valid URLs and ESM `import()` rejects them.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export async function loadCommands(dir) {
	const out = new Map();
	const target =
		dir || path.dirname(fileURLToPath(import.meta.url));

	let entries;
	try {
		entries = fs.readdirSync(target);
	} catch {
		return out;
	}

	for (const file of entries) {
		if (!file.endsWith('.js')) continue;
		if (file === 'index.js') continue;
		if (file.endsWith('.test.js')) continue;

		const abs = path.join(target, file);
		const mod = await import(pathToFileURL(abs).href);
		if (mod && mod.data && mod.data.name) {
			out.set(mod.data.name, mod);
		}
	}
	return out;
}
