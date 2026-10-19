// Service Worker - APP Finanças Pessoais v1.7.5
const CACHE_NAME = 'financas-pessoais-v1.7.5';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/finance-style.css',
    '/app-custom.css',
    '/dexie.min.js',
    '/echarts.min.js',
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
    console.log('[SW v1.7.5] Instalando e forçando ativação imediata...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            for (const asset of ASSETS_TO_CACHE) {
                try {
                    const res = await fetch(asset, { cache: 'reload' });
                    if (res && res.status === 200) {
                        await cache.put(asset, res);
                    }
                } catch (e) {
                    // Silencioso em caso de falha isolada
                }
            }
        })
    );
});

self.addEventListener('activate', event => {
    console.log('[SW v1.7.5] Ativado. Limpando caches legados...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW v1.7.5] Removendo cache obsoleto:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(async () => {
            await self.clients.claim();
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

    // 1. APIs e controle de versão: SEMPRE direto na rede nativa (sem interceptação do Service Worker)
    if (url.includes('/api/') || url.includes('/version.json')) {
        return;
    }

    // 2. Navegação / HTML: Tenta rede primeiro para novidades imediatas; fallback offline instantâneo
    if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);

                // Tenta buscar o HTML fresco na rede
                try {
                    const netRes = await fetch(event.request, { cache: 'no-cache' });
                    if (netRes && netRes.status === 200) {
                        await cache.put(event.request, netRes.clone());
                        await cache.put('/index.html', netRes.clone());
                        await cache.put('/', netRes.clone());
                        return netRes;
                    }
                } catch (netErr) {
                    // Offline ou falha temporária de rede: usa cache
                }

                const cachedPage = await cache.match('/index.html') || await cache.match('/') || await cache.match(event.request);
                if (cachedPage) {
                    return cachedPage;
                }

                return new Response('<!DOCTYPE html><html><body style="background:#0F172A;color:#fff;text-align:center;padding:40px;font-family:sans-serif;"><h2>Sem conexão com a internet</h2><p>Conecte-se para o primeiro acesso ao aplicativo.</p><button onclick="window.location.reload()" style="background:#2563EB;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;">Tentar Novamente</button></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            })()
        );
        return;
    }


    // 3. Recursos estáticos (JS, CSS, Imagens, Fontes): CACHE-FIRST ULTRA RÁPIDO
    // Responde em 0ms do cache local e revalida silenciosamente em background
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request, { ignoreSearch: true });

            const backgroundFetch = fetch(event.request)
                .then(async netRes => {
                    if (netRes && netRes.status === 200) {
                        await cache.put(event.request, netRes.clone());
                    }
                    return netRes;
                })
                .catch(() => null);

            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                const res = await backgroundFetch;
                if (res) return res;
            } catch (e) {}

            return cachedResponse || new Response('', { status: 404 });
        })()
    );
});
