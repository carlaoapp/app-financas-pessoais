// auto-update.js - Notificação Automática de Atualização no Celular e Computador

const DEFAULT_BASE_VERSION = '1.0.6';

function getInstalledVersion() {
    return localStorage.getItem('app_installed_version') || DEFAULT_BASE_VERSION;
}

function setInstalledVersion(ver) {
    localStorage.setItem('app_installed_version', ver);
}

let isUpdateBannerVisible = false;

async function checkAppVersion() {
    if (!navigator.onLine) return;

    // Se estiver na tela de login/entrada, NÃO exibir o pop-up para não atrapalhar
    const authView = document.getElementById('view-auth');
    if (authView && authView.style.display !== 'none') {
        return;
    }

    try {
        const response = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = data.version;
        const currentVersion = getInstalledVersion();

        // Se o usuário dispensou nesta sessão, respeita
        if (sessionStorage.getItem('dismissed_update_' + serverVersion) === 'true') {
            return;
        }

        if (serverVersion && serverVersion !== currentVersion) {
            console.log(`[Auto-Update] Nova versão detectada: ${serverVersion} (Instalada: ${currentVersion})`);
            showUpdateBanner(serverVersion);
        }
    } catch (error) {
        console.warn('[Auto-Update] Verificação indisponível:', error);
    }
}

function showUpdateBanner(newVersion) {
    if (isUpdateBannerVisible) return;
    if (document.getElementById('update-notification-banner')) return;

    isUpdateBannerVisible = true;

    const banner = document.createElement('div');
    banner.id = 'update-notification-banner';
    banner.style.position = 'fixed';
    banner.style.top = '14px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '99999';
    banner.style.width = 'calc(100% - 24px)';
    banner.style.maxWidth = '460px';
    banner.style.background = 'rgba(15, 23, 42, 0.95)';
    banner.style.backdropFilter = 'blur(16px)';
    banner.style.webkitBackdropFilter = 'blur(16px)';
    banner.style.border = '1px solid rgba(59, 130, 246, 0.6)';
    banner.style.borderRadius = '14px';
    banner.style.padding = '12px 16px';
    banner.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(37, 99, 235, 0.25)';
    banner.style.color = '#FFFFFF';
    banner.style.animation = 'slideDownUpdate 0.3s ease-out';

    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🚀</span>
                <div>
                    <div style="font-size: 0.88rem; font-weight: 700; color: #60A5FA; display: flex; align-items: center; gap: 6px;">
                        <span>Nova Atualização</span>
                        <span style="font-size: 0.7rem; background: rgba(59, 130, 246, 0.25); color: #93C5FD; padding: 1px 6px; border-radius: 8px;">v${newVersion}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #94A3B8;">Melhorias e novo visual prontos.</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <button onclick="applyAppUpdate('${newVersion}')" style="background: linear-gradient(135deg, #2563EB, #10B981); color: white; border: none; padding: 7px 12px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap;">
                    Atualizar
                </button>
                <button onclick="dismissUpdateBanner('${newVersion}')" style="background: transparent; color: #64748B; border: none; padding: 6px; font-size: 1rem; cursor: pointer;">
                    ✕
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(banner);
}

function dismissUpdateBanner(version) {
    if (version) {
        sessionStorage.setItem('dismissed_update_' + version, 'true');
    }
    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.2s ease';
        setTimeout(() => banner.remove(), 200);
    }
    isUpdateBannerVisible = false;
}

async function applyAppUpdate(newVersion) {
    if (newVersion) {
        setInstalledVersion(newVersion);
    }

    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.innerHTML = `
            <div style="text-align: center; padding: 8px; font-size: 0.85rem; color: #34D399; font-weight: 700;">
                ⚡ Atualizando aplicativo, aguarde um instante...
            </div>
        `;
    }

    // Limpa caches do Service Worker
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {}
    }

    // Atualiza registrations
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                await reg.update();
            }
        } catch (e) {}
    }

    setTimeout(() => {
        window.location.reload(true);
    }, 400);
}

// Inicia verificação automática
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkAppVersion, 2500);
    setInterval(checkAppVersion, 35000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAppVersion();
        }
    });
});
