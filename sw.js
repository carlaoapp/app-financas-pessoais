// Service Worker - APP Finanças Pessoais v1.4.9
const CACHE_NAME = 'financas-pessoais-v1.4.9';
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
    console.log('[SW v1.4.9] Instalando e forçando ativação imediata...');
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
    console.log('[SW v1.4.9] Ativado. Limpando caches legados...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW v1.4.9] Removendo cache obsoleto:', key);
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

    // 1. APIs e controle de versão: SEMPRE direto na rede com fallback seguro para não travar
    if (url.includes('/api/') || url.includes('/version.json')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).catch(() => {
                return new Response(JSON.stringify({ offline: true, error: 'Offline ou sem conexão' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                });
            })
        );
        return;
    }

    // 2. Navegação / HTML: ESTRATÉGIA ANTI-SPLASH (TIMEOUT RÁPIDO DE 1.2s COM CACHE IMEDIATO)
    // Se o Render estiver dormindo ou a rede móvel oscilar, NUNCA deixa o celular preso na splash!
    if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                const isExplicitReload = url.includes('reload=') || url.includes('update=');
                const cachedPage = isExplicitReload ? null : (await cache.match('/index.html') || await cache.match('/') || await cache.match(event.request));

                const networkPromise = fetch(event.request, { cache: 'no-cache' })
                    .then(async response => {
                        if (response && response.status === 200) {
                            const copy = response.clone();
                            await cache.put(event.request, copy.clone());
                            await cache.put('/index.html', copy.clone());
                            await cache.put('/', copy);
                        }
                        return response;
                    });

                // Se já temos a página no cache local:
                // Dá 1.2 segundos para a rede responder. Se demorar (Render dormindo ou 4G lento), serve o cache NA HORA!
                if (cachedPage) {
                    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1200));
                    try {
                        const fastResult = await Promise.race([networkPromise, timeoutPromise]);
                        if (fastResult && fastResult.status === 200) {
                            return fastResult;
                        }
                    } catch (e) {
                        // Offline
                    }
                    return cachedPage;
                }

                // Se for o primeiro acesso sem cache, aguarda a rede
                try {
                    return await networkPromise;
                } catch (e) {
                    return cachedPage || new Response(`
                        <!DOCTYPE html>
                        <html lang="pt-BR">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Finanças Pessoais - Modo Offline</title>
                            <style>
                                body { background: #070D18; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                                .box { background: #0F172A; border: 1px solid #1E293B; border-radius: 20px; padding: 28px 24px; max-width: 380px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
                                h2 { color: #38BDF8; font-size: 1.25rem; margin-top: 12px; margin-bottom: 8px; }
                                p { color: #94A3B8; font-size: 0.88rem; line-height: 1.4; margin-bottom: 22px; }
                                button { background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; width: 100%; box-shadow: 0 4px 14px rgba(37,99,235,0.4); }
                            </style>
                        </head>
                        <body>
                            <div class="box">
                                <div style="font-size: 42px;">📶</div>
                                <h2>Conectando ao Finanças Pessoais</h2>
                                <p>O servidor está acordando na nuvem. Toque no botão abaixo para entrar.</p>
                                <button onclick="window.location.reload()">🔄 Carregar Aplicativo</button>
                            </div>
                        </body>
                        </html>
                    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
                }
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
