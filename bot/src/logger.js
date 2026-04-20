'use strict';

// ---------------------------------------------------------------------------
// File-based structured JSON logger for the bot.
// ---------------------------------------------------------------------------
// Mirrors `src/utilities/logger.js` from the desktop app in call shape
// (`createLogger(label) → { info, debug, error }`) and wire format
// (`{ ts, level, proc, msg, data? }` single-line JSON) so log lines from
// both processes can be parsed with the same tooling.
//
// Electron bindings are stripped — the bot is not an Electron process and
// resolves its log directory from config.logDir (env-backed) instead of
// `app.getPath('userData')`.
//
// Landmine: every write path is wrapped in try/catch. A logging failure
// (disk full, EACCES, missing dir after rmdir, etc.) must NEVER propagate
// — the caller doesn't know or care, and crashing the bot on a logging
// issue would be strictly worse than losing a line.
// ---------------------------------------------------------------------------

// Bare `fs` / `path` specifiers rather than `node:fs` / `node:path` — Jest
// 25's module resolver does not understand the `node:` scheme, and the bot's
// runtime (Node 24, ESM) resolves either form to the same builtin module.
import fs from 'fs';
import path from 'path';
import config from './config.js';

const LOG_ROTATION_LIMIT = 5 * 1024 * 1024; // 5 MB — matches src/utilities/logger.js
const LOG_KEEP_TAIL = 1 * 1024 * 1024; // 1 MB tail preserved after rotation
const LOG_FILE_NAME = 'bot.log';

function resolveLogDir() {
	return config.logDir && config.logDir.length > 0
		? config.logDir
		: path.join(process.cwd(), 'logs');
}

// Size-based rotation matching the app's logger. Read the file, keep the last
// LOG_KEEP_TAIL bytes prefixed with a [TRUNCATED] marker, write back. Any
// failure is swallowed — see module header landmine note.
function rotateIfNeeded(file) {
	try {
		const st = fs.statSync(file);
		if (st.size <= LOG_ROTATION_LIMIT) {
			return;
		}
		const buf = fs.readFileSync(file);
		const tail = buf.slice(buf.length - LOG_KEEP_TAIL);
		fs.writeFileSync(
			file,
			Buffer.concat([Buffer.from('[TRUNCATED]\n', 'utf8'), tail])
		);
	} catch {
		// never crash the bot because of logging
	}
}

function writeLine(proc, level, msg, data) {
	try {
		const dir = resolveLogDir();
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, LOG_FILE_NAME);
		rotateIfNeeded(file);
		const entry = { ts: new Date().toISOString(), level, proc, msg };
		if (data !== undefined) {
			entry.data = data;
		}
		fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
	} catch {
		// never crash
	}
}

// ---------------------------------------------------------------------------
// createLogger(label) → { info, debug, error }
// ---------------------------------------------------------------------------
export function createLogger(label) {
	return {
		info(msg, data) {
			writeLine(label, 'INFO', msg, data);
		},
		debug(msg, data) {
			if (config.logLevel === 'debug') {
				writeLine(label, 'DEBUG', msg, data);
			}
		},
		error(msg, data) {
			writeLine(label, 'ERROR', msg, data);
		}
	};
}
