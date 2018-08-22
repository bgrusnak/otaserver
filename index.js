var http = require('http'),
    fileSystem = require('fs'),
    path = require('path');

let port, filename, single=false
if (process.argv.length === 3) {
    filename = process.argv[2]
    port = 82
} else if (process.argv.length >3 ) {
    if (process.argv[3] === '-1') {
        port = 82
        filename = process.argv[2]
        single = true
    } else {
        port = process.argv[2]
        filename = process.argv[3]
        single = process.argv[4] === '-1'
    }
} else {
    console.error('Please, specify the options\n[port] filename [-1]\n\nPort - http local port (default port is 82)\nfilename - any OTA file\n-1 - close the server after one download');
    process.exit(1);
} 
const filePath = path.join(__dirname,filename);
if (!fileSystem.existsSync(filePath)) {
    console.error(`File ${filePath} doesn't exists`);
    process.exit(1);
}

http.createServer(function(request, response) {
   
    var stat = fileSystem.statSync(filePath);

    response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        "Content-Disposition": `attachment; filename="${filename}"`
    });

    var readStream = fileSystem.createReadStream(filePath);
    readStream.on('close', function() {
        console.log(`File ${filename} downloaded`)
        if (single) {
            console.log('Exiting')
            process.exit(0);
        }
    })
    // We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(response);
})
.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port} with OTA file ${filename}`+ (single ? " and will be closed after one download" : " and repeating downloads"))
})  