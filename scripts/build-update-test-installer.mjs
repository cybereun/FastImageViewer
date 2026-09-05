import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const configuration = structuredClone(require('../package.json').build);
configuration.appId = 'com.antigravity.fastimage.update-e2e';
configuration.productName = 'FastImageUpdateTest';
configuration.fileAssociations = [];
configuration.directories.output = 'dist-e2e-installer';
configuration.win.target = [{ target: 'nsis', arch: ['x64'] }];
Object.assign(configuration.nsis, { createDesktopShortcut: false, createStartMenuShortcut: false,
  shortcutName: 'FastImageUpdateTest', runAfterFinish: false });
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fastimage-test-build-'));
const config = path.join(directory, 'builder.json');
fs.writeFileSync(config, JSON.stringify(configuration));
const result = spawnSync(process.execPath, [require.resolve('electron-builder/cli'), '--config', config, '--publish', 'never'], { stdio: 'inherit', windowsHide: true });
if (result.status !== 0) throw new Error(`Test installer build failed (${result.status})`);
