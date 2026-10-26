import { schema } from './config-schema';
import { repairConfigData } from './config-repair';
import { createLogger } from './logger';

const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');

interface ConfigShape {
	// `any` on purpose: this is electron-store's own accessor, which is keyed by
	// string across a schema of mixed types, and every call site narrows it. The
	// directive has to sit on THIS line — one line higher it suppresses nothing and
	// eslint --fix removes it as unused.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get(key: string): any;
	set(key: string, value: unknown): void;
	onDidChange?(
		key: string,
		callback: (newValue: unknown, oldValue: unknown) => void
	): () => void;
}

// process.type is Electron-injected at runtime. When electron types are loaded
// (src/main/ scope) it is declared; when not (src/utilities/ scope alone), plain
// @types/node does not declare it. Cast through a loose shape to work in both.
let configInstance: ConfigShape;
if ((process as { type?: string }).type === 'renderer') {
	configInstance = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		get(key: string): any {
			return ipcRenderer.sendSync('config:get', key);
		},
		set(key: string, value: unknown): void {
			ipcRenderer.sendSync('config:set', { key, value });
		},
		onDidChange(
			key: string,
			callback: (newValue: unknown, oldValue: unknown) => void
		): () => void {
			const channel = `config:changed:${key}`;
			const handler = (
				_event: unknown,
				newValue: unknown,
				oldValue: unknown
			) => {
				callback(newValue, oldValue);
			};

			ipcRenderer.on(channel, handler);

			return () => {
				ipcRenderer.removeListener(channel, handler);
			};
		},
	};
} else {
	configInstance = openStoreWithRecovery();
}

// Main-process Store construction, with recovery when electron-store refuses to
// open config.json.
//
// Unparseable JSON is set aside before the store opens (see
// setAsideUnparseableConfig), so what reaches the catch is a SCHEMA VIOLATION —
// one stored value of the wrong shape, e.g. the null that a NaN write turns
// into — or an I/O error. This used to
// delete config.json on any of them, so one bad field cost the user every
// setting. Now: drop only the invalid values (config-repair.ts) and reopen; and
// if the file cannot be salvaged, set it aside rather than destroy it.
//
// The logger is only CREATED on an actual recovery: config.ts also loads in the
// renderer, and createLogger() is what runs the logger's init(). It used to be a
// lazy require('../utilities/logger'), which the bundler leaves as a runtime path
// relative to out/main/ where no such file exists — so in a built app the throw
// was swallowed and the reset this was meant to record was never logged.
function openStoreWithRecovery(): ConfigShape {
	const { app } = require('electron');
	const configPath = path.join(app.getPath('userData'), 'config.json');
	setAsideUnparseableConfig(configPath);

	try {
		return new Store({ schema });
	} catch (openErr) {
		const error = (openErr as Error)?.message || String(openErr);

		try {
			const repair = repairConfigData(
				JSON.parse(fs.readFileSync(configPath, 'utf8')),
				schema
			);
			if (repair && repair.dropped.length > 0) {
				// Same serialisation conf writes; staged and renamed so a crash
				// cannot leave a half-written settings file.
				const temp = `${configPath}.repair-tmp`;
				fs.writeFileSync(temp, JSON.stringify(repair.data, null, '\t'));
				fs.renameSync(temp, configPath);
				const store = new Store({ schema });
				logConfigRecovery(
					'warn',
					'config.json had invalid values; reset only those keys to defaults',
					{ dropped: repair.dropped, error }
				);
				return store;
			}
		} catch (repairErr) {
			logConfigRecovery('warn', 'config.json repair failed', {
				error: (repairErr as Error)?.message || String(repairErr),
			});
		}

		// Record the reset BEFORE moving the file so this isn't silent data loss
		// (obs-error-visibility#4).
		logConfigRecovery(
			'error',
			'config.json unusable; set aside as config.corrupt.json and reset to defaults',
			{ error }
		);
		moveConfigAside(configPath);
		return new Store({ schema });
	}
}

// conf resets a config.json that is not valid JSON by itself
// (clearInvalidConfig) — silently: no log line, and no copy of the user's
// settings kept. So that case is caught here first, before the store opens, and
// takes the same logged set-aside path as any other unusable file.
function setAsideUnparseableConfig(configPath: string): void {
	let text: string;
	try {
		text = fs.readFileSync(configPath, 'utf8');
	} catch {
		// Missing (first run) or unreadable: the store's own open decides.
		return;
	}
	try {
		JSON.parse(text);
	} catch (parseErr) {
		logConfigRecovery(
			'error',
			'config.json is not valid JSON; set aside as config.corrupt.json and reset to defaults',
			{ error: (parseErr as Error)?.message || String(parseErr) }
		);
		moveConfigAside(configPath);
	}
}

function moveConfigAside(configPath: string): void {
	try {
		fs.renameSync(
			configPath,
			path.join(path.dirname(configPath), 'config.corrupt.json')
		);
	} catch (moveErr: unknown) {
		// ENOENT: nothing to move. Anything else (a locked file) would make the
		// store's open fail the same way, so surface it.
		if ((moveErr as NodeJS.ErrnoException)?.code !== 'ENOENT') {
			throw moveErr;
		}
	}
}

function logConfigRecovery(
	level: 'warn' | 'error',
	message: string,
	meta: Record<string, unknown>
): void {
	try {
		createLogger('config')[level](message, meta);
	} catch {
		// Logger unavailable — the recovery proceeds regardless.
	}
}

export default configInstance;
