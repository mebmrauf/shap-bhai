const CACHE_NAME = 'snake-arena-v2.3-pungi';
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
  '/audio/pungi-loop.wav?v=pungi-1',
  '/audio/eat.wav?v=neural-bn-1',
  '/audio/start.wav?v=neural-bn-1',
  '/audio/wall.wav?v=neural-bn-1',
  '/audio/self.wav?v=neural-bn-1',
  '/audio/lose.wav?v=neural-bn-1',
  '/audio/win.wav?v=neural-bn-1',
  '/audio/draw.wav?v=neural-bn-1',
  '/audio/combo.wav?v=neural-bn-1',
  '/audio/scream.wav?v=neural-bn-1',
  '/audio/ah.wav?v=neural-bn-1',
  '/audio/help.wav?v=neural-bn-1',
  '/audio/run.wav?v=neural-bn-1'
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

