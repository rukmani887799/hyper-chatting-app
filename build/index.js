"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const swarm = require('discovery-swarm');
const getPort = require('get-port');
const path = require('path');
const url = require('url');
const Feed_1 = require("./Feed");
let win;
function createWindow() {
    win = new electron_1.BrowserWindow({ width: 500, height: 500 });
    win.loadURL(url.format({
        pathname: path.join(__dirname, '..', 'index.html'),
        protocol: 'file:',
        slashes: true,
    }));
    win.maximize();
    // win.webContents.openDevTools()
    win.on('closed', () => {
        win = null;
    });
    let initialTimeout = 500; // HACK otherwise the events get sent before UI is loaded.
    const alreadyConnected = {};
    const me = new Feed_1.default();
    me.onReady(async (key) => {
        me.onRead(message => { win.webContents.send('message', message); });
        electron_1.ipcMain.on('send', (_, message) => {
            console.log(message);
            me.writeMessage(message);
        });
        const channel = swarm({ id: key, utp: false });
        channel.join('channel');
        const port = await getPort();
        channel.listen(port);
        channel.on('connection', (connection, info) => {
            const key = info.id.toString('hex');
            if (alreadyConnected[key]) {
                console.log('already connected to ' + key);
                return;
            }
            alreadyConnected[key] = true;
            const other = new Feed_1.default(key);
            other.onReady(() => {
                setTimeout(() => {
                    win.webContents.send('join', key.toString('hex'));
                    other.onRead(message => win.webContents.send('message', message));
                    initialTimeout = 0; // HACK do it instantly anytime except the first time.
                }, initialTimeout);
            });
        });
    });
}
electron_1.app.on('ready', createWindow);
// app.on('window-all-closed', () => {
//   app.quit()
// })
electron_1.app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
