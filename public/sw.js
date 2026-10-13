// Service Worker - APP Finanças Pessoais v1.3.6
const CACHE_NAME = 'financas-pessoais-v1.3.6';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/finance-style.css',
    '/app-custom.css',
    '/jspdf.umd.min.js',
    '/jspdf.plugin.autotable.min.js',
    '/xlsx.mini.min.js',
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
    console.log('[SW v1.3.6] Instalando e forçando ativação imediata...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            // Tenta cachear com bypass de cache HTTP para nao preencher com lixo antigo
            for (const asset of ASSETS_TO_CACHE) {
                try {
                    const res = await fetch(asset, { cache: 'reload' });
                    if (res && res.status === 200) {
                        await cache.put(asset, res);
                    }
                } catch (e) {
                    // Ignora falhas isoladas sem abortar o install
                }
            }
        })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW v1.3.6] Ativado. Limpando caches legados...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW v1.3.6] Removendo cache obsoleto:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(async () => {
            await self.clients.claim();
            // Notifica todos os clientes abertos sobre a ativacao da nova versao
            const clientList = await self.clients.matchAll({ type: 'window' });
            for (const client of clientList) {
                client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
            }
        })
    );
});

self.addEventListener('message', event => {
    if (!event.data) return;
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data.action === 'clearAllCaches') {
        event.waitUntil(
            caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        );
    }
});

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // 1. APIs e controle de versão: SEMPRE direto na rede, sem cache
    if (url.includes('/api/') || url.includes('/version.json')) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }));
        return;
    }

    // 2. Navegação / HTML: Network-first estrito (se online busca do servidor, se offline usa cache)
    if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' })
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match('/index.html').then(cached => cached || caches.match('/')))
        );
        return;
    }

    // 3. Recursos estáticos (JS, CSS, Imagens): Network-first com fallback para cache offline
    event.respondWith(
        fetch(event.request, { cache: 'no-cache' })
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
