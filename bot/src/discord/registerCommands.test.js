'use strict';

// ---------------------------------------------------------------------------
// Tests for registerCommands — the one-shot script that pushes slash-command
// JSON to Discord's REST API. Guild-scoped when DISCORD_GUILD_ID is set
// (RESEARCH.md §Pattern 2, Pitfall 6), global otherwise.
// ---------------------------------------------------------------------------
// Mocks are hoisted above imports by babel-jest so the module under test sees
// the fakes. `discord.js` is replaced with a minimal surface that exposes
// REST + Routes only — we verify which Route factory is called and what body
// is PUT.
// ---------------------------------------------------------------------------

const mockPut = jest.fn().mockResolvedValue({});
const mockSetToken = jest.fn().mockReturnValue({ put: mockPut });
const mockREST = jest.fn().mockImplementation(() => ({ setToken: mockSetToken }));

const mockApplicationGuildCommands = jest.fn().mockReturnValue('guild-route');
const mockApplicationCommands = jest.fn().mockReturnValue('global-route');

jest.mock(
	'discord.js',
	() => ({
		__esModule: true,
		REST: mockREST,
		Routes: {
			applicationGuildCommands: mockApplicationGuildCommands,
			applicationCommands: mockApplicationCommands
		}
	}),
	{ virtual: true }
);

jest.mock('./commands/index.js', () => ({
	__esModule: true,
	loadCommands: jest.fn().mockResolvedValue(
		new Map([
			['bug', { data: { name: 'bug', toJSON: () => ({ name: 'bug' }) } }],
			['feature', { data: { name: 'feature', toJSON: () => ({ name: 'feature' }) } }]
		])
	)
}));

// Config is replaced per-describe because guild-scope vs global-scope branch
// depends on `discordGuildId` being truthy.

describe('registerCommands.main — guild scope', () => {
	beforeAll(() => {
		jest.resetModules();
		jest.doMock('../config.js', () => ({
			__esModule: true,
			default: {
				discordToken: 'tkn',
				discordClientId: 'cid',
				discordGuildId: 'gid',
				logDir: '',
				logLevel: 'info'
			}
		}));
	});

	beforeEach(() => { jest.clearAllMocks(); });

	test('uses applicationGuildCommands when discordGuildId is set', async () => {
		const { main } = await import('./registerCommands.js');
		const body = await main();
		expect(mockApplicationGuildCommands).toHaveBeenCalledWith('cid', 'gid');
		expect(mockApplicationCommands).not.toHaveBeenCalled();
		expect(mockPut).toHaveBeenCalledWith('guild-route', {
			body: [{ name: 'bug' }, { name: 'feature' }]
		});
		expect(body).toHaveLength(2);
	});

	test('constructs REST with discord token and API version 10', async () => {
		const { main } = await import('./registerCommands.js');
		await main();
		expect(mockREST).toHaveBeenCalledWith({ version: '10' });
		expect(mockSetToken).toHaveBeenCalledWith('tkn');
	});
});

describe('registerCommands.main — global scope', () => {
	beforeAll(() => {
		jest.resetModules();
		jest.doMock('../config.js', () => ({
			__esModule: true,
			default: {
				discordToken: 'tkn',
				discordClientId: 'cid',
				discordGuildId: '',
				logDir: '',
				logLevel: 'info'
			}
		}));
	});

	beforeEach(() => { jest.clearAllMocks(); });

	test('uses applicationCommands when discordGuildId is empty', async () => {
		const { main } = await import('./registerCommands.js');
		await main();
		expect(mockApplicationCommands).toHaveBeenCalledWith('cid');
		expect(mockApplicationGuildCommands).not.toHaveBeenCalled();
		expect(mockPut).toHaveBeenCalledWith('global-route', expect.any(Object));
	});
});
