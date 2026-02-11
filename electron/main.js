
const { app, BrowserWindow, ipcMain, dialog, protocol, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

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
        show: false
    });

    Menu.setApplicationMenu(null);

    if (isDev) {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    win.once('ready-to-show', () => {
        win.show();
        win.webContents.send('window:maximized-changed', win.isMaximized());
    });

    win.on('maximize', () => {
        win.webContents.send('window:maximized-changed', true);
    });

    win.on('unmaximize', () => {
        win.webContents.send('window:maximized-changed', false);
    });
}

app.whenReady().then(() => {
    protocol.registerFileProtocol('local', (request, callback) => {
        try {
            const parsed = new URL(request.url);
            // Expected format: local:///{encodeURIComponent(absolutePath)}
            let encodedPath = parsed.pathname;
            if (encodedPath.startsWith('/')) {
                encodedPath = encodedPath.slice(1);
            }
            const decodedPath = decodeURIComponent(encodedPath);
            callback({ path: path.normalize(decodedPath) });
        } catch (error) {
            console.error('Protocol error:', error);
            callback({ error: -2 });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    if (canceled) {
        return null;
    } else {
        const rootPath = filePaths[0];
        const content = await readDirectory(rootPath);
        return { path: rootPath, name: getDisplayName(rootPath), content };
    }
});

ipcMain.handle('dialog:chooseDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    if (canceled) {
        return null;
    }

    const dirPath = filePaths[0];
    return { path: dirPath, name: getDisplayName(dirPath) };
});

ipcMain.handle('fs:readDirectory', async (event, dirPath) => {
    return await readDirectory(dirPath);
});

ipcMain.handle('fs:getInitialRoots', async () => {
    const roots = [];
    const pushUnique = (name, rootPath) => {
        const normalized = path.resolve(rootPath);
        if (!fs.existsSync(normalized)) return;
        if (roots.some((r) => r.path.toLowerCase() === normalized.toLowerCase())) return;
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

    for (const folder of knownFolders) {
        pushUnique(folder.name, folder.path);
    }

    if (process.platform === 'win32') {
        for (let i = 65; i <= 90; i += 1) {
            const letter = String.fromCharCode(i);
            const drivePath = `${letter}:\\`;
            if (fs.existsSync(drivePath)) {
                pushUnique(`${letter}:`, drivePath);
            }
        }
    }

    return roots;
});

ipcMain.handle('fs:copyImageFile', async (_event, sourcePath, targetFolderPath) => {
    const source = path.resolve(sourcePath);
    const targetFolder = path.resolve(targetFolderPath);
    await ensurePathExists(source);
    await ensureDirectoryExists(targetFolder);

    const destination = getAvailablePath(targetFolder, path.basename(source));
    await fs.promises.copyFile(source, destination);
    return { path: destination, name: path.basename(destination) };
});

ipcMain.handle('fs:moveImageFile', async (_event, sourcePath, targetFolderPath) => {
    const source = path.resolve(sourcePath);
    const targetFolder = path.resolve(targetFolderPath);
    await ensurePathExists(source);
    await ensureDirectoryExists(targetFolder);

    if (isSamePath(path.dirname(source), targetFolder)) {
        return { path: source, name: path.basename(source) };
    }

    const destination = getAvailablePath(targetFolder, path.basename(source));
    if (isSamePath(source, destination)) {
        return { path: destination, name: path.basename(destination) };
    }

    try {
        await fs.promises.rename(source, destination);
    } catch (error) {
        // Cross-device moves can fail with EXDEV, so fallback to copy+delete.
        if (error && error.code === 'EXDEV') {
            await fs.promises.copyFile(source, destination);
            await fs.promises.unlink(source);
        } else {
            throw error;
        }
    }

    return { path: destination, name: path.basename(destination) };
});

ipcMain.handle('fs:renameImageFile', async (_event, sourcePath, nextName) => {
    const source = path.resolve(sourcePath);
    await ensurePathExists(source);

    const sanitized = sanitizeFileName(nextName);
    if (!sanitized) {
        throw new Error('File name cannot be empty.');
    }

    const parsed = path.parse(source);
    const extension = path.extname(sanitized) ? '' : parsed.ext;
    const destination = path.join(parsed.dir, `${sanitized}${extension}`);

    if (isSamePath(source, destination)) {
        return { path: source, name: path.basename(source) };
    }
    if (fs.existsSync(destination)) {
        throw new Error('A file with the same name already exists.');
    }

    await fs.promises.rename(source, destination);
    return { path: destination, name: path.basename(destination) };
});

ipcMain.handle('fs:deleteImageFile', async (_event, sourcePath) => {
    const source = path.resolve(sourcePath);
    await ensurePathExists(source);
    await shell.trashItem(source);
    return { ok: true };
});

ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
});

ipcMain.on('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
});

ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
});

async function readDirectory(dirPath) {
    try {
        const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const files = [];
        const folders = [];

        const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif|avif)$/i;

        for (const dirent of dirents) {
            if (dirent.isDirectory()) {
                folders.push({
                    name: dirent.name,
                    path: path.join(dirPath, dirent.name)
                });
            } else if (dirent.isFile()) {
                if (imageExtensions.test(dirent.name)) {
                    const stats = await fs.promises.stat(path.join(dirPath, dirent.name));
                    files.push({
                        name: dirent.name,
                        path: path.join(dirPath, dirent.name),
                        size: stats.size,
                        lastModified: stats.mtimeMs,
                        type: 'image/' + path.extname(dirent.name).slice(1)
                    });
                }
            }
        }

        return { files, folders };
    } catch (err) {
        console.error('Failed to read directory:', err);
        return { files: [], folders: [] };
    }
}

function getDisplayName(dirPath) {
    const resolved = path.resolve(dirPath);
    const driveMatch = resolved.match(/^([A-Za-z]:)\\?$/);
    if (driveMatch) return driveMatch[1];
    const base = path.basename(resolved);
    return base || resolved;
}

function isSamePath(left, right) {
    return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

async function ensurePathExists(targetPath) {
    await fs.promises.access(path.resolve(targetPath), fs.constants.F_OK);
}

async function ensureDirectoryExists(dirPath) {
    const stats = await fs.promises.stat(path.resolve(dirPath));
    if (!stats.isDirectory()) {
        throw new Error('Target path is not a directory.');
    }
}

function sanitizeFileName(name) {
    if (typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (trimmed.includes('/') || trimmed.includes('\\')) return '';
    return trimmed.replace(/[<>:"|?*]/g, '').trim();
}

function getAvailablePath(targetDir, fileName) {
    const parsed = path.parse(fileName);
    const baseName = parsed.name || 'file';
    const extension = parsed.ext || '';

    let candidate = path.join(targetDir, `${baseName}${extension}`);
    let index = 1;
    while (fs.existsSync(candidate)) {
        candidate = path.join(targetDir, `${baseName} (${index})${extension}`);
        index += 1;
    }
    return candidate;
}
