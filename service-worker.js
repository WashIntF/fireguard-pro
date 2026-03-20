// FireGuard Pro — Service Worker
// Caches the app for full offline use on Android and PC.
// Version bump this string to force a cache refresh after updates.
const CACHE_NAME = 'fireguard-pro-v8';

// Google API domains that must NEVER be cached — always fetch live
const NO_CACHE_ORIGINS = [
  'accounts.google.com',
  'apis.google.com',
  'oauth2.googleapis.com',
  'www.googleapis.com',
  'content.googleapis.com',
];

// Files to cache on install
const PRECACHE = [
  './',
  './fire_alarm_inspection.html',
  './manifest.json',
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

// Fetch handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google APIs — always go to network, never cache
  if (NO_CACHE_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Same-origin (our app files) — cache first, fall back to network
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

  // Other external resources (fonts, CDN) — network first, cache as fallback
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
