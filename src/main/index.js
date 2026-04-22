const { productName, build } = require('../../package.json');
const { autoUpdater } = require('electron-updater');
const remoteMain = require('@electron/remote/main');
const {
	app,
	BrowserWindow,
	screen,
	globalShortcut,
	Menu,
	ipcMain,
	dialog,
	desktopCapturer,
	nativeImage,
} = require('electron');
const fs = require('fs');
const loadIniFile = require('read-ini-file');
const os = require('os');
const path = require('path');

const irsdk = require('./iracing-sdk');
const {
	resizeIracingWindow,
	resizeIracingWindowAsync,
	getIracingWindowDetails,
} = require('./window-utils');
const { createLogger } = require('../utilities/logger');
const log = createLogger('main');
const {
	normalizeWindowHandle,
	normalizeWindowTitle,
	normalizeCaptureBounds,
	findSourceByWindowHandles,
	findSourceByWindowTitle,
	findSourceByKnownIracingTitle,
	findDisplaySourceByDisplayId,
} = require('../utilities/desktop-capture');
const {
	isPlainObject,
	mergePlainObjects,
	serializeBounds,
	serializeDisplay,
	summarizeDesktopSource,
	summarizeDesktopSources,
	createScreenshotErrorPayload,
	trimWrappedQuotes,
	expandWindowsEnvironmentVariables,
	normalizeComparableWindowsPath,
	getWindowsUserProfileRoot,
	resolveReshadeBasePath,
	remapForeignUserProfileFolder,
	createReshadeConfigError,
	getReshadeScreenshotFolder,
	normalizeFileKey,
	parseCameraState: parseCameraStateFromArray,
} = require('./main-utils');

let width;
let height;
let left;
let top;
let takingScreenshot = false;
let originalWindowBounds = null;
let cameraState = 0;
let config;
let mainWindow;
let workerWindow;
let workerReady = false;
let cancelReshadeWait = null;
const appId = build?.appId || 'com.svglol.iracing-screenshot-tool';

app.name = productName;
app.commandLine.appendSwitch('js-flags', '--expose_gc');
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = false;

remoteMain.initialize();

function createWindowIcon() {
	const iconPath = process.resourcesPath
		? path.join(process.resourcesPath, 'icon.png')
		: path.join(__dirname, '..', 'static', 'icon.png');
	const icon = nativeImage.createFromPath(iconPath);
	return icon.isEmpty() ? undefined : icon;
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
	require('electron-debug')({
		showDevTools: false,
	});
}

async function installDevTools() {
	try {
		require('vue-devtools').install();
	} catch (err) {
		console.log(err);
	}
}

function broadcastToWindows(channel, ...args) {
	[mainWindow, workerWindow].forEach((window) => {
		if (window && !window.isDestroyed()) {
			window.webContents.send(channel, ...args);
		}
	});
}

function getConfigDiagnosticValue(key) {
	if (!config) {
		return undefined;
	}

	try {
		return config.get(key);
	} catch (error) {
		return `[config read failed: ${error.message}]`;
	}
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
		},
	};
}

function getMainScreenshotDiagnostics() {
	try {
		return buildMainScreenshotDiagnostics();
	} catch (error) {
		return {
			diagnosticsError: error.message || String(error),
		};
	}
}

function getScreenshotErrorLogPath() {
	return path.join(app.getPath('userData'), 'logs', 'screenshot-errors.log');
}

