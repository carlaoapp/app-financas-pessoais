const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Carregamento automatico de variaveis de ambiente de arquivo .env (caso exista)
const envFilePath = path.join(__dirname, '.env');
if (fs.existsSync(envFilePath)) {
    if (typeof process.loadEnvFile === 'function') {
        try {
            process.loadEnvFile(envFilePath);
        } catch (e) {
            console.warn('[ENV] Aviso ao carregar .env:', e.message);
        }
    } else {
        try {
            const envContent = fs.readFileSync(envFilePath, 'utf8');
            envContent.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const eqIdx = trimmed.indexOf('=');
                    if (eqIdx > 0) {
                        const key = trimmed.slice(0, eqIdx).trim();
                        let val = trimmed.slice(eqIdx + 1).trim();
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.slice(1, -1);
                        }
                        if (process.env[key] === undefined) {
                            process.env[key] = val;
                        }
                    }
                }
            });
        } catch (e) {
            console.warn('[ENV] Falha no fallback manual do .env:', e.message);
        }
    }
}

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Previne cache em navegadores, PWA e CDN Cloudflare para garantir que atualizacoes cheguem instantaneamente
app.use((req, res, next) => {
    // Headers universais anti-cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Headers especificos para Cloudflare CDN e Proxies
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');

    if (req.path === '/sw.js') {
        res.setHeader('Service-Worker-Allowed', '/');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    lastModified: false,
    maxAge: 0
}));

// Status da API e Health Check (Anti-Sleep do Render e Monitoramento)
app.get(['/api/status', '/api/health', '/api/ping', '/health', '/ping'], (req, res) => {
    res.json({
        status: 'online',
        app: 'Finanças Pessoais',
        keep_alive: true,
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now()
    });
});

// Versão do Aplicativo (Auto-Update)
app.get('/api/version', (req, res) => {
    try {
        const verPath = path.join(__dirname, 'public', 'version.json');
        if (fs.existsSync(verPath)) {
            const data = JSON.parse(fs.readFileSync(verPath, 'utf8'));
            return res.json(data);
        }
    } catch (e) {}
    res.json({ version: '1.0.0', updatedAt: Date.now() });
});

const crypto = require('crypto');
function hashPassword(pwd) {
    return crypto.createHash('sha256').update(pwd + 'financas_salt').digest('hex');
}

// Autenticação: Registrar Novo Usuário
app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const userId = 'usr_' + Date.now();
    const pwdHash = hashPassword(password);
    const createdAt = Date.now();
    const userName = name || email.split('@')[0];

    db.run(
        'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, userName, email.toLowerCase().trim(), pwdHash, createdAt],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Este e-mail já está cadastrado. Faça login.' });
                }
                return res.status(500).json({ error: err.message });
            }

            const token = 'token_' + Buffer.from(userId + ':' + createdAt).toString('base64');
            res.json({
                success: true,
                token,
                user: { id: userId, name: userName, email: email.toLowerCase().trim() }
            });
        }
    );
});

// Autenticação: Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const pwdHash = hashPassword(password);
    db.get(
        'SELECT id, name, email FROM users WHERE email = ? AND password = ?',
        [email.toLowerCase().trim(), pwdHash],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) {
                return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
            }

            const token = 'token_' + Buffer.from(row.id + ':' + Date.now()).toString('base64');
            res.json({
                success: true,
                token,
                user: row
            });
        }
    );
});

// Autenticação: Esqueci a Senha (Enviar Código Exclusivamente para o E-mail)
const nodemailer = require('nodemailer');

function getMailTransporter() {
    // 1. Suporte a Gmail direto
    const gmailUser = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
    const gmailPassRaw = (process.env.GMAIL_PASS || process.env.EMAIL_PASS || '').trim();
    const gmailPass = gmailPassRaw.replace(/\s+/g, ''); // Remove espaços da senha de app do Google
    
    if (gmailUser && gmailPass) {
        return {
            provider: 'gmail',
            user: gmailUser,
            from: process.env.SMTP_FROM || `"Finanças Pessoais" <${gmailUser}>`,
            transporter: nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailUser,
                    pass: gmailPass
                }
            })
        };
    }

    // 2. Suporte a SMTP Genérico (Host / Port / User / Pass)
    const smtpHost = (process.env.SMTP_HOST || '').trim();
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();
    const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
    const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (smtpHost && smtpUser && smtpPass) {
        return {
            provider: 'smtp',
            user: smtpUser,
            from: process.env.SMTP_FROM || `"Finanças Pessoais" <${smtpUser}>`,
            transporter: nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: isSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                },
                tls: {
                    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
                }
            })
        };
    }

    return null;
}

