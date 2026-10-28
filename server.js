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
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

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
    res.json({ version: '1.8.34', updatedAt: Date.now() });
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

// Sync PULL: busca registros atualizados apos lastSync + manifesto completo do servidor para reconciliacao entre celular e computador
app.get('/api/sync/pull', (req, res) => {
    const lastSync = parseInt(req.query.lastSync, 10) || 0;

    const queryOrigens = 'SELECT * FROM origens_renda WHERE updated_at > ?';
    const queryContas = 'SELECT * FROM contas_bancarias WHERE updated_at > ?';
    const queryMovs = 'SELECT * FROM movimentacoes WHERE updated_at > ?';
    const params = [lastSync];

    db.all(queryOrigens, params, (err, origens) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(queryContas, params, (err, contas) => {
            if (err) return res.status(500).json({ error: err.message });
            db.all(queryMovs, params, (err, movs) => {
                if (err) return res.status(500).json({ error: err.message });

                // Manifesto leve (sem midia_url pesada) para reconciliacao automatica bidirecional (Celular <-> Computador)
                db.all('SELECT id, updated_at, deleted FROM origens_renda', [], (errM1, manOrigens) => {
                    db.all('SELECT id, updated_at, deleted FROM contas_bancarias', [], (errM2, manContas) => {
                        db.all('SELECT id, updated_at, deleted FROM movimentacoes', [], (errM3, manMovs) => {
                            res.json({
                                origens_renda: origens || [],
                                contas_bancarias: contas || [],
                                movimentacoes: movs || [],
                                server_manifest: {
                                    origens_renda: (!errM1 && manOrigens) ? manOrigens : [],
                                    contas_bancarias: (!errM2 && manContas) ? manContas : [],
                                    movimentacoes: (!errM3 && manMovs) ? manMovs : []
                                },
                                server_timestamp: Date.now()
                            });
                        });
                    });
                });
            });
        });
    });
});

// Sync PUSH: insere ou atualiza em lote no SQLite aguardando conclusao real da gravacao
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
                const ts = Math.max(Number(r.updated_at) || 0, serverTimestamp);
                stmtOrigem.run([String(r.id), r.descricao, r.tipo_receita, r.user_id || headerUserId || null, ts, r.deleted ? 1 : 0]);
            });
            stmtOrigem.finalize();
        }

        // Contas Bancarias
        if (contas_bancarias.length > 0) {
            const stmtConta = db.prepare(`
                INSERT INTO contas_bancarias (id, nome_conta, tipo_conta, titular, limite_cartao, saldo_atual, cor_cartao, banco, dia_fechamento, dia_vencimento, dia_recarga, valor_recarga, user_id, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    nome_conta = excluded.nome_conta,
                    tipo_conta = excluded.tipo_conta,
                    titular = excluded.titular,
                    limite_cartao = excluded.limite_cartao,
                    saldo_atual = excluded.saldo_atual,
                    cor_cartao = excluded.cor_cartao,
                    banco = excluded.banco,
                    dia_fechamento = excluded.dia_fechamento,
                    dia_vencimento = excluded.dia_vencimento,
                    dia_recarga = excluded.dia_recarga,
                    valor_recarga = excluded.valor_recarga,
                    user_id = COALESCE(excluded.user_id, contas_bancarias.user_id),
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            contas_bancarias.forEach(c => {
                const ts = Math.max(Number(c.updated_at) || 0, serverTimestamp);
                stmtConta.run([
                    String(c.id),
                    c.nome_conta,
                    c.tipo_conta,
                    c.titular || '',
                    parseFloat(c.limite_cartao) || 0,
                    parseFloat(c.saldo_atual) || 0,
                    c.cor_cartao || '#2563EB',
                    c.banco || '',
                    parseInt(c.dia_fechamento, 10) || null,
                    parseInt(c.dia_vencimento, 10) || null,
                    parseInt(c.dia_recarga, 10) || 1,
                    parseFloat(c.valor_recarga) || 0,
                    c.user_id || headerUserId || null,
                    ts,
                    c.deleted ? 1 : 0
                ]);
            });
            stmtConta.finalize();
        }

        // Movimentacoes (incluindo Lista de Desejos, Contas a Pagar e Lancamentos)
        if (movimentacoes.length > 0) {
            const stmtMov = db.prepare(`
                INSERT INTO movimentacoes (id, descricao, valor_total, valor_realizado, data_lancamento, tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual, id_grupo, link_url, midia_url, midia_tipo, user_id, observacoes, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    observacoes = excluded.observacoes,
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            movimentacoes.forEach(m => {
                const ts = Math.max(Number(m.updated_at) || 0, serverTimestamp);
                stmtMov.run([
                    String(m.id),
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
                    m.observacoes || '',
                    ts,
                    m.deleted ? 1 : 0
                ]);
            });
            stmtMov.finalize();
        }

        // Garante que todas as queries anteriores na fila do serialize finalizaram antes de responder
        db.get('SELECT 1', [], (err) => {
            if (err) {
                console.error('[SYNC PUSH ERROR]', err);
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, timestamp: serverTimestamp });
        });
    });
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