function writeScreenshotErrorLog(payload) {
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

function reportScreenshotError(errorLike, defaults = {}) {
	const payload = createScreenshotErrorPayload(errorLike, {
		...defaults,
		diagnostics: mergePlainObjects(defaults.diagnostics, {
			main: getMainScreenshotDiagnostics(),
		}),
	});
	const logFile = writeScreenshotErrorLog(payload);
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

function createWindow() {
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

	remoteMain.enable(workerWindow.webContents);

	workerWindow.webContents.on('did-finish-load', () => {
		workerReady = true;
	});

	workerWindow.on('closed', () => {
		workerReady = false;
	});

	if (process.env.ELECTRON_RENDERER_URL) {
		workerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/worker`);
	} else {
		workerWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
			hash: '/worker',
		});
		global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
	}

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

	remoteMain.enable(mainWindow.webContents);
	Menu.setApplicationMenu(null);

	if (process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
		global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\');
	}

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});

	mainWindow.on('close', () => {
		clearPendingReshadeWait('Application closing');
		restoreScreenshotState();

		if (workerWindow && !workerWindow.isDestroyed()) {
			workerWindow.close();
		}

		const bounds = mainWindow.getBounds();
		config.set('winPosX', bounds.x);
		config.set('winPosY', bounds.y);
		config.set('winWidth', bounds.width);
		config.set('winHeight', bounds.height);
	});

	mainWindow.on('closed', () => {
		log.info('App exiting');
		console.log('\nApplication exiting...');
	});
}

ipcMain.on('config:get', (event, key) => {
	event.returnValue = config.get(key);
});

ipcMain.on('config:set', (event, payload) => {
	const oldValue = config.get(payload.key);
	config.set(payload.key, payload.value);
	event.returnValue = true;

	if (oldValue !== payload.value) {
		log.debug('Config changed', { key: payload.key });
		broadcastToWindows(
			`config:changed:${payload.key}`,
			payload.value,
			oldValue
		);
	}
});

ipcMain.on('app:getPath-sync', (event, name) => {
	event.returnValue = app.getPath(name);
});

ipcMain.on('app:isDevBuild-sync', (event) => {
	event.returnValue = !app.isPackaged || app.getVersion().includes('+');
});

ipcMain.handle('dialog:showOpen', (event, options) => {
	const browserWindow = BrowserWindow.fromWebContents(event.sender);
	return dialog.showOpenDialog(browserWindow || undefined, options);
});
ipcMain.handle('desktop-capturer:get-source-id', async (event, request) => {
	const captureRequest =
		request && typeof request === 'object' && !Array.isArray(request)
			? request
			: { windowID: request };
	const requestedHandle = normalizeWindowHandle(captureRequest.windowID);
	const requestedBounds = normalizeCaptureBounds(captureRequest.captureBounds);
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
});

ipcMain.on('window-control', (event, action) => {
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

	if (isDev) {
		installDevTools();
		mainWindow.webContents.openDevTools();
		workerWindow.webContents.openDevTools();
	}

	if (isDebug) {
		mainWindow.webContents.openDevTools();
		workerWindow.webContents.openDevTools();
	}

	ipcMain.on('screenshot-response', (event, output) => {
		log.info('Screenshot complete', { file: output });
		mainWindow.webContents.send('screenshot-response', output);
	});

	ipcMain.on('screenshot-finished', () => {
		restoreScreenshotState();
	});

	ipcMain.on('request-iracing-status', (event) => {
		event.reply('iracing-status', iracing.telemetry != null);
	});

	iracing.on('Connected', () => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('iracing-connected', '');
		}
	});

	iracing.on('Disconnected', () => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send('iracing-disconnected', '');
		}
	});

	ipcMain.on('resize-screenshot', async (event, data) => {
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

		if (!iracing.telemetry || !iracing.sessionInfo) {
			log.info('Screenshot rejected', { reason: 'no-telemetry' });
			reportScreenshotError('iRacing telemetry is not available', {
				context: 'resize-screenshot:telemetry',
				meta: { request: data },
			});
			return;
		}

		if (!workerReady) {
			log.info('Screenshot rejected', { reason: 'worker-not-ready' });
			reportScreenshotError('Screenshot worker is still loading', {
				context: 'resize-screenshot:worker-ready',
				meta: { request: data },
			});
			return;
		}

		takingScreenshot = true;
		originalWindowBounds = getIracingWindowDetails();
		parseCameraState(iracing.telemetry.values.CamCameraState);
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
			if (
				iracing.telemetry &&
				iracing.telemetry.values.CamCameraState &&
				iracing.telemetry.values.CamCameraState.includes('UIHidden')
			) {
				break;
			}
		}
		log.debug('UI hide wait', {
			waited,
			confirmed:
				iracing.telemetry?.values?.CamCameraState?.includes('UIHidden') ||
				false,
		});

		if (!config.get('reshade')) {
			// Run resize and source enumeration concurrently. spawnSync blocks the
			// event loop so desktopCapturer.getSources can't overlap with it — using
			// the async resize variant lets both run in parallel.
			const [id, windowSources] = await Promise.all([
				resizeIracingWindowAsync(data.width, data.height, left, top),
				desktopCapturer.getSources({
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

			let sourceId = null;
			const match = findSourceByWindowHandles(windowSources, [String(id)]);
			if (match) {
				sourceId = match.id;
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
			workerWindow.webContents.send('session-info', iracing.sessionInfo);
			workerWindow.webContents.send('telemetry', iracing.telemetry);
			workerWindow.webContents.send('screenshot-request', {
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
			return;
		}

		// ReShade path: sync resize is fine since we don't need source enumeration
		const id = resize(data.width, data.height, left, top);

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

		let reshadeLocation = null;

		try {
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
			workerWindow.webContents.send('session-info', iracing.sessionInfo);
			workerWindow.webContents.send('telemetry', iracing.telemetry);
			workerWindow.webContents.send('screenshot-reshade', reshadeFile);
		} catch (error) {
			restoreScreenshotState();
			reportScreenshotError(error, {
				context: 'resize-screenshot:reshade',
				meta: {
					request: data,
					reshadeFile: config.get('reshadeFile'),
					...(reshadeLocation || {}),
					...(error && error.meta ? error.meta : {}),
				},
			});
		}
	});

	iracing.on('update', () => {
		if (takingScreenshot && iracing.telemetry) {
			const currentState = iracing.telemetry.values.CamCameraState || [];
			if (!currentState.includes('UseTemporaryEdits')) {
				iracing.camControls.setState(
					cameraState | iracing.Consts.CameraState.UIHidden
				);
			}
		}
	});

	ipcMain.on('screenshot-error', (event, data) => {
		restoreScreenshotState();
		reportScreenshotError(data, {
			source: 'worker',
			context: 'worker:screenshot-error',
		});
	});

	ipcMain.on('screenshotKeybind-change', (event, data) => {
		globalShortcut.unregister(data.oldValue);
		globalShortcut.register(data.newValue, () => {
			mainWindow.webContents.send('hotkey-screenshot', '');
		});
	});

	globalShortcut.register(config.get('screenshotKeybind'), () => {
		mainWindow.webContents.send('hotkey-screenshot', '');
	});

	ipcMain.on('defaultScreenHeight', (event, data) => {
		height = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('defaultScreenWidth', (event, data) => {
		width = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('defaultScreenLeft', (event, data) => {
		left = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('defaultScreenTop', (event, data) => {
		top = data;
		if (!takingScreenshot) {
			resize(width, height, left, top);
		}
	});

	ipcMain.on('install-update', () => {
		autoUpdater.quitAndInstall();
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

autoUpdater.on('update-downloaded', () => {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send('update-available', '');
	}
});

app.on('ready', () => {
	if (process.env.NODE_ENV === 'production') {
		autoUpdater.checkForUpdates();
	}
});

function clearPendingReshadeWait(reason = 'Screenshot cancelled') {
	if (typeof cancelReshadeWait !== 'function') {
		return;
	}

	const cancel = cancelReshadeWait;
	cancelReshadeWait = null;
	cancel(reason);
}

function restoreScreenshotState() {
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
		iracing.camControls.setState(cameraState);
	}

	takingScreenshot = false;
	log.info('iRacing window restored');
}

async function listReshadeScreenshotFiles(folder) {
	const supportedExtensions = new Set(['.bmp', '.jpeg', '.jpg', '.png']);
	let entries = [];

	try {
		entries = await fs.promises.readdir(folder, { withFileTypes: true });
	} catch (error) {
		if (error.code === 'ENOENT') {
			return [];
		}

		throw error;
	}

	const files = [];

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
			console.log(error);
		}
	}

	return files;
}

async function findLatestReshadeScreenshot(folder, baselineFiles, startedAt) {
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

async function waitForFileToSettle(filePath, attempts = 12, intervalMs = 250) {
	let previousStats = null;

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

async function waitForReshadeScreenshot(folder, timeoutMs = 30000) {
	fs.mkdirSync(folder, { recursive: true });

	const baselineFiles = new Map(
		(await listReshadeScreenshotFiles(folder)).map((file) => [file.key, file])
	);
	const startedAt = Date.now();

	return new Promise((resolve, reject) => {
		let settled = false;
		let scanInFlight = false;
		let watcher;
		let poller;
		let timeoutId;

		const finish = (callback, value) => {
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

		const cancel = (reason) => {
			finish(reject, new Error(reason));
		};

		const scan = async () => {
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
				finish(reject, error);
			} finally {
				scanInFlight = false;
			}
		};

		try {
			watcher = fs.watch(folder, () => {
				void scan();
			});
		} catch (error) {
			finish(reject, error);
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

function resize(targetWidth, targetHeight, targetLeft, targetTop) {
	return resizeIracingWindow(targetWidth, targetHeight, targetLeft, targetTop);
}

function loadConfig() {
	try {
		config = require('../utilities/config');
	} catch (error) {
		fs.unlinkSync(path.join(app.getPath('userData'), 'config.json'));
		config = require('../utilities/config');
	}
}

function parseCameraState(iracingCameraState = []) {
	cameraState = parseCameraStateFromArray(iracingCameraState);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