// Endpoint de diagnóstico do serviço de e-mail (sem expor credenciais)
app.get('/api/auth/mail-status', (req, res) => {
    const mailConfig = getMailTransporter();
    if (mailConfig) {
        // Mascara o e-mail para exibição segura (ex: us***@gmail.com)
        const masked = mailConfig.user.replace(/^(..)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c);
        res.json({
            configured: true,
            provider: mailConfig.provider,
            sender: masked
        });
    } else {
        res.json({
            configured: false,
            provider: 'none'
        });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Por favor, informe seu e-mail cadastrado.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verificação de segurança prévia: se não há serviço de e-mail configurado, bloqueia com 503
    const mailConfig = getMailTransporter();
    if (!mailConfig) {
        console.warn(`[SEGURANÇA] Bloqueado: solicitação de recuperação para ${cleanEmail}, mas o servidor não possui SMTP ou Gmail configurado.`);
        return res.status(503).json({
            error: 'O serviço de envio de e-mails não está configurado no servidor. Por normas de segurança, o código de verificação nunca é exibido na tela. Configure as variáveis GMAIL_USER/GMAIL_PASS ou SMTP no servidor ou painel do Render.'
        });
    }

    db.get('SELECT id, name, email FROM users WHERE email = ?', [cleanEmail], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) {
            return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
        }

        // Gera código de 6 dígitos aleatório e seguro
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const resetId = 'rst_' + Date.now();
        const createdAt = Date.now();
        const expiresAt = createdAt + (15 * 60 * 1000); // 15 minutos

        db.run(
            'INSERT INTO password_resets (id, email, code, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
            [resetId, cleanEmail, code, createdAt, expiresAt],
            async function(insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });

                try {
                    await mailConfig.transporter.sendMail({
                        from: mailConfig.from,
                        to: cleanEmail,
                        subject: '🔑 Código de Verificação para Recuperação de Senha - Finanças Pessoais',
                        html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0F172A; color: #FFFFFF; border-radius: 16px; border: 1px solid #1E293B;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <h2 style="color: #60A5FA; margin: 0 0 6px 0; font-size: 1.4rem;">Finanças Pessoais</h2>
                                    <span style="font-size: 0.85rem; color: #94A3B8;">Recuperação Segura de Senha</span>
                                </div>
                                <p style="color: #E2E8F0; font-size: 0.95rem; line-height: 1.5;">Olá, <strong>${user.name || 'Usuário'}</strong>!</p>
                                <p style="color: #CBD5E1; font-size: 0.95rem; line-height: 1.5;">Recebemos uma solicitação para redefinir a sua senha no aplicativo Finanças Pessoais.</p>
                                <p style="color: #94A3B8; font-size: 0.88rem;">Para continuar, copie o código de 6 dígitos abaixo e digite na tela do aplicativo:</p>
                                
                                <div style="background: #1E293B; border: 2px dashed #3B82F6; border-radius: 12px; padding: 18px; text-align: center; margin: 22px 0;">
                                    <div style="font-size: 0.75rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Código de Verificação</div>
                                    <div style="font-size: 2.2rem; font-weight: 900; letter-spacing: 8px; color: #34D399; margin-top: 6px; font-family: monospace;">${code}</div>
                                </div>

                                <p style="color: #94A3B8; font-size: 0.8rem; line-height: 1.4;">
                                    ⏱️ <strong>Atenção:</strong> Este código expira em 15 minutos.<br>
                                    🛡️ <strong>Segurança:</strong> Se você não solicitou a alteração de senha, ignore este e-mail. Seus dados permanecem seguros.
                                </p>
                            </div>
                        `
                    });

                    console.log(`[Segurança] Código de recuperação enviado com sucesso via ${mailConfig.provider} para ${cleanEmail}`);
                    return res.json({
                        success: true,
                        message: `Código de verificação enviado com sucesso para ${cleanEmail}! Verifique sua caixa de entrada e pasta de spam.`
                    });
                } catch (mailErr) {
                    console.error(`[E-mail] Falha no envio do código para ${cleanEmail} via ${mailConfig.provider}:`, mailErr.message);
                    return res.status(500).json({
                        error: 'Falha ao enviar e-mail de recuperação (' + mailErr.message + '). Verifique suas credenciais de e-mail no servidor.'
                    });
                }
            }
        );
    });
});

// Autenticação: Redefinir Senha
app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios (e-mail, código e nova senha).' });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();
    const now = Date.now();

    db.get(
        'SELECT id FROM password_resets WHERE email = ? AND code = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
        [cleanEmail, cleanCode, now],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) {
                return res.status(400).json({ error: 'Código inválido ou expirado. Por favor, solicite um novo código.' });
            }

            const newPwdHash = hashPassword(newPassword);

            db.run('UPDATE users SET password = ? WHERE email = ?', [newPwdHash, cleanEmail], function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                // Remove os códigos usados
                db.run('DELETE FROM password_resets WHERE email = ?', [cleanEmail], () => {});

                res.json({
                    success: true,
                    message: 'Senha alterada com sucesso! Você já pode entrar com sua nova senha.'
                });
            });
        }
    );
});

// Autenticação: Dados do usuário
app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.json({ loggedIn: false });
    res.json({ loggedIn: true });
});

// Sync PULL: busca registros atualizados apos lastSync (filtrado por usuario com suporte a legado)
app.get('/api/sync/pull', (req, res) => {
    const lastSync = parseInt(req.query.lastSync, 10) || 0;
    const userId = req.query.userId || req.headers['x-user-id'] || null;

    let queryOrigens, queryContas, queryMovs, params;
    if (userId) {
        queryOrigens = 'SELECT * FROM origens_renda WHERE (user_id = ? OR user_id IS NULL) AND updated_at > ?';
        queryContas = 'SELECT * FROM contas_bancarias WHERE (user_id = ? OR user_id IS NULL) AND updated_at > ?';
        queryMovs = 'SELECT * FROM movimentacoes WHERE (user_id = ? OR user_id IS NULL) AND updated_at > ?';
        params = [userId, lastSync];
    } else {
        queryOrigens = 'SELECT * FROM origens_renda WHERE updated_at > ?';
        queryContas = 'SELECT * FROM contas_bancarias WHERE updated_at > ?';
        queryMovs = 'SELECT * FROM movimentacoes WHERE updated_at > ?';
        params = [lastSync];
    }

    db.all(queryOrigens, params, (err, origens) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(queryContas, params, (err, contas) => {
            if (err) return res.status(500).json({ error: err.message });
            db.all(queryMovs, params, (err, movs) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    origens_renda: origens || [],
                    contas_bancarias: contas || [],
                    movimentacoes: movs || []
                });
            });
        });
    });
});

// Sync PUSH: insere ou atualiza em lote no SQLite com user_id preservado
app.post('/api/sync/push', (req, res) => {
    const { origens_renda = [], contas_bancarias = [], movimentacoes = [], userId = null } = req.body;
    const headerUserId = req.headers['x-user-id'] || userId;
    const serverTimestamp = Date.now();

    db.serialize(() => {
        // Origens de Renda
        if (origens_renda.length > 0) {
            const stmtOrigem = db.prepare(`
                INSERT INTO origens_renda (id, descricao, tipo_receita, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    descricao = excluded.descricao,
                    tipo_receita = excluded.tipo_receita,
                    user_id = COALESCE(excluded.user_id, origens_renda.user_id),
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            origens_renda.forEach(r => {
                stmtOrigem.run([r.id, r.descricao, r.tipo_receita, r.user_id || headerUserId || null, serverTimestamp, r.deleted || 0]);
            });
            stmtOrigem.finalize();
        }

        // Contas Bancarias
        if (contas_bancarias.length > 0) {
            const stmtConta = db.prepare(`
                INSERT INTO contas_bancarias (id, nome_conta, tipo_conta, limite_cartao, dia_fechamento, dia_vencimento, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    nome_conta = excluded.nome_conta,
                    tipo_conta = excluded.tipo_conta,
                    limite_cartao = excluded.limite_cartao,
                    dia_fechamento = excluded.dia_fechamento,
                    dia_vencimento = excluded.dia_vencimento,
                    user_id = COALESCE(excluded.user_id, contas_bancarias.user_id),
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            contas_bancarias.forEach(c => {
                stmtConta.run([c.id, c.nome_conta, c.tipo_conta, c.limite_cartao, c.dia_fechamento, c.dia_vencimento, c.user_id || headerUserId || null, serverTimestamp, c.deleted || 0]);
            });
            stmtConta.finalize();
        }

        // Movimentacoes
        if (movimentacoes.length > 0) {
            const stmtMov = db.prepare(`
                INSERT INTO movimentacoes (id, descricao, valor_total, valor_realizado, data_lancamento, tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual, id_grupo, link_url, midia_url, midia_tipo, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    descricao = excluded.descricao,
                    valor_total = excluded.valor_total,
                    valor_realizado = excluded.valor_realizado,
                    data_lancamento = excluded.data_lancamento,
                    tipo_gasto = excluded.tipo_gasto,
                    status = excluded.status,
                    conta_id = excluded.conta_id,
                    parcelado = excluded.parcelado,
                    total_parcelas = excluded.total_parcelas,
                    parcela_atual = excluded.parcela_atual,
                    id_grupo = excluded.id_grupo,
                    link_url = excluded.link_url,
                    midia_url = excluded.midia_url,
                    midia_tipo = excluded.midia_tipo,
                    user_id = COALESCE(excluded.user_id, movimentacoes.user_id),
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            movimentacoes.forEach(m => {
                stmtMov.run([
                    m.id,
                    m.descricao,
                    m.valor_total,
                    m.valor_realizado || 0,
                    m.data_lancamento,
                    m.tipo_gasto,
                    m.status || 'Pendente',
                    m.conta_id || null,
                    m.parcelado || 'Não',
                    m.total_parcelas || 1,
                    m.parcela_atual || 1,
                    m.id_grupo || null,
                    m.link_url || null,
                    m.midia_url || null,
                    m.midia_tipo || null,
                    m.user_id || headerUserId || null,
                    serverTimestamp,
                    m.deleted || 0
                ]);
            });
            stmtMov.finalize();
        }
    });

    res.json({ success: true, timestamp: serverTimestamp });
});

// Endpoint direto para listar todas movimentacoes ativas
app.get('/api/movimentacoes', (req, res) => {
    db.all('SELECT * FROM movimentacoes WHERE deleted = 0 ORDER BY data_lancamento DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Endpoint para zerar todos os lançamentos (Começar do Zero)
app.post('/api/database/reset', (req, res) => {
    db.run('DELETE FROM movimentacoes', function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Todos os lançamentos foram zerados.', changes: this.changes });
    });
});

// Endpoint para backup/exportacao completa
app.get('/api/export', (req, res) => {
    db.all('SELECT * FROM origens_renda', [], (err, origens) => {
        db.all('SELECT * FROM contas_bancarias', [], (err, contas) => {
            db.all('SELECT * FROM movimentacoes', [], (err, movs) => {
                res.json({
                    exportDate: new Date().toISOString(),
                    origens_renda: origens || [],
                    contas_bancarias: contas || [],
                    movimentacoes: movs || []
                });
            });
        });
    });
});

// Rota fallback SPA para o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');
function getLocalNetworkIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIp = getLocalNetworkIp();

// Keep-Alive Anti-Sleep do Render (Mantém o servidor desperto a cada 7 segundos para resposta instantânea)
const KEEP_ALIVE_INTERVAL_SEC = parseInt(process.env.KEEP_ALIVE_INTERVAL || '7', 10);
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://app-financas-pessoais.onrender.com';

function startRenderKeepAlive() {
    const delayMs = Math.max(3, KEEP_ALIVE_INTERVAL_SEC) * 1000;
    console.log(`[Keep-Alive] Monitor ativo: mantendo o Render desperto a cada ${KEEP_ALIVE_INTERVAL_SEC}s`);

    setInterval(async () => {
        try {
            const targets = [`http://127.0.0.1:${PORT}/api/health`];
            if (process.env.RENDER || process.env.NODE_ENV === 'production') {
                targets.unshift(`${RENDER_EXTERNAL_URL}/api/health`);
            }

            for (const target of targets) {
                try {
                    await fetch(target, {
                        signal: AbortSignal.timeout(4000),
                        headers: { 'User-Agent': 'Render-KeepAlive/1.0' }
                    });
                } catch (e) {
                    // Silencioso em caso de oscilações normais de rede
                }
            }
        } catch (e) {}
    }, delayMs);
}

app.listen(PORT, '0.0.0.0', () => {
    const mailInfo = getMailTransporter();
    console.log('===============================================================');
    console.log('🚀 APP FINANÇAS PESSOAIS INICIADO COM SUCESSO!');
    console.log('===============================================================');
    console.log(`💻 No Computador:            http://localhost:${PORT}`);
    console.log(`📱 No Celular (mesmo Wi-Fi): http://${localIp}:${PORT}`);
    console.log('☁️  Na Nuvem (Render):        Porta configurada para ' + PORT);
    if (mailInfo) {
        console.log(`✉️  Serviço de E-mail:       Ativo via ${mailInfo.provider.toUpperCase()} (${mailInfo.user})`);
    } else {
        console.log('⚠️  Serviço de E-mail:       Não configurado (GMAIL_USER ou SMTP_HOST ausentes).');
        console.log('                            Recuperação de senha protegida contra exposição.');
    }
    console.log('===============================================================');

    // Inicia o anti-sleep do Render
    startRenderKeepAlive();
});
