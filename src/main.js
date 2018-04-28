const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const net = require('net')
const os = require('os')
const readline = require('readline')

function createWindow(connection, opts) {
    var win = new BrowserWindow(opts)
    win.loadURL(opts.url ? opts.url : "about:blank")
    win.setMenu(null)
    // win.webContents.openDevTools()

    // Create a local variable that we'll use in
    // the closed event handler because the property
    // .id won't be accessible anymore when the window
    // has been closed.
    var win_id = win.id
    win.on('closed', function() {
        sysnotify_connection.write(JSON.stringify({cmd: "windowclosed", winid: win_id}) + '\n')
    })

    win.webContents.on("did-finish-load", function() {
        connection.write(JSON.stringify({data: win_id}) + '\n')
    })
}

function process_command(connection, cmd) {
    if (cmd.cmd=='runcode' && cmd.target=='app') {
        var retvar;
        retval = eval(cmd.code)
        connection.write(JSON.stringify({data: retval}) + '\n')
    }
    else if (cmd.cmd=='runcode' && cmd.target=='window') {
        var win = BrowserWindow.fromId(win.winid)
        win.webContents.executeJavaScript(cmd.code, true)
        .then(function(result) {
                connection.write(JSON.stringify({data: result}) + '\n')
            }).catch(function(err) {
                connection.write(JSON.stringify({error: err}) + '\n')
            })
    }
    else if (cmd.cmd=='closewindow') {
        var win = BrowserWindow.fromId(win.winid)
        win.destroy()
        connection.write(JSON.stringify({})+'\n')
    }
    else if (cmd.cmd == 'newwindow') {
        createWindow(connection, cmd.options)
    }
}

sysnotify_connection = null

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    var connection = net.connect(process.argv[2])
    connection.setEncoding('utf8')

    sysnotify_connection = net.connect(process.argv[3])
    sysnotify_connection.setEncoding('utf8')

    connection.on('end', function() {
        sysnotify_connection.write(JSON.stringify({cmd: "appclosing"}) + '\n')
        app.quit()
    })

    const rloptions = {input: connection, terminal: false, historySize: 0, crlfDelay: Infinity}
    const rl = readline.createInterface(rloptions)

    rl.on('line', function(line) {
        cmd_as_json = JSON.parse(line)
        process_command(connection, cmd_as_json)
    })
})

app.on('window-all-closed', function() {

})
