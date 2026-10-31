// Lógica de Sincronização Bidirecional em Tempo Real (Local IndexedDB <-> Servidor SQLite)

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

let isSyncInProgress = false;
let pendingSyncRetry = false;

function atualizarUIAposSync() {
    if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
    if (typeof carregarListaDesejos === 'function') carregarListaDesejos();
    if (typeof carregarPlanejamentoRendaExtra === 'function') carregarPlanejamentoRendaExtra();
    if (typeof carregarContasAPagar === 'function') carregarContasAPagar();
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
    if (typeof carregarSelectContasModal === 'function') carregarSelectContasModal();
    if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
    if (typeof renderPowerBIDashboard === 'function') {
        const tabPbi = document.getElementById('tabPowerBI');
        if (!tabPbi || tabPbi.style.display !== 'none') {
            renderPowerBIDashboard();
        }
    }
}

async function syncFinanceWithServer() {
    if (!navigator.onLine) {
        window.setOnlineStatus(false);
        return;
    }

    if (isSyncInProgress) {
        pendingSyncRetry = true;
        return;
    }

    isSyncInProgress = true;
    pendingSyncRetry = false;

    try {
        const user = (typeof getAuthUser === 'function') ? getAuthUser() : null;
        const currentUserId = user ? user.id : (localStorage.getItem('financas_current_user_id') || '');
        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': currentUserId
        };

        const lastSync = parseInt(localStorage.getItem('lastSyncTimestamp') || '0', 10) || 0;
        const pullUrl = currentUserId
            ? `/api/sync/pull?lastSync=${lastSync}&userId=${encodeURIComponent(currentUserId)}&_t=${Date.now()}`
            : `/api/sync/pull?lastSync=${lastSync}&_t=${Date.now()}`;

        // 1. Consulta inicial ao servidor (recebe atualizações incrementais + server_manifest completo)
        const pullResponse = await fetch(pullUrl, {
            headers,
            cache: 'no-store',
            signal: AbortSignal.timeout(45000)
        });

        if (!pullResponse.ok) {
            throw new Error(`HTTP ${pullResponse.status} em /api/sync/pull`);
        }

        let updates = await pullResponse.json();
        const manifest = updates.server_manifest || null;

        if (typeof dbLocal !== 'undefined' && dbLocal) {
            const allLocalRenda = await dbLocal.origens_renda.toArray();
            const allLocalContas = await dbLocal.contas_bancarias.toArray();
            const allLocalMovs = await dbLocal.movimentacoes.toArray();

            const localRendaMap = new Map(allLocalRenda.map(r => [String(r.id), r]));
            const localContasMap = new Map(allLocalContas.map(c => [String(c.id), c]));
            const localMovsMap = new Map(allLocalMovs.map(m => [String(m.id), m]));

            // 2. Verifica se o dispositivo local está com algum item faltando que existe no server_manifest
            if (manifest) {
                const pulledRendaIds = new Set((updates.origens_renda || []).map(r => String(r.id)));
                const pulledContasIds = new Set((updates.contas_bancarias || []).map(c => String(c.id)));
                const pulledMovsIds = new Set((updates.movimentacoes || []).map(m => String(m.id)));

                let needsFullPull = false;

                for (const sItem of (manifest.movimentacoes || [])) {
                    const sId = String(sItem.id);
                    if (pulledMovsIds.has(sId)) continue;
                    const lItem = localMovsMap.get(sId);
                    const sDeleted = Number(sItem.deleted || 0) === 1;
                    if (!lItem && !sDeleted) {
                        needsFullPull = true;
                        break;
                    }
                    if (lItem) {
                        const lDeleted = Number(lItem.deleted || 0) === 1;
                        const sTime = Number(sItem.updated_at || 0);
                        const lTime = Number(lItem.updated_at || 0);
                        if ((sTime > lTime && lItem.sync_status === 'synced') || (sDeleted && !lDeleted)) {
                            needsFullPull = true;
                            break;
                        }
                    }
                }

                if (!needsFullPull) {
                    for (const sItem of (manifest.contas_bancarias || [])) {
                        const sId = String(sItem.id);
                        if (pulledContasIds.has(sId)) continue;
                        const lItem = localContasMap.get(sId);
                        const sDeleted = Number(sItem.deleted || 0) === 1;
                        if ((!lItem && !sDeleted) || (lItem && Number(sItem.updated_at || 0) > Number(lItem.updated_at || 0) && lItem.sync_status === 'synced')) {
                            needsFullPull = true;
                            break;
                        }
                    }
                }

                if (!needsFullPull) {
                    for (const sItem of (manifest.origens_renda || [])) {
                        const sId = String(sItem.id);
                        if (pulledRendaIds.has(sId)) continue;
                        const lItem = localRendaMap.get(sId);
                        const sDeleted = Number(sItem.deleted || 0) === 1;
                        if ((!lItem && !sDeleted) || (lItem && Number(sItem.updated_at || 0) > Number(lItem.updated_at || 0) && lItem.sync_status === 'synced')) {
                            needsFullPull = true;
                            break;
                        }
                    }
                }

                if (needsFullPull) {
                    console.log('[SYNC] Detectada diferença no manifesto do servidor. Executando sincronização completa...');
                    const fullPullUrl = currentUserId
                        ? `/api/sync/pull?lastSync=0&userId=${encodeURIComponent(currentUserId)}&_t=${Date.now()}`
                        : `/api/sync/pull?lastSync=0&_t=${Date.now()}`;
                    const fullRes = await fetch(fullPullUrl, {
                        headers,
                        cache: 'no-store',
                        signal: AbortSignal.timeout(60000)
                    });
                    if (fullRes.ok) {
                        updates = await fullRes.json();
                    }
                }
            }

            // 3. Aplica atualizações recebidas do servidor no IndexedDB local (protegendo edições e exclusões locais mais recentes)
            let houveAlteracaoLocal = false;
            await dbLocal.transaction('rw', dbLocal.origens_renda, dbLocal.contas_bancarias, dbLocal.movimentacoes, async () => {
                for (let item of (updates.origens_renda || [])) {
                    item.id = String(item.id);
                    const localItem = localRendaMap.get(item.id);
                    if (localItem) {
                        if (Number(localItem.deleted || 0) === 1 && localItem.sync_status !== 'synced') continue;
                        if (localItem.sync_status !== 'synced' && Number(localItem.updated_at || 0) >= Number(item.updated_at || 0)) continue;
                    }
                    if (!isNaN(item.id)) {
                        try { await dbLocal.origens_renda.delete(Number(item.id)); } catch(e) {}
                    }
                    const mudou = !localItem || Number(localItem.updated_at || 0) !== Number(item.updated_at || 0) || Number(localItem.deleted || 0) !== Number(item.deleted || 0);
                    item.sync_status = 'synced';
                    await dbLocal.origens_renda.put(item);
                    localRendaMap.set(item.id, item);
                    if (mudou) houveAlteracaoLocal = true;
                }

                for (let item of (updates.contas_bancarias || [])) {
                    item.id = String(item.id);
                    const localItem = localContasMap.get(item.id);
                    if (localItem) {
                        if (Number(localItem.deleted || 0) === 1 && localItem.sync_status !== 'synced') continue;
                        if (localItem.sync_status !== 'synced' && Number(localItem.updated_at || 0) >= Number(item.updated_at || 0)) continue;
                    }
                    if (!isNaN(item.id)) {
                        try { await dbLocal.contas_bancarias.delete(Number(item.id)); } catch(e) {}
                    }
                    const mudou = !localItem || Number(localItem.updated_at || 0) !== Number(item.updated_at || 0) || Number(localItem.deleted || 0) !== Number(item.deleted || 0);
                    item.sync_status = 'synced';
                    await dbLocal.contas_bancarias.put(item);
                    localContasMap.set(item.id, item);
                    if (mudou) houveAlteracaoLocal = true;
                }

                for (let item of (updates.movimentacoes || [])) {
                    item.id = String(item.id);
                    const localItem = localMovsMap.get(item.id);
                    if (localItem) {
                        // Se foi excluído localmente e ainda está pendente de subir pro servidor, NUNCA ressuscitar!
                        if (Number(localItem.deleted || 0) === 1 && localItem.sync_status !== 'synced') continue;
                        // Se tem edição local pendente mais recente, preservar local!
                        if (localItem.sync_status !== 'synced' && Number(localItem.updated_at || 0) >= Number(item.updated_at || 0)) continue;
                    }
                    // Remove chave numérica legada para não manter duplicata de chave no IndexedDB
                    if (!isNaN(item.id)) {
                        try { await dbLocal.movimentacoes.delete(Number(item.id)); } catch(e) {}
                    }
                    const mudou = !localItem ||
                        Number(localItem.updated_at || 0) !== Number(item.updated_at || 0) ||
                        Number(localItem.deleted || 0) !== Number(item.deleted || 0) ||
                        localItem.descricao !== item.descricao ||
                        Number(localItem.valor_total || 0) !== Number(item.valor_total || 0) ||
                        localItem.status !== item.status ||
                        localItem.midia_url !== item.midia_url;
                    item.sync_status = 'synced';
                    await dbLocal.movimentacoes.put(item);
                    localMovsMap.set(item.id, item);
                    if (mudou) houveAlteracaoLocal = true;
                }
            });

            if (houveAlteracaoLocal) {
                atualizarUIAposSync();
            }

            // 4. Reconciliação Local -> Servidor (PUSH):
            // Envia qualquer item que esteja pendente OU que exista no aparelho (ex: "Carro" no celular) mas ainda não esteja no servidor!
            const serverRendaMap = new Map(((manifest && manifest.origens_renda) || []).map(r => [String(r.id), r]));
            const serverContasMap = new Map(((manifest && manifest.contas_bancarias) || []).map(c => [String(c.id), c]));
            const serverMovsMap = new Map(((manifest && manifest.movimentacoes) || []).map(m => [String(m.id), m]));

            const shouldPushItem = (item, serverMap) => {
                if (!item || item.id === undefined || item.id === null) return false;
                if (item.sync_status !== 'synced') return true;
                if (!manifest) return false;
                const sEntry = serverMap.get(String(item.id));
                const localDeleted = Number(item.deleted || 0) === 1;
                if (!sEntry) {
                    return !localDeleted; // Existe no aparelho e não está excluído, mas falta no servidor!
                }
                const serverDeleted = Number(sEntry.deleted || 0) === 1;
                if (localDeleted !== serverDeleted) return true;
                if (Number(item.updated_at || 0) > Number(sEntry.updated_at || 0)) return true;
                return false;
            };

            const pendingRenda = Array.from(localRendaMap.values()).filter(r => shouldPushItem(r, serverRendaMap));
            const pendingContas = Array.from(localContasMap.values()).filter(c => shouldPushItem(c, serverContasMap));
            const pendingMovimentacoes = Array.from(localMovsMap.values()).filter(m => shouldPushItem(m, serverMovsMap));

            if (currentUserId) {
                pendingRenda.forEach(r => { if (!r.user_id) r.user_id = currentUserId; });
                pendingContas.forEach(c => { if (!c.user_id) c.user_id = currentUserId; });
                pendingMovimentacoes.forEach(m => { if (!m.user_id) m.user_id = currentUserId; });
            }

            // Separa movimentações leves das que possuem fotos/vídeos pesados (> 80KB) para upload resiliente
            const lightMovs = pendingMovimentacoes.filter(m => !m.midia_url || String(m.midia_url).length <= 80000);
            const heavyMovs = pendingMovimentacoes.filter(m => m.midia_url && String(m.midia_url).length > 80000);

            // 4A. Envia lote rápido (itens leves)
            if (pendingRenda.length > 0 || pendingContas.length > 0 || lightMovs.length > 0) {
                const pushResponse = await fetch('/api/sync/push', {
                    method: 'POST',
                    headers: headers,
                    signal: AbortSignal.timeout(45000),
                    body: JSON.stringify({
                        userId: currentUserId,
                        origens_renda: pendingRenda,
                        contas_bancarias: pendingContas,
                        movimentacoes: lightMovs
                    })
                });

                if (pushResponse.ok) {
                    const pushResData = await pushResponse.json().catch(() => ({}));
                    const srvTs = pushResData.timestamp || Date.now();
                    await dbLocal.transaction('rw', dbLocal.origens_renda, dbLocal.contas_bancarias, dbLocal.movimentacoes, async () => {
                        for (let item of pendingRenda) {
                            await dbLocal.origens_renda.update(item.id, {
                                sync_status: 'synced',
                                user_id: currentUserId || item.user_id,
                                updated_at: Math.max(Number(item.updated_at) || 0, srvTs)
                            });
                        }
                        for (let item of pendingContas) {
                            await dbLocal.contas_bancarias.update(item.id, {
                                sync_status: 'synced',
                                user_id: currentUserId || item.user_id,
                                updated_at: Math.max(Number(item.updated_at) || 0, srvTs)
                            });
                        }
                        for (let item of lightMovs) {
                            await dbLocal.movimentacoes.update(item.id, {
                                sync_status: 'synced',
                                user_id: currentUserId || item.user_id,
                                updated_at: Math.max(Number(item.updated_at) || 0, srvTs)
                            });
                        }
                    });
                }
            }

            // 4B. Envia itens com fotos/vídeos pesados (ex: Metas & Desejos com foto + vídeo) individualmente com timeout estendido (120s)
            for (const heavyItem of heavyMovs) {
                try {
                    const heavyPushRes = await fetch('/api/sync/push', {
                        method: 'POST',
                        headers: headers,
                        signal: AbortSignal.timeout(120000),
                        body: JSON.stringify({
                            userId: currentUserId,
                            origens_renda: [],
                            contas_bancarias: [],
                            movimentacoes: [heavyItem]
                        })
                    });

                    if (heavyPushRes.ok) {
                        const heavyResData = await heavyPushRes.json().catch(() => ({}));
                        const srvTs = heavyResData.timestamp || Date.now();
                        await dbLocal.movimentacoes.update(heavyItem.id, {
                            sync_status: 'synced',
                            user_id: currentUserId || heavyItem.user_id,
                            updated_at: Math.max(Number(heavyItem.updated_at) || 0, srvTs)
                        });
                    }
                } catch (heavyErr) {
                    console.warn('[SYNC] Falha ao enviar mídia pesada:', heavyItem.descricao, heavyErr);
                }
            }

            // Atualiza lastSyncTimestamp
            let maxTime = lastSync;
            ['origens_renda', 'contas_bancarias', 'movimentacoes'].forEach(table => {
                if (updates[table]) {
                    updates[table].forEach(r => {
                        const t = Number(r.updated_at || 0);
                        if (t > maxTime) maxTime = t;
                    });
                }
            });
            localStorage.setItem('lastSyncTimestamp', maxTime.toString());
        }

        const ind = document.getElementById('syncStatusIndicator');
        if (ind) {
            ind.innerText = 'Sincronizado';
            ind.style.color = '#10B981';
        }

        window.setOnlineStatus(true);
    } catch (error) {
        console.warn('Falha na sincronização:', error);
        window.setOnlineStatus(false);
    } finally {
        isSyncInProgress = false;
        if (pendingSyncRetry) {
            pendingSyncRetry = false;
            setTimeout(syncFinanceWithServer, 500);
        }
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
    setTimeout(syncFinanceWithServer, 400);
});

// Sincronização imediata ao focar na janela ou alternar entre aplicativos no celular/computador
window.addEventListener('focus', () => {
    syncFinanceWithServer();
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncFinanceWithServer();
    }
});

// Sincronização contínua em segundo plano a cada 8 segundos enquanto o app estiver aberto
setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
        syncFinanceWithServer();
    }
}, 8000);

