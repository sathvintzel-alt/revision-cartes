// Service worker : fonctionnement hors connexion. Incrémenter VERSION à chaque mise à jour des fichiers.
const VERSION = 'v4';
const CACHE = 'cartes-' + VERSION;
const CORE = [
  './', 'index.html', 'style.css', 'app.js', 'config.js', 'srs.js', 'sync.js', 'maps.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-180.png',
  'data/departements.json', 'data/pays.json', 'data/geo/departements.geojson', 'data/geo/pays.geojson', 'data/capitales.json', 'data/prefectures.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Même origine uniquement : réseau d'abord, repli sur le cache. Supabase n'est jamais intercepté.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
