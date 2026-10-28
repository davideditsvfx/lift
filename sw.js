// Bump CACHE when shipping changes so phones pick up the new version.
const CACHE = 'gym-v9';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache so a new version never precaches stale files.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Stale-while-revalidate: open instantly from cache, refresh it in the background.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // no-cache asks the server instead of trusting the 10-minute HTTP cache.
  const net = caches.open(CACHE).then(cache => fetch(e.request.url, { cache: 'no-cache' }).then(res => {
    if (res.ok) cache.put(e.request, res.clone());
    return res;
  }));
  // Keep the worker alive until the cache is refreshed; iOS stops it as soon as the page has its response.
  e.waitUntil(net.catch(() => {}));
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || net));
});
