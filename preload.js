const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
});