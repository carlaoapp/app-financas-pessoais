/**
 * finance-cartoes.js - Gestão Completa de Cartões de Crédito, Contas Bancárias e Subtrações Automáticas
 * APP Finanças Pessoais
 */

// Função universal de formatação em BRL com suporte estrito a modo privacidade
function formatBRL(value) {
    if (window.privacyMode) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
window.formatBRL = formatBRL;

// Estado local da tela de cartões
window.cartaoEmEdicaoId = null;
window.subAbaCartoesAtiva = localStorage.getItem('financas_subaba_cartoes') || 'credito';

// Alterna entre as sub-visões organizadas da tela de cartões (Crédito, Alimentação, Bancos, Todos)
function alternarSubAbaCartoes(subAba) {
    if (!['credito', 'alimentacao', 'bancos', 'todos'].includes(subAba)) {
        subAba = 'credito';
    }
    window.subAbaCartoesAtiva = subAba;
    try {
        localStorage.setItem('financas_subaba_cartoes', subAba);
    } catch (e) {}

    // 1. Atualiza visual dos botões de sub-abas
    const tabsConfig = [
        { id: 'subtabCartoesCredito', key: 'credito', color: '#2563EB', border: '#3B82F6' },
        { id: 'subtabCartoesAlimentacao', key: 'alimentacao', color: '#EA580C', border: '#F97316' },
        { id: 'subtabCartoesBancos', key: 'bancos', color: '#059669', border: '#10B981' },
        { id: 'subtabCartoesTodos', key: 'todos', color: '#475569', border: '#64748B' }
    ];

    tabsConfig.forEach(cfg => {
        const btn = document.getElementById(cfg.id);
        if (!btn) return;
        const isActive = cfg.key === subAba;
        if (isActive) {
            btn.style.background = cfg.color;
            btn.style.borderColor = cfg.border;
            btn.style.color = '#FFFFFF';
            btn.style.boxShadow = `0 4px 12px ${cfg.color}55`;
        } else {
            btn.style.background = '#1E293B';
            btn.style.borderColor = '#334155';
            btn.style.color = '#94A3B8';
            btn.style.boxShadow = 'none';
        }
    });

    // 2. Visibilidade das Métricas no topo
    const boxContas = document.getElementById('metricBoxContas');
    const boxAlim = document.getElementById('metricBoxAlimentacao');
    const boxFat = document.getElementById('metricBoxFatura');
    const boxLim = document.getElementById('metricBoxLimite');
    const boxDisp = document.getElementById('metricBoxDisponivel');

    if (boxContas) boxContas.style.display = (subAba === 'bancos' || subAba === 'todos') ? 'block' : 'none';
    if (boxAlim) boxAlim.style.display = (subAba === 'alimentacao' || subAba === 'todos') ? 'block' : 'none';
    if (boxFat) boxFat.style.display = (subAba === 'credito' || subAba === 'todos') ? 'block' : 'none';
    if (boxLim) boxLim.style.display = (subAba === 'credito' || subAba === 'todos') ? 'block' : 'none';
    if (boxDisp) boxDisp.style.display = (subAba === 'credito' || subAba === 'todos') ? 'block' : 'none';

    // 3. Visibilidade das Seções de Cartões e Bancos
    const secCredito = document.getElementById('secaoCartoesCredito');
    const secAlim = document.getElementById('secaoCartoesAlimentacao');
    const secBancos = document.getElementById('secaoCartoesBancos');

    if (secCredito) secCredito.style.display = (subAba === 'credito' || subAba === 'todos') ? 'block' : 'none';
    if (secAlim) secAlim.style.display = (subAba === 'alimentacao' || subAba === 'todos') ? 'block' : 'none';
    if (secBancos) secBancos.style.display = (subAba === 'bancos' || subAba === 'todos') ? 'block' : 'none';

    // 4. Ações de cadastro e leitura agora ficam diretamente em cada seção de cartões
    if (typeof atualizarFiltroCartoesPorSubAba === 'function') atualizarFiltroCartoesPorSubAba();
}
window.alternarSubAbaCartoes = alternarSubAbaCartoes;

// Abre modal de criação já com o tipo correto baseado na sub-aba em visualização
function abrirModalNovoItemSubAba() {
    const sub = window.subAbaCartoesAtiva || 'credito';
    let tipo = 'Cartão de Crédito';
    if (sub === 'alimentacao') tipo = 'Cartão Alimentação';
    else if (sub === 'bancos') tipo = 'Conta Corrente';
    abrirModalGerenciarConta('novo', tipo);
}
window.abrirModalNovoItemSubAba = abrirModalNovoItemSubAba;

// Popula o <select id="inputContaId"> do modal de lançamento de despesas/receitas
async function carregarSelectContasModal(contaIdSelecionada = '') {
    const sel = document.getElementById('inputContaId');
    if (!sel) return;

    let contas = [];
    try {
        if (typeof dbLocal !== 'undefined' && dbLocal && dbLocal.contas_bancarias) {
            contas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
        }
    } catch (e) {
        console.warn('Erro ao carregar contas para select:', e);
    }

    sel.innerHTML = '<option value="">🏦 Selecione o Cartão ou Conta (Opcional)...</option>';

    if (contas.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.innerText = '➕ Nenhuma conta cadastrada (Clique em Novo ao lado)';
        sel.appendChild(opt);
        return;
    }

    // Agrupa por Cartões de Crédito, Cartões Alimentação & Benefícios e Contas Correntes
    const cartoes = contas.filter(c => c.tipo_conta === 'Cartão de Crédito');
    const alimentacao = contas.filter(c => c.tipo_conta === 'Cartão Alimentação');
    const correntes = contas.filter(c => c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação');

    // Se nenhuma conta foi pré-selecionada e o tipo for Receita ou despesa de débito, sugere Sicredi por padrão
    if (!contaIdSelecionada) {
        const tipoAtual = document.getElementById('inputTipoGasto')?.value;
        if (tipoAtual === 'Receita') {
            const sicredi = correntes.find(c => (c.nome_conta + ' ' + (c.banco || '')).toLowerCase().includes('sicredi'));
            if (sicredi) contaIdSelecionada = sicredi.id;
        }
    }

    if (cartoes.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = '💳 Cartões de Crédito';
        cartoes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.dataset.tipo = c.tipo_conta;
            const lim = parseFloat(c.limite_cartao) || 0;
            const tit = c.titular ? ` [👤 ${c.titular}]` : '';
            opt.innerText = `💳 ${c.nome_conta}${tit} (Limite: ${formatBRL(lim)})`;
            if (String(c.id) === String(contaIdSelecionada)) opt.selected = true;
            grp.appendChild(opt);
        });
        sel.appendChild(grp);
    }

    if (alimentacao.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = '🍽️ Cartões Alimentação & Benefícios';
        alimentacao.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.dataset.tipo = c.tipo_conta;
            const sal = parseFloat(c.saldo_atual) || 0;
            const tit = c.titular ? ` [👤 ${c.titular}]` : '';
            opt.innerText = `🍽️ ${c.nome_conta}${tit} (Saldo: ${formatBRL(sal)})`;
            if (String(c.id) === String(contaIdSelecionada)) opt.selected = true;
            grp.appendChild(opt);
        });
        sel.appendChild(grp);
    }

    if (correntes.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = '🏦 Contas Correntes & Bancos';
        correntes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.dataset.tipo = c.tipo_conta;
            const sal = parseFloat(c.saldo_atual) || 0;
            const tit = c.titular ? ` [👤 ${c.titular}]` : '';
            opt.innerText = `🏦 ${c.nome_conta}${tit} (Saldo: ${formatBRL(sal)})`;
            if (String(c.id) === String(contaIdSelecionada)) opt.selected = true;
            grp.appendChild(opt);
        });
        sel.appendChild(grp);
    }
}
window.carregarSelectContasModal = carregarSelectContasModal;

// Sincronização automática entre o seletor de contas e o tipo de gasto no modal de lançamento
async function aoMudarContaLancamento(contaId) {
    if (!contaId) return;
    try {
        const conta = await dbLocal.contas_bancarias.get(contaId);
        if (!conta) return;
        const selTipo = document.getElementById('inputTipoGasto');
        if (selTipo) {
            if (conta.tipo_conta === 'Cartão de Crédito') {
                selTipo.value = 'Cartão de Crédito';
            } else if (conta.tipo_conta === 'Cartão Alimentação') {
                selTipo.value = 'Cartão Alimentação';
            }
            if (typeof atualizarTextoStatus === 'function') atualizarTextoStatus();
        }
    } catch(e) {}
}
window.aoMudarContaLancamento = aoMudarContaLancamento;

async function aoMudarTipoGastoLancamento(tipoGasto) {
    if (typeof atualizarTextoStatus === 'function') atualizarTextoStatus();
    const selConta = document.getElementById('inputContaId');
    if (!selConta) return;

    try {
        if (tipoGasto === 'Cartão de Crédito') {
            const optAtual = selConta.selectedOptions[0];
            if (optAtual && optAtual.dataset.tipo === 'Cartão de Crédito') return;
            for (let i = 0; i < selConta.options.length; i++) {
                if (selConta.options[i].dataset.tipo === 'Cartão de Crédito') {
                    selConta.selectedIndex = i;
                    break;
                }
            }
        } else if (tipoGasto === 'Cartão Alimentação') {
            const optAtual = selConta.selectedOptions[0];
            if (optAtual && optAtual.dataset.tipo === 'Cartão Alimentação') return;
            for (let i = 0; i < selConta.options.length; i++) {
                if (selConta.options[i].dataset.tipo === 'Cartão Alimentação') {
                    selConta.selectedIndex = i;
                    break;
                }
            }
        } else if (tipoGasto === 'Receita') {
            // Conta central de recebimento: Sicredi
            for (let i = 0; i < selConta.options.length; i++) {
                const txt = selConta.options[i].innerText.toLowerCase();
                if (txt.includes('sicredi')) {
                    selConta.selectedIndex = i;
                    break;
                }
            }
        }
    } catch(e) {}
}
window.aoMudarTipoGastoLancamento = aoMudarTipoGastoLancamento;

