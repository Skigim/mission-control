const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  pickFolder: () => ipcRenderer.invoke('desktop:pick-folder'),
  inspectFolder: (targetPath) => ipcRenderer.invoke('desktop:inspect-folder', targetPath),
  openFolder: (targetPath, target) => ipcRenderer.invoke('desktop:open-folder', targetPath, target)
});
