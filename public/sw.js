/**
 * DMV Water Watch service worker.
 *
 * Strategy:
 *   - App shell: cache-first. Updates pick up on the next deploy.
 *   - /data/* JSON artifacts: network-first with cache fallback. Showing slightly
 *     stale grades for a minute while the network resolves is acceptable per
 *     ARCHITECTURE.md § 5.3.
 *   - Everything else: pass-through.
 */

const SHELL_CACHE = 'dmv-water-watch-shell-v1';
const DATA_CACHE = 'dmv-water-watch-data-v1';

const SHELL_URLS = ['/', '/methodology', '/about', '/sources', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Data artifacts: network-first, fall back to cache.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // App shell: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, SHELL_CACHE));
  }
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Revalidate in background.
    fetch(request)
      .then((res) => {
        if (res.ok) cache.put(request, res.clone());
      })
      .catch(() => undefined);
    return cached;
  }
  return fetch(request);
}