// Carrega e renderiza a tela dedicada de Cartões e Contas
async function carregarCartoesEContas() {
    if (typeof dbLocal === 'undefined' || !dbLocal) return;

    let targetMonth = (typeof currentViewDate !== 'undefined' && currentViewDate) ? currentViewDate.getMonth() : (new Date()).getMonth();
    let targetYear = (typeof currentViewDate !== 'undefined' && currentViewDate) ? currentViewDate.getFullYear() : (new Date()).getFullYear();

    const selMes = document.getElementById('mesBaseSelector');
    if (selMes && selMes.value !== '') targetMonth = parseInt(selMes.value, 10);
    const selAno = document.getElementById('anoBaseSelector');
    if (selAno && selAno.value !== '') targetYear = parseInt(selAno.value, 10);

    let contas = [];
    let movs = [];
    try {
        contas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
        movs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
    } catch (e) {
        console.error("Erro ao carregar dados de cartões:", e);
        return;
    }

    // Auto-sanitização dos nomes das contas bancárias para corrigir conflitos (ex: "Banco do Brasil Conta Corrente" com tipo "Conta Salário")
    for (let c of contas) {
        if (c.tipo_conta && c.tipo_conta !== 'Conta Corrente' && c.nome_conta && c.nome_conta.toLowerCase().includes('conta corrente')) {
            const novoNome = c.nome_conta.replace(/\s+Conta\s+Corrente/gi, '').trim();
            if (novoNome) {
                c.nome_conta = novoNome;
                try {
                    await dbLocal.contas_bancarias.update(c.id, {
                        nome_conta: novoNome,
                        sync_status: 'pending_update',
                        updated_at: Date.now()
                    });
                } catch(e) {}
            }
        }
        // Auto-correção para Cartão Alimentação onde valor_recarga foi gravado incorretamente como 10 (devido à divisão indevida de 1000 por 100)
        if (c.tipo_conta === 'Cartão Alimentação' && parseFloat(c.valor_recarga) === 10) {
            c.valor_recarga = 1000;
            try {
                await dbLocal.contas_bancarias.update(c.id, {
                    valor_recarga: 1000,
                    sync_status: 'pending_update',
                    updated_at: Date.now()
                });
                if (typeof sincronizarDados === 'function') sincronizarDados();
            } catch(e) {}
        }
    }

    // Filtra compras do mês alvo
    const movsDoMes = movs.filter(m => {
        if (!m.data_lancamento) return false;
        const [anoStr, mesStr] = m.data_lancamento.split('-');
        return parseInt(anoStr, 10) === targetYear && (parseInt(mesStr, 10) - 1) === targetMonth;
    });

    // Totais e Métricas
    let saldoTotalContas = 0;
    let saldoTotalAlimentacao = 0;
    let limiteTotalCartoes = 0;
    let faturaTotalMes = 0;
    let faturasPorCartao = {};
    let lancamentosPorCartao = {};
    let lancamentosPorConta = {};

    contas.forEach(c => {
        lancamentosPorConta[c.id] = [];
        if (c.tipo_conta === 'Cartão de Crédito') {
            limiteTotalCartoes += (parseFloat(c.limite_cartao) || 0);
            faturasPorCartao[c.id] = 0;
            lancamentosPorCartao[c.id] = [];
        } else if (c.tipo_conta === 'Cartão Alimentação') {
            saldoTotalAlimentacao += (parseFloat(c.saldo_atual) || 0);
            lancamentosPorCartao[c.id] = [];
        } else {
            saldoTotalContas += (parseFloat(c.saldo_atual) || 0);
        }
    });

    const cartoesCredito = contas.filter(c => c.tipo_conta === 'Cartão de Crédito');

    // Calcula faturas por cartão e total geral
    movsDoMes.forEach(m => {
        const val = parseFloat(m.valor_total) || 0;
        if (m.tipo_gasto === 'Cartão de Crédito' && m.status !== 'Cancelado') {
            faturaTotalMes += val;
            if (m.conta_id && faturasPorCartao.hasOwnProperty(m.conta_id)) {
                faturasPorCartao[m.conta_id] += val;
                lancamentosPorCartao[m.conta_id].push(m);
            } else if (cartoesCredito.length === 1) {
                faturasPorCartao[cartoesCredito[0].id] += val;
                lancamentosPorCartao[cartoesCredito[0].id].push(m);
            } else if (cartoesCredito.length > 0) {
                faturasPorCartao[cartoesCredito[0].id] += val;
                lancamentosPorCartao[cartoesCredito[0].id].push(m);
            }
        }
        if (m.tipo_gasto === 'Cartão Alimentação') {
            const alimList = contas.filter(c => c.tipo_conta === 'Cartão Alimentação');
            if (m.conta_id && lancamentosPorCartao[m.conta_id]) {
                lancamentosPorCartao[m.conta_id].push(m);
            } else if (alimList.length === 1) {
                lancamentosPorCartao[alimList[0].id].push(m);
            }
        }
        if (m.conta_id && lancamentosPorConta[m.conta_id]) {
            lancamentosPorConta[m.conta_id].push(m);
        }
    });

    const limiteDisponivelTotal = Math.max(0, limiteTotalCartoes - faturaTotalMes);

    // Atualiza cards de métricas no topo
    const elSaldo = document.getElementById('metricSaldoTotalContas');
    if (elSaldo) elSaldo.innerText = formatBRL(saldoTotalContas);
    const elSaldoAlim = document.getElementById('metricSaldoTotalAlimentacao');
    if (elSaldoAlim) elSaldoAlim.innerText = formatBRL(saldoTotalAlimentacao);
    const elFatura = document.getElementById('metricFaturaTotalMes');
    if (elFatura) elFatura.innerText = formatBRL(faturaTotalMes);
    const elLimTot = document.getElementById('metricLimiteTotalCartoes');
    if (elLimTot) elLimTot.innerText = formatBRL(limiteTotalCartoes);
    const elLimDisp = document.getElementById('metricLimiteDisponivelTotal');
    if (elLimDisp) elLimDisp.innerText = formatBRL(limiteDisponivelTotal);

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const lblMes = document.getElementById('lblFiltroMesCartoes');
    if (lblMes) lblMes.innerText = `Fatura e Lançamentos de ${meses[targetMonth]} / ${targetYear}`;

    // 1. RENDERIZA MEUS CARTÕES DE CRÉDITO & DÉBITO
    const cartoesGrid = document.getElementById('gridCartoesCreditoContainer');
    const badgeCartoes = document.getElementById('badgeQtdCartoes');
    const cartoesList = contas.filter(c => c.tipo_conta === 'Cartão de Crédito' || c.tipo_conta === 'Cartão de Débito');
    if (badgeCartoes) badgeCartoes.innerText = `${cartoesList.length} ${cartoesList.length === 1 ? 'cartão' : 'cartões'}`;

    if (cartoesGrid) {
        cartoesGrid.innerHTML = '';
        if (cartoesList.length === 0) {
            cartoesGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 26px; text-align: center; background: #0F172A; border: 1.5px dashed #334155; border-radius: 14px; color: #94A3B8;">
                    <div style="font-size: 2rem; margin-bottom: 6px;">💳</div>
                    <div style="font-weight: 700; color: #FFFFFF; font-size: 1rem;">Nenhum cartão cadastrado</div>
                    <p style="font-size: 0.82rem; margin: 4px 0 14px 0;">Cadastre seus cartões de crédito ou débito (ex: Sicredi Visa Gold, Nubank, Itaú) para controlar limites e faturas.</p>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button type="button" onclick="abrirModalGerenciarConta('novo', 'Cartão de Crédito')" style="background: #2563EB; color: white; border: none; padding: 9px 18px; border-radius: 9px; font-weight: 800; cursor: pointer; font-size: 0.88rem; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                            ➕ Cadastrar Novo Cartão
                        </button>
                        <button type="button" onclick="abrirModalLancamentoComLeitura()" style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; color: #6EE7B7; padding: 9px 18px; border-radius: 9px; font-weight: 800; cursor: pointer; font-size: 0.88rem;">
                            📷 Ler Notificação / Print
                        </button>
                    </div>
                </div>
            `;
        } else {
            cartoesList.forEach(cartao => {
                const isDebito = cartao.tipo_conta === 'Cartão de Débito';
                const limTotal = parseFloat(cartao.limite_cartao) || 0;
                const faturaAtual = faturasPorCartao[cartao.id] || 0;
                const limDisp = Math.max(0, limTotal - faturaAtual);
                const percUsado = limTotal > 0 ? Math.min(100, Math.round((faturaAtual / limTotal) * 100)) : 0;
                const cor = cartao.cor_cartao || (isDebito ? '#059669' : '#2563EB');

                const comprasCard = lancamentosPorCartao[cartao.id] || [];
                const cardEl = document.createElement('div');
                cardEl.style.cssText = `
                    background: linear-gradient(135deg, ${cor}ee 0%, #0F172A 90%);
                    border: 1.5px solid ${cor};
                    border-radius: 16px;
                    padding: 18px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    color: white;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                    overflow: hidden;
                `;

                cardEl.innerHTML = `
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.4rem;">💳</span>
                                <div>
                                    <div style="font-weight: 800; font-size: 1.05rem; letter-spacing: 0.5px;">${cartao.nome_conta}</div>
                                    ${cartao.titular ? `<div style="font-size: 0.72rem; color: #E2E8F0; opacity: 0.88; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: 1px;"><span>👤</span> ${cartao.titular}</div>` : ''}
                                </div>
                            </div>
                            <span style="font-size: 0.72rem; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 6px; font-weight: 700;">
                                ${isDebito ? 'Débito' : `Vence dia ${cartao.dia_vencimento || 10}`}
                            </span>
                        </div>

                        ${isDebito ? `
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 0.72rem; color: #CBD5E1; text-transform: uppercase; font-weight: 600;">Saldo Disponível no Cartão</div>
                            <div style="font-size: 1.45rem; font-weight: 900; color: #10B981; margin-top: 2px;">${formatBRL(cartao.saldo_atual || 0)}</div>
                        </div>
                        ` : `
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 0.72rem; color: #CBD5E1; text-transform: uppercase; font-weight: 600;">Fatura do Mês (${meses[targetMonth]})</div>
                            <div style="font-size: 1.45rem; font-weight: 900; color: #FFFFFF; margin-top: 2px;">${formatBRL(faturaAtual)}</div>
                        </div>

                        <!-- Barra de Uso do Limite -->
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #E2E8F0; margin-bottom: 4px; font-weight: 600;">
                                <span>Disp: <strong style="color: #6EE7B7;">${formatBRL(limDisp)}</strong></span>
                                <span>Limite: ${formatBRL(limTotal)}</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.5); border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15);">
                                <div style="width: ${window.privacyMode ? 0 : percUsado}%; height: 100%; background: ${percUsado > 85 ? '#EF4444' : (percUsado > 50 ? '#F59E0B' : '#10B981')}; border-radius: 4px; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #CBD5E1; margin-bottom: 12px;">
                            <span>Fechamento: Dia ${cartao.dia_fechamento || 1}</span>
                            <span>Uso: ${window.privacyMode ? '•••%' : percUsado + '%'}</span>
                        </div>

                        <!-- Lista de Lançamentos da Fatura -->
                        <div style="margin-bottom: 14px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; font-weight: 700; color: #E2E8F0; margin-bottom: 6px;">
                                <span>📋 Compras nesta Fatura (${comprasCard.length})</span>
                                <span style="color: #6EE7B7; font-weight: 800;">${formatBRL(faturaAtual)}</span>
                            </div>
                            ${comprasCard.length === 0 ? `
                                <div style="font-size: 0.72rem; color: #94A3B8; text-align: center; padding: 4px 0;">Nenhuma compra nesta fatura</div>
                            ` : `
                                <div style="display: flex; flex-direction: column; gap: 5px; max-height: 110px; overflow-y: auto;">
                                    ${comprasCard.map(item => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.73rem; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px;">
                                            <span style="color: #FFFFFF; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;" title="${item.descricao}">${item.descricao}</span>
                                            <span style="color: #F87171; font-weight: 800; white-space: nowrap;">- ${formatBRL(item.valor_total)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                        `}
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
                        ${isDebito ? `
                        <button type="button" onclick="ajustarSaldoConta('${cartao.id}')" style="height: 40px; background: linear-gradient(135deg, #2563EB, #1D4ED8); border: none; color: #FFFFFF; border-radius: 10px; font-weight: 800; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.35); transition: all 0.2s;">
                            <span>💰</span> Ajustar Saldo
                        </button>
                        ` : `
                        <button type="button" onclick="pagarFaturaCartao('${cartao.id}')" style="height: 40px; background: linear-gradient(135deg, #10B981, #059669); color: #FFFFFF; border: none; border-radius: 10px; font-weight: 800; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.35); transition: all 0.2s;">
                            <span>💵</span> Pagar Fatura
                        </button>
                        `}
                        <button type="button" onclick="abrirModalGerenciarConta('${cartao.id}')" style="height: 40px; background: rgba(255,255,255,0.12); color: #FFFFFF; border: 1.5px solid rgba(255,255,255,0.28); border-radius: 10px; font-weight: 800; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                            <span>✏️</span> Editar
                        </button>
                    </div>
                `;
                cartoesGrid.appendChild(cardEl);
            });

            // Card de Adicionar Novo Cartão / Ler Print ao final da lista
            const cardAddEl = document.createElement('div');
            cardAddEl.style.cssText = `
                border: 2px dashed #334155;
                border-radius: 16px;
                padding: 18px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                background: rgba(15, 23, 42, 0.4);
                text-align: center;
                min-height: 180px;
            `;
            cardAddEl.innerHTML = `
                <div style="font-size: 1.8rem;">💳</div>
                <button type="button" onclick="abrirModalGerenciarConta('novo', 'Cartão de Crédito')" style="background: #2563EB; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    ➕ Novo Cartão
                </button>
                <button type="button" onclick="abrirModalLancamentoComLeitura()" style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; color: #6EE7B7; padding: 7px 14px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    📷 Ler Notificação / Print
                </button>
            `;
            cartoesGrid.appendChild(cardAddEl);
        }
    }

    // 2. RENDERIZA CARTÕES ALIMENTAÇÃO & BENEFÍCIOS
    const alimGrid = document.getElementById('gridCartoesAlimentacaoContainer');
    const badgeAlim = document.getElementById('badgeQtdAlimentacao');
    const alimList = contas.filter(c => c.tipo_conta === 'Cartão Alimentação');
    if (badgeAlim) badgeAlim.innerText = `${alimList.length} ${alimList.length === 1 ? 'cartão' : 'cartões'}`;

    if (alimGrid) {
        alimGrid.innerHTML = '';
        if (alimList.length === 0) {
            alimGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 22px; text-align: center; background: #0F172A; border: 1.5px dashed #334155; border-radius: 14px; color: #94A3B8;">
                    <div style="font-size: 1.8rem; margin-bottom: 6px;">🍽️</div>
                    <div style="font-weight: 700; color: #FFFFFF; font-size: 0.95rem;">Nenhum cartão alimentação ou benefício cadastrado</div>
                    <p style="font-size: 0.8rem; margin: 4px 0 12px 0;">Cadastre seus cartões Alelo, Sodexo/Pluxee, Ticket, VR, Flash ou Caju para controlar o saldo disponível.</p>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button type="button" onclick="abrirModalGerenciarConta('novo', 'Cartão Alimentação')" style="background: linear-gradient(135deg, #EA580C, #F97316); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.82rem; box-shadow: 0 4px 12px rgba(249,115,22,0.3);">
                            ➕ Cadastrar Cartão Alimentação
                        </button>
                        <button type="button" onclick="abrirModalLancamentoComLeitura()" style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; color: #6EE7B7; padding: 8px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.82rem;">
                            📷 Ler Notificação / Print
                        </button>
                    </div>
                </div>
            `;
        } else {
            alimList.forEach(c => {
                const sal = parseFloat(c.saldo_atual) || 0;
                const cor = c.cor_cartao || '#F97316';
                const diaRecarga = c.dia_recarga || 1;
                const valRecarga = parseFloat(c.valor_recarga) || 0;
                const gastosAlim = lancamentosPorCartao[c.id] || [];
                const cardA = document.createElement('div');
                cardA.style.cssText = `
                    background: linear-gradient(135deg, ${cor}dd 0%, #0F172A 85%);
                    border: 1.5px solid ${cor};
                    border-radius: 14px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    color: white;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                `;
                cardA.innerHTML = `
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-weight: 800; color: #FFFFFF; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.3rem;">🍽️</span>
                                <div>
                                    <div>${c.nome_conta}</div>
                                    ${c.titular ? `<div style="font-size: 0.72rem; color: #FED7AA; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: 1px;"><span>👤</span> ${c.titular}</div>` : ''}
                                </div>
                            </div>
                            <span style="font-size: 0.72rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); padding: 2px 7px; border-radius: 6px; font-weight: 700;">Benefício</span>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <span style="font-size: 0.72rem; color: #E2E8F0; font-weight: 600; text-transform: uppercase;">Saldo Disponível no Cartão</span>
                            <div style="font-size: 1.45rem; font-weight: 900; color: #FFFFFF; margin-top: 2px;">
                                ${formatBRL(sal)}
                            </div>
                        </div>

                        <!-- Informações de Recarga Programada -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); padding: 6px 10px; border-radius: 8px; margin-bottom: 12px; color: #FED7AA;">
                            <span>📅 Recarga: Todo dia <strong>${diaRecarga}</strong></span>
                            ${valRecarga > 0 ? `<span>Valor: <strong style="color: #6EE7B7;">${formatBRL(valRecarga)}</strong></span>` : ''}
                        </div>

                        <!-- Lista de Lançamentos do Cartão Alimentação -->
                        <div style="margin-bottom: 14px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; font-weight: 700; color: #E2E8F0; margin-bottom: 6px;">
                                <span>📋 Movimentações do Mês (${gastosAlim.length})</span>
                            </div>
                            ${gastosAlim.length === 0 ? `
                                <div style="font-size: 0.72rem; color: #94A3B8; text-align: center; padding: 4px 0;">Nenhum gasto lançado neste mês</div>
                            ` : `
                                <div style="display: flex; flex-direction: column; gap: 5px; max-height: 110px; overflow-y: auto;">
                                    ${gastosAlim.map(item => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.73rem; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 6px;">
                                            <span style="color: #FFFFFF; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;" title="${item.descricao}">${item.descricao}</span>
                                            <span style="color: ${item.tipo_gasto === 'Receita' ? '#10B981' : '#F87171'}; font-weight: 800; white-space: nowrap;">
                                                ${item.tipo_gasto === 'Receita' ? '+ ' : '- '}${formatBRL(item.valor_total)}
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
                        <button type="button" onclick="ajustarSaldoConta('${c.id}')" style="height: 40px; background: linear-gradient(135deg, #EA580C, #C2410C); color: #FFFFFF; border: none; border-radius: 10px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(234,88,12,0.35); transition: all 0.2s;">
                            <span>💰</span> Ajustar Saldo
                        </button>
                        <button type="button" onclick="abrirModalGerenciarConta('${c.id}')" style="height: 40px; background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.28); color: #FFFFFF; border-radius: 10px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                            <span>✏️</span> Editar
                        </button>
                    </div>
                `;
                alimGrid.appendChild(cardA);
            });

            // Card de Adicionar Novo Cartão Alimentação / Ler Print ao final da lista
            const addAlimEl = document.createElement('div');
            addAlimEl.style.cssText = `
                border: 2px dashed #334155;
                border-radius: 14px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: rgba(15, 23, 42, 0.4);
                text-align: center;
                min-height: 150px;
            `;
            addAlimEl.innerHTML = `
                <div style="font-size: 1.6rem;">🍽️</div>
                <button type="button" onclick="abrirModalGerenciarConta('novo', 'Cartão Alimentação')" style="background: linear-gradient(135deg, #EA580C, #F97316); color: white; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    ➕ Novo Cartão Alimentação
                </button>
                <button type="button" onclick="abrirModalLancamentoComLeitura()" style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; color: #6EE7B7; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    📷 Ler Notificação / Print
                </button>
            `;
            alimGrid.appendChild(addAlimEl);
        }
    }

    // 3. RENDERIZA CONTAS CORRENTES
    const contasGrid = document.getElementById('gridContasBancariasContainer');
    const badgeContas = document.getElementById('badgeQtdContas');
    const contasCorrentesList = contas.filter(c => c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação');
    if (badgeContas) badgeContas.innerText = `${contasCorrentesList.length} ${contasCorrentesList.length === 1 ? 'conta' : 'contas'}`;

    if (contasGrid) {
        contasGrid.innerHTML = '';
        if (contasCorrentesList.length === 0) {
            contasGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 22px; text-align: center; background: #0F172A; border: 1.5px dashed #334155; border-radius: 14px; color: #94A3B8;">
                    <div style="font-weight: 700; color: #FFFFFF; font-size: 0.95rem;">Nenhuma conta corrente cadastrada</div>
                    <p style="font-size: 0.8rem; margin: 4px 0 12px 0;">Cadastre sua conta bancária para subtrair compras no débito e registrar rendas com saldo em tempo real.</p>
                    <button type="button" onclick="abrirModalGerenciarConta('novo', 'Conta Corrente')" style="background: #10B981; color: #0F172A; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.82rem;">
                        ➕ Cadastrar Conta Corrente
                    </button>
                </div>
            `;
        } else {
            contasCorrentesList.forEach(c => {
                const sal = parseFloat(c.saldo_atual) || 0;
                const limCheque = parseFloat(c.limite_cartao) || 0;
                const isNeg = sal < 0;
                const movsConta = lancamentosPorConta[c.id] || [];

                // Determina o nome limpo e sem duplicações do tipo
                let nomeLimpo = (c.nome_conta || c.banco || 'Conta').trim();
                const tiposSufixos = ['Conta Corrente', 'Conta Salário', 'Conta Poupança', 'Cartão de Débito', 'Conta Investimento'];
                tiposSufixos.forEach(t => {
                    if (nomeLimpo.toLowerCase().endsWith(t.toLowerCase())) {
                        const sem = nomeLimpo.slice(0, nomeLimpo.length - t.length).trim();
                        if (sem.length > 0) nomeLimpo = sem;
                    }
                });

                const isSicredi = (nomeLimpo + ' ' + (c.banco || '')).toLowerCase().includes('sicredi');

                // Visual específico e elegante para a única tag do tipo escolhido pelo usuário
                let bgBadgeTipo = '#0F172A';
                let corBadgeTipo = '#94A3B8';
                let borderBadgeTipo = '#334155';
                let iconeConta = '🏦';

                if (c.tipo_conta === 'Conta Salário') {
                    bgBadgeTipo = 'rgba(14, 165, 233, 0.15)';
                    corBadgeTipo = '#38BDF8';
                    borderBadgeTipo = '#0284C7';
                    iconeConta = '💼';
                } else if (c.tipo_conta === 'Conta Poupança') {
                    bgBadgeTipo = 'rgba(168, 85, 247, 0.15)';
                    corBadgeTipo = '#C084FC';
                    borderBadgeTipo = '#7C3AED';
                    iconeConta = '🐷';
                } else if (c.tipo_conta === 'Conta Corrente') {
                    bgBadgeTipo = 'rgba(16, 185, 129, 0.15)';
                    corBadgeTipo = '#6EE7B7';
                    borderBadgeTipo = '#059669';
                    iconeConta = '🏦';
                } else if (c.tipo_conta === 'Cartão de Débito') {
                    bgBadgeTipo = 'rgba(245, 158, 11, 0.15)';
                    corBadgeTipo = '#FCD34D';
                    borderBadgeTipo = '#D97706';
                    iconeConta = '💳';
                } else if (c.tipo_conta === 'Conta Investimento') {
                    bgBadgeTipo = 'rgba(236, 72, 153, 0.15)';
                    corBadgeTipo = '#F472B6';
                    borderBadgeTipo = '#DB2777';
                    iconeConta = '📈';
                }

                const cardC = document.createElement('div');
                cardC.style.cssText = `
                    background: #1E293B;
                    border: 1.5px solid ${isNeg ? '#EF4444' : '#334155'};
                    border-radius: 16px;
                    padding: 18px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: ${isNeg ? '0 4px 18px rgba(239, 68, 68, 0.18)' : '0 4px 12px rgba(0,0,0,0.25)'};
                    transition: all 0.2s;
                `;
                cardC.innerHTML = `
                    <div>
                        <!-- Cabeçalho Organizado: Nome da Conta + Única Tag do Tipo Escolhido -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px;">
                            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(59, 130, 246, 0.12); border: 1.5px solid rgba(59, 130, 246, 0.25); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
                                    ${iconeConta}
                                </div>
                                <div style="min-width: 0;">
                                    <div style="font-weight: 800; color: #FFFFFF; font-size: 1.05rem; letter-spacing: 0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${nomeLimpo}">
                                        ${nomeLimpo}
                                    </div>
                                    ${c.titular ? `<div style="font-size: 0.74rem; color: #94A3B8; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-top: 2px;"><span>👤</span> ${c.titular}</div>` : ''}
                                </div>
                            </div>
                            <div style="flex-shrink: 0;">
                                <span style="font-size: 0.74rem; color: ${corBadgeTipo}; background: ${bgBadgeTipo}; border: 1.5px solid ${borderBadgeTipo}; padding: 3px 9px; border-radius: 7px; font-weight: 700; white-space: nowrap;">
                                    ${c.tipo_conta}
                                </span>
                            </div>
                        </div>

                        <!-- Caixa de Saldo Ampla e Destacada -->
                        <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.72rem; color: ${isNeg ? '#FCA5A5' : '#94A3B8'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;">
                                    ${isNeg ? '⚠️ Saldo Negativo (Cheque Especial)' : 'Saldo Atual em Conta'}
                                </span>
                                ${isSicredi ? '<span style="font-size: 0.68rem; background: rgba(16,185,129,0.18); color: #6EE7B7; border: 1px solid rgba(16,185,129,0.3); padding: 1px 6px; border-radius: 5px; font-weight: 700;">Principal</span>' : ''}
                            </div>
                            <div style="font-size: 1.55rem; font-weight: 900; color: ${sal >= 0 ? '#10B981' : '#EF4444'}; margin-top: 4px; letter-spacing: -0.5px;">
                                ${formatBRL(sal)}
                            </div>
                            ${limCheque > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #94A3B8; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.08);">
                                    <span>🛡️ Cheque Especial: <strong style="color: #A78BFA;">${formatBRL(limCheque)}</strong></span>
                                    <span>Disp: <strong style="color: ${sal + limCheque >= 0 ? '#60A5FA' : '#EF4444'};">${formatBRL(sal + limCheque)}</strong></span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Lista de Lançamentos da Conta -->
                        <div style="margin-bottom: 14px; background: rgba(15, 23, 42, 0.35); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; font-weight: 700; color: #94A3B8; margin-bottom: ${movsConta.length > 0 ? '6px' : '0'};">
                                <span>📋 Lançamentos do Mês</span>
                                <span style="background: rgba(255,255,255,0.08); padding: 1px 7px; border-radius: 10px; font-size: 0.7rem; color: #CBD5E1;">${movsConta.length}</span>
                            </div>
                            ${movsConta.length === 0 ? `
                                <div style="font-size: 0.72rem; color: #64748B; text-align: center; padding: 4px 0;">Nenhuma movimentação neste mês</div>
                            ` : `
                                <div style="display: flex; flex-direction: column; gap: 5px; max-height: 110px; overflow-y: auto;">
                                    ${movsConta.map(item => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.73rem; background: rgba(255,255,255,0.04); padding: 4px 8px; border-radius: 6px;">
                                            <span style="color: #FFFFFF; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${item.descricao}">${item.descricao}</span>
                                            <span style="color: ${item.tipo_gasto === 'Receita' ? '#10B981' : (item.tipo_gasto === 'Transferência Interna' ? '#38BDF8' : '#F87171')}; font-weight: 800; white-space: nowrap;">
                                                ${item.tipo_gasto === 'Receita' ? '+ ' : (item.tipo_gasto === 'Transferência Interna' ? '⇄ ' : '- ')}${formatBRL(item.valor_total)}
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
                        <button type="button" onclick="abrirModalTransferenciaContas('${c.id}')" style="height: 38px; background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10B981; color: #6EE7B7; border-radius: 10px; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s;" title="Transferir de ou para esta conta">
                            <span>🔄</span> Transferir
                        </button>
                        <button type="button" onclick="ajustarSaldoConta('${c.id}')" style="height: 38px; background: rgba(59, 130, 246, 0.15); border: 1.5px solid #3B82F6; color: #93C5FD; border-radius: 10px; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s;" title="Ajustar saldo manualmente">
                            <span>💰</span> Saldo
                        </button>
                        <button type="button" onclick="abrirModalGerenciarConta('${c.id}')" style="height: 38px; background: rgba(255,255,255,0.06); border: 1.5px solid #334155; color: #E2E8F0; border-radius: 10px; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s;" title="Editar conta">
                            <span>✏️</span> Editar
                        </button>
                    </div>
                `;
                contasGrid.appendChild(cardC);
            });

            // Card de Adicionar Nova Conta Bancária ao final da lista
            const addContaEl = document.createElement('div');
            addContaEl.style.cssText = `
                border: 2px dashed #334155;
                border-radius: 16px;
                padding: 18px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                background: rgba(15, 23, 42, 0.4);
                text-align: center;
                min-height: 180px;
            `;
            addContaEl.innerHTML = `
                <div style="font-size: 2rem;">🏦</div>
                <button type="button" onclick="abrirModalGerenciarConta('novo', 'Conta Corrente')" style="background: #10B981; color: #0F172A; border: none; padding: 9px 18px; border-radius: 9px; font-weight: 800; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                    ➕ Nova Conta Bancária
                </button>
            `;
            contasGrid.appendChild(addContaEl);
        }
    }

    // 3. Atualiza Seletor de Cartões no filtro e renderiza compras
    window._cacheContasCartoes = contas;
    window._cacheMovsDoMesCartoes = movsDoMes;
    atualizarFiltroCartoesPorSubAba(contas);

    // Aplica visibilidade da sub-aba ativa (mantém foco e funções de cada tela)
    alternarSubAbaCartoes(window.subAbaCartoesAtiva || 'credito');

    renderizarComprasCartoes(movsDoMes, contas);
    carregarSelectContasModal();
}
window.carregarCartoesEContas = carregarCartoesEContas;

// Atualiza o <select id="filtroCartaoEspecifico"> de acordo com a sub-aba ativa
function atualizarFiltroCartoesPorSubAba(contas = null) {
    const selFiltro = document.getElementById('filtroCartaoEspecifico');
    if (!selFiltro) return;

    const lista = contas || window._cacheContasCartoes || [];
    const sub = window.subAbaCartoesAtiva || 'credito';
    const valAtual = selFiltro.value;

    let contasFiltradas = [];
    let textoPadrao = 'Todos os Cartões';

    if (sub === 'credito') {
        contasFiltradas = lista.filter(c => c.tipo_conta === 'Cartão de Crédito');
        textoPadrao = 'Todos os Cartões de Crédito';
    } else if (sub === 'alimentacao') {
        contasFiltradas = lista.filter(c => c.tipo_conta === 'Cartão Alimentação');
        textoPadrao = 'Todos os Cartões Alimentação';
    } else if (sub === 'bancos') {
        contasFiltradas = lista.filter(c => c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação');
        textoPadrao = 'Todas as Contas Correntes';
    } else {
        contasFiltradas = lista;
        textoPadrao = 'Todos os Cartões & Contas';
    }

    selFiltro.innerHTML = `<option value="">${textoPadrao}</option>`;
    contasFiltradas.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.nome_conta;
        if (String(c.id) === String(valAtual)) opt.selected = true;
        selFiltro.appendChild(opt);
    });
}
window.atualizarFiltroCartoesPorSubAba = atualizarFiltroCartoesPorSubAba;

// Renderiza a lista de compras e lançamentos respeitando a sub-aba ativa
function renderizarComprasCartoes(movsDoMes = null, contas = null) {
    const container = document.getElementById('listaComprasCartoesContainer');
    if (!container) return;

    const filtroCartaoId = document.getElementById('filtroCartaoEspecifico')?.value || '';

    // Se não foram passados diretamente, busca da memória ou recarrega
    if (!movsDoMes) {
        movsDoMes = window._cacheMovsDoMesCartoes;
        contas = window._cacheContasCartoes;
        if (!movsDoMes || !contas) {
            carregarCartoesEContas();
            return;
        }
    }

    const contasMap = new Map((contas || []).map(c => [String(c.id), c]));
    const sub = window.subAbaCartoesAtiva || 'credito';

    // Filtra lançamentos com base na sub-aba ativa
    let compras = movsDoMes.filter(m => {
        if (m.status === 'Cancelado') return false;
        const conta = m.conta_id ? contasMap.get(String(m.conta_id)) : null;
        const tipoConta = conta ? conta.tipo_conta : null;

        if (sub === 'credito') {
            return m.tipo_gasto === 'Cartão de Crédito' || tipoConta === 'Cartão de Crédito';
        } else if (sub === 'alimentacao') {
            return m.tipo_gasto === 'Cartão Alimentação' || tipoConta === 'Cartão Alimentação';
        } else if (sub === 'bancos') {
            return tipoConta !== 'Cartão de Crédito' && tipoConta !== 'Cartão Alimentação' && m.tipo_gasto !== 'Cartão de Crédito';
        } else {
            // 'todos': qualquer lançamento vinculado a conta ou cartão
            return m.tipo_gasto === 'Cartão de Crédito' || m.tipo_gasto === 'Cartão Alimentação' || !!m.conta_id;
        }
    });

    if (filtroCartaoId) {
        compras = compras.filter(m => String(m.conta_id) === String(filtroCartaoId));
    }

    // Ordena por data decrescente
    compras.sort((a, b) => (b.data_lancamento || '').localeCompare(a.data_lancamento || ''));

    container.innerHTML = '';

    if (compras.length === 0) {
        let msgVazia = 'Nenhum lançamento encontrado para esta categoria neste mês.';
        if (sub === 'credito') msgVazia = 'Nenhuma compra lançada nos cartões de crédito para este mês.';
        else if (sub === 'alimentacao') msgVazia = 'Nenhum gasto ou recarga nos cartões alimentação para este mês.';
        else if (sub === 'bancos') msgVazia = 'Nenhuma movimentação bancária registrada para este mês.';

        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #94A3B8; font-size: 0.88rem;">
                ${msgVazia}
            </div>
        `;
        return;
    }

    compras.forEach(item => {
        const conta = contasMap.get(String(item.conta_id));
        const tipoC = conta ? conta.tipo_conta : (item.tipo_gasto === 'Cartão Alimentação' ? 'Cartão Alimentação' : 'Cartão de Crédito');
        const nomeCartao = conta ? conta.nome_conta : (tipoC === 'Cartão Alimentação' ? 'Cartão Alimentação' : 'Cartão de Crédito');
        const corCartao = conta ? (conta.cor_cartao || (tipoC === 'Cartão Alimentação' ? '#F97316' : '#2563EB')) : (tipoC === 'Cartão Alimentação' ? '#F97316' : '#2563EB');

        let dataStr = item.data_lancamento || '';
        if (dataStr.includes('-')) {
            const [y, m, d] = dataStr.split('-');
            dataStr = `${d}/${m}`;
        }

        const isPago = item.status === 'Pago';
        const val = parseFloat(item.valor_total) || 0;

        // Ícone e Tag de Status Personalizados
        let iconeItem = '💳';
        let tagStatus = isPago ? '✓ Fatura Paga' : '⏳ Na Fatura';
        let corTag = isPago ? '#10B981' : '#F59E0B';

        if (tipoC === 'Cartão Alimentação' || item.tipo_gasto === 'Cartão Alimentação') {
            iconeItem = '🍽️';
            tagStatus = item.tipo_gasto === 'Receita' ? '💰 Recarga (+)' : '🍽️ Benefício Débito';
            corTag = item.tipo_gasto === 'Receita' ? '#10B981' : '#F97316';
        } else if (tipoC !== 'Cartão de Crédito') {
            iconeItem = '🏦';
            tagStatus = item.tipo_gasto === 'Receita' ? '💰 Depósito (+)' : '🏦 Débito em Conta';
            corTag = item.tipo_gasto === 'Receita' ? '#10B981' : '#60A5FA';
        }

        const row = document.createElement('div');
        row.style.cssText = `
            background: #0F172A;
            border: 1px solid #334155;
            border-left: 4px solid ${corCartao};
            border-radius: 10px;
            padding: 12px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s;
        `;
        row.onclick = () => {
            if (typeof editarLancamento === 'function') editarLancamento(item.id);
        };

        let parcText = '';
        if (item.parcelado === 'Sim') {
            parcText = ` <span style="font-size: 0.74rem; color: #94A3B8;">(${item.parcela_atual}/${item.total_parcelas})</span>`;
        }

        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <span style="font-size: 1.15rem; flex-shrink: 0;">${iconeItem}</span>
                <div style="min-width: 0;">
                    <div style="color: #FFFFFF; font-weight: 700; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${item.descricao.split(' (')[0]}${parcText}
                    </div>
                    <div style="font-size: 0.74rem; color: #94A3B8; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                        <span style="color: ${corCartao}; font-weight: 700;">${nomeCartao}</span>
                        <span>•</span>
                        <span>${dataStr}</span>
                        <span>•</span>
                        <span style="color: ${corTag}; font-weight: 600;">${tagStatus}</span>
                    </div>
                </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; padding-left: 10px;">
                <div style="font-size: 1rem; font-weight: 800; color: #FFFFFF;">${formatBRL(val)}</div>
                <span style="font-size: 0.72rem; color: #60A5FA;">Editar ➔</span>
            </div>
        `;
        container.appendChild(row);
    });
}
window.renderizarComprasCartoes = renderizarComprasCartoes;

// ============================================================================
// GESTÃO DE BANCOS E TIPOS DE CONTA CUSTOMIZÁVEIS
// ============================================================================
const BANCOS_PADRAO = [
    'Sicredi',
    'Nubank',
    'Banco do Brasil',
    'Itaú',
    'Bradesco',
    'Santander',
    'Caixa Econômica',
    'Banco Inter',
    'C6 Bank',
    'BTG Pactual',
    'PagBank',
    'Mercado Pago',
    'PicPay',
    'Sicoob',
    'Banrisul',
    'Safra'
];

function obterBancosCadastrados() {
    try {
        const salvos = localStorage.getItem('financas_bancos_cadastrados');
        if (salvos) {
            const lista = JSON.parse(salvos);
            if (Array.isArray(lista) && lista.length > 0) return lista;
        }
    } catch(e) {}
    return [...BANCOS_PADRAO];
}

function salvarBancosCadastrados(lista) {
    try {
        localStorage.setItem('financas_bancos_cadastrados', JSON.stringify(lista));
    } catch(e) {}
}

function popularSelectBancos(bancoSelecionado = '') {
    const sel = document.getElementById('contaBanco');
    if (!sel) return;
    const bancos = obterBancosCadastrados();
    sel.innerHTML = '<option value="">🏦 Selecione o Banco...</option>';
    bancos.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.innerText = b;
        if (bancoSelecionado && b.toLowerCase() === bancoSelecionado.toLowerCase()) {
            opt.selected = true;
        }
        sel.appendChild(opt);
    });
    const optNovo = document.createElement('option');
    optNovo.value = '__NOVO_BANCO__';
    optNovo.innerText = '➕ Cadastrar Novo Banco...';
    sel.appendChild(optNovo);
}
window.popularSelectBancos = popularSelectBancos;

