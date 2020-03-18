const ipcRenderer = require('electron').ipcRenderer;

document.getElementById("screen-shot").addEventListener("click", function (result){
  var resolution = document.getElementById('resolution');
  var value = resolution.options[resolution.selectedIndex].value;
    ipcRenderer.send("screenshot",value);
});

ipcRenderer.on("updateMemory",function (event, arg) {
  document.getElementById("memory-free").innerText = arg.free;
});

ipcRenderer.on("newScreenshot",function (event, arg) {
  document.getElementById("screenshot").src = arg;
});
