// The main-process settings store's open/recovery path, end to end: the real
// config.ts, the real electron-store and conf, real files. Only Electron's `app`
// is stubbed, for userData.
//
// config.ts and electron-store resolve electron with a NATIVE require, which
// vi.mock cannot reach, so the stub is planted in Node's require cache (the
// approach TitleBar.test.ts documents). Each test re-imports config.ts, because
// it opens the store at import time.
import { createRequire } from 'module';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('./logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

const nodeRequire = createRequire(import.meta.url);
let userData = '';
const electronId = nodeRequire.resolve('electron');
nodeRequire.cache[electronId] = {
	id: electronId,
	filename: electronId,
	loaded: true,
	exports: {
		app: { getPath: () => userData },
		ipcRenderer: null,
	},
} as unknown as NodeModule;

const configPath = () => path.join(userData, 'config.json');

async function openConfig() {
	vi.resetModules();
	return (await import('./config')).default;
}

beforeEach(() => {
	userData = fs.mkdtempSync(path.join(os.tmpdir(), 'config-store-'));
});
afterEach(() => {
	fs.rmSync(userData, { recursive: true, force: true });
});

describe('settings store recovery', () => {
	test('a fresh install opens with defaults', async () => {
		const config = await openConfig();
		expect(config.get('screenshotKeybind')).toBe('Control+PrintScreen');
	});

	// Regression: one invalid value used to delete config.json outright.
	test('one invalid value resets only that key; every other setting survives', async () => {
		fs.writeFileSync(
			configPath(),
			JSON.stringify({
				defaultScreenLeft: null,
				screenshotKeybind: 'F12',
				screenshotFolder: 'D:\\Shots',
				activeGraphicsProfile: 'Screenshots',
			})
		);
		const config = await openConfig();
		expect(config.get('defaultScreenLeft')).toBe(0);
		expect(config.get('screenshotKeybind')).toBe('F12');
		expect(config.get('screenshotFolder')).toBe('D:\\Shots');
		expect(config.get('activeGraphicsProfile')).toBe('Screenshots');
		// The repaired file is what is on disk now, so the next launch opens cleanly.
		expect(
			JSON.parse(fs.readFileSync(configPath(), 'utf8'))
		).not.toHaveProperty('defaultScreenLeft');
	});

	test('a file that cannot be salvaged is set aside, not deleted, and defaults load', async () => {
		fs.writeFileSync(configPath(), JSON.stringify(['not', 'settings']));
		const config = await openConfig();
		expect(config.get('screenshotKeybind')).toBe('Control+PrintScreen');
		expect(
			JSON.parse(
				fs.readFileSync(path.join(userData, 'config.corrupt.json'), 'utf8')
			)
		).toEqual(['not', 'settings']);
	});
});