function aoSelecionarBancoForm() {
    const sel = document.getElementById('contaBanco');
    if (!sel) return;
    if (sel.value === '__NOVO_BANCO__') {
        cadastrarNovoBancoPrompt();
        return;
    }
    const inpNome = document.getElementById('contaNome');
    if (inpNome && sel.value) {
        inpNome.value = sel.value;
    }
}
window.aoSelecionarBancoForm = aoSelecionarBancoForm;

function cadastrarNovoBancoPrompt() {
    const novo = prompt('Digite o nome do novo banco para cadastrar (Ex: Sicredi, Nubank, Itaú):');
    if (novo && novo.trim()) {
        const nomeBanco = novo.trim();
        const lista = obterBancosCadastrados();
        if (!lista.some(b => b.toLowerCase() === nomeBanco.toLowerCase())) {
            lista.push(nomeBanco);
            salvarBancosCadastrados(lista);
        }
        popularSelectBancos(nomeBanco);
        const inpNome = document.getElementById('contaNome');
        if (inpNome && !inpNome.value.trim()) {
            const tipo = document.getElementById('contaTipo')?.value || '';
            inpNome.value = `${nomeBanco} ${tipo}`.trim();
        }
    }
}
window.cadastrarNovoBancoPrompt = cadastrarNovoBancoPrompt;

