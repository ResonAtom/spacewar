let ipcRenderer = require('electron').ipcRenderer;
ipcRenderer.on('response', function (event, [host, lines]) {
    console.log(lines);
    window.scrollTo(0, 0)
    lines = lines.map(line => {
        if(line.slice(0, 2) === '=>') { // Link
            const linkContent = line.slice(2)

            // Hmm.  First find the first text.  
            const indexFirstText = linkContent.search(/\S+/)
            // Then find the first whitespace after that point.
            const indexNextWhitespace = linkContent.slice(indexFirstText).search(/\s+/, indexFirstText)

            const url = linkContent.slice(indexFirstText, indexNextWhitespace + 1).trim()
            const label = linkContent.slice(indexNextWhitespace + 1).trim()

            const hasScheme = url.indexOf('://') !== -1
            const fullUrl = hasScheme ? url : `gemini://${host}/${url}`

            return `<a href="${fullUrl}">${label}</a>`
        }
        return line
    })
    document.getElementById('content').innerHTML = lines.join('<br/>')
})
