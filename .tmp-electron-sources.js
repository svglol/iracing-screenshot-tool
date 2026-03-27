const { app, desktopCapturer } = require('electron');
app.whenReady().then(async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  });
  const matches = sources.filter((source) => source.name.toLowerCase().includes('iracing'));
  console.log(JSON.stringify(matches.map((source) => ({ id: source.id, name: source.name })), null, 2));
  app.quit();
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
