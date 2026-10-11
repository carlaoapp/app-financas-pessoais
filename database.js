const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'dados_financeiros.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.serialize(() => {
            // Tabela 1: origens_renda
            db.run(`CREATE TABLE IF NOT EXISTS origens_renda (
                id TEXT PRIMARY KEY,
                descricao TEXT,
                tipo_receita TEXT,
                updated_at INTEGER,
                deleted INTEGER DEFAULT 0
            )`);

            // Tabela 2: contas_bancarias
            db.run(`CREATE TABLE IF NOT EXISTS contas_bancarias (
                id TEXT PRIMARY KEY,
                nome_conta TEXT,
                tipo_conta TEXT,
                limite_cartao REAL,
                dia_fechamento INTEGER,
                dia_vencimento INTEGER,
                updated_at INTEGER,
                deleted INTEGER DEFAULT 0
            )`);

            // Tabela 3: movimentacoes
            db.run(`CREATE TABLE IF NOT EXISTS movimentacoes (
                id TEXT PRIMARY KEY,
                descricao TEXT,
                valor_total REAL,
                valor_realizado REAL,
                data_lancamento TEXT,
                tipo_gasto TEXT,
                status TEXT,
                conta_id TEXT,
                parcelado TEXT,
                total_parcelas INTEGER,
                parcela_atual INTEGER,
                id_grupo TEXT,
                updated_at INTEGER,
                deleted INTEGER DEFAULT 0
            )`);
        });
    }
});

module.exports = db;
