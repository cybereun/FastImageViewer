import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const archive = path.resolve(process.argv[2] || 'dist-electron/win-unpacked/resources/app.asar');
let checked = 0;
for (const entry of asar.listPackage(archive)) {
  const file = entry.replace(/^[/\\]/, '');
  const metadata = asar.statFile(archive, file);
  if (metadata.files || metadata.link) continue;
  const data = asar.extractFile(archive, file);
  if (metadata.integrity && crypto.createHash('sha256').update(data).digest('hex') !== metadata.integrity.hash) {
    throw new Error(`Package integrity mismatch: ${file}`);
  }
  checked++;
}
const packaged = JSON.parse(asar.extractFile(archive, 'package.json'));
const expected = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (packaged.version !== expected.version) throw new Error('Packaged version mismatch');
console.log(`Verified ${checked} packaged files; FastImage ${packaged.version}`);
