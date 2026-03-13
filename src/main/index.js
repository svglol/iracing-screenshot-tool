const { productName } = require('../../package.json');
const { autoUpdater } = require('electron-updater');
const remoteMain = require('@electron/remote/main');
const { app, BrowserWindow, screen, globalShortcut, Menu, ipcMain, dialog, desktopCapturer } = require('electron');
const fs = require('fs');
const loadIniFile = require('read-ini-file');
const path = require('path');

const irsdk = require('./iracing-sdk');
const { resizeIracingWindow } = require('./window-utils');

let width;
let height;
let left;
let top;
let takingScreenshot = false;
let cameraState = 0;
let config;
let mainWindow;
let workerWindow;
let workerReady = false;
let cancelReshadeWait = null;

app.name = productName;
app.commandLine.appendSwitch('js-flags', '--expose_gc');
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = false;

remoteMain.initialize();

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
    showDevTools: false
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

function createWindow() {
  workerWindow = new BrowserWindow({
    show: isDev,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      webSecurity: false
    }
  });

  remoteMain.enable(workerWindow.webContents);

  workerWindow.webContents.on('did-finish-load', () => {
    workerReady = true;
  });

  workerWindow.on('closed', () => {
    workerReady = false;
  });

  if (isDev) {
    workerWindow.loadURL('http://localhost:9080/#/worker');
  } else {
    workerWindow.loadFile(path.join(__dirname, 'index.html'), { hash: '/worker' });
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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  remoteMain.enable(mainWindow.webContents);
  Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:9080');
  } else {
    mainWindow.loadFile(`${__dirname}/index.html`);
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
    broadcastToWindows(`config:changed:${payload.key}`, payload.value, oldValue);
  }
});

ipcMain.on('app:getPath-sync', (event, name) => {
  event.returnValue = app.getPath(name);
});

ipcMain.handle('dialog:showOpen', (event, options) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  return dialog.showOpenDialog(browserWindow || undefined, options);
});
ipcMain.handle('desktop-capturer:get-source-id', async (event, windowHandle) => {
  const targetId = String(windowHandle || '');
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  });

  const match = sources.find((source) => source.id.startsWith('window:' + targetId + ':'));
  return match ? match.id : null;
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
    config.set('defaultScreenHeight', screen.getPrimaryDisplay().bounds.height);
    height = screen.getPrimaryDisplay().bounds.height;
  }

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
    if (takingScreenshot) {
      return;
    }

    if (!iracing.telemetry || !iracing.sessionInfo) {
      mainWindow.webContents.send('screenshot-error', 'iRacing telemetry is not available');
      return;
    }

    if (!workerReady) {
      mainWindow.webContents.send('screenshot-error', 'Screenshot worker is still loading');
      return;
    }

    takingScreenshot = true;
    parseCameraState(iracing.telemetry.values.CamCameraState);
    iracing.camControls.setState(iracing.Consts.CameraState.UIHidden);

    const id = resize(data.width, data.height, left, top);

    if (id === undefined) {
      restoreScreenshotState();
      mainWindow.webContents.send('screenshot-error', 'iRacing window not found');
      return;
    }

    if (!config.get('reshade')) {
      workerWindow.webContents.send('session-info', iracing.sessionInfo);
      workerWindow.webContents.send('telemetry', iracing.telemetry);
      workerWindow.webContents.send('screenshot-request', {
        width: data.width,
        height: data.height,
        crop: data.crop,
        windowID: id
      });
      return;
    }

    try {
      const reshadeIni = loadIniFile.sync(config.get('reshadeFile'));
      const folder = getReshadeScreenshotFolder(reshadeIni);
      const reshadeFile = await waitForReshadeScreenshot(folder);

      restoreScreenshotState();
      workerWindow.webContents.send('session-info', iracing.sessionInfo);
      workerWindow.webContents.send('telemetry', iracing.telemetry);
      workerWindow.webContents.send('screenshot-reshade', reshadeFile);
    } catch (error) {
      restoreScreenshotState();
      mainWindow.webContents.send('screenshot-error', error.message || String(error));
    }
  });

  iracing.on('update', () => {
    if (takingScreenshot && iracing.telemetry) {
      const currentState = iracing.telemetry.values.CamCameraState || [];
      if (!currentState.includes('UseTemporaryEdits')) {
        iracing.camControls.setState(iracing.Consts.CameraState.UIHidden);
      }
    }
  });

  ipcMain.on('screenshot-error', (event, data) => {
    restoreScreenshotState();
    mainWindow.webContents.send('screenshot-error', data);
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

  resize(width, height, left, top);

  if (iracing.camControls) {
    iracing.camControls.setState(cameraState);
  }

  takingScreenshot = false;
}

function getReshadeScreenshotFolder(reshadeIni = {}) {
  const folder = reshadeIni.SCREENSHOT?.SavePath || reshadeIni.GENERAL?.ScreenshotPath;

  if (!folder) {
    throw new Error('Unable to determine the ReShade screenshot folder');
  }

  return path.resolve(folder);
}

function normalizeFileKey(filePath) {
  return path.resolve(filePath).toLowerCase();
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
        size: stats.size
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
        mtimeMs: stats.mtimeMs
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
        const candidate = await findLatestReshadeScreenshot(folder, baselineFiles, startedAt);

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
  cameraState = 0;

  iracingCameraState.forEach((state) => {
    switch (state) {
      case 'IsSessionScreen':
        cameraState += 1;
        break;
      case 'IsScenicActive':
        cameraState += 2;
        break;
      case 'CamToolActive':
        cameraState += 4;
        break;
      case 'UIHidden':
        cameraState += 8;
        break;
      case 'UseAutoShotSelection':
        cameraState += 16;
        break;
      case 'UseTemporaryEdits':
        cameraState += 32;
        break;
      case 'UseKeyAcceleration':
        cameraState += 64;
        break;
      case 'UseKey10xAcceleration':
        cameraState += 128;
        break;
      case 'UseMouseAimMode':
        cameraState += 256;
        break;
      default:
        break;
    }
  });

  if (!iracingCameraState.includes('CamToolActive')) {
    cameraState += 4;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));








