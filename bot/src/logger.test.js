'use strict';

// Mock config.js to return a synthetic logLevel/logDir so the logger under
// test never touches the real filesystem configuration. The factory returns
// `default` as well as the named re-exports so both consumer shapes work
// under CJS interop.
jest.mock('./config.js', () => {
	const stub = { logDir: '', logLevel: 'info' };
	return {
		__esModule: true,
		default: stub
	};
});

// Jest 25's resolver does not understand the `node:` scheme, so tests use
// bare specifiers. The logger implementation uses `node:` specifiers at
// runtime — Node resolves them transparently; babel-jest rewrites them
// through jest-resolve. Stubbing against the bare `fs` namespace works
// because Node returns the same module instance for both `fs` and `node:fs`.
import fs from 'fs';
import { createLogger } from './logger.js';

afterEach(() => {
	jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// createLogger
// ---------------------------------------------------------------------------
describe('createLogger', () => {
	test('emits INFO lines as single-line JSON with ts/level/proc/msg', () => {
		const writes = [];
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
		jest.spyOn(fs, 'appendFileSync').mockImplementation((_, line) => writes.push(String(line)));
		jest.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new Error('no file');
		});

		const log = createLogger('test');
		log.info('hello', { k: 1 });

		expect(writes).toHaveLength(1);
		const parsed = JSON.parse(writes[0].trimEnd());
		expect(parsed).toMatchObject({ level: 'INFO', proc: 'test', msg: 'hello', data: { k: 1 } });
		expect(typeof parsed.ts).toBe('string');
		expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts);
	});

	test('does not throw when fs.appendFileSync throws', () => {
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
		jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {
			throw new Error('EACCES');
		});
		jest.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new Error('no file');
		});
		const log = createLogger('x');
		expect(() => log.info('boom')).not.toThrow();
	});

	test('does not throw when fs.mkdirSync throws', () => {
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
			throw new Error('EACCES');
		});
		jest.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new Error('no file');
		});
		jest.spyOn(fs, 'appendFileSync').mockImplementation(() => undefined);
		const log = createLogger('x');
		expect(() => log.info('boom')).not.toThrow();
	});

	test('debug is suppressed when logLevel is info', () => {
		const writes = [];
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
		jest.spyOn(fs, 'appendFileSync').mockImplementation((_, line) => writes.push(line));
		jest.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new Error('no file');
		});
		const log = createLogger('x');
		log.debug('not written');
		expect(writes).toHaveLength(0);
	});

	test('error lines carry level=ERROR', () => {
		const writes = [];
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
		jest.spyOn(fs, 'appendFileSync').mockImplementation((_, line) => writes.push(String(line)));
		jest.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new Error('no file');
		});

		const log = createLogger('err');
		log.error('bad', { reason: 'x' });

		expect(writes).toHaveLength(1);
		const parsed = JSON.parse(writes[0].trimEnd());
		expect(parsed.level).toBe('ERROR');
		expect(parsed.proc).toBe('err');
		expect(parsed.msg).toBe('bad');
		expect(parsed.data).toEqual({ reason: 'x' });
	});

	test('omits `data` field when no second argument is supplied', () => {
		const writes = [];
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
		jest.spyOn(fs, 'appendFileSync').mockImplementation((_, line) => writes.push(String(line)));
		jest.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new Error('no file');
		});

		const log = createLogger('plain');
		log.info('just a message');

		expect(writes).toHaveLength(1);
		const parsed = JSON.parse(writes[0].trimEnd());
		expect(parsed).not.toHaveProperty('data');
	});

	test('rotates when existing log exceeds threshold', () => {
		const writes = { readFileSync: [], writeFileSync: [], appendFileSync: [] };
		jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
		// Report a file larger than LOG_ROTATION_LIMIT (5 MB).
		jest.spyOn(fs, 'statSync').mockImplementation(() => ({ size: 6 * 1024 * 1024 }));
		// Provide a 6 MB buffer that rotateIfNeeded will slice.
		jest.spyOn(fs, 'readFileSync').mockImplementation((file) => {
			writes.readFileSync.push(file);
			return Buffer.alloc(6 * 1024 * 1024, 'a');
		});
		jest.spyOn(fs, 'writeFileSync').mockImplementation((file, data) => {
			writes.writeFileSync.push({ file, size: data.length });
		});
		jest.spyOn(fs, 'appendFileSync').mockImplementation((file, line) => {
			writes.appendFileSync.push({ file, line: String(line) });
		});

		const log = createLogger('rot');
		log.info('after rotation');

		// Rotation called: writeFileSync invoked with a truncated buffer
		expect(writes.writeFileSync.length).toBe(1);
		// After rotation, the marker + tail fit within 1 MB + '[TRUNCATED]\n' length
		expect(writes.writeFileSync[0].size).toBeLessThanOrEqual(1024 * 1024 + 16);
		// Then the line is appended
		expect(writes.appendFileSync.length).toBe(1);
	});
});
