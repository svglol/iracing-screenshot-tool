const { app, BrowserWindow, screen, globalShortcut, Menu } = require('electron');
const { ipcMain } = require('electron');
const ffi = require('ffi-napi');
const config = require('../utilities/config');
import { productName } from '../../package.json';
import * as Sentry from '@sentry/electron';
let width, height;

// set app name
app.name = productName;
// to hide deprecation message
app.allowRendererProcessReuse = true;

// disable electron warning
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = false;

const gotTheLock = app.requestSingleInstanceLock();
const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.argv.includes('--debug');

var irsdk = require('node-irsdk');
var iracing = irsdk.getInstance();

let mainWindow, workerWindow;


// only allow single instance of application
if (!isDev) {
  Sentry.init({dsn: 'https://b80e45fd34c54ebe94691e27445740b1@o376188.ingest.sentry.io/5196735'});
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
    showDevTools: false,
  });
}

async function installDevTools() {
  try {
    /* eslint-disable */
    require('vue-devtools').install();
    /* eslint-enable */
  } catch (err) {
    console.log(err);
  }
}

function createWindow() {
  /**
  * Initial window options
  */

  workerWindow = new BrowserWindow({
    show: process.env.NODE_ENV === 'development',
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
    },
  });

  if (isDev) {
    workerWindow.loadURL('http://localhost:9080/#/worker');
  } else {
    workerWindow.loadURL(`file://${__dirname}/index.html#worker`);

      global.__static = require('path')
      .join(__dirname, '/static')
      .replace(/\\/g, '\\\\');
    }

    mainWindow = new BrowserWindow({
      title: app.name,
      show: false,
      x: config.get('winPosX'),
      y: config.get('winPosY'),
      width: config.get('winWidth'),
      height: config.get('winHeight'),
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        webSecurity: false,
      },
      frame: false,
      backgroundColor: '#252525',
    });

    Menu.setApplicationMenu(null)

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
      workerWindow.close();
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

  app.on('ready', () => {
    createWindow();

    width = screen.getPrimaryDisplay().bounds.width;
    height = screen.getPrimaryDisplay().bounds.height;

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
      resize(width, height);
      mainWindow.webContents.send('screenshot-response', output);
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
      resize(data.width, data.height);
      await wait(1000);
      iracing.camControls.setState(8);
      workerWindow.webContents.send('screenshot-request', data);
      workerWindow.webContents.send('session-info', iracing.sessionInfo);
      workerWindow.webContents.send('telemetry', iracing.telemetry);
    });

    ipcMain.on('resize', (event, data) => {
      resize(data.width, data.height);
    });

    ipcMain.on('screenshot-error', (event, data) => {
      mainWindow.webContents.send('screenshot-error',data);
    });

    ipcMain.on('screenshotKeybind-change', (event,data) => {
      globalShortcut.unregister(data.oldValue);
      globalShortcut.register(data.newValue, () => {
        mainWindow.webContents.send('hotkey-screenshot', '');
      })
    });

    globalShortcut.register(config.get('screenshotKeybind'), () => {
      mainWindow.webContents.send('hotkey-screenshot', '');
    })
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

  /**
  * Auto Updater
  *
  * Uncomment the following code below and install `electron-updater` to
  * support auto updating. Code Signing with a valid certificate is required.
  * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
  */

  /*
  import { autoUpdater } from 'electron-updater'

  autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
*/

function wait(timer) {
  return new Promise((resolve) => {
    timer = timer || 2000;
    setTimeout(() => {
      resolve();
    }, timer);
  });
}

function resize(width, height) {
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
      ['long', 'long', 'int', 'int', 'int', 'int', 'uint'],
    ],
    SetFocus: ['long', ['long']],
  });

  const kernel32 = new ffi.Library('Kernel32.dll', {
    GetCurrentThreadId: ['int', []],
  });

  const winToSetOnTop = user32.FindWindowA(null, 'iRacing.com Simulator');
  const foregroundHWnd = user32.GetForegroundWindow();
  const currentThreadId = kernel32.GetCurrentThreadId();
  const windowThreadProcessId = user32.GetWindowThreadProcessId(
    foregroundHWnd,
    null
  );
  user32.ShowWindow(winToSetOnTop, 9);
  user32.SetWindowPos(winToSetOnTop, -2, 0, 0, width, height, 0);
  user32.SetForegroundWindow(winToSetOnTop);
  user32.AttachThreadInput(windowThreadProcessId, currentThreadId, 0);
  user32.SetFocus(winToSetOnTop);
  user32.SetActiveWindow(winToSetOnTop);
}
