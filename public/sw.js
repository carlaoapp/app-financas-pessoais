// Service Worker - APP Finanças Pessoais v1.3.9
const CACHE_NAME = 'financas-pessoais-v1.3.9';
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

    // 2. Navegação / HTML: Network-first com fallback offline e proteção contra erros do servidor
    if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' })
                .then(async networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(event.request, copy);
                        await cache.put('/index.html', copy.clone());
                        await cache.put('/', copy.clone());
                        return networkResponse;
                    }
                    // Se o servidor retornar 502, 503, 504 ou similar, recorre imediatamente ao cache
                    const cachedPage = await caches.match('/index.html') || await caches.match('/') || await caches.match(event.request);
                    if (cachedPage) return cachedPage;
                    return networkResponse;
                })
                .catch(async () => {
                    // Sem internet / conexão falhou: serve do cache local
                    const cachedPage = await caches.match('/index.html') || await caches.match('/') || await caches.match(event.request);
                    if (cachedPage) return cachedPage;

                    // Fallback visual amigável caso não haja cache inicial ainda
                    return new Response(`
                        <!DOCTYPE html>
                        <html lang="pt-BR">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Finanças Pessoais - Reconectando</title>
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
                                <h2>Conexão Temporariamente Instável</h2>
                                <p>O servidor está reconectando ou o sinal de internet oscilou. Toque abaixo para recarregar o sistema.</p>
                                <button onclick="window.location.reload()">🔄 Tentar Novamente</button>
                            </div>
                        </body>
                        </html>
                    `, {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                })
        );
        return;
    }

    // 3. Recursos estáticos (JS, CSS, Imagens): Network-first com fallback para cache offline
    event.respondWith(
        fetch(event.request, { cache: 'no-cache' })
            .then(async networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, responseClone);
                    return networkResponse;
                }
                const cached = await caches.match(event.request);
                return cached || networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
