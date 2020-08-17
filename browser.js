let ipcRenderer = require('electron').ipcRenderer;
ipcRenderer.on('response', function (event, data) {
    console.log(data);
    document.getElementById('content').innerHTML += data.join('<br/>')
});