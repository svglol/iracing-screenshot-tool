'use strict';

const fs = require('fs');
const path = require('path');

// Cached module-level state — resolved on first createLogger call
let _logDir = null;
let _isDebug = null;
let _initialized = false;

const LOG_ROTATION_LIMIT = 5 * 1024 * 1024; // 5 MB
const LOG_KEEP_TAIL = 1024 * 1024; // 1 MB kept after rotation

function resolveLogDir() {
	if (process.type === 'renderer') {
		const { ipcRenderer } = require('electron');
		const userData = ipcRenderer.sendSync('app:getPath-sync', 'userData');
		return path.join(userData, 'logs');
	}

	const { app } = require('electron');
	return path.join(app.getPath('userData'), 'logs');
}

function resolveIsDebug() {
	if (process.type === 'renderer') {
		const { ipcRenderer } = require('electron');
		return ipcRenderer.sendSync('app:isDevBuild-sync');
	}

	const { app } = require('electron');
	return !app.isPackaged || app.getVersion().includes('+');
}

function rotateLogIfNeeded(logFile) {
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

function init() {
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

function writeLine(proc, level, msg, data) {
	try {
		fs.mkdirSync(_logDir, { recursive: true });
		const entry = { ts: new Date().toISOString(), level, proc, msg };
		if (data !== undefined) {
			entry.data = data;
		}

		const logFile = path.join(_logDir, 'app.log');
		fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf8');
	} catch (error) {
		// Writing must never crash the app
	}
}

function createLogger(label) {
	init();

	return {
		info(msg, data) {
			writeLine(label, 'INFO', msg, data);
		},
		debug(msg, data) {
			if (!_isDebug) {
				return;
			}

			writeLine(label, 'DEBUG', msg, data);
		},
	};
}

module.exports = { createLogger };
