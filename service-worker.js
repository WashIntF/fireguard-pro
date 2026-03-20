// FireGuard Pro — Service Worker
// Caches the app for full offline use on Android and PC.
// Version bump this string to force a cache refresh after updates.
const CACHE_NAME = 'fireguard-pro-v3';

// Files to cache on install
const PRECACHE = [
  './',
  './fire_alarm_inspection.html',
  './manifest.json',
  // External fonts & libraries are cached on first network fetch (see fetch handler)
];

// Install: pre-cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local files, network-first for external (fonts/CDN)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For same-origin requests: cache first, fall back to network
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For external resources (Google Fonts, CDN scripts): network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
