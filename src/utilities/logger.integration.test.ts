// Integration tests for the logger's stateful surface (cq-tests#1): init() dir
// resolution + creation, the writeLine JSON-lines format, level gating (debug
// suppressed unless isDebug; warn/error always emit — WP-A), and startup rotation
// of an over-limit file. These need electron's `app` (resolveLogDir/resolveIsDebug
// call it) and a real logs dir, so they stub electron and write into a fresh
// os.tmpdir() subdir per case. The module-level _initialized/_approxSize latches
// are reset with vi.resetModules() + a dynamic import per test.
//
// The PURE helpers (rotation math, serializer, redaction) are covered separately
// in logger.test.ts (WP-A owns that file); this file owns the electron-dependent side.
//
// NOTE ON THE ELECTRON STUB: logger.ts resolves its log dir via a NATIVE
// `require('electron')` — the `const x = require(...)` pattern in this codebase is
// deliberately left un-rewritten by the bundler (so Vite's renderer target doesn't
// shim node built-ins), which also means vitest's vi.mock (it only intercepts the
// transformed import graph) can't reach it. So instead of vi.mock('electron') we
// plant a stub directly in Node's require cache, which the native require returns.
import { createRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const nodeRequire = createRequire(import.meta.url);

// Values the electron-app stub reports; each test mutates these BEFORE importing
// ./logger so init() (which runs on the first createLogger call) reads them.
const mockApp = {
	userData: '',
	isPackaged: true,
	version: '1.0.0',
};

function installElectronStub(): void {
	const id = nodeRequire.resolve('electron');
	const electronStub = {
		app: {
			getPath: () => mockApp.userData,
			get isPackaged(): boolean {
				return mockApp.isPackaged;
			},
			getVersion: () => mockApp.version,
		},
	};
	// Overwrite (or create) the cached electron module so logger's native
	// require('electron') returns the stub. Node's require cache is NOT cleared by
	// vi.resetModules(), so a single install survives every re-import below.
	nodeRequire.cache[id] = {
		id,
		filename: id,
		loaded: true,
		exports: electronStub,
	} as unknown as NodeModule;
}

const createdDirs: string[] = [];

function freshUserData(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logint-'));
	createdDirs.push(dir);
	return dir;
}

function readLogLines(userData: string): string[] {
	const file = path.join(userData, 'logs', 'app.log');
	return fs
		.readFileSync(file, 'utf8')
		.split('\n')
		.filter((l) => l.length > 0);
}

beforeEach(() => {
	// Reset the module-level init latch so each import re-runs init() cleanly, then
	// (re)install the electron stub for the fresh logger instance.
	vi.resetModules();
	installElectronStub();
	mockApp.userData = '';
	mockApp.isPackaged = true;
	mockApp.version = '1.0.0';
});

afterAll(() => {
	for (const dir of createdDirs) {
		try {
			fs.rmSync(dir, { recursive: true, force: true });
		} catch {
			// best-effort temp cleanup
		}
	}
});

describe('logger init + write (cq-tests#1)', () => {
	test('creates the logs dir and writes a valid JSON-lines INFO entry', async () => {
		const userData = freshUserData();
		mockApp.userData = userData;

		const { createLogger } = await import('./logger');
		createLogger('probe').info('hello world', { a: 1, b: 'two' });

		const logsDir = path.join(userData, 'logs');
		expect(fs.existsSync(logsDir)).toBe(true);

		const lines = readLogLines(userData);
		expect(lines.length).toBe(1);
		const entry = JSON.parse(lines[0]);
		expect(entry.level).toBe('INFO');
		expect(entry.proc).toBe('probe');
		expect(entry.msg).toBe('hello world');
		expect(entry.data).toEqual({ a: 1, b: 'two' });
		expect(typeof entry.ts).toBe('string');
	});

	test('warn() and error() emit WARN/ERROR levels (WP-A)', async () => {
		const userData = freshUserData();
		mockApp.userData = userData;

		const { createLogger } = await import('./logger');
		const log = createLogger('lvl');
		log.warn('a warning');
		log.error('an error', new Error('boom'));

		const [warnLine, errorLine] = readLogLines(userData).map((l) =>
			JSON.parse(l)
		);
		expect(warnLine.level).toBe('WARN');
		expect(warnLine.msg).toBe('a warning');
		expect(errorLine.level).toBe('ERROR');
		// A bare Error payload is structured, not collapsed to '{}'.
		expect(errorLine.data.message).toBe('boom');
		expect(typeof errorLine.data.stack).toBe('string');
	});
});

describe('logger debug gating (cq-tests#1)', () => {
	test('debug() is suppressed in a packaged (non-debug) build', async () => {
		const userData = freshUserData();
		mockApp.userData = userData;
		mockApp.isPackaged = true;
		mockApp.version = '1.0.0'; // no '+' → not a debug build

		const { createLogger } = await import('./logger');
		const log = createLogger('dbg');
		log.debug('should not appear');
		log.info('should appear');

		const lines = readLogLines(userData).map((l) => JSON.parse(l));
		expect(lines.length).toBe(1);
		expect(lines[0].level).toBe('INFO');
	});

	test('debug() is emitted in an unpackaged (debug) build', async () => {
		const userData = freshUserData();
		mockApp.userData = userData;
		mockApp.isPackaged = false; // !isPackaged → isDebug true

		const { createLogger } = await import('./logger');
		createLogger('dbg').debug('now visible');

		const lines = readLogLines(userData).map((l) => JSON.parse(l));
		expect(lines.length).toBe(1);
		expect(lines[0].level).toBe('DEBUG');
		expect(lines[0].msg).toBe('now visible');
	});
});

describe('logger startup rotation (cq-tests#1)', () => {
	test('an over-5MB app.log is rotated to a valid marker + bounded tail on init', async () => {
		const userData = freshUserData();
		mockApp.userData = userData;

		// Pre-create an over-limit app.log of newline-terminated JSON lines so the
		// byte-slice lands on a line boundary.
		const logsDir = path.join(userData, 'logs');
		fs.mkdirSync(logsDir, { recursive: true });
		const logFile = path.join(logsDir, 'app.log');
		const oneLine =
			JSON.stringify({
				ts: 't',
				level: 'INFO',
				proc: 'seed',
				msg: 'x'.repeat(80),
			}) + '\n';
		const repeats = Math.ceil((6 * 1024 * 1024) / oneLine.length);
		fs.writeFileSync(logFile, oneLine.repeat(repeats), 'utf8');
		expect(fs.statSync(logFile).size).toBeGreaterThan(5 * 1024 * 1024);

		// init() (via createLogger) rotates on startup before any write.
		const { createLogger } = await import('./logger');
		createLogger('rot').info('post-rotation line');

		const size = fs.statSync(logFile).size;
		// Bounded to ~the 1MB keep-tail (+ marker + the one new line), not 6MB.
		expect(size).toBeLessThan(1024 * 1024 + 8192);

		const lines = readLogLines(userData);
		// First retained line is the valid-JSON truncation marker.
		expect(JSON.parse(lines[0]).msg).toBe('[TRUNCATED]');
		// Every retained line parses (the whole point of line-boundary slicing).
		for (const l of lines) {
			expect(() => JSON.parse(l)).not.toThrow();
		}
		// The freshly written line survived at the tail.
		expect(JSON.parse(lines[lines.length - 1]).msg).toBe(
			'post-rotation line'
		);
	});
});
