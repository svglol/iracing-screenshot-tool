
self.addEventListener('message', async event => {
	const imageURL = event.data;

	const response = await fetch(imageURL);
	const blob = await response.blob();

	// Send the image data to the UI thread!
	self.postMessage({
		imageURL,
		blob
	});
});