// --- GESTÃO DE TITULARES / EM NOME DE QUEM ---
const TITULARES_PADRAO = [
    'Titular Principal',
    'Esposa',
    'Marido',
    'Filho',
    'Filha',
    'Conjunta',
    'Empresa'
];

function obterTitularesCadastrados() {
    try {
        const salvos = localStorage.getItem('financas_titulares_cadastrados');
        if (salvos) {
            const lista = JSON.parse(salvos);
            if (Array.isArray(lista) && lista.length > 0) return lista;
        }
    } catch(e) {}
    const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const nomeUser = authUser?.nome || localStorage.getItem('financas_user_nome') || '';
    if (nomeUser && !TITULARES_PADRAO.includes(nomeUser)) {
        return [nomeUser, ...TITULARES_PADRAO];
    }
    return [...TITULARES_PADRAO];
}

function salvarTitularesCadastrados(lista) {
    try {
        localStorage.setItem('financas_titulares_cadastrados', JSON.stringify(lista));
    } catch(e) {}
}

function popularSelectTitulares(titularSelecionado = '') {
    const sel = document.getElementById('contaTitular');
    if (!sel) return;
    const titulares = obterTitularesCadastrados();
    if (titularSelecionado && !titulares.some(t => t.toLowerCase() === titularSelecionado.toLowerCase())) {
        titulares.unshift(titularSelecionado);
        salvarTitularesCadastrados(titulares);
    }
    sel.innerHTML = '<option value="">👤 Selecione o Titular (Opcional)...</option>';
    titulares.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = `👤 ${t}`;
        if (t === titularSelecionado) opt.selected = true;
        sel.appendChild(opt);
    });
    const optNovo = document.createElement('option');
    optNovo.value = '__NOVO_TITULAR__';
    optNovo.innerText = '➕ Cadastrar Novo Titular...';
    sel.appendChild(optNovo);
}
window.popularSelectTitulares = popularSelectTitulares;

