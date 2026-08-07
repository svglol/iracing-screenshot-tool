import { productName, build } from '../../package.json';
import { autoUpdater } from 'electron-updater';
import {
	app,
	BrowserWindow,
	screen,
	globalShortcut,
	Menu,
	ipcMain,
	dialog,
	desktopCapturer,
	nativeImage,
} from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// read-ini-file has no @types/* published upstream; keep CommonJS require so we
// can avoid a namespace-import mismatch. The loadIniFile.sync path is the only
// API we call.
const loadIniFile = require('read-ini-file');

import configModule from '../utilities/config';
import * as irsdk from './iracing-sdk';
import {
	resizeIracingWindow,
	resizeIracingWindowAsync,
	getIracingWindowDetails,
	getIracingWindowSizeNative,
	getIracingExclusiveFullscreenState,
	QUNS_RUNNING_D3D_FULL_SCREEN,
} from './window-utils';
import { getVramInfo } from './vram-utils';
import {
	decideCaptureBackend,
	classifyWgcResult,
	decideLongExposureAvailability,
} from './capture-decisions';
import {
	captureIracingWindowNative,
	getLastNativeFailureReason,
	getWgcSupport,
	getWgcUnavailableReason,
	isWgcAvailable,
	verifyWgcCapture,
} from './wgc-capture';
import {
	getLongExposureApi,
	getLongExposureAvailability,
} from './long-exposure/long-exposure-native';
import {
	ReplayController,
	readReplayState,
	tapeEndFrame,
	type ReplayState,
} from './long-exposure/replay-control';
import {
	executeRecipe,
	SAMPLE_SHORTFALL_RATIO,
} from './long-exposure/capture-session';
import { writeLongExposure } from './long-exposure/output';
import {
	createDefaultRecipe,
	longExposureFormatForStillFormat,
	normalizeRecipe,
	resolvePlan,
	validatePlan,
	type LongExposureRecipe,
} from '../utilities/long-exposure/shot-recipe';
import { resolveCaptureDimensions } from '../utilities/capture-resolution';
import { describeSampleStats } from '../utilities/long-exposure/sample-stats';
import sharp from 'sharp';
import { DEFAULT_FORMAT } from '../utilities/filenameFormat';
import {
	buildUniqueScreenshotName,
	resolveCropRect,
	getOutputExtension,
} from '../utilities/screenshot-output';
import { createLogger } from '../utilities/logger';
const log = createLogger('main');
import {
	normalizeWindowHandle,
	normalizeWindowTitle,
	normalizeCaptureBounds,
	findSourceByWindowHandles,
	findSourceByWindowTitle,
	findSourceByKnownIracingTitle,
	findDisplaySourceByDisplayId,
} from '../utilities/desktop-capture';
import {
	mergePlainObjects,
	serializeDisplay,
	summarizeDesktopSource,
	summarizeDesktopSources,
	createScreenshotErrorPayload,
	getReshadeScreenshotFolder,
	normalizeFileKey,
	parseCameraState as parseCameraStateFromArray,
} from './main-utils';
import {
	applyUpdateEvent,
	canInstallNow,
	canStartDownload,
	initialUpdateState,
	shouldCheckNow,
	UPDATE_POLL_INTERVAL_MS,
	type UpdateEvent,
	type UpdateState,
} from '../utilities/update-decisions';
import { detectLocale, setLocale, t } from '../utilities/i18n';

// Language, resolved once at startup and re-applied whenever the setting changes.
//
// Main has to hold this itself rather than leaving it to the renderer: the
// long-exposure validation warnings, the capture refusals and the WGC support
// sentence are all phrased HERE and sent over IPC as finished text.
//
// app.getPreferredSystemLanguages() is the ordered list Windows itself would use,
// so a user whose display language is Portuguese but whose second preference is
// Spanish gets Spanish rather than English if we ever drop pt.
function initLocale(): void {
	const stored = configModule.get('locale');
	const resolved = setLocale(
		stored || detectLocale(app.getPreferredSystemLanguages())
	);
	// Write the RESOLVED code back on first run, so 'pt-BR' settles to 'pt' once
	// instead of being re-resolved on every launch — and so the Settings dropdown
	// has a value to show as selected.
	if (stored !== resolved) {
		configModule.set('locale', resolved);
	}
	log.info('Locale resolved', { stored: stored || null, locale: resolved });
}

let width: number;
let height: number;
let left: number;
let top: number;
let takingScreenshot = false;
let originalWindowBounds: {
	handle: string;
	title: string;
	left: number;
	top: number;
	width: number;
	height: number;
} | null = null;
let cameraState = 0;
// #10: the raw QUERY_USER_NOTIFICATION_STATE sampled at the last capture's
// pre-flight, stashed so the black-frame error path can enrich its message even
// when pre-capture attribution failed (state was 3 but iRacing wasn't foreground,
// e.g. the multi-monitor case). null = not sampled / not applicable.
let lastCaptureFullscreenState: number | null = null;
// electron-store v5 dynamic schema; typed `any` on purpose per D-12-01
let config: any;
let mainWindow: BrowserWindow | null;
let workerWindow: BrowserWindow | null;
let workerReady = false;
// Last iRacing readiness value replied to the renderer's status heartbeat, so the
// false->true self-heal edge (commit 07f8182) is logged once instead of on every
// poll (obs-lifecycle-telemetry#3).
let lastIracingStatusReply: boolean | null = null;
let cancelReshadeWait: ((reason: string) => void) | null = null;
// Backstop timer for the non-ReShade capture path: if the worker never posts
// back (screenshot-finished/response/error), force-restore so the app can't
// wedge with iRacing stuck resized + UI hidden.
let captureWatchdog: ReturnType<typeof setTimeout> | null = null;
let pendingCaptureAbort: ReturnType<typeof setTimeout> | null = null;
// Kept strictly GREATER than waitForReshadeScreenshot's own 30000ms timeout: the
// watchdog is armed the instant takingScreenshot flips (before the ReShade branch),
// so on a genuine ReShade timeout its own wait must win the race and surface the
// accurate "Timed out waiting for a ReShade screenshot" — not the watchdog's
// worker-oriented "the capture worker did not respond". The reshade catch's
// restoreScreenshotState() clears this watchdog before the 35s mark. The extra 5s
// still nets a truly hung resize on any path.
const CAPTURE_WATCHDOG_MS = 35000;
const CAPTURE_ABORT_DEBOUNCE_MS = 400;
// getUserMedia desktop-capture caps width/height at 10000 (Worker.vue), so
// requesting larger can never converge on the dim-match — bound requests here.
const MAX_CAPTURE_DIMENSION = 10000;
// #11 WGC native capture: settle delay after the resize so iRacing presents a
// frame at the new size before the grab; hard cap on the (synchronous) native
// grab; and the all-black brightness floor shared with the renderer's detector.
const WGC_SETTLE_MS = 250;
const WGC_TIMEOUT_MS = 1500;
const WGC_BLACK_FRAME_MAX_BRIGHTNESS = 24;
const appId = build?.appId || 'com.svglol.iracing-screenshot-tool';

// #11 diagnostics (observability-only): a snapshot of the most recent WGC capture
// attempt, surfaced in the failure-time diagnostics so a user log can distinguish
// the WGC fallback triggers (H1 timeout/no-frame vs H2 D3D/VRAM alloc fail) and
// prove whether WGC was engaged at all. Written by captureAndSaveViaWgc; read by
// buildMainScreenshotDiagnostics. This mirrors state — it NEVER influences the
// capture/fallback flow, timeouts, or the display path.
interface WgcAttemptDiagnostics {
	// 'not-attempted' = WGC was not selected this capture (nativeCapture off or
	// isWgcAvailable() false); 'attempted' = WGC was selected and is in-flight (set
	// before the settle delay, so a disconnect mid-settle is attributed to WGC, not
	// 'not-attempted'); 'saved'/'fallback'/'aborted' mirror the resolved WGC outcome.
	outcome: 'not-attempted' | 'attempted' | 'saved' | 'fallback' | 'aborted';
	// Exact fallback reason: the native error string (from getLastNativeFailureReason),
	// 'black-frame', or 'pre-save-throw: ...'. null when the attempt did not fall back.
	fallbackReason: string | null;
	// Wall time of the native grab call in ms (null if the grab wasn't reached).
	grabElapsedMs: number | null;
	// Dimensions of the frame WGC returned (null if no frame arrived).
	frameDims: { width: number; height: number } | null;
}
let lastWgcAttempt: WgcAttemptDiagnostics = {
	outcome: 'not-attempted',
	fallbackReason: null,
	grabElapsedMs: null,
	frameDims: null,
};
// VRAM sampled at capture START — before iRacing can free its VRAM on an OOM exit
// — so the disconnect diagnostic reports the pre-exit usage instead of the freed,
// misleadingly-low reading getVramInfo() returns after iRacing is gone
// (obs-capture-diagnostics#3). It is a pre-RESIZE baseline (sampled before the
// window is grown to capture resolution), so it proves iRacing was consuming VRAM
// before exit — it does NOT capture the high-res allocation peak.
let captureStartVram: Record<string, unknown> | null = null;
function resetWgcAttemptDiagnostics(): void {
	lastWgcAttempt = {
		outcome: 'not-attempted',
		fallbackReason: null,
		grabElapsedMs: null,
		frameDims: null,
	};
	captureStartVram = null;
}

// The subset of the resize-screenshot request payload the capture paths read.
// The IPC handler itself keeps `data: any` (it mutates/clamps fields), but the
// extracted helpers take this typed view.
interface CaptureRequestData {
	width: number;
	height: number;
	targetWidth?: number | null;
	targetHeight?: number | null;
	crop: boolean;
	cropTopLeft?: boolean;
}

app.name = productName;
app.commandLine.appendSwitch('js-flags', '--expose_gc');
// @ts-expect-error — ELECTRON_DISABLE_SECURITY_WARNINGS typed as string | undefined; legacy assignment preserved
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = false;

// Process-level crash safety nets (obs-error-visibility#1). Registered at module
// load so an unhandled throw/rejection in the main process — or a GPU/utility
// child-process death — lands in app.log (the only field-diagnostic surface)
// instead of dying or wedging silently. Log-only and deliberately NON-fatal: they
// do not re-throw/exit, so the capture watchdog + disconnect-abort recovery paths
// keep running (see cq-main-index#2, where a timer-callback fs throw would
// otherwise kill the process mid-recovery). NOTE: this suppresses Node/Electron's
// default crash-on-uncaught / crash-on-unhandled-rejection behaviour — an
// intentional trade for observability + those recovery paths surviving.
process.on('uncaughtException', (error) => {
	log.error('Uncaught exception in main process', {
		message: error?.message || String(error),
		stack: error?.stack,
	});
});
process.on('unhandledRejection', (reason) => {
	const err = reason instanceof Error ? reason : null;
	log.error('Unhandled promise rejection in main process', {
		message: err ? err.message : String(reason),
		stack: err?.stack,
	});
});
// GPU-process OOM/crash is a first-class failure mode for this VRAM-heavy capture
// app, distinct from a renderer JS crash. child-process-gone is the modern superset
// of the deprecated gpu-process-crashed (covers GPU + Utility + Zygote).
app.on('child-process-gone', (_event, details) => {
	log.error('Child process gone', {
		type: details.type,
		reason: details.reason,
		exitCode: details.exitCode,
		serviceName: details.serviceName,
		name: details.name,
	});
});

function createWindowIcon() {
	// `process.resourcesPath` is set by Electron in BOTH dev and packaged modes
	// (it points at the framework's resources dir in dev, e.g.
	// `node_modules/electron/dist/resources/`, which doesn't contain `icon.png`).
	// Use `app.isPackaged` to discriminate, and `app.getAppPath()` to anchor at
	// the project root in dev (electron-vite doesn't emit `out/static/`).
	const iconPath = app.isPackaged
		? path.join(process.resourcesPath, 'icon.png')
		: path.join(app.getAppPath(), 'static', 'icon.png');
	const icon = nativeImage.createFromPath(iconPath);
	if (icon.isEmpty()) {
		log.info('Window icon not loaded', { iconPath });
		return undefined;
	}
	return icon;
}

const windowIcon = createWindowIcon();

const gotTheLock = app.requestSingleInstanceLock();
const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.argv.includes('--debug');
const iracing = irsdk.getInstance();

if (!isDev) {
	if (gotTheLock) {
		app.on('second-instance', () => {
			if (mainWindow && mainWindow.isMinimized()) {
				mainWindow.restore();
			}

			if (mainWindow) {
				mainWindow.focus();
			}
		});
	} else {
		app.quit();
		process.exit(0);
	}
} else {
	// electron-debug@4 is pure ESM and dropped the dev-tools extension
	// installation path that used to call the deprecated
	// session.getAllExtensions API. Load it via dynamic import so the call
	// works from main's CJS bundle; keyboard shortcuts attach async but
	// that's fine — they bind before the user can press anything.
	void import('electron-debug').then(({ default: electronDebug }) => {
		electronDebug({ showDevTools: false });
	});
}

