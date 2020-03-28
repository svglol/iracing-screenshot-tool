const {ipcRenderer} = require('electron');
const {desktopCapturer} = require('electron');

const {remote} = require('electron');

const win = remote.getCurrentWindow();

let iRacingWindowSource = null;

ipcRenderer.on('updateMemory', (event, arg) => {
	document.querySelector('#memory-free').textContent = arg.free;
});

document.querySelector('#screenshot-button').addEventListener('click', () => {
	const resolution = document.querySelector('#resolution');
	const crop = document.querySelector('#crop').checked;
	const {value} = resolution.options[resolution.selectedIndex];
	const args = {resolution: value, crop};
	desktopCapturer
		.getSources({types: ['window', 'screen']})
		.then(async sources => {
			for (const source of sources) {
				if (source.name === 'iRacing.com Simulator') {
					iRacingWindowSource = source;
				}
			}
		});
	ipcRenderer.send('screenshot', args);
});

document.querySelector('#motion').addEventListener('click', () => {
	desktopCapturer
		.getSources({types: ['window', 'screen']})
		.then(async sources => {
			for (const source of sources) {
				if (source.name === 'iRacing.com Simulator') {
					iRacingWindowSource = source;
				}
			}
		});
	motionScreenshot(base64data => {
		base64data.forEach((item, i) => {
			const base64Data = item.replace(/^data:image\/png;base64,/, '');
			const fileName = 'C:\\Users\\savag\\Pictures\\Screenshots\\' + i + '.png';
			require('fs').writeFile(fileName, base64Data, 'base64', err => {
				if (err) {
					console.log(err);
				}
			});
		});
	}, 'image/png');
	ipcRenderer.send('motion');
});

ipcRenderer.on('screenshot', (event, arg) => {
	fullscreenScreenshot(base64data => {
		ipcRenderer.send('newScreenshot', {image: base64data, crop: arg});
	}, 'image/png');
},
false
);

ipcRenderer.on('galleryAdd', (event, args) => {
	addImageToGallery(args);
});

const screenshot = document.querySelector('#screenshot');
screenshot.addEventListener('load', () => {
	screenshot.style.visibility = 'visible';
	screenshot.style.opacity = 1;
});

function addImageToGallery(src) {
	const image = document.createElement('img');

	image.setAttribute('src', src.src);
	image.setAttribute('class', 'img m-1');
	image.setAttribute('width', '200px');
	image.setAttribute('style', 'object-fit:contain;cursor: pointer;  opacity: 0; -webkit-transition: opacity 0.5s ease;-moz-transition: opacity 0.5s ease;-ms-transition: opacity 0.5s ease;-o-transition: opacity 0.5s ease;transition: opacity 0.5s ease;');
	image.style.visibility = 'hidden';
	image.addEventListener('load', () => {
		image.style.visibility = 'visible';
		image.style.opacity = 1;
	});
	image.addEventListener('click', () => {
		selectImage(src, image);
	});

	document.querySelector('#gallery').prepend(image);
	selectImage(src, image);
}

const {shell} = require('electron');
const sizeOf = require('image-size');

function selectImage(arg, image) {
	const dimensions = sizeOf(arg.file);
	document.querySelector('#screenshot').setAttribute('src', arg.src);

	document.querySelector('#file-name').innerHTML = arg.file
		.split(/[\\/]/)
		.pop();

	document.querySelector('#file-resolution').innerHTML =
	dimensions.width + ' x ' + dimensions.height;
	recreateNode(document.querySelector('#open-ps'));
	recreateNode(document.querySelector('#open-external'));
	recreateNode(document.querySelector('#open-folder'));
	recreateNode(document.querySelector('#delete'));
	document.querySelector('#open-ps').addEventListener('click', () => {
		const child = require('child_process').execFile;
		const executablePath =
		'C:\\Program Files\\Adobe\\Adobe Photoshop 2020\\Photoshop.exe';
		const parameters = [arg.file];

		child(executablePath, parameters, err => {
			console.log(err);
		});
	});
	document.querySelector('#open-external').addEventListener('click', () => {
		shell.openItem(arg.file);
	});
	document.querySelector('#open-folder').addEventListener('click', () => {
		const file = arg.file.replace('/', '\\');
		shell.showItemInFolder(file);
	});
	document.querySelector('#delete').addEventListener('click', () => {
		const file = arg.file.replace('/', '\\');
		document.querySelector('#screenshot').setAttribute('src', '');
		document.querySelector('#info-controls').style.visibility = 'hidden';
		if (image.nextSibling !== null) {
			image.nextSibling.dispatchEvent(new MouseEvent('click'));
		}

		image.remove();
		shell.moveItemToTrash(file);
	});

	document.querySelector('#info-controls').style.visibility = 'visible';
}

