// Use typed `require(...)` for Node built-ins so Vite's renderer target does
// NOT rewrite them to the __vite-browser-external shim (which lacks join /
// statSync / etc.). Electron's Node integration resolves bare-name requires
// at runtime. Matches the convention used in utilities/config.ts (0411a5b)
// and utilities/iracing-config-checks.ts.
const fs: typeof import('fs') = require('fs');
const path: typeof import('path') = require('path');

export interface Logger {
	info(msg: string, data?: unknown): void;
	warn(msg: string, data?: unknown): void;
	error(msg: string, data?: unknown): void;
	debug(msg: string, data?: unknown): void;
}

// Cached module-level state — resolved on first createLogger call
let _logDir: string | null = null;
let _isDebug: boolean | null = null;
let _initialized = false;
// Home/userData prefix redacted out of log lines (obs-logging#7). Resolved in init().
let _homeDir: string | null = null;
// Approximate current size of app.log, maintained by writeLine so rotation can be
// re-checked mid-session without a statSync per line (obs-logging#5).
let _approxSize = 0;
// One-shot latch: once file logging fails, surface it exactly once instead of
// swallowing every failure silently (obs-logging#6).
let _loggingDegraded = false;

const LOG_ROTATION_LIMIT = 5 * 1024 * 1024; // 5 MB
const LOG_KEEP_TAIL = 1024 * 1024; // 1 MB kept after rotation

function resolveLogDir(): string {
	// process.type is Electron-injected at runtime. Cast through a loose shape so
	// this compiles under both the src/utilities-only tsc scope (no electron types)
	// and the src/main expanded scope (electron types declare process.type).
	if ((process as { type?: string }).type === 'renderer') {
		const { ipcRenderer } = require('electron');
		const userData = ipcRenderer.sendSync('app:getPath-sync', 'userData');
		return path.join(userData, 'logs');
	}

	const { app } = require('electron');
	return path.join(app.getPath('userData'), 'logs');
}

function resolveIsDebug(): boolean {
	// process.type is Electron-injected at runtime. Cast through a loose shape so
	// this compiles under both the src/utilities-only tsc scope (no electron types)
	// and the src/main expanded scope (electron types declare process.type).
	if ((process as { type?: string }).type === 'renderer') {
		const { ipcRenderer } = require('electron');
		return ipcRenderer.sendSync('app:isDevBuild-sync');
	}

	const { app } = require('electron');
	return !app.isPackaged || app.getVersion().includes('+');
}

// Drop everything up to and including the first newline so a byte-boundary tail
// never begins with a partial (unparseable) JSON line (obs-logging#2). Exported
// for unit testing. Returns an empty Buffer if the tail contains no newline.
export function sliceToLineBoundary(tail: Buffer): Buffer {
	const nl = tail.indexOf(0x0a);
	return nl === -1 ? Buffer.alloc(0) : tail.subarray(nl + 1);
}

// Pure rotation transform: keep the last LOG_KEEP_TAIL bytes, trim to a line
// boundary, and prepend a VALID JSON truncation marker so a per-line JSON.parse
// reader parses every retained line (obs-logging#2). Exported for unit testing.
export function computeRotatedBuffer(content: Buffer): Buffer {
	const tail = content.subarray(Math.max(0, content.length - LOG_KEEP_TAIL));
	const clean = sliceToLineBoundary(tail);
	const marker = Buffer.from(
		JSON.stringify({
			ts: new Date().toISOString(),
			level: 'INFO',
			proc: 'logger',
			msg: '[TRUNCATED]',
		}) + '\n',
		'utf8'
	);
	return Buffer.concat([marker, clean]);
}

function rotateLogIfNeeded(logFile: string): void {
	try {
		const stats = fs.statSync(logFile);
		if (stats.size <= LOG_ROTATION_LIMIT) {
			return;
		}

		const content = fs.readFileSync(logFile);
		fs.writeFileSync(logFile, computeRotatedBuffer(content));
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

	// Home prefix to redact from log lines. Best-effort; redaction is skipped if
	// this can't be resolved.
	try {
		_homeDir = (require('os') as typeof import('os')).homedir();
	} catch (error) {
		_homeDir = null;
	}

	// Ensure the log dir exists once, up front, so writeLine's hot path doesn't
	// mkdirSync on every line.
	try {
		fs.mkdirSync(_logDir, { recursive: true });
	} catch (error) {
		// Ignore — writeLine has a one-shot retry + degraded fallback.
	}

	// Rotate on startup before any writes, then seed the mid-session size counter.
	const logFile = path.join(_logDir, 'app.log');
	try {
		if (fs.existsSync(logFile)) {
			rotateLogIfNeeded(logFile);
			_approxSize = fs.statSync(logFile).size;
		} else {
			_approxSize = 0;
		}
	} catch (error) {
		_approxSize = 0;
	}
}

interface LogEntry {
	ts: string;
	level: string;
	proc: string;
	msg: string;
	data?: unknown;
	dataError?: string;
}

// Replacer that converts Error values (which JSON.stringify would otherwise
// serialize to '{}') into a structured object preserving message/stack/name/code.
function errorReplacer(_key: string, value: unknown): unknown {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
			code: (value as { code?: unknown }).code,
		};
	}
	return value;
}