function broadcastToWindows(channel: string, ...args: unknown[]): void {
	[mainWindow, workerWindow].forEach((window) => {
		if (window && !window.isDestroyed()) {
			window.webContents.send(channel, ...args);
		}
	});
}

// Bring OUR window back to the front. A capture deliberately raises iRacing
// (resizeIracingWindowAsync -> BringWindowToTop + SetForegroundWindow) so the
// compositor renders it for the grab; without this the user is left staring at
// the sim after a shot that finished minutes ago, with the result, its warnings
// and the gallery all behind it.
//
// A bare focus() is not enough on Windows. Having handed the foreground away
// ourselves, we are subject to the foreground lock (SetForegroundWindow's
// caller must own the foreground or the last input event), and the call
// degrades to a taskbar flash. Flipping topmost on and straight back off raises
// the window through the lock via SetWindowPos and leaves it at the top of the
// normal (non-topmost) Z-order, so the app does not become a permanently
// always-on-top window.
function focusAppWindow(): void {
	if (!mainWindow || mainWindow.isDestroyed()) {
		return;
	}
	try {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		const wasAlwaysOnTop = mainWindow.isAlwaysOnTop();
		mainWindow.setAlwaysOnTop(true);
		mainWindow.show();
		mainWindow.focus();
		if (!wasAlwaysOnTop) {
			mainWindow.setAlwaysOnTop(false);
		}
	} catch (error) {
		// Never let a focus courtesy fail a capture that already succeeded.
		log.debug('Could not return focus to the app window', {
			error: (error as Error)?.message || String(error),
		});
	}
}

function getConfigDiagnosticValue(key: string): unknown {
	if (!config) {
		return undefined;
	}

	try {
		return config.get(key);
	} catch (error) {
		return `[config read failed: ${(error as Error).message}]`;
	}
}

// #11 diagnostics (observability-only): which capture backend was selected/attempted
// and, on a WGC fallback, exactly WHY — so a user's failure log distinguishes H1
// (WGC timeout / no-frame) from H2 (D3D/VRAM alloc fail) and proves whether WGC was
// even engaged. Every field fails open: an unreadable value logs null, never throws.
function getCaptureBackendDiagnostics(): Record<string, unknown> {
	let wgcAvailable: boolean | null;
	try {
		wgcAvailable = isWgcAvailable();
	} catch {
		wgcAvailable = null;
	}

	// Optional VRAM snapshot to test H2. getVramInfo is fully fail-open (returns a
	// 'fallback'-classed value on any failure) but wrap it anyway so the diagnostics
	// path can never be taken down by an FFI hiccup.
	let vram: unknown = null;
	try {
		const info = getVramInfo();
		vram = {
			totalBytes: info.totalBytes,
			usedBytes: info.usedBytes,
			source: info.source,
			adapterName: info.adapterName,
		};
	} catch {
		vram = null;
	}

	return {
		// Why WGC was / wasn't engaged.
		nativeCapture: getConfigDiagnosticValue('nativeCapture'),
		wgcAvailable,
		// The concrete reason WGC is unavailable (null when available), so a bare
		// wgcAvailable:false is no longer a dead end (obs-capture-diagnostics#2).
		wgcUnavailableReason: (() => {
			try {
				return getWgcUnavailableReason();
			} catch {
				return null;
			}
		})(),
		// The most recent WGC attempt for this capture request.
		wgcOutcome: lastWgcAttempt.outcome,
		wgcFallbackReason: lastWgcAttempt.fallbackReason,
		wgcGrabElapsedMs: lastWgcAttempt.grabElapsedMs,
		wgcFrameDims: lastWgcAttempt.frameDims,
		// Live reading — may read FREED VRAM if iRacing has already exited (the OOM
		// disconnect path fires reportScreenshotError only once telemetry is null).
		vram,
		// Pre-exit snapshot taken at capture start, so the disconnect diagnostic
		// carries usage that actually supports the OOM hypothesis (obs-capture-diagnostics#3).
		vramAtCaptureStart: captureStartVram,
	};
}

function buildMainScreenshotDiagnostics() {
	const cpus = os.cpus() || [];
	const displays = screen.getAllDisplays().map(serializeDisplay);

	return {
		app: {
			productName,
			version: app.getVersion(),
			isPackaged: app.isPackaged,
			processType: process.type || 'browser',
			electron: String(process.versions.electron || ''),
			chrome: String(process.versions.chrome || ''),
			node: String(process.versions.node || ''),
			v8: String(process.versions.v8 || ''),
			exePath: app.getPath('exe'),
			appPath: app.getAppPath(),
			userDataPath: app.getPath('userData'),
		},
		system: {
			platform: process.platform,
			arch: process.arch,
			release: os.release(),
			version: typeof os.version === 'function' ? os.version() : '',
			hostname: os.hostname(),
			totalMemory: os.totalmem(),
			freeMemory: os.freemem(),
			cpuModel: String(cpus[0]?.model || ''),
			cpuCount: cpus.length,
			uptimeSeconds: Math.round(os.uptime()),
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
			locale: typeof app.getLocale === 'function' ? app.getLocale() : '',
		},
		displays: {
			count: displays.length,
			primary: serializeDisplay(screen.getPrimaryDisplay()),
			all: displays,
		},
		screenshot: {
			takingScreenshot,
			workerReady,
			activeCaptureArea: { width, height, left, top },
			config: {
				crop: getConfigDiagnosticValue('crop'),
				reshade: getConfigDiagnosticValue('reshade'),
				screenshotFolder: getConfigDiagnosticValue('screenshotFolder'),
				reshadeFile: getConfigDiagnosticValue('reshadeFile'),
				defaultScreenWidth: getConfigDiagnosticValue('defaultScreenWidth'),
				defaultScreenHeight: getConfigDiagnosticValue(
					'defaultScreenHeight'
				),
				defaultScreenLeft: getConfigDiagnosticValue('defaultScreenLeft'),
				defaultScreenTop: getConfigDiagnosticValue('defaultScreenTop'),
			},
			iracing: {
				telemetryReady: Boolean(iracing.telemetry),
				sessionInfoReady: Boolean(iracing.sessionInfo),
				window: getIracingWindowDetails() || null,
			},
			captureBackend: getCaptureBackendDiagnostics(),
		},
	};
}

function getMainScreenshotDiagnostics(): Record<string, unknown> {
	try {
		return buildMainScreenshotDiagnostics();
	} catch (error) {
		return {
			diagnosticsError: (error as Error).message || String(error),
		};
	}
}

function getScreenshotErrorLogPath(): string {
	return path.join(app.getPath('userData'), 'logs', 'screenshot-errors.log');
}

function writeScreenshotErrorLog(payload: {
	source?: string;
	context?: string;
	message?: string;
	meta?: Record<string, unknown>;
	diagnostics?: Record<string, unknown>;
	stack?: string;
}): string {
	const logPath = getScreenshotErrorLogPath();
	fs.mkdirSync(path.dirname(logPath), { recursive: true });

	const lines = [
		`[${new Date().toISOString()}] Screenshot failure`,
		`Source: ${payload.source || 'unknown'}`,
		`Context: ${payload.context || 'unknown'}`,
		`Message: ${payload.message || 'Unknown screenshot error'}`,
	];

	if (payload.meta && Object.keys(payload.meta).length > 0) {
		lines.push('Meta:');
		lines.push(JSON.stringify(payload.meta, null, 2));
	}

	if (payload.diagnostics && Object.keys(payload.diagnostics).length > 0) {
		lines.push('Diagnostics:');
		lines.push(JSON.stringify(payload.diagnostics, null, 2));
	}

	if (payload.stack) {
		lines.push('Stack:');
		lines.push(payload.stack);
	}

	lines.push('');

	fs.appendFileSync(logPath, `${lines.join('\n')}\n`, 'utf8');
	return logPath;
}

// #10: shown by the pre-capture early-exit, where we KNOW (state 3 + attributed)
// iRacing is the exclusive-fullscreen app — the one deterministic, actionable
// cause of a black capture.
// Functions, not constants. A module-scope const is evaluated at import time,
// which is before `app.on('ready')` has resolved the locale — it would freeze
// English into every one of these before the language was even known.
const EXCLUSIVE_FULLSCREEN_MESSAGE = (): string =>
	t('capture.exclusiveFullscreen');

// Softer variant for the black-frame backstop. Enrichment below only runs when
// the pre-flight saw state 3 but could NOT attribute it to iRacing (an
// attributed hit would have early-exited), and SHQueryUserNotificationState is
// session-global — so some OTHER app could be the fullscreen one. Word it as a
// likely cause, not a fact.
const EXCLUSIVE_FULLSCREEN_MESSAGE_UNATTRIBUTED = (): string =>
	t('capture.exclusiveFullscreenUnattributed');

// If a worker error is the generic "captured frame is black" AND the last
// pre-flight saw exclusive fullscreen (state 3), rewrite it to the actionable
// guidance. This path is only reached when attribution failed (an attributed hit
// early-exits before capture), so it uses the softer, non-committal message.
function enrichBlackFrameError(data: unknown): unknown {
	if (lastCaptureFullscreenState !== QUNS_RUNNING_D3D_FULL_SCREEN) {
		return data;
	}
	const message =
		data && typeof data === 'object'
			? (data as { message?: unknown }).message
			: null;
	if (typeof message === 'string' && message.toLowerCase().includes('black')) {
		return {
			...(data as object),
			message: EXCLUSIVE_FULLSCREEN_MESSAGE_UNATTRIBUTED(),
		};
	}
	return data;
}

function reportScreenshotError(
	errorLike: unknown,
	defaults: {
		source?: string;
		context?: string;
		meta?: Record<string, unknown>;
		diagnostics?: Record<string, unknown>;
	} = {}
) {
	const payload = createScreenshotErrorPayload(errorLike, {
		...defaults,
		diagnostics: mergePlainObjects(defaults.diagnostics, {
			main: getMainScreenshotDiagnostics(),
		}),
	});
	// Guard the synchronous fs write: reportScreenshotError runs inside the
	// watchdog and disconnect-abort setTimeout callbacks, so a disk error
	// (ENOSPC/EACCES) here would become a process-killing uncaught exception
	// during recovery. Best-effort — the renderer error still surfaces.
	let logFile: string | undefined;
	try {
		logFile = writeScreenshotErrorLog(payload);
	} catch (error) {
		log.error('Failed to write screenshot error log', {
			error: (error as Error)?.message || String(error),
		});
	}
	const rendererPayload = { ...payload, logFile };

	console.error('Screenshot error:', rendererPayload.message);
	if (rendererPayload.stack) {
		console.error(rendererPayload.stack);
	}

	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send('screenshot-error', rendererPayload);
	}

	return rendererPayload;
}

// Wire renderer crash / hang / load-failure diagnostics onto a window's
// webContents so a silent renderer death finally leaves a durable app.log line
// (obs-lifecycle-telemetry#5). For the worker, a render-process-gone ALSO flips
// workerReady=false — an intentional stale-state correction (NOT purely log-only):
// on a pure renderer crash 'closed' never fires, so without this the gate stays
// stale-true from did-finish-load and the next capture is dispatched to a dead
// worker and hangs until the 30s watchdog; with it, the capture is rejected
// immediately with a logged crash cause.
function attachRenderProcessDiagnostics(
	win: BrowserWindow,
	label: 'worker' | 'main'
): void {
	const wc = win.webContents;
	wc.on('render-process-gone', (_event, details) => {
		log.error('Renderer process gone', {
			window: label,
			reason: details.reason,
			exitCode: details.exitCode,
		});
		if (label === 'worker') {
			workerReady = false;
		}
	});
	wc.on('unresponsive', () => {
		log.warn('Renderer unresponsive', { window: label });
	});
	wc.on('responsive', () => {
		log.info('Renderer responsive again', { window: label });
	});
	wc.on(
		'did-fail-load',
		(_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
			// Ignore sub-frame failures and ERR_ABORTED (-3) so dev-HMR/navigation
			// churn doesn't spam ERROR lines.
			if (!isMainFrame || errorCode === -3) {
				return;
			}
			log.error('Renderer failed to load', {
				window: label,
				errorCode,
				errorDescription,
				url: validatedURL,
			});
		}
	);
}

// Whether a navigation target is the app's OWN origin: the electron-vite dev
// server when running under `npm run dev`, else the packaged file:// bundle. Used
// to gate will-navigate so a legitimate reload/initial load is never blocked.
function isSameOriginAsApp(target: string): boolean {
	try {
		const url = new URL(target);
		const devUrl = process.env.ELECTRON_RENDERER_URL;
		if (devUrl) {
			return url.origin === new URL(devUrl).origin;
		}
		// Packaged build: the renderer is loaded from a file:// path.
		return url.protocol === 'file:';
	} catch {
		// Unparseable target — treat as off-origin and deny.
		return false;
	}
}

