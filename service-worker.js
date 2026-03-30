// FireGuard Pro — Service Worker v10
const CACHE_NAME = 'fireguard-pro-v12';

// Google API domains — never cache, always fetch live
const NO_CACHE_ORIGINS = [
  'accounts.google.com',
  'apis.google.com',
  'oauth2.googleapis.com',
  'www.googleapis.com',
  'content.googleapis.com',
];

const PRECACHE = [
  './fire_alarm_inspection.html',
  './manifest.json',
];

// Install: cache app files and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // Take over immediately, don't wait
  );
});

// Activate: delete ALL old caches and claim all open tabs right away
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google APIs — always live, never cached
  if (NO_CACHE_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // App HTML — network first so updates are always picked up, cache as fallback
  if (url.pathname.endsWith('.html') && url.origin === self.location.origin) {
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
    return;
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', {status: 503}));
    })
  );
});