function aoMudarTitularForm() {
    const sel = document.getElementById('contaTitular');
    if (!sel) return;
    if (sel.value === '__NOVO_TITULAR__') {
        cadastrarNovoTitularPrompt();
        return;
    }
}
window.aoMudarTitularForm = aoMudarTitularForm;

function cadastrarNovoTitularPrompt() {
    const novo = prompt('Digite o nome do Titular / Responsável pela conta ou cartão (Ex: Carlão, Patrícia, Empresa, etc.):');
    if (novo && novo.trim()) {
        const nomeTitular = novo.trim();
        const lista = obterTitularesCadastrados();
        if (!lista.some(t => t.toLowerCase() === nomeTitular.toLowerCase())) {
            lista.push(nomeTitular);
            salvarTitularesCadastrados(lista);
        }
        popularSelectTitulares(nomeTitular);
    }
}
window.cadastrarNovoTitularPrompt = cadastrarNovoTitularPrompt;

const TIPOS_CONTA_PADRAO = [
    'Conta Corrente',
    'Conta Poupança',
    'Conta Salário',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Cartão Alimentação',
    'Conta Investimento'
];

function obterTiposContaCadastrados() {
    try {
        const salvos = localStorage.getItem('financas_tipos_conta_cadastrados');
        if (salvos) {
            const lista = JSON.parse(salvos);
            if (Array.isArray(lista) && lista.length > 0) return lista;
        }
    } catch(e) {}
    return [...TIPOS_CONTA_PADRAO];
}

function salvarTiposContaCadastrados(lista) {
    try {
        localStorage.setItem('financas_tipos_conta_cadastrados', JSON.stringify(lista));
    } catch(e) {}
}

function popularSelectTiposConta(tipoSelecionado = 'Conta Corrente') {
    const sel = document.getElementById('contaTipo');
    if (!sel) return;
    const tipos = obterTiposContaCadastrados();
    sel.innerHTML = '';
    tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        let label = t;
        if (t === 'Cartão Alimentação') label = 'Cartão Alimentação / Benefício';
        opt.innerText = label;
        if (t === tipoSelecionado) opt.selected = true;
        sel.appendChild(opt);
    });
    const optNovo = document.createElement('option');
    optNovo.value = '__NOVO_TIPO__';
    optNovo.innerText = '➕ Cadastrar Novo Tipo de Conta...';
    sel.appendChild(optNovo);
}
window.popularSelectTiposConta = popularSelectTiposConta;

function cadastrarNovoTipoPrompt() {
    const novo = prompt('Digite o nome do novo tipo de conta para cadastrar (Ex: Conta Salário, Poupança, Carteira Digital, Conta PJ):');
    if (novo && novo.trim()) {
        const nomeTipo = novo.trim();
        const lista = obterTiposContaCadastrados();
        if (!lista.some(t => t.toLowerCase() === nomeTipo.toLowerCase())) {
            lista.push(nomeTipo);
            salvarTiposContaCadastrados(lista);
        }
        popularSelectTiposConta(nomeTipo);
        aoMudarTipoContaForm();
    }
}
window.cadastrarNovoTipoPrompt = cadastrarNovoTipoPrompt;

