// Service Worker - APP Finanças Pessoais v1.2.7
const CACHE_NAME = 'financas-pessoais-v1.2.7';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/finance-style.css',
    '/app-custom.css',
    '/jspdf.umd.min.js',
    '/jspdf.plugin.autotable.min.js',
    '/finance-dashboard.js',
    '/finance-powerbi.js',
    '/finance-db.js',
    '/finance-sync.js',
    '/auth.js',
    '/auto-update.js',
    '/lucide.min.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.png'
];

self.addEventListener('install', event => {
    console.log('[SW] Instalando versão:', CACHE_NAME);
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('Cache parcial durante install:', err);
            });
        })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Ativando versão:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deletando cache obsoleto:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Para rotas de API e version.json, sempre buscar na rede diretamente
    if (url.includes('/api/') || url.includes('/version.json')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para arquivos HTML / Navegação: SEMPRE buscar na rede primeiro com no-cache
    if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Para outros recursos estáticos: Network first, fallback para cache
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
            .catch(() => caches.match(event.request))
    );
});
