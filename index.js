'use strict';
const path = require('path');
const {app, BrowserWindow, Menu} = require('electron');
/// const {autoUpdater} = require('electron-updater');
const {is} = require('electron-util');
// Const unhandled = require('electron-unhandled');
// const debug = require('electron-debug');
// const contextMenu = require('electron-context-menu');
// const config = require('./config');
const menu = require('./menu');
// Const packageJson = require('./package.json');
const fs = require('fs');
const {width, height} = require('screenz');
const iracing = require('./node-irsdk').getInstance();
const windowStateKeeper = require('electron-window-state');
const {ipcMain} = require('electron'); // Include the ipc module to communicate with render process ie to receive the message from render process
const screenshot = require('./screenshot.js');
// Const wsi = require('wmic-sys-info');
const homedir = require('os').homedir();
const sharp = require('sharp');

const dir = homedir + '/Pictures/Screenshots/';

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
	const mainWindowState = windowStateKeeper({
		defaultWidth: 1280,
		defaultHeight: 720
	});

	const win = new BrowserWindow({
		title: app.name,
		show: false,
		x: mainWindowState.x,
		y: mainWindowState.y,
		width: mainWindowState.width,
		height: mainWindowState.height,
		minWidth: 1280,
		minHeight: 720,
		webPreferences: {
			nodeIntegration: true
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
	await loadGallery();
})();

ipcMain.on('screenshot', (event, arg) => {
	let w = 1920;
	let h = 1080;
	switch (arg) {
		case '1080p':
			w = 1920;
			h = 1080;
			break;
		case '2k':
			w = 2560;
			h = 1440;
			break;
		case '4k':
			w = 3840;
			h = 2160;
			break;
		case '5k':
			w = 5120;
			h = 2880;
			break;
		case '6k':
			w = 6400;
			h = 3600;
			break;
		case '7k':
			w = 7168;
			h = 4032;
			break;
		case '8k':
			w = 7680;
			h = 4320;
			break;
		default:
			w = 1920;
			h = 1080;
	}

	screenshot.screenshot(w, h, mainWindow);
});

// Const repeat = (ms, func) => new Promise(r => (setInterval(func, ms), wait(ms).then(r)));

// Repeat(2000, () => Promise.all([wsi.getNvidiaSmi()])
// .then(data => {
// 	if(mainWindow != null){
// 		mainWindow.webContents.send('updateMemory', data[0][data[0].length-1].gpu.fb_memory_usage);
// 		data = null;
// 	}
// }));

// function wait(timer) {
// 	return new Promise(resolve => {
// 		timer = timer || 2000;
// 		setTimeout(() => {
// 			resolve();
// 		}, timer);
// 	});
// }

ipcMain.on('newScreenshot', (event, arg) => {
	const base64Data = arg.replace(/^data:image\/png;base64,/, '');
	const fileName = dir + getFileNameString();
	require('fs').writeFile(fileName, base64Data, 'base64', err => {
		if (err) {
			console.log(err);
		}

		addImage(fileName);
		screenshot.resize(width, height);
	});
});

function getFileNameString() {
	const trackName = iracing.sessionInfo.data.WeekendInfo.TrackDisplayShortName;
	let driverName = '';
	iracing.sessionInfo.data.DriverInfo.Drivers.forEach(item => {
		if (iracing.telemetry.values.CamCarIdx === item.CarIdx) {
			driverName = item.UserName;
		}
	});

	const now = new Date();
	return trackName + '-' + driverName + '-' + now.getTime() + '.png';
}

function addImage(file) {
	mainWindow.webContents.send('galleryAdd', {file, src: file});
	// sharp(file)
	// 	.resize(1500)
	// 	.toFormat('jpeg')
	// 	.toBuffer()
	// 	.then(data => {
	// 		const base64 = `data:image/png;base64,${data.toString('base64')}`;
	// 		mainWindow.webContents.send('galleryAdd', {file, src: file});
	// 	})
	// 	.catch(error => {
	// 		console.log(error);
	// 	});
}

async function loadGallery() {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	// Load images from screenshots Folder
	await fs.readdir(dir, (err, files) => {
		console.log(err);
		files = files.map(fileName => {
			return {
				name: fileName,
				time: fs.statSync(dir + '/' + fileName).mtime.getTime()
			};
		})
			.sort((a, b) => {
				return a.time - b.time;
			})
			.map(v => {
				return v.name;
			});

		files.forEach(async file => {
			if (file.split('.').pop() === 'png') {
				// AddImage(dir + file);
				mainWindow.webContents.send('galleryAdd', {file: dir + file, src: dir + file});
			}
		});
	});
}
