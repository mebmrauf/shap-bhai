// The server stamps this with a hash of the game files, so any change is a whole new version.
const CACHE_NAME = 'dhaka-in-3d-__BUILD__';
// Everything needed to start and play. One failure here retries the whole install.
const CORE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/js/app.js',
  '/js/engine.js',
  '/js/render.js',
  '/js/render3d.js',
  '/js/world3d.js',
  '/js/audio.js',
  '/js/network.js',
  '/js/themes.js',
  '/js/districts.js',
  '/js/social.js',
  '/js/i18n.js',
  '/js/update.js',
  '/vendor/three-0.187.0-r2/three.min.js',
  '/fonts/NotoSansBengali-Regular.ttf'
];
const VOICES = ['start', 'eat', 'combo', 'wall', 'self', 'win', 'lose', 'draw', 'scream', 'ah', 'help', 'run', 'roastWall1', 'roastWall2', 'roastWall3', 'roastWall4', 'roastWall5', 'roastWall6', 'roastWall7', 'roastSelf1', 'roastSelf2', 'roastSelf3', 'roastSelf4', 'roastSelf5', 'roastTraffic1', 'roastTraffic2', 'roastBest1', 'roastBest2', 'roastGhost1', 'roastGhost2', 'chaosPower', 'chaosTraffic', 'chaosFlood', 'chaosWedding', 'foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish', 'foodBiryani', 'speedUp', 'bite10', 'bite20', 'bite30', 'startDaily', 'startChaos', 'startGhost', 'duelStart', 'closeCall1', 'closeCall2', 'chaosPowerBack', 'chaosTrafficEnd', 'chaosFloodEnd', 'chaosWeddingEnd', 'chaosSlip', 'roastZero', 'roastGhostWon', 'roastGhostTie', 'roastFull', 'duelWinWall', 'duelWinSelf', 'duelWinHit', 'duelLoseWall', 'duelLoseSelf', 'duelLoseHit', 'duelWinTime', 'duelLoseTime', 'duelMatchWin', 'duelMatchLose', 'duelHeadOn', 'duelTie', 'playerOneWin', 'playerTwoWin', 'momGone', 'rankOne', 'kalNagini'];
// Fetched one by one after install, so a dropped connection cannot cost the whole offline cache.
// The app also requests these on Play, and anything missed is cached then.
const EXTRAS = [...VOICES.map(name => `/audio/${name}.mp3?v=neural-bn-2`), '/audio/credits.json', '/audio/pungi-loop.wav?v=nagin-been-2'];

// Each version's files go into their own cache and arrive together, so a player never runs a mix of old and new code.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // no-cache makes sure a version is built from fresh files, never an old copy along the way.
      await cache.addAll(CORE.map(url => new Request(url, { cache: url.startsWith('/vendor/') ? 'default' : 'no-cache' })));
      // Voices rarely change, so an update on mobile data reuses what the phone already has.
      for (const url of EXTRAS) { const kept = await caches.match(url); if (kept) await cache.put(url, kept); }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim()).then(async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of EXTRAS) if (!await cache.match(url)) await cache.add(url).catch(() => {});
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cache for APIs, rooms, and health checks
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) {
    return;
  }

  // Invite and ghost links carry a query string but open the same app shell.
  const navigation = event.request.mode === 'navigate';
  const lookup = navigation ? caches.match('/index.html') : caches.match(event.request);

  // Anything already cached opens instantly, on any connection or none.
  event.respondWith(
    lookup.then(cached => cached || fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(navigation ? '/index.html' : event.request, clone));
      }
      return response;
    }))
  );
});
