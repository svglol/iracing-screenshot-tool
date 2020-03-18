const ffi = require('ffi-napi');
const iracing = require('./node-irsdk').getInstance();

module.exports ={
	screenshot: async function(w,h,mainWindow){
		iracing.camControls.setState(8)
		this.resize(w,h);
		await wait(1000);
		mainWindow.webContents.send('screenshot',"");
	},
	resize: function(width,height){
		var user32 = new ffi.Library('user32', {
			'GetTopWindow': ['long', ['long']],
			'FindWindowA': ['long', ['string', 'string']],
			'SetActiveWindow': ['long', ['long']],
			'SetForegroundWindow': ['bool', ['long']],
			'BringWindowToTop': ['bool', ['long']],
			'ShowWindow': ['bool', ['long', 'int']],
			'SwitchToThisWindow': ['void', ['long', 'bool']],
			'GetForegroundWindow': ['long', []],
			'AttachThreadInput': ['bool', ['int', 'long', 'bool']],
			'GetWindowThreadProcessId': ['int', ['long', 'int']],
			'SetWindowPos': ['bool', ['long', 'long', 'int', 'int', 'int', 'int', 'uint']],
			'SetFocus': ['long', ['long']]
		});

		var kernel32 = new ffi.Library('Kernel32.dll', {
			'GetCurrentThreadId': ['int', []]
		});

		var winToSetOnTop = user32.FindWindowA(null, "iRacing.com Simulator")
		var foregroundHWnd = user32.GetForegroundWindow()
		var currentThreadId = kernel32.GetCurrentThreadId()
		var windowThreadProcessId = user32.GetWindowThreadProcessId(foregroundHWnd, null)
		var showWindow = user32.ShowWindow(winToSetOnTop, 9)
		var setWindowPos1 = user32.SetWindowPos(winToSetOnTop, -2, 0, 0, width, height, 0)
		var setForegroundWindow = user32.SetForegroundWindow(winToSetOnTop)
		var attachThreadInput = user32.AttachThreadInput(windowThreadProcessId, currentThreadId, 0)
		var setFocus = user32.SetFocus(winToSetOnTop)
		var setActiveWindow = user32.SetActiveWindow(winToSetOnTop)
	}
}

function wait(timer) {
	return new Promise(resolve => {
		timer = timer || 2000;
		setTimeout(function () {
			resolve();
		}, timer);
	});
};

function focus(){
	var user32 = new ffi.Library('user32', {
		'GetTopWindow': ['long', ['long']],
		'FindWindowA': ['long', ['string', 'string']],
		'SetActiveWindow': ['long', ['long']],
		'SetForegroundWindow': ['bool', ['long']],
		'BringWindowToTop': ['bool', ['long']],
		'ShowWindow': ['bool', ['long', 'int']],
		'SwitchToThisWindow': ['void', ['long', 'bool']],
		'GetForegroundWindow': ['long', []],
		'AttachThreadInput': ['bool', ['int', 'long', 'bool']],
		'GetWindowThreadProcessId': ['int', ['long', 'int']],
		'SetWindowPos': ['bool', ['long', 'long', 'int', 'int', 'int', 'int', 'uint']],
		'SetFocus': ['long', ['long']]
	});

	var kernel32 = new ffi.Library('Kernel32.dll', {
		'GetCurrentThreadId': ['int', []]
	});

	var winToSetOnTop = user32.FindWindowA(null, "iRacing.com Simulator")
	var foregroundHWnd = user32.GetForegroundWindow()
	var currentThreadId = kernel32.GetCurrentThreadId()
	var windowThreadProcessId = user32.GetWindowThreadProcessId(foregroundHWnd, null)
	var showWindow = user32.ShowWindow(winToSetOnTop, 9)
	var setForegroundWindow = user32.SetForegroundWindow(winToSetOnTop)
	var attachThreadInput = user32.AttachThreadInput(windowThreadProcessId, currentThreadId, 0)
	var setFocus = user32.SetFocus(winToSetOnTop)
	var setActiveWindow = user32.SetActiveWindow(winToSetOnTop)
}
