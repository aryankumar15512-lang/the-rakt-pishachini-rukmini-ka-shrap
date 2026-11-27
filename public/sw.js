const CACHE_NAME = 'rakt-pishachini-pwa-v10';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  '/app-icon-512.png',
  './haveli-menu-bg.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle http(s) requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never intercept backend API routes or dev HMR endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs')
  ) {
    return;
  }

  // Navigation requests & JS/CSS code bundles: Network-first with cache fallback
  const isCodeAsset =
    request.mode === 'navigate' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    /\.(js|mjs|css|html)$/i.test(url.pathname);

  if (isCodeAsset && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) ||
            (request.mode === 'navigate'
              ? (await caches.match('./index.html')) || (await caches.match('./'))
              : undefined);
          return (
            cached ||
            new Response('Offline - Please reconnect to load The Rakt Pishachini.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }),
    );
    return;
  }

  // Same-origin media/images & Google Fonts: Stale-while-revalidate
  const isSameOrigin = url.origin === self.location.origin;
  const isFontHost =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if (isSameOrigin || isFontHost) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              (networkResponse.ok || networkResponse.type === 'opaque')
            ) {
              const copy = networkResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      }),
    );
  }
});
