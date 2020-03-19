'use strict';
const path = require('path');
const {app, BrowserWindow, Menu} = require('electron');
/// const {autoUpdater} = require('electron-updater');
const {is} = require('electron-util');
const unhandled = require('electron-unhandled');
const debug = require('electron-debug');
const contextMenu = require('electron-context-menu');
const config = require('./config');
const menu = require('./menu');
const packageJson = require('./package.json');
const fs = require('fs')
const { width, height } = require("screenz");
const iracing = require('./node-irsdk').getInstance();
const windowStateKeeper = require('electron-window-state');

// unhandled();
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
	let mainWindowState = windowStateKeeper({
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
		minWidth:1280,
		minHeight:720,
		webPreferences: {
			nodeIntegration: true
		},
		frame: false,
		backgroundColor: '#FFF',
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
	loadGallery();
})();

const {ipcMain} = require('electron'); // include the ipc module to communicate with render process ie to receive the message from render process
const screenshot = require('./screenshot.js');
const wsi = require('wmic-sys-info');
const homedir = require('os').homedir();

ipcMain.on("screenshot",function (event, arg) {
	var w = 1920;
	var h = 1080;
	switch(arg){
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
	}
	screenshot.screenshot(w,h,mainWindow);
});

let repeat = (ms, func) => new Promise(r => (setInterval(func, ms), wait(ms).then(r)));

// repeat(2000, () => Promise.all([wsi.getNvidiaSmi()])
// .then(data => {
// 	if(mainWindow != null){
// 		mainWindow.webContents.send('updateMemory', data[0][data[0].length-1].gpu.fb_memory_usage);
// 		data = null;
// 	}
// }));

function wait(timer) {
	return new Promise(resolve => {
		timer = timer || 2000;
		setTimeout(function () {
			resolve();
		}, timer);
	});
};

var dir = homedir+'/Pictures/Screenshots/';

if (!fs.existsSync(dir)){
	fs.mkdirSync(dir);
}

ipcMain.on("newScreenshot",function (event, arg) {
	var base64Data = arg.replace(/^data:image\/png;base64,/, "");
	var fileName =  dir+getFileNameString();
	require("fs").writeFile(fileName, base64Data, 'base64', function(err) {
		if(err) console.log(err);
		addImage(fileName);
		screenshot.resize(width,height);

	});

});

function getFileNameString() {
	var trackName = iracing.sessionInfo.data.WeekendInfo.TrackDisplayShortName;
	var driverName = ""
	iracing.sessionInfo.data.DriverInfo.Drivers.forEach((item, i) => {
		if(iracing.telemetry.values.CamCarIdx === item.CarIdx){
			driverName = item.UserName;
		}
	});

	var now = new Date();
	return trackName+'-'+driverName+'-'+now.getTime() +'.png';
}

const sharp = require('sharp');

function addImage(file){

	sharp(file)
	.resize(1500)
	.toFormat('jpeg')
	.toBuffer()
	.then( data => {
		var base64 = `data:image/png;base64,${data.toString('base64')}`;
		mainWindow.webContents.send('galleryAdd', {"file":file,"src":base64})
	})
	.catch( err => {  });
}

function loadGallery(){
	//load images from screenshots Folder

	fs.readdir(dir, function(err, files){
		files = files.map(function (fileName) {
			return {
				name: fileName,
				time: fs.statSync(dir + '/' + fileName).mtime.getTime()
			};
		})
		.sort(function (a, b) {
			return a.time - b.time; })
			.map(function (v) {
				return v.name; });

				files.forEach(function (file) {
					if(file.split('.').pop() == "png"){
						addImage(dir+file);
					}
				});
			});
		}
