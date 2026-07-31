const CACHE_NAME = 'aethel-core-network-first-v2';
const CORE_ASSETS = [
    './',
    './index.html',
    './app.js',
    './legal-text.js',
    './manifest.json',
    './icon.svg',
    './robots.txt'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.allSettled(CORE_ASSETS.map(url => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

// Network-First Strategy for robust PWA behavior
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
        }).catch(() => {
            return caches.match(event.request).then(cachedResponse => {
                // Fallback to index.html for navigation requests if offline
                if (event.request.mode === 'navigate') {
                    return cachedResponse || caches.match('./index.html');
                }
                return cachedResponse;
            });
        })
    );
});
