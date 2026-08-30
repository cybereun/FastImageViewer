const { app, BrowserWindow, ipcMain, dialog, protocol, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {
    isSupportedImagePath,
    readDirectory,
    readImageFiles,
    getDisplayName,
    copyImageFile,
    moveImageFile,
    renameImageFile,
    deleteImageFile,
    overwriteImageFile,
    batchFileOperation,
    batchRenameImageFiles,
    getThumbnailDataUrl,
} = require('./file-system');
const { loadPreferences, savePreferences } = require('./preferences');
const { createUpdateManager } = require('./update-service');

const isDev = !app.isPackaged;
const directoryWatchers = new Map();
let mainWindow = null;
const singleInstanceLock = app.requestSingleInstanceLock();
const updateManager = createUpdateManager({
    app,
    onUpdateAvailable: (update) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app:update-available', update);
        }
    },
    onDownloadProgress: (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app:update-download-progress', progress);
        }
    },
});

async function sendLaunchFiles(win, commandLine) {
    const folderCandidate = commandLine
        .filter((value) => typeof value === 'string' && !value.startsWith('-'))
        .map((value) => path.resolve(value))
        .find((value) => {
            try {
                return fs.statSync(value).isDirectory();
            } catch {
                return false;
            }
        });
    if (folderCandidate) {
        const content = await readDirectory(folderCandidate);
        if (!win.isDestroyed()) {
            win.webContents.send('app:open-folder', {
                path: folderCandidate,
                name: getDisplayName(folderCandidate),
                content,
            });
        }
        return;
    }
    const candidates = commandLine.filter((value) => isSupportedImagePath(value));
    if (candidates.length === 0 || win.isDestroyed()) return;
    const files = await readImageFiles(candidates);
    if (files.length > 0 && !win.isDestroyed()) win.webContents.send('app:open-files', files);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: false,
        backgroundColor: '#1e1e1e',
        show: false,
    });
    mainWindow = win;

    Menu.setApplicationMenu(null);

    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    win.once('ready-to-show', () => {
        win.show();
        win.webContents.send('window:maximized-changed', win.isMaximized());
        void sendLaunchFiles(win, process.argv.slice(1));
    });

    win.on('maximize', () => win.webContents.send('window:maximized-changed', true));
    win.on('unmaximize', () => win.webContents.send('window:maximized-changed', false));
    win.on('closed', () => {
        if (mainWindow === win) mainWindow = null;
    });
}

if (!singleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', (_event, commandLine) => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        void sendLaunchFiles(mainWindow, commandLine.slice(1));
    });

    app.whenReady().then(async () => {
        if (await updateManager.applyPendingUpdate()) {
            app.quit();
            return;
        }

        protocol.registerFileProtocol('local', (request, callback) => {
            try {
                const parsed = new URL(request.url);
                let encodedPath = parsed.pathname;
                if (encodedPath.startsWith('/')) encodedPath = encodedPath.slice(1);
                const decodedPath = path.normalize(decodeURIComponent(encodedPath));
                if (!isSupportedImagePath(decodedPath)) {
                    callback({ error: -6 });
                    return;
                }
                const stats = fs.statSync(decodedPath);
                if (!stats.isFile()) {
                    callback({ error: -6 });
                    return;
                }
                callback({ path: decodedPath });
            } catch (error) {
                console.warn('Local image protocol error:', error.message);
                callback({ error: -6 });
            }
        });

        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        setTimeout(() => {
            void updateManager.checkForUpdates();
        }, 4500);
    });
}

app.on('before-quit', () => {
    for (const entry of directoryWatchers.values()) entry.watcher.close();
    directoryWatchers.clear();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (canceled || !filePaths[0]) return null;
    const rootPath = path.resolve(filePaths[0]);
    const content = await readDirectory(rootPath);
    return { path: rootPath, name: getDisplayName(rootPath), content };
});

ipcMain.handle('dialog:chooseDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (canceled || !filePaths[0]) return null;
    const dirPath = path.resolve(filePaths[0]);
    return { path: dirPath, name: getDisplayName(dirPath) };
});

ipcMain.handle('dialog:openImageFiles', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tif', 'tiff', 'avif'] }],
    });
    if (canceled) return [];
    return readImageFiles(filePaths);
});