// Alternância de Sinal Positivo / Negativo para Saldo em Conta Corrente
function alternarSinalSaldoConta(forcarNegativo = null) {
    const inp = document.getElementById('contaSaldo');
    if (!inp) return;
    let isNeg = forcarNegativo !== null ? forcarNegativo : (inp.dataset.sinalNegativo !== 'true');
    inp.dataset.sinalNegativo = isNeg ? 'true' : 'false';

    let digitos = inp.value.replace(/\D/g, '');
    let centavos = digitos ? parseInt(digitos, 10) : 0;
    let val = centavos / 100;
    inp.value = (isNeg ? '-R$ ' : 'R$ ') + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    inp.style.color = isNeg ? '#EF4444' : '#10B981';
    atualizarBotoesSinalSaldo(isNeg);
}
window.alternarSinalSaldoConta = alternarSinalSaldoConta;

function atualizarBotoesSinalSaldo(isNeg) {
    const btnPos = document.getElementById('btnSaldoPositivo');
    const btnNeg = document.getElementById('btnSaldoNegativo');
    if (btnPos && btnNeg) {
        if (isNeg) {
            btnNeg.style.background = 'rgba(239, 68, 68, 0.25)';
            btnNeg.style.borderColor = '#EF4444';
            btnNeg.style.color = '#FCA5A5';
            btnPos.style.background = '#1E293B';
            btnPos.style.borderColor = '#334155';
            btnPos.style.color = '#94A3B8';
        } else {
            btnPos.style.background = 'rgba(16, 185, 129, 0.25)';
            btnPos.style.borderColor = '#10B981';
            btnPos.style.color = '#6EE7B7';
            btnNeg.style.background = '#1E293B';
            btnNeg.style.borderColor = '#334155';
            btnNeg.style.color = '#94A3B8';
        }
    }
}
window.atualizarBotoesSinalSaldo = atualizarBotoesSinalSaldo;

// Abre o modal de cadastro/edição de conta ou cartão
async function abrirModalGerenciarConta(id = null, tipoPadrao = 'Conta Corrente') {
    window.cartaoEmEdicaoId = null;
    const m = document.getElementById('modalGerenciarContaBancaria');
    if (!m) return;

    const inpId = document.getElementById('contaBancariaId');
    const selBanco = document.getElementById('contaBanco');
    const inpNome = document.getElementById('contaNome');
    const selTipo = document.getElementById('contaTipo');
    const inpLim = document.getElementById('contaLimite');
    const inpSal = document.getElementById('contaSaldo');
    const inpFec = document.getElementById('contaDiaFechamento');
    const inpVen = document.getElementById('contaDiaVencimento');
    const inpRecDia = document.getElementById('contaDiaRecarga');
    const inpRecVal = document.getElementById('contaValorRecarga');
    const inpCor = document.getElementById('contaCorCartao');
    const btnExcluir = document.getElementById('btnExcluirContaBancaria');
    const tit = document.getElementById('tituloModalConta');
    const ico = document.getElementById('iconeModalConta');

    if (inpLim && typeof aplicarMascaraMoedaEmElemento === 'function') aplicarMascaraMoedaEmElemento(inpLim);
    if (inpSal && typeof aplicarMascaraMoedaEmElemento === 'function') aplicarMascaraMoedaEmElemento(inpSal);
    if (inpRecVal && typeof aplicarMascaraMoedaEmElemento === 'function') aplicarMascaraMoedaEmElemento(inpRecVal);

    if (id && id !== 'novo') {
        window.cartaoEmEdicaoId = id;
        if (inpId) inpId.value = id;
        if (btnExcluir) {
            btnExcluir.disabled = false;
            btnExcluir.style.opacity = '1';
            btnExcluir.style.cursor = 'pointer';
        }
        if (tit) tit.innerText = "Editar Cartão / Conta";

        const conta = await dbLocal.contas_bancarias.get(id);
        if (conta) {
            popularSelectBancos(conta.banco || '');
            popularSelectTitulares(conta.titular || '');
            popularSelectTiposConta(conta.tipo_conta || 'Conta Corrente');
            if (inpNome) inpNome.value = conta.nome_conta || '';
            if (selTipo) selTipo.value = conta.tipo_conta || 'Conta Corrente';
            if (inpLim && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpLim, conta.limite_cartao || 0);
            if (inpSal && typeof setarValorMoedaInput === 'function') {
                const s = parseFloat(conta.saldo_atual) || 0;
                setarValorMoedaInput(inpSal, s);
                if (inpSal) {
                    inpSal.dataset.sinalNegativo = s < 0 ? 'true' : 'false';
                    inpSal.style.color = s < 0 ? '#EF4444' : '#10B981';
                }
                atualizarBotoesSinalSaldo(s < 0);
            }
            if (inpFec) inpFec.value = conta.dia_fechamento || 1;
            if (inpVen) inpVen.value = conta.dia_vencimento || 10;
            if (inpRecDia) inpRecDia.value = conta.dia_recarga || 1;
            if (inpRecVal && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpRecVal, conta.valor_recarga || 0);
            if (inpCor) inpCor.value = conta.cor_cartao || (conta.tipo_conta === 'Cartão Alimentação' ? '#F97316' : '#2563EB');
            if (ico) {
                ico.innerText = conta.tipo_conta === 'Cartão de Crédito' ? '💳' : (conta.tipo_conta === 'Cartão Alimentação' ? '🍽️' : '🏦');
            }
            selecionarCorCartaoForm(conta.cor_cartao || (conta.tipo_conta === 'Cartão Alimentação' ? '#F97316' : '#2563EB'));
        }
    } else {
        popularSelectBancos('');
        popularSelectTitulares('');
        popularSelectTiposConta(tipoPadrao);
        const corPadrao = (tipoPadrao === 'Cartão Alimentação') ? '#F97316' : '#2563EB';
        if (inpId) inpId.value = '';
        if (inpNome) inpNome.value = '';
        if (selTipo) selTipo.value = tipoPadrao;
        if (inpLim && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpLim, tipoPadrao === 'Cartão de Crédito' ? 2000 : 0);
        if (inpSal && typeof setarValorMoedaInput === 'function') {
            setarValorMoedaInput(inpSal, 0);
            if (inpSal) {
                inpSal.dataset.sinalNegativo = 'false';
                inpSal.style.color = '#10B981';
            }
            atualizarBotoesSinalSaldo(false);
        }
        if (inpFec) inpFec.value = 1;
        if (inpVen) inpVen.value = 10;
        if (inpRecDia) inpRecDia.value = 1;
        if (inpRecVal && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpRecVal, 0);
        if (inpCor) inpCor.value = corPadrao;
        if (ico) {
            ico.innerText = (tipoPadrao === 'Cartão de Crédito' || tipoPadrao === 'Cartão de Débito') ? '💳' : (tipoPadrao === 'Cartão Alimentação' ? '🍽️' : '🏦');
        }
        if (tit) {
            if (tipoPadrao === 'Cartão Alimentação') tit.innerText = "Cadastrar Cartão Alimentação";
            else if (tipoPadrao === 'Cartão de Crédito') tit.innerText = "Cadastrar Cartão de Crédito";
            else if (tipoPadrao === 'Cartão de Débito') tit.innerText = "Cadastrar Cartão de Débito";
            else tit.innerText = `Cadastrar ${tipoPadrao}`;
        }
        if (btnExcluir) {
            btnExcluir.disabled = true;
            btnExcluir.style.opacity = '0.35';
            btnExcluir.style.cursor = 'not-allowed';
        }
        selecionarCorCartaoForm(corPadrao);
    }

    aoMudarTipoContaForm();
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
window.abrirModalGerenciarConta = abrirModalGerenciarConta;

function fecharModalGerenciarConta() {
    const m = document.getElementById('modalGerenciarContaBancaria');
    if (m) m.style.display = 'none';
    document.body.style.overflow = 'auto';
    window.cartaoEmEdicaoId = null;
}
window.fecharModalGerenciarConta = fecharModalGerenciarConta;

// Alterna campos visíveis dependendo do tipo da conta:
// Cartão de Crédito: exibe limite e prazos de fatura (fechamento/vencimento)
// Conta Corrente: exibe saldo atual (com suporte a negativo) e limite de cheque especial (NÃO exibe dia de vencimento/fechamento!)
// Cartão Alimentação: exibe saldo disponível e dia/valor programado da recarga (NÃO tem vencimento nem fechamento nem saldo negativo!)
// Outras contas: exibe saldo atual e oculta prazos de fatura
function aoMudarTipoContaForm() {
    const selTipo = document.getElementById('contaTipo');
    if (!selTipo) return;
    if (selTipo.value === '__NOVO_TIPO__') {
        cadastrarNovoTipoPrompt();
        return;
    }
    const tipo = selTipo.value;
    const grpLimite = document.getElementById('grpContaLimite');
    const lblLimite = document.getElementById('lblContaLimite');
    const grpSaldo = document.getElementById('grpContaSaldo');
    const grpPrazos = document.getElementById('grpPrazosFatura');
    const grpRecarga = document.getElementById('grpRecargaAlimentacao');
    const grpSinalSaldo = document.getElementById('grpBotoesSinalSaldo');
    const ico = document.getElementById('iconeModalConta');
    const lblSaldo = document.getElementById('lblContaSaldo');
    const tit = document.getElementById('tituloModalConta');

    const setDisp = (el, val) => {
        if (!el) return;
        el.style.setProperty('display', val, 'important');
    };

    if (tipo === 'Cartão de Crédito') {
        setDisp(grpLimite, 'block');
        if (lblLimite) lblLimite.innerText = '💳 Limite do Cartão';
        setDisp(grpSaldo, 'none');
        setDisp(grpPrazos, 'flex');
        setDisp(grpRecarga, 'none');
        setDisp(grpSinalSaldo, 'none');
        if (ico) ico.innerText = '💳';
        if (tit && !window.cartaoEmEdicaoId) tit.innerText = "Cadastrar Cartão de Crédito";
    } else if (tipo === 'Cartão Alimentação') {
        setDisp(grpLimite, 'none');
        setDisp(grpSaldo, 'block');
        setDisp(grpPrazos, 'none');
        setDisp(grpRecarga, 'flex');
        setDisp(grpSinalSaldo, 'none');
        if (lblSaldo) lblSaldo.innerText = 'Saldo Disponível no Cartão';
        if (ico) ico.innerText = '🍽️';
        if (tit && !window.cartaoEmEdicaoId) tit.innerText = "Cadastrar Cartão Alimentação";
    } else if (tipo === 'Conta Corrente') {
        setDisp(grpLimite, 'block');
        if (lblLimite) lblLimite.innerText = '🛡️ Limite Cheque Especial';
        setDisp(grpSaldo, 'block');
        setDisp(grpPrazos, 'none');
        setDisp(grpRecarga, 'none');
        setDisp(grpSinalSaldo, 'flex');
        if (lblSaldo) lblSaldo.innerText = 'Saldo Atual em Conta';
        if (ico) ico.innerText = '🏦';
        if (tit && !window.cartaoEmEdicaoId) tit.innerText = "Cadastrar Conta Corrente";
    } else if (tipo === 'Conta Poupança' || tipo === 'Conta Salário') {
        setDisp(grpLimite, 'none');
        setDisp(grpSaldo, 'block');
        setDisp(grpPrazos, 'none');
        setDisp(grpRecarga, 'none');
        setDisp(grpSinalSaldo, 'none');
        if (lblSaldo) lblSaldo.innerText = 'Saldo Atual em Conta';
        if (ico) ico.innerText = '🏦';
        if (tit && !window.cartaoEmEdicaoId) tit.innerText = `Cadastrar ${tipo}`;
    } else if (tipo === 'Cartão de Débito') {
        setDisp(grpLimite, 'none');
        setDisp(grpSaldo, 'block');
        setDisp(grpPrazos, 'none');
        setDisp(grpRecarga, 'none');
        setDisp(grpSinalSaldo, 'none');
        if (lblSaldo) lblSaldo.innerText = 'Saldo Disponível no Cartão';
        if (ico) ico.innerText = '💳';
        if (tit && !window.cartaoEmEdicaoId) tit.innerText = "Cadastrar Cartão de Débito";
    } else {
        // Outros tipos customizados
        setDisp(grpLimite, 'none');
        setDisp(grpSaldo, 'block');
        setDisp(grpPrazos, 'none');
        setDisp(grpRecarga, 'none');
        setDisp(grpSinalSaldo, 'none');
        if (lblSaldo) lblSaldo.innerText = 'Saldo Atual em Conta';
        if (ico) ico.innerText = '🏦';
        if (tit && !window.cartaoEmEdicaoId) tit.innerText = `Cadastrar ${tipo}`;
    }
}
window.aoMudarTipoContaForm = aoMudarTipoContaForm;

function selecionarCorCartaoForm(cor) {
    const inp = document.getElementById('contaCorCartao');
    if (inp) inp.value = cor;

    const btns = document.querySelectorAll('#paletaCoresCartao button');
    btns.forEach(b => {
        if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(cor)) {
            b.style.border = '2px solid #FFFFFF';
            b.style.transform = 'scale(1.1)';
        } else {
            b.style.border = '2px solid transparent';
            b.style.transform = 'scale(1)';
        }
    });
}
window.selecionarCorCartaoForm = selecionarCorCartaoForm;

