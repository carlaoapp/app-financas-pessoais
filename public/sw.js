// Service Worker - APP Finanças Pessoais
const CACHE_NAME = 'financas-pessoais-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/finance-style.css',
    '/app-custom.css',
    '/finance-dashboard.js',
    '/finance-powerbi.js',
    '/finance-db.js',
    '/finance-sync.js',
    '/auth.js',
    '/auto-update.js',
    '/lucide.min.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('Cache parcial durante install:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Para rotas de API, sempre buscar na rede diretamente
    if (event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para arquivos estáticos: Network first, fallback para Cache
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
