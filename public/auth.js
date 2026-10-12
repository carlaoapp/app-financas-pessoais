// auth.js - Sistema de Autenticação do APP Finanças Pessoais

const AUTH_TOKEN_KEY = 'financas_auth_token';
const AUTH_USER_KEY = 'financas_auth_user';
const AUTH_OFFLINE_KEY = 'financas_auth_offline_mode';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthUser() {
    const str = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    if (!str) return null;
    try { return JSON.parse(str); } catch (e) { return null; }
}

function isOfflineMode() {
    return localStorage.getItem(AUTH_OFFLINE_KEY) === 'true';
}

function saveAuthSession(token, user, remember = true) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_KEY, token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(AUTH_OFFLINE_KEY);
}

function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_OFFLINE_KEY);
    showAuthScreen();
}

function showAuthScreen() {
    const viewAuth = document.getElementById('view-auth');
    const viewApp = document.getElementById('view-app');
    if (viewAuth) viewAuth.style.display = 'flex';
    if (viewApp) viewApp.style.display = 'none';

    // Oculta qualquer banner de notificação para não poluir a entrada
    const banner = document.getElementById('update-notification-banner');
    if (banner) banner.style.display = 'none';
}

function hideAuthScreen() {
    const viewAuth = document.getElementById('view-auth');
    const viewApp = document.getElementById('view-app');
    if (viewAuth) viewAuth.style.display = 'none';
    if (viewApp) viewApp.style.display = 'block';

    updateUserHeader();
    if (typeof carregarPlanejamento === 'function') {
        carregarPlanejamento();
    }
}

function updateUserHeader() {
    const user = getAuthUser();
    const lblUser = document.getElementById('lblCurrentUserName');
    const btnUser = document.getElementById('btnUserProfile');
    if (user && lblUser) {
        lblUser.innerText = user.name || user.email.split('@')[0];
        if (btnUser) btnUser.style.display = 'flex';
    } else if (isOfflineMode() && lblUser) {
        lblUser.innerText = 'Modo Local';
        if (btnUser) btnUser.style.display = 'flex';
    }
}

// Alternar abas Entrar vs Criar Conta
let currentAuthTab = 'login';
function switchAuthTab(tab) {
    currentAuthTab = tab;
    const btnLog = document.getElementById('tab-auth-login');
    const btnReg = document.getElementById('tab-auth-register');
    const fieldNome = document.getElementById('auth-name-container');
    const btnSubmit = document.getElementById('auth-submit-btn');
    const errorBox = document.getElementById('auth-error-msg');
    if (errorBox) errorBox.style.display = 'none';

    if (tab === 'login') {
        if (btnLog) {
            btnLog.style.background = '#2563EB';
            btnLog.style.color = '#FFFFFF';
        }
        if (btnReg) {
            btnReg.style.background = 'transparent';
            btnReg.style.color = '#94A3B8';
        }
        if (fieldNome) fieldNome.style.display = 'none';
        if (btnSubmit) btnSubmit.innerText = 'Entrar no Finanças';
    } else {
        if (btnReg) {
            btnReg.style.background = '#10B981';
            btnReg.style.color = '#FFFFFF';
        }
        if (btnLog) {
            btnLog.style.background = 'transparent';
            btnLog.style.color = '#94A3B8';
        }
        if (fieldNome) fieldNome.style.display = 'block';
        if (btnSubmit) btnSubmit.innerText = 'Criar Minha Conta';
    }
}

function toggleAuthPassword() {
    const input = document.getElementById('auth-password');
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

async function handleAuthSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name') ? document.getElementById('auth-name').value.trim() : '';
    const remember = document.getElementById('auth-remember') ? document.getElementById('auth-remember').checked : true;
    const errorBox = document.getElementById('auth-error-msg');
    const btnSubmit = document.getElementById('auth-submit-btn');

    if (!email || !password) {
        if (errorBox) {
            errorBox.innerText = 'Por favor, preencha todos os campos obrigatórios.';
            errorBox.style.display = 'block';
        }
        return;
    }

    const endpoint = currentAuthTab === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = currentAuthTab === 'register' ? { name, email, password } : { email, password };

    try {
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Processando...';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        btnSubmit.disabled = false;
        btnSubmit.innerText = currentAuthTab === 'register' ? 'Criar Minha Conta' : 'Entrar no Finanças';

        if (!res.ok || data.error) {
            if (errorBox) {
                errorBox.innerText = data.error || 'Falha ao autenticar.';
                errorBox.style.display = 'block';
            }
            return;
        }

        saveAuthSession(data.token, data.user, remember);
        hideAuthScreen();
        if (typeof showToast === 'function') {
            showToast('Bem-vindo, ' + (data.user.name || 'ao Finanças Pessoais!'));
        }
        if (typeof forceSync === 'function') {
            forceSync();
        }
    } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = currentAuthTab === 'register' ? 'Criar Minha Conta' : 'Entrar no Finanças';
        if (errorBox) {
            errorBox.innerText = 'Erro ao conectar ao servidor. Você pode entrar em Modo Offline.';
            errorBox.style.display = 'block';
        }
    }
}

function enterOfflineMode() {
    localStorage.setItem(AUTH_OFFLINE_KEY, 'true');
    hideAuthScreen();
    if (typeof showToast === 'function') {
        showToast('Modo Local / Offline ativado!');
    }
}

// Checar sessão ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const user = getAuthUser();
    const offline = isOfflineMode();
    if (user || offline) {
        hideAuthScreen();
    } else {
        showAuthScreen();
    }
});