// Salva conta corrente ou cartão de crédito no Dexie e dispara sync
async function salvarContaBancariaSubmit(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    const id = document.getElementById('contaBancariaId')?.value || generateUUID();
    let nome = document.getElementById('contaNome')?.value.trim() || '';
    const banco = document.getElementById('contaBanco')?.value.trim() || '';
    const titular = document.getElementById('contaTitular')?.value.trim() || '';
    const tipo = document.getElementById('contaTipo')?.value || 'Conta Corrente';

    // Se o usuário selecionou outro tipo (ex: Conta Salário, Poupança), remove "Conta Corrente" residual do nome
    if (tipo !== 'Conta Corrente') {
        nome = nome.replace(/\s+Conta\s+Corrente$/i, '').trim();
    }
    const limite = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('contaLimite')?.value) : 0;
    const saldo = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('contaSaldo')?.value) : 0;
    const fechamento = parseInt(document.getElementById('contaDiaFechamento')?.value, 10) || 1;
    const vencimento = parseInt(document.getElementById('contaDiaVencimento')?.value, 10) || 10;
    const diaRecarga = parseInt(document.getElementById('contaDiaRecarga')?.value, 10) || 1;
    const valorRecarga = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('contaValorRecarga')?.value) : 0;
    const cor = document.getElementById('contaCorCartao')?.value || '#2563EB';

    if (!nome) {
        alert("Por favor, preencha o nome do cartão ou conta!");
        return;
    }

    const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = authUser ? authUser.id : (localStorage.getItem('financas_current_user_id') || null);
    const ts = Date.now();

    const objConta = {
        id: String(id),
        nome_conta: nome,
        tipo_conta: tipo,
        titular: titular,
        limite_cartao: parseFloat(limite) || 0,
        saldo_atual: parseFloat(saldo) || 0,
        dia_fechamento: (tipo === 'Cartão de Crédito') ? fechamento : null,
        dia_vencimento: (tipo === 'Cartão de Crédito') ? vencimento : null,
        dia_recarga: (tipo === 'Cartão Alimentação') ? diaRecarga : null,
        valor_recarga: (tipo === 'Cartão Alimentação') ? parseFloat(valorRecarga) || 0 : 0,
        cor_cartao: cor,
        banco: banco || nome,
        user_id: currentUserId,
        deleted: 0,
        sync_status: window.cartaoEmEdicaoId ? 'pending_update' : 'pending_insert',
        updated_at: ts
    };

    if (titular && titular !== '__NOVO_TITULAR__') {
        const listaTitulares = obterTitularesCadastrados();
        if (!listaTitulares.some(t => t.toLowerCase() === titular.toLowerCase())) {
            listaTitulares.push(titular);
            salvarTitularesCadastrados(listaTitulares);
        }
    }

    await dbLocal.contas_bancarias.put(objConta);
    fecharModalGerenciarConta();
    showToast(`✓ ${tipo === 'Cartão de Crédito' ? 'Cartão' : 'Conta'} '${nome}' salvo com sucesso!`);

    await carregarCartoesEContas();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.salvarContaBancariaSubmit = salvarContaBancariaSubmit;

// Exclui a conta ou cartão com confirmação
async function excluirContaBancariaConfirmar() {
    const id = window.cartaoEmEdicaoId;
    if (!id) return;

    const conta = await dbLocal.contas_bancarias.get(id);
    const nome = conta ? conta.nome_conta : 'este item';

    if (!confirm(`Tem certeza de que deseja excluir '${nome}'?\n\nOs lançamentos associados a ele não serão apagados.`)) {
        return;
    }

    await dbLocal.contas_bancarias.update(id, {
        deleted: 1,
        sync_status: 'pending_delete',
        updated_at: Date.now()
    });

    fecharModalGerenciarConta();
    showToast(`✓ '${nome}' excluído com sucesso.`);
    await carregarCartoesEContas();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.excluirContaBancariaConfirmar = excluirContaBancariaConfirmar;

// Permite ajuste rápido de saldo em conta corrente
async function ajustarSaldoConta(contaId) {
    if (!contaId) return;
    const conta = await dbLocal.contas_bancarias.get(contaId);
    if (!conta) return;

    const saldoAtualFmt = formatBRL(conta.saldo_atual || 0);
    const novoValorStr = prompt(`Ajustar saldo da conta '${conta.nome_conta}':\n\nSaldo atual: ${saldoAtualFmt}\n\nDigite o novo saldo (Ex: 1500,00 ou -250,00 para saldo negativo no cheque especial):`);
    if (novoValorStr === null) return;

    const isNeg = novoValorStr.trim().startsWith('-');
    const valLimpo = novoValorStr.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const num = parseFloat(valLimpo);
    if (isNaN(num)) {
        alert("Valor inválido.");
        return;
    }
    const novoSaldo = isNeg ? -num : num;

    await dbLocal.contas_bancarias.update(contaId, {
        saldo_atual: novoSaldo,
        sync_status: 'pending_update',
        updated_at: Date.now()
    });

    showToast(`✓ Saldo de '${conta.nome_conta}' ajustado para ${formatBRL(novoSaldo)}`);
    await carregarCartoesEContas();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.ajustarSaldoConta = ajustarSaldoConta;

// Pagar fatura do cartão debitando de uma conta corrente
async function pagarFaturaCartao(cartaoId) {
    if (!cartaoId) return;

    const cartao = await dbLocal.contas_bancarias.get(cartaoId);
    if (!cartao) return;

    const targetMonth = (typeof window.currentMonthIndex !== 'undefined') ? window.currentMonthIndex : (new Date()).getMonth();
    const targetYear = (typeof window.selectedAno !== 'undefined') ? parseInt(window.selectedAno, 10) : (new Date()).getFullYear();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const allMovs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
    const comprasCartao = allMovs.filter(m => {
        if (!m.data_lancamento) return false;
        const [anoStr, mesStr] = m.data_lancamento.split('-');
        return String(m.conta_id) === String(cartaoId) &&
               parseInt(anoStr, 10) === targetYear &&
               (parseInt(mesStr, 10) - 1) === targetMonth &&
               m.tipo_gasto === 'Cartão de Crédito' &&
               m.status !== 'Cancelado' &&
               m.status !== 'Pago';
    });

    const totalFatura = comprasCartao.reduce((acc, c) => acc + (parseFloat(c.valor_total) || 0), 0);

    if (totalFatura <= 0) {
        alert(`A fatura do cartão '${cartao.nome_conta}' de ${meses[targetMonth]} já está paga ou zerada!`);
        return;
    }

    const contasCorrentes = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1 && c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação').toArray();
    
    let mensagemPrompt = `💳 PAGAMENTO DE FATURA - ${cartao.nome_conta}\n\n`;
    mensagemPrompt += `Mês de Referência: ${meses[targetMonth]} / ${targetYear}\n`;
    mensagemPrompt += `Valor Total a Pagar: ${formatBRL(totalFatura)}\n\n`;
    
    if (contasCorrentes.length > 0) {
        mensagemPrompt += `Escolha qual conta bancária debitará o pagamento:\n`;
        contasCorrentes.forEach((cc, idx) => {
            mensagemPrompt += `${idx + 1} - ${cc.nome_conta} (Saldo: ${formatBRL(cc.saldo_atual || 0)})\n`;
        });
        mensagemPrompt += `\nDigite o número da conta (ou deixe em branco para pagar sem debitar de conta):`;
        
        const escolha = prompt(mensagemPrompt, "1");
        if (escolha === null) return; // Cancelou

        const idxEscolhido = parseInt(escolha.trim(), 10) - 1;
        if (!isNaN(idxEscolhido) && idxEscolhido >= 0 && idxEscolhido < contasCorrentes.length) {
            const contaDebito = contasCorrentes[idxEscolhido];
            const novoSaldo = (parseFloat(contaDebito.saldo_atual) || 0) - totalFatura;
            await dbLocal.contas_bancarias.update(contaDebito.id, {
                saldo_atual: novoSaldo,
                sync_status: 'pending_update',
                updated_at: Date.now()
            });
            console.log(`[PAGAR FATURA] Debitado ${totalFatura} de ${contaDebito.nome_conta}. Novo saldo: ${novoSaldo}`);
        }
    } else {
        if (!confirm(`${mensagemPrompt}Confirmar pagamento da fatura de ${formatBRL(totalFatura)}?`)) {
            return;
        }
    }

    // Marca todos os lançamentos da fatura como 'Pago'
    const ts = Date.now();
    for (let comp of comprasCartao) {
        await dbLocal.movimentacoes.update(comp.id, {
            status: 'Pago',
            valor_realizado: comp.valor_total,
            sync_status: 'pending_update',
            updated_at: ts
        });
    }

    showToast(`✓ Fatura de ${formatBRL(totalFatura)} do cartão '${cartao.nome_conta}' paga com sucesso!`);
    await carregarCartoesEContas();
    if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.pagarFaturaCartao = pagarFaturaCartao;

// Abre o modal de lançamento já com foco na leitura inteligente
function abrirModalLancamentoComLeitura() {
    if (typeof abrirModalEscolhaComprovante === 'function') {
        abrirModalEscolhaComprovante();
    } else if (typeof abrirModalLancamento === 'function') {
        abrirModalLancamento();
        const selTipo = document.getElementById('inputTipoGasto');
        if (selTipo) selTipo.value = 'Cartão de Crédito';
        if (typeof abrirPromptColarTextoComprovante === 'function') {
            setTimeout(abrirPromptColarTextoComprovante, 200);
        }
    }
}
window.abrirModalLancamentoComLeitura = abrirModalLancamentoComLeitura;

// ============================================================================
// TRANSFERÊNCIA ENTRE CONTAS BANCÁRIAS (FLUXO DE CAIXA INTRA-CONTAS)
// ============================================================================
window._cacheContasParaTransferencia = [];

async function abrirModalTransferenciaContas(origemPreSelecionadaId = null, destinoPreSelecionadaId = null) {
    const modal = document.getElementById('modalTransferenciaContas');
    if (!modal) return;

    const selOrigem = document.getElementById('transferenciaContaOrigem');
    const selDestino = document.getElementById('transferenciaContaDestino');
    const inpValor = document.getElementById('transferenciaValor');
    const inpData = document.getElementById('transferenciaData');
    const inpMotivo = document.getElementById('transferenciaMotivo');

    if (!selOrigem || !selDestino) return;

    let contas = [];
    try {
        if (typeof dbLocal !== 'undefined' && dbLocal && dbLocal.contas_bancarias) {
            contas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
        }
    } catch (e) {
        console.error("Erro ao carregar contas para transferência:", e);
    }

    if (contas.length < 2) {
        alert("Para realizar uma transferência, você precisa de pelo menos 2 contas ou cartões cadastrados!");
        abrirModalGerenciarConta('novo', 'Conta Corrente');
        return;
    }

    window._cacheContasParaTransferencia = contas;

    // Data de hoje padrão (YYYY-MM-DD)
    if (inpData) {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const dd = String(hoje.getDate()).padStart(2, '0');
        inpData.value = `${yyyy}-${mm}-${dd}`;
    }

    if (inpValor) inpValor.value = '';
    if (inpMotivo) inpMotivo.value = '';

    // Prioriza contas que possuem saldo (não cartões de crédito) para a origem
    const contasComSaldo = contas.filter(c => c.tipo_conta !== 'Cartão de Crédito');
    const poolOrigem = contasComSaldo.length > 0 ? contasComSaldo : contas;

    // Identifica Sicredi como origem padrão caso não tenha sido passada origem específica
    let idOrigemDefault = origemPreSelecionadaId;
    if (!idOrigemDefault) {
        const sicredi = poolOrigem.find(c => (c.nome_conta + ' ' + (c.banco || '')).toLowerCase().includes('sicredi'));
        if (sicredi) {
            idOrigemDefault = sicredi.id;
        } else {
            idOrigemDefault = poolOrigem[0].id;
        }
    }

    // Identifica Destino padrão (diferente da origem)
    let idDestinoDefault = destinoPreSelecionadaId;
    if (!idDestinoDefault || String(idDestinoDefault) === String(idOrigemDefault)) {
        const outro = contas.find(c => String(c.id) !== String(idOrigemDefault));
        idDestinoDefault = outro ? outro.id : '';
    }

    // Popula select de Origem
    selOrigem.innerHTML = '';
    poolOrigem.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        const saldo = parseFloat(c.saldo_atual) || 0;
        const tit = c.titular ? ` [👤 ${c.titular}]` : '';
        opt.innerText = `${c.nome_conta}${tit} (Saldo: ${formatBRL(saldo)})`;
        if (String(c.id) === String(idOrigemDefault)) opt.selected = true;
        selOrigem.appendChild(opt);
    });

    // Popula select de Destino
    popularSelectDestinoTransferencia(idOrigemDefault, idDestinoDefault);

    aoMudarContasTransferencia();

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (inpValor) inpValor.focus();
    }, 150);
}
window.abrirModalTransferenciaContas = abrirModalTransferenciaContas;

