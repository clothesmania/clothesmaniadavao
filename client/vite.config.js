import { defineConfig } from 'vite'
import { createHash } from 'node:crypto'

function offlineAppShell() {
  return {
    name: 'clothes-mania-offline-shell',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle)
        .filter(fileName => fileName === 'index.html' || /\.(?:js|css|svg|webmanifest)$/.test(fileName))
        .map(fileName => `/${fileName}`)
      const appShell = [...new Set(['/', '/index.html', '/logo.svg', '/manifest.webmanifest', ...assets])]
      const assetFingerprint = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 12)
      const cacheName = `clothes-mania-shell-${assetFingerprint}`
      const source = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const APP_SHELL = ${JSON.stringify(appShell)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('clothes-mania-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/index.html'))));
    return;
  }
  if (APP_SHELL.includes(new URL(request.url).pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
  }
});
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    }
  }
}

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [offlineAppShell()]
})
