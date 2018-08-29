const http = require('http'),
    fileSystem = require('fs'),
    path = require('path'),
    commandLineArgs = require('command-line-args'),
    commandLineUsage = require('command-line-usage'),
    serialPort = require('serialport'),
    os = require('os');

const networkInterfaces = os.networkInterfaces() //.entries((name, item) => item.filter(iface => ! iface.internal));

const interfaces = Object.values(networkInterfaces).reduce((acc, item) => {
    const v4 = item.filter(iface => (!iface.internal && iface.family === 'IPv4'))
    return [...acc, ...v4]
}, []);

const localIP = interfaces[0].address


class FileDetails {
    constructor(filename) {
        this.filename = filename
        this.exists = fileSystem.existsSync(filename)
        this.filePath = path.join(__dirname, filename);
        if (this.exists) {
            var stat = fileSystem.statSync(this.filePath)
            this.size = stat.size
        }
    }
}

const optionDefinitions = [{
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Display this usage guide.'
    },
    {
        name: 'file',
        alias: 'f',
        type: filename => new FileDetails(filename),
        description: 'OTA uploading file. MANDATORY!',
        typeLabel: '<file>'

    },
    {
        name: 'port',
        alias: 'p',
        type: Number,
        defaultValue: 8888,
        description: 'TCP port of OTA server. Default is 8888',
        typeLabel: '<port>'
    },
    {
        name: 'serial',
        alias: 's',
        type: String,
        description: 'Serial port for transmit OTA commands',
        typeLabel: '<port>'
    },
    {
        name: 'baud',
        alias: 'b',
        type: Number,
        defaultValue: 38400,
        description: 'Serial port baudrate. Default is 38400',
        typeLabel: '<rate>'
    },
    {
        name: 'one',
        alias: 'o',
        type: Boolean,
        defaultValue: false,
        description: 'Use if you need to stop generic server after first download. Always true in non-generic mode'
    },
    {
        name: 'mode',
        alias: 'm',
        type: String,
        defaultValue: 'generic',
        description: 'OTA server working mode. Now supported "generic" and "rtl8710" modes',
        typeLabel: '<mode>'
    }
]
const options = commandLineArgs(optionDefinitions)


const usage = commandLineUsage([{
        header: 'Simple OTA server for IoT devices',
        content: 'Now supporting two modes.\n* The generic (default) mode is used with any OTA device.\nThe software only starts the OTA server and waiting connections.\n* The rtl8710 mode is for programming RTL8710/8711 devices. The software starting the OTA server and sending commands into provided serial port.'
    },
    {
        header: 'Options',
        optionList: optionDefinitions
    },
    {
        content: 'Project home: {underline https://github.com/bgrusnak/otaserver}'
    }
])
if (options.help) {
    console.log(usage)
    process.exit(0)
}
const valid =
    (
        /* all supplied files should exist and --log-level should be one from the list */
        options.file &&
        options.file.exists &&
        (options.mode === 'generic' ||
            (options.mode === 'rtl8710' && typeof options.serial !== 'undefined')
        )
    )

if (!valid) {
    if (typeof options.file === 'undefined' || typeof options.file.filename === 'undefined' ) {
        console.log(commandLineUsage([{
            header: 'Simple OTA server for IoT devices',
            content: 'Error: File not specified\nPlease, call {bold otaserver --help} for further information'
        }]))
        process.exit(0)
    }
    if (!options.file.exists) {
        console.log(commandLineUsage([{
            header: 'Simple OTA server for IoT devices',
            content: `Error: File ${options.file.filePath} not found\nPlease, call {bold otaserver --help} for further information`
        }]))
        process.exit(0)
    }
    if (options.mode !== 'generic' && typeof options.serial === 'undefined') {
        console.log(commandLineUsage([{
            header: 'Simple OTA server for IoT devices',
            content: 'Error: Serial port not specified\nPlease, call {bold otaserver --help} for  further information'
        }]))
        process.exit(0)
    }
}
const srv = http.createServer(function (request, response) {
        response.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': options.file.size,
            "Content-Disposition": `attachment; filename="${options.file.filename}"`
        });

        var readStream = fileSystem.createReadStream(options.file.filePath);
        readStream.on('close', function () {
            console.log(`File ${options.file.filename} downloaded`)
            if (options.one || options.mode !== 'generic') {
                console.log('Exiting')
                srv.close()
                process.exit(0);
            }
        })
        // We replaced all the event handlers with a simple call to readStream.pipe()
        readStream.pipe(response);
    })
    .listen(options.port, (err) => {
        if (err) {
            return console.log('something bad happened', err)
        }
        console.log(`server is listening on ${options.port} with OTA file ${options.file.filename}` + ((options.one || options.mode !== 'generic') ? " and will be closed after one download" : " and repeating downloads"))
        switch (options.mode) {
            case 'rtl8710':
                const port = new serialPort(options.serial, {
                    baudRate: options.baud
                }, function (err) {
                    if (err) {
                      return console.log('Error: ', err.message);
                    }
                  })
                  port.on('data', function (data) {
                    console.log(data.toString('utf8'));
                  })
                port.write(`ATSO=${localIP},${options.port}\r\n`, function (err) {
                    if (err) {
                        return console.log('Error on serial port write: ', err.message);
                    }
                });
                break;
        }
    })