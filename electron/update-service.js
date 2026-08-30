const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');
const {
    buildUpdateInfo,
    compareVersions,
    parseSha256Digest,
} = require('./update-utils');

const RELEASE_API_URL = 'https://api.github.com/repos/cybereun/FastImageViewer/releases/latest';
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_UPDATE_BYTES = 500 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const UPDATE_USER_AGENT = 'FastImage-GitHub-Updater';

const INSTALLER_SCRIPT = String.raw`param(
    [int] $ProcessId,
    [string] $SourcePath,
    [string] $TargetPath,
    [string] $PendingPath,
    [string] $ScriptPath
)

$ErrorActionPreference = 'Stop'
$stagingPath = "$TargetPath.fastimage-new-$ProcessId"
$backupPath = "$TargetPath.fastimage-backup-$ProcessId"

try {
    for ($attempt = 0; $attempt -lt 240; $attempt += 1) {
        if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) { break }
        Start-Sleep -Milliseconds 250
    }

    if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
        throw 'FastImage did not exit before the update timeout.'
    }

    Copy-Item -LiteralPath $SourcePath -Destination $stagingPath -Force
    if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force
    }
    if (Test-Path -LiteralPath $TargetPath) {
        Move-Item -LiteralPath $TargetPath -Destination $backupPath -Force
    }
    Move-Item -LiteralPath $stagingPath -Destination $TargetPath -Force

    if (Test-Path -LiteralPath $SourcePath) {
        Remove-Item -LiteralPath $SourcePath -Force
    }
    if (Test-Path -LiteralPath $PendingPath) {
        Remove-Item -LiteralPath $PendingPath -Force
    }

    Start-Process -FilePath $TargetPath -WorkingDirectory (Split-Path -Parent $TargetPath)
    if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force
    }
}
catch {
    if (Test-Path -LiteralPath $stagingPath) {
        Remove-Item -LiteralPath $stagingPath -Force -ErrorAction SilentlyContinue
    }
    if ((Test-Path -LiteralPath $backupPath) -and -not (Test-Path -LiteralPath $TargetPath)) {
        Move-Item -LiteralPath $backupPath -Destination $TargetPath -Force -ErrorAction SilentlyContinue
    }
}
finally {
    Remove-Item -LiteralPath $ScriptPath -Force -ErrorAction SilentlyContinue
}
`;

function toErrorMessage(error) {
    if (!error) return 'Unknown update error.';
    if (typeof error.message === 'string' && error.message.trim()) return error.message.trim();
    return String(error);
}

function requestBuffer(url, options, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: options.headers,
            timeout: options.timeoutMs,
        }, (response) => {
            const statusCode = response.statusCode ?? 0;
            const location = response.headers.location;
            if (statusCode >= 300 && statusCode < 400 && location) {
                response.resume();
                if (redirectCount >= 4) {
                    reject(new Error('Too many redirects while checking for updates.'));
                    return;
                }
                requestBuffer(new URL(location, url).toString(), options, redirectCount + 1).then(resolve, reject);
                return;
            }
            if (statusCode < 200 || statusCode >= 300) {
                response.resume();
                reject(new Error(`GitHub returned HTTP ${statusCode}.`));
                return;
            }

            const chunks = [];
            let receivedBytes = 0;
            let settled = false;
            const fail = (error) => {
                if (settled) return;
                settled = true;
                response.destroy();
                reject(error);
            };

            response.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (receivedBytes > options.maxBytes) {
                    fail(new Error('The update response is larger than allowed.'));
                    return;
                }
                chunks.push(chunk);
            });
            response.on('error', fail);
            response.on('end', () => {
                if (settled) return;
                settled = true;
                resolve(Buffer.concat(chunks));
            });
        });

        request.on('error', reject);
        request.setTimeout(options.timeoutMs, () => request.destroy(new Error('The update request timed out.')));
    });
}

async function requestJson(url) {
    const buffer = await requestBuffer(url, {
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': UPDATE_USER_AGENT,
            'X-GitHub-Api-Version': '2022-11-28',
        },
        maxBytes: MAX_RESPONSE_BYTES,
        timeoutMs: REQUEST_TIMEOUT_MS,
    });
    try {
        return JSON.parse(buffer.toString('utf8'));
    } catch {
        throw new Error('GitHub returned invalid release information.');
    }
}

