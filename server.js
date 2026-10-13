const express = require('express');
const cors = require('cors');
const path = require('path');
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

// Status da API
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', app: 'Finanças Pessoais', timestamp: Date.now() });
});

// Versão do Aplicativo (Auto-Update)
const fs = require('fs');
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

// Autenticação: Esqueci a Senha (Enviar Código para E-mail)
const nodemailer = require('nodemailer');
function getMailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return null;
}

app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Por favor, informe seu e-mail cadastrado.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    db.get('SELECT id, name, email FROM users WHERE email = ?', [cleanEmail], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) {
            return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
        }

        // Gera código de 6 dígitos aleatório
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const resetId = 'rst_' + Date.now();
        const createdAt = Date.now();
        const expiresAt = createdAt + (15 * 60 * 1000); // 15 minutos

        db.run(
            'INSERT INTO password_resets (id, email, code, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
            [resetId, cleanEmail, code, createdAt, expiresAt],
            async function(insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });

                let emailEnviado = false;
                const transporter = getMailTransporter();

                if (transporter) {
                    try {
                        await transporter.sendMail({
                            from: process.env.SMTP_FROM || '"Finanças Pessoais" <naoresponda@financas.com>',
                            to: cleanEmail,
                            subject: '🔑 Código para Recuperação de Senha - Finanças Pessoais',
                            html: `
                                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0F172A; color: #FFFFFF; border-radius: 12px;">
                                    <h2 style="color: #60A5FA; margin-bottom: 8px;">Recuperação de Senha</h2>
                                    <p style="color: #94A3B8; font-size: 0.95rem;">Olá, <strong>${user.name}</strong>!</p>
                                    <p style="color: #E2E8F0; font-size: 0.95rem;">Recebemos uma solicitação para redefinir a sua senha no aplicativo Finanças Pessoais.</p>
                                    <div style="background: #1E293B; border: 1px dashed #3B82F6; border-radius: 8px; padding: 14px; text-align: center; margin: 20px 0;">
                                        <div style="font-size: 0.8rem; color: #94A3B8; text-transform: uppercase; font-weight: bold;">Seu Código de Acesso</div>
                                        <div style="font-size: 2rem; font-weight: 800; letter-spacing: 6px; color: #34D399; margin-top: 4px;">${code}</div>
                                    </div>
                                    <p style="color: #94A3B8; font-size: 0.8rem;">Este código é válido por 15 minutos. Se você não solicitou, basta ignorar este e-mail.</p>
                                </div>
                            `
                        });
                        emailEnviado = true;
                    } catch (mailErr) {
                        console.warn('[E-mail] Envio externo SMTP indisponível:', mailErr.message);
                    }
                }

                console.log(`[Recuperação de Senha] Código gerado para ${cleanEmail}: ${code}`);

                res.json({
                    success: true,
                    message: emailEnviado ? 
                        `Código de recuperação enviado para ${cleanEmail}! Verifique sua caixa de entrada.` : 
                        `Código de recuperação: ${code}. Use-o para cadastrar sua nova senha agora.`,
                    codePreview: code
                });
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

// Sync PULL: busca registros atualizados apos lastSync
app.get('/api/sync/pull', (req, res) => {
    const lastSync = parseInt(req.query.lastSync) || 0;

    const queryOrigens = 'SELECT * FROM origens_renda WHERE updated_at > ?';
    const queryContas = 'SELECT * FROM contas_bancarias WHERE updated_at > ?';
    const queryMovs = 'SELECT * FROM movimentacoes WHERE updated_at > ?';

    db.all(queryOrigens, [lastSync], (err, origens) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(queryContas, [lastSync], (err, contas) => {
            if (err) return res.status(500).json({ error: err.message });
            db.all(queryMovs, [lastSync], (err, movs) => {
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

// Sync PUSH: insere ou atualiza em lote no SQLite
app.post('/api/sync/push', (req, res) => {
    const { origens_renda = [], contas_bancarias = [], movimentacoes = [] } = req.body;
    const serverTimestamp = Date.now();

    db.serialize(() => {
        // Origens de Renda
        if (origens_renda.length > 0) {
            const stmtOrigem = db.prepare(`
                INSERT INTO origens_renda (id, descricao, tipo_receita, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    descricao = excluded.descricao,
                    tipo_receita = excluded.tipo_receita,
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            origens_renda.forEach(r => {
                stmtOrigem.run([r.id, r.descricao, r.tipo_receita, serverTimestamp, r.deleted || 0]);
            });
            stmtOrigem.finalize();
        }

        // Contas Bancarias
        if (contas_bancarias.length > 0) {
            const stmtConta = db.prepare(`
                INSERT INTO contas_bancarias (id, nome_conta, tipo_conta, limite_cartao, dia_fechamento, dia_vencimento, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    nome_conta = excluded.nome_conta,
                    tipo_conta = excluded.tipo_conta,
                    limite_cartao = excluded.limite_cartao,
                    dia_fechamento = excluded.dia_fechamento,
                    dia_vencimento = excluded.dia_vencimento,
                    updated_at = excluded.updated_at,
                    deleted = excluded.deleted
            `);
            contas_bancarias.forEach(c => {
                stmtConta.run([c.id, c.nome_conta, c.tipo_conta, c.limite_cartao, c.dia_fechamento, c.dia_vencimento, serverTimestamp, c.deleted || 0]);
            });
            stmtConta.finalize();
        }

        // Movimentacoes
        if (movimentacoes.length > 0) {
            const stmtMov = db.prepare(`
                INSERT INTO movimentacoes (id, descricao, valor_total, valor_realizado, data_lancamento, tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual, id_grupo, link_url, midia_url, midia_tipo, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

app.listen(PORT, '0.0.0.0', () => {
    console.log('===============================================================');
    console.log('🚀 APP FINANÇAS PESSOAIS INICIADO COM SUCESSO!');
    console.log('===============================================================');
    console.log(`💻 No Computador:            http://localhost:${PORT}`);
    console.log(`📱 No Celular (mesmo Wi-Fi): http://${localIp}:${PORT}`);
    console.log('☁️  Na Nuvem (Render):        Porta configurada para ' + PORT);
    console.log('===============================================================');
});
