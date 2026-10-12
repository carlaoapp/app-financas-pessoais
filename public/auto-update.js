// auto-update.js - Notificação e Aplicação Automática de Atualização

function getCurrentRunningVersion() {
    const meta = document.querySelector('meta[name="app-build-version"]');
    if (meta && meta.content) return meta.content.trim();
    return localStorage.getItem('app_installed_version') || '1.1.9';
}

function isNewerVersion(serverVer, currentVer) {
    if (!serverVer || !currentVer) return false;
    if (serverVer === currentVer) return false;

    const sParts = serverVer.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
    const cParts = currentVer.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(sParts.length, cParts.length); i++) {
        const s = sParts[i] || 0;
        const c = cParts[i] || 0;
        if (s > c) return true;
        if (s < c) return false;
    }
    return false;
}

let isUpdateBannerVisible = false;

function dismissUpdateBanner(version) {
    isUpdateBannerVisible = false;
    if (version) {
        sessionStorage.setItem('dismissed_update_' + version, 'true');
    }
    const banner = document.getElementById('update-notification-banner');
    if (banner) banner.remove();
}

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

        console.log(`[Auto-Update] Versão Atual: ${currentVersion} | Versão Servidor: ${serverVersion}`);

        // Apenas exibe notificação se a versão do servidor for estritamente MAIOR
        if (isNewerVersion(serverVersion, currentVersion)) {
            // Se o usuário dispensou o alerta para esta versão nesta sessão, não incomoda
            if (sessionStorage.getItem('dismissed_update_' + serverVersion) === 'true') {
                return;
            }
            if (sessionStorage.getItem('just_updated_to') === serverVersion) {
                return;
            }
            showUpdateBanner(serverVersion);
        } else {
            // Se já está na versão igual ou mais nova, remove qualquer banner pendente
            dismissUpdateBanner();
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
                <button onclick="dismissUpdateBanner('${newVersion}')" title="Dispensar aviso" style="background: transparent; border: none; color: #94A3B8; font-size: 1.2rem; cursor: pointer; padding: 4px 6px; line-height: 1;">
                    ✕
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);
}

async function applyAppUpdate(newVersion) {
    if (newVersion) {
        sessionStorage.setItem('just_updated_to', newVersion);
        localStorage.setItem('app_installed_version', newVersion);
    }

    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.innerHTML = `
            <div style="text-align: center; padding: 12px; font-size: 0.9rem; color: #34D399; font-weight: 800;">
                ⚡ Atualizando para v${newVersion || ''}... Recarregando aplicativo.
            </div>
        `;
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

    // 2. Desregistra os Service Workers antigos
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
        window.location.replace(window.location.origin + window.location.pathname + '?v=' + Date.now());
    }, 400);
}

window.applyAppUpdate = applyAppUpdate;
window.dismissUpdateBanner = dismissUpdateBanner;
window.forcarAtualizacaoApp = () => applyAppUpdate();

// Inicia verificação imediata e periódica
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkAppVersion, 1000);
    setInterval(checkAppVersion, 30000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAppVersion();
        }
    });
});
