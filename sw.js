// Service Worker - APP Finanças Pessoais v1.8.9
const CACHE_NAME = 'financas-pessoais-v1.8.9';
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
    '/tesseract.min.js',
    '/finance-ocr.js',
    '/finance-auto-notificacoes.js',
    '/finance-dashboard.js',
    '/finance-cartoes.js',
    '/finance-powerbi.js',
    '/finance-db.js',
    '/finance-sync.js',
    '/auth.js',
    '/auto-update.js',
    '/lucide.min.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.png',
    '/ocr/worker.min.js',
    '/ocr/tesseract-core-simd-lstm.wasm.js',
    '/ocr/tesseract-core-lstm.wasm.js',
    '/ocr/por.traineddata.gz'
];

self.addEventListener('install', event => {
    console.log('[SW v1.8.0] Instalando e forçando ativação imediata...');
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
    console.log('[SW v1.8.0] Ativado. Limpando caches legados...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW v1.8.0] Removendo cache obsoleto:', key);
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

// Helper para armazenar temporariamente comprovantes compartilhados via Web Share Target
function salvarCompartilhamentoNoIDB(dados) {
    return new Promise((resolve, reject) => {
        try {
            const req = indexedDB.open('FinancasCompartilhamentoDB', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('comprovantes_temp')) {
                    db.createObjectStore('comprovantes_temp', { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('comprovantes_temp', 'readwrite');
                const store = tx.objectStore('comprovantes_temp');
                store.put({
                    id: 'ultimo',
                    file: dados.file || null,
                    title: dados.title || '',
                    text: dados.text || '',
                    timestamp: Date.now()
                });
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = (err) => { db.close(); reject(err); };
            };
            req.onerror = (err) => reject(err);
        } catch (err) {
            reject(err);
        }
    });
}

self.addEventListener('fetch', event => {
    const url = event.request.url;

    // 0. Web Share Target: intercepta comprovantes compartilhados diretamente do banco/celular
    if (event.request.method === 'POST' && url.includes('/compartilhar-comprovante')) {
        event.respondWith(
            (async () => {
                try {
                    const formData = await event.request.formData();
                    const file = formData.get('comprovante');
                    const title = formData.get('title') || '';
                    const text = formData.get('text') || '';
                    await salvarCompartilhamentoNoIDB({ file, title, text });
                } catch (e) {
                    console.error('[SW Share Target Error]', e);
                }
                return Response.redirect('/?comprovante_compartilhado=1', 303);
            })()
        );
        return;
    }

    // 1. APIs e controle de versão: SEMPRE direto na rede nativa (sem interceptação do Service Worker)
    if (url.includes('/api/') || url.includes('/version.json')) {
        return;
    }

    // 2. Navegação / HTML: CACHE-FIRST ULTRA RÁPIDO (Abertura instantânea da tela em 0ms)
    if (event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                const cachedPage = await cache.match('/index.html') || await cache.match('/') || await cache.match(event.request);

                // Se já tem no cache local, entrega INSTANTANEAMENTE (0ms)
                if (cachedPage) {
                    // Revalida silenciosamente em segundo plano para o próximo acesso
                    fetch(event.request).then(async netRes => {
                        if (netRes && netRes.status === 200) {
                            await cache.put('/index.html', netRes.clone());
                            await cache.put('/', netRes.clone());
                        }
                    }).catch(() => {});
                    return cachedPage;
                }

                // Primeiro acesso sem cache: busca na rede
                try {
                    const netRes = await fetch(event.request);
                    if (netRes && netRes.status === 200) {
                        await cache.put(event.request, netRes.clone());
                        await cache.put('/index.html', netRes.clone());
                        await cache.put('/', netRes.clone());
                        return netRes;
                    }
                } catch (netErr) {}

                return new Response('<!DOCTYPE html><html><body style="background:#0F172A;color:#fff;text-align:center;padding:40px;font-family:sans-serif;"><h2>Sem conexão com a internet</h2><p>Conecte-se para o primeiro acesso ao aplicativo.</p><button onclick="window.location.reload()" style="background:#2563EB;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;">Tentar Novamente</button></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            })()
        );
        return;
    }


    // 3. Recursos com versão explícita (?v=) ou scripts e estilos do app:
    // Network-First com cache fallback: se online busca imediatamente a versão atualizada da rede.
    // Se offline, serve instantaneamente do cache para manter 100% de funcionamento offline!
    const isVersionedAsset = url.includes('?v=') || url.includes('finance-') || url.includes('auth.js') || url.includes('auto-update.js');
    if (isVersionedAsset) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                try {
                    const netRes = await fetch(event.request, { cache: 'no-cache' });
                    if (netRes && netRes.status === 200) {
                        await cache.put(event.request, netRes.clone());
                        return netRes;
                    }
                } catch (netErr) {}

                let cachedResponse = await cache.match(event.request);
                if (!cachedResponse) {
                    cachedResponse = await cache.match(event.request, { ignoreSearch: true });
                }
                if (cachedResponse) return cachedResponse;

                return new Response('', { status: 404 });
            })()
        );
        return;
    }

    // 4. Demais recursos estáticos (Imagens, Fontes, Bibliotecas pesadas locais): CACHE-FIRST ULTRA RÁPIDO (0ms)
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            let cachedResponse = await cache.match(event.request);
            if (!cachedResponse) {
                cachedResponse = await cache.match(event.request, { ignoreSearch: true });
            }

            if (cachedResponse) {
                fetch(event.request).then(async netRes => {
                    if (netRes && netRes.status === 200) {
                        await cache.put(event.request, netRes.clone());
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            try {
                const netRes = await fetch(event.request);
                if (netRes && netRes.status === 200) {
                    await cache.put(event.request, netRes.clone());
                }
                return netRes;
            } catch (e) {
                return new Response('', { status: 404 });
            }
        })()
    );
});