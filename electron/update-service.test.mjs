import crypto from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { createUpdateManager } from './update-service.js';
import { createUpdateRunner, cleanUpdateEnvironment, readJson } from './update-runner.js';

describe.skipIf(process.platform !== 'win32')('update lifecycle', () => {
  async function setup(run) {
    const directory = await mkdtemp(path.join(tmpdir(), 'fastimage-lifecycle-'));
    try {
      const updates = path.join(directory, 'updates');
      await mkdir(updates);
      const stagedPath = path.join(updates, 'FastImage-2.0.10-Windows-Setup.exe');
      await writeFile(stagedPath, 'update');
      const manifest = { version: '2.0.10', assetName: path.basename(stagedPath), stagedPath,
        sha256: crypto.createHash('sha256').update('update').digest('hex') };
      await writeFile(path.join(updates, 'pending-update.json'), JSON.stringify(manifest));
      const app = { isPackaged: true, getVersion: () => '2.0.9', getPath: () => directory, quit: vi.fn() };
      await run(app, manifest, directory);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  it('deduplicates install requests and quits only after the helper is ready', () => setup(async app => {
    const runInstaller = vi.fn(async () => undefined);
    const manager = createUpdateManager({ app, spawnInstaller: runInstaller });
    const results = await Promise.all([manager.installUpdate(), manager.installUpdate()]);
    expect(results.every(result => result.status === 'restarting')).toBe(true);
    expect(runInstaller).toHaveBeenCalledOnce();
    expect(app.quit).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(app.quit).toHaveBeenCalledOnce();
  }));
  it('keeps the app open on helper failure and never auto-applies on startup', () => setup(async app => {
    const spawnInstaller = vi.fn(async () => { throw new Error('No helper'); });
    const manager = createUpdateManager({ app, spawnInstaller });
    expect(await manager.applyPendingUpdate()).toBe(false);
    expect(await manager.installUpdate()).toMatchObject({ status: 'error', message: 'No helper' });
    expect(await manager.applyPendingUpdate()).toBe(false);
    expect(app.quit).not.toHaveBeenCalled();
    expect(spawnInstaller).toHaveBeenCalledOnce();
  }));
  it('rejects a portable payload in the installed app', () => setup(async (app, manifest, directory) => {
    await writeFile(path.join(directory, 'updates/pending-update.json'), JSON.stringify({ ...manifest, distribution: 'portable' }));
    const spawnInstaller = vi.fn();
    expect(await createUpdateManager({ app, spawnInstaller }).installUpdate()).toMatchObject({ status: 'error' });
    expect(spawnInstaller).not.toHaveBeenCalled();
  }));
  it('rejects a modified download without closing the app', () => setup(async (app, manifest) => {
    await writeFile(manifest.stagedPath, 'corrupted');
    const spawnInstaller = vi.fn();
    expect(await createUpdateManager({ app, spawnInstaller }).installUpdate()).toMatchObject({ status: 'error' });
    expect(spawnInstaller).not.toHaveBeenCalled();
    expect(app.quit).not.toHaveBeenCalled();
  }));
  it('does not acknowledge a launch without the matching transaction token', () => setup(async app => {
    const runner = createUpdateRunner({ app, executablePath: () => process.execPath });
    await expect(runner.confirmLaunch()).resolves.toBeUndefined();
  }));
  it('launches the helper through an isolated Windows broker and commits after ready', () => setup(async (app, manifest, directory) => {
    const target = path.join(directory, 'current.exe');
    await writeFile(target, 'old exe');
    let launch;
    const runner = createUpdateRunner({ app, executablePath: () => target, spawnProcess: (...args) => {
      launch = args;
      const child = { on() { return child; }, unref: vi.fn(), kill: vi.fn() };
      void (async () => {
        const { id } = await readJson(path.join(directory, 'updates/transaction.json'));
        await writeFile(path.join(directory, 'updates', id, 'ready'), id);
      })();
      return child;
    } });
    await runner.start(manifest, target, 'portable');
    const { id } = await readJson(path.join(directory, 'updates/transaction.json'));
    expect(await readFile(path.join(directory, 'updates', id, 'ready'), 'utf8')).toContain(id);
    expect(await readFile(path.join(directory, 'updates', id, 'commit'), 'utf8')).toBe(id);
    expect(await readFile(target, 'utf8')).toBe('old exe');
    expect(launch[0].toLowerCase()).toMatch(/system32[\\/]cmd\.exe$/);
    expect(launch[1]).toEqual(expect.arrayContaining(['/d', '/s']));
    expect(launch[1].join(' ')).toContain('EncodedCommand');
    expect(launch[2]).toMatchObject({ detached: true, windowsVerbatimArguments: true, windowsHide: true, cwd: path.join(directory, 'updates'), stdio: 'ignore' });
    expect(Object.keys(launch[2].env).some(key => /^PORTABLE_/i.test(key))).toBe(false);
  }), 35000);
});

it('removes the previous portable and Electron runtime environment from relaunches', () => {
  expect(cleanUpdateEnvironment({ PORTABLE_EXECUTABLE_FILE: 'old', portable_executable_dir: 'temp',
    ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '--require old.js', PSModulePath: 'PowerShell7-only', Path: 'system', TEMP: 'temp' }))
    .toEqual({ Path: 'system', TEMP: 'temp' });
});

describe.skipIf(process.platform !== 'win32')('PowerShell update transaction', () => {
  async function runHelper({ mode = 'success', distribution = 'portable', corrupt = false, alive = false } = {}) {
    const base = await mkdtemp(path.join(tmpdir(), 'fastimage-helper-'));
    const directory = path.join(base, "한글 & 공백 ' 경로");
    await mkdir(directory);
    try {
      const sourcePath = path.join(directory, 'source.exe');
      const targetPath = path.join(directory, 'target.exe');
      await writeFile(sourcePath, 'new');
      await writeFile(targetPath, 'old');
      const job = { id: crypto.randomUUID(), distribution, processId: alive ? process.pid : 2147483647,
        expectedVersion: '2.0.10', previousVersion: '2.0.9', sourcePath, targetPath, userData: directory,
        sha256: crypto.createHash('sha256').update(corrupt ? 'wrong' : 'new').digest('hex'),
        pendingPath: path.join(directory, 'pending.json'), exitTimeoutMs: 400, launchTimeoutMs: 400, showErrors: false };
      await writeFile(job.pendingPath, '{}');
      await writeFile(path.join(directory, 'job.json'), JSON.stringify(job));
      await writeFile(path.join(directory, 'commit'), job.id);
      await copyFile(new URL('./update-helper.ps1', import.meta.url), path.join(directory, 'helper.ps1'));
      const wrapper = String.raw`
$script:launches = 0
$script:moves = 0
function Move-Item {
  param($LiteralPath, $Destination, [switch]$Force)
  if ($LiteralPath -eq "$PSScriptRoot\target.exe" -and $script:moves -eq 0) {
    $script:moves++
    throw 'Launcher still holds the EXE'
  }
  Microsoft.PowerShell.Management\Move-Item -LiteralPath $LiteralPath -Destination $Destination -Force
}
function Start-Process {
  param($FilePath, $WorkingDirectory, $ArgumentList, [switch]$PassThru, $WindowStyle)
  $j = Get-Content "$PSScriptRoot\job.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($FilePath -eq (Get-Item -LiteralPath $j.sourcePath).FullName) {
    Set-Content "$PSScriptRoot\installer-arguments.txt" ($ArgumentList -join ' ')
    $p = [pscustomobject]@{ ExitCode=0; HasExited=$true }
    $p | Add-Member ScriptMethod WaitForExit { param($timeout) return $true }
    return $p
  }
  $script:launches++
  Set-Content "$PSScriptRoot\launch-count.txt" $script:launches
  if ('MODE' -eq 'success' -or $script:launches -ge 3) {
    $v = if ('MODE' -eq 'success') { $j.expectedVersion } else { $j.previousVersion }
    @{ id=$j.id; version=$v; pid=TEST_PID; targetPath=$j.targetPath } | ConvertTo-Json | Set-Content "$PSScriptRoot\launch.json" -Encoding UTF8
  }
  return [pscustomobject]@{ HasExited=$true; Id=2147483647 }
}
& "$PSScriptRoot\helper.ps1" "$PSScriptRoot\job.json"
`.replace('MODE', mode).replace('MODE', mode).replace('TEST_PID', String(process.pid));
      await writeFile(path.join(directory, 'wrapper.ps1'), '\uFEFF' + wrapper);
      const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
      const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(directory, 'wrapper.ps1')],
        { cwd: base, encoding: 'utf8', timeout: 15000, windowsHide: true, env: cleanUpdateEnvironment() });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      return { status: await readJson(path.join(directory, 'status.json')), target: await readFile(targetPath, 'utf8'),
        launches: await readFile(path.join(directory, 'launch-count.txt'), 'utf8').catch(() => '0'),
        installerArguments: await readFile(path.join(directory, 'installer-arguments.txt'), 'utf8').catch(() => ''),
        pending: await readFile(job.pendingPath, 'utf8').catch(() => null) };
    } finally { await rm(base, { recursive: true, force: true }); }
  }
  it('waits for locks, keeps the shortcut path, and requires renderer acknowledgement', async () => {
    const result = await runHelper();
    expect(result.status.phase, result.status.message).toBe('completed');
    expect(result.target).toBe('new');
    expect(result.pending).toBeNull();
  });
  it('retries launch then restores and starts the previous version when no acknowledgement arrives', async () => {
    const result = await runHelper({ mode: 'no-ack' });
    expect(result.status.phase, result.status.message).toBe('rolled-back');
    expect(result.target).toBe('old');
    expect(result.launches.trim()).toBe('3');
    expect(result.pending).toBe('{}');
  });
  it('leaves a still-running app untouched on exit timeout', async () => {
    const result = await runHelper({ alive: true });
    expect(result.status.phase, result.status.message).toBe('failed');
    expect(result.target).toBe('old');
    expect(result.launches).toBe('0');
  });
  it('rejects a bad checksum before replacement', async () => {
    const result = await runHelper({ corrupt: true });
    expect(result.status.phase, result.status.message).toBe('failed');
    expect(result.target).toBe('old');
    expect(result.launches).toBe('0');
  });
  it('waits for the installer and owns a single verified relaunch', async () => {
    const result = await runHelper({ distribution: 'installer' });
    expect(result.status.phase, result.status.message).toBe('completed');
    expect(result.installerArguments.trim()).toBe('/S --updated');
    expect(result.launches.trim()).toBe('1');
  });
});