function downloadToFile(url, outputPath, expectedSize, onProgress, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                Accept: 'application/octet-stream',
                'User-Agent': UPDATE_USER_AGENT,
            },
            timeout: DOWNLOAD_TIMEOUT_MS,
        }, (response) => {
            const statusCode = response.statusCode ?? 0;
            const location = response.headers.location;
            if (statusCode >= 300 && statusCode < 400 && location) {
                response.resume();
                if (redirectCount >= 6) {
                    reject(new Error('Too many redirects while downloading the update.'));
                    return;
                }
                downloadToFile(new URL(location, url).toString(), outputPath, expectedSize, onProgress, redirectCount + 1).then(resolve, reject);
                return;
            }
            if (statusCode < 200 || statusCode >= 300) {
                response.resume();
                reject(new Error(`GitHub returned HTTP ${statusCode} while downloading the update.`));
                return;
            }

            const contentLength = Number(response.headers['content-length']);
            const totalBytes = Number.isFinite(contentLength) && contentLength > 0
                ? contentLength
                : expectedSize ?? 0;
            const output = fs.createWriteStream(outputPath, { flags: 'w' });
            let receivedBytes = 0;
            let settled = false;
            const fail = (error) => {
                if (settled) return;
                settled = true;
                response.destroy();
                output.destroy();
                reject(error);
            };

            response.on('data', (chunk) => {
                receivedBytes += chunk.length;
                if (receivedBytes > MAX_UPDATE_BYTES) {
                    fail(new Error('The update file is larger than allowed.'));
                    return;
                }
                if (!output.write(chunk)) response.pause();
                onProgress?.({ receivedBytes, totalBytes });
            });
            response.on('end', () => output.end());
            response.on('error', fail);
            output.on('drain', () => response.resume());
            output.on('error', fail);
            output.on('finish', () => {
                if (settled) return;
                settled = true;
                resolve({ receivedBytes, totalBytes });
            });
        });

        request.on('error', reject);
        request.setTimeout(DOWNLOAD_TIMEOUT_MS, () => request.destroy(new Error('The update download timed out.')));
    });
}

function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

async function removeFileIfExists(filePath) {
    try {
        await fs.promises.rm(filePath, { force: true });
    } catch {
        // A stale temporary update must not prevent the next check.
    }
}

async function writeJsonAtomically(filePath, value) {
    const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.promises.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.promises.rename(temporaryPath, filePath);
}

