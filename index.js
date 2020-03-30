'use strict';
const path = require('path');
const {app, BrowserWindow, Menu} = require('electron');
/// const {autoUpdater} = require('electron-updater');
const {is} = require('electron-util');
// Const unhandled = require('electron-unhandled');
// const debug = require('electron-debug');
// const contextMenu = require('electron-context-menu');
const config = require('./config');
const menu = require('./menu');
// Const packageJson = require('./package.json');

// Unhandled();
// debug();
// contextMenu();

// app.setAppUserModelId(packageJson.build.appId);

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let mainWindow;

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
		show: false,
		x: config.get('winPosX'),
		y: config.get('winPosY'),
		width: config.get('winWidth'),
		height: config.get('winHeight'),
		minWidth: 1280,
		minHeight: 720,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: true
		},
		frame: false,
		backgroundColor: '#FFF'
	});

	win.on('ready-to-show', () => {
		win.show();
	});

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	win.on('close', () => {
		const {x, y, width, height} = win.getBounds();
		config.set('winPosX', x);
		config.set('winPosY', y);
		config.set('winWidth', width);
		config.set('winHeight', height);
	})

	await win.loadFile(path.join(__dirname, 'index.html'));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
})();
