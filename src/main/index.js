const { app, BrowserWindow, screen, globalShortcut, Menu } = require('electron');
const { ipcMain } = require('electron');
const ffi = require('ffi-napi');
const fs = require("fs");
import { productName } from '../../package.json';
let width, height, left, top;
let takingScreenshot = false;

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

let mainWindow, workerWindow;

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
      minWidth: 1100,
      minHeight: 655,
      backgroundColor: '#252525',
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        webSecurity: false,
      },
      frame: false,
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

  app.on('ready', async () => {
    loadConfig();
    createWindow();

    width = config.get('defaultScreenWidth');
    height = config.get('defaultScreenHeight');
    left = config.get('defaultScreenLeft');
    top = config.get('defaultScreenTop');

    if(config.get('defaultScreenWidth') === 0){
      config.set('defaultScreenWidth',screen.getPrimaryDisplay().bounds.width);
      width = screen.getPrimaryDisplay().bounds.width;
    }

    if(config.get('defaultScreenHeight') === 0){
      config.set('defaultScreenHeight',screen.getPrimaryDisplay().bounds.height);
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
      resize(width, height, left, top);
      iracing.camControls.setState(4); //reopen camera edit
      mainWindow.webContents.send('screenshot-response', output);
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
      iracing.camControls.setState(8);
      var id = resize(data.width, data.height,left,top);
      workerWindow.webContents.send('screenshot-request', {width:data.width,height:data.height,crop:data.crop,windowID:id});
      workerWindow.webContents.send('session-info', iracing.sessionInfo);
      workerWindow.webContents.send('telemetry', iracing.telemetry);
    });

    iracing.on('update', function () {
      if(takingScreenshot){
        iracing.camControls.setState(8);
      }
    });

    ipcMain.on('screenshot-error', (event, data) => {
      takingScreenshot = false;
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

    ipcMain.on('defaultScreenHeight', (event,data) => {
      height = data;
      if(!takingScreenshot){
        resize(width,height,left,top);
      }
    });

    ipcMain.on('defaultScreenWidth', (event,data) => {
      width = data;
      if(!takingScreenshot){
        resize(width,height,left,top);
      }
    });

    ipcMain.on('defaultScreenLeft', (event,data) => {
      left = data;
      if(!takingScreenshot){
        resize(width,height,left,top);
      }
    });

    ipcMain.on('defaultScreenTop', (event,data) => {
      top = data;
      if(!takingScreenshot){
        resize(width,height,left,top);
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

  import { autoUpdater } from 'electron-updater'

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-available', '');
  })


  app.on('ready', () => {
    if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
  })

  function resize(width, height,left,top) {
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
      SetWindowLongA:['long',['uint32','int','long']],
      GetWindowLongA:['long',['long','long']],
      GetWindowRect: ["bool", ["int32", "pointer"]],
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

    user32.SetWindowPos(winToSetOnTop, -2, left, top, width, height, 0);
    var rectPointer = Buffer.alloc(4 * 4);
    user32.GetWindowRect(winToSetOnTop,rectPointer)
    var rect = RectPointerToRect(rectPointer);
    if((rect.right - rect.left) !== width || (rect.bottom - rect.top) !== height ){
      user32.SetWindowPos(winToSetOnTop, -2, left, top, width, height,0);
    }

    //349110272 - bordered
    //335544320 - borderless
    var winStyle = user32.GetWindowLongA(winToSetOnTop,-16);
    if(winStyle !== 335544320){
      user32.SetWindowLongA(winToSetOnTop,-16,335544320);
    }

    user32.ShowWindow(winToSetOnTop, 9);
    user32.SetForegroundWindow(winToSetOnTop);
    user32.AttachThreadInput(windowThreadProcessId, currentThreadId, 0);
    user32.SetFocus(winToSetOnTop);
    user32.SetActiveWindow(winToSetOnTop);
    return winToSetOnTop;
  }

  function RectPointerToRect(rectPointer) {
    let rect = {};
    rect.left = rectPointer.readUInt32LE(0);
    rect.top = rectPointer.readUInt32LE(4);
    rect.right = rectPointer.readUInt32LE(8);
    rect.bottom = rectPointer.readUInt32LE(12);
    return rect;
  }

  function loadConfig(){
    try{
      config = require('../utilities/config');
    }
    catch{
      fs.unlinkSync(app.getPath('userData')+'\\config.json');
      config = require('../utilities/config');
    }
  }
