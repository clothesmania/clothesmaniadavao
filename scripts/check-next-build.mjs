import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.POS_TEST_URL || 'http://127.0.0.1:8000';
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const manifest = source.match(/const APP_SHELL = (\[[\s\S]*?\]);/);
assert.ok(manifest, 'Run npm run build before checking the production server.');
const assets = JSON.parse(manifest[1]);
for (let index = 0; index < assets.length; index += 10) {
    await Promise.all(assets.slice(index, index + 10).map(async asset => {
        const response = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(15000) });
        assert.equal(response.status, 200, `${asset} must be available for offline startup`);
        await response.arrayBuffer();
    }));
}
for (const route of ['/', '/index.html']) {
    const html = await (await fetch(new URL(route, base))).text();
    assert.match(html, /\/_next\/static\//);
    assert.match(html, /id="pos-root"/);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
}
for (const file of ['/.env.local', '/.git/config', '/src/pos/shell.html']) {
    const response = await fetch(new URL(file, base));
    assert.equal(response.status, 404, `${file} must remain private`);
}
const worker = await fetch(new URL('/sw.js', base));
assert.match(worker.headers.get('cache-control'), /no-cache/);
console.log(`Production checks passed: both POS routes, ${assets.length} offline assets, worker updates, and private-file protection.`);
