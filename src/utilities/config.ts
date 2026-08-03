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
	// Whether the long-exposure panel is folded away in the sidebar. Collapsed by
	// default: it is a replay-only mode with a dozen parameters sitting under the
	// everyday still-capture controls, so unfolded-by-default makes the sidebar read
	// as cluttered to someone who only wants a screenshot.
	longExposureCollapsed: {
		type: 'boolean',
		default: true,
	},
	// Whether the panel's Advanced group is unfolded. Separate from the panel fold
	// so opening the panel does not drag seven tuning controls back onto the screen.
	longExposureAdvancedOpen: {
		type: 'boolean',
		default: false,
	},
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
	// NOTE: longExposureSupersample was REMOVED 2026-08-03. It rendered at 2x and
	// box-downsampled at resolve, which bought antialiasing at 4x the VRAM and
	// roughly half the sample count — a losing trade on the moving subjects this
	// feature exists for. A stored value is simply ignored; picking a higher
	// Resolution is the replacement.
	// Optical-flow frame interpolation factor. 1 = off. Needs NVIDIA Turing-or-newer
	// hardware; on anything else the shot is simply taken without it, so persisting a
	// value here is safe even if the user later changes GPU.
	longExposureInterpolation: {
		type: 'number',
		default: 1,
		enum: [1, 2, 4, 8],
	},
	// How many times the exposure window is visited, accumulating into one buffer.
	// 1 = an ordinary capture. Costs N times the wall clock and buys roughly N times
	// the real samples, so it pays for short shutters and is unaffordable for long
	// ones — which is why it persists but the panel keeps quoting the total wait.
	longExposurePasses: {
		type: 'number',
		default: 1,
		minimum: 1,
		maximum: 16,
	},
	longExposureWeighting: {
		type: 'string',
		default: 'box',
		enum: ['box', 'linear', 'ease'],
	},
	// NOTE: there is deliberately no longExposureFormat,
	// longExposureExposureCompensation or longExposureTonemap key. The output format
	// comes from `outputFormat` above — one format setting for stills and long
	// exposures both, with PNG there meaning the 16-bit master. Exposure
	// compensation and tonemap are still recipe fields (an old sidecar carrying
	// either still reproduces exactly), but nothing in the UI sets them, so
	// persisting them would only preserve a value no control can change back.
	//
	// Highlight recovery in stops, applied to near-clipped values BEFORE
	// accumulation. 0 = off (and exactly identity). Needs no particular hardware.
	longExposureHighlightRecovery: {
		type: 'number',
		default: 0,
	},
	// Learned, not configured: the smallest interpolation load (render megapixels x
	// factor) at which THIS machine has been observed to fall behind the sim and lose
	// real samples. 0 = no evidence yet, and no warning is shown.
	//
	// Measured rather than hard-coded because where interpolation stops being free
	// depends entirely on the GPU — a threshold calibrated on one card would be wrong
	// on every other.
	longExposureLossyInterpolationLoad: {
		type: 'number',
		default: 0,
	},
};

interface ConfigShape {
	// `any` on purpose: this is electron-store's own accessor, which is keyed by
	// string across a schema of mixed types, and every call site narrows it. The
	// directive has to sit on THIS line — one line higher it suppresses nothing and
	// eslint --fix removes it as unused.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
