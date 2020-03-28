const Jimp = require('jimp');

self.addEventListener('message', e => {
	Jimp.read(e.data, (err, image) => {
		if (err) {
			throw err;
		}

		const origW = image.bitmap.width;
		const origH = image.bitmap.height;
		let w = 0;
		let h = 0;
		switch (image.bitmap.width) {
			case 7680:
				w = 7626;
				h = 4290;
				break;
			case 7168:
				w = 7114;
				h = 4002;
				break;
			case 6400:
				w = 6346;
				h = 3570;
				break;
			case 5120:
				w = 5066;
				h = 2850;
				break;
			case 3840:
				w = 3788;
				h = 2130;
				break;
			case 2560:
				w = 2508;
				h = 1410;
				break;
			default:
				w = 1866;
				h = 1050;
		}

		image
			.crop(0, 0, w, h)
			.resize(origW, origH)
			.writeAsync(e.data).then(() => {
				self.postMessage(e.data);
			});
	});
});
