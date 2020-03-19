const ipcRenderer = require('electron').ipcRenderer;
const {desktopCapturer} = require('electron');

const remote = require('electron').remote;

const win = remote.getCurrentWindow();

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
	},'image/png');
},false);

ipcRenderer.on("galleryAdd",function (event, args) {
	addImageToGallery(args);
});

function addImageToGallery(src){
	var image = document.createElement("img");

	image.setAttribute("src", src.src);
	image.setAttribute("class","img m-1");
	image.setAttribute("width","200px");
	image.setAttribute("style","object-fit:contain;cursor: pointer;");
	image.addEventListener("click",function(){
	selectImage(src);
	})
	document.getElementById("gallery").prepend(image);

	selectImage(src);
}

const shell = require('electron').shell;
const path = require('path');
const sizeOf = require('image-size');

function selectImage(arg){

	var dimensions = sizeOf(arg.file);
	document.getElementById("screenshot").setAttribute("src", arg.src);

	document.getElementById("file-name").innerHTML = arg.file.split(/[\\\/]/).pop()
	document.getElementById("file-resolution").innerHTML = dimensions.width +" x "+ dimensions.height
	recreateNode(document.getElementById("open-ps"));
	recreateNode(document.getElementById("open-external"));
	recreateNode(document.getElementById("open-folder"));
	recreateNode(document.getElementById("delete"));
	document.getElementById("open-ps").addEventListener("click", function(){
		console.log('click');
	});
	document.getElementById("open-external").addEventListener("click", function(){
		shell.openItem(arg.file);
	});
	document.getElementById("open-folder").addEventListener("click", function(){
		shell.showItemInFolder(arg.file);
	});
	document.getElementById("delete").addEventListener("click", function(){

	});

}

function recreateNode(el, withChildren) {
	if (withChildren) {
		el.parentNode.replaceChild(el.cloneNode(true), el);
	}
	else {
		var newEl = el.cloneNode(false);
		while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
		el.parentNode.replaceChild(newEl, el);
	}
}

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

// When document has loaded, initialise
document.onreadystatechange = (event) => {
	if (document.readyState == "complete") {
		handleWindowControls();
	}
};

window.onbeforeunload = (event) => {
	/* If window is reloaded, remove win event listeners
	(DOM element listeners get auto garbage collected but not
	Electron win listeners as the win is not dereferenced unless closed) */
	win.removeAllListeners();
}

function handleWindowControls() {
	// Make minimise/maximise/restore/close buttons work when they are clicked
	document.getElementById('min-button').addEventListener("click", event => {
		win.minimize();
	});

	document.getElementById('max-button').addEventListener("click", event => {
		win.maximize();
	});

	document.getElementById('restore-button').addEventListener("click", event => {
		win.unmaximize();
	});

	document.getElementById('close-button').addEventListener("click", event => {
		win.close();
	});

	// Toggle maximise/restore buttons when maximisation/unmaximisation occurs
	toggleMaxRestoreButtons();
	win.on('maximize', toggleMaxRestoreButtons);
	win.on('unmaximize', toggleMaxRestoreButtons);

	function toggleMaxRestoreButtons() {
		if (win.isMaximized()) {
			document.body.classList.add('maximized');
		} else {
			document.body.classList.remove('maximized');
		}
	}
}
