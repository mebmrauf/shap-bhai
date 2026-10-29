const CACHE_NAME = 'snake-arena-v2.1';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/js/app.js',
  '/js/engine.js',
  '/js/render.js',
  '/js/audio.js',
  '/js/network.js',
  '/fonts/NotoSansBengali-Regular.ttf',
  '/audio/credits.json',
  '/audio/eat.wav',
  '/audio/start.wav',
  '/audio/wall.wav',
  '/audio/self.wav',
  '/audio/lose.wav',
  '/audio/win.wav',
  '/audio/draw.wav',
  '/audio/combo.wav'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cache for APIs, rooms, and health checks
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) {
    return;
  }

  // Stale-while-revalidate for local static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
