// Minimal, typed-ish IPC bridge exposed to the renderer as window.menuIdle.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('menuIdle', {
  isElectron: true,
  save: (json) => ipcRenderer.invoke('save:write', json),
  load: () => ipcRenderer.invoke('save:read'),
  clear: () => ipcRenderer.invoke('save:clear'),
});
