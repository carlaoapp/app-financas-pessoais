// auto-update.js - Notificação Automática de Atualização no Celular e Computador

const CURRENT_APP_VERSION = '1.0.0';

let isUpdateBannerVisible = false;

async function checkAppVersion() {
    if (!navigator.onLine) return;
    
    try {
        const response = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = data.version;

        if (serverVersion && serverVersion !== CURRENT_APP_VERSION) {
            console.log(`[Auto-Update] Nova versão detectada: ${serverVersion} (Atual: ${CURRENT_APP_VERSION})`);
            showUpdateBanner(serverVersion);
        }
    } catch (error) {
        console.warn('[Auto-Update] Verificação temporariamente indisponível:', error);
    }
}

function showUpdateBanner(newVersion) {
    if (isUpdateBannerVisible) return;
    if (document.getElementById('update-notification-banner')) return;

    isUpdateBannerVisible = true;

    const banner = document.createElement('div');
    banner.id = 'update-notification-banner';
    banner.style.position = 'fixed';
    banner.style.bottom = '24px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '999999';
    banner.style.width = 'calc(100% - 32px)';
    banner.style.maxWidth = '460px';
    banner.style.background = 'linear-gradient(135deg, #1E1B4B, #0F172A)';
    banner.style.border = '2px solid #3B82F6';
    banner.style.borderRadius = '18px';
    banner.style.padding = '16px 20px';
    banner.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(59, 130, 246, 0.4)';
    banner.style.color = '#FFFFFF';
    banner.style.animation = 'slideUpUpdate 0.4s ease-out';

    banner.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="font-size: 28px; line-height: 1;">🚀</div>
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <strong style="font-size: 1rem; color: #60A5FA;">Nova Versão Disponível!</strong>
                    <span style="font-size: 0.75rem; background: rgba(59, 130, 246, 0.2); color: #93C5FD; padding: 2px 8px; border-radius: 10px; font-weight: 700;">v${newVersion}</span>
                </div>
                <p style="font-size: 0.85rem; color: #CBD5E1; margin: 6px 0 12px 0; line-height: 1.4;">
                    Uma nova atualização do Finanças Pessoais está pronta. Clique abaixo para atualizar agora.
                </p>
                <div style="display: flex; gap: 10px;">
                    <button onclick="applyAppUpdate()" style="flex: 2; background: linear-gradient(135deg, #2563EB, #10B981); color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>⚡ Atualizar App Agora</span>
                    </button>
                    <button onclick="dismissUpdateBanner()" style="flex: 1; background: #334155; color: #94A3B8; border: none; padding: 10px 12px; border-radius: 10px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                        Depois
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(banner);
}

function dismissUpdateBanner() {
    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.3s ease';
        setTimeout(() => banner.remove(), 300);
    }
}

async function applyAppUpdate() {
    const btn = event ? event.target : null;
    if (btn) btn.innerText = 'Atualizando...';

    // Limpa caches do Service Worker
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {}
    }

    // Força atualização do Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                await reg.update();
            }
        } catch (e) {}
    }

    // Recarrega a página com a nova versão
    setTimeout(() => {
        window.location.reload(true);
    }, 400);
}

// Inicia verificação automática
window.addEventListener('DOMContentLoaded', () => {
    // Verifica logo após carregar
    setTimeout(checkAppVersion, 2000);

    // Verifica a cada 30 segundos
    setInterval(checkAppVersion, 30000);

    // Verifica quando o usuário volta para o app (celular ou navegador)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAppVersion();
        }
    });
    window.addEventListener('focus', checkAppVersion);
});