// Lock a window down against navigation-based attacks (cq-electron-security#3). A
// compromised/injected renderer could otherwise navigate the window to an attacker
// origin or spawn new BrowserWindows. This app never legitimately does either:
// external links open in the OS browser via shell.openExternal (not an in-app
// window), and all in-app routing is client-side vue-router (history.pushState,
// which does NOT fire will-navigate). So: deny every window.open, and deny any
// full-page navigation that leaves the app's own origin. The initial loadURL/
// loadFile is not a "navigation" and is unaffected. Observability via log.warn.
function hardenWindow(win: BrowserWindow, label: 'worker' | 'main'): void {
	win.webContents.setWindowOpenHandler(({ url }) => {
		log.warn('Blocked renderer window.open', { window: label, url });
		return { action: 'deny' };
	});
	win.webContents.on('will-navigate', (event, url) => {
		if (!isSameOriginAsApp(url)) {
			event.preventDefault();
			log.warn('Blocked off-origin renderer navigation', {
				window: label,
				url,
			});
		}
	});
}

function createWindow(): void {
	log.info('Creating worker window');
	workerWindow = new BrowserWindow({
		show: isDev,
		icon: windowIcon,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			backgroundThrottling: false,
			webSecurity: false,
		},
	});

	hardenWindow(workerWindow, 'worker');
	attachRenderProcessDiagnostics(workerWindow, 'worker');

	workerWindow.webContents.on('did-finish-load', () => {
		workerReady = true;
		log.info('Worker window ready', { workerReady: true });
	});

	workerWindow.on('closed', () => {
		workerReady = false;
		log.info('Worker window closed', { workerReady: false });
	});

	if (process.env.ELECTRON_RENDERER_URL) {
		workerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/worker`);
	} else {
		workerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
			hash: '/worker',
		});
		// global.__static is a legacy Vue-CLI static-assets bridge; Phase 13 removes.
		// Untyped global assignment — accepted under noImplicitAny: false (Phase 12 transitional).
		global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
	}

	log.info('Creating main window');
	mainWindow = new BrowserWindow({
		title: app.name,
		show: false,
		x: config.get('winPosX'),
		y: config.get('winPosY'),
		width: config.get('winWidth'),
		height: config.get('winHeight'),
		minWidth: 1100,
		minHeight: 655,
		backgroundColor: '#252525',
		frame: false,
		icon: windowIcon,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			webSecurity: false,
		},
	});

	hardenWindow(mainWindow, 'main');
	Menu.setApplicationMenu(null);
	attachRenderProcessDiagnostics(mainWindow, 'main');

	if (process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
		// global.__static is a legacy Vue-CLI static-assets bridge; Phase 13 removes.
		// Untyped global assignment — accepted under noImplicitAny: false (Phase 12 transitional).
		global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
	}

	mainWindow.on('ready-to-show', () => {
		if (mainWindow) {
			mainWindow.show();
			mainWindow.focus();
		}
	});

	// Coming back to the app is the moment a stale answer is most likely and most
	// worth refreshing — the user has probably been in iRacing for a while. Cheap
	// because shouldCheckNow rations it to the same six-hour policy as the timer, so
	// alt-tabbing between the sim and here cannot turn into a request per switch.
	mainWindow.on('focus', () => {
		runUpdateCheck();
	});

	mainWindow.on('close', () => {
		clearPendingReshadeWait('Application closing');
		restoreScreenshotState();

		if (workerWindow && !workerWindow.isDestroyed()) {
			workerWindow.close();
		}

		if (mainWindow) {
			const bounds = mainWindow.getBounds();
			config.set('winPosX', bounds.x);
			config.set('winPosY', bounds.y);
			config.set('winWidth', bounds.width);
			config.set('winHeight', bounds.height);
		}
	});

	mainWindow.on('closed', () => {
		log.info('App exiting');
		console.log('\nApplication exiting...');
	});
}

ipcMain.on('config:get', (event, key: string) => {
	event.returnValue = config.get(key);
});

ipcMain.on('config:set', (event, payload: { key: string; value: unknown }) => {
	const oldValue = config.get(payload.key);
	config.set(payload.key, payload.value);
	event.returnValue = true;

	if (oldValue !== payload.value) {
		log.debug('Config changed', { key: payload.key });
		// Main phrases user-facing text of its own, so it has to re-language
		// itself — not just tell the windows to. Done before the broadcast so a
		// renderer that reacts by immediately asking main for something already
		// gets the new language.
		if (payload.key === 'locale') {
			setLocale(payload.value);
		}
		broadcastToWindows(
			`config:changed:${payload.key}`,
			payload.value,
			oldValue
		);
	}
});

ipcMain.on(
	'app:getPath-sync',
	(event, name: Parameters<typeof app.getPath>[0]) => {
		event.returnValue = app.getPath(name);
	}
);

ipcMain.on('app:isDevBuild-sync', (event) => {
	event.returnValue = !app.isPackaged || app.getVersion().includes('+');
});

ipcMain.handle(
	'dialog:showOpen',
	(event, options: Electron.OpenDialogOptions) => {
		const browserWindow = BrowserWindow.fromWebContents(event.sender);
		return dialog.showOpenDialog(
			browserWindow || (undefined as unknown as BrowserWindow),
			options
		);
	}
);
// Live GPU VRAM (total + used) for the sidebar's headroom guardrail. koffi FFI
// runs main-side only; the renderer polls this (every few seconds) and does the
// pure prediction. Includes iRacing's current window size (physical px) as the
// delta baseline via the koffi-ONLY read — never getIracingWindowDetails(),
// whose PowerShell fallback would both block this synchronous handler on a
// spawnSync and return DPI-scaled (DIP) coordinates that skew the prediction on
// scaled monitors. Skipped entirely unless we have a usable reading (native
// total + live usage), since without it the predictor fails open anyway.
ipcMain.handle('get-vram-info', () => {
	const vram = getVramInfo();
	const currentWindow =
		vram.source === 'native' && vram.usedBytes != null
			? getIracingWindowSizeNative()
			: null;
	return { ...vram, currentWindow };
});
// #10: iRacing exclusive-fullscreen state for the sidebar's proactive warning.
// koffi-only (never PowerShell), fails open to null. See window-utils.
ipcMain.handle('get-iracing-fullscreen-state', () =>
	getIracingExclusiveFullscreenState()
);
// #11: whether the WGC native-capture path loaded on this machine (addon present
// + the OS floors in decideWgcSupport). Settings uses this (sendSync) to disable
// the toggle on an unsupported system. Fails open in the loader, so a false here
// is definitive.
ipcMain.on('native-capture-available', (event) => {
	event.returnValue = isWgcAvailable();
});
// The same verdict plus the sentence explaining it, for the toggle's description.
ipcMain.on('native-capture-support', (event) => {
	event.returnValue = getWgcSupport();
});
// Pre-flight the High-Fidelity Capture toggle at the moment the user turns it ON.
//
// Two tiers, because they answer different questions. getWgcSupport() is what the
// OS advertises and is authoritative: if a required WinRT property is missing,
// every capture WILL fail, so the toggle is refused outright. The trial grab then
// proves a session really opens and delivers a frame, catching what no contract
// lookup can (wedged compositor, driver fault). A trial-grab failure is reported
// but does NOT refuse: it can fail for transient reasons, stills fall back on
// their own, and refusing on it would lock a working machine out of the feature.
//
// The app's own window is the target — it is on screen whenever Settings is open,
// it costs one small frame, and it needs iRacing to be running exactly never.
ipcMain.on('native-capture-verify', (event) => {
	const support = getWgcSupport();
	if (!support.supported) {
		log.warn('High-Fidelity Capture toggle refused', {
			reason: support.reason,
		});
		event.returnValue = { ...support, verified: false, verifyError: null };
		return;
	}

	let verified = false;
	let verifyError: string | null = null;
	try {
		const handle = mainWindow?.getNativeWindowHandle();
		if (!handle || handle.length < 4) {
			verifyError = 'no window handle available for the trial capture';
		} else {
			// HWND is pointer-sized; readUInt32LE is the low word, which is all a
			// window handle ever uses (it is a kernel index, not an address).
			const check = verifyWgcCapture(handle.readUInt32LE(0));
			verified = check.ok;
			verifyError = check.error;
		}
	} catch (error) {
		verifyError = (error as Error)?.message || String(error);
	}

	if (!verified) {
		log.warn('High-Fidelity Capture trial grab failed', {
			error: verifyError,
		});
	} else {
		log.info('High-Fidelity Capture verified');
	}
	event.returnValue = { ...support, verified, verifyError };
});

// ---------------------------------------------------------------------------
// Long-exposure photo mode
//
// See docs/design/long-exposure.md. The sim-facing parts (replay control, GPU
// accumulation, anchor restoration) live in main/long-exposure/; everything here
// is the bridge: guard against a concurrent capture, hand the session the same
// window/camera handling the still path uses, and write the result.
// ---------------------------------------------------------------------------

// Separate latch from `takingScreenshot` because a long exposure outlives the
// window restore: the file write happens after iRacing is already back to normal,
// and a second capture must not start in that gap.
let longExposureActive = false;
// The live abort signal for the running capture, so the UI can cancel. Abort is
// cooperative and unwinds through the same finally as any other exit, so the
// anchor is still restored.
let longExposureSignal: { aborted: boolean } | null = null;

// Replay control bound to the live SDK bridge. Every position/speed change the
// feature makes goes through here — broadcast messages only, never synthesised
// input or UI automation.
const replayController = new ReplayController({
	readState: () =>
		readReplayState(
			(iracing.telemetry?.values as Record<string, unknown>) || null
		),
	setPlaySpeed: (speed, slowMotion) =>
		iracing.sdk.changeReplaySpeed(speed, slowMotion),
	setPlayPosition: (mode, frame) =>
		iracing.sdk.changeReplayPosition(mode, frame),
	// Wrapped rather than passed by reference: `delay` is a const declared at the
	// end of this file, so referencing it directly here would hit its TDZ at module
	// evaluation time.
	delay: (ms) => delay(ms),
	now: () => Date.now(),
});

// Baseline recipe for a long exposure. The capture handler and the preview handler
// must derive it identically — if they drift, the panel previews a shot that is not
// the shot it takes.
function longExposureDefaults(live: ReplayState | null): LongExposureRecipe {
	// THE RESOLUTION SETTING, not the baseline window size.
	//
	// These used to be `width || 1920, height || 1080` — the module-level vars
	// holding `defaultScreenWidth`/`defaultScreenHeight`, i.e. the size iRacing's
	// window sits at when we are not capturing. That is a different thing that
	// merely looks like one, and it meant long exposure silently ignored the
	// Resolution control the still path obeys: '8k' with a 1680x945 window produced
	// 1680x945 long exposures, with nothing on screen to explain it. The window size
	// still matters here, but only as the aspect-ratio reference — which is exactly
	// the role it plays for stills.
	const dims = resolveCaptureDimensions({
		resolution: config.get('resolution'),
		customWidth: config.get('customWidth'),
		customHeight: config.get('customHeight'),
		screen: { width, height },
		keepAspectRatio: config.get('keepAspectRatio') === true,
	}) ?? { width: 1920, height: 1080 };

	return {
		...createDefaultRecipe({
			anchorFrame: live?.replayFrameNum ?? 0,
			sessionNum: live?.replaySessionNum ?? 0,
			width: dims.width,
			height: dims.height,
			outputDir: path.resolve(config.get('screenshotFolder')),
		}),
		// A long exposure saves the way a screenshot saves: one format setting, in
		// Settings, for both. PNG there means the 16-bit master, which is the only
		// format where accumulating in fp32 reaches disk at all — the panel used to
		// carry its own format select, which meant two places to set one thing.
		outputFormat: longExposureFormatForStillFormat(
			config.get('outputFormat')
		),
		// Crop Watermark, read from the SAME setting the still path obeys and for
		// the same reason as outputFormat above: it is one decision about how a shot
		// is saved, so it belongs in one place. The panel sends no crop field, so
		// this default is what a fresh shot uses; a recipe replayed from a sidecar
		// keeps whatever it recorded.
		crop: config.get('crop') === true,
		cropTopLeft: config.get('cropTopLeft') === true,
	};
}

// Availability of the compute backend + whether a shot can be set up right now.
// The renderer polls this to enable/disable the panel and explain why.
ipcMain.handle('long-exposure:availability', () => {
	const availability = getLongExposureAvailability();
	// The machine probe is cached for the session (neither the addon nor the driver
	// changes while we run), but the toggle can flip at any moment — so the gate is
	// composed per poll rather than folded into the cache.
	const gate = decideLongExposureAvailability({
		nativeCapture: config.get('nativeCapture') === true,
		machineAvailable: availability.available,
		machineReason: availability.reason,
	});
	const state = replayController.state();
	return {
		...availability,
		// The GATE, not the raw probe. The panel hides its controls on `available`,
		// and long exposure is native-WGC-only, so High-Fidelity Capture has to be
		// able to close it. `needsNativeCapture` is what lets the panel offer the
		// switch instead of wrongly declaring the machine incapable.
		available: gate.available,
		reason: gate.reason,
		needsNativeCapture: gate.needsNativeCapture,
		// Whether the sim is giving us a replay position to anchor on — NOT whether
		// the user has a replay open.
		//
		// This was called `inReplay`, which described a gate that does not exist:
		// `readReplayState` asks only for a finite ReplayFrameNum, and iRacing writes
		// its replay buffer continuously, so a LIVE session reports one too. Long
		// exposure works there, integrating over the frames just past. False here
		// means no telemetry at all.
		hasReplayData: state !== null,
		anchorFrame: state?.replayFrameNum ?? null,
		// The ABSOLUTE last frame of the tape, not the raw `ReplayFrameNumEnd`
		// countdown this used to forward — see `tapeEndFrame`. Handing a renderer a
		// field named like a position but holding a remaining-frames count is how the
		// refusal below it got written backwards in the first place.
		replayEndFrame: state ? tapeEndFrame(state) : null,
		sessionNum: state?.replaySessionNum ?? null,
		frameRate: state?.frameRate ?? null,
		busy: longExposureActive || takingScreenshot,
	};
});

// Cooperative cancel. Does NOT itself restore anything — the running capture's
// finally does that, which is the whole point of routing abort through the same
// unwind path as success.
ipcMain.handle('long-exposure:abort', () => {
	if (longExposureSignal) {
		longExposureSignal.aborted = true;
		log.info('Long exposure abort requested');
		return true;
	}
	return false;
});

ipcMain.handle('long-exposure:capture', async (event, rawRecipe: unknown) => {
	if (longExposureActive || takingScreenshot) {
		return {
			ok: false,
			failure: 'busy',
			message: t('longExposureCapture.busy'),
			warnings: [],
		};
	}

	// The same gate the renderer polls, re-checked here. The panel hides the button
	// when this is closed, but the IPC channel is reachable regardless of what the
	// renderer chose to draw, so main refuses rather than trusting it.
	const gate = decideLongExposureAvailability({
		nativeCapture: config.get('nativeCapture') === true,
		machineAvailable: getLongExposureAvailability().available,
		machineReason: getLongExposureAvailability().reason,
	});
	if (!gate.available) {
		return {
			ok: false,
			failure: 'backend-unavailable',
			message: gate.needsNativeCapture
				? t('longExposureCapture.needsNativeCapture')
				: gate.reason || t('longExposureCapture.unavailable'),
			warnings: [],
		};
	}

	const live = replayController.state();
	if (!live) {
		// See the note on `hasReplayData` above: this is "no telemetry", not "not in
		// a replay", and the message has to say the thing that would actually help.
		return {
			ok: false,
			failure: 'invalid-recipe',
			message: t('longExposureCapture.noTelemetry'),
			warnings: [],
		};
	}

	// #10: the same exclusive-fullscreen pre-flight the still path runs. WGC is
	// DWM-based, so exclusive fullscreen comes back black on this path too — and a
	// long exposure would burn the full playback duration before finding out.
	//
	// BEST-EFFORT ONLY on this path, and it will essentially never fire: the user
	// just clicked a button in OUR window, so `getIracingExclusiveFullscreenState`
	// cannot attribute the shell's fullscreen state to iRacing. It is kept because it
	// costs nothing and stashes `lastCaptureFullscreenState`; the sample that can
	// actually refuse is `exclusiveFullscreenRefusal` below, taken after the raise.
	const fullscreen = getIracingExclusiveFullscreenState();
	lastCaptureFullscreenState = fullscreen ? fullscreen.state : null;
	if (fullscreen && fullscreen.exclusiveFullscreen) {
		return {
			ok: false,
			failure: 'exclusive-fullscreen',
			message: EXCLUSIVE_FULLSCREEN_MESSAGE(),
			warnings: [],
		};
	}

	// The anchor comes from the recipe when the UI supplied one (a re-shoot reuses
	// the stored anchor), and from the live cursor only on a fresh shot.
	const recipe: LongExposureRecipe = normalizeRecipe(
		(rawRecipe as Partial<LongExposureRecipe>) || {},
		longExposureDefaults(live)
	);

	const signal = { aborted: false };
	longExposureSignal = signal;
	longExposureActive = true;
	takingScreenshot = true;
	originalWindowBounds = getIracingWindowDetails() || null;
	parseCameraState(
		(iracing.telemetry?.values as { CamCameraState?: string[] })
			?.CamCameraState
	);
	try {
		iracing.camControls.setState(
			cameraState | iracing.Consts.CameraState.UIHidden
		);
	} catch (error) {
		log.debug('Could not hide the iRacing UI for long exposure', {
			error: (error as Error)?.message || String(error),
		});
	}

	try {
		const outcome = await executeRecipe(recipe, {
			replay: replayController,
			native: getLongExposureApi(),
			backendName: getLongExposureAvailability().backend,
			backendUnavailableReason: getLongExposureAvailability().reason,
			resizeWindow: async (renderWidth, renderHeight) =>
				resizeIracingWindowAsync(renderWidth, renderHeight, left, top),
			// Reuse the still path's restore exactly, so a long exposure leaves
			// iRacing in the same state a normal screenshot would.
			restoreWindow: () => restoreScreenshotState(),
			// #10, re-sampled after the resize has raised iRacing — the only point on
			// this path where GetForegroundWindow attribution can succeed. Same
			// wording as the still path's early exit, deliberately: it is the same
			// condition and the same remedy.
			exclusiveFullscreenRefusal: () => {
				const raised = getIracingExclusiveFullscreenState();
				lastCaptureFullscreenState = raised ? raised.state : null;
				return raised && raised.exclusiveFullscreen
					? EXCLUSIVE_FULLSCREEN_MESSAGE()
					: null;
			},
			vramInfo: () => getVramInfo(),
			baselineDims: () => getIracingWindowSizeNative(),
			lossyInterpolationLoad: () =>
				config.get('longExposureLossyInterpolationLoad') || null,
			delay,
			now: () => Date.now(),
			signal,
			onProgress: (update) =>
				broadcastToWindows('long-exposure:progress', update),
		});

		if (!outcome.ok || !outcome.image || !outcome.plan || !outcome.stats) {
			log.warn('Long exposure did not produce an image', {
				failure: outcome.failure,
				message: outcome.message,
				restoredExactly: outcome.restore.landedExactly,
			});
			return {
				ok: false,
				failure: outcome.failure,
				message: outcome.message,
				warnings: outcome.warnings,
				restore: outcome.restore,
			};
		}

		const written = await writeLongExposure({
			image: outcome.image,
			// Every bracket stop. One entry — the same image — when bracketing is off.
			images: outcome.images,
			recipe,
			plan: outcome.plan,
			stats: outcome.stats,
			backend: outcome.backend,
			interpolation: outcome.interpolation,
			screenshotDir: path.resolve(config.get('screenshotFolder')),
			cacheDir: path.join(app.getPath('userData'), 'Cache'),
			// Beside app.log rather than beside the image: a sidecar is a diagnostic
			// record, and with bracketing a single shot writes a dozen of them. Same
			// directory the logger resolves, so everything needed to explain a
			// capture is in one place to zip up.
			sidecarDir: path.join(app.getPath('userData'), 'logs'),
			sessionInfo: iracing.sessionInfo,
			telemetry: iracing.telemetry,
			filenameFormat: config.get('customFilenameFormat')
				? config.get('filenameFormat') || DEFAULT_FORMAT
				: DEFAULT_FORMAT,
			toolName: productName,
			toolVersion: app.getVersion(),
			capturedAt: new Date().toISOString(),
		});

		// Learn this machine's own interpolation limit from what actually happened.
		// Recording the SMALLEST load that has ever fallen short means the pre-flight
		// warning tightens as evidence accumulates and never fires without any.
		//
		// Uses the SAME threshold the post-shot diagnosis does, and imports it rather
		// than repeating the number: these two must agree, and this copy was a literal
		// 0.6 that got left behind when the constant was retuned — so the machine would
		// have learned its limit on different evidence than the user is warned about.
		const interp = outcome.interpolation;
		if (
			interp?.enabled &&
			interp.achievedRatio !== null &&
			interp.achievedRatio < SAMPLE_SHORTFALL_RATIO
		) {
			const known = config.get('longExposureLossyInterpolationLoad') || 0;
			if (known === 0 || interp.load < known) {
				config.set('longExposureLossyInterpolationLoad', interp.load);
				log.info(
					'Recorded a new interpolation load limit for this machine',
					{
						load: interp.load,
						achievedRatio: interp.achievedRatio,
						previous: known || null,
					}
				);
			}
		}

		log.info('Long exposure saved', {
			file: written.masterPath,
			sampling: describeSampleStats(outcome.stats),
			backend: outcome.backend,
			// Real vs synthetic side by side, plus per-frame cost. Two shots at
			// identical settings — one with interpolation, one without — are all it
			// takes to see whether the in-betweens cost real samples.
			interpolation: outcome.interpolation
				? {
						requested: outcome.interpolation.requestedFactor,
						achieved: outcome.interpolation.achievedFactor,
						real: outcome.interpolation.realSamples,
						synthetic: outcome.interpolation.syntheticSamples,
						meanFrameMs: outcome.interpolation.meanFrameMs,
					}
				: null,
		});

		// Same gallery notification the still path uses, so a long exposure appears
		// in the strip like any other shot. The 8-bit preview is what the gallery
		// shows when the master is 16-bit, because Chromium renders it far faster.
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send(
				'screenshot-response',
				written.previewPath || written.masterPath
			);
		}

		return {
			ok: true,
			failure: null,
			message: null,
			warnings: outcome.warnings,
			restore: outcome.restore,
			masterPath: written.masterPath,
			previewPath: written.previewPath,
			sidecarPath: written.sidecarPath,
			stats: outcome.stats,
			plan: outcome.plan,
			backend: outcome.backend,
			interpolation: outcome.interpolation,
			// Echo the recipe back with the resolved anchor so a re-shoot reuses the
			// SAME moment rather than re-reading a cursor the user may have moved.
			recipe,
		};
	} catch (error) {
		const message = (error as Error)?.message || String(error);
		log.error('Long exposure failed', { error: message });
		return { ok: false, failure: 'resolve-failed', message, warnings: [] };
	} finally {
		longExposureActive = false;
		longExposureSignal = null;
		// executeRecipe's own finally already restored the window and the cursor;
		// this is the backstop for a throw before that could run.
		restoreScreenshotState();
		// Hand the foreground back. A long exposure can run for minutes with
		// iRacing raised in front, and every outcome it reports — the sample
		// count, the warnings, the saved shot in the gallery — is in OUR window.
		// Runs on every exit (success, refusal, abort, throw) because the
		// foreground was taken on every one of them; the early guards above
		// return before iRacing is ever raised and so never reach this.
		focusAppWindow();
	}
});

// Live preview of what a recipe would do, for the parameter UI: chosen playback
// speed, predicted samples, and how long the user will be waiting. Pure — it never
// touches the sim.
// iRacing's current window area in physical pixels, or null when unknown. Feeds
// the resize-aware sample-count prediction (FrameRate is measured at THIS size,
// but the capture runs at the render size).
function currentWindowPixels(): number | null {
	const size = getIracingWindowSizeNative();
	return size && size.width > 0 && size.height > 0
		? size.width * size.height
		: null;
}

ipcMain.handle('long-exposure:preview', (event, rawRecipe: unknown) => {
	const live = replayController.state();
	const recipe = normalizeRecipe(
		(rawRecipe as Partial<LongExposureRecipe>) || {},
		longExposureDefaults(live)
	);
	const plan = resolvePlan(recipe, {
		renderFps: live?.frameRate ?? undefined,
		currentWindowPixels: currentWindowPixels(),
	});
	return {
		recipe,
		plan,
		// The same validation the capture runs, so the panel can show it BEFORE the
		// shot rather than reporting a 160-second wait once it is over. Identical
		// inputs to the capture path's own call, so the two cannot disagree about
		// whether a shot is workable.
		validation: validatePlan({
			plan,
			recipe,
			replayEndFrame: live ? tapeEndFrame(live) : null,
			currentSessionNum: live?.replaySessionNum ?? null,
			lossyInterpolationLoad:
				config.get('longExposureLossyInterpolationLoad') || null,
		}),
	};
});
ipcMain.handle(
	'desktop-capturer:get-source-id',
	async (event, request: unknown) => {
		const captureRequest =
			request && typeof request === 'object' && !Array.isArray(request)
				? (request as Record<string, unknown>)
				: { windowID: request };
		const requestedHandle = normalizeWindowHandle(captureRequest.windowID);
		const requestedBounds = normalizeCaptureBounds(
			captureRequest.captureBounds
		);
		const currentWindow = getIracingWindowDetails();
		const currentHandle = normalizeWindowHandle(currentWindow?.handle);
		const windowSources = await desktopCapturer.getSources({
			types: ['window'],
			thumbnailSize: { width: 0, height: 0 },
			fetchWindowIcons: false,
		});
		const captureDiagnostics = {
			requestedHandle,
			requestedBounds,
			currentWindow: currentWindow || null,
			availableWindowSourceCount: windowSources.length,
			iracingLikeWindowSources: summarizeDesktopSources(
				windowSources.filter((source) =>
					normalizeWindowTitle(source.name).includes('iracing')
				)
			),
		};

		const handleMatch = findSourceByWindowHandles(windowSources, [
			requestedHandle,
			currentHandle,
		]);
		if (handleMatch) {
			if (
				requestedHandle &&
				currentHandle &&
				requestedHandle !== currentHandle
			) {
				console.log(
					`Desktop capture source matched refreshed handle ${currentHandle} instead of ${requestedHandle}`
				);
			}

			log.debug('Capture source matched', {
				strategy: 'window-handle',
				sourceId: handleMatch.id,
			});
			return {
				id: handleMatch.id,
				kind: 'window',
				diagnostics: mergePlainObjects(captureDiagnostics, {
					matchedSource: summarizeDesktopSource(handleMatch),
					matchStrategy: 'window-handle',
				}),
			};
		}

		const titleMatch = findSourceByWindowTitle(
			windowSources,
			currentWindow?.title
		);
		if (titleMatch) {
			console.log(
				`Desktop capture source matched fallback title "${currentWindow?.title}"`
			);
			return {
				id: titleMatch.id,
				kind: 'window',
				diagnostics: mergePlainObjects(captureDiagnostics, {
					matchedSource: summarizeDesktopSource(titleMatch),
					matchStrategy: 'window-title',
				}),
			};
		}

		const processFallbackMatch = findSourceByKnownIracingTitle(windowSources);
		if (processFallbackMatch) {
			console.log(
				`Desktop capture source matched known iRacing title "${processFallbackMatch.name}"`
			);
			return {
				id: processFallbackMatch.id,
				kind: 'window',
				diagnostics: mergePlainObjects(captureDiagnostics, {
					matchedSource: summarizeDesktopSource(processFallbackMatch),
					matchStrategy: 'known-iracing-title',
				}),
			};
		}

		if (requestedBounds) {
			const matchedDisplay = screen.getDisplayMatching(requestedBounds);
			const screenSources = await desktopCapturer.getSources({
				types: ['screen'],
				thumbnailSize: { width: 0, height: 0 },
			});
			const displayMatch = findDisplaySourceByDisplayId(
				screenSources,
				matchedDisplay?.id
			);
			const displayDiagnostics = {
				matchedDisplay: serializeDisplay(matchedDisplay),
				availableScreenSourceCount: screenSources.length,
				screenSources: summarizeDesktopSources(screenSources),
			};

			if (displayMatch && matchedDisplay) {
				console.log(
					`Desktop capture source matched display ${matchedDisplay.id} for window ${requestedHandle || currentHandle || 'unknown'}`
				);

				return {
					id: displayMatch.id,
					kind: 'display',
					captureBounds: requestedBounds,
					displayBounds: {
						x: matchedDisplay.bounds.x,
						y: matchedDisplay.bounds.y,
						width: matchedDisplay.bounds.width,
						height: matchedDisplay.bounds.height,
					},
					diagnostics: mergePlainObjects(
						captureDiagnostics,
						displayDiagnostics,
						{
							matchedSource: summarizeDesktopSource(displayMatch),
							matchStrategy: 'display-fallback',
						}
					),
				};
			}

			log.debug('Capture source not found', {
				requestedHandle,
				availableSources: windowSources.length,
			});
			return {
				id: '',
				kind: 'window',
				diagnostics: mergePlainObjects(
					captureDiagnostics,
					displayDiagnostics,
					{
						matchStrategy: 'not-found',
					}
				),
			};
		}

		log.debug('Capture source not found', {
			requestedHandle,
			availableSources: windowSources.length,
		});
		return {
			id: '',
			kind: 'window',
			diagnostics: mergePlainObjects(captureDiagnostics, {
				matchStrategy: 'not-found',
			}),
		};
	}
);

ipcMain.on('window-control', (event, action: string) => {
	const browserWindow = BrowserWindow.fromWebContents(event.sender);
	if (!browserWindow) {
		return;
	}

	switch (action) {
		case 'close':
			browserWindow.close();
			break;
		case 'minimize':
			browserWindow.minimize();
			break;
		case 'toggle-maximize':
			if (browserWindow.isMaximized()) {
				browserWindow.unmaximize();
			} else {
				browserWindow.maximize();
			}
			break;
		default:
			break;
	}
});

app.on('ready', async () => {
	if (process.platform === 'win32') {
		app.setAppUserModelId(appId);
	}

	loadConfig();
	// Before createWindow, so the renderer reads a settled `locale` from config
	// and paints its first frame in the right language.
	initLocale();
	createWindow();

	width = config.get('defaultScreenWidth');
	height = config.get('defaultScreenHeight');
	left = config.get('defaultScreenLeft');
	top = config.get('defaultScreenTop');

	if (config.get('defaultScreenWidth') === 0) {
		config.set('defaultScreenWidth', screen.getPrimaryDisplay().bounds.width);
		width = screen.getPrimaryDisplay().bounds.width;
	}

	if (config.get('defaultScreenHeight') === 0) {
		config.set(
			'defaultScreenHeight',
			screen.getPrimaryDisplay().bounds.height
		);
		height = screen.getPrimaryDisplay().bounds.height;
	}

	log.info('App started', {
		version: app.getVersion(),
		isPackaged: app.isPackaged,
	});

	// Startup environment baseline (obs-lifecycle-telemetry#4): one durable line
	// pinning the GPU/VRAM/display/backend context every field report needs, so a
	// bug can be triaged without asking the user to re-derive their setup. Reuses
	// the already-assembled, fail-open diagnostics helpers (getCaptureBackendDiagnostics
	// swallows WGC/VRAM FFI errors internally) so this can never throw out of ready.
	let updateChannel: string | null = null;
	try {
		updateChannel = autoUpdater.channel;
	} catch {
		updateChannel = null;
	}
	log.info('Environment', {
		version: app.getVersion(),
		isPackaged: app.isPackaged,
		channel: updateChannel,
		platform: process.platform,
		arch: process.arch,
		electron: String(process.versions.electron || ''),
		node: String(process.versions.node || ''),
		captureBackend: getCaptureBackendDiagnostics(),
		displays: {
			count: screen.getAllDisplays().length,
			primary: serializeDisplay(screen.getPrimaryDisplay()),
		},
	});

	if (isDev) {
		mainWindow?.webContents.openDevTools();
		workerWindow?.webContents.openDevTools();
	}

	if (isDebug) {
		mainWindow?.webContents.openDevTools();
		workerWindow?.webContents.openDevTools();
	}

	ipcMain.on('screenshot-response', (event, output) => {
		log.info('Screenshot complete', { file: output });
		mainWindow?.webContents.send('screenshot-response', output);
	});

	ipcMain.on('screenshot-finished', () => {
		restoreScreenshotState();
	});

	ipcMain.on('request-iracing-status', (event) => {
		const ready = iracing.telemetry != null;
		// Log only the edge, not every poll — the renderer heartbeats this
		// continuously and logging each reply would flood app.log.
		if (ready !== lastIracingStatusReply) {
			log.info('iRacing status poll edge', { ready });
			lastIracingStatusReply = ready;
		}
		event.reply('iracing-status', ready);
	});

	iracing.on('Connected', () => {
		// App-facing lifecycle transition record (the low-level SDK start is logged
		// as 'SDK startSDK' in iracing-sdk.ts) — obs-lifecycle-telemetry#1.
		log.info('iRacing connected');
		cancelPendingCaptureAbort();
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('iracing-connected', '');
		}
	});

	iracing.on('Disconnected', () => {
		// midCapture is the actionable field: a disconnect mid-capture is the
		// VRAM-exhaustion signature this app cares about (obs-lifecycle-telemetry#1).
		log.info('iRacing disconnected', { midCapture: takingScreenshot });
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('iracing-disconnected', '');
		}
		// If iRacing vanishes mid-capture (e.g. a VRAM-exhaustion crash at high
		// resolution), don't let the worker spin its full retry budget — schedule
		// a debounced abort that recovers and reports a clear cause.
		if (takingScreenshot) {
			scheduleCaptureAbortOnDisconnect();
		}
	});

	ipcMain.on('resize-screenshot', async (event, data: any) => {
		log.info('Screenshot requested', {
			width: data.width,
			height: data.height,
			reshade: config.get('reshade'),
			crop: data.crop,
		});

		if (takingScreenshot) {
			log.info('Screenshot rejected', {
				reason: 'already-taking-screenshot',
			});
			return;
		}

		// #11 diagnostics: clear the previous capture's WGC snapshot so the
		// failure-time diagnostics reflect THIS request. Stays 'not-attempted' unless
		// the WGC path runs and overwrites it. Observability-only.
		resetWgcAttemptDiagnostics();

		if (!iracing.telemetry) {
			log.info('Screenshot rejected', { reason: 'no-telemetry' });
			reportScreenshotError('iRacing telemetry is not available', {
				context: 'resize-screenshot:telemetry',
				meta: { request: data },
			});
			return;
		}

		if (!iracing.sessionInfo) {
			log.info('Screenshot proceeding without session info', {
				reason: 'no-session-info',
				fallback: 'iRacingScreenshotTool-{counter}',
			});
		}

		if (!workerReady) {
			log.info('Screenshot rejected', { reason: 'worker-not-ready' });
			reportScreenshotError('Screenshot worker is still loading', {
				context: 'resize-screenshot:worker-ready',
				meta: { request: data },
			});
			return;
		}

		// #10: exclusive-fullscreen pre-flight for every DWM-based capture path.
		// iRacing in legacy exclusive fullscreen bypasses DWM, so the resize
		// (SetWindowPos) is a no-op and any composition-based grab comes back black
		// after the full ~8s watchdog burn. This covers BOTH the desktopCapturer
		// path AND the #11 WGC native path: WGC's CreateForWindow is itself a DWM-
		// composition capture (Microsoft docs confirm it can't capture true
		// exclusive fullscreen), so it hits the identical wall — do NOT exempt it.
		// Only ReShade escapes: it hooks the swapchain and captures the back buffer
		// via injection, so it works in exclusive fullscreen — blocking that would
		// deny a working capture (the design's cardinal harm), so we skip the
		// pre-flight entirely ONLY in ReShade mode. Sample HERE — before we raise
		// iRacing / steal focus
		// (so GetForegroundWindow attribution is trustworthy) and before
		// takingScreenshot is set (so no restore is needed on the early exit). Skip
		// the doomed attempt ONLY when confident (state 3 AND attributed);
		// otherwise proceed and let the black-frame detector — enriched via the
		// stashed state — be the backstop. Fails open: null (native off / iRacing
		// closed) just proceeds.
		if (!config.get('reshade')) {
			const fullscreen = getIracingExclusiveFullscreenState();
			lastCaptureFullscreenState = fullscreen ? fullscreen.state : null;
			if (fullscreen && fullscreen.exclusiveFullscreen) {
				log.info('Screenshot rejected', {
					reason: 'exclusive-fullscreen',
				});
				reportScreenshotError(EXCLUSIVE_FULLSCREEN_MESSAGE(), {
					context: 'resize-screenshot:exclusive-fullscreen',
					meta: { request: data },
				});
				return;
			}
		} else {
			lastCaptureFullscreenState = null;
		}

		// Defensive clamp: the sidebar's o-input max is only a hint and the
		// global-hotkey path bypasses the UI entirely, so main must not trust
		// data.width/height blindly. Bound them to the capture ceiling and keep
		// each crop target within its render size.
		const reqWidth = clampCaptureDimension(data.width, width);
		const reqHeight = clampCaptureDimension(data.height, height);
		if (reqWidth !== data.width || reqHeight !== data.height) {
			log.info('Clamped screenshot dimensions', {
				requested: { width: data.width, height: data.height },
				clamped: { width: reqWidth, height: reqHeight },
			});
		}
		data.width = reqWidth;
		data.height = reqHeight;
		if (data.targetWidth != null) {
			data.targetWidth = Math.min(
				clampCaptureDimension(data.targetWidth, reqWidth),
				reqWidth
			);
		}
		if (data.targetHeight != null) {
			data.targetHeight = Math.min(
				clampCaptureDimension(data.targetHeight, reqHeight),
				reqHeight
			);
		}

		takingScreenshot = true;
		// Arm the recovery watchdog the instant the latch flips — before the
		// branch split — so EVERY path is covered from here on, including a
		// resizeIracingWindowAsync that HANGS (never resolves): a try/catch can
		// only recover a rejection, so the watchdog is the sole net for a hang.
		// The native-WGC and getUserMedia paths re-arm it (harmless clear+reset);
		// restoreScreenshotState() clears it on success and on every error path.
		armCaptureWatchdog();
		// Snapshot VRAM now — before the window is resized and before iRacing can
		// exit and free its VRAM — so an OOM-disconnect diagnostic reports the
		// pre-exit usage, not the freed post-exit reading (obs-capture-diagnostics#3).
		// Fully guarded: getVramInfo is already fail-open, but never let it throw out
		// of the capture handler.
		try {
			const v = getVramInfo();
			captureStartVram = {
				totalBytes: v.totalBytes,
				usedBytes: v.usedBytes,
				source: v.source,
				adapterName: v.adapterName,
			};
		} catch {
			captureStartVram = null;
		}
		originalWindowBounds = getIracingWindowDetails() || null;
		parseCameraState(
			(iracing.telemetry?.values as { CamCameraState?: string[] })
				?.CamCameraState
		);
		iracing.camControls.setState(
			cameraState | iracing.Consts.CameraState.UIHidden
		);

		// Wait for iRacing to confirm UIHidden before capturing
		const uiHideTimeout = 500;
		const uiHidePoll = 16;
		let waited = 0;
		while (waited < uiHideTimeout) {
			await delay(uiHidePoll);
			waited += uiHidePoll;
			const cam = (
				iracing.telemetry?.values as { CamCameraState?: string[] }
			)?.CamCameraState;
			if (cam && cam.includes('UIHidden')) {
				break;
			}
		}
		log.debug('UI hide wait', {
			waited,
			confirmed:
				(
					iracing.telemetry?.values as { CamCameraState?: string[] }
				)?.CamCameraState?.includes('UIHidden') || false,
		});

		if (!config.get('reshade')) {
			// #11: when High-Fidelity Capture (WGC) is enabled and loaded, grab the
			// frame in-process (true RGBA, no chroma subsampling) — it needs no
			// desktopCapturer source, so skip the enumeration for it. The default
			// path keeps overlapping resize + enumeration (the Promise.all overlap
			// still matters for the PowerShell resize fallback, whose spawn would
			// otherwise block getSources).
			try {
				// Backend selection via the pure, tested decider (cq-tests#2). We are
				// already inside the non-ReShade branch, so reshade is provably false
				// here — this resolves to 'wgc' or 'getUserMedia'; the 'reshade' arm is
				// exercised by capture-decisions.test.ts. Equivalent to the previous
				// inline `nativeCapture && isWgcAvailable()`.
				const useNativeCapture =
					decideCaptureBackend({
						reshade: false,
						nativeCapture: config.get('nativeCapture'),
						wgcAvailable: isWgcAvailable(),
					}) === 'wgc';
				const [id, windowSources] = await Promise.all([
					resizeIracingWindowAsync(data.width, data.height, left, top),
					useNativeCapture
						? Promise.resolve<Electron.DesktopCapturerSource[]>([])
						: desktopCapturer.getSources({
								types: ['window'],
								thumbnailSize: { width: 0, height: 0 },
								fetchWindowIcons: false,
							}),
				]);

				if (id === undefined) {
					log.info('iRacing window not found');
					restoreScreenshotState();
					reportScreenshotError('iRacing window not found', {
						context: 'resize-screenshot:window-not-found',
						meta: {
							request: data,
							defaultScreen: { width, height, left, top },
						},
					});
					return;
				}

				log.info('iRacing window resized', {
					width: data.width,
					height: data.height,
					handle: id,
				});

				if (useNativeCapture) {
					// Arm the same recovery watchdog the worker path uses: if the WGC
					// settle/grab/save ever hangs (e.g. a stalled disk or network
					// screenshot folder), this force-restores instead of leaving iRacing
					// stuck at capture size with its UI hidden. A 'saved'/'aborted'
					// outcome clears it via restoreScreenshotState; 'fallback' re-arms it
					// in dispatchWorkerCapture.
					armCaptureWatchdog();
					const outcome = await captureAndSaveViaWgc(id, data);
					if (outcome === 'saved') {
						return;
					}
					if (outcome === 'aborted') {
						// An aborted capture is already reported by the disconnect/watchdog
						// path — this is a correlation breadcrumb, not itself a failure.
						log.info('WGC capture aborted mid-flight', {
							grabElapsedMs: lastWgcAttempt.grabElapsedMs,
						});
						return;
					}
					// outcome === 'fallback': WGC couldn't deliver a usable frame — drop
					// to the getUserMedia path, which needs the source enumeration we
					// skipped above. The window is already resized/raised for it to reuse.
					// Emit the FULL attempt snapshot at this single fallback funnel — it
					// fires BEFORE dispatchWorkerCapture, so a subsequent getUserMedia
					// success can no longer erase the H1-vs-H2 evidence
					// (obs-capture-diagnostics#1). Degraded-fidelity path → log.warn.
					log.warn('WGC fell back to getUserMedia', {
						fallbackReason: lastWgcAttempt.fallbackReason,
						grabElapsedMs: lastWgcAttempt.grabElapsedMs,
						frameDims: lastWgcAttempt.frameDims,
						outcome: lastWgcAttempt.outcome,
					});
					const fallbackSources = await desktopCapturer.getSources({
						types: ['window'],
						thumbnailSize: { width: 0, height: 0 },
						fetchWindowIcons: false,
					});
					dispatchWorkerCapture(id, data, fallbackSources);
					return;
				}

				dispatchWorkerCapture(id, data, windowSources);
			} catch (error) {
				// Any rejection on the primary getUserMedia / native path (getSources,
				// the resize, the WGC grab) must self-heal immediately — otherwise
				// takingScreenshot latches true forever and every later capture is
				// rejected 'already-taking-screenshot'. Mirrors the ReShade catch. The
				// trailing return stops a caught error falling through into ReShade code.
				restoreScreenshotState();
				reportScreenshotError(error, {
					context: 'resize-screenshot:capture',
					meta: { request: data },
				});
			}
			return;
		}

		// ReShade path: use the raising pre-capture resize (un-minimize + size +
		// foreground) just like the non-ReShade path — a quiet reposition would
		// leave a minimized/background iRacing un-composited so ReShade's grab
		// gets no frame. No desktopCapturer.getSources here, so just await it.
		let reshadeLocation: {
			folder: string;
			rawFolder: string;
			basePath: string;
			remappedFrom: string;
		} | null = null;

		try {
			// Raising pre-capture resize INSIDE the try so a rejection here recovers
			// via the catch instead of wedging: it previously sat outside the ReShade
			// try/catch, so a reject latched takingScreenshot true with no recovery.
			const id = await resizeIracingWindowAsync(
				data.width,
				data.height,
				left,
				top
			);

			if (id === undefined) {
				log.info('iRacing window not found');
				restoreScreenshotState();
				reportScreenshotError('iRacing window not found', {
					context: 'resize-screenshot:window-not-found',
					meta: {
						request: data,
						defaultScreen: { width, height, left, top },
					},
				});
				return;
			}

			log.info('iRacing window resized', {
				width: data.width,
				height: data.height,
				handle: id,
			});

			const reshadeIniPath = config.get('reshadeFile');
			const reshadeIni = loadIniFile.sync(reshadeIniPath);
			reshadeLocation = getReshadeScreenshotFolder(
				reshadeIni,
				reshadeIniPath
			);
			const reshadeFile = await waitForReshadeScreenshot(
				reshadeLocation.folder
			);

			log.info('ReShade screenshot received', { file: reshadeFile });
			restoreScreenshotState();
			workerWindow?.webContents.send('session-info', iracing.sessionInfo);
			workerWindow?.webContents.send('telemetry', iracing.telemetry);
			// Forward targetWidth/targetHeight so saveReshadeImage in the worker
			// can crop the watermark out. Without these, the crop branches in
			// Worker.vue fall through and the saved image keeps the full render
			// size with the watermark still in it (regression introduced in
			// 2cf3ccf — non-ReShade path was wired, ReShade path was missed).
			workerWindow?.webContents.send('screenshot-reshade', {
				file: reshadeFile,
				targetWidth: data.targetWidth,
				targetHeight: data.targetHeight,
			});
		} catch (error) {
			// Guard against a duplicate report: if the watchdog or disconnect-abort
			// already recovered (flipping takingScreenshot false — e.g. it cancelled
			// this ReShade wait via clearPendingReshadeWait), that path already
			// surfaced the error, so restore silently instead of reporting twice.
			const wasCapturing = takingScreenshot;
			restoreScreenshotState();
			if (wasCapturing) {
				reportScreenshotError(error, {
					context: 'resize-screenshot:reshade',
					meta: {
						request: data,
						reshadeFile: config.get('reshadeFile'),
						...(reshadeLocation || {}),
						...(error &&
						(error as { meta?: Record<string, unknown> }).meta
							? (error as { meta: Record<string, unknown> }).meta
							: {}),
					},
				});
			}
		}
	});

	iracing.on('update', () => {
		if (takingScreenshot && iracing.telemetry) {
			const currentState =
				(iracing.telemetry.values as { CamCameraState?: string[] })
					.CamCameraState || [];
			if (!currentState.includes('UseTemporaryEdits')) {
				iracing.camControls.setState(
					cameraState | iracing.Consts.CameraState.UIHidden
				);
			}
		}
	});

	ipcMain.on('screenshot-error', (event, data) => {
		restoreScreenshotState();
		reportScreenshotError(enrichBlackFrameError(data), {
			source: 'worker',
			context: 'worker:screenshot-error',
		});
	});

	ipcMain.on(
		'screenshotKeybind-change',
		(event, data: { oldValue: string; newValue: string }) => {
			globalShortcut.unregister(data.oldValue);
			globalShortcut.register(data.newValue, () => {
				mainWindow?.webContents.send('hotkey-screenshot', '');
			});
		}
	);

	globalShortcut.register(config.get('screenshotKeybind'), () => {
		mainWindow?.webContents.send('hotkey-screenshot', '');
	});

	ipcMain.on('defaultScreenHeight', (event, data: number) => {
		height = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('defaultScreenWidth', (event, data: number) => {
		width = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('defaultScreenLeft', (event, data: number) => {
		left = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('defaultScreenTop', (event, data: number) => {
		top = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (mainWindow === null) {
		createWindow();
	}
});

// --- auto-update ----------------------------------------------------------
//
// The renderer never talks to electron-updater. Main owns one UpdateState, every
// autoUpdater event is folded into it through the pure reducer in
// update-decisions.ts, and each transition is both logged and broadcast. The
// renderer can therefore be a pure view of `update:state` — and, because the state
// is HELD rather than only announced, a window that mounts after the interesting
// event still sees it (`update:state` invoke). The old code sent a single
// fire-and-forget 'update-available' on download completion, so a renderer that was
// not listening at that instant lost the notification for the whole session.
//
// Observability (obs-lifecycle-telemetry#2 == obs-error-visibility#3) is preserved:
// every event still writes its app.log line, errors at ERROR.
let updateState = initialUpdateState();
let updatePollTimer: ReturnType<typeof setInterval> | null = null;

// A capture in flight is the only thing that makes an update action unsafe. Asked
// fresh at every decision point rather than cached, because it flips without any
// update event to hang a recompute off.
function updateBusy(): boolean {
	return longExposureActive || takingScreenshot;
}

// The renderer's view of the state: the reduced state plus the busy flag it needs
// to phrase things honestly. Sent on every transition and returned by the query.
function updateStatePayload(): UpdateState & {
	busy: boolean;
	currentVersion: string;
} {
	return {
		...updateState,
		busy: updateBusy(),
		currentVersion: app.getVersion(),
	};
}

function pushUpdateEvent(event: UpdateEvent): void {
	updateState = applyUpdateEvent(updateState, event, Date.now());
	broadcastToWindows('update:state', updateStatePayload());
}

autoUpdater.on('checking-for-update', () => {
	log.info('Auto-update checking');
	pushUpdateEvent({ type: 'checking' });
});

autoUpdater.on('update-available', (info) => {
	log.info('Auto-update available', { version: info?.version });
	pushUpdateEvent({ type: 'available', version: info?.version ?? null });
});

autoUpdater.on('update-not-available', (info) => {
	log.info('Auto-update not available', { version: info?.version });
	pushUpdateEvent({ type: 'not-available', version: info?.version ?? null });
});

// Wired at last, so a 114 MB transfer is a progress bar instead of an unexplained
// stall. Logged at DEBUG — one line per chunk would drown app.log.
autoUpdater.on('download-progress', (progress) => {
	log.debug('Auto-update download progress', {
		percent: progress?.percent,
		bytesPerSecond: progress?.bytesPerSecond,
	});
	pushUpdateEvent({ type: 'progress', percent: progress?.percent });
});

autoUpdater.on('error', (error) => {
	log.error('Auto-update error', {
		error: (error as Error)?.message || String(error),
	});
	pushUpdateEvent({
		type: 'error',
		message: (error as Error)?.message || String(error),
	});
});

autoUpdater.on('update-downloaded', (info) => {
	log.info('Auto-update downloaded', { version: info?.version });
	pushUpdateEvent({ type: 'downloaded', version: info?.version ?? null });
});

// Consent, not surprise. autoDownload defaults to true, which meant the installer
// started transferring the moment the app was ready — competing with iRacing for
// bandwidth and disk while the user might be on track, with nothing on screen to
// say so. Now the check runs freely (cheap: one atom feed + one small yml) and the
// user decides when the bytes move.
//
// autoInstallOnAppQuit is deliberately LEFT at its default of true: once the user
// has consented to the download, installing it on the next normal quit is the
// least-interrupting way to finish, and it is what canInstallNow's busy message
// promises.
autoUpdater.autoDownload = false;

// `app.isPackaged`, NOT `process.env.NODE_ENV === 'production'`. Nothing sets
// NODE_ENV in a packaged build: Electron does not, and electron-vite — unlike the
// webpack config it replaced in 13d84e1, whose `mode: 'production'` inlined the
// value through optimization.nodeEnv — leaves `process.env.NODE_ENV` as a runtime
// read in out/main/index.js. So this gate was dead from the migration onward and
// no shipped build ever checked for an update; app.log across packaged v3.2.2 runs
// has not one 'Auto-update checking' line. `!isDev` would be wrong too — it is
// also true for an unpacked --dir run, where electron-updater has no app-update.yml
// and only logs a skip. isPackaged is the condition electron-updater itself gates
// on (AppUpdater.isUpdaterActive), so this asks exactly what it will answer.
function runUpdateCheck({ force = false } = {}): boolean {
	if (!app.isPackaged) {
		return false;
	}
	if (
		!shouldCheckNow({
			phase: updateState.phase,
			checkedAt: updateState.checkedAt,
			nowMs: Date.now(),
			force,
		})
	) {
		return false;
	}

	autoUpdater.checkForUpdates().catch((error) => {
		log.error('checkForUpdates failed', {
			error: (error as Error)?.message || String(error),
		});
		// checkForUpdates can reject WITHOUT emitting 'error' (a malformed feed
		// rejects out of getLatestVersion), so the reducer has to be told here too
		// or the UI would sit on 'checking' forever.
		pushUpdateEvent({
			type: 'error',
			message: (error as Error)?.message || String(error),
		});
	});
	return true;
}

app.on('ready', () => {
	runUpdateCheck();

	// The app is left open for whole evenings alongside iRacing, so a startup-only
	// check meant a release that landed at 8pm stayed invisible until the next
	// launch. The timer ticks far more often than the policy allows a check, so a
	// machine that slept through its slot re-checks shortly after waking instead of
	// waiting for the next exact multiple; shouldCheckNow does the real rationing.
	updatePollTimer = setInterval(() => {
		runUpdateCheck();
	}, UPDATE_POLL_INTERVAL_MS);
});

app.on('will-quit', () => {
	if (updatePollTimer) {
		clearInterval(updatePollTimer);
		updatePollTimer = null;
	}
});

// The current state, computed fresh. Called by every renderer on mount, which is
// what makes the notification impossible to miss.
ipcMain.handle('update:state', () => updateStatePayload());

// The Settings button. `force` skips the six-hour interval but not the phase guard
// — there is nothing useful to do mid-check or mid-download.
ipcMain.handle('update:check', () => {
	// Said out loud rather than failing silently: in a dev or --dir run
	// electron-updater has no app-update.yml and the button would otherwise look
	// broken to whoever is testing it.
	if (!app.isPackaged) {
		return {
			started: false,
			reason: t('update.devBuildOnly'),
			state: updateStatePayload(),
		};
	}
	const started = runUpdateCheck({ force: true });
	// No reason when we declined: the state itself already reads "vX is available"
	// or "downloading", which explains the no-op better than a second sentence.
	return { started, reason: null, state: updateStatePayload() };
});

ipcMain.handle('update:download', () => {
	const verdict = canStartDownload({
		phase: updateState.phase,
		busy: updateBusy(),
	});
	if (!verdict.allowed) {
		log.info('Auto-update download refused', { reason: verdict.reason });
		return { ok: false, reason: verdict.reason, state: updateStatePayload() };
	}

	log.info('Auto-update download requested', { version: updateState.version });
	// Move to 'downloading' immediately rather than waiting for the first
	// download-progress event: on a fast link the first chunk can be seconds away,
	// and until then the button would still read "click to download".
	pushUpdateEvent({ type: 'download-started' });
	autoUpdater.downloadUpdate().catch((error) => {
		log.error('downloadUpdate failed', {
			error: (error as Error)?.message || String(error),
		});
		pushUpdateEvent({
			type: 'error',
			message: (error as Error)?.message || String(error),
		});
	});
	return { ok: true, reason: null, state: updateStatePayload() };
});

ipcMain.handle('update:install', async () => {
	const verdict = canInstallNow({
		phase: updateState.phase,
		busy: updateBusy(),
	});
	if (!verdict.allowed) {
		log.info('Auto-update install refused', { reason: verdict.reason });
		return { ok: false, reason: verdict.reason, state: updateStatePayload() };
	}

	// quitAndInstall() kills the app with no warning. Previously one click on an
	// unlabelled arrow did exactly that, which could throw away a long exposure
	// mid-accumulation. canInstallNow already refuses while a capture is running;
	// this covers everything else the user might be part-way through.
	const { response } = await dialog.showMessageBox(mainWindow ?? undefined, {
		type: 'question',
		buttons: [t('update.installConfirm'), t('update.installLater')],
		defaultId: 0,
		cancelId: 1,
		title: t('update.installTitle'),
		message: t('update.installMessage', {
			version: updateState.version ?? t('update.installFallbackVersion'),
		}),
		detail: t('update.installDetail'),
	});

	if (response !== 0) {
		log.info('Auto-update install deferred by user');
		return {
			ok: false,
			reason: null,
			state: updateStatePayload(),
		};
	}

	log.info('Auto-update installing', { version: updateState.version });
	autoUpdater.quitAndInstall();
	return { ok: true, reason: null, state: updateStatePayload() };
});

function clearPendingReshadeWait(reason = 'Screenshot cancelled'): void {
	if (typeof cancelReshadeWait !== 'function') {
		return;
	}

	const cancel = cancelReshadeWait;
	cancelReshadeWait = null;
	cancel(reason);
}

function clampCaptureDimension(value: unknown, fallback: number): number {
	const n = Math.round(Number(value));
	if (!Number.isFinite(n) || n < 1) {
		return fallback;
	}
	return Math.min(n, MAX_CAPTURE_DIMENSION);
}

function clearCaptureWatchdog(): void {
	if (captureWatchdog) {
		clearTimeout(captureWatchdog);
		captureWatchdog = null;
	}
}

// Hand a resized iRacing window off to the getUserMedia worker path: match the
// desktopCapturer source for the HWND, forward session/telemetry so the worker
// can name the file, send the capture request, and arm the recovery watchdog.
// This is both the default (non-WGC) path and the WGC fallback.
function dispatchWorkerCapture(
	id: number,
	data: CaptureRequestData,
	windowSources: Electron.DesktopCapturerSource[]
): void {
	// The awaits upstream (resize/getSources, and the WGC settle+grab which can
	// block for up to WGC_TIMEOUT_MS) give the disconnect/watchdog abort a window
	// to fire: it runs restoreScreenshotState() (takingScreenshot=false) and
	// reports the error. If that already happened, dispatching a fresh worker
	// capture here would arm a stray watchdog and produce a spurious second
	// (wrong-size) screenshot that contradicts the error just shown — so bail.
	if (!takingScreenshot) {
		log.info('Capture already aborted — skipping worker dispatch');
		return;
	}

	let sourceId: string | null = null;
	const match = findSourceByWindowHandles(windowSources, [String(id)]);
	if (match) {
		sourceId = String(match.id);
	}
	log.debug('Source enumeration', {
		windowSourceCount: windowSources.length,
		matchedSourceId: sourceId,
	});

	log.info('Capture request sent to worker', {
		width: data.width,
		height: data.height,
		sourceId,
	});
	workerWindow?.webContents.send('session-info', iracing.sessionInfo);
	workerWindow?.webContents.send('telemetry', iracing.telemetry);
	workerWindow?.webContents.send('screenshot-request', {
		width: data.width,
		height: data.height,
		targetWidth: data.targetWidth,
		targetHeight: data.targetHeight,
		crop: data.crop,
		cropTopLeft: data.cropTopLeft,
		windowID: id,
		sourceId,
		captureBounds: {
			x: left,
			y: top,
			width: data.width,
			height: data.height,
		},
	});
	armCaptureWatchdog();
}

// Cheap all-black guard for a raw RGBA frame: sample a coarse grid and call it
// black only if EVERY sampled pixel is essentially black (matches the renderer's
// isFrameBlack threshold). Real scenes always have some brighter pixels, so this
// won't false-positive on dark-but-valid shots; an all-black grab means capture
// failed.
function isRgbaBufferBlack(
	buffer: Buffer,
	frameWidth: number,
	frameHeight: number
): boolean {
	const stepX = Math.max(1, Math.floor(frameWidth / 32));
	const stepY = Math.max(1, Math.floor(frameHeight / 18));
	for (let y = 0; y < frameHeight; y += stepY) {
		for (let x = 0; x < frameWidth; x += stepX) {
			const i = (y * frameWidth + x) * 4;
			if (
				buffer[i] + buffer[i + 1] + buffer[i + 2] >
				WGC_BLACK_FRAME_MAX_BRIGHTNESS
			) {
				return false;
			}
		}
	}
	return true;
}

// Apply the user's output format to a sharp pipeline at max fidelity. JPEG uses
// 4:4:4 (no chroma subsampling) so it preserves the true-RGBA color WGC grabbed
// — subsampling here would throw away the exact advantage of this path. PNG is
// lossless; WebP mirrors the renderer's quality-95 lossy setting.
function encodeForFormat(
	pipeline: ReturnType<typeof sharp>,
	formatKey: unknown
): ReturnType<typeof sharp> {
	switch (formatKey) {
		case 'png':
			return pipeline.png();
		case 'webp':
			return pipeline.webp({ quality: 95 });
		case 'jpeg':
		default:
			return pipeline.jpeg({ quality: 100, chromaSubsampling: '4:4:4' });
	}
}

type WgcCaptureOutcome = 'saved' | 'fallback' | 'aborted';

// #11: main-side WGC capture + save. Grabs one true-RGBA frame of the (already
// resized/raised) iRacing window, crops the watermark margin, encodes at max
// fidelity, writes the file + gallery thumbnail, notifies the UI, and restores.
// Returns:
//   'saved'    — file written, gallery notified, window restored.
//   'fallback' — no usable frame (or save failed); caller should run the
//                getUserMedia path. The window is left resized/raised for it.
//   'aborted'  — capture was cancelled mid-flight (iRacing disconnected /
//                already restored); caller must NOT fall back or restore again.
async function captureAndSaveViaWgc(
	id: number,
	data: CaptureRequestData
): Promise<WgcCaptureOutcome> {
	// WGC is now the active backend and in-flight. Mark it BEFORE the settle so a
	// disconnect during the settle (scheduleCaptureAbortOnDisconnect → the
	// diagnostics snapshot) attributes the aborted capture to WGC ('attempted')
	// instead of the reset 'not-attempted' (obs-capture-diagnostics#4).
	lastWgcAttempt.outcome = 'attempted';

	// SetWindowPos is synchronous, but iRacing's swapchain needs a frame or two to
	// re-render at the new size. Settle briefly so the grab isn't a stale frame.
	await delay(WGC_SETTLE_MS);

	// A disconnect/watchdog during the settle already ran restoreScreenshotState()
	// (takingScreenshot=false) and reported. Don't grab a torn-down window or fall
	// back — just bail.
	if (!takingScreenshot) {
		lastWgcAttempt.outcome = 'aborted';
		return 'aborted';
	}

	// NOTE: captureIracingWindowNative is a SYNCHRONOUS native call that blocks the
	// main thread until the first frame arrives (typically a few ms; bounded by
	// WGC_TIMEOUT_MS on failure). Acceptable during a capture, when the main
	// process is otherwise idle; a future async addon would remove even this.
	const grabStart = Date.now();
	const frame = captureIracingWindowNative(id, WGC_TIMEOUT_MS);
	// #11 diagnostics (observability-only): record grab timing + which frame (if any)
	// WGC returned. grabElapsedMs ≈ WGC_TIMEOUT_MS+500 points at H1 (timeout); a small
	// value with a 'WGC capture failed' reason points at H2 (alloc fail).
	lastWgcAttempt.grabElapsedMs = Date.now() - grabStart;
	lastWgcAttempt.frameDims =
		frame && frame.width > 0 && frame.height > 0
			? { width: frame.width, height: frame.height }
			: null;
	if (!frame || !frame.data || frame.width < 1 || frame.height < 1) {
		// Classification via the pure, tested helper (cq-tests#2).
		const c = classifyWgcResult('no-frame', getLastNativeFailureReason());
		lastWgcAttempt.outcome = c.outcome;
		lastWgcAttempt.fallbackReason = c.fallbackReason;
		// Immediate, precise breadcrumb at the point of failure. The caller's funnel
		// (step 7) also logs this fallback durably — the two lines per no-frame event
		// are intentional (interior precision + funnel durability), not a bug.
		log.warn('WGC produced no frame — falling back', {
			fallbackReason: lastWgcAttempt.fallbackReason,
			grabElapsedMs: lastWgcAttempt.grabElapsedMs,
		});
		return 'fallback';
	}
	if (isRgbaBufferBlack(frame.data, frame.width, frame.height)) {
		const c = classifyWgcResult('black', null);
		lastWgcAttempt.outcome = c.outcome;
		lastWgcAttempt.fallbackReason = c.fallbackReason;
		// Degraded-fidelity path → log.warn (was log.info); enriched with the grab
		// timing + frame dims so H1(slow/black) is distinguishable in the log. The
		// caller funnel also logs this fallback — the double line is intentional.
		log.warn('WGC frame was black — falling back to getUserMedia', {
			grabElapsedMs: lastWgcAttempt.grabElapsedMs,
			frameDims: lastWgcAttempt.frameDims,
		});
		return 'fallback';
	}

	// Tracks whether the primary file reached disk. Once it has, a later failure
	// (thumbnail, notify, restore) must NOT return 'fallback' — the getUserMedia
	// path would then write a SECOND file for one keypress (buildUniqueScreenshotName
	// sees the first and picks a new name). Past this point we finalize as 'saved'.
	let committed = false;
	let savedPath = '';
	try {
		const screenshotDir = path.resolve(config.get('screenshotFolder'));
		const cacheDir = path.join(app.getPath('userData'), 'Cache');
		fs.mkdirSync(screenshotDir, { recursive: true });
		fs.mkdirSync(cacheDir, { recursive: true });

		const ext = getOutputExtension(config.get('outputFormat'));
		const useCustom = config.get('customFilenameFormat');
		const formatString = useCustom
			? config.get('filenameFormat') || DEFAULT_FORMAT
			: DEFAULT_FORMAT;
		// Same naming as the renderer path (shared screenshot-output helper), so
		// WGC and getUserMedia produce identical file names.
		const fileKey = buildUniqueScreenshotName({
			formatString,
			sessionInfo: iracing.sessionInfo,
			telemetry: iracing.telemetry,
			exists: (name) =>
				fs.existsSync(path.join(screenshotDir, `${name}${ext}`)),
		});
		savedPath = path.join(screenshotDir, `${fileKey}${ext}`);
		const thumbPath = path.join(cacheDir, `${fileKey}.webp`);

		const rawOptions = {
			raw: {
				width: frame.width,
				height: frame.height,
				channels: 4 as const,
			},
		};

		// Crop the watermark margin (geometry shared with the renderer path). Guard
		// an out-of-bounds rect — e.g. a stale pre-resize frame smaller than the
		// target — by saving the full frame instead of throwing.
		const cropRect = resolveCropRect({
			sourceWidth: frame.width,
			sourceHeight: frame.height,
			targetWidth: data.targetWidth,
			targetHeight: data.targetHeight,
			crop: data.crop,
			cropTopLeft: data.cropTopLeft ?? false,
		});
		const cropInBounds =
			cropRect !== null &&
			cropRect.left >= 0 &&
			cropRect.top >= 0 &&
			cropRect.left + cropRect.width <= frame.width &&
			cropRect.top + cropRect.height <= frame.height;
		if (cropRect && !cropInBounds) {
			log.info('WGC crop rect out of bounds — saving full frame', {
				frame: { width: frame.width, height: frame.height },
				cropRect,
			});
		}
		// A fresh pipeline per output (sharp instances are single-use). removeAlpha
		// drops WGC's alpha channel so PNG/WebP always save as opaque RGB — the
		// compositor can hand back a non-opaque alpha (e.g. Win11 rounded corners,
		// flip-model backbuffers), which would otherwise bleed transparency into the
		// saved image. JPEG has no alpha, so this is a no-op there.
		const buildPipeline = () => {
			const image = sharp(frame.data, rawOptions).removeAlpha();
			return cropInBounds && cropRect ? image.extract(cropRect) : image;
		};

		// Primary write. A failure here means no file exists yet, so falling back
		// to a fresh getUserMedia capture is safe (no duplicate).
		await encodeForFormat(buildPipeline(), config.get('outputFormat')).toFile(
			savedPath
		);
		committed = true;
		log.info('WGC screenshot saved', {
			file: savedPath,
			frame: { width: frame.width, height: frame.height },
			cropped: cropInBounds,
		});

		// Gallery thumbnail from the same in-memory frame (transparent letterbox,
		// matching the renderer's createThumbnail output). Best-effort: a thumbnail
		// failure must not discard the already-saved shot.
		try {
			await buildPipeline()
				.resize(1280, 720, {
					fit: 'contain',
					background: { r: 0, g: 0, b: 0, alpha: 0 },
				})
				.webp()
				.toFile(thumbPath);
		} catch (thumbError) {
			log.info('WGC thumbnail failed — screenshot still saved', {
				error: (thumbError as Error).message || String(thumbError),
			});
		}

		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('screenshot-response', savedPath);
		}
		restoreScreenshotState();
		lastWgcAttempt.outcome = 'saved';
		return 'saved';
	} catch (error) {
		if (committed) {
			// The primary file is already on disk — a post-write failure must not
			// trigger a second capture. Finalize as saved and restore.
			log.info('WGC post-save step failed — screenshot already saved', {
				file: savedPath,
				error: (error as Error).message || String(error),
			});
			restoreScreenshotState();
			lastWgcAttempt.outcome = 'saved';
			return 'saved';
		}
		// Grab / crop / primary write failed with nothing written — safe to
		// re-capture via the getUserMedia path.
		lastWgcAttempt.outcome = 'fallback';
		lastWgcAttempt.fallbackReason = `pre-save-throw: ${
			(error as Error).message || String(error)
		}`;
		log.info(
			'WGC capture failed before save — falling back to getUserMedia',
			{
				error: (error as Error).message || String(error),
			}
		);
		return 'fallback';
	}
}

function armCaptureWatchdog(): void {
	clearCaptureWatchdog();
	captureWatchdog = setTimeout(() => {
		captureWatchdog = null;
		if (!takingScreenshot) {
			return;
		}
		log.info('Capture watchdog fired — recovering', {
			timeoutMs: CAPTURE_WATCHDOG_MS,
		});
		// Tell the worker to abandon any in-flight capture so it stops holding
		// the stream, then restore the window and surface an error.
		if (workerWindow && !workerWindow.isDestroyed()) {
			workerWindow.webContents.send('abort-capture', 'watchdog-timeout');
		}
		restoreScreenshotState();
		reportScreenshotError(
			'Screenshot timed out — the capture worker did not respond',
			{ context: 'resize-screenshot:watchdog' }
		);
	}, CAPTURE_WATCHDOG_MS);
}

function cancelPendingCaptureAbort(): void {
	if (pendingCaptureAbort) {
		clearTimeout(pendingCaptureAbort);
		pendingCaptureAbort = null;
	}
}

function scheduleCaptureAbortOnDisconnect(): void {
	if (pendingCaptureAbort) {
		return;
	}
	// Debounce: a brief telemetry drop between sessions can emit 'Disconnected'
	// without iRacing actually exiting. Wait a moment and only abort if we're
	// still mid-capture and iRacing is genuinely gone (telemetry stays null).
	pendingCaptureAbort = setTimeout(() => {
		pendingCaptureAbort = null;
		if (!takingScreenshot || iracing.telemetry) {
			return;
		}
		log.info('iRacing disconnected during capture — aborting');
		if (workerWindow && !workerWindow.isDestroyed()) {
			workerWindow.webContents.send('abort-capture', 'iracing-disconnected');
		}
		restoreScreenshotState();
		reportScreenshotError(
			'iRacing exited during capture. At very high resolutions this can happen if it runs out of video memory (VRAM).',
			{ context: 'resize-screenshot:iracing-disconnected' }
		);
	}, CAPTURE_ABORT_DEBOUNCE_MS);
}

function restoreScreenshotState(): void {
	clearCaptureWatchdog();
	cancelPendingCaptureAbort();
	// Cancel any in-flight ReShade wait so a watchdog / disconnect-abort recovery
	// doesn't leave the wait's fs.watch + poller running, and so its own timeout
	// can't later fire a second (now-stale) reportScreenshotError. No-op unless a
	// ReShade capture is actually pending.
	clearPendingReshadeWait('Screenshot recovery');
	if (!takingScreenshot) {
		return;
	}

	if (config.get('manualWindowRestore')) {
		resize(width, height, left, top);
	} else if (
		originalWindowBounds &&
		originalWindowBounds.width > 0 &&
		originalWindowBounds.height > 0
	) {
		resize(
			originalWindowBounds.width,
			originalWindowBounds.height,
			originalWindowBounds.left,
			originalWindowBounds.top
		);
	} else {
		resize(width, height, left, top);
	}

	originalWindowBounds = null;

	if (iracing.camControls) {
		try {
			iracing.camControls.setState(cameraState);
		} catch (error) {
			// broadcastUnsafe throws if the SDK was torn down (e.g. iRacing exited
			// mid-capture and stopSDK() ran). Nothing to restore in that case.
			log.debug('camControls.setState failed during restore', {
				error: (error as Error).message || String(error),
			});
		}
	}

	takingScreenshot = false;
	log.info('iRacing window restored');
}

interface ReshadeFileInfo {
	fullPath: string;
	key: string;
	mtimeMs: number;
	size: number;
}

async function listReshadeScreenshotFiles(
	folder: string
): Promise<ReshadeFileInfo[]> {
	const supportedExtensions = new Set(['.bmp', '.jpeg', '.jpg', '.png']);
	let entries: fs.Dirent[] = [];

	try {
		entries = await fs.promises.readdir(folder, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return [];
		}

		throw error;
	}

	const files: ReshadeFileInfo[] = [];

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		const fullPath = path.join(folder, entry.name);
		const extension = path.extname(entry.name).toLowerCase();

		if (!supportedExtensions.has(extension)) {
			continue;
		}

		try {
			const stats = await fs.promises.stat(fullPath);
			files.push({
				fullPath,
				key: normalizeFileKey(fullPath),
				mtimeMs: stats.mtimeMs,
				size: stats.size,
			});
		} catch (error) {
			log.warn('ReShade screenshot stat failed', {
				fullPath,
				error: (error as Error)?.message || String(error),
			});
		}
	}

	return files;
}

async function findLatestReshadeScreenshot(
	folder: string,
	baselineFiles: Map<string, ReshadeFileInfo>,
	startedAt: number
): Promise<ReshadeFileInfo | null> {
	const files = await listReshadeScreenshotFiles(folder);
	const candidates = files.filter((file) => {
		const previous = baselineFiles.get(file.key);

		if (!previous) {
			return file.mtimeMs >= startedAt - 1000;
		}

		return file.mtimeMs > previous.mtimeMs || file.size !== previous.size;
	});

	candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
	return candidates[0] || null;
}

async function waitForFileToSettle(
	filePath: string,
	attempts = 12,
	intervalMs = 250
): Promise<void> {
	let previousStats: { size: number; mtimeMs: number } | null = null;

	for (let index = 0; index < attempts; index += 1) {
		try {
			const stats = await fs.promises.stat(filePath);

			if (
				previousStats &&
				stats.size > 0 &&
				stats.size === previousStats.size &&
				stats.mtimeMs === previousStats.mtimeMs
			) {
				return;
			}

			previousStats = {
				size: stats.size,
				mtimeMs: stats.mtimeMs,
			};
		} catch (error) {
			if (index === attempts - 1) {
				throw error;
			}
		}

		await delay(intervalMs);
	}
}

async function waitForReshadeScreenshot(
	folder: string,
	timeoutMs = 30000
): Promise<string> {
	fs.mkdirSync(folder, { recursive: true });

	const baselineFiles = new Map<string, ReshadeFileInfo>(
		(await listReshadeScreenshotFiles(folder)).map((file) => [file.key, file])
	);
	const startedAt = Date.now();

	return new Promise<string>((resolve, reject) => {
		let settled = false;
		let scanInFlight = false;
		let watcher: fs.FSWatcher | undefined;
		let poller: NodeJS.Timeout | undefined;
		let timeoutId: NodeJS.Timeout | undefined;

		const finish = <T>(callback: (value: T) => void, value: T): void => {
			if (settled) {
				return;
			}

			settled = true;

			if (watcher) {
				watcher.close();
			}

			if (poller) {
				clearInterval(poller);
			}

			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			if (cancelReshadeWait === cancel) {
				cancelReshadeWait = null;
			}

			callback(value);
		};

		const cancel = (reason: string): void => {
			finish(reject, new Error(reason));
		};

		const scan = async (): Promise<void> => {
			if (settled || scanInFlight) {
				return;
			}

			scanInFlight = true;

			try {
				const candidate = await findLatestReshadeScreenshot(
					folder,
					baselineFiles,
					startedAt
				);

				if (candidate) {
					await waitForFileToSettle(candidate.fullPath);
					finish(resolve, candidate.fullPath);
				}
			} catch (error) {
				finish(reject, error as Error);
			} finally {
				scanInFlight = false;
			}
		};

		try {
			watcher = fs.watch(folder, () => {
				void scan();
			});
		} catch (error) {
			finish(reject, error as Error);
			return;
		}

		poller = setInterval(() => {
			void scan();
		}, 500);

		timeoutId = setTimeout(() => {
			cancel('Timed out waiting for a ReShade screenshot');
		}, timeoutMs);

		cancelReshadeWait = cancel;
		void scan();
	});
}

function resize(
	targetWidth: number,
	targetHeight: number,
	targetLeft: number,
	targetTop: number
): number | undefined {
	return resizeIracingWindow(targetWidth, targetHeight, targetLeft, targetTop);
}

function loadConfig(): void {
	config = configModule;
}

function parseCameraState(iracingCameraState: string[] = []): void {
	cameraState = parseCameraStateFromArray(iracingCameraState);
}

const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));
