import { productName } from '../../package.json';

import { autoUpdater } from 'electron-updater';
const { app, BrowserWindow, screen, globalShortcut, Menu } = require('electron');
const { ipcMain } = require('electron');
const ffi = require('ffi-napi');
const fs = require('fs');
const loadIniFile = require('read-ini-file');
let width, height, left, top;
let takingScreenshot = false;
let cameraState = 0;

// set app name
app.name = productName;
// to hide deprecation message
app.allowRendererProcessReuse = true;
app.commandLine.appendSwitch('js-flags', '--expose_gc');

let config;

// disable electron warning
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = false;

const gotTheLock = app.requestSingleInstanceLock();
const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.argv.includes('--debug');

var irsdk = require('node-irsdk');
var iracing = irsdk.getInstance();

let mainWindow;

// only allow single instance of application
if (!isDev) {
  if (gotTheLock) {
    app.on('second-instance', () => {
      // Someone tried to run a second instance, we should focus our window.
      if (mainWindow && mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    });
  } else {
    app.quit();
    process.exit(0);
  }
} else {
  // process.env.ELECTRON_ENABLE_LOGGING = true

  require('electron-debug')({
    showDevTools: false
  });
}

async function installDevTools () {
  try {
    /* eslint-disable */
		require('vue-devtools').install();
		/* eslint-enable */
  } catch (err) {
    console.log(err);
  }
}

function createWindow () {
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
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false
    },
    frame: false
  });

  Menu.setApplicationMenu(null);

  // eslint-disable-next-line

  if (isDev) {
    mainWindow.loadURL('http://localhost:9080');
  } else {
    mainWindow.loadFile(`${__dirname}/index.html`);

    global.__static = require('path')
      .join(__dirname, '/static')
      .replace(/\\/g, '\\\\');
  }
  // load root file/url

  // Show when loaded
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', () => {
    const { x, y, width, height } = mainWindow.getBounds();
    config.set('winPosX', x);
    config.set('winPosY', y);
    config.set('winWidth', width);
    config.set('winHeight', height);
  });

  mainWindow.on('closed', () => {
    console.log('\nApplication exiting...');
  });
}

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
    config.set(
      'defaultScreenHeight',
      screen.getPrimaryDisplay().bounds.height
    );
    height = screen.getPrimaryDisplay().bounds.height;
  }

  if (isDev) {
    installDevTools();
    mainWindow.webContents.openDevTools();
  }

  if (isDebug) {
    mainWindow.webContents.openDevTools();
  }

  ipcMain.on('screenshot-response', (event, output) => {
    mainWindow.webContents.send('screenshot-response', output);
  });

  ipcMain.on('screenshot-finished', () => {
    resize(width, height, left, top);
    iracing.camControls.setState(cameraState); // reset camera state
    takingScreenshot = false;
  });

  ipcMain.on('request-iracing-status', (event) => {
    var iracingOpen = false;
    if (iracing.telemetry != null) iracingOpen = true;
    else iracingOpen = false;
    event.reply('iracing-status', iracingOpen);
  });

  iracing.on('Connected', function () {
    mainWindow.webContents.send('iracing-connected', '');
  });

  iracing.on('Disconnected', function () {
    mainWindow.webContents.send('iracing-disconnected', '');
  });

  ipcMain.on('resize-screenshot', async (event, data) => {
    takingScreenshot = true;
    var iracingCameraState = iracing.telemetry.values.CamCameraState;
    parseCameraState(iracingCameraState);
    var States = iracing.Consts.CameraState;
    iracing.camControls.setState(States.UIHidden);
    var id = resize(data.width, data.height, left, top);
    if (!config.get('reshade')) {
      mainWindow.webContents.send('screenshot-request', {
        width: data.width,
        height: data.height,
        crop: data.crop,
        windowID: id
      });
      mainWindow.webContents.send('session-info', iracing.sessionInfo);
      mainWindow.webContents.send('telemetry', iracing.telemetry);
    } else {
      const reshadeIni = loadIniFile.sync(config.get('reshadeFile'));
      const folder = reshadeIni.GENERAL.ScreenshotPath + '\\';
      const key = reshadeIni.INPUT.KeyScreenshot.split(',')[0];
      await delay(1000);
      sendKey(key);
      const watcher = fs.watch(folder, (eventType, filename) => {
        if (filename.includes('iRacing')) {
          resize(width, height, left, top);
          iracing.camControls.setState(cameraState); // reset camera state
          takingScreenshot = false;
          mainWindow.webContents.send('session-info', iracing.sessionInfo);
          mainWindow.webContents.send('telemetry', iracing.telemetry);
          mainWindow.webContents.send('screenshot-reshade', folder + filename);
          watcher.close();
        }
      });
    }
  });

  iracing.on('update', function () {
    if (takingScreenshot) {
      var iracingCameraState = iracing.telemetry.values.CamCameraState;
      var state = iracing.Consts.CameraState.UIHidden;
      if (!iracingCameraState.includes('UseTemporaryEdits')) {
        iracing.camControls.setState(state);
      }
    }
  });

  ipcMain.on('screenshot-error', (event, data) => {
    takingScreenshot = false;
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
  mainWindow.webContents.send('update-available', '');
});

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates();
});

