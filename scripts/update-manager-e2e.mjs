// Exercises the production IPC -> manager -> PowerShell launch, including parent exit.
import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { cleanUpdateEnvironment, readJson } = require('../electron/update-runner');
const version = require('../package.json').version;
const root = realpathSync.native(await fs.mkdtemp(path.join(os.tmpdir(), 'fastimage-manager-e2e-')));
const profile = path.join(root, 'profile');
const updates = path.join(profile, 'updates');
await fs.mkdir(updates, { recursive: true });
const target = path.join(root, 'FastImage.exe');
const assetName = `FastImage-${version}-Windows-Portable.exe`;
const stagedPath = path.join(updates, assetName);
await fs.copyFile(path.resolve('dist-electron', assetName), target);
await fs.copyFile(target, stagedPath);
await fs.writeFile(path.join(updates, 'pending-update.json'), JSON.stringify({ version, assetName, stagedPath,
  distribution: 'portable', sha256: crypto.createHash('sha256').update(await fs.readFile(stagedPath)).digest('hex') }));
const driver = path.join(root, 'driver.cjs');
// The fixture runs production main/UI with an older version number to request the upgrade.
// The destination is the real packaged app, with its real version and renderer confirmation.
await fs.writeFile(driver, `
const fs = require('fs');
const { app } = require('electron');
Object.defineProperty(app, 'isPackaged', { value: true });
app.getVersion = () => '0.0.0';
process.env.PORTABLE_EXECUTABLE_FILE = ${JSON.stringify(target)};
app.on('browser-window-created', (_, win) => win.once('ready-to-show', () => {
  setTimeout(() => win.webContents.executeJavaScript('window.electron.installUpdate()').then(result => {
    fs.writeFileSync(${JSON.stringify(path.join(root, 'request.json'))}, JSON.stringify(result));
  }), 500);
}));
require(${JSON.stringify(path.resolve('dist-electron/win-unpacked/resources/app.asar/electron/main.js'))});
`);
const env = cleanUpdateEnvironment();
const parent = spawn(require('electron'), [driver, `--user-data-dir=${profile}`], { env, windowsHide: false, stdio: 'ignore' });
parent.on('error', console.error);
let exited = false;
parent.on('exit', () => { exited = true; });
const deadline = Date.now() + 180_000;
let phase;
while (Date.now() < deadline) {
  const transaction = await readJson(path.join(updates, 'transaction.json'));
  if (transaction) {
    const directory = path.join(updates, transaction.id);
    const status = await readJson(path.join(directory, 'status.json'));
    if (status?.phase !== phase) { phase = status?.phase; console.log(JSON.stringify({ root, phase, parentExited: exited })); }
    if (phase === 'completed') {
      const receipt = await readJson(path.join(directory, 'launch.json'));
      const request = await readJson(path.join(root, 'request.json'));
      if (!exited || request?.status !== 'restarting' || receipt.version !== version) throw new Error('Parent exit / version confirmation failed');
      const ps = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
      spawnSync(ps, ['-NoProfile', '-Command', `(Get-Process -Id ${Number(receipt.pid)}).CloseMainWindow()`], { env, windowsHide: true });
      console.log(JSON.stringify({ result: 'passed', parentPid: parent.pid, newPid: receipt.pid, version, root }));
      await fs.writeFile(path.join(root, 'result.json'), JSON.stringify({ receipt, request, parentExited: exited }));
      process.exit(0);
    }
    if (['failed', 'rolled-back'].includes(phase)) throw new Error(JSON.stringify({ root, status }));
  }
  await new Promise(resolve => setTimeout(resolve, 250));
}
throw new Error(`Manager test timed out: ${root}`);