function recreateNode(el, withChildren) {
	if (withChildren) {
		el.parentNode.replaceChild(el.cloneNode(true), el);
	} else {
		const newEl = el.cloneNode(false);
		while (el.hasChildNodes()) {
			newEl.append(el.firstChild);
		}

		el.parentNode.replaceChild(newEl, el);
	}
}

async function motionScreenshot(callback, imageFormat) {
	const _this = this;
	this.callback = callback;
	imageFormat = imageFormat || 'image/jpeg';

	this.handleStream = stream => {
		// Create hidden video tag
		const video = document.createElement('video');
		video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';

		// Event connected to stream
		video.addEventListener('loadedmetadata', function () {
			// Set video ORIGINAL height (screenshot)
			video.style.height = this.videoHeight + 'px'; // VideoHeight
			video.style.width = this.videoWidth + 'px'; // VideoWidth

			video.play();

			// Create canvas
			const canvas = document.createElement('canvas');
			canvas.width = this.videoWidth;
			canvas.height = this.videoHeight;
			const ctx = canvas.getContext('2d');
			// Draw video on canvas
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			const array = [];
			for (let i = 0; i < 5; i++) {
				array.push(canvas.toDataURL(imageFormat));
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			}

			if (_this.callback) {
				// Save screenshot to base64
				_this.callback(array);
			} else {
				console.log('Need callback!');
			}

			// Remove hidden video tag
			video.remove();
			try {
				// Destroy connect to stream
				stream.getTracks()[0].stop();
			} catch (error) {
				console.log(error);
			}
		});

		video.srcObject = stream;
		document.body.append(video);
	};

	this.handleError = function (e) {
		console.log(e);
	};

	const source = iRacingWindowSource;
	if (source.name === 'iRacing.com Simulator') {
		try {
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
		} catch (error) {
			_this.handleError(error);
		}
	}
}

async function fullscreenScreenshot(callback, imageFormat) {
	const _this = this;
	this.callback = callback;
	imageFormat = imageFormat || 'image/jpeg';

	this.handleStream = stream => {
		// Create hidden video tag
		const video = document.createElement('video');
		video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';

		// Event connected to stream
		video.addEventListener('loadedmetadata', function () {
			// Set video ORIGINAL height (screenshot)
			video.style.height = this.videoHeight + 'px'; // VideoHeight
			video.style.width = this.videoWidth + 'px'; // VideoWidth

			video.play();

			// Create canvas
			const canvas = document.createElement('canvas');
			canvas.width = this.videoWidth;
			canvas.height = this.videoHeight;
			const ctx = canvas.getContext('2d');
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
			} catch (error) {
				console.log(error);
			}
		});

		video.srcObject = stream;
		document.body.append(video);
	};

	this.handleError = function (e) {
		console.log(e);
	};

	const source = iRacingWindowSource;
	if (source.name === 'iRacing.com Simulator') {
		try {
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
		} catch (error) {
			_this.handleError(error);
		}
	}
}

// When document has loaded, initialise
document.onreadystatechange = () => {
	if (document.readyState === 'complete') {
		handleWindowControls();
	}
};

window.addEventListener('beforeunload', () => {
	/* If window is reloaded, remove win event listeners
	(DOM element listeners get auto garbage collected but not
	Electron win listeners as the win is not dereferenced unless closed) */
	win.removeAllListeners();
});

function handleWindowControls() {
	// Make minimise/maximise/restore/close buttons work when they are clicked
	document.querySelector('#min-button').addEventListener('click', () => {
		win.minimize();
	});

	document.querySelector('#max-button').addEventListener('click', () => {
		win.maximize();
	});

	document.querySelector('#restore-button').addEventListener('click', () => {
		win.unmaximize();
	});

	document.querySelector('#close-button').addEventListener('click', () => {
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
