/**
 * DMV Water Watch service worker.
 *
 * Strategy:
 *   - App shell: cache-first with background revalidate.
 *   - /data/* JSON artifacts: stale-while-revalidate so navigations don't pay
 *     a round-trip when a recent build is already cached (build cadence is
 *     hourly; ARCHITECTURE.md § 5.3 tolerates a minute of staleness).
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
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(staleWhileRevalidate(event.request, DATA_CACHE));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached ?? (await network) ?? new Response('Offline', { status: 503 });
}
