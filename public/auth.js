// auth.js - Sistema de Autenticação do APP Finanças Pessoais

const AUTH_TOKEN_KEY = 'financas_auth_token';
const AUTH_USER_KEY = 'financas_auth_user';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthUser() {
    const str = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    if (!str) return null;
    try { return JSON.parse(str); } catch (e) { return null; }
}

function saveAuthSession(token, user, remember = true) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_KEY, token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
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
    }
    if (btnUser) {
        btnUser.style.display = user ? 'flex' : 'none';
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
            errorBox.innerText = 'Erro ao conectar ao servidor. Verifique sua conexão e tente novamente.';
            errorBox.style.display = 'block';
        }
    }
}

// Checar sessão ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    // Remove qualquer resquício antigo de modo offline
    localStorage.removeItem('financas_auth_offline_mode');
    
    const user = getAuthUser();
    if (user) {
        hideAuthScreen();
    } else {
        showAuthScreen();
    }
});

// ==========================================
// RECUPERAÇÃO DE SENHA (ESQUECI A SENHA)
// ==========================================
function abrirModalEsqueciSenha() {
    const modal = document.getElementById('modalEsqueciSenha');
    const authEmail = document.getElementById('auth-email');
    const esqueciEmail = document.getElementById('esqueci-email');
    const alerta = document.getElementById('esqueci-alerta-msg');

    if (alerta) alerta.style.display = 'none';
    if (authEmail && esqueciEmail && authEmail.value) {
        esqueciEmail.value = authEmail.value.trim();
    }
    voltarPasso1Esqueci();
    if (modal) modal.style.display = 'flex';
}

function fecharModalEsqueciSenha() {
    const modal = document.getElementById('modalEsqueciSenha');
    if (modal) modal.style.display = 'none';
}

function voltarPasso1Esqueci() {
    const passo1 = document.getElementById('esqueci-passo-1');
    const passo2 = document.getElementById('esqueci-passo-2');
    const desc = document.getElementById('esqueciPassoDesc');
    const alerta = document.getElementById('esqueci-alerta-msg');

    if (passo1) passo1.style.display = 'block';
    if (passo2) passo2.style.display = 'none';
    if (desc) desc.innerText = 'Informe seu e-mail cadastrado para enviarmos um código de verificação.';
    if (alerta) alerta.style.display = 'none';
}

async function solicitarCodigoRecuperacao() {
    const emailInput = document.getElementById('esqueci-email');
    const btn = document.getElementById('btn-enviar-codigo');
    const alerta = document.getElementById('esqueci-alerta-msg');
    const passo1 = document.getElementById('esqueci-passo-1');
    const passo2 = document.getElementById('esqueci-passo-2');
    const desc = document.getElementById('esqueciPassoDesc');
    const codigoInput = document.getElementById('esqueci-codigo');

    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
        if (alerta) {
            alerta.style.display = 'block';
            alerta.style.background = 'rgba(239, 68, 68, 0.15)';
            alerta.style.color = '#FCA5A5';
            alerta.style.border = '1px solid #EF4444';
            alerta.innerText = 'Por favor, digite seu e-mail cadastrado.';
        }
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = 'Enviando...';

        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerText = 'Enviar Código de Recuperação';

        if (!res.ok || data.error) {
            if (alerta) {
                alerta.style.display = 'block';
                alerta.style.background = 'rgba(239, 68, 68, 0.15)';
                alerta.style.color = '#FCA5A5';
                alerta.style.border = '1px solid #EF4444';
                alerta.innerText = data.error || 'Não foi possível encontrar este e-mail.';
            }
            return;
        }

        // Sucesso: avançar para passo 2
        if (passo1) passo1.style.display = 'none';
        if (passo2) passo2.style.display = 'block';
        if (desc) desc.innerText = `Digite o código enviado para ${email} e defina sua nova senha.`;

        if (alerta) {
            alerta.style.display = 'block';
            alerta.style.background = 'rgba(16, 185, 129, 0.15)';
            alerta.style.color = '#6EE7B7';
            alerta.style.border = '1px solid #10B981';
            alerta.innerText = data.message || 'Código gerado com sucesso!';
        }

        if (data.codePreview && codigoInput) {
            codigoInput.value = data.codePreview;
        }
    } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Enviar Código de Recuperação';
        if (alerta) {
            alerta.style.display = 'block';
            alerta.style.background = 'rgba(239, 68, 68, 0.15)';
            alerta.style.color = '#FCA5A5';
            alerta.style.border = '1px solid #EF4444';
            alerta.innerText = 'Erro ao conectar ao servidor. Tente novamente.';
        }
    }
}

async function confirmarNovaSenha() {
    const emailInput = document.getElementById('esqueci-email');
    const codigoInput = document.getElementById('esqueci-codigo');
    const senhaInput = document.getElementById('esqueci-nova-senha');
    const btn = document.getElementById('btn-salvar-senha');
    const alerta = document.getElementById('esqueci-alerta-msg');

    const email = emailInput ? emailInput.value.trim() : '';
    const code = codigoInput ? codigoInput.value.trim() : '';
    const newPassword = senhaInput ? senhaInput.value : '';

    if (!code || !newPassword) {
        if (alerta) {
            alerta.style.display = 'block';
            alerta.style.background = 'rgba(239, 68, 68, 0.15)';
            alerta.style.color = '#FCA5A5';
            alerta.style.border = '1px solid #EF4444';
            alerta.innerText = 'Preencha o código de verificação e a nova senha.';
        }
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = 'Salvando...';

        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerText = 'Salvar Nova Senha';

        if (!res.ok || data.error) {
            if (alerta) {
                alerta.style.display = 'block';
                alerta.style.background = 'rgba(239, 68, 68, 0.15)';
                alerta.style.color = '#FCA5A5';
                alerta.style.border = '1px solid #EF4444';
                alerta.innerText = data.error || 'Código incorreto ou expirado.';
            }
            return;
        }

        // Sucesso!
        if (alerta) {
            alerta.style.display = 'block';
            alerta.style.background = 'rgba(16, 185, 129, 0.15)';
            alerta.style.color = '#6EE7B7';
            alerta.style.border = '1px solid #10B981';
            alerta.innerText = '✅ Senha alterada com sucesso! Redirecionando para login...';
        }

        // Preenche o formulário de login com a nova senha e e-mail
        const authEmail = document.getElementById('auth-email');
        const authPassword = document.getElementById('auth-password');
        if (authEmail) authEmail.value = email;
        if (authPassword) authPassword.value = newPassword;

        setTimeout(() => {
            fecharModalEsqueciSenha();
            if (typeof showToast === 'function') {
                showToast('Senha atualizada com sucesso! Você já pode entrar.');
            }
        }, 1500);

    } catch (err) {
        btn.disabled = false;
        btn.innerText = 'Salvar Nova Senha';
        if (alerta) {
            alerta.style.display = 'block';
            alerta.style.background = 'rgba(239, 68, 68, 0.15)';
            alerta.style.color = '#FCA5A5';
            alerta.style.border = '1px solid #EF4444';
            alerta.innerText = 'Erro ao salvar nova senha. Tente novamente.';
        }
    }
}
