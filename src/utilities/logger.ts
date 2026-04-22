import * as fs from 'fs';
import * as path from 'path';

export interface Logger {
	info(msg: string, data?: unknown): void;
	debug(msg: string, data?: unknown): void;
}

// Cached module-level state — resolved on first createLogger call
let _logDir: string | null = null;
let _isDebug: boolean | null = null;
let _initialized = false;

const LOG_ROTATION_LIMIT = 5 * 1024 * 1024; // 5 MB
const LOG_KEEP_TAIL = 1024 * 1024; // 1 MB kept after rotation

function resolveLogDir(): string {
	// @ts-expect-error — process.type is Electron-injected at runtime; not in @types/node Process
	if (process.type === 'renderer') {
		const { ipcRenderer } = require('electron');
		const userData = ipcRenderer.sendSync('app:getPath-sync', 'userData');
		return path.join(userData, 'logs');
	}

	const { app } = require('electron');
	return path.join(app.getPath('userData'), 'logs');
}

function resolveIsDebug(): boolean {
	// @ts-expect-error — process.type is Electron-injected at runtime; not in @types/node Process
	if (process.type === 'renderer') {
		const { ipcRenderer } = require('electron');
		return ipcRenderer.sendSync('app:isDevBuild-sync');
	}

	const { app } = require('electron');
	return !app.isPackaged || app.getVersion().includes('+');
}

function rotateLogIfNeeded(logFile: string): void {
	try {
		const stats = fs.statSync(logFile);
		if (stats.size <= LOG_ROTATION_LIMIT) {
			return;
		}

		const content = fs.readFileSync(logFile);
		const tail = content.slice(content.length - LOG_KEEP_TAIL);
		const marker = Buffer.from('[TRUNCATED]\n', 'utf8');
		fs.writeFileSync(logFile, Buffer.concat([marker, tail]));
	} catch (error) {
		// Rotation failure must not crash the app
	}
}

function init(): void {
	if (_initialized) {
		return;
	}

	_initialized = true;
	_logDir = resolveLogDir();
	_isDebug = resolveIsDebug();

	// Rotate on startup before any writes
	const logFile = path.join(_logDir, 'app.log');
	try {
		// Only attempt rotation if the file already exists
		if (fs.existsSync(logFile)) {
			rotateLogIfNeeded(logFile);
		}
	} catch (error) {
		// Ignore rotation errors
	}
}

interface LogEntry {
	ts: string;
	level: string;
	proc: string;
	msg: string;
	data?: unknown;
}

function writeLine(
	proc: string,
	level: string,
	msg: string,
	data?: unknown
): void {
	try {
		fs.mkdirSync(_logDir as string, { recursive: true });
		const entry: LogEntry = {
			ts: new Date().toISOString(),
			level,
			proc,
			msg,
		};
		if (data !== undefined) {
			entry.data = data;
		}

		const logFile = path.join(_logDir as string, 'app.log');
		fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
	} catch (error) {
		// Writing must never crash the app
	}
}

export function createLogger(label: string): Logger {
	init();

	return {
		info(msg: string, data?: unknown): void {
			writeLine(label, 'INFO', msg, data);
		},
		debug(msg: string, data?: unknown): void {
			if (!_isDebug) {
				return;
			}

			writeLine(label, 'DEBUG', msg, data);
		},
	};
}
