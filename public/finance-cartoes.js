/**
 * finance-cartoes.js - Gestão Completa de Cartões de Crédito, Contas Bancárias e Subtrações Automáticas
 * APP Finanças Pessoais
 */

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

    // 4. Atualiza rótulo do botão de adição rápida
    const lblBtnNovo = document.getElementById('lblBtnNovoItemCartoes');
    if (lblBtnNovo) {
        if (subAba === 'alimentacao') lblBtnNovo.innerText = 'Novo Cartão Alimentação';
        else if (subAba === 'bancos') lblBtnNovo.innerText = 'Nova Conta Bancária';
        else if (subAba === 'credito') lblBtnNovo.innerText = 'Novo Cartão de Crédito';
        else lblBtnNovo.innerText = 'Novo Cartão ou Conta';
    }

    // 5. Atualiza título da seção de compras e atualiza lançamentos
    const titCompras = document.getElementById('tituloSecaoComprasCartoes');
    if (titCompras) {
        if (subAba === 'alimentacao') titCompras.innerHTML = '<span>🍽️</span> Gastos & Lançamentos do Cartão Alimentação no Mês';
        else if (subAba === 'bancos') titCompras.innerHTML = '<span>🏦</span> Movimentações Bancárias & Débitos no Mês';
        else if (subAba === 'credito') titCompras.innerHTML = '<span>💳</span> Compras do Cartão de Crédito no Mês';
        else titCompras.innerHTML = '<span>🧾</span> Compras & Lançamentos de Cartões e Contas no Mês';
    }

    // Atualiza filtro de contas e lista de compras
    atualizarFiltroCartoesPorSubAba();
    renderizarComprasCartoes();
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

    if (cartoes.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = '💳 Cartões de Crédito';
        cartoes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.dataset.tipo = c.tipo_conta;
            const lim = parseFloat(c.limite_cartao) || 0;
            opt.innerText = `💳 ${c.nome_conta} (Limite: ${formatBRL(lim)})`;
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
            opt.innerText = `🍽️ ${c.nome_conta} (Saldo: ${formatBRL(sal)})`;
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
            opt.innerText = `🏦 ${c.nome_conta} (Saldo: ${formatBRL(sal)})`;
            if (String(c.id) === String(contaIdSelecionada)) opt.selected = true;
            grp.appendChild(opt);
        });
        sel.appendChild(grp);
    }
}
window.carregarSelectContasModal = carregarSelectContasModal;

