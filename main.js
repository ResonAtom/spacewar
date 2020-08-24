const { app, BrowserWindow } = require('electron')
const { connect } = require('tls')
const { readFileSync } = require('fs')

let win = undefined
let history = []
let hindex = 0

const [key, cert] = createCustomCert()

async function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 600,
        backgroundColor: '#fff',
        webPreferences: {
            nodeIntegration: true,
            worldSafeExecuteJavaScript: true, // todo?
        }
    })

    win.loadFile('index.html')
    win.webContents.openDevTools()

    const goBack = () => {
        if(hindex > 0) {
            hindex -= 1
            loadPage(history[hindex], true)
        }
    }

    win.webContents.on('will-navigate', (e, gurl) => {
        console.log('Click intercept: '+gurl)
        e.preventDefault()
        if(gurl === 'gemini://back') {
            goBack()
        } else {
            loadPage(gurl) // todo :)
        }
    })

    win.webContents.on('before-input-event', (event, input) => {
        // For example, only enable application menu keyboard shortcuts when Ctrl/Cmd are down.
        // win.webContents.setIgnoreMenuShortcuts(!input.control && !input.meta)
        // console.log('before-input-event', event, input)
        if(input.type === 'keyDown' && input.key === 'b') {
            goBack()
        }
    })
    win.webContents.on('app-command', (event, cmd) => {
        console.log("app-command", event, cmd)
        if (cmd === 'browser-backward' && win.webContents.canGoBack()) {
            win.webContents.goBack()
        }
    })

    // const url = 'gemini://gemini.circumlunar.space' // TODO handle this redirect
    const home = 'gemini://gemini.circumlunar.space/'
    loadPage(home)
}

async function loadPage(gurl, inHistory = false) {
    if(!inHistory) {
        history = history.slice(0, hindex +1) // Wipe out history after this point
        history.push(gurl)
        hindex = history.length -1
    }

    const path = gurl.slice(gurl.indexOf('://') + '://'.length)
    const indexEndSlash = path.indexOf('/') 
    const hasEndSlash = indexEndSlash !== -1
    const host = hasEndSlash ? path.slice(0, indexEndSlash) : path
    console.log("host", host)

    let conn = connect(1965, host, {key: key, cert: cert}, function() {
        console.log(`Connection ${conn.authorized ? 'authorized' : 'not authorized: ' + conn.authorizationError}`)
        conn.write(`${gurl}\r\n`)
    })

    let lines = [];
    conn.on('data', function (data) {
        const parts = data.toString().split('\r\n')
        console.log(`Parts: ${parts.length}`)

        if(parts.length === 2) {
            const header = parts[0]
            console.log(`Header: ${header}`)
            parts.shift() // remove header line, body is now in place [0]
        }
        lines = [...lines, ...parts[0].split('\n')]
    })

    conn.on('end', () => {
        console.log('server ends connection')
        win.webContents.send('response', [host, lines])
        // conn.end() // Server should handle ending connection
    })
}

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

app.whenReady().then(createWindow)

function createCustomCert() { // Custom cert time!
    const forge = require('node-forge');
    var pki = forge.pki;

    // generate a keypair and create an X.509v3 certificate
    var keys = pki.rsa.generateKeyPair(2048);
    var cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    // alternatively set public key from a csr
    //cert.publicKey = csr.publicKey;
    // NOTE: serialNumber is the hex encoded value of an ASN.1 INTEGER.
    // Conforming CAs should ensure serialNumber is:
    // - no more than 20 octets
    // - non-negative (prefix a '00' if your value starts with a '1' bit)
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    var attrs = [{
        name: 'commonName',
        value: 'example.org'
    }, {
        name: 'countryName',
        value: 'US'
    }, {
        shortName: 'ST',
        value: 'Virginia'
    }, {
        name: 'localityName',
        value: 'Blacksburg'
    }, {
        name: 'organizationName',
        value: 'Test'
    }, {
        shortName: 'OU',
        value: 'Test'
    }];
    cert.setSubject(attrs);
    // alternatively set subject from a csr
    //cert.setSubject(csr.subject.attributes);
    cert.setIssuer(attrs);
    cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
    }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
    }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
    }, {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
    }, {
    name: 'subjectAltName',
    altNames: [{
        type: 6, // URI
        value: 'http://example.org/webid#me'
    }, {
        type: 7, // IP
        ip: '127.0.0.1'
    }]
    }, {
    name: 'subjectKeyIdentifier'
    }]);

    // self-sign certificate
    // signs a certificate using SHA-256 instead of SHA-1
    cert.sign(keys.privateKey, forge.md.sha256.create());

    var publicCertPem = pki.certificateToPem(cert);
    var privateKeyPem = pki.privateKeyToPem(keys.privateKey);

    return [privateKeyPem, publicCertPem]
}
