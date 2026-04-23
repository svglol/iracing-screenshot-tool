const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const fs = require('fs');
const path = require('path');
const homedir: string = require('os').homedir();
const dir = homedir + '\\Pictures\\Screenshots\\';

const schema = {
	customHeight: {
		type: 'number',
		default: 1080,
	},
	customWidth: {
		type: 'number',
		default: 1920,
	},
	resolution: {
		type: 'string',
		default: '1080p',
	},
	crop: {
		type: 'boolean',
		default: true,
	},
	cropTopLeft: {
		type: 'boolean',
		default: false,
	},
	winPosX: {
		type: 'number',
		default: 0,
	},
	winPosY: {
		type: 'number',
		default: 0,
	},
	winWidth: {
		type: 'number',
		default: 1100,
	},
	winHeight: {
		type: 'number',
		default: 655,
	},
	screenshotFolder: {
		type: 'string',
		default: dir,
	},
	screenshotKeybind: {
		type: 'string',
		default: 'Control+PrintScreen',
	},
	customFilenameFormat: {
		type: 'boolean',
		default: false,
	},
	filenameFormat: {
		type: 'string',
		default: '{track}-{driver}-{counter}',
	},
	outputFormat: {
		type: 'string',
		default: 'jpeg',
		enum: ['jpeg', 'png', 'webp'],
	},
	disableTooltips: {
		type: 'boolean',
		default: false,
	},
	defaultScreenWidth: {
		type: 'number',
		default: 0,
	},
	defaultScreenHeight: {
		type: 'number',
		default: 0,
	},
	defaultScreenLeft: {
		type: 'number',
		default: 0,
	},
	defaultScreenTop: {
		type: 'number',
		default: 0,
	},
	manualWindowRestore: {
		type: 'boolean',
		default: false,
	},
	firstTime: {
		type: 'boolean',
		default: true,
	},
	version: {
		type: 'string',
		default: '',
	},
	reshade: {
		type: 'boolean',
		default: false,
	},
	reshadeFile: {
		type: 'string',
		default: 'C:\\Program Files (x86)\\iRacing\\ReShade.ini',
	},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ConfigShape {
	get(key: string): any;
	set(key: string, value: unknown): void;
	onDidChange?(
		key: string,
		callback: (newValue: unknown, oldValue: unknown) => void
	): () => void;
}

// process.type is Electron-injected at runtime. When electron types are loaded
// (src/main/ scope) it is declared; when not (src/utilities/ scope alone), plain
// @types/node does not declare it. Cast through a loose shape to work in both.
let configInstance: ConfigShape;
if ((process as { type?: string }).type === 'renderer') {
	configInstance = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		get(key: string): any {
			return ipcRenderer.sendSync('config:get', key);
		},
		set(key: string, value: unknown): void {
			ipcRenderer.sendSync('config:set', { key, value });
		},
		onDidChange(
			key: string,
			callback: (newValue: unknown, oldValue: unknown) => void
		): () => void {
			const channel = `config:changed:${key}`;
			const handler = (
				_event: unknown,
				newValue: unknown,
				oldValue: unknown
			) => {
				callback(newValue, oldValue);
			};

			ipcRenderer.on(channel, handler);

			return () => {
				ipcRenderer.removeListener(channel, handler);
			};
		},
	};
} else {
	// Main-process Store construction. If an existing config.json is corrupt
	// (bad JSON), electron-store throws during parse — delete the file and retry
	// so first-run/fresh-install scenarios don't fail. ENOENT on unlink is
	// expected when the file simply doesn't exist yet, so swallow it.
	try {
		configInstance = new Store({ schema });
	} catch {
		try {
			const { app } = require('electron');
			fs.unlinkSync(path.join(app.getPath('userData'), 'config.json'));
		} catch (unlinkErr: unknown) {
			if ((unlinkErr as NodeJS.ErrnoException)?.code !== 'ENOENT') {
				throw unlinkErr;
			}
		}
		configInstance = new Store({ schema });
	}
}

export default configInstance;
