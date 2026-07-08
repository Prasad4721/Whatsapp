const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const appEvents = require('./src/events');
const { startBackend } = require('./src/index');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('ui/index.html');

  // Forward events to renderer
  appEvents.on('log', (logEntry) => {
    if (mainWindow) {
      mainWindow.webContents.send('log-entry', logEntry);
    }
  });

  appEvents.on('qr', (qrCode) => {
    if (mainWindow) {
      mainWindow.webContents.send('qr-code', qrCode);
    }
  });

  appEvents.on('status', (status) => {
    if (mainWindow) {
      mainWindow.webContents.send('status-update', status);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Start the backend process within the Electron main process
  try {
    startBackend();
  } catch(e) {
    console.error('Failed to start backend', e);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});