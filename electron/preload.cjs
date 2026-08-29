const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  printRawEscPos: (bytes) => ipcRenderer.invoke('print-raw-escpos', bytes),
  clearOfflineCache: () => ipcRenderer.invoke('clear-offline-cache'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
