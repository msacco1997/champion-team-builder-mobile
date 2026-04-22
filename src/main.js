
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

let storeData = {};
let storePath = '';

app.whenReady().then(() => {
  storePath = path.join(app.getPath('userData'), 'teams-data.json');
  try {
    if (fs.existsSync(storePath)) {
      storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
  } catch(e) { console.error('Error reading store', e); }
});

function saveStore() {
  try {
    fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2));
  } catch(e) { console.error('Error saving store', e); }
}

const store = {
  get: (k) => storeData[k],
  set: (k, v) => { storeData[k] = v; saveStore(); },
  delete: (k) => { delete storeData[k]; saveStore(); }
};
 function createWindow() { const win = new BrowserWindow({ width: 1560, height: 980, minWidth: 1220, minHeight: 760, backgroundColor: '#0c1018', title: 'Champions TeamBuilder', titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default', webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.js') } }); win.loadFile(path.join(__dirname, 'index.html')); } app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); }); app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); }); ipcMain.handle('store:get', (e, k) => store.get(k)); ipcMain.handle('store:set', (e, k, v) => store.set(k, v)); ipcMain.handle('store:delete', (e, k) => store.delete(k));