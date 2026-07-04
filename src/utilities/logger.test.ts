// Unit tests for the pure, exported helpers of the logger (WP-A). These cover
// the rotation math (obs-logging#2), Error/circular-safe serialization
// (obs-logging#3), and path redaction (obs-logging#7). They import ONLY the
// pure helpers, so no electron/fs mocking is needed and importing the module
// does not trigger init(). (WP-M owns the electron-mocking init/rotation suite
// under a distinct path — logger.integration.test.ts.)
import {
	sliceToLineBoundary,
	computeRotatedBuffer,
	normalizeLogData,
	serializeEntry,
	redactPaths,
} from './logger';

const KEEP_TAIL = 1024 * 1024; // mirrors LOG_KEEP_TAIL

describe('sliceToLineBoundary', () => {
	test('drops the leading partial line', () => {
		const buf = Buffer.from('partial-json-fragment}\n{"a":1}\n{"b":2}\n', 'utf8');
		expect(sliceToLineBoundary(buf).toString('utf8')).toBe('{"a":1}\n{"b":2}\n');
	});

	test('returns empty when there is no newline', () => {
		expect(sliceToLineBoundary(Buffer.from('no-newline-here', 'utf8')).length).toBe(0);
	});
});

describe('computeRotatedBuffer (obs-logging#2)', () => {
	test('every retained line — marker included — is valid JSON', () => {
		// Build a JSON-lines buffer well over the keep-tail so slicing lands mid-line.
		const lines = Array.from({ length: 60000 }, (_v, i) =>
			JSON.stringify({ ts: 't', level: 'INFO', proc: 'p', msg: 'm'.repeat(20) + i })
		).join('\n') + '\n';
		const content = Buffer.from(lines, 'utf8');
		expect(content.length).toBeGreaterThan(KEEP_TAIL);

		const out = computeRotatedBuffer(content).toString('utf8');
		const retained = out.split('\n').filter(Boolean);

		// First line is the valid-JSON truncation marker.
		expect(JSON.parse(retained[0]).msg).toBe('[TRUNCATED]');
		// Every retained line parses without throwing (the whole point of the fix).
		for (const l of retained) {
			expect(() => JSON.parse(l)).not.toThrow();
		}
		// Result is bounded to roughly the keep-tail (plus the marker), not the input.
		expect(out.length).toBeLessThan(KEEP_TAIL + 4096);
	});
});

describe('normalizeLogData (obs-logging#3)', () => {
	test('maps a top-level Error to a structured object', () => {
		const err = new Error('EACCES: permission denied');
		(err as { code?: string }).code = 'EACCES';
		const out = normalizeLogData(err) as Record<string, unknown>;
		expect(out.name).toBe('Error');
		expect(out.message).toBe('EACCES: permission denied');
		expect(out.code).toBe('EACCES');
		expect(typeof out.stack).toBe('string');
	});

	test('passes non-Error values through unchanged', () => {
		expect(normalizeLogData({ a: 1 })).toEqual({ a: 1 });
		expect(normalizeLogData('x')).toBe('x');
	});
});

describe('serializeEntry (obs-logging#3)', () => {
	test('nested Error is serialized with message/stack, not {}', () => {
		const line = serializeEntry({
			ts: 't',
			level: 'ERROR',
			proc: 'p',
			msg: 'boom',
			data: { err: new Error('kaboom') },
		});
		const parsed = JSON.parse(line);
		expect(parsed.data.err.message).toBe('kaboom');
		expect(typeof parsed.data.err.stack).toBe('string');
	});

	test('circular data neither throws nor drops the message', () => {
		const circular: Record<string, unknown> = { name: 'win' };
		circular.self = circular;
		const line = serializeEntry({
			ts: 't',
			level: 'ERROR',
			proc: 'p',
			msg: 'has-circular',
			data: circular,
		});
		const parsed = JSON.parse(line);
		expect(parsed.msg).toBe('has-circular'); // line is never dropped
	});
});

describe('redactPaths (obs-logging#7)', () => {
	const home = 'C:\\Users\\racer';

	test('masks the home prefix in a raw (unescaped) line', () => {
		const line = `open ${home}\\AppData\\Roaming\\app\\logs`;
		expect(redactPaths(line, home)).toBe('open <home>\\AppData\\Roaming\\app\\logs');
	});

	test('masks the home prefix in a JSON-escaped line', () => {
		const line = JSON.stringify({ path: `${home}\\Pictures\\shot.png` });
		const out = redactPaths(line, home);
		expect(out).not.toContain('racer');
		expect(out).toContain('<home>');
	});

	test('is a no-op when no home dir is provided', () => {
		const line = 'nothing to redact';
		expect(redactPaths(line, null)).toBe(line);
		expect(redactPaths(line, undefined)).toBe(line);
	});
});
