import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './offline-worker.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function walk(directory, prefix = '') {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const relative = `${prefix}/${entry.name}`;
        if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative));
        else if (!entry.name.endsWith('.map')) files.push(relative);
    }
    return files;
}
const publicFiles = (await walk(path.join(root, 'public'))).filter(file => file !== '/sw.js');
const nextFiles = (await walk(path.join(root, '.next/static'))).map(file => `/_next/static${file}`);
const assets = ['/', '/index.html', ...publicFiles, ...nextFiles].sort();
const fingerprint = createHash('sha256');
fingerprint.update(await readFile(path.join(root, '.next/BUILD_ID')));
for (const file of publicFiles) fingerprint.update(await readFile(path.join(root, 'public', file)));
await writeFile(path.join(root, 'public/sw.js'), worker.createOfflineWorker(fingerprint.digest('hex').slice(0, 16), assets));
console.log(`Prepared offline Next.js shell with ${assets.length} local assets.`);
