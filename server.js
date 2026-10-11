const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Status da API
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', app: 'Finanças Pessoais', timestamp: Date.now() });
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
                INSERT INTO movimentacoes (id, descricao, valor_total, valor_realizado, data_lancamento, tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual, id_grupo, updated_at, deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
