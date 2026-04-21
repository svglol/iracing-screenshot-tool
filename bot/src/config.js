'use strict';

// Load .env on import so subsequent reads of process.env see the file's values.
// Side-effect import; dotenv is a no-op when .env is absent.
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
// Mirror the declarative shape of `src/utilities/config.js` so the bot and the
// desktop app can be read side-by-side. Backing store differs (env vars here,
// electron-store there) but the consumer API — "import the module, read
// properties off it" — is identical.
const schema = {
	discordToken:            { type: 'string', env: 'DISCORD_TOKEN',                required: true },
	discordClientId:         { type: 'string', env: 'DISCORD_CLIENT_ID',            required: true },
	discordGuildId:          { type: 'string', env: 'DISCORD_GUILD_ID',             required: false, default: '' },
	discordReportsChannelId: { type: 'string', env: 'DISCORD_REPORTS_CHANNEL_ID',   required: true },
	discordMaintainerRoleId: { type: 'string', env: 'DISCORD_MAINTAINER_ROLE_ID',   required: true },
	discordOwnerId:          { type: 'string', env: 'DISCORD_OWNER_ID',             required: true },
	githubToken:             { type: 'string', env: 'GITHUB_TOKEN',                 required: true },
	githubOwner:             { type: 'string', env: 'GITHUB_OWNER',                 default: 'svglol' },
	githubRepo:              { type: 'string', env: 'GITHUB_REPO',                  default: 'iracing-screenshot-tool' },
	githubAttachmentsBranch: { type: 'string', env: 'GITHUB_ATTACHMENTS_BRANCH',    default: 'bug-attachments' },
	githubWebhookSecret:     { type: 'string', env: 'GITHUB_WEBHOOK_SECRET',        required: true },
	webhookPort:             { type: 'number', env: 'WEBHOOK_PORT',                 default: 3001 },
	rateLimitPerDay:         { type: 'number', env: 'RATE_LIMIT_PER_DAY',           default: 3 },
	logLevel:                { type: 'string', env: 'LOG_LEVEL',                    default: 'info', enum: ['info', 'debug'] },
	logDir:                  { type: 'string', env: 'LOG_DIR',                      default: '' }
};

// ---------------------------------------------------------------------------
// Errors — typed so callers can branch on config failures without parsing strings.
// ---------------------------------------------------------------------------
export class MissingConfigError extends Error {
	constructor(missing) {
		super(`Missing required environment variables: ${missing.join(', ')}`);
		this.name = 'MissingConfigError';
		this.missing = missing;
	}
}

export class InvalidConfigError extends Error {
	constructor(key, reason) {
		super(`Invalid config for ${key}: ${reason}`);
		this.name = 'InvalidConfigError';
		this.key = key;
		this.reason = reason;
	}
}

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------
// Pure function: given an env object, return a frozen validated config.
// Exposed as a named export so tests can exercise it with synthetic envs
// without touching process.env.
export function loadConfig(env = process.env) {
	const result = {};
	const missing = [];

	for (const [key, spec] of Object.entries(schema)) {
		const raw = env[spec.env];
		const present = raw !== undefined && raw !== '';

		if (!present) {
			if (spec.required) {
				missing.push(spec.env);
				continue;
			}
			result[key] = spec.default;
			continue;
		}

		if (spec.type === 'number') {
			const n = Number(raw);
			if (!Number.isFinite(n)) {
				throw new InvalidConfigError(spec.env, `expected a finite number, got "${raw}"`);
			}
			result[key] = n;
		} else {
			result[key] = String(raw);
		}

		if (spec.enum && !spec.enum.includes(result[key])) {
			throw new InvalidConfigError(
				spec.env,
				`expected one of [${spec.enum.join(', ')}], got "${result[key]}"`
			);
		}
	}

	if (missing.length > 0) {
		throw new MissingConfigError(missing);
	}

	return Object.freeze(result);
}

// ---------------------------------------------------------------------------
// Default export — loaded once at module init, frozen for downstream imports.
// ---------------------------------------------------------------------------
const config = loadConfig();
export default config;
