'use strict';

// Prevent dotenv from reading a real .env while the test file is loaded.
// This mock is hoisted by babel-jest above all requires.
jest.mock('dotenv/config', () => ({}));

// Minimal env that satisfies every `required: true` schema entry. Every test
// either uses this as-is or spreads over it to override one key.
const baseEnv = {
	DISCORD_TOKEN: 'tkn',
	DISCORD_CLIENT_ID: 'cid',
	DISCORD_REPORTS_CHANNEL_ID: 'chan',
	DISCORD_MAINTAINER_ROLE_ID: 'role',
	DISCORD_OWNER_ID: 'owner',
	GITHUB_TOKEN: 'gh',
	GITHUB_WEBHOOK_SECRET: 'sec'
};

// The module evaluates `const config = loadConfig()` at import time as a
// fail-fast guard (see acceptance criteria for 02-02 Task 1). To exercise
// `loadConfig` with synthetic envs we therefore seed process.env with a
// baseline that lets module init succeed, THEN require the module lazily
// inside a function so require() happens after the seeding. Static ESM
// imports would be hoisted above the seeding by babel-jest.
let originalEnv = null;
let loadConfig;
let MissingConfigError;
let InvalidConfigError;

beforeAll(() => {
	originalEnv = { ...process.env };
	for (const [k, v] of Object.entries(baseEnv)) {
		process.env[k] = v;
	}
	const mod = require('./config.js');
	loadConfig = mod.loadConfig;
	MissingConfigError = mod.MissingConfigError;
	InvalidConfigError = mod.InvalidConfigError;
});

afterAll(() => {
	// Restore process.env so later test files are not polluted.
	for (const k of Object.keys(baseEnv)) {
		if (originalEnv[k] === undefined) {
			delete process.env[k];
		} else {
			process.env[k] = originalEnv[k];
		}
	}
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------
describe('loadConfig', () => {
	test('returns a frozen object when all required env vars are present', () => {
		const c = loadConfig(baseEnv);
		expect(Object.isFrozen(c)).toBe(true);
		expect(c.discordToken).toBe('tkn');
		expect(c.discordClientId).toBe('cid');
		expect(c.discordReportsChannelId).toBe('chan');
		expect(c.discordMaintainerRoleId).toBe('role');
		expect(c.discordOwnerId).toBe('owner');
		expect(c.githubToken).toBe('gh');
		expect(c.githubWebhookSecret).toBe('sec');
	});

	test('applies defaults for optional vars', () => {
		const c = loadConfig(baseEnv);
		expect(c.githubOwner).toBe('svglol');
		expect(c.githubRepo).toBe('iracing-screenshot-tool');
		expect(c.githubAttachmentsBranch).toBe('bug-attachments');
		expect(c.webhookPort).toBe(3001);
		expect(c.rateLimitPerDay).toBe(3);
		expect(c.logLevel).toBe('info');
	});

	test('throws MissingConfigError listing every missing required var', () => {
		const env = { ...baseEnv };
		delete env.DISCORD_TOKEN;
		delete env.GITHUB_TOKEN;
		expect(() => loadConfig(env)).toThrow(MissingConfigError);
		try {
			loadConfig(env);
			throw new Error('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(MissingConfigError);
			expect(e.missing).toEqual(expect.arrayContaining(['DISCORD_TOKEN', 'GITHUB_TOKEN']));
			expect(e.message).toContain('DISCORD_TOKEN');
			expect(e.message).toContain('GITHUB_TOKEN');
		}
	});

	test('coerces numeric env vars', () => {
		const c = loadConfig({ ...baseEnv, WEBHOOK_PORT: '4040', RATE_LIMIT_PER_DAY: '5' });
		expect(c.webhookPort).toBe(4040);
		expect(c.rateLimitPerDay).toBe(5);
	});

	test('throws InvalidConfigError on non-numeric number var', () => {
		expect(() => loadConfig({ ...baseEnv, WEBHOOK_PORT: 'abc' })).toThrow(InvalidConfigError);
	});

	test('throws InvalidConfigError on bad enum value', () => {
		expect(() => loadConfig({ ...baseEnv, LOG_LEVEL: 'trace' })).toThrow(InvalidConfigError);
	});

	test('accepts both enum values for LOG_LEVEL', () => {
		expect(loadConfig({ ...baseEnv, LOG_LEVEL: 'info' }).logLevel).toBe('info');
		expect(loadConfig({ ...baseEnv, LOG_LEVEL: 'debug' }).logLevel).toBe('debug');
	});

	test('treats empty string as absent (falls back to default)', () => {
		const c = loadConfig({ ...baseEnv, DISCORD_GUILD_ID: '' });
		expect(c.discordGuildId).toBe('');
	});

	test('ignores unknown env vars — no side effects on result shape', () => {
		const c = loadConfig({ ...baseEnv, UNRELATED_VAR: 'x' });
		expect(c).not.toHaveProperty('unrelatedVar');
		expect(c).not.toHaveProperty('UNRELATED_VAR');
	});

	test('InvalidConfigError exposes the offending env key', () => {
		try {
			loadConfig({ ...baseEnv, WEBHOOK_PORT: 'not-a-number' });
			throw new Error('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(InvalidConfigError);
			expect(e.key).toBe('WEBHOOK_PORT');
		}
	});

	test('treats missing required var as present only when non-empty', () => {
		// Empty string is treated as absent for required vars too.
		const env = { ...baseEnv, DISCORD_TOKEN: '' };
		expect(() => loadConfig(env)).toThrow(MissingConfigError);
	});
});