function popularSelectDestinoTransferencia(origemId, destinoIdSelecionado = null) {
    const selDestino = document.getElementById('transferenciaContaDestino');
    if (!selDestino) return;

    const contas = window._cacheContasParaTransferencia || [];
    const valorDestinoAtual = destinoIdSelecionado || selDestino.value;

    selDestino.innerHTML = '';
    let selecionou = false;

    contas.forEach(c => {
        if (String(c.id) === String(origemId)) return; // Não pode transferir para si mesma

        const opt = document.createElement('option');
        opt.value = c.id;
        const saldo = parseFloat(c.saldo_atual) || 0;
        const tit = c.titular ? ` [👤 ${c.titular}]` : '';
        const tipoDesc = c.tipo_conta === 'Cartão de Crédito' 
            ? `Limite: ${formatBRL(parseFloat(c.limite_cartao) || 0)}` 
            : `Saldo: ${formatBRL(saldo)}`;
        opt.innerText = `${c.nome_conta}${tit} (${tipoDesc})`;

        if (String(c.id) === String(valorDestinoAtual)) {
            opt.selected = true;
            selecionou = true;
        }
        selDestino.appendChild(opt);
    });

    if (!selecionou && selDestino.options.length > 0) {
        selDestino.selectedIndex = 0;
    }
}

function aoMudarContasTransferencia() {
    const selOrigem = document.getElementById('transferenciaContaOrigem');
    const selDestino = document.getElementById('transferenciaContaDestino');
    const inpValor = document.getElementById('transferenciaValor');
    const boxLinhas = document.getElementById('boxResumoLinhas');
    if (!selOrigem || !selDestino || !boxLinhas) return;

    const idOrigem = selOrigem.value;
    const idDestino = selDestino.value;

    // Se origem for igual a destino, recalcula opções de destino
    if (String(idOrigem) === String(idDestino)) {
        popularSelectDestinoTransferencia(idOrigem);
    }

    const contas = window._cacheContasParaTransferencia || [];
    const contaOrigem = contas.find(c => String(c.id) === String(idOrigem));
    const contaDestino = contas.find(c => String(c.id) === String(selDestino.value));

    const valorTransf = (typeof desformatarMoedaInput === 'function') 
        ? desformatarMoedaInput(inpValor?.value || '0')
        : (parseFloat(inpValor?.value) || 0);

    if (!contaOrigem || !contaDestino) {
        boxLinhas.innerHTML = `<div style="color: #94A3B8; font-size: 0.82rem;">Selecione a conta de origem e a conta de destino.</div>`;
        return;
    }

    const saldoOrigemAtual = parseFloat(contaOrigem.saldo_atual) || 0;
    const saldoDestinoAtual = parseFloat(contaDestino.saldo_atual) || 0;

    const novoSaldoOrigem = saldoOrigemAtual - valorTransf;
    const novoSaldoDestino = saldoDestinoAtual + valorTransf;

    const corOrigem = novoSaldoOrigem < 0 ? '#EF4444' : '#6EE7B7';
    const avisoNegativo = novoSaldoOrigem < 0 
        ? `<span style="font-size: 0.72rem; color: #EF4444; font-weight: 700; margin-left: 6px;">⚠️ Saldo ficará negativo (Cheque Especial)</span>` 
        : '';

    boxLinhas.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); padding: 8px 10px; border-radius: 8px;">
            <div>
                <span style="font-weight: 700; color: #FCA5A5;">🔻 ${contaOrigem.nome_conta}</span>
                ${avisoNegativo}
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.72rem; color: #94A3B8;">${formatBRL(saldoOrigemAtual)} ➔</div>
                <div style="font-weight: 900; color: ${corOrigem}; font-size: 0.95rem;">${formatBRL(novoSaldoOrigem)}</div>
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 8px 10px; border-radius: 8px;">
            <div>
                <span style="font-weight: 700; color: #6EE7B7;">🔺 ${contaDestino.nome_conta}</span>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.72rem; color: #94A3B8;">${formatBRL(saldoDestinoAtual)} ➔</div>
                <div style="font-weight: 900; color: #10B981; font-size: 0.95rem;">${formatBRL(novoSaldoDestino)}</div>
            </div>
        </div>
    `;
}
window.aoMudarContasTransferencia = aoMudarContasTransferencia;

function fecharModalTransferenciaContas() {
    const modal = document.getElementById('modalTransferenciaContas');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
window.fecharModalTransferenciaContas = fecharModalTransferenciaContas;

async function executarTransferenciaContasSubmit(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    const selOrigem = document.getElementById('transferenciaContaOrigem');
    const selDestino = document.getElementById('transferenciaContaDestino');
    const inpValor = document.getElementById('transferenciaValor');
    const inpData = document.getElementById('transferenciaData');
    const inpMotivo = document.getElementById('transferenciaMotivo');

    const idOrigem = selOrigem?.value;
    const idDestino = selDestino?.value;
    const dataTransf = inpData?.value;
    const motivo = inpMotivo?.value.trim() || '';

    const valor = (typeof desformatarMoedaInput === 'function')
        ? desformatarMoedaInput(inpValor?.value || '0')
        : (parseFloat(inpValor?.value) || 0);

    if (!idOrigem || !idDestino) {
        alert("Por favor, selecione as contas de origem e destino!");
        return;
    }

    if (String(idOrigem) === String(idDestino)) {
        alert("A conta de origem e destino não podem ser a mesma!");
        return;
    }

    if (valor <= 0) {
        alert("Por favor, digite um valor maior que R$ 0,00 para transferir!");
        inpValor?.focus();
        return;
    }

    if (!dataTransf) {
        alert("Por favor, informe a data da transferência!");
        return;
    }

    const contaOrigem = await dbLocal.contas_bancarias.get(idOrigem);
    const contaDestino = await dbLocal.contas_bancarias.get(idDestino);

    if (!contaOrigem || !contaDestino) {
        alert("Conta não encontrada. Recarregue a página e tente novamente.");
        return;
    }

    const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = authUser ? authUser.id : (localStorage.getItem('financas_current_user_id') || null);
    const ts = Date.now();

    // 1. Atualiza o saldo da conta de Origem (subtrai)
    const saldoAntOrigem = parseFloat(contaOrigem.saldo_atual) || 0;
    const novoSaldoOrigem = saldoAntOrigem - valor;
    await dbLocal.contas_bancarias.update(idOrigem, {
        saldo_atual: novoSaldoOrigem,
        sync_status: 'pending_update',
        updated_at: ts
    });

    // 2. Atualiza o saldo da conta de Destino (adiciona)
    const saldoAntDestino = parseFloat(contaDestino.saldo_atual) || 0;
    const novoSaldoDestino = saldoAntDestino + valor;
    await dbLocal.contas_bancarias.update(idDestino, {
        saldo_atual: novoSaldoDestino,
        sync_status: 'pending_update',
        updated_at: ts
    });

    // 3. Registra a movimentação no histórico com tipo 'Transferência Interna'
    const descMov = `Transferência: ${contaOrigem.nome_conta} ➔ ${contaDestino.nome_conta}`;
    const obsFinal = motivo ? `${motivo} (De: ${contaOrigem.nome_conta} Para: ${contaDestino.nome_conta})` : `Transferência interna entre contas bancárias`;

    const novoLancamento = {
        id: generateUUID(),
        descricao: descMov,
        categoria: 'Transferência entre Contas',
        tipo_gasto: 'Transferência Interna',
        valor_total: valor,
        valor_realizado: valor,
        data_lancamento: dataTransf,
        status: 'Pago',
        parcelado: 'Não',
        total_parcelas: 1,
        parcela_atual: 1,
        conta_id: contaOrigem.id,
        observacoes: obsFinal,
        user_id: currentUserId,
        deleted: 0,
        sync_status: 'pending_insert',
        updated_at: ts
    };

    await dbLocal.movimentacoes.put(novoLancamento);

    fecharModalTransferenciaContas();
    showToast(`✓ Transferência de ${formatBRL(valor)} de '${contaOrigem.nome_conta}' para '${contaDestino.nome_conta}' realizada!`);

    await carregarCartoesEContas();
    if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.executarTransferenciaContasSubmit = executarTransferenciaContasSubmit;

