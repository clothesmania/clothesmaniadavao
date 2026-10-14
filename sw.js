const CACHE_NAME = 'clothes-mania-pos-shell-v1';
const APP_SHELL = [
  '/index.html',
  '/report-io.js',
  '/images/profile.jpg',
  '/images/logo.svg',
  '/images/logo-full.svg',
  '/images/image.png',
  '/images/coverimage.jpg'
];
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/dexie@3.2.2/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm'
];
const CDN_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'esm.sh'
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await Promise.all(EXTERNAL_ASSETS.map(async asset => {
      try {
        const response = await fetch(asset, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) return;
        await cache.put(asset, response);
      } catch (error) {
        if (!asset.includes('@supabase/supabase-js')) {
          try {
            const response = await fetch(asset, { mode: 'no-cors', credentials: 'omit' });
            if (response.type === 'opaque') await cache.put(asset, response);
          } catch (fallbackError) {
            console.warn('Optional offline asset was not cached.', asset, fallbackError);
          }
        } else {
          console.warn('Supabase client could not be cached for offline startup.', error);
        }
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('clothes-mania-pos-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.hostname === 'eluuznfpkxjrduscwfvj.supabase.co') return;

  if (requestUrl.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
          return response;
        } catch (error) {
          return (await caches.match('/index.html')) || Response.error();
        }
      })());
      return;
    }

    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
      return response;
    })());
    return;
  }

  if (!CDN_HOSTS.has(requestUrl.hostname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const refresh = fetch(request).then(async response => {
      if (response.ok || response.type === 'opaque') {
        await (await caches.open(CACHE_NAME)).put(request, response.clone());
      }
      return response;
    });
    if (cached) {
      event.waitUntil(refresh.catch(() => {}));
      return cached;
    }
    return refresh;
  })());
});
