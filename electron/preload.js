
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    chooseDirectory: () => ipcRenderer.invoke('dialog:chooseDirectory'),
    readDirectory: (path) => ipcRenderer.invoke('fs:readDirectory', path),
    getInitialRoots: () => ipcRenderer.invoke('fs:getInitialRoots'),
    toLocalUrl: (filePath) => `local:///${encodeURIComponent(filePath)}`,
    copyImageFile: (sourcePath, targetFolderPath) =>
        ipcRenderer.invoke('fs:copyImageFile', sourcePath, targetFolderPath),
    moveImageFile: (sourcePath, targetFolderPath) =>
        ipcRenderer.invoke('fs:moveImageFile', sourcePath, targetFolderPath),
    renameImageFile: (sourcePath, nextName) =>
        ipcRenderer.invoke('fs:renameImageFile', sourcePath, nextName),
    deleteImageFile: (sourcePath) => ipcRenderer.invoke('fs:deleteImageFile', sourcePath),
    minimizeWindow: () => ipcRenderer.send('window:minimize'),
    toggleMaximizeWindow: () => ipcRenderer.send('window:toggleMaximize'),
    closeWindow: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onWindowMaximizedChanged: (callback) => {
        const listener = (_event, isMaximized) => callback(isMaximized);
        ipcRenderer.on('window:maximized-changed', listener);
        return () => ipcRenderer.removeListener('window:maximized-changed', listener);
    },
});
