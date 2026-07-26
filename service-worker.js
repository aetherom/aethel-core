/**
 * Aethel Core - Service Worker
 * Version: 1.0.0
 * Strategy: Cache-first for static assets, Network-first for navigations.
 */

const CACHE_NAME = 'aethel-core-v1.0.0';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './app.js',
    './legal-text.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'
];

// Install Event: Precache core application shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Aethel SW] Caching core assets...');
                // We use addAll but ignore failures for cross-origin CDN scripts to prevent SW death
                return Promise.allSettled(
                    CORE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[Aethel SW] Failed to cache: ${url}`)))
                );
            })
            .then(() => {
                console.log('[Aethel SW] Skip waiting triggered.');
                return self.skipWaiting();
            })
    );
});

// Activate Event: Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[Aethel SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Aethel SW] Claiming clients.');
            return self.clients.claim();
        })
    );
});

// Fetch Event: Intercept network requests
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Ignore non-GET requests
    if (request.method !== 'GET') return;

    // Handle Navigations (HTML pages) - Network-first to ensure latest UI updates
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    return networkResponse;
                })
                .catch(() => {
                    console.log('[Aethel SW] Offline: Serving cached navigation.');
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Handle Static Assets (JS, CSS, Images, Fonts) - Cache-first
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                    return networkResponse;
                }

                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Only cache same-origin or explicitly allowed CORS resources
                    try {
                        cache.put(request, responseClone);
                    } catch (e) {
                        console.warn(`[Aethel SW] Could not cache ${request.url}: ${e.message}`);
                    }
                });
                return networkResponse;
            }).catch(() => {
                // Optional: Return a fallback offline image/icon here if needed
            });
        })
    );
});
