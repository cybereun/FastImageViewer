import crypto from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { createUpdateManager, INSTALLER_SCRIPT, NSIS_INSTALLER_SCRIPT } from './update-service.js';

describe('update installation lifecycle', () => {
  it('quits the app after scheduling the installer', async () => {
    const userDataPath = await mkdtemp(path.join(tmpdir(), 'fastimage-update-'));
    try {
      const updatesPath = path.join(userDataPath, 'updates');
      const stagedPath = path.join(updatesPath, 'FastImage-2.0.4-Windows-Portable.exe');
      const stagedContents = Buffer.from('test update payload');
      const sha256 = crypto.createHash('sha256').update(stagedContents).digest('hex');
      await mkdir(updatesPath, { recursive: true });
      await writeFile(stagedPath, stagedContents);
      await writeFile(path.join(updatesPath, 'pending-update.json'), JSON.stringify({
        version: '2.0.4',
        assetName: path.basename(stagedPath),
        stagedPath,
        sha256,
      }));

      const app = {
        isPackaged: true,
        getVersion: () => '2.0.3',
        getPath: () => userDataPath,
        quit: vi.fn(),
      };
      const runInstaller = vi.fn(async () => undefined);
      const manager = createUpdateManager({ app, spawnInstaller: runInstaller });

      await expect(manager.installUpdate()).resolves.toMatchObject({ status: 'restarting', version: '2.0.4' });
      expect(runInstaller).toHaveBeenCalledOnce();
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(app.quit).toHaveBeenCalledOnce();
    } finally {
      await rm(userDataPath, { recursive: true, force: true });
    }
  });
});

describe.skipIf(process.platform !== 'win32')('Windows update helper', () => {
  async function runHelper(script, wrapper, setup = async () => {}) {
    const directory = await mkdtemp(path.join(tmpdir(), 'fastimage-helper-'));
    try {
      await writeFile(path.join(directory, 'helper.ps1'), script);
      await writeFile(path.join(directory, 'wrapper.ps1'), wrapper);
      await writeFile(path.join(directory, 'pending.json'), '{}');
      await setup(directory);
      const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(directory, 'wrapper.ps1')], {
        cwd: directory, encoding: 'utf8', timeout: 15000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      return await Promise.all(['target.exe', 'launched.txt', 'pending.json', 'pending.json.log'].map(async name => {
        try { return await readFile(path.join(directory, name), 'utf8'); } catch { return null; }
      }));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  it('retries a locked portable launcher and restarts at the existing shortcut path', async () => {
    const result = await runHelper(INSTALLER_SCRIPT, String.raw`
$script:moves = 0
function Move-Item {
  param($LiteralPath, $Destination, [switch]$Force)
  if ($LiteralPath -eq "$PSScriptRoot\target.exe") {
    $script:moves += 1
    if ($script:moves -lt 3) { throw 'File is locked by the portable launcher' }
  }
  Microsoft.PowerShell.Management\Move-Item -LiteralPath $LiteralPath -Destination $Destination -Force
}
function Start-Process { param($FilePath, $WorkingDirectory) Set-Content "$PSScriptRoot\launched.txt" $FilePath }
& "$PSScriptRoot\helper.ps1" 2147483647 "$PSScriptRoot\source.exe" "$PSScriptRoot\target.exe" "$PSScriptRoot\pending.json" "$PSScriptRoot\helper.ps1" "$PSScriptRoot\ready"
`, async directory => {
      await writeFile(path.join(directory, 'source.exe'), 'new version');
      await writeFile(path.join(directory, 'target.exe'), 'old version');
    });
    expect(result[0]).toBe('new version');
    expect(result[1]).toContain('target.exe');
    expect(result[2]).toBeNull();
    expect(result[3]).toBeNull();
  });

  it('preserves the old executable and records a failed replacement', async () => {
    const result = await runHelper(INSTALLER_SCRIPT, String.raw`
& "$PSScriptRoot\helper.ps1" 2147483647 "$PSScriptRoot\missing.exe" "$PSScriptRoot\target.exe" "$PSScriptRoot\pending.json" "$PSScriptRoot\helper.ps1" "$PSScriptRoot\ready"
`, async directory => writeFile(path.join(directory, 'target.exe'), 'old version'));
    expect(result[0]).toBe('old version');
    expect(result[1]).toBeNull();
    expect(result[2]).toBe('{}');
    expect(result[3]).toContain('missing.exe');
  });

  it('requests NSIS to relaunch after a silent update', async () => {
    const result = await runHelper(NSIS_INSTALLER_SCRIPT, String.raw`
function Start-Process {
  param($FilePath, $ArgumentList, [switch]$PassThru, [switch]$Wait, $WindowStyle)
  Set-Content "$PSScriptRoot\launched.txt" ($ArgumentList -join ' ')
  return @{ ExitCode = 0 }
}
& "$PSScriptRoot\helper.ps1" 2147483647 "$PSScriptRoot\setup.exe" "$PSScriptRoot\pending.json" "$PSScriptRoot\helper.ps1" "$PSScriptRoot\ready"
`);
    expect(result[1]).toContain('/S --force-run --updated');
    expect(result[2]).toBeNull();
  });

  it('keeps the app open on helper failure and does not retry automatically on launch', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'fastimage-failed-'));
    try {
      const updates = path.join(directory, 'updates');
      await mkdir(updates);
      const stagedPath = path.join(updates, 'update.exe');
      await writeFile(stagedPath, 'update');
      await writeFile(path.join(updates, 'pending-update.json'), JSON.stringify({
        version: '2.0.7', stagedPath, sha256: crypto.createHash('sha256').update('update').digest('hex'),
      }));
      const app = { isPackaged: true, getVersion: () => '2.0.6', getPath: () => directory, quit: vi.fn() };
      const spawnInstaller = vi.fn(async () => { throw new Error('Helper startup failed'); });
      const manager = createUpdateManager({ app, spawnInstaller });
      expect(await manager.installUpdate()).toMatchObject({ status: 'error' });
      expect(await manager.applyPendingUpdate()).toBe(false);
      expect(spawnInstaller).toHaveBeenCalledOnce();
      expect(app.quit).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