function resize (width, height, left, top) {
  const user32 = new ffi.Library('user32', {
    GetTopWindow: ['long', ['long']],
    FindWindowA: ['long', ['string', 'string']],
    SetActiveWindow: ['long', ['long']],
    SetForegroundWindow: ['bool', ['long']],
    BringWindowToTop: ['bool', ['long']],
    ShowWindow: ['bool', ['long', 'int']],
    SwitchToThisWindow: ['void', ['long', 'bool']],
    GetForegroundWindow: ['long', []],
    AttachThreadInput: ['bool', ['int', 'long', 'bool']],
    GetWindowThreadProcessId: ['int', ['long', 'int']],
    SetWindowPos: [
      'bool',
      ['long', 'long', 'int', 'int', 'int', 'int', 'uint']
    ],
    SetFocus: ['long', ['long']],
    SetWindowLongA: ['long', ['uint32', 'int', 'long']],
    GetWindowLongA: ['long', ['long', 'long']],
    GetWindowRect: ['bool', ['int32', 'pointer']]
  });

  const kernel32 = new ffi.Library('Kernel32.dll', {
    GetCurrentThreadId: ['int', []]
  });

  const winToSetOnTop = user32.FindWindowA(null, 'iRacing.com Simulator');
  const foregroundHWnd = user32.GetForegroundWindow();
  const currentThreadId = kernel32.GetCurrentThreadId();
  const windowThreadProcessId = user32.GetWindowThreadProcessId(
    foregroundHWnd,
    null
  );

  user32.SetWindowPos(winToSetOnTop, -2, left, top, width, height, 0);
  var rectPointer = Buffer.alloc(4 * 4);
  user32.GetWindowRect(winToSetOnTop, rectPointer);
  var rect = RectPointerToRect(rectPointer);
  if (rect.right - rect.left !== width || rect.bottom - rect.top !== height) {
    user32.SetWindowPos(winToSetOnTop, -2, left, top, width, height, 0);
  }

  // 349110272 - bordered
  // 335544320 - borderless
  // var winStyle = user32.GetWindowLongA(winToSetOnTop,-16);
  // if(winStyle !== 335544320){
  //   user32.SetWindowLongA(winToSetOnTop,-16,335544320);
  // }

  user32.ShowWindow(winToSetOnTop, 9);
  user32.SetForegroundWindow(winToSetOnTop);
  user32.AttachThreadInput(windowThreadProcessId, currentThreadId, 0);
  user32.SetFocus(winToSetOnTop);
  user32.SetActiveWindow(winToSetOnTop);
  return winToSetOnTop;
}

function sendKey (keyID) {
  // const user32 = new ffi.Library('user32', {
  //   FindWindowA: ['long', ['string', 'string']],
  //   SendMessageA: [
  //     'long', ['long', 'int32', 'long', 'int32']
  //   ]
  // });
  //
  // const window = user32.FindWindowA(null, 'iRacing.com Simulator');
  // user32.SendMessageA(window, 0x0100 /* WM_KEYDOWN */, 0x2C, 0);
  // user32.SendMessageA(window, 0x0101 /* WM_KEYUP */, 0x2C, 0);
}

function RectPointerToRect (rectPointer) {
  const rect = {};
  rect.left = rectPointer.readUInt32LE(0);
  rect.top = rectPointer.readUInt32LE(4);
  rect.right = rectPointer.readUInt32LE(8);
  rect.bottom = rectPointer.readUInt32LE(12);
  return rect;
}

function loadConfig () {
  try {
    config = require('../utilities/config');
  } catch (e) {
    fs.unlinkSync(app.getPath('userData') + '\\config.json');
    config = require('../utilities/config');
  }
}

function parseCameraState (iracingCameraState) {
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
    }
  });
  if (!iracingCameraState.includes('CamToolActive')) {
    cameraState += 4;
  }
}

const delay = ms => new Promise(function (resolve) { setTimeout(resolve, ms); });
