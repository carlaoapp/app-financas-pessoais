// Instância local do IndexedDB (via Dexie)
let dbLocal = null;
if (typeof Dexie !== 'undefined') {
    dbLocal = new Dexie('AppGestaoFinanceiraFamiliarDB');
    // Definição das tabelas locais. 
    // O campo 'sync_status' pode ser: 'synced', 'pending_insert', 'pending_update', 'pending_delete'
    dbLocal.version(1).stores({
        origens_renda: 'id, descricao, tipo_receita, sync_status, updated_at',
        contas_bancarias: 'id, nome_conta, tipo_conta, limite_cartao, dia_fechamento, dia_vencimento, sync_status, updated_at',
        movimentacoes: 'id, descricao, valor_total, valor_realizado, data_lancamento, tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual, id_grupo, sync_status, updated_at'
    });
}

// Gera UUID (Identificador Único Universal) v4 para as chaves
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
