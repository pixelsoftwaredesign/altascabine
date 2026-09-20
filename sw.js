const CACHE = 'atlas-cabin-v4';
const CORE = [
  '/',
  '/index.html',
  '/tailwind.prod.css',
  '/manifest.webmanifest',
  '/icon.svg',
  '/lang.js',
  '/lang-ar.js',
  '/lang-en.js',
  '/lang-it.js',
  '/lang-de.js',
  '/lang-es.js',
  '/lang-zh.js',
  '/lang-ko.js',
  '/lang-ja.js',
  '/lang-ru.js',
  '/lang-fi.js',
  '/lang-tr.js',
  '/lang-fa.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('chrome-extension')) return;

  // navigation & moteur de langue : réseau d'abord, repli cache (toujours récent)
  if (req.mode === 'navigate' || /^\/lang-[a-z-]+\.js$/.test(new URL(req.url).pathname)) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // le reste : cache d'abord, puis réseau (pour CDN tailwind/fonts au 1er passage)
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && req.url.startsWith('https')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});