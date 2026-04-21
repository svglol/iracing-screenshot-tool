'use strict';

// ---------------------------------------------------------------------------
// Jest-only stub for `discord.js`.
// ---------------------------------------------------------------------------
// `discord.js` pulls in `ws`, `undici`, and other modules that import via the
// `node:` scheme. Jest 25's resolver cannot handle `node:*` specifiers, so
// the full discord.js package fails to load under test. For the bot's unit
// tests we only need the parts that produce JSON (builders) and the type
// enums. Those live in much lighter packages (`@discordjs/builders`,
// `discord-api-types/v10`) which load cleanly under Jest.
//
// This file is wired into `jest.moduleNameMapper` so every `import '...from
// discord.js'` in a test-loaded module resolves here. The bot runtime is
// unaffected — Node 24 native ESM loads the real discord.js.
//
// Only the symbols this phase actually uses are re-exported. Adding new
// usages (e.g., ButtonBuilder) requires adding the corresponding re-export
// here.
// ---------------------------------------------------------------------------

const {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	SlashCommandBuilder,
	EmbedBuilder
} = require('@discordjs/builders');

const { TextInputStyle, MessageFlags } = require('discord-api-types/v10');

// discord.js v14 uses string-valued Events constants (e.g.
// Events.InteractionCreate === 'interactionCreate'). We re-export a
// stable subset the bot uses.
const Events = {
	ClientReady: 'ready',
	InteractionCreate: 'interactionCreate',
	MessageReactionAdd: 'messageReactionAdd',
	MessageReactionRemove: 'messageReactionRemove'
};

const GatewayIntentBits = {
	Guilds: 1 << 0,
	GuildMessages: 1 << 9,
	GuildMessageReactions: 1 << 10
};

const Partials = {
	User: 'User',
	Channel: 'Channel',
	GuildMember: 'GuildMember',
	Message: 'Message',
	Reaction: 'Reaction',
	ThreadMember: 'ThreadMember'
};

// Minimal `Client` shim — constructed and retained by client.js. Tests don't
// actually invoke gateway methods; they just need `new Client({...})` to not
// throw and to store the options so assertions can inspect them.
class Client {
	constructor(options = {}) {
		this.options = options;
		this.commands = null;
		this._listeners = new Map();
	}
	on(event, fn) { this._listeners.set(event, fn); return this; }
	once(event, fn) { this._listeners.set(event, fn); return this; }
	login() { return Promise.resolve('ok'); }
	destroy() { /* no-op */ }
}

// REST + Routes stubs — tests that need the real REST/Routes mock them
// explicitly via jest.mock('discord.js', ...).
class REST {
	constructor(options = {}) { this.options = options; }
	setToken(token) { this.token = token; return this; }
	put() { return Promise.resolve({}); }
}

const Routes = {
	applicationGuildCommands: (clientId, guildId) =>
		`/applications/${clientId}/guilds/${guildId}/commands`,
	applicationCommands: (clientId) =>
		`/applications/${clientId}/commands`
};

module.exports = {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	SlashCommandBuilder,
	EmbedBuilder,
	TextInputStyle,
	MessageFlags,
	Events,
	GatewayIntentBits,
	Partials,
	Client,
	REST,
	Routes
};