// Carrega e renderiza a tela dedicada de Cartões e Contas
async function carregarCartoesEContas() {
    if (typeof dbLocal === 'undefined' || !dbLocal) return;

    const targetMonth = (typeof window.currentMonthIndex !== 'undefined') ? window.currentMonthIndex : (new Date()).getMonth();
    const targetYear = (typeof window.selectedAno !== 'undefined') ? parseInt(window.selectedAno, 10) : (new Date()).getFullYear();

    let contas = [];
    let movs = [];
    try {
        contas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
        movs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
    } catch (e) {
        console.error("Erro ao carregar dados de cartões:", e);
        return;
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

    contas.forEach(c => {
        if (c.tipo_conta === 'Cartão de Crédito') {
            limiteTotalCartoes += (parseFloat(c.limite_cartao) || 0);
            faturasPorCartao[c.id] = 0;
        } else if (c.tipo_conta === 'Cartão Alimentação') {
            saldoTotalAlimentacao += (parseFloat(c.saldo_atual) || 0);
        } else {
            saldoTotalContas += (parseFloat(c.saldo_atual) || 0);
        }
    });

    // Calcula faturas por cartão e total geral
    movsDoMes.forEach(m => {
        if (m.tipo_gasto === 'Cartão de Crédito' && m.status !== 'Cancelado') {
            const val = parseFloat(m.valor_total) || 0;
            faturaTotalMes += val;
            if (m.conta_id && faturasPorCartao.hasOwnProperty(m.conta_id)) {
                faturasPorCartao[m.conta_id] += val;
            }
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

    // 1. RENDERIZA MEUS CARTÕES DE CRÉDITO
    const cartoesGrid = document.getElementById('gridCartoesCreditoContainer');
    const badgeCartoes = document.getElementById('badgeQtdCartoes');
    const cartoesList = contas.filter(c => c.tipo_conta === 'Cartão de Crédito');
    if (badgeCartoes) badgeCartoes.innerText = `${cartoesList.length} ${cartoesList.length === 1 ? 'cartão' : 'cartões'}`;

    if (cartoesGrid) {
        cartoesGrid.innerHTML = '';
        if (cartoesList.length === 0) {
            cartoesGrid.innerHTML = `
                <div style="grid-column: 1/-1; padding: 26px; text-align: center; background: #0F172A; border: 1.5px dashed #334155; border-radius: 14px; color: #94A3B8;">
                    <div style="font-size: 2rem; margin-bottom: 6px;">💳</div>
                    <div style="font-weight: 700; color: #FFFFFF; font-size: 1rem;">Nenhum cartão de crédito cadastrado</div>
                    <p style="font-size: 0.82rem; margin: 4px 0 14px 0;">Cadastre seus cartões (ex: Sicredi Visa Gold, Nubank, Itaú) para controlar limites e faturas.</p>
                    <button type="button" onclick="abrirModalGerenciarConta('novo', 'Cartão de Crédito')" style="background: #2563EB; color: white; border: none; padding: 9px 18px; border-radius: 9px; font-weight: 800; cursor: pointer; font-size: 0.88rem; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                        ➕ Cadastrar Primeiro Cartão
                    </button>
                </div>
            `;
        } else {
            cartoesList.forEach(cartao => {
                const limTotal = parseFloat(cartao.limite_cartao) || 0;
                const faturaAtual = faturasPorCartao[cartao.id] || 0;
                const limDisp = Math.max(0, limTotal - faturaAtual);
                const percUsado = limTotal > 0 ? Math.min(100, Math.round((faturaAtual / limTotal) * 100)) : 0;
                const cor = cartao.cor_cartao || '#2563EB';

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
                                <span style="font-weight: 800; font-size: 1.05rem; letter-spacing: 0.5px;">${cartao.nome_conta}</span>
                            </div>
                            <span style="font-size: 0.72rem; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 6px; font-weight: 700;">
                                Vence dia ${cartao.dia_vencimento || 10}
                            </span>
                        </div>

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
                                <div style="width: ${percUsado}%; height: 100%; background: ${percUsado > 85 ? '#EF4444' : (percUsado > 50 ? '#F59E0B' : '#10B981')}; border-radius: 4px; transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #CBD5E1; margin-bottom: 14px;">
                            <span>Fechamento: Dia ${cartao.dia_fechamento || 1}</span>
                            <span>Uso: ${percUsado}%</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
                        <button type="button" onclick="pagarFaturaCartao('${cartao.id}')" style="flex: 2; height: 38px; background: #10B981; color: #0F172A; border: none; border-radius: 8px; font-weight: 800; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                            <span>💵</span> Pagar Fatura
                        </button>
                        <button type="button" onclick="abrirModalGerenciarConta('${cartao.id}')" style="flex: 1; height: 38px; background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25); border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                            ✏️ Editar
                        </button>
                    </div>
                `;
                cartoesGrid.appendChild(cardEl);
            });
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
                    <button type="button" onclick="abrirModalGerenciarConta('novo', 'Cartão Alimentação')" style="background: linear-gradient(135deg, #EA580C, #F97316); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.82rem; box-shadow: 0 4px 12px rgba(249,115,22,0.3);">
                        ➕ Cadastrar Cartão Alimentação
                    </button>
                </div>
            `;
        } else {
            alimList.forEach(c => {
                const sal = parseFloat(c.saldo_atual) || 0;
                const cor = c.cor_cartao || '#F97316';
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
                                <span>${c.nome_conta}</span>
                            </div>
                            <span style="font-size: 0.72rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); padding: 2px 7px; border-radius: 6px; font-weight: 700;">Benefício</span>
                        </div>
                        <div style="margin-bottom: 14px;">
                            <span style="font-size: 0.72rem; color: #E2E8F0; font-weight: 600; text-transform: uppercase;">Saldo Disponível no Cartão</span>
                            <div style="font-size: 1.45rem; font-weight: 900; color: #FFFFFF; margin-top: 2px;">
                                ${formatBRL(sal)}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px;">
                        <button type="button" onclick="ajustarSaldoConta('${c.id}')" style="flex: 2; height: 36px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: #FFFFFF; border-radius: 8px; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <span>💰</span> Recarga / Ajustar Saldo
                        </button>
                        <button type="button" onclick="abrirModalGerenciarConta('${c.id}')" style="flex: 1; height: 36px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.2); color: #CBD5E1; border-radius: 8px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                            ✏️ Editar
                        </button>
                    </div>
                `;
                alimGrid.appendChild(cardA);
            });
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
                const cardC = document.createElement('div');
                cardC.style.cssText = `
                    background: #1E293B;
                    border: 1.5px solid #334155;
                    border-radius: 14px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                `;
                cardC.innerHTML = `
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="font-weight: 800; color: #FFFFFF; font-size: 0.98rem; display: flex; align-items: center; gap: 6px;">
                                <span>🏦</span> ${c.nome_conta}
                            </div>
                            <span style="font-size: 0.72rem; color: #94A3B8; background: #0F172A; padding: 2px 7px; border-radius: 6px; font-weight: 600;">${c.tipo_conta}</span>
                        </div>
                        <div style="margin-bottom: 14px;">
                            <span style="font-size: 0.72rem; color: #94A3B8; font-weight: 600; text-transform: uppercase;">Saldo Atual em Conta</span>
                            <div style="font-size: 1.4rem; font-weight: 900; color: ${sal >= 0 ? '#10B981' : '#EF4444'}; margin-top: 2px;">
                                ${formatBRL(sal)}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="ajustarSaldoConta('${c.id}')" style="flex: 2; height: 34px; background: rgba(59, 130, 246, 0.15); border: 1px solid #3B82F6; color: #93C5FD; border-radius: 7px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                            💰 Ajustar Saldo
                        </button>
                        <button type="button" onclick="abrirModalGerenciarConta('${c.id}')" style="flex: 1; height: 34px; background: #0F172A; border: 1px solid #334155; color: #CBD5E1; border-radius: 7px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
                            ✏️ Editar
                        </button>
                    </div>
                `;
                contasGrid.appendChild(cardC);
            });
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

// Abre o modal de cadastro/edição de conta ou cartão
async function abrirModalGerenciarConta(id = null, tipoPadrao = 'Cartão de Crédito') {
    window.cartaoEmEdicaoId = null;
    const m = document.getElementById('modalGerenciarContaBancaria');
    if (!m) return;

    const inpId = document.getElementById('contaBancariaId');
    const inpNome = document.getElementById('contaNome');
    const selTipo = document.getElementById('contaTipo');
    const inpLim = document.getElementById('contaLimite');
    const inpSal = document.getElementById('contaSaldo');
    const inpFec = document.getElementById('contaDiaFechamento');
    const inpVen = document.getElementById('contaDiaVencimento');
    const inpCor = document.getElementById('contaCorCartao');
    const btnExcluir = document.getElementById('btnExcluirContaBancaria');
    const tit = document.getElementById('tituloModalConta');
    const ico = document.getElementById('iconeModalConta');

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
            if (inpNome) inpNome.value = conta.nome_conta || '';
            if (selTipo) selTipo.value = conta.tipo_conta || 'Cartão de Crédito';
            if (inpLim && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpLim, conta.limite_cartao || 0);
            if (inpSal && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpSal, conta.saldo_atual || 0);
            if (inpFec) inpFec.value = conta.dia_fechamento || 1;
            if (inpVen) inpVen.value = conta.dia_vencimento || 10;
            if (inpCor) inpCor.value = conta.cor_cartao || (conta.tipo_conta === 'Cartão Alimentação' ? '#F97316' : '#2563EB');
            if (ico) {
                ico.innerText = conta.tipo_conta === 'Cartão de Crédito' ? '💳' : (conta.tipo_conta === 'Cartão Alimentação' ? '🍽️' : '🏦');
            }
            selecionarCorCartaoForm(conta.cor_cartao || (conta.tipo_conta === 'Cartão Alimentação' ? '#F97316' : '#2563EB'));
        }
    } else {
        const corPadrao = (tipoPadrao === 'Cartão Alimentação') ? '#F97316' : '#2563EB';
        if (inpId) inpId.value = '';
        if (inpNome) inpNome.value = '';
        if (selTipo) selTipo.value = tipoPadrao;
        if (inpLim && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpLim, tipoPadrao === 'Cartão de Crédito' ? 2000 : 0);
        if (inpSal && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpSal, 0);
        if (inpFec) inpFec.value = 1;
        if (inpVen) inpVen.value = 10;
        if (inpCor) inpCor.value = corPadrao;
        if (ico) {
            ico.innerText = tipoPadrao === 'Cartão de Crédito' ? '💳' : (tipoPadrao === 'Cartão Alimentação' ? '🍽️' : '🏦');
        }
        if (tit) tit.innerText = tipoPadrao === 'Cartão Alimentação' ? "Adicionar Cartão Alimentação" : "Adicionar Cartão / Conta";
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

// Alterna campos visíveis dependendo do tipo da conta (Cartão de Crédito vs Cartão Alimentação vs Conta Corrente)
function aoMudarTipoContaForm() {
    const tipo = document.getElementById('contaTipo')?.value;
    const grpLimite = document.getElementById('grpContaLimite');
    const grpSaldo = document.getElementById('grpContaSaldo');
    const grpPrazos = document.getElementById('grpPrazosFatura');
    const ico = document.getElementById('iconeModalConta');
    const lblSaldo = document.getElementById('lblContaSaldo');

    if (tipo === 'Cartão de Crédito') {
        if (grpLimite) grpLimite.style.display = 'block';
        if (grpSaldo) grpSaldo.style.display = 'none';
        if (grpPrazos) grpPrazos.style.display = 'flex';
        if (ico) ico.innerText = '💳';
    } else if (tipo === 'Cartão Alimentação') {
        if (grpLimite) grpLimite.style.display = 'none';
        if (grpSaldo) grpSaldo.style.display = 'block';
        if (grpPrazos) grpPrazos.style.display = 'none';
        if (lblSaldo) lblSaldo.innerText = 'Saldo Disponível no Cartão';
        if (ico) ico.innerText = '🍽️';
    } else {
        if (grpLimite) grpLimite.style.display = 'none';
        if (grpSaldo) grpSaldo.style.display = 'block';
        if (grpPrazos) grpPrazos.style.display = 'none';
        if (lblSaldo) lblSaldo.innerText = 'Saldo Atual em Conta';
        if (ico) ico.innerText = '🏦';
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
    const nome = document.getElementById('contaNome')?.value.trim();
    const tipo = document.getElementById('contaTipo')?.value || 'Cartão de Crédito';
    const limite = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('contaLimite')?.value) : 0;
    const saldo = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('contaSaldo')?.value) : 0;
    const fechamento = parseInt(document.getElementById('contaDiaFechamento')?.value, 10) || 1;
    const vencimento = parseInt(document.getElementById('contaDiaVencimento')?.value, 10) || 10;
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
        limite_cartao: parseFloat(limite) || 0,
        saldo_atual: parseFloat(saldo) || 0,
        dia_fechamento: fechamento,
        dia_vencimento: vencimento,
        cor_cartao: cor,
        banco: nome,
        user_id: currentUserId,
        deleted: 0,
        sync_status: window.cartaoEmEdicaoId ? 'pending_update' : 'pending_insert',
        updated_at: ts
    };

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
    const novoValorStr = prompt(`Ajustar saldo da conta '${conta.nome_conta}':\n\nSaldo atual: ${saldoAtualFmt}\n\nDigite o novo saldo (Ex: 1500,00):`);
    if (novoValorStr === null) return;

    const valLimpo = novoValorStr.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const novoSaldo = parseFloat(valLimpo);
    if (isNaN(novoSaldo)) {
        alert("Valor inválido.");
        return;
    }

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
