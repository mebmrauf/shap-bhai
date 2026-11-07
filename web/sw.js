// The server stamps this with a hash of the game files, so any change is a whole new version.
const CACHE_NAME = 'shap-bhai-__BUILD__';
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
  '/js/adventures.js',
  '/js/render.js',
  '/js/render3d.js',
  '/js/world3d.js',
  '/js/audio.js',
  '/js/themes.js',
  '/js/districts.js',
  '/js/social.js',
  '/js/cards.js',
  '/js/i18n.js',
  '/js/update.js',
  '/vendor/three-0.187.0-r2/three.min.js',
  '/fonts/NotoSansBengali-Regular.ttf'
];
const VOICES = ['startChaos_rooftop', 'startChaos_coxs', 'startChaos_sundarbans', 'chaosPower_rooftop', 'chaosPower_coxs', 'chaosPower_sundarbans', 'chaosPowerBack_rooftop', 'chaosPowerBack_coxs', 'chaosPowerBack_sundarbans', 'chaosTraffic_rooftop', 'chaosTraffic_coxs', 'chaosTraffic_sundarbans', 'chaosTrafficEnd_rooftop', 'chaosTrafficEnd_coxs', 'chaosTrafficEnd_sundarbans', 'chaosFlood_rooftop', 'chaosFlood_coxs', 'chaosFlood_sundarbans', 'chaosFloodEnd_rooftop', 'chaosFloodEnd_coxs', 'chaosFloodEnd_sundarbans', 'chaosWedding_rooftop', 'chaosWedding_coxs', 'chaosWedding_sundarbans', 'roastTraffic1_coxs', 'roastTraffic2_coxs', 'roastTraffic1_sundarbans', 'roastTraffic2_sundarbans', 'intro_dhaka_nagin', 'intro_dhaka_kalnagini', 'intro_dhaka_tiger', 'intro_dhaka_tea', 'intro_dhaka_jersey', 'warn_dhaka', 'gift_dhaka', 'collect_dhaka', 'active_dhaka', 'win_dhaka', 'caught_dhaka', 'chapter_dhaka_1', 'chapter_dhaka_2', 'intro_rooftop_nagin', 'intro_rooftop_kalnagini', 'intro_rooftop_tiger', 'intro_rooftop_tea', 'intro_rooftop_jersey', 'warn_rooftop', 'gift_rooftop', 'collect_rooftop', 'win_rooftop', 'caught_rooftop', 'chapter_rooftop_1', 'chapter_rooftop_2', 'intro_coxs_nagin', 'intro_coxs_kalnagini', 'intro_coxs_tiger', 'intro_coxs_tea', 'intro_coxs_jersey', 'warn_coxs', 'gift_coxs', 'collect_coxs', 'active_coxs', 'win_coxs', 'caught_coxs', 'chapter_coxs_1', 'chapter_coxs_2', 'intro_sundarbans_nagin', 'intro_sundarbans_kalnagini', 'intro_sundarbans_tiger', 'intro_sundarbans_tea', 'intro_sundarbans_jersey', 'warn_sundarbans', 'gift_sundarbans', 'collect_sundarbans', 'active_sundarbans', 'win_sundarbans', 'caught_sundarbans', 'chapter_sundarbans_1', 'chapter_sundarbans_2', 'stolen_rooftop', 'goal_jersey', 'trait_nagin', 'trait_kalnagini', 'trait_tiger', 'trait_tea', 'trait_jersey', 'start', 'eat', 'combo', 'help', 'run', 'roastWall1', 'roastWall2', 'roastWall3', 'roastWall4', 'roastWall5', 'roastWall6', 'roastWall7', 'roastSelf1', 'roastSelf2', 'roastSelf3', 'roastSelf4', 'roastSelf5', 'roastTraffic1', 'roastTraffic2', 'roastBest1', 'roastBest2', 'roastGhost1', 'roastGhost2', 'chaosPower', 'chaosTraffic', 'chaosFlood', 'chaosWedding', 'foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish', 'foodBiryani', 'speedUp', 'bite10', 'bite20', 'bite30', 'startDaily', 'startChaos', 'startGhost', 'closeCall1', 'closeCall2', 'chaosPowerBack', 'chaosTrafficEnd', 'chaosFloodEnd', 'chaosWeddingEnd', 'chaosSlip', 'roastZero', 'roastGhostWon', 'roastGhostTie', 'roastFull', 'momGone', 'kalNagini'];
// Fetched one by one after install, so a dropped connection cannot cost the whole offline cache.
// The app also requests these on Play, and anything missed is cached then.
const EXTRAS = [
  ...VOICES.map(name => `/audio/${name}.mp3?v=adventure-bn-5`),
  ...VOICES.map(name => `/audio/en/${name}.mp3?v=adventure-en-3`),
  '/audio/credits.json',
  '/audio/credits-en.json',
  '/audio/pungi-loop.wav?v=nagin-been-2'
];

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

  // Bypass cache for APIs and health checks
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/health')) {
    return;
  }

  // Shortcut and ghost URLs open the same app shell.
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
