// auto-update.js - Notificação e Aplicação Automática de Atualização Confiável

// Identifica a versão REAL atualmente executada e renderizada no navegador
function getCurrentRunningVersion() {
    const meta = document.querySelector('meta[name="app-build-version"]');
    if (meta && meta.content) return meta.content.trim();
    if (window.APP_BUILD_VERSION) return String(window.APP_BUILD_VERSION).trim();
    const stored = localStorage.getItem('app_current_version');
    if (stored) return stored.trim();
    return '1.8.45';
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

// Atualiza a badge no cabeçalho mantendo-a SEMPRE discreta e com apenas a última versão
function atualizarBadgeVersao(versao, temNovaVersao = false, novaVersao = '') {
    const badge = document.getElementById('badgeVersaoApp');
    const lbl = document.getElementById('lblVersaoApp');
    const dot = document.getElementById('dotStatusVersao');

    // Sempre mostra versão única e limpa (ex: v1.7.5), sem duplicidade
    const versaoExibir = (temNovaVersao && novaVersao) ? novaVersao : versao;
    if (lbl) {
        lbl.innerText = `v${versaoExibir}`;
    }

    if (badge) {
        if (temNovaVersao) {
            badge.classList.add('has-update');
            badge.title = `Nova versão v${novaVersao} disponível. Toque para atualizar.`;
        } else {
            badge.classList.remove('has-update');
            badge.title = `Versão v${versao} ativa. Toque para verificar atualizações.`;
        }
    }
}

function dismissUpdateBanner(version) {
    isUpdateBannerVisible = false;
    if (version) sessionStorage.setItem('banner_dismissed_' + version, 'true');
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

    // Trava anti-loop: se acabou de atualizar há menos de 15 segundos, aguarda estabilizar
    const lastApplied = parseInt(sessionStorage.getItem('update_applied_at') || '0', 10);
    if (!isManual && (Date.now() - lastApplied < 15000)) {
        return;
    }

    try {
        let serverVersion = null;
        // 1. Tenta /version.json diretamente (arquivo estático puro, ultra-rápido)
        try {
            const rStatic = await fetch('/version.json?t=' + Date.now());
            if (rStatic.ok) {
                const jStatic = await rStatic.json();
                if (jStatic && jStatic.version) serverVersion = jStatic.version.trim();
            }
        } catch (e1) {}

        // 2. Fallback para /api/version
        if (!serverVersion) {
            try {
                const rApi = await fetch('/api/version?t=' + Date.now());
                if (rApi.ok) {
                    const jApi = await rApi.json();
                    if (jApi && jApi.version) serverVersion = jApi.version.trim();
                }
            } catch (e2) {}
        }

        if (!serverVersion) return;

        const currentVersion = getCurrentRunningVersion();
        console.log(`[Auto-Update] Versão Renderizada: v${currentVersion} | Versão Servidor: v${serverVersion}`);

        if (isNewerVersion(serverVersion, currentVersion)) {
            // Sinaliza na badge do cabeçalho de forma discreta
            atualizarBadgeVersao(currentVersion, true, serverVersion);
            // Exibe o banner apenas se não foi dispensado nesta sessão e não está no processo de update
            const dismissed = sessionStorage.getItem('banner_dismissed_' + serverVersion);
            const updatingTo = sessionStorage.getItem('updating_to_' + serverVersion);
            if (isManual || (!dismissed && !updatingTo)) {
                showUpdateBanner(serverVersion, currentVersion);
            }
        } else {
            // Versão atualizada - sincroniza no storage e limpa banners
            localStorage.setItem('app_current_version', serverVersion);
            sessionStorage.removeItem('updating_to_' + currentVersion);
            sessionStorage.removeItem('banner_dismissed_' + currentVersion);
            sessionStorage.removeItem('updating_app');
            atualizarBadgeVersao(serverVersion, false);
            dismissUpdateBanner();
            if (isManual && typeof showToast === 'function') {
                showToast(`✅ Você já está utilizando a versão mais recente (v${serverVersion})!`);
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
    try {
        sessionStorage.clear();
    } catch (e) {}
    if (typeof showToast === 'function') {
        showToast('Verificando atualizações no servidor...');
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
    // ALINHAMENTO PERFEITO (NUNCA CORTA PELA METADE NO CELULAR)
    banner.style.position = 'fixed';
    banner.style.top = 'max(12px, env(safe-area-inset-top, 12px))';
    banner.style.left = '12px';
    banner.style.right = '12px';
    banner.style.margin = '0 auto';
    banner.style.maxWidth = '460px';
    banner.style.width = 'calc(100% - 24px)';
    banner.style.zIndex = '2147483647';
    banner.style.background = '#0F172A';
    banner.style.border = '2px solid #F59E0B';
    banner.style.borderRadius = '16px';
    banner.style.padding = '14px 16px';
    banner.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.95), 0 0 25px rgba(245, 158, 11, 0.45)';
    banner.style.color = '#FFFFFF';
    banner.style.boxSizing = 'border-box';

    banner.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <span style="font-size: 24px; line-height: 1;">⚡</span>
                <div>
                    <div style="font-size: 0.95rem; font-weight: 800; color: #FCD34D; display: flex; align-items: center; gap: 6px;">
                        <span>Nova Atualização Pronta!</span>
                        <span style="font-size: 0.72rem; background: #F59E0B; color: #0F172A; font-weight: 900; padding: 2px 7px; border-radius: 6px;">v${newVersion}</span>
                    </div>
                    <div style="font-size: 0.78rem; color: #CBD5E1; margin-top: 3px; line-height: 1.3;">
                        Toque no botão abaixo para carregar as novas melhorias.
                    </div>
                </div>
            </div>
            <button onclick="dismissUpdateBanner('${newVersion}')" title="Fechar" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #CBD5E1; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; cursor: pointer; flex-shrink: 0; line-height: 1;">
                ✕
            </button>
        </div>
        <div style="margin-top: 12px;">
            <button onclick="applyAppUpdate('${newVersion}')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; border-radius: 10px; font-weight: 800; font-size: 0.95rem; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>⚡</span> <span>Atualizar Agora</span>
            </button>
        </div>
    `;

    document.body.appendChild(banner);
}

// Aplicação atômica e limpa da atualização, sem necessidade de desinstalação
async function applyAppUpdate(newVersion) {
    sessionStorage.setItem('update_applied_at', String(Date.now()));
    if (newVersion) {
        localStorage.setItem('app_current_version', newVersion);
        sessionStorage.setItem('updating_to_' + newVersion, 'true');
        sessionStorage.setItem('banner_dismissed_' + newVersion, 'true');
        sessionStorage.setItem('just_updated', newVersion);
    }
    sessionStorage.setItem('updating_app', 'true');

    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.innerHTML = `
            <div style="text-align: center; padding: 14px; font-size: 0.95rem; color: #34D399; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>⚡</span> <span>Atualizando para v${newVersion || 'mais recente'}... Concluindo!</span>
            </div>
        `;
    }

    // 1. Desregistra Service Workers antigos para garantir download limpo dos arquivos novos
    if ('serviceWorker' in navigator) {
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (let reg of regs) {
                try {
                    if (reg.active) reg.active.postMessage({ action: 'clearAllCaches' });
                    if (reg.waiting) reg.waiting.postMessage({ action: 'skipWaiting' });
                    await reg.unregister();
                } catch (eSW) {}
            }
        } catch (e) {
            console.warn('[Auto-Update] Erro ao desregistrar SWs:', e);
        }
    }

    // 2. Limpa TODOS os caches de armazenamento offline
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[Auto-Update] Todos os caches de navegador foram limpos.');
        } catch (e) {
            console.warn('[Auto-Update] Erro ao limpar caches:', e);
        }
    }

    // 3. Força recarga imediata com bypass estrito de cache
    setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    }, 350);
}

// Função pública para forçar atualização e limpeza a qualquer momento
window.forcarRecargaLimpaApp = function() {
    if (confirm('Deseja recarregar o sistema e limpar todos os caches temporários para garantir a versão mais recente?')) {
        applyAppUpdate('recarregar');
    }
};

window.applyAppUpdate = applyAppUpdate;
window.dismissUpdateBanner = dismissUpdateBanner;
window.forcarAtualizacaoApp = () => applyAppUpdate();

// Remove registros legados de Service Worker que foram registrados com query string (?v=...)
async function limparServiceWorkersLegados() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
            const scriptURL = (reg.active || reg.installing || reg.waiting)?.scriptURL || '';
            if (scriptURL.includes('?v=')) {
                console.log('[Auto-Update] Desregistrando Service Worker legado com querystring:', scriptURL);
                await reg.unregister();
            }
        }
    } catch (e) {
        console.warn('[Auto-Update] Falha ao verificar registros legados:', e);
    }
}

// Inicia verificação imediata, limpezas e monitoramento do Service Worker
window.addEventListener('DOMContentLoaded', () => {
    // 0. Feedback de atualização bem-sucedida caso tenha acabado de atualizar
    try {
        const justUpdated = sessionStorage.getItem('just_updated');
        if (justUpdated) {
            sessionStorage.removeItem('just_updated');
            setTimeout(() => {
                if (typeof showToast === 'function') {
                    showToast(`✅ Aplicativo atualizado com sucesso para a versão v${justUpdated}!`);
                }
            }, 800);
        }
    } catch (e) {}

    // 0.1 Limpa query string de recarga (?reload=...) da barra de endereços
    if (window.location.search.includes('reload=') || window.location.search.includes('update=')) {
        try {
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
    }

    // 1. Limpa Service Workers com query strings legadas
    limparServiceWorkersLegados();

    // 2. Escuta mensagens e ativações do Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'SW_ACTIVATED') {
                console.log('[Auto-Update] Service Worker atualizado ativado:', event.data.version);
                checkAppVersion(false);
            }
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[Auto-Update] Novo controlador ativo detectado!');
            checkAppVersion(false);
        });
    }

    // 3. Inicializa a badge com a versão atual em execução
    atualizarBadgeVersao(getCurrentRunningVersion(), false);

    // 4. Checa versão no servidor logo no início
    setTimeout(() => checkAppVersion(false), 800);

    // 5. Checa a cada 5 minutos (evita sobrecarga e popups repetitivos)
    setInterval(() => checkAppVersion(false), 300000);

    // 6. Checa ao retornar à aba / focar
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
