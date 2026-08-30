import crypto from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { createUpdateManager } from './update-service.js';

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
