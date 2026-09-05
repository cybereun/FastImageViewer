// Run after building: node scripts/update-e2e.mjs portable|rollback|installer [setup.exe]
// Uses a separate profile; installer mode requires the isolated test appId build.
import fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { cleanUpdateEnvironment, readJson } = require('../electron/update-runner');
const mode = process.argv[2] || 'portable';
if (!['portable', 'rollback', 'installer'].includes(mode)) throw new Error('Unknown test mode');
const root = realpathSync.native(await fs.mkdtemp(path.join(os.tmpdir(), 'fastimage-e2e-')));
const profile = path.join(root, 'profile');
const id = crypto.randomUUID();
const jobDirectory = path.join(profile, 'updates', id);
await fs.mkdir(jobDirectory, { recursive: true });
const version = require('../package.json').version;
const env = cleanUpdateEnvironment();
const ps = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, description, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await sleep(250);
  }
  throw new Error(`Timed out: ${description}. Diagnostics: ${root}`);
}
function closeWindow(pid) {
  if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid test process ID');
  const result = spawnSync(ps, ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${pid}).CloseMainWindow()`], { env, windowsHide: true, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
}
async function run(exe, args) {
  const child = spawn(exe, args, { env, windowsHide: true, stdio: 'ignore', cwd: root });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${exe}: exit ${code}`)));
  });
}
let target;
let source;
if (mode === 'installer') {
  source = path.join(profile, 'updates', 'setup.exe');
  await fs.copyFile(path.resolve(process.argv[3]), source);
  target = path.join(root, 'installed', 'FastImageUpdateTest.exe');
  await run(source, ['/S', `/D=${path.dirname(target)}`]);
} else {
  const targetDirectory = path.join(root, "한글 & 공백 ' 사진 앱");
  await fs.mkdir(targetDirectory);
  target = path.join(targetDirectory, 'FastImage.exe');
  const release = path.resolve(`dist-electron/FastImage-${version}-Windows-Portable.exe`);
  await fs.copyFile(release, target);
  source = path.join(profile, 'updates', 'update.exe');
  if (mode === 'rollback') await fs.writeFile(source, 'intentionally invalid EXE to exercise recovery');
  else await fs.copyFile(release, source);
}
const originalHash = crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex');
const job = { id, distribution: mode === 'installer' ? 'installer' : 'portable', processId: 2147483647,
  expectedVersion: version, previousVersion: version, targetPath: target, sourcePath: source,
  userData: profile, pendingPath: path.join(profile, 'updates', 'pending-update.json'),
  sha256: crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex'),
  exitTimeoutMs: 30_000, launchTimeoutMs: 30_000, showErrors: false };
await fs.writeFile(job.pendingPath, JSON.stringify({ installAttemptedAt: new Date().toISOString() }));
await fs.writeFile(path.join(profile, 'updates', 'transaction.json'), JSON.stringify({ id }));
await fs.writeFile(path.join(jobDirectory, 'job.json'), JSON.stringify(job));
await fs.writeFile(path.join(jobDirectory, 'update-helper.ps1'), '\uFEFF' + await fs.readFile(new URL('../electron/update-helper.ps1', import.meta.url), 'utf8'));
const first = spawn(target, [`--user-data-dir=${profile}`, `--fastimage-update-token=${id}`], { env, windowsHide: false, stdio: 'ignore', cwd: root });
first.on('error', error => { console.error(error); });
first.on('exit', code => console.log(JSON.stringify({ mode, phase: 'first-launcher-exit', code })));
const before = await waitFor(() => readJson(path.join(jobDirectory, 'launch.json')), 'initial renderer ready');
console.log(JSON.stringify({ mode, phase: 'initial-window-ready', pid: before.pid, version: before.version, root }));
job.processId = before.pid;
await fs.writeFile(path.join(jobDirectory, 'job.json'), JSON.stringify(job));
const helper = spawn(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(jobDirectory, 'update-helper.ps1'), path.join(jobDirectory, 'job.json')], { env, windowsHide: true, stdio: 'pipe', cwd: root });
helper.stderr.on('data', data => process.stderr.write(data));
await waitFor(async () => fs.stat(path.join(jobDirectory, 'ready')).catch(() => null), 'helper ready');
await fs.writeFile(path.join(jobDirectory, 'commit'), id);
closeWindow(before.pid);
console.log(JSON.stringify({ mode, phase: 'old-window-closed' }));
const status = await waitFor(async () => {
  const value = await readJson(path.join(jobDirectory, 'status.json'));
  return value && ['completed', 'rolled-back', 'failed'].includes(value.phase) ? value : null;
}, 'update transaction finished', 180_000);
const after = await readJson(path.join(jobDirectory, 'launch.json'));
const expected = mode === 'rollback' ? 'rolled-back' : 'completed';
if (status.phase !== expected || after?.pid === before.pid || after?.version !== version) {
  throw new Error(JSON.stringify({ root, expected, status, before, after }));
}
if (mode === 'rollback' && crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex') !== originalHash) throw new Error('Rollback did not restore the exact original bytes');
console.log(JSON.stringify({ mode, phase: status.phase, oldPid: before.pid, newPid: after.pid, version: after.version, root }));
closeWindow(after.pid);
await waitFor(() => { try { process.kill(after.pid, 0); return false; } catch { return true; } }, 'test app exit');
if (mode === 'installer') await run(path.join(path.dirname(target), 'Uninstall FastImageUpdateTest.exe'), ['/S']);
await fs.writeFile(path.join(root, 'result.json'), JSON.stringify({ mode, status, before, after }, null, 2));
