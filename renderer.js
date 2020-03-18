const ipcRenderer = require('electron').ipcRenderer;
const {desktopCapturer} = require('electron');

var iRacingWindowSource = null;

ipcRenderer.on("updateMemory",function (event, arg) {
	document.getElementById("memory-free").innerText = arg.free;
});

document.getElementById("trigger").addEventListener("click", function(){
	var resolution = document.getElementById('resolution');
	var value = resolution.options[resolution.selectedIndex].value;
	desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
		for (const source of sources) {
			if ((source.name === "iRacing.com Simulator")) {
				iRacingWindowSource = source;
			}
		}
	});
	ipcRenderer.send("screenshot",value);
});

ipcRenderer.on("screenshot",function (event, arg) {
	fullscreenScreenshot(function(base64data){
		ipcRenderer.send("newScreenshot",base64data);
		document.getElementById("screenshot").setAttribute("src", base64data);
	},'image/png');
},false);

async function fullscreenScreenshot(callback, imageFormat) {
	var _this = this;
	this.callback = callback;
	imageFormat = imageFormat || 'image/jpeg';

	this.handleStream = (stream) => {
		// Create hidden video tag
		var video = document.createElement('video');
		video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';

		// Event connected to stream
		video.onloadedmetadata = function () {
			// Set video ORIGINAL height (screenshot)
			video.style.height = this.videoHeight + 'px'; // videoHeight
			video.style.width = this.videoWidth + 'px'; // videoWidth

			video.play();

			// Create canvas
			var canvas = document.createElement('canvas');
			canvas.width = this.videoWidth;
			canvas.height = this.videoHeight;
			var ctx = canvas.getContext('2d');
			// Draw video on canvas
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			if (_this.callback) {
				// Save screenshot to base64
				_this.callback(canvas.toDataURL(imageFormat));
			} else {
				console.log('Need callback!');
			}

			// Remove hidden video tag
			video.remove();
			try {
				// Destroy connect to stream
				stream.getTracks()[0].stop();
			} catch (e) {}
		}

		video.srcObject = stream;
		document.body.appendChild(video);
	};

	this.handleError = function(e) {
		console.log(e);
	};

	var source = iRacingWindowSource;
	if ((source.name === "iRacing.com Simulator")) {
		// console.log('test')
		try{
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					mandatory: {
						chromeMediaSource: 'desktop',
						chromeMediaSourceId: source.id,
						minWidth: 1280,
						maxWidth: 10000,
						minHeight: 720,
						maxHeight: 10000
					}
				}
			});
			_this.handleStream(stream);
		} catch (e) {
			_this.handleError(e);
		}
	}
}
