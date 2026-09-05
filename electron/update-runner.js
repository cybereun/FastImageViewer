const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const readJson = async (file) => {
    try { return JSON.parse((await fs.promises.readFile(file, 'utf8')).replace(/^\uFEFF/, '')); }
    catch { return null; }
};
async function writeJson(file, data) {
    const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(temporary, JSON.stringify(data), 'utf8');
    await fs.promises.rename(temporary, file);
}

function cleanUpdateEnvironment(environment = process.env) {
    return Object.fromEntries(Object.entries(environment).filter(([key]) => (
        !/^PORTABLE_/i.test(key) && !/^(ELECTRON_RUN_AS_NODE|ELECTRON_NO_ASAR|NODE_OPTIONS|PSModulePath|PSModuleAnalysisCachePath)$/i.test(key)
    )));
}

function createUpdateRunner({ app, executablePath, spawnProcess = spawn }) {
    const directory = path.join(app.getPath('userData'), 'updates');
    const transactionPath = path.join(directory, 'transaction.json');

    async function start(manifest, targetPath, distribution) {
        await fs.promises.mkdir(directory, { recursive: true });
        if (fs.realpathSync.native(targetPath).toLowerCase() === fs.realpathSync.native(manifest.stagedPath).toLowerCase()) {
            throw new Error('The downloaded update must be separate from the running executable.');
        }
        const previous = await readJson(transactionPath);
        if (previous && /^[a-f0-9-]{36}$/.test(previous.id)) {
            const status = await readJson(path.join(directory, previous.id, 'status.json'));
            if (status && !['completed', 'rolled-back', 'failed'].includes(status.phase)) {
                try {
                    process.kill(status.helperPid, 0);
                    throw new Error('Another update is still running. Please wait for it to finish.');
                } catch (error) { if (error.code !== 'ESRCH') throw error; }
            }
        }
        const id = crypto.randomUUID();
        const jobDirectory = path.join(directory, id);
        await fs.promises.mkdir(jobDirectory);
        const scriptPath = path.join(jobDirectory, 'update-helper.ps1');
        const jobPath = path.join(jobDirectory, 'job.json');
        const job = {
            id, distribution, processId: process.pid, expectedVersion: manifest.version,
            previousVersion: app.getVersion(), sourcePath: manifest.stagedPath, sha256: manifest.sha256,
            targetPath: fs.realpathSync.native(targetPath), userData: fs.realpathSync.native(app.getPath('userData')),
            pendingPath: path.join(directory, 'pending-update.json'),
            exitTimeoutMs: 60_000, launchTimeoutMs: 60_000, showErrors: true, showProgress: true,
        };
        // Windows PowerShell 5 reads UTF-8 reliably with a BOM, including Korean paths/messages.
        await fs.promises.writeFile(scriptPath, '\uFEFF' + await fs.promises.readFile(path.join(__dirname, 'update-helper.ps1'), 'utf8'), 'utf8');
        await writeJson(jobPath, job);
        await writeJson(transactionPath, { id });
        const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
        const quote = value => `'${value.replaceAll("'", "''")}'`;
        const command = `& ${quote(scriptPath)} ${quote(jobPath)} *> ${quote(path.join(jobDirectory, 'startup.log'))}`;
        const encoded = Buffer.from(command, 'utf16le').toString('base64');
        // A detached PowerShell has no console and may silently do nothing. A non-detached
        // child can be terminated with Electron's child-process job. CMD START creates a
        // separate hidden PowerShell console/process that survives the app's exit.
        // Only base64 carries user paths through CMD; %, &, quotes and Korean remain literal.
        const child = spawnProcess(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/cmd.exe'), [
            '/d', '/s', '/c', `"start "" "${powershell}" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand ${encoded}"`,
        ], { detached: true, windowsVerbatimArguments: true, windowsHide: true,
            cwd: directory, env: cleanUpdateEnvironment(), stdio: 'ignore' });
        let startupError;
        child.on('error', error => { startupError = error; });
        child.on('exit', code => { if (code !== 0) startupError = new Error(`Update launcher failed (exit ${code}).`); });
        child.unref();
        // Hashing and copying a portable build can take well over 30 seconds on
        // a busy or slower Windows volume.  Keep the app open until the helper
        // has verified the payload instead of declaring a false startup failure.
        const deadline = Date.now() + 120_000;
        try {
            while (!fs.existsSync(path.join(jobDirectory, 'ready'))) {
                if (startupError) throw startupError;
                const status = await readJson(path.join(jobDirectory, 'status.json'));
                if (status?.phase === 'failed') throw new Error(status.message);
                if (Date.now() > deadline) throw new Error('The update helper did not become ready. FastImage will remain open.');
                await sleep(100);
            }
            // The helper cannot replace files unless both this commit and our exit occur.
            await fs.promises.writeFile(path.join(jobDirectory, 'commit'), id);
        } catch (error) {
            child.kill();
            await writeJson(path.join(jobDirectory, 'status.json'), { phase: 'failed', message: error.message });
            throw error;
        }
    }

    async function confirmLaunch() {
        const transaction = await readJson(transactionPath);
        if (!transaction || !/^[a-f0-9-]{36}$/.test(transaction.id)) return;
        const jobDirectory = path.join(directory, transaction.id);
        const job = await readJson(path.join(jobDirectory, 'job.json'));
        if (!job || !process.argv.includes(`--fastimage-update-token=${job.id}`)) return;
        if (fs.realpathSync.native(executablePath()).toLowerCase() !== fs.realpathSync.native(job.targetPath).toLowerCase()) return;
        await writeJson(path.join(jobDirectory, 'launch.json'), {
            id: job.id, version: app.getVersion(), pid: process.pid, targetPath: fs.realpathSync.native(executablePath()),
        });
    }

    async function getNotice() {
        const transaction = await readJson(transactionPath);
        if (!transaction || !/^[a-f0-9-]{36}$/.test(transaction.id)) return null;
        const status = await readJson(path.join(directory, transaction.id, 'status.json'));
        if (!status || !['completed', 'rolled-back', 'failed'].includes(status.phase)) return null;
        return { id: transaction.id, phase: status.phase, message: status.message || '', version: status.version || '' };
    }

    return { start, confirmLaunch, getNotice };
}

module.exports = { createUpdateRunner, cleanUpdateEnvironment, readJson, writeJson };
