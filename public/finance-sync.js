// Lógica de Sincronização (Local IndexedDB <-> Servidor SQLite)

window.setOnlineStatus = function(isOnline) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const container = document.getElementById('statusContainer');
    if (!dot || !text || !container) return;

    if (isOnline) {
        container.style.background = 'rgba(16, 185, 129, 0.15)';
        container.style.color = '#10B981';
        dot.style.background = '#10B981';
        text.innerText = 'Online';
    } else {
        container.style.background = 'rgba(239, 68, 68, 0.15)';
        container.style.color = '#EF4444';
        dot.style.background = '#EF4444';
        text.innerText = 'Offline';
    }
};

async function syncFinanceWithServer() {
    if (!navigator.onLine) {
        window.setOnlineStatus(false);
        return;
    }

    try {
        console.log('Iniciando sincronização com servidor...');
        const headers = { 'Content-Type': 'application/json' };

        // 1. PUSH (Enviar do Dexie para o SQLite)
        if (typeof dbLocal !== 'undefined' && dbLocal) {
            const pendingRenda = await dbLocal.origens_renda.where('sync_status').notEqual('synced').toArray();
            const pendingContas = await dbLocal.contas_bancarias.where('sync_status').notEqual('synced').toArray();
            const pendingMovimentacoes = await dbLocal.movimentacoes.where('sync_status').notEqual('synced').toArray();

            if (pendingRenda.length > 0 || pendingContas.length > 0 || pendingMovimentacoes.length > 0) {
                const pushResponse = await fetch('/api/sync/push', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        origens_renda: pendingRenda,
                        contas_bancarias: pendingContas,
                        movimentacoes: pendingMovimentacoes
                    })
                });

                if (pushResponse.ok) {
                    await dbLocal.transaction('rw', dbLocal.origens_renda, dbLocal.contas_bancarias, dbLocal.movimentacoes, async () => {
                        for (let item of pendingRenda) await dbLocal.origens_renda.update(item.id, { sync_status: 'synced' });
                        for (let item of pendingContas) await dbLocal.contas_bancarias.update(item.id, { sync_status: 'synced' });
                        for (let item of pendingMovimentacoes) await dbLocal.movimentacoes.update(item.id, { sync_status: 'synced' });
                    });
                }
            }
        }

        // 2. PULL (Receber do SQLite para o Dexie)
        const lastSync = localStorage.getItem('lastSyncTimestamp') || 0;
        const pullResponse = await fetch(`/api/sync/pull?lastSync=${lastSync}`, { headers });

        if (pullResponse.ok) {
            const updates = await pullResponse.json();
            
            if (typeof dbLocal !== 'undefined' && dbLocal) {
                await dbLocal.transaction('rw', dbLocal.origens_renda, dbLocal.contas_bancarias, dbLocal.movimentacoes, async () => {
                    for (let item of updates.origens_renda) { item.sync_status = 'synced'; await dbLocal.origens_renda.put(item); }
                    for (let item of updates.contas_bancarias) { item.sync_status = 'synced'; await dbLocal.contas_bancarias.put(item); }
                    for (let item of updates.movimentacoes) { item.sync_status = 'synced'; await dbLocal.movimentacoes.put(item); }
                });
            }

            let maxTime = parseInt(lastSync);
            ['origens_renda', 'contas_bancarias', 'movimentacoes'].forEach(table => {
                if (updates[table]) {
                    updates[table].forEach(r => { if (r.updated_at > maxTime) maxTime = r.updated_at; });
                }
            });
            localStorage.setItem('lastSyncTimestamp', maxTime.toString());

            const ind = document.getElementById('syncStatusIndicator');
            if (ind) {
                ind.innerText = 'Sincronizado';
                ind.style.color = '#10B981';
            }

            if ((updates.origens_renda && updates.origens_renda.length > 0) || 
                (updates.contas_bancarias && updates.contas_bancarias.length > 0) || 
                (updates.movimentacoes && updates.movimentacoes.length > 0)) {
                if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
                if (typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();
            }
        }

        console.log('Sincronização concluída com sucesso!');
        window.setOnlineStatus(true);
    } catch (error) {
        console.warn('Falha na sincronização:', error);
        window.setOnlineStatus(false);
    }
}

window.forceSync = syncFinanceWithServer;

window.addEventListener('online', () => {
    window.setOnlineStatus(true);
    syncFinanceWithServer();
});
window.addEventListener('offline', () => {
    window.setOnlineStatus(false);
});
window.addEventListener('load', () => {
    setTimeout(syncFinanceWithServer, 500);
});
