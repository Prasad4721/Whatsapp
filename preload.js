const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onLogEntry: (callback) => ipcRenderer.on('log-entry', (_event, value) => callback(value)),
  onQrCode: (callback) => ipcRenderer.on('qr-code', (_event, value) => callback(value)),
  onStatusUpdate: (callback) => ipcRenderer.on('status-update', (_event, value) => callback(value))
});
