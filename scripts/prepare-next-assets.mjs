import { build } from 'esbuild';
import nextEnv from '@next/env';
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
nextEnv.loadEnvConfig(root, !process.argv.includes('--production'));
await mkdir(path.join(root, 'public/images'), { recursive: true });
for (const image of await readdir(path.join(root, 'images'))) {
    await copyFile(path.join(root, 'images', image), path.join(root, 'public/images', image));
}
for (const file of ['workspace-crypto.js', 'report-io.js']) {
    await copyFile(path.join(root, file), path.join(root, 'public', file));
}
await build({
    absWorkingDir: root,
    entryPoints: ['src/pos/dependencies.js'],
    outfile: 'public/vendor.js',
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
        'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '')
    }
});
// Development must not retain an old standalone worker over the Next.js app.
// Production replaces this with a versioned complete shell after next build.
if (process.argv.includes('--development')) await writeFile(path.join(root, 'public/sw.js'), `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('clothes-mania-pos-') || key.startsWith('clothes-mania-next-')).map(key => caches.delete(key)));
  await self.registration.unregister();
  await self.clients.claim();
})()));
`);
console.log('Prepared local POS dependencies and assets for Next.js.');