// Normalize a top-level `data` payload before it's attached to the entry so a
// bare Error (the common `log.error('x', err)` pattern) is recorded with its
// message/stack rather than collapsing to '{}' (obs-logging#3). Exported for tests.
export function normalizeLogData(data: unknown): unknown {
	if (data instanceof Error) {
		return {
			name: data.name,
			message: data.message,
			stack: data.stack,
			code: (data as { code?: unknown }).code,
		};
	}
	return data;
}

// Serialize a log entry to a single JSON line without ever dropping the line:
// Errors are structured (errorReplacer); a circular payload is retried with a
// WeakSet 'seen' guard; if it STILL can't serialize, the data is dropped but the
// ts/level/proc/msg line is emitted with a dataError note (obs-logging#3).
// Exported for unit testing.
export function serializeEntry(entry: LogEntry): string {
	try {
		return JSON.stringify(entry, errorReplacer);
	} catch (error) {
		try {
			const seen = new WeakSet<object>();
			return JSON.stringify(entry, (key: string, value: unknown) => {
				const normalized = errorReplacer(key, value);
				if (normalized && typeof normalized === 'object') {
					if (seen.has(normalized as object)) {
						return '[Circular]';
					}
					seen.add(normalized as object);
				}
				return normalized;
			});
		} catch (error2) {
			const { data, ...rest } = entry;
			return JSON.stringify({
				...rest,
				dataError: String((error2 as Error)?.message ?? error2),
			});
		}
	}
}

// Redact the resolved home/userData prefix from an already-serialized line so
// {username}-bearing absolute paths don't ship in cleartext (obs-logging#7).
// Matches both the raw prefix and its JSON-escaped (double-backslash) form
// because the line is post-serialization. Exported for unit testing.
export function redactPaths(line: string, homeDir?: string | null): string {
	if (!homeDir) {
		return line;
	}
	const escaped = homeDir.replace(/\\/g, '\\\\');
	return line.split(homeDir).join('<home>').split(escaped).join('<home>');
}

function writeLine(
	proc: string,
	level: string,
	msg: string,
	data?: unknown
): void {
	const entry: LogEntry = {
		ts: new Date().toISOString(),
		level,
		proc,
		msg,
	};
	if (data !== undefined) {
		entry.data = normalizeLogData(data);
	}

	const line = redactPaths(serializeEntry(entry) + '\n', _homeDir);
	const logFile = path.join(_logDir as string, 'app.log');

	try {
		fs.appendFileSync(logFile, line, 'utf8');
	} catch (error) {
		// One-shot recovery: the dir may have been removed under us. Retry once,
		// then latch degraded so the failure of logging is itself observable
		// (in a dev/attached console) rather than vanishing every line.
		try {
			fs.mkdirSync(_logDir as string, { recursive: true });
			fs.appendFileSync(logFile, line, 'utf8');
		} catch (error2) {
			if (!_loggingDegraded) {
				_loggingDegraded = true;
				try {
					console.error('[logger] file logging degraded', error2);
				} catch (error3) {
					// Writing must never crash the app
				}
			}
			return;
		}
	}

	// Re-check rotation mid-session using the cheap byte counter. rotateLogIfNeeded
	// keeps its own statSync guard, so this only triggers a real check when we've
	// plausibly crossed the limit — never a statSync per line.
	_approxSize += Buffer.byteLength(line, 'utf8');
	if (_approxSize > LOG_ROTATION_LIMIT) {
		rotateLogIfNeeded(logFile);
		_approxSize = LOG_KEEP_TAIL;
	}
}

export function createLogger(label: string): Logger {
	init();

	return {
		info(msg: string, data?: unknown): void {
			writeLine(label, 'INFO', msg, data);
		},
		warn(msg: string, data?: unknown): void {
			writeLine(label, 'WARN', msg, data);
		},
		error(msg: string, data?: unknown): void {
			writeLine(label, 'ERROR', msg, data);
		},
		debug(msg: string, data?: unknown): void {
			if (!_isDebug) {
				return;
			}

			writeLine(label, 'DEBUG', msg, data);
		},
	};
}
