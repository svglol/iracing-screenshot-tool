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
	keepAspectRatio: {
		type: 'boolean',
		default: false,
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
		// The desktop-capture pipeline delivers chroma-subsampled (I420 4:2:0)
		// frames, so no encode format is truly pixel-accurate. JPEG at max quality
		// is the default (small files); PNG (lossless container) and WebP are
		// options in Settings.
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
	// Windows.Graphics.Capture path (#11): grabs true un-subsampled 8-bit RGBA
	// via the native addon instead of the desktopCapturer/getUserMedia pipeline
	// (which chroma-subsamples to I420 4:2:0). On by default (hardware-validated)
	// — transparently falls back to getUserMedia when WGC is unavailable (missing
	// addon / pre-1903 Windows) or on any capture fault, so enabling it by default
	// never regresses a machine that can't use it.
	nativeCapture: {
		type: 'boolean',
		default: true,
	},
	// --- Long exposure (docs/design/long-exposure.md) ---------------------
	// The last parameter set the user shot with, so re-opening the panel resumes
	// where they left off. The anchor is deliberately NOT persisted: it belongs to
	// a moment in a specific replay and is read fresh (or carried in the recipe for
	// a re-shoot).
	longExposureShutter: {
		type: 'string',
		default: '1/8',
	},
	// 0 = derive the playback speed from the sample target. Any other value pins it.
	longExposurePlaybackSpeed: {
		type: 'number',
		default: 0,
	},
	longExposureTargetSamples: {
		type: 'number',
		default: 240,
	},
	longExposureSupersample: {
		type: 'number',
		default: 1,
		enum: [1, 2],
	},
	// Optical-flow frame interpolation factor. 1 = off. Needs NVIDIA Turing-or-newer
	// hardware; on anything else the shot is simply taken without it, so persisting a
	// value here is safe even if the user later changes GPU.
	longExposureInterpolation: {
		type: 'number',
		default: 1,
		enum: [1, 2, 4, 8],
	},
	longExposureWeighting: {
		type: 'string',
		default: 'box',
		enum: ['box', 'linear', 'ease'],
	},
	longExposureTonemap: {
		type: 'string',
		default: 'none',
		enum: ['none', 'reinhard', 'aces'],
	},
	// Exposure compensation in stops, applied in linear space before tonemapping.
	longExposureExposureCompensation: {
		type: 'number',
		default: 0,
	},
	// png16 is the 16-bit master (written by our own encoder — sharp reduces 16-bit
	// to 8 before encoding). The others produce an 8-bit file only.
	longExposureFormat: {
		type: 'string',
		default: 'png16',
		enum: ['png16', 'png', 'jpeg', 'webp'],
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
	} catch (parseErr) {
		// config.json is corrupt (bad JSON). Record the corruption + reset BEFORE
		// wiping the file so this isn't silent data loss (obs-error-visibility#4).
		// Lazy require: config.ts also loads in the renderer, so never trigger
		// logger init() at module load — only on an actual corruption event.
		try {
			const { createLogger } = require('../utilities/logger');
			createLogger('config').error(
				'config.json corrupt; deleting and resetting to defaults',
				{ error: (parseErr as Error)?.message || String(parseErr) }
			);
		} catch {
			// Logger unavailable — proceed with the reset regardless.
		}
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