// ==========================================================================
// ENDPOINTS DE NOTIFICAÇÕES E WEBHOOKS BANCÁRIOS (LANÇAMENTO AUTOMÁTICO)
// ==========================================================================

function normalizarTextoNotifServer(txt) {
    if (!txt) return '';
    return String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function interpretarNotificacaoNoServidor(titulo, texto, appPacote, contas) {
    const textoBruto = `${titulo || ''} ${texto || ''}`.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    const textoLimpo = normalizarTextoNotifServer(textoBruto);

    // 1. Valor
    const mVal = textoBruto.match(/(?:R\$|\$)\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
                 textoBruto.match(/(?:R\$|\$)\s*([0-9]+[,\.][0-9]{2})/i) ||
                 textoBruto.match(/\b([0-9]{1,5},[0-9]{2})\b/);
    if (!mVal) return null;
    const valorNum = parseFloat(mVal[1].replace(/\./g, '').replace(',', '.')) || 0;
    if (valorNum <= 0) return null;

    // 2. Parcelas
    let totalParcelas = 1;
    const mParc = textoBruto.match(/\b([0-9]{1,2})\s*X\b/i) ||
                  textoBruto.match(/\bEM\s+([0-9]{1,2})\s*(?:X|VEZES|PARCELAS)\b/i) ||
                  textoBruto.match(/\bPARCELA(?:DO)?\s+(?:EM\s+)?([0-9]{1,2})\b/i);
    if (mParc && mParc[1]) {
        const p = parseInt(mParc[1], 10);
        if (p > 1 && p <= 48) totalParcelas = p;
    }

    // 3. Tipo de Gasto
    const isPixRecebido = /\b(PIX\s+RECEBIDO|TRANSFERENCIA\s+RECEBIDA|VOCE\s+RECEBEU\s+UM\s+PIX|CREDITO\s+EM\s+CONTA|SALARIO|PROVENTOS)\b/i.test(textoLimpo);
    const isAlimentacao = /\b(TICKET|ALELO|SODEXO|PLUXEE|VR|FLASH|CAJU|SWILE|ALIMENTACAO|REFEICAO)\b/i.test(textoLimpo) || /ticket|alelo|sodexo|pluxee|vr|flash|caju/i.test(appPacote || '');
    const isCredito = (totalParcelas > 1) || /\b(CREDITO|COMPRA\s+NO\s+CREDITO|CARTAO\s+DE\s+CREDITO|FATURA|NO\s+CREDITO)\b/i.test(textoLimpo);
    const isDebito = /\b(DEBITO|COMPRA\s+NO\s+DEBITO|CARTAO\s+DE\s+DEBITO|NO\s+DEBITO|CONTA\s+CORRENTE)\b/i.test(textoLimpo);
    const isBoleto = /\b(BOLETO|PAGAMENTO\s+DE\s+CONTA|FATURA\s+PAGA|PAGO\s+COM\s+SUCESSO)\b/i.test(textoLimpo);

    let tipoGasto = 'Despesa Variável';
    let status = 'Pago';
    if (isPixRecebido) { tipoGasto = 'Receita'; status = 'Pago'; }
    else if (isAlimentacao) { tipoGasto = 'Cartão Alimentação'; status = 'Pago'; }
    else if (isCredito) { tipoGasto = 'Cartão de Crédito'; status = 'Pendente'; }
    else if (isBoleto) { tipoGasto = 'Despesa Fixa'; status = 'Pago'; }
    else if (isDebito) { tipoGasto = 'Despesa Variável'; status = 'Pago'; }

    // 4. Banco e Conta
    const listaBancos = [
        { nome: 'Sicredi', regex: /\b(SICREDI|SICRED|VISA\s+GOLD|OUROCARD\s+SICREDI)\b/i, pacote: /sicred/i },
        { nome: 'Nubank', regex: /\bNUBANK|NU\b/i, pacote: /nu\.production|nubank/i },
        { nome: 'Inter', regex: /\b(BANCO\s+INTER|INTER)\b/i, pacote: /intermedium|bancointer/i },
        { nome: 'Itaú', regex: /\bITA[UÚ]\b/i, pacote: /itau/i },
        { nome: 'Bradesco', regex: /\bBRADESCO\b/i, pacote: /bradesco/i },
        { nome: 'Santander', regex: /\bSANTANDER\b/i, pacote: /santander/i },
        { nome: 'Banco do Brasil', regex: /\b(BANCO\s+DO\s+BRASIL|OUROCARD|BB)\b/i, pacote: /bancodobrasil/i },
        { nome: 'Caixa', regex: /\bCAIXA\b/i, pacote: /caixa/i },
        { nome: 'C6 Bank', regex: /\b(C6\s*BANK|C6)\b/i, pacote: /c6bank/i },
        { nome: 'Ticket Flex', regex: /\bTICKET(?:\s+FLEX)?\b/i, pacote: /ticket/i },
        { nome: 'Alelo', regex: /\bALELO\b/i, pacote: /alelo/i }
    ];

    let nomeBanco = '';
    for (const b of listaBancos) {
        if (b.regex.test(textoLimpo) || (appPacote && b.pacote.test(appPacote))) {
            nomeBanco = b.nome;
            break;
        }
    }

    let contaId = null;
    const contasAtivas = (contas || []).filter(c => !c.deleted);
    if (contasAtivas.length > 0) {
        if (nomeBanco) {
            const bNorm = normalizarTextoNotifServer(nomeBanco);
            const candidatas = contasAtivas.filter(c => {
                const n = normalizarTextoNotifServer(c.nome_conta || '');
                const b = normalizarTextoNotifServer(c.banco || '');
                return n.includes(bNorm) || b.includes(bNorm) || bNorm.includes(n) || (bNorm === 'SICREDI' && /SICRED/i.test(n + ' ' + b));
            });
            if (isCredito) {
                const cCred = candidatas.find(c => c.tipo_conta === 'Cartão de Crédito');
                if (cCred) contaId = cCred.id;
            } else if (isDebito) {
                const cDeb = candidatas.find(c => c.tipo_conta === 'Conta Corrente' || c.tipo_conta === 'Conta Salário');
                if (cDeb) contaId = cDeb.id;
            } else if (isAlimentacao) {
                const cAlim = candidatas.find(c => c.tipo_conta === 'Cartão Alimentação');
                if (cAlim) contaId = cAlim.id;
            }
            if (!contaId && candidatas.length > 0) contaId = candidatas[0].id;
        }
        if (!contaId) {
            if (tipoGasto === 'Cartão de Crédito') {
                const cCred = contasAtivas.find(c => c.tipo_conta === 'Cartão de Crédito');
                if (cCred) contaId = cCred.id;
            } else if (tipoGasto === 'Cartão Alimentação') {
                const cAlim = contasAtivas.find(c => c.tipo_conta === 'Cartão Alimentação');
                if (cAlim) contaId = cAlim.id;
            } else {
                const cCorr = contasAtivas.find(c => c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação');
                if (cCorr) contaId = cCorr.id;
            }
            if (!contaId) contaId = contasAtivas[0].id;
        }
    }

    // 5. Estabelecimento
    let estabelecimento = '';
    const mAprovada = textoBruto.match(/APROVAD[AO]?\s+(?:em|na|no)\s+([A-Za-zÀ-ÿ0-9\s\.\-_&]{2,45}?)(?=\s*(?:,\s*[aà]s\b|\s+[aà]s\s+[0-2]?[0-9]:[0-5][0-9]|\s+no\s+cart[aã]o\b|\s+cart[aã]o\b|\s+final\s+\d{3,4}|\s+em\s+\d+\s*x|\s+d[uú]vidas|[\.\-,;]|$))/i);
    if (mAprovada && mAprovada[1]) {
        estabelecimento = mAprovada[1].trim();
    }
    if (!estabelecimento) {
        const mSicredi = textoBruto.match(/[0-3]?[0-9]\/[0-1]?[0-9]\s+([A-Za-zÀ-ÿ0-9\s\.\-_&]{3,40}?)(?:\s+(?:Paranavai|Curitiba|Maringa|Londrina|Cascavel|SP|PR|RJ|SC|RS|MG|BR|R\$|\-|\d{4}))/i);
        if (mSicredi && mSicredi[1]) estabelecimento = mSicredi[1].trim();
    }
    if (!estabelecimento) {
        const textoSemRodape = textoBruto.replace(/d[uú]vidas.*$/i, '').replace(/entre\s+em\s+contato.*$/i, '').trim();
        const mEst = textoSemRodape.match(/\b(?:em|para|no|na)\s+([A-Za-zÀ-ÿ0-9\s\.\-_&]{3,40}?)(?=\s*(?:,\s*[aà]s\b|\s+[aà]s\s+[0-2]?[0-9]:[0-5][0-9]|\s+no\s+cart[aã]o\b|\s+no\s+cr[eé]dito|\s+no\s+d[eé]bito|\s+final\s+\d{3,4}|[\.\-,;]|$))/i);
        if (mEst && mEst[1] && !/^(contato|duvidas|cartao|credito|debito)$/i.test(mEst[1].trim())) {
            estabelecimento = mEst[1].trim();
        }
    }
    if (!estabelecimento) {
        estabelecimento = isPixRecebido ? 'Recebimento Pix' : (isAlimentacao ? 'Supermercado / Refeição' : (isCredito ? 'Compra no Cartão' : 'Pagamento / Compra'));
    }
    estabelecimento = estabelecimento.split(' ')
        .filter(Boolean)
        .map(p => p.length > 2 ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : p.toUpperCase())
        .join(' ');

    // 6. Data, Hora e Final do Cartão
    let dataIso = new Date().toISOString().split('T')[0];
    const mDataCompleta = textoBruto.match(/\b([0-3]?[0-9])[\/\.\-]([0-1]?[0-9])[\/\.\-](20[2-3][0-9]|[2-3][0-9])\b/);
    if (mDataCompleta) {
        const d = mDataCompleta[1].padStart(2, '0');
        const m = mDataCompleta[2].padStart(2, '0');
        let a = mDataCompleta[3];
        if (a.length === 2) a = '20' + a;
        dataIso = `${a}-${m}-${d}`;
    } else {
        const mDataCurta = textoBruto.match(/\b([0-3]?[0-9])\/([0-1]?[0-9])\b/);
        if (mDataCurta) {
            const d = mDataCurta[1].padStart(2, '0');
            const m = mDataCurta[2].padStart(2, '0');
            const a = new Date().getFullYear();
            dataIso = `${a}-${m}-${d}`;
        }
    }
    const mHora = textoBruto.match(/\b([0-2]?[0-9]:[0-5][0-9])\b/);
    const hora = mHora ? mHora[1] : '';
    const mFinal = textoBruto.match(/final\s+([0-9]{3,4})\b/i);
    const finalCartao = mFinal ? mFinal[1] : '';

    const partesObs = [];
    if (nomeBanco) partesObs.push(`Cartão/Banco: ${nomeBanco}`);
    if (finalCartao) partesObs.push(`Final ${finalCartao}`);
    if (hora) partesObs.push(`Hora: ${hora}`);
    partesObs.push(`🤖 Notificação: "${textoBruto.slice(0, 120)}"`);

    return {
        descricao: estabelecimento,
        valor_total: valorNum,
        valor_realizado: status === 'Pago' ? valorNum : 0,
        data_lancamento: dataIso,
        tipo_gasto: tipoGasto,
        status: status,
        conta_id: contaId,
        parcelado: totalParcelas > 1 ? 'Sim' : 'Não',
        total_parcelas: totalParcelas,
        observacoes: partesObs.join(' • ')
    };
}

// 1. Receber Notificação Bancária (via Python, Telegram, API ou Automação Direta)
app.post(['/api/notificacoes/receber', '/api/webhook/notificacoes'], (req, res) => {
    try {
        const body = req.body || {};
        const query = req.query || {};

        const titulo = String(body.titulo || query.titulo || body.title || query.title || '').trim();
        const texto = String(body.texto || query.texto || body.text || query.text || body.message || query.message || '').trim();
        const appPacote = String(body.pacote || query.pacote || body.app || query.app || body.package || query.package || '').trim();
        const userId = String(body.user_id || query.user_id || req.headers['x-user-id'] || 'default').trim();
        const dataHora = String(body.data_hora || query.data_hora || new Date().toISOString());

        if (!texto && !titulo) {
            return res.status(400).json({ error: 'Título ou texto da notificação é obrigatório.' });
        }

        const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const timestamp = Date.now();

        db.all('SELECT * FROM contas_bancarias WHERE deleted = 0', [], (errC, contasRows) => {
            const dadosParsed = interpretarNotificacaoNoServidor(titulo, texto, appPacote, contasRows || []);
            const lancamentoId = dadosParsed ? ('mov_auto_' + timestamp + '_' + Math.random().toString(36).substr(2, 5)) : null;

            const salvarNotificacao = (idLanc) => {
                const sql = `INSERT INTO notificacoes_bancarias (id, user_id, app_pacote, titulo, texto, data_hora, status, lancamento_id, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`;
                db.run(sql, [id, userId, appPacote, titulo, texto, dataHora, idLanc, timestamp], function(err) {
                    if (err) {
                        console.error('[NOTIFICAÇÃO RECEBER ERRO]', err);
                        return res.status(500).json({ error: err.message });
                    }
                    console.log(`[NOTIFICAÇÃO BANCÁRIA RECEBIDA] ID: ${id} | Lançamento: ${idLanc || 'N/A'} | Título: ${titulo}`);
                    res.json({
                        success: true,
                        message: 'Notificação recebida e lançada automaticamente no sistema.',
                        id: id,
                        lancamento_id: idLanc,
                        dados: dadosParsed,
                        received_at: timestamp
                    });
                });
            };

            if (!dadosParsed) {
                return salvarNotificacao(null);
            }

            // Verifica se já existe lançamento idêntico no mesmo dia para evitar duplicação
            db.get(
                'SELECT id FROM movimentacoes WHERE deleted = 0 AND data_lancamento = ? AND ABS(valor_total - ?) < 0.01 AND UPPER(descricao) = UPPER(?) LIMIT 1',
                [dadosParsed.data_lancamento, dadosParsed.valor_total, dadosParsed.descricao],
                (errDup, rowDup) => {
                    if (rowDup && rowDup.id) {
                        return salvarNotificacao(rowDup.id);
                    }
                    const sqlMov = `INSERT INTO movimentacoes (id, descricao, valor_total, valor_realizado, data_lancamento, tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual, id_grupo, observacoes, user_id, updated_at, deleted)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 0)`;
                    db.run(
                        sqlMov,
                        [
                            lancamentoId,
                            dadosParsed.descricao,
                            dadosParsed.valor_total,
                            dadosParsed.valor_realizado,
                            dadosParsed.data_lancamento,
                            dadosParsed.tipo_gasto,
                            dadosParsed.status,
                            dadosParsed.conta_id,
                            dadosParsed.parcelado,
                            dadosParsed.total_parcelas,
                            dadosParsed.parcelado === 'Sim' ? lancamentoId : null,
                            dadosParsed.observacoes,
                            userId !== 'default' ? userId : null,
                            timestamp
                        ],
                        function(errIns) {
                            if (errIns) {
                                console.warn('[NOTIFICAÇÃO AUTO-INSERT AVISO]', errIns.message);
                                return salvarNotificacao(null);
                            }
                            // Se for débito em conta ou cartão alimentação, atualiza o saldo da conta no servidor
                            if (dadosParsed.conta_id && dadosParsed.tipo_gasto !== 'Cartão de Crédito' && dadosParsed.status === 'Pago') {
                                const delta = dadosParsed.tipo_gasto === 'Receita' ? dadosParsed.valor_total : -dadosParsed.valor_total;
                                db.run('UPDATE contas_bancarias SET saldo_atual = COALESCE(saldo_atual, 0) + ?, updated_at = ? WHERE id = ?', [delta, timestamp, dadosParsed.conta_id]);
                            }
                            salvarNotificacao(lancamentoId);
                        }
                    );
                }
            );
        });
    } catch (e) {
        console.error('[NOTIFICAÇÃO ERRO GERAL]', e);
        res.status(500).json({ error: e.message });
    }
});

// 2. Listar Notificações Pendentes para Ingestão no Frontend
app.get('/api/notificacoes/pendentes', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    let sql = 'SELECT * FROM notificacoes_bancarias WHERE status = "pendente"';
    const params = [];
    if (userId && userId !== 'default') {
        sql += ' AND (user_id = ? OR user_id = "default")';
        params.push(userId);
    }
    sql += ' ORDER BY created_at ASC LIMIT 50';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// 3. Marcar Notificação como Processada ou Descartada
app.post('/api/notificacoes/marcar-processada', (req, res) => {
    const { id, status, lancamento_id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID da notificação é obrigatório.' });

    const novoStatus = status || 'processada';
    const lancId = lancamento_id || null;

    db.run('UPDATE notificacoes_bancarias SET status = ?, lancamento_id = ? WHERE id = ?', [novoStatus, lancId, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, updated: this.changes });
    });
});

// 4. Rota fallback para o Web Share Target (caso a requisição POST atinja o servidor)
app.post('/compartilhar-comprovante', (req, res) => {
    res.redirect('/?comprovante_compartilhado=1');
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
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://app-financas-pessoais-knrp.onrender.com';

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
