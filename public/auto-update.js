// auto-update.js - Notificação e Aplicação Automática de Atualização

function getCurrentRunningVersion() {
    const meta = document.querySelector('meta[name="app-build-version"]');
    if (meta && meta.content) return meta.content.trim();
    return localStorage.getItem('app_installed_version') || '1.3.5';
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

function atualizarBadgeVersao(versao, temNovaVersao = false, novaVersao = '') {
    const badge = document.getElementById('badgeVersaoApp');
    const lbl = document.getElementById('lblVersaoApp');
    const dot = document.getElementById('dotStatusVersao');

    if (lbl) {
        if (temNovaVersao && novaVersao) {
            lbl.innerText = `v${versao} ⚡ v${novaVersao}`;
        } else {
            lbl.innerText = `v${versao}`;
        }
    }

    if (badge) {
        if (temNovaVersao) {
            badge.classList.add('has-update');
            badge.title = `⚡ Nova versão v${novaVersao} disponível! Clique para baixar e atualizar agora.`;
        } else {
            badge.classList.remove('has-update');
            badge.title = `Versão v${versao} ativa. Clique para verificar atualizações do sistema.`;
        }
    }
}

function dismissUpdateBanner(version) {
    isUpdateBannerVisible = false;
    const banner = document.getElementById('update-notification-banner');
    if (banner) banner.remove();
}

async function checkAppVersion(isManual = false) {
    if (!navigator.onLine) {
        if (isManual && typeof showToast === 'function') {
            showToast('Sem conexão com a internet para checar atualizações.');
        }
        return;
    }

    try {
        const response = await fetch('/api/version?t=' + Date.now(), { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!response.ok) return;

        const data = await response.json();
        const serverVersion = (data.version || '').trim();
        const currentVersion = getCurrentRunningVersion();

        console.log(`[Auto-Update] Versão Atual: ${currentVersion} | Versão Servidor: ${serverVersion}`);

        if (isNewerVersion(serverVersion, currentVersion)) {
            // Sinaliza na badge do cabeçalho
            atualizarBadgeVersao(currentVersion, true, serverVersion);
            // Exibe o banner chamativo para baixar a atualização
            showUpdateBanner(serverVersion, currentVersion);
        } else {
            // Versão atualizada
            atualizarBadgeVersao(currentVersion, false);
            dismissUpdateBanner();
            if (isManual && typeof showToast === 'function') {
                showToast(`✅ Você já está utilizando a versão mais recente (v${currentVersion})!`);
            }
        }
    } catch (error) {
        console.warn('[Auto-Update] Verificação de versão indisponível:', error);
        if (isManual && typeof showToast === 'function') {
            showToast('Não foi possível verificar atualizações no momento.');
        }
    }
}

// Verificação manual disparada ao clicar na badge da versão
window.verificarAtualizacaoManual = function() {
    if (typeof showToast === 'function') {
        showToast('Verificando se há novas atualizações...');
    }
    checkAppVersion(true);
};

function showUpdateBanner(newVersion, currentVersion) {
    if (isUpdateBannerVisible && document.getElementById('update-notification-banner')) return;

    isUpdateBannerVisible = true;

    // Remove qualquer banner anterior
    const oldBanner = document.getElementById('update-notification-banner');
    if (oldBanner) oldBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'update-notification-banner';
    banner.style.position = 'fixed';
    banner.style.top = '12px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '999999';
    banner.style.width = 'calc(100% - 20px)';
    banner.style.maxWidth = '480px';
    banner.style.background = '#0F172A';
    banner.style.border = '2px solid #F59E0B';
    banner.style.borderRadius = '16px';
    banner.style.padding = '14px 18px';
    banner.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.9), 0 0 30px rgba(245, 158, 11, 0.45)';
    banner.style.color = '#FFFFFF';
    banner.style.boxSizing = 'border-box';
    banner.style.animation = 'pulseBadge 2.5s infinite ease-in-out';

    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px;">
                <span style="font-size: 26px;">🚀</span>
                <div>
                    <div style="font-size: 0.96rem; font-weight: 800; color: #FCD34D; display: flex; align-items: center; gap: 6px;">
                        <span>Nova Atualização Pronta!</span>
                        <span style="font-size: 0.72rem; background: #F59E0B; color: #0F172A; font-weight: 900; padding: 2px 7px; border-radius: 6px;">v${newVersion}</span>
                    </div>
                    <div style="font-size: 0.78rem; color: #CBD5E1; margin-top: 3px;">
                        Novas melhorias publicadas no sistema. Clique abaixo para aplicar:
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="applyAppUpdate('${newVersion}')" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 800; font-size: 0.88rem; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.5); display: flex; align-items: center; gap: 5px;">
                    <span>⚡</span> <span>Baixar Atualização</span>
                </button>
                <button onclick="dismissUpdateBanner('${newVersion}')" title="Fechar por enquanto" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #94A3B8; font-size: 1.1rem; cursor: pointer; padding: 7px 10px; border-radius: 8px; line-height: 1;">
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
            <div style="text-align: center; padding: 14px; font-size: 0.95rem; color: #34D399; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>⚡</span> <span>Baixando e instalando v${newVersion || ''}... Recarregando sistema!</span>
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
    }, 500);
}

window.applyAppUpdate = applyAppUpdate;
window.dismissUpdateBanner = dismissUpdateBanner;
window.forcarAtualizacaoApp = () => applyAppUpdate();

// Inicia verificação imediata e periódica
window.addEventListener('DOMContentLoaded', () => {
    // Inicializa a badge com a versão atual em execução
    atualizarBadgeVersao(getCurrentRunningVersion(), false);

    // Checa versão no servidor logo no início
    setTimeout(() => checkAppVersion(false), 800);

    // Checa a cada 10 segundos
    setInterval(() => checkAppVersion(false), 10000);

    // Checa ao retornar à aba / focar
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAppVersion(false);
        }
    });

    window.addEventListener('focus', () => {
        checkAppVersion(false);
    });

    window.addEventListener('online', () => {
        checkAppVersion(false);
    });
});
