const Jimp = require('jimp');

self.addEventListener('message', e => {
	Jimp.read(e.data, (err, image) => {
		if (err) {
			throw err;
		}

		const w = image.bitmap.width - 54;
		const h = image.bitmap.height - 30;

		image
			.crop(0, 0, w, h)
			.writeAsync(e.data).then(() => {
				self.postMessage(e.data);
			});
	});
});