ipcMain.handle('fs:readDirectory', async (_event, dirPath) => readDirectory(dirPath));
ipcMain.handle('fs:getThumbnail', async (_event, filePath, size) => getThumbnailDataUrl(filePath, size));
ipcMain.handle('fs:copyImageFile', async (_event, sourcePath, targetFolderPath) => copyImageFile(sourcePath, targetFolderPath));
ipcMain.handle('fs:moveImageFile', async (_event, sourcePath, targetFolderPath) => moveImageFile(sourcePath, targetFolderPath));
ipcMain.handle('fs:renameImageFile', async (_event, sourcePath, nextName) => renameImageFile(sourcePath, nextName));
ipcMain.handle('fs:deleteImageFile', async (_event, sourcePath) => deleteImageFile(sourcePath));
ipcMain.handle('fs:overwriteImageFile', async (_event, sourcePath, bytes) => overwriteImageFile(sourcePath, bytes));
ipcMain.handle('fs:batchFileOperation', async (_event, operation, sourcePaths, targetFolderPath) => (
    batchFileOperation(operation, sourcePaths, targetFolderPath)
));
ipcMain.handle('fs:batchRenameImages', async (_event, renames) => batchRenameImageFiles(renames));

ipcMain.handle('fs:getInitialRoots', async () => {
    const roots = [];
    const pushUnique = (name, rootPath) => {
        const normalized = path.resolve(rootPath);
        if (!fs.existsSync(normalized)) return;
        if (roots.some((root) => root.path.toLowerCase() === normalized.toLowerCase())) return;
        roots.push({ name, path: normalized });
    };

    const knownFolders = [
        { name: 'Desktop', path: app.getPath('desktop') },
        { name: 'Downloads', path: app.getPath('downloads') },
        { name: 'Documents', path: app.getPath('documents') },
        { name: 'Pictures', path: app.getPath('pictures') },
        { name: 'Music', path: app.getPath('music') },
        { name: 'Videos', path: app.getPath('videos') },
    ];
    knownFolders.forEach((folder) => pushUnique(folder.name, folder.path));

    if (process.platform === 'win32') {
        for (let code = 65; code <= 90; code += 1) {
            const letter = String.fromCharCode(code);
            const drivePath = `${letter}:\\`;
            if (fs.existsSync(drivePath)) pushUnique(`${letter}:`, drivePath);
        }
    }
    return roots;
});

ipcMain.handle('fs:startWatchingDirectory', async (event, dirPath) => {
    const resolved = path.resolve(dirPath);
    const stats = await fs.promises.stat(resolved);
    if (!stats.isDirectory()) throw new Error('Watch target is not a directory.');

    const watchId = crypto.randomUUID();
    const watcher = fs.watch(resolved, { persistent: false }, () => {
        if (!event.sender.isDestroyed()) event.sender.send('fs:directory-changed', resolved);
    });
    watcher.on('error', (error) => {
        if (!event.sender.isDestroyed()) {
            event.sender.send('fs:directory-watch-error', { dirPath: resolved, error: error.message });
        }
    });
    directoryWatchers.set(watchId, { watcher, webContents: event.sender, dirPath: resolved });
    event.sender.once('destroyed', () => {
        const entry = directoryWatchers.get(watchId);
        if (entry) {
            entry.watcher.close();
            directoryWatchers.delete(watchId);
        }
    });
    return watchId;
});

ipcMain.handle('fs:stopWatchingDirectory', async (event, watchId) => {
    const entry = directoryWatchers.get(watchId);
    if (!entry || entry.webContents !== event.sender) return;
    entry.watcher.close();
    directoryWatchers.delete(watchId);
});

ipcMain.handle('preferences:load', async () => loadPreferences(app.getPath('userData')));
ipcMain.handle('preferences:save', async (_event, preferences) => savePreferences(app.getPath('userData'), preferences));
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:checkForUpdates', () => updateManager.checkForUpdates());
ipcMain.handle('app:downloadUpdate', () => updateManager.downloadUpdate());
ipcMain.handle('app:installUpdate', () => updateManager.installUpdate());

ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
});

ipcMain.on('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});

ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
});