function isPathInside(directoryPath, candidatePath) {
    const relative = path.relative(path.resolve(directoryPath), path.resolve(candidatePath));
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getPortableExecutablePath() {
    const portablePath = process.env.PORTABLE_EXECUTABLE_FILE;
    const candidate = process.platform === 'win32' && typeof portablePath === 'string' && portablePath.trim()
        ? portablePath
        : process.execPath;
    return path.resolve(candidate);
}

function createUpdateManager({ app, onUpdateAvailable, onDownloadProgress } = {}) {
    let latestUpdate = null;
    let downloadInFlight = null;

    const getCurrentVersion = () => String(app.getVersion());
    const isSupported = () => Boolean(app.isPackaged && process.platform === 'win32');
    const getUpdatesDirectory = () => path.join(app.getPath('userData'), 'updates');
    const getPendingManifestPath = () => path.join(getUpdatesDirectory(), 'pending-update.json');

    async function readPendingManifest() {
        try {
            const filePath = getPendingManifestPath();
            const manifest = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
            if (!manifest || typeof manifest !== 'object') return null;
            if (typeof manifest.version !== 'string' || typeof manifest.stagedPath !== 'string' || typeof manifest.sha256 !== 'string') return null;
            const updatesDirectory = getUpdatesDirectory();
            if (!isPathInside(updatesDirectory, manifest.stagedPath)) return null;
            if (path.dirname(path.resolve(manifest.stagedPath)).toLowerCase() !== path.resolve(updatesDirectory).toLowerCase()) return null;
            return manifest;
        } catch {
            return null;
        }
    }

    async function clearPendingManifest(manifest) {
        await removeFileIfExists(getPendingManifestPath());
        if (manifest?.stagedPath && isPathInside(getUpdatesDirectory(), manifest.stagedPath)) {
            await removeFileIfExists(manifest.stagedPath);
        }
    }

    async function validateStagedUpdate(manifest) {
        try {
            const stats = await fs.promises.stat(manifest.stagedPath);
            if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_UPDATE_BYTES) {
                return { ok: false, message: 'The staged update file is invalid.' };
            }
            const actualHash = await hashFile(manifest.stagedPath);
            const expectedHash = parseSha256Digest(manifest.sha256);
            if (!expectedHash || actualHash !== expectedHash) {
                return { ok: false, message: 'The update checksum did not match.' };
            }
            return { ok: true };
        } catch (error) {
            return { ok: false, message: toErrorMessage(error) };
        }
    }

    async function checkForUpdates() {
        const currentVersion = getCurrentVersion();
        if (!app.isPackaged) {
            return { status: 'development', currentVersion, message: 'Updates are checked in packaged builds.' };
        }
        if (process.platform !== 'win32') {
            return { status: 'unsupported', currentVersion, message: 'Automatic updates are currently available on Windows portable builds.' };
        }

        try {
            const release = await requestJson(RELEASE_API_URL);
            const update = buildUpdateInfo(release, currentVersion);
            if (!update) {
                latestUpdate = null;
                return { status: 'up-to-date', currentVersion };
            }
            latestUpdate = update;
            onUpdateAvailable?.(update);
            return { status: 'available', update };
        } catch (error) {
            return { status: 'error', currentVersion, message: toErrorMessage(error) };
        }
    }

    async function downloadUpdate() {
        if (downloadInFlight) return downloadInFlight;
        downloadInFlight = (async () => {
            if (!isSupported()) {
                return { status: 'unsupported', message: 'Automatic updates are available in the packaged Windows app.' };
            }

            let update = latestUpdate;
            if (!update) {
                const checkResult = await checkForUpdates();
                if (checkResult.status !== 'available') return checkResult;
                update = checkResult.update;
            }

            const updatesDirectory = getUpdatesDirectory();
            const pendingPath = getPendingManifestPath();
            const temporaryPath = path.join(updatesDirectory, `${update.assetName}.download`);
            const stagedPath = path.join(updatesDirectory, update.assetName);
            try {
                await fs.promises.mkdir(updatesDirectory, { recursive: true });
                await removeFileIfExists(temporaryPath);
                await removeFileIfExists(stagedPath);
                const download = await downloadToFile(
                    update.downloadUrl,
                    temporaryPath,
                    update.size,
                    (progress) => onDownloadProgress?.({
                        version: update.version,
                        receivedBytes: progress.receivedBytes,
                        totalBytes: progress.totalBytes,
                    })
                );
                if (update.size && download.receivedBytes !== update.size) {
                    throw new Error('The downloaded update size did not match the release asset.');
                }
                const sha256 = await hashFile(temporaryPath);
                if (update.digest && sha256 !== update.digest) {
                    throw new Error('The downloaded update checksum did not match GitHub.');
                }
                await fs.promises.rename(temporaryPath, stagedPath);
                await writeJsonAtomically(pendingPath, {
                    version: update.version,
                    assetName: update.assetName,
                    stagedPath,
                    sha256,
                    downloadedAt: new Date().toISOString(),
                });
                return { status: 'downloaded', update, sha256 };
            } catch (error) {
                await removeFileIfExists(temporaryPath);
                await removeFileIfExists(stagedPath);
                return { status: 'error', message: toErrorMessage(error) };
            }
        })().finally(() => {
            downloadInFlight = null;
        });
        return downloadInFlight;
    }

    async function spawnInstaller(manifest, targetPath) {
        const updatesDirectory = getUpdatesDirectory();
        await fs.promises.mkdir(updatesDirectory, { recursive: true });
        const scriptPath = path.join(updatesDirectory, `.install-update-${process.pid}-${Date.now()}.ps1`);
        await fs.promises.writeFile(scriptPath, INSTALLER_SCRIPT, 'utf8');
        const powershellPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
        const child = spawn(powershellPath, [
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath,
            String(process.pid),
            manifest.stagedPath,
            targetPath,
            getPendingManifestPath(),
            scriptPath,
        ], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
        });
        child.unref();
    }

    async function installUpdate() {
        if (!isSupported()) {
            return { status: 'unsupported', message: 'Automatic updates are available in the packaged Windows app.' };
        }
        const manifest = await readPendingManifest();
        if (!manifest) return { status: 'not-ready', message: 'No downloaded update is ready to install.' };
        const comparison = compareVersions(manifest.version, getCurrentVersion());
        if (comparison === null || comparison <= 0) {
            await clearPendingManifest(manifest);
            return { status: 'not-ready', message: 'The downloaded update is not newer than this app.' };
        }
        const validation = await validateStagedUpdate(manifest);
        if (!validation.ok) return { status: 'error', message: validation.message };
        const targetPath = getPortableExecutablePath();
        if (!targetPath.toLowerCase().endsWith('.exe') || !fs.existsSync(targetPath)) {
            return { status: 'error', message: 'The current portable executable could not be located.' };
        }
        try {
            await spawnInstaller(manifest, targetPath);
            return { status: 'restarting', version: manifest.version };
        } catch (error) {
            return { status: 'error', message: toErrorMessage(error) };
        }
    }

    async function applyPendingUpdate() {
        if (!isSupported()) return false;
        const manifest = await readPendingManifest();
        if (!manifest) return false;
        const comparison = compareVersions(manifest.version, getCurrentVersion());
        if (comparison === null || comparison <= 0) {
            await clearPendingManifest(manifest);
            return false;
        }
        const validation = await validateStagedUpdate(manifest);
        if (!validation.ok) {
            await clearPendingManifest(manifest);
            return false;
        }
        const targetPath = getPortableExecutablePath();
        if (!targetPath.toLowerCase().endsWith('.exe') || !fs.existsSync(targetPath)) return false;
        try {
            await spawnInstaller(manifest, targetPath);
            return true;
        } catch {
            return false;
        }
    }

    return {
        applyPendingUpdate,
        checkForUpdates,
        downloadUpdate,
        installUpdate,
    };
}

module.exports = {
    RELEASE_API_URL,
    createUpdateManager,
};
