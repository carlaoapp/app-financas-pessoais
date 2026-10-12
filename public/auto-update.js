// auto-update.js - Notificação e Aplicação Automática de Atualização

function getCurrentRunningVersion() {
    const meta = document.querySelector('meta[name="app-build-version"]');
    if (meta && meta.content) return meta.content.trim();
    return localStorage.getItem('app_installed_version') || '1.1.4';
}

let isUpdateBannerVisible = false;

async function checkAppVersion() {
    if (!navigator.onLine) return;

    try {
        const response = await fetch('/api/version?t=' + Date.now(), { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = (data.version || '').trim();
        const currentVersion = getCurrentRunningVersion();

        console.log(`[Auto-Update] Versão na tela: ${currentVersion} | Versão no Servidor: ${serverVersion}`);

        if (serverVersion && serverVersion !== currentVersion) {
            console.log(`[Auto-Update] Nova versão disponível: ${serverVersion}! Exibindo notificação...`);
            showUpdateBanner(serverVersion);
        }
    } catch (error) {
        console.warn('[Auto-Update] Verificação de versão indisponível:', error);
    }
}

function showUpdateBanner(newVersion) {
    if (isUpdateBannerVisible) return;
    if (document.getElementById('update-notification-banner')) return;

    isUpdateBannerVisible = true;

    const banner = document.createElement('div');
    banner.id = 'update-notification-banner';
    banner.style.position = 'fixed';
    banner.style.top = '12px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '999999';
    banner.style.width = 'calc(100% - 24px)';
    banner.style.maxWidth = '460px';
    banner.style.background = '#0F172A';
    banner.style.border = '2px solid #3B82F6';
    banner.style.borderRadius = '16px';
    banner.style.padding = '14px 18px';
    banner.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 25px rgba(37, 99, 235, 0.4)';
    banner.style.color = '#FFFFFF';
    banner.style.boxSizing = 'border-box';

    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🚀</span>
                <div>
                    <div style="font-size: 0.95rem; font-weight: 800; color: #60A5FA; display: flex; align-items: center; gap: 6px;">
                        <span>Atualização Pronta</span>
                        <span style="font-size: 0.72rem; background: #2563EB; color: white; padding: 2px 7px; border-radius: 6px;">v${newVersion}</span>
                    </div>
                    <div style="font-size: 0.78rem; color: #CBD5E1; margin-top: 2px;">Novo visual limpo e melhorias disponíveis!</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <button onclick="applyAppUpdate('${newVersion}')" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 9px 14px; border-radius: 9px; font-weight: 800; font-size: 0.85rem; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
                    Atualizar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);
}

async function applyAppUpdate(newVersion) {
    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.innerHTML = `
            <div style="text-align: center; padding: 10px; font-size: 0.9rem; color: #34D399; font-weight: 800;">
                ⚡ Atualizando para v${newVersion || ''}... Aguarde 1 segundo.
            </div>
        `;
    }

    if (newVersion) {
        localStorage.setItem('app_installed_version', newVersion);
    }

    // 1. Limpa TODOS os caches do Service Worker
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[Auto-Update] Caches limpos com sucesso.');
        } catch (e) {
            console.warn('[Auto-Update] Erro ao limpar caches:', e);
        }
    }

    // 2. Desregistra e atualiza os Service Workers para obter código 100% novo
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                await reg.unregister();
            }
            console.log('[Auto-Update] Service workers desregistrados.');
        } catch (e) {
            console.warn('[Auto-Update] Erro ao desregistrar SW:', e);
        }
    }

    // 3. Recarrega a página forçando bypass de cache
    setTimeout(() => {
        window.location.href = window.location.pathname + '?refresh=' + Date.now();
    }, 300);
}

window.applyAppUpdate = applyAppUpdate;
window.forcarAtualizacaoApp = () => applyAppUpdate();

// Escuta notificação direta do Service Worker quando um novo SW é ativado
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SW_UPDATED') {
            console.log('[Auto-Update] Mensagem do SW: Nova versão detectada! Exibindo banner...');
            showUpdateBanner(event.data.version || '1.1.2');
        }
    });
}

// Inicia verificação imediata e periódica
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkAppVersion, 800);
    setInterval(checkAppVersion, 15000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAppVersion();
        }
    });
});
