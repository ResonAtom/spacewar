const { app, BrowserWindow } = require('electron')

let win; // todo
app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#fff',
        webPreferences: {
            nodeIntegration: true,
            worldSafeExecuteJavaScript: true, // todo?
        }
    })

    win.loadFile('index.html')
    win.webContents.openDevTools()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { // on macOS don't exit when last window is closed
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { // on macOS create a new window if app icon clicked
        createWindow()
    }
})


// 1.1 Gemini transactions
// C: Opens connection S: Accepts connection C/S: Complete TLS handshake (see section 4) C: Validates server certificate (see 4.2) C: Sends request (one CRLF terminated line) (see section 2) S: Sends response header (one CRLF terminated line), closes connection under non-success conditions (see 3.1 and 3.2) S: Sends response body (text or binary data) (see 3.3) S: Closes connection C: Handles response (see 3.4)
// Gemini requests are a single CRLF-terminated line with the following structure:
// <URL><CR><LF></LF>

// gemini://gemini.circumlunar.space

const { connect } = require('tls')
const { readFileSync } = require('fs')

const options = {
    key: readFileSync('certs/private-key.pem'),
    cert: readFileSync('certs/public-cert.pem')
}

// const url = 'gemini://gemini.circumlunar.space' // will respond with redirect
const url = 'gemini://gemini.circumlunar.space/'
let conn = connect(1965, 'gemini.circumlunar.space', options, function() {
    if (conn.authorized) {
        console.log("Connection authorized by a Certificate Authority.")
    } else {
        console.log("Connection not authorized: " + conn.authorizationError)
    }
    console.log()

    conn.write(`${url}\r\n`)
})

conn.on('data', function (data) {
    const lines = data.toString().split('\n')
    console.log(lines.length);

    if(lines.length === 2) {
        console.log(`Header: ${lines[0]}`)
    } else {
        lines.shift() // remove first line
        win.webContents.send('response', lines)
    }

    conn.end()


})