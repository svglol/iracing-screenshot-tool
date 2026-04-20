'use strict';

import { createBotErrorPayload } from './errors.js';

// ---------------------------------------------------------------------------
// createBotErrorPayload
// ---------------------------------------------------------------------------
describe('createBotErrorPayload', () => {
	test('wraps a string into a payload', () => {
		const p = createBotErrorPayload('boom');
		expect(p.message).toBe('boom');
		expect(p.stack).toBe('');
		expect(p.source).toBe('bot');
		expect(p.context).toBe('');
		expect(p.meta).toEqual({});
		expect(p.diagnostics).toEqual({});
	});

	test('wraps an Error preserving message and stack', () => {
		const err = new Error('x');
		const p = createBotErrorPayload(err);
		expect(p.message).toBe('x');
		expect(typeof p.stack).toBe('string');
		expect(p.stack.length).toBeGreaterThan(0);
	});

	test('wraps a plain object with message and stack', () => {
		const p = createBotErrorPayload({ message: 'oops', stack: 'trace' });
		expect(p.message).toBe('oops');
		expect(p.stack).toBe('trace');
	});

	test('falls back to default message for null', () => {
		expect(createBotErrorPayload(null).message).toBe('Unknown bot error');
	});

	test('falls back to default message for undefined', () => {
		expect(createBotErrorPayload(undefined).message).toBe('Unknown bot error');
	});

	test('falls back to default message for empty string', () => {
		expect(createBotErrorPayload('').message).toBe('Unknown bot error');
	});

	test('defaults source to bot', () => {
		expect(createBotErrorPayload('x').source).toBe('bot');
	});

	test('honours valid source override', () => {
		expect(createBotErrorPayload('x', { source: 'github' }).source).toBe('github');
		expect(createBotErrorPayload('x', { source: 'discord' }).source).toBe('discord');
		expect(createBotErrorPayload('x', { source: 'webhook' }).source).toBe('webhook');
		expect(createBotErrorPayload('x', { source: 'storage' }).source).toBe('storage');
		expect(createBotErrorPayload('x', { source: 'bot' }).source).toBe('bot');
	});

	test('falls back to bot for unknown source', () => {
		expect(createBotErrorPayload('x', { source: 'invalid' }).source).toBe('bot');
		expect(createBotErrorPayload('x', { source: 'main' }).source).toBe('bot');
	});

	test('returns plain objects for meta and diagnostics', () => {
		const p = createBotErrorPayload('x', { meta: { a: 1 }, diagnostics: { b: 2 } });
		expect(p.meta).toEqual({ a: 1 });
		expect(p.diagnostics).toEqual({ b: 2 });
	});

	test('coerces non-object meta/diagnostics to empty objects', () => {
		const p = createBotErrorPayload('x', { meta: 'junk', diagnostics: [1, 2] });
		expect(p.meta).toEqual({});
		expect(p.diagnostics).toEqual({});
	});

	test('preserves context as a string', () => {
		expect(createBotErrorPayload('x', { context: 'webhook:dispatch' }).context).toBe('webhook:dispatch');
	});

	test('returns exactly the six canonical fields', () => {
		const p = createBotErrorPayload('x');
		expect(Object.keys(p).sort()).toEqual(
			['context', 'diagnostics', 'message', 'meta', 'source', 'stack'].sort()
		);
	});
});
