let currentViewDate = new Date(); // Inicia com o mês e ano atuais (Hoje)

if (typeof window.showToast !== 'function') {
  window.showToast = function(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#10b981';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '20px';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    toast.style.zIndex = '999999';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '700';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
  };
}

// Reset inicial único para iniciar do zero conforme solicitação
async function checarResetInicialDoZero() {
    const CLEAN_KEY = 'financas_clean_slate_v1_0_6';
    if (!localStorage.getItem(CLEAN_KEY)) {
        try {
            if (typeof dbLocal !== 'undefined' && dbLocal) {
                await dbLocal.movimentacoes.clear();
            }
            localStorage.setItem('lastSyncTimestamp', '0');
            localStorage.setItem(CLEAN_KEY, 'done');
            console.log('Base de dados zerada com sucesso para início do zero.');
        } catch (e) {
            console.warn('Reset inicial:', e);
        }
    }
}

window.privacyMode = false;

window.togglePrivacyMode = function() {
    window.privacyMode = !window.privacyMode;
    const iconOpen = document.getElementById('iconPrivacyOpen');
    const iconClosed = document.getElementById('iconPrivacyClosed');
    
    // Quando privacyMode === false (visível): mostra Olho Aberto
    // Quando privacyMode === true (oculto): mostra Olho Riscado/Fechado
    if(iconOpen) iconOpen.style.display = window.privacyMode ? 'none' : 'block';
    if(iconClosed) iconClosed.style.display = window.privacyMode ? 'block' : 'none';
    
    carregarPlanejamento();
    if(document.getElementById('tabAPagar') && document.getElementById('tabAPagar').style.display === 'block') {
        if(typeof carregarContasAPagar === 'function') carregarContasAPagar();
    }
    if(document.getElementById('tabDesejos') && document.getElementById('tabDesejos').style.display === 'block') {
        if(typeof carregarListaDesejos === 'function') carregarListaDesejos();
    }
    if(document.getElementById('modalFatura') && document.getElementById('modalFatura').style.display === 'flex') {
        const mesAtualLabel = document.getElementById('lblFaturaTituloMes') ? document.getElementById('lblFaturaTituloMes').innerText : '';
        abrirModalFatura(mesAtualLabel);
    }
    if(typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display !== 'none') {
        renderPowerBIDashboard();
    }
    if(typeof renderizarExtratoCompleto === 'function') {
        renderizarExtratoCompleto();
    }
};

function initHeader() {
    // Preencher select de anos
    const anoSelect = document.getElementById('anoBaseSelector');
    if (anoSelect && anoSelect.options.length === 0) {
        const anoAtual = new Date().getFullYear();
        for (let i = anoAtual - 2; i <= anoAtual + 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = i;
            anoSelect.appendChild(option);
        }
    }
    if (anoSelect) anoSelect.value = currentViewDate.getFullYear();

    const mesSelect = document.getElementById('mesBaseSelector');
    if (mesSelect) mesSelect.value = currentViewDate.getMonth();
    
    // Aplicar tema salvo
    const temaSalvo = localStorage.getItem('app_tema');
    if (temaSalvo) {
        const sel = document.getElementById('temaSelector');
        if (sel) sel.value = temaSalvo;
        aplicarTema(temaSalvo);
    }
}

function updateMonthLabel() {
    const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    const displayDate = currentViewDate;
    const diaNome = diasSemana[displayDate.getDay()];
    const diaNum = displayDate.getDate();
    const mesNome = mesesCompletos[displayDate.getMonth()];
    const ano = displayDate.getFullYear();
    
    const displayElement = document.getElementById('fullDateDisplay');
    if (displayElement) displayElement.innerText = `${diaNome}, ${diaNum} de ${mesNome} de ${ano}`;

    const anoSelect = document.getElementById('anoBaseSelector');
    if (anoSelect) anoSelect.value = ano;

    const mesSelect = document.getElementById('mesBaseSelector');
    if (mesSelect) mesSelect.value = displayDate.getMonth();

    const badgeMesHero = document.getElementById('lblFaturaMesHero');
    if (badgeMesHero) {
        const hoje = new Date();
        const isMesAtual = (hoje.getMonth() === displayDate.getMonth() && hoje.getFullYear() === displayDate.getFullYear());
        badgeMesHero.innerText = isMesAtual ? 'Mês Ativo' : `${mesNome}/${ano}`;
        badgeMesHero.title = isMesAtual ? 'Você está visualizando o mês atual' : 'Clique para voltar ao mês atual';
    }

    carregarPlanejamento();
    if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
}

function selecionarMes(mesIndex) {
    currentViewDate.setMonth(parseInt(mesIndex));
    updateMonthLabel();
    if(document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display === 'block' && typeof renderPowerBIDashboard === 'function') {
        renderPowerBIDashboard();
    }
}

function selecionarAno(anoStr) {
    currentViewDate.setFullYear(parseInt(anoStr));
    updateMonthLabel();
    if(document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display === 'block' && typeof renderPowerBIDashboard === 'function') {
        renderPowerBIDashboard();
    }
}

function selecionarMesAtual() {
    currentViewDate = new Date();
    updateMonthLabel();
    showToast('Visualizando o mês atual!');
}

function irParaSecao(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function abrirModalLancamentoComTipo(tipo) {
    abrirModalLancamento();
    const select = document.getElementById('inputTipoGasto');
    if (select) {
        select.value = tipo;
        atualizarTextoStatus();
    }
}

async function zerarTodosLancamentos() {
    if (!confirm("⚠️ ATENÇÃO: Tem certeza de que deseja zerar todos os lançamentos existentes e iniciar do zero?\n\nEsta ação limpará todas as movimentações e receitas/despesas registradas.")) {
        return;
    }
    
    try {
        if (typeof dbLocal !== 'undefined' && dbLocal) {
            await dbLocal.movimentacoes.clear();
        }
        localStorage.setItem('lastSyncTimestamp', '0');
        
        await fetch('/api/database/reset', { method: 'POST' });
        
        showToast('Todos os lançamentos foram zerados! Pronto para iniciar do zero.');
        fecharModalPerfil();
        carregarPlanejamento();
        if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
        if (typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();
    } catch (e) {
        console.error('Erro ao zerar dados:', e);
        showToast('Dados locais zerados com sucesso!');
        carregarPlanejamento();
    }
}

// -- AÃ‡Ã•ES DO CABEÃ‡ALHO --
function compartilharApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Gestão Financeira',
            text: 'Confira nosso aplicativo de Gestão Financeira Familiar!',
            url: window.location.href
        }).catch(err => console.log('Erro ao compartilhar', err));
    } else {
        alert('Compartilhamento não suportado neste dispositivo/navegador. Compartilhe o link do site!');
    }
}

async function salvarBackup() {
    try {
        const movs = await dbLocal.movimentacoes.toArray();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(movs));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `backup_financeiro_${Date.now()}.json`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    } catch (e) {
        alert('Erro ao salvar backup.');
    }
}

function mudarTema(corStr) {
    localStorage.setItem('app_tema', corStr);
    aplicarTema(corStr);
}

function aplicarTema(corStr) {
    const root = document.documentElement;
    if (corStr === 'blue') root.style.setProperty('--btn-primary', '#3B82F6');
    if (corStr === 'green') root.style.setProperty('--btn-primary', '#10B981');
    if (corStr === 'purple') root.style.setProperty('--btn-primary', '#8B5CF6');
    if (corStr === 'orange') root.style.setProperty('--btn-primary', '#F59E0B');
}

// ------------------------------------------------------------------
// LOGICA INTELIGENTE DE PROJEÃ‡AO DE PARCELAS E RESUMO
// ------------------------------------------------------------------
async function carregarPlanejamento() {
    // Pega todas as movimentações do IndexedDB local
    const movs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
    const itensDoMes = [];

    const targetYear = currentViewDate.getFullYear();
    const targetMonth = currentViewDate.getMonth();

    // Saldo histórico da Reserva de Emergência
    let reservaOrcadoTotal = 0;
    let reservaRealizadoTotal = 0;

    movs.forEach(m => {
        // Regra especial para "Lista de Desejos": Se estiver Pendente, só aparece na Aba Desejos.
        if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
        
        // Regra especial para "Conta a Pagar": Nunca aparece no painel, é exclusivo da Gaveta
        if (m.tipo_gasto === 'Conta a Pagar') return;

        // Se por acaso faltar a data, a gente ignora do calendário.
        if (!m.data_lancamento) return;

        const [year, month, day] = m.data_lancamento.split('-');
        const launchDate = new Date(year, parseInt(month) - 1, day);
        
        let effectiveMonth = launchDate.getMonth();
        let effectiveYear = launchDate.getFullYear();
        if (m.tipo_gasto === 'Cartão de Crédito' && parseInt(day) > 25) {
            effectiveMonth++;
            if (effectiveMonth > 11) {
                effectiveMonth = 0;
                effectiveYear++;
            }
        }
        
        const diffMonths = (targetYear - effectiveYear) * 12 + (targetMonth - effectiveMonth);

        // Calcula o Saldo Acumulado da Reserva (Tudo que aconteceu ATÃ‰ o mês atual)
        if (m.status !== 'Cancelado' && diffMonths >= 0) {
            const histOrcado = parseFloat(m.valor_total) || 0;
            const histRealizado = parseFloat(m.valor_realizado) || 0;
            
            // Tratamento especial para o histórico da reserva (ignora parcelamento da reserva para simplificar, já que não faz sentido parcelar a reserva)
            if (m.tipo_gasto === 'Reserva de Emergência') {
                reservaOrcadoTotal += histOrcado;
                reservaRealizadoTotal += histRealizado;
            } else if (m.tipo_gasto === 'Resgate de Reserva') {
                reservaOrcadoTotal -= histOrcado;
                reservaRealizadoTotal -= histRealizado;
            }
        }

        if (diffMonths === 0) {
            itensDoMes.push({ ...m, isVirtual: false });
        } else if (diffMonths > 0) {
            if (m.parcelado === 'Sim' && m.id_grupo) {
                const novaParcela = parseInt(m.parcela_atual) + diffMonths;
                if (novaParcela <= parseInt(m.total_parcelas)) {
                    const projM = { ...m, isVirtual: true };
                    projM.parcela_atual = novaParcela;
                    if(projM.status !== 'Cancelado') {
                        projM.status = 'Pendente'; 
                        
                        const virtualDate = new Date(launchDate);
                        virtualDate.setMonth(virtualDate.getMonth() + diffMonths);
                        projM.data_lancamento = virtualDate.toISOString().split('T')[0];
                        
                        itensDoMes.push(projM);
                    }
                }
            }
        }
    });

    // --- CÁLCULO DO PAINEL DE RESUMO (ORÃ‡ADO VS REALIZADO) ---
    let recRealizado = 0, recOrcado = 0;
    let despRealizado = 0, despOrcado = 0;
    let invRealizado = 0, invOrcado = 0;

    itensDoMes.forEach(item => {
        if (item.status === 'Cancelado') return;

        const vOrcado = parseFloat(item.valor_total) || 0;
        const vRealizado = parseFloat(item.valor_realizado) || 0;

        if (item.tipo_gasto === 'Receita' || item.tipo_gasto === 'Resgate de Reserva') {
            // Resgate entra como "Receita" do mês para cobrir o buraco
            recOrcado += vOrcado; 
            recRealizado += vRealizado; 
        } else if (item.tipo_gasto === 'Investimento' || item.tipo_gasto === 'Reserva de Emergência') {
            invOrcado += vOrcado;
            invRealizado += vRealizado;
        } else {
            despOrcado += vOrcado;
            despRealizado += vRealizado;
        }
    });

    // Atualiza a interface do Painel
    const formatCurrency = (val) => {
        if (window.privacyMode) return '•••••';
        return 'R$ ' + val.toFixed(2).replace('.', ',');
    };
    
    document.getElementById('valReceitaRealizado').innerText = formatCurrency(recRealizado);
    document.getElementById('valReceitaOrcado').innerText = formatCurrency(recOrcado);
    
    document.getElementById('valDespesaRealizado').innerText = formatCurrency(despRealizado);
    document.getElementById('valDespesaOrcado').innerText = formatCurrency(despOrcado);

    document.getElementById('valInvestimentoRealizado').innerText = formatCurrency(invRealizado);
    document.getElementById('valInvestimentoOrcado').innerText = formatCurrency(invOrcado);
    
    // Atualiza o novo cartão da Reserva Histórica Acumulada
    document.getElementById('valReservaRealizado').innerText = formatCurrency(reservaRealizadoTotal);
    document.getElementById('valReservaOrcado').innerText = formatCurrency(reservaOrcadoTotal);
    
    // Atualizado: Saldo = Receitas - Despesas - Investimentos
    const saldoRealizado = recRealizado - despRealizado - invRealizado;
    const saldoOrcado = recOrcado - despOrcado - invOrcado;
    
    const formatCurrencyDiff = (val) => {
        if (window.privacyMode) return '•••••';
        return 'R$ ' + Math.abs(val).toFixed(2).replace('.', ',');
    };
    
    // Orçado
    const colorOrcado = saldoOrcado >= 0 ? '#10B981' : '#EF4444';
    const elOrcado = document.getElementById('valSaldoOrcado');
    if(elOrcado) {
        elOrcado.innerText = formatCurrencyDiff(saldoOrcado);
        elOrcado.style.color = colorOrcado;
    }

    // Realizado
    const colorRealizado = saldoRealizado >= 0 ? '#10B981' : '#EF4444';
    const elRealizado = document.getElementById('valSaldoRealizado');
    if(elRealizado) {
        elRealizado.innerText = formatCurrencyDiff(saldoRealizado);
        elRealizado.style.color = colorRealizado;
    }

    const elHero = document.getElementById('valSaldoHero');
    if(elHero) {
        elHero.innerText = (saldoRealizado < 0 ? '- ' : '') + formatCurrencyDiff(saldoRealizado);
        elHero.style.color = colorRealizado;
    }

    // Atualiza KPIs no Hero Card
    const elKpiRec = document.getElementById('kpiHeroReceitas');
    if (elKpiRec) elKpiRec.innerText = formatCurrency(recRealizado);
    const elKpiRecOrc = document.getElementById('kpiHeroReceitasOrc');
    if (elKpiRecOrc) elKpiRecOrc.innerText = 'Orç: ' + formatCurrency(recOrcado);

    const elKpiDesp = document.getElementById('kpiHeroDespesas');
    if (elKpiDesp) elKpiDesp.innerText = formatCurrency(despRealizado);
    const elKpiDespOrc = document.getElementById('kpiHeroDespesasOrc');
    if (elKpiDespOrc) elKpiDespOrc.innerText = 'Orç: ' + formatCurrency(despOrcado);

    const elKpiInv = document.getElementById('kpiHeroInvestimentos');
    if (elKpiInv) elKpiInv.innerText = formatCurrency(invRealizado);
    const elKpiRes = document.getElementById('kpiHeroReserva');
    if (elKpiRes) elKpiRes.innerText = 'Res: ' + formatCurrency(reservaRealizadoTotal);

    // Salva itens globalmente para filtros e extrato
    window.currentMesItens = itensDoMes;

    // Lógica da Fatura do Cartão de Crédito
    window.currentFaturaItens = itensDoMes.filter(m => m.tipo_gasto === 'Cartão de Crédito' && m.status !== 'Cancelado');
    window.currentFaturaTotal = window.currentFaturaItens.reduce((acc, item) => acc + (parseFloat(item.valor_total) || 0), 0);
    const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    window.currentFaturaMes = mesesCompletos[targetMonth];
    
    const cardFatura = document.getElementById('cardFaturaCartao');
    if (cardFatura) {
        if (window.currentFaturaItens.length > 0) {
            cardFatura.style.display = 'block';
            document.getElementById('lblFaturaMes').innerText = window.currentFaturaMes;
        } else {
            cardFatura.style.display = 'none';
        }
    }

    // Prepara a lista para renderizar (Despesas e Entradas pendentes)
    // Cartão de Crédito NAO vai pra lista principal de Pendentes, vai apenas pra Fatura!
    const pendentesParaExibir = itensDoMes.filter(item => (item.status === 'Pendente' || item.status === 'Cancelado') && item.tipo_gasto !== 'Cartão de Crédito');
    renderizarLista(pendentesParaExibir);
    renderizarExtratoCompleto();

    // Injeta o Item da Fatura na lista de Despesas (Painel Principal) se existir
    if (window.currentFaturaItens && window.currentFaturaItens.length > 0) {
        const containerDespesas = document.getElementById('listaMovimentacoes');
        if (containerDespesas) {
            const divFatura = document.createElement('div');
            divFatura.className = 'card';
            divFatura.style.cursor = 'pointer';
            divFatura.onclick = () => abrirModalFatura();
            
            divFatura.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div class="card-details">
                        <h4 style="display:flex; align-items:center; gap:8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                            Fatura do Cartão
                        </h4>
                        <p>${window.currentFaturaMes}</p>
                    </div>
                    <div style="text-align: right;">
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 2px;">Fatura Atual</div>
                    <div style="font-size: 1.1rem; font-weight: bold; color: var(--text-primary);">
                        ${window.privacyMode ? '•••••' : (val => 'R$ ' + val.toFixed(2).replace('.', ','))(window.currentFaturaTotal)}
                    </div>
                </div>
            `;
            containerDespesas.insertBefore(divFatura, containerDespesas.firstChild);
        }
    }
}

function renderizarLista(itens) {
    const containerDespesas = document.getElementById('listaMovimentacoes');
    const containerEntradas = document.getElementById('listaEntradas');
    
    containerDespesas.innerHTML = '';
    containerEntradas.innerHTML = '';

    if (itens.length === 0) {
        containerDespesas.innerHTML = '<p style="text-align:center; color:#94A3B8;">Nenhuma saída pendente para este mês.</p>';
        containerEntradas.innerHTML = '<p style="text-align:center; color:#94A3B8;">Nenhuma entrada pendente para este mês.</p>';
        return;
    }

    itens.sort((a, b) => new Date(a.data_lancamento) - new Date(b.data_lancamento));

    itens.forEach(item => {
        const [y, m, d] = item.data_lancamento.split('-');
        const dataBr = `${d}/${m}`;
        
        let cssClass = item.isVirtual ? 'projected' : 'pending';
        if(item.status === 'Cancelado') cssClass = 'cancelled'; 
        
        const tagVirtual = item.isVirtual ? '<span class="badge" style="background:#EDE9FE; color:#8B5CF6;">Projeção Futura</span>' : '';
        const tagParcela = item.parcelado === 'Sim' ? `<span class="badge">Parc. ${item.parcela_atual}/${item.total_parcelas}</span>` : '';
        const tagCancelado = item.status === 'Cancelado' ? `<span class="badge" style="background:#FEE2E2; color:#EF4444;">Cancelado</span>` : '';

        const btnActions = item.isVirtual ? 
            `<p style="font-size:0.75rem; color:#94A3B8; margin-top:5px;">Para editar, acesse o mês da 1ª parcela.</p>` :
            `<div style="display:flex; gap:8px; margin-top:8px;">
                <button onclick="editarLancamento('${item.id}')" style="background:#E0F2FE; color:#0284C7; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">Editar</button>
                <button onclick="excluirLancamento('${item.id}')" style="background:#FEE2E2; color:#EF4444; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;">Excluir</button>
            </div>`;

        const div = document.createElement('div');
        div.className = `card ${cssClass}`;
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        
        const vOrcado = window.privacyMode ? '•••••' : parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',');
        const vRealizado = window.privacyMode ? '•••••' : parseFloat(item.valor_realizado || 0).toFixed(2).replace('.', ',');

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <div class="card-details">
                    <h4>${item.descricao} ${tagCancelado}</h4>
                    <p>Venc: ${dataBr} &nbsp; ${tagParcela} ${tagVirtual}</p>
                </div>
                <div class="card-value" style="text-align: right; ${item.status === 'Cancelado' ? 'text-decoration: line-through; color:#94A3B8;' : ''}">
                    <div style="font-size:0.8rem; font-weight:normal; color:#64748B;">Orçado: R$ ${vOrcado}</div>
                    <div>Realiz: R$ ${vRealizado}</div>
                </div>
            </div>
            ${btnActions}
        `;
        if (item.tipo_gasto === 'Receita') {
            containerEntradas.appendChild(div);
        } else {
            containerDespesas.appendChild(div);
        }
    });

    if (containerDespesas.innerHTML === '') {
        containerDespesas.innerHTML = '<p style="text-align:center; color:#94A3B8; padding: 1rem;">Nenhuma saída planejada para este mês.</p>';
    }
    if (containerEntradas.innerHTML === '') {
        containerEntradas.innerHTML = '<p style="text-align:center; color:#94A3B8; padding: 1rem;">Nenhuma entrada planejada para este mês.</p>';
    }
}

// ------------------------------------------------------------------
// LOGICA DO MODAL, NOVO E EDITAR
// ------------------------------------------------------------------

function atualizarTextoStatus() {
    const tipo = document.getElementById('inputTipoGasto').value;
    const statusSelect = document.getElementById('inputStatus');
    if (statusSelect && statusSelect.options.length > 1) {
        if (tipo === 'Lista de Desejos') {
            statusSelect.options[1].text = 'Programar / Conquistado';
        } else if (tipo === 'Conta a Pagar') {
            statusSelect.options[1].text = 'Programado';
        } else {
            statusSelect.options[1].text = 'Pago';
        }
    }
    const extras = document.getElementById('modalDesejoExtras');
    if (extras) {
        extras.style.display = (tipo === 'Lista de Desejos') ? 'block' : 'none';
    }
}


function fecharModalLancamento() {
    const m = document.getElementById('modalLancamento');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
}

function abrirModalLancamento() {
    document.getElementById('inputIdMovimentacao').value = '';
    document.getElementById('formLancamento').reset();
    document.getElementById('inputParcelado').disabled = false;
    document.getElementById('divParcelas').style.display = 'none';
    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'none';
    if(document.getElementById('divDataFim')) document.getElementById('divDataFim').style.display = 'none';
    
    // Resetar campos de Desejo do Modal
    const modalInputLink = document.getElementById('modalInputLinkUrl');
    if (modalInputLink) modalInputLink.value = '';
    if (typeof removerMidiaModalDesejo === 'function') removerMidiaModalDesejo();

    // Preenche a data padrão com a data de hoje
    const inputData = document.getElementById('inputData');
    if (inputData) {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const dd = String(hoje.getDate()).padStart(2, '0');
        inputData.value = `${yyyy}-${mm}-${dd}`;
    }

    document.getElementById('btnSalvar').innerText = 'Salvar Lançamento';
    const m = document.getElementById('modalLancamento');
    if (m) {
        m.style.display = 'flex';
        const content = m.querySelector('.modal-content');
        if (content) content.scrollTop = 0;
    }
    document.body.style.overflow = 'hidden';
    atualizarTextoStatus();
}

function toggleParcelas() {
    const isChecked = document.getElementById('inputParcelado').checked;
    document.getElementById('divParcelas').style.display = isChecked ? 'block' : 'none';
}

function toggleRecorrencia() {
    const rec = document.getElementById('inputRecorrencia').value;
    document.getElementById('divDataFim').style.display = rec === 'DataFinal' ? 'block' : 'none';
}

async function editarLancamento(id) {
    if (!id) return;
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) {
        showToast('Lançamento não encontrado.');
        return;
    }

    abrirModalLancamento(); // Prepara o modal e carrega campos

    document.getElementById('inputIdMovimentacao').value = item.id;
    document.getElementById('inputTipoGasto').value = item.tipo_gasto;
    document.getElementById('inputDescricao').value = item.descricao;
    document.getElementById('inputValor').value = item.valor_total;
    document.getElementById('inputValorRealizado').value = item.valor_realizado || 0;
    document.getElementById('inputData').value = item.data_lancamento;
    document.getElementById('inputStatus').value = item.status;
    
    // Carregar extras de lista de desejos no modal
    if (item.tipo_gasto === 'Lista de Desejos') {
        const modalInputLink = document.getElementById('modalInputLinkUrl');
        if (modalInputLink) modalInputLink.value = item.link_url || '';
        if (item.midia_url && typeof carregarMidiaNoModal === 'function') {
            carregarMidiaNoModal(item.midia_url, item.midia_tipo || 'foto');
        }
    }

    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'block';

    document.getElementById('inputParcelado').checked = (item.parcelado === 'Sim');
    document.getElementById('inputParcelado').disabled = true; 
    toggleParcelas();

    if(item.parcelado === 'Sim') {
        document.getElementById('inputTotalParcelas').value = item.total_parcelas;
    }

    document.getElementById('btnSalvar').innerText = 'Atualizar Lançamento';
    atualizarTextoStatus();
}
window.editarLancamento = editarLancamento;

async function excluirLancamento(id) {
    if (!id) return;
    if(!confirm("Tem certeza que deseja excluir permanentemente este lançamento?")) return;
    
    let item = await dbLocal.movimentacoes.get(id);
    let targetId = id;
    if (!item && !isNaN(id)) {
        item = await dbLocal.movimentacoes.get(Number(id));
        if (item) targetId = Number(id);
    }
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
        if (item) targetId = item.id;
    }
    
    const timestamp = Date.now();
    if (item) {
        await dbLocal.movimentacoes.update(targetId, { deleted: 1, sync_status: 'pending_update', updated_at: timestamp });
    } else {
        await dbLocal.movimentacoes.delete(targetId);
    }
    
    showToast('Lançamento excluído com sucesso!');
    carregarPlanejamento();
    if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.excluirLancamento = excluirLancamento;

async function salvarLancamento(event) {
    event.preventDefault();
    
    const idAtual = document.getElementById('inputIdMovimentacao').value;
    const tipoGasto = document.getElementById('inputTipoGasto').value;
    const descricao = document.getElementById('inputDescricao').value;
    const valorOrcado = parseFloat(document.getElementById('inputValor').value) || 0;
    const valorRealizado = parseFloat(document.getElementById('inputValorRealizado').value) || 0;
    const data = document.getElementById('inputData').value;
    const status = document.getElementById('inputStatus').value;
    const isParcelado = document.getElementById('inputParcelado').checked;
    const totalParcelas = isParcelado ? parseInt(document.getElementById('inputTotalParcelas').value) : 1;
    
    // Validação de Data: Obrigatória apenas se não for da Gaveta ou Lista de Desejos PENDENTE
    if (!data && tipoGasto !== 'Conta a Pagar' && tipoGasto !== 'Lista de Desejos') {
        alert("Por favor, informe a Data do lançamento para que ele apareça no Painel!");
        return;
    }
    
    const timestamp = Date.now();

    // Campos extras se for Lista de Desejos
    let linkDesejo = '';
    let midiaUrlDesejo = '';
    let midiaTipoDesejo = '';
    if (tipoGasto === 'Lista de Desejos') {
        const inputLink = document.getElementById('modalInputLinkUrl');
        if (inputLink) linkDesejo = inputLink.value.trim();
        if (typeof midiaModalDesejoTemp !== 'undefined') {
            midiaUrlDesejo = midiaModalDesejoTemp.url || '';
            midiaTipoDesejo = midiaModalDesejoTemp.tipo || '';
        }
    }

    if (idAtual) {
        // UPDATE (Edição)
        const updateData = {
            descricao: descricao,
            valor_total: valorOrcado,
            valor_realizado: valorRealizado,
            data_lancamento: data,
            tipo_gasto: tipoGasto,
            status: status,
            sync_status: 'pending_update',
            updated_at: timestamp
        };
        if (tipoGasto === 'Lista de Desejos') {
            updateData.link_url = linkDesejo;
            if (midiaUrlDesejo) {
                updateData.midia_url = midiaUrlDesejo;
                updateData.midia_tipo = midiaTipoDesejo;
            } else if (typeof midiaModalDesejoRemovida !== 'undefined' && midiaModalDesejoRemovida) {
                updateData.midia_url = '';
                updateData.midia_tipo = '';
            }
        }
        await dbLocal.movimentacoes.update(idAtual, updateData);
        console.log('Lançamento atualizado localmente:', idAtual);
        showToast('Lançamento atualizado!');
    } else {
        // INSERT (Novo)
        const recorrencia = document.getElementById('inputRecorrencia') ? document.getElementById('inputRecorrencia').value : 'Unica';
        const dataFimStr = document.getElementById('inputDataFim') ? document.getElementById('inputDataFim').value : '';
        
        let qtdCriar = 1;
        if (isParcelado) {
            qtdCriar = totalParcelas;
        } else if (recorrencia === 'Continua') {
            qtdCriar = 60; // 5 anos
        } else if (recorrencia === 'DataFinal' && dataFimStr) {
            const dataBaseObj = new Date(data + "T12:00:00");
            const [anoFim, mesFim] = dataFimStr.split('-');
            const dataFimObj = new Date(anoFim, parseInt(mesFim) - 1, dataBaseObj.getDate() || 1, 12, 0, 0);
            let diffMeses = (dataFimObj.getFullYear() - dataBaseObj.getFullYear()) * 12 + (dataFimObj.getMonth() - dataBaseObj.getMonth());
            qtdCriar = diffMeses >= 0 ? diffMeses + 1 : 1;
        }

        const idGrupo = (isParcelado || qtdCriar > 1) ? 'GRP-' + generateUUID().split('-')[0].toUpperCase() : '';
        const baseDate = data ? new Date(data + "T12:00:00") : null;

        const valorFinalPorParcela = isParcelado ? (valorOrcado / totalParcelas) : valorOrcado;
        const valorRealizadoPorParcela = isParcelado ? (valorRealizado / totalParcelas) : valorRealizado;

        for (let i = 0; i < qtdCriar; i++) {
            let nextDateStr = '';
            if (baseDate) {
                let nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0);
                nextDateStr = nextDate.toISOString().split('T')[0];
            }
            
            let desc = descricao;
            if (isParcelado) desc = `${descricao} (${i + 1}/${totalParcelas})`;
            
            const l_valor_realizado = i === 0 ? valorRealizadoPorParcela : 0;
            const l_status = i === 0 ? status : 'Pendente';
            
            const novoLancamento = {
                id: generateUUID(),
                descricao: desc,
                valor_total: valorFinalPorParcela,
                valor_realizado: l_valor_realizado,
                data_lancamento: nextDateStr,
                tipo_gasto: tipoGasto,
                status: l_status,
                conta_id: '1',
                parcelado: isParcelado ? 'Sim' : 'Não',
                total_parcelas: isParcelado ? totalParcelas : 1,
                parcela_atual: isParcelado ? (i + 1) : 1,
                id_grupo: idGrupo,
                link_url: linkDesejo,
                midia_url: midiaUrlDesejo,
                midia_tipo: midiaTipoDesejo,
                deleted: 0,
                sync_status: 'pending_insert',
                updated_at: timestamp
            };
            await dbLocal.movimentacoes.put(novoLancamento);
        }
        console.log(`Foram salvos ${qtdCriar} lançamentos localmente.`);
        showToast(qtdCriar > 1 ? `Foram adicionados ${qtdCriar} lançamentos com sucesso!` : 'Lançamento adicionado com sucesso!');
    }
    
    fecharModalLancamento();
    carregarPlanejamento();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
    
    if (tipoGasto === 'Lista de Desejos') {
        switchFinanceTab('Desejos');
    } else if (tipoGasto === 'Conta a Pagar') {
        switchFinanceTab('APagar');
    } else {
        switchFinanceTab('Painel');
    }
}

async function excluirLancamentoAtual() {
    const idAtual = document.getElementById('inputIdMovimentacao').value;
    if(!idAtual) return;
    
    if(confirm("Tem certeza que deseja excluir este lançamento?")) {
        await dbLocal.movimentacoes.update(idAtual, {
            deleted: 1,
            sync_status: 'pending_update',
            updated_at: Date.now()
        });
        showToast('Lançamento excluído!');
        fecharModalLancamento();
        carregarPlanejamento();
        if(typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
        if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
        
        if (document.getElementById('modalFatura').style.display === 'flex') {
            fecharModalFatura();
        }
    }
}

// --- SISTEMA DE ABAS ORGANIZADO (DESKTOP & MOBILE) ---
function switchFinanceTab(tabName) {
    const tabs = ['Painel', 'Lancamentos', 'PowerBI', 'APagar', 'Desejos'];
    
    // Oculta todas as abas
    tabs.forEach(t => {
        const el = document.getElementById('tab' + t);
        if (el) el.style.display = 'none';
    });

    // Exibe a aba escolhida
    const targetTab = document.getElementById('tab' + tabName);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    // Sincroniza classes ativas nos botões (desktop e mobile)
    tabs.forEach(t => {
        const btnDesktop = document.getElementById('nav' + t);
        const btnMobile = document.getElementById('mNav' + t);
        if (btnDesktop) btnDesktop.classList.toggle('active', t === tabName);
        if (btnMobile) btnMobile.classList.toggle('active', t === tabName);
    });

    if (tabName === 'PowerBI' && typeof renderPowerBIDashboard === 'function') {
        setTimeout(renderPowerBIDashboard, 100);
    } else if (tabName === 'Desejos') {
        carregarListaDesejos();
    } else if (tabName === 'APagar') {
        carregarContasAPagar();
    } else if (tabName === 'Lancamentos') {
        carregarPlanejamento();
        if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
    } else if (tabName === 'Painel') {
        carregarPlanejamento();
    }

    // Rola para o topo suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchTab = switchFinanceTab;

// --- CARREGAR CONTAS A PAGAR (GAVETA) ---
async function carregarContasAPagar() {
    const movs = await dbLocal.movimentacoes.toArray();
    const contasAPagar = movs.filter(m => m.tipo_gasto === 'Conta a Pagar' && m.deleted !== 1 && m.status !== 'Cancelado' && m.status !== 'Pago');
    
    const container = document.getElementById('listaAPagarContainer');
    container.innerHTML = '';

    if (contasAPagar.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #64748B;">Nenhuma conta na gaveta. Você está em dia!</div>';
        return;
    }

    contasAPagar.forEach(c => {
        const div = document.createElement('div');
        div.className = 'desejo-card';
        div.style.borderLeftColor = '#F59E0B'; // Laranja

        div.innerHTML = `
            <div class="card-details" style="flex:1;">
                <h4>${c.descricao}</h4>
                <p>Valor Estimado: ${window.privacyMode ? '•••••' : 'R$ ' + parseFloat(c.valor_total).toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="card-actions">
                <button class="btn-editar" onclick="editarLancamento('${c.id}')">Editar</button>
                <button class="btn-excluir" onclick="excluirLancamento('${c.id}')">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ==================================================================
// MÓDULO LISTA DE DESEJOS - FOTOS, VÍDEOS, LINK DA FONTE E LIGHTBOX
// ==================================================================

// Variáveis temporárias de mídia para a criação rápida e modal
let midiaDesejoTemp = { url: '', tipo: '' };
let midiaModalDesejoTemp = { url: '', tipo: '' };
let midiaModalDesejoRemovida = false;

// Otimização de imagem via Canvas para alta performance e leveza
function otimizarImagemDesejo(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
    });
}

// Leitura de vídeo com validação de tamanho (máx 25MB)
function lerVideoDesejo(file) {
    return new Promise((resolve, reject) => {
        if (file.size > 25 * 1024 * 1024) {
            alert('O vídeo selecionado ultrapassa 25MB. Grave um vídeo mais curto (até 30 segundos).');
            return reject(new Error('Vídeo muito grande'));
        }
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erro ao ler vídeo'));
        reader.readAsDataURL(file);
    });
}

// Manipulador de upload para a criação rápida
window.capturarMidiaDesejo = async function(input, tipoDesejado) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const isVideo = file.type.startsWith('video/') || tipoDesejado === 'video';

    try {
        showToast('Processando mídia...');
        if (isVideo) {
            const videoData = await lerVideoDesejo(file);
            midiaDesejoTemp = { url: videoData, tipo: 'video' };
        } else {
            const fotoData = await otimizarImagemDesejo(file);
            midiaDesejoTemp = { url: fotoData, tipo: 'foto' };
        }
        renderizarPreviewMidiaDesejo();
        showToast('Mídia anexada com sucesso!');
    } catch(err) {
        console.error('Erro ao capturar mídia:', err);
    }
};

function renderizarPreviewMidiaDesejo() {
    const container = document.getElementById('previewMidiaContainer');
    const thumb = document.getElementById('previewMidiaThumb');
    const titulo = document.getElementById('previewMidiaTitulo');
    const info = document.getElementById('previewMidiaInfo');
    if (!container || !thumb) return;

    if (!midiaDesejoTemp.url) {
        container.style.display = 'none';
        thumb.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    if (midiaDesejoTemp.tipo === 'video') {
        thumb.innerHTML = `<video src="${midiaDesejoTemp.url}" muted style="width:100%; height:100%; object-fit:cover;"></video>`;
        if (titulo) titulo.innerText = '🎥 Vídeo Gravado Anexado';
        if (info) info.innerText = 'Pronto para salvar no seu desejo';
    } else {
        thumb.innerHTML = `<img src="${midiaDesejoTemp.url}" style="width:100%; height:100%; object-fit:cover;">`;
        if (titulo) titulo.innerText = '📷 Foto Anexada';
        if (info) info.innerText = 'Imagem otimizada em alta qualidade';
    }
}

window.removerMidiaDesejo = function() {
    midiaDesejoTemp = { url: '', tipo: '' };
    ['inputCapturaFoto', 'inputCapturaVideo', 'inputCapturaGaleria'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderizarPreviewMidiaDesejo();
};

// Manipulador de upload para o Modal de Lançamento / Edição
window.capturarMidiaModalDesejo = async function(input, tipoDesejado) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const isVideo = file.type.startsWith('video/') || tipoDesejado === 'video';

    try {
        showToast('Processando mídia...');
        if (isVideo) {
            const videoData = await lerVideoDesejo(file);
            midiaModalDesejoTemp = { url: videoData, tipo: 'video' };
        } else {
            const fotoData = await otimizarImagemDesejo(file);
            midiaModalDesejoTemp = { url: fotoData, tipo: 'foto' };
        }
        midiaModalDesejoRemovida = false;
        atualizarPreviewMidiaModal();
        showToast('Mídia anexada ao lançamento!');
    } catch(err) {
        console.error('Erro ao capturar mídia modal:', err);
    }
};

window.carregarMidiaNoModal = function(url, tipo) {
    midiaModalDesejoTemp = { url: url || '', tipo: tipo || 'foto' };
    midiaModalDesejoRemovida = false;
    atualizarPreviewMidiaModal();
};

window.removerMidiaModalDesejo = function() {
    midiaModalDesejoTemp = { url: '', tipo: '' };
    midiaModalDesejoRemovida = true;
    ['modalInputCapturaFoto', 'modalInputCapturaVideo', 'modalInputCapturaGaleria'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    atualizarPreviewMidiaModal();
};

function atualizarPreviewMidiaModal() {
    const container = document.getElementById('modalPreviewMidiaContainer');
    const thumb = document.getElementById('modalPreviewMidiaThumb');
    const label = document.getElementById('modalPreviewMidiaLabel');
    if (!container || !thumb) return;

    if (!midiaModalDesejoTemp.url) {
        container.style.display = 'none';
        thumb.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    if (midiaModalDesejoTemp.tipo === 'video') {
        thumb.innerHTML = `<video src="${midiaModalDesejoTemp.url}" muted style="width:100%; height:100%; object-fit:cover;"></video>`;
        if (label) label.innerText = '🎥 Vídeo anexado';
    } else {
        thumb.innerHTML = `<img src="${midiaModalDesejoTemp.url}" style="width:100%; height:100%; object-fit:cover;">`;
        if (label) label.innerText = '📷 Foto anexada';
    }
}

// Colar link da área de transferência
window.colarLinkClipboard = async function() {
    const input = document.getElementById('novoDesejoLink');
    if (!input) return;
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const texto = await navigator.clipboard.readText();
            if (texto && texto.trim()) {
                input.value = texto.trim();
                showToast('Link colado com sucesso!');
                return;
            }
        }
    } catch (e) {
        console.warn('Clipboard não liberado, solicitando Ctrl+V:', e);
    }
    input.focus();
    input.select();
    showToast('Pressione Ctrl + V para colar o link copiado');
};

// Formatação segura de URLs
function formatarUrlLink(url) {
    if (!url) return '';
    let limpa = url.trim();
    if (!/^https?:\/\//i.test(limpa)) {
        limpa = 'https://' + limpa;
    }
    return limpa;
}

// Lightbox Modal para fotos e vídeos ampliados
window.abrirModalLightbox = function(url, tipo, titulo) {
    const modal = document.getElementById('modalMidiaLightbox');
    const content = document.getElementById('modalMidiaLightboxContent');
    const caption = document.getElementById('modalMidiaLightboxCaption');
    if (!modal || !content) return;

    if (tipo === 'video') {
        content.innerHTML = `<video src="${url}" controls autoplay playsinline style="max-width:90vw; max-height:75vh; border-radius:10px; outline:none; background:#000;"></video>`;
    } else {
        content.innerHTML = `<img src="${url}" alt="${titulo || 'Mídia'}" style="max-width:90vw; max-height:75vh; object-fit:contain; border-radius:10px; background:#000;">`;
    }

    if (caption) caption.innerText = titulo || '';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.fecharModalLightbox = function() {
    const modal = document.getElementById('modalMidiaLightbox');
    const content = document.getElementById('modalMidiaLightboxContent');
    if (content) {
        const vid = content.querySelector('video');
        if (vid) vid.pause();
        content.innerHTML = '';
    }
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

// Marcar desejo como Conquistado / Realizado
window.marcarDesejoConquistado = async function(id) {
    if (!id) return;
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) return;

    await dbLocal.movimentacoes.update(item.id, {
        status: 'Pago',
        valor_realizado: item.valor_total,
        sync_status: 'pending_update',
        updated_at: Date.now()
    });

    showToast('Parabéns! Desejo conquistado com sucesso! 🎉');
    carregarListaDesejos();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
};

// --- CARREGAR LISTA DE DESEJOS ---
async function carregarListaDesejos() {
    const movs = await dbLocal.movimentacoes.toArray();
    const desejos = movs.filter(m => m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Cancelado' && m.deleted !== 1);
    
    const container = document.getElementById('listaDesejosContainer');
    if (!container) return;
    container.innerHTML = '';

    if (desejos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #64748B; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border-color);">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">🎁</div>
                <div style="font-weight: 700; color: #94A3B8; margin-bottom: 4px;">Nenhum desejo na lista ainda</div>
                <div style="font-size: 0.85rem;">Adicione acima o que você quer conquistar com foto, vídeo e link da pesquisa!</div>
            </div>
        `;
        return;
    }

    desejos.forEach(d => {
        const div = document.createElement('div');
        div.className = 'desejo-card-wrapper';

        // Link da fonte
        let linkBtnHtml = '';
        if (d.link_url && d.link_url.trim()) {
            const fullUrl = formatarUrlLink(d.link_url);
            let domainLabel = 'Acessar Link da Fonte';
            try {
                const urlObj = new URL(fullUrl);
                domainLabel = 'Ver em ' + urlObj.hostname.replace(/^www\./, '');
            } catch(e) {}

            linkBtnHtml = `
                <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="btn-desejo-link" title="Abrir link original: ${fullUrl}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    <span>${domainLabel}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
            `;
        }

        // Mídia (Foto ou Vídeo)
        let midiaHtml = '';
        if (d.midia_url) {
            const isVid = d.midia_tipo === 'video';
            const safeDesc = (d.descricao || '').replace(/'/g, "\\'");
            midiaHtml = `
                <div class="desejo-midia-box" onclick="abrirModalLightbox('${d.midia_url}', '${isVid ? 'video' : 'foto'}', '${safeDesc}')" title="${isVid ? 'Assistir vídeo em tela cheia' : 'Ampliar foto'}">
                    ${isVid ? 
                        `<video src="${d.midia_url}" preload="metadata" muted></video><div class="desejo-midia-badge">▶ Vídeo</div>` : 
                        `<img src="${d.midia_url}" alt="${d.descricao}" loading="lazy"><div class="desejo-midia-badge">🔍 Ampliar</div>`
                    }
                </div>
            `;
        }

        const isPago = d.status === 'Pago';
        const valorFormatado = window.privacyMode ? '•••••' : 'R$ ' + parseFloat(d.valor_total || 0).toFixed(2).replace('.', ',');

        div.innerHTML = `
            <div class="desejo-item-card ${isPago ? 'desejo-conquistado' : ''}">
                ${midiaHtml}
                <div class="desejo-conteudo">
                    <div class="desejo-cabecalho">
                        <h4 class="desejo-titulo" style="${isPago ? 'text-decoration: line-through;' : ''}">${d.descricao}</h4>
                        <span class="desejo-preco">${valorFormatado}</span>
                    </div>
                    
                    ${linkBtnHtml}

                    <div class="desejo-rodape">
                        <div class="desejo-status">
                            ${isPago ? '<span class="badge-conquistado">✨ Conquistado!</span>' : '<span class="badge-planejado">🎯 Planejado</span>'}
                        </div>
                        <div class="desejo-acoes">
                            ${!isPago ? `<button class="btn-acao-conquistar" onclick="marcarDesejoConquistado('${d.id}')" title="Marcar como realizado/comprado">✓ Conquistado</button>` : ''}
                            <button class="btn-acao-editar" onclick="editarLancamento('${d.id}')" title="Editar">✏️ Editar</button>
                            <button class="btn-acao-excluir" onclick="excluirLancamento('${d.id}')" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Ação de Salvar Desejo Rápido (com Mídia e Link)
async function adicionarDesejoRapido() {
    const desc = document.getElementById('novoDesejoDesc').value.trim();
    const valor = parseFloat(document.getElementById('novoDesejoValor').value);
    const linkInput = document.getElementById('novoDesejoLink');
    const linkUrl = linkInput ? linkInput.value.trim() : '';

    if (!desc || isNaN(valor) || valor <= 0) {
        alert("Por favor, preencha o nome do desejo e o valor estimado.");
        return;
    }

    const novoLancamento = {
        id: generateUUID(),
        descricao: desc,
        valor_total: valor,
        valor_realizado: 0,
        data_lancamento: new Date().toISOString().split('T')[0],
        tipo_gasto: 'Lista de Desejos',
        status: 'Pendente',
        conta_id: '1',
        parcelado: 'Não',
        total_parcelas: 1,
        parcela_atual: 1,
        id_grupo: '',
        link_url: linkUrl,
        midia_url: midiaDesejoTemp.url || '',
        midia_tipo: midiaDesejoTemp.tipo || '',
        deleted: 0,
        sync_status: 'pending_insert',
        updated_at: Date.now()
    };

    await dbLocal.movimentacoes.put(novoLancamento);
    
    // Limpa os campos e mídia
    document.getElementById('novoDesejoDesc').value = '';
    document.getElementById('novoDesejoValor').value = '';
    if (linkInput) linkInput.value = '';
    removerMidiaDesejo();
    
    showToast('Desejo adicionado com sucesso!');
    carregarListaDesejos();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}

// Ação de Salvar Conta Rápida
async function adicionarContaRapida() {
    const desc = document.getElementById('novaContaDesc').value;
    const valor = parseFloat(document.getElementById('novaContaValor').value);

    if (!desc || !valor) {
        alert("Preencha a descrição e o valor da conta.");
        return;
    }

    const novoLancamento = {
        id: generateUUID(),
        descricao: desc,
        valor_total: valor,
        valor_realizado: 0,
        data_lancamento: '', // Deixa livre
        tipo_gasto: 'Conta a Pagar',
        status: 'Pendente',
        conta_id: '1',
        parcelado: 'Não',
        total_parcelas: 1,
        parcela_atual: 1,
        id_grupo: '',
        deleted: 0,
        sync_status: 'pending_insert',
        updated_at: Date.now()
    };

    await dbLocal.movimentacoes.put(novoLancamento);
    
    document.getElementById('novaContaDesc').value = '';
    document.getElementById('novaContaValor').value = '';
    
    carregarContasAPagar();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
    
    showToast('Conta a Pagar adicionada com sucesso!');
}

// Lógica do Modal da Fatura
function abrirModalFatura() {
    document.getElementById('modalFatura').style.display = 'flex';
    document.getElementById('lblFaturaTituloMes').innerText = window.currentFaturaMes;
    
    const formatCurrency = (val) => {
        if (window.privacyMode) return '•••••';
        return 'R$ ' + val.toFixed(2).replace('.', ',');
    };
    document.getElementById('valTotalFatura').innerText = formatCurrency(window.currentFaturaTotal);
    
    const container = document.getElementById('listaFaturaItens');
    container.innerHTML = '';
    
    if (!window.currentFaturaItens || window.currentFaturaItens.length === 0) return;
    
    window.currentFaturaItens.forEach(item => {
        const dia = item.data_lancamento.split('-')[2];
        const monthNum = parseInt(item.data_lancamento.split('-')[1]) - 1;
        const mesesCurtos = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
        const dataStr = `${dia}/${mesesCurtos[monthNum]}`;
        
        let parcText = '';
        if (item.parcelado === 'Sim') {
            parcText = ` <span style="color:#94a3b8; font-size:0.8rem;">${item.parcela_atual}/${item.total_parcelas}</span>`;
        }
        
        const isPago = item.status === 'Pago';
        const colorTitle = isPago ? 'var(--text-muted)' : 'var(--text-color)';
        const colorVal = isPago ? 'var(--text-muted)' : 'var(--text-color)';
        const st = isPago ? 'text-decoration: line-through;' : '';
        
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.marginBottom = '15px';
        div.style.paddingBottom = '15px';
        div.style.borderBottom = '1px solid #e2e8f0';
        div.style.cursor = 'pointer';
        div.onclick = () => {
            fecharModalFatura();
            editarLancamento(item.id);
        };
        
        div.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <div>
                    <div style="color: ${colorTitle}; font-size: 0.95rem; ${st}">${item.descricao.split(' (')[0]}${parcText}</div>
                    <div style="color: ${colorVal}; font-weight: bold; margin-top: 2px; ${st}">${formatCurrency(parseFloat(item.valor_total) || 0)}</div>
                </div>
            </div>
            <div style="color: var(--text-color); font-size: 0.9rem; font-weight: bold;">${dataStr}</div>
        `;
        container.appendChild(div);
    });
}

function fecharModalFatura() {
    document.getElementById('modalFatura').style.display = 'none';
}

async function pagarFaturaCompleta() {
    if (!confirm('Deseja pagar a fatura atual? Isso marcará todos os itens do cartão deste mês como Pagos.')) return;
    
    const timestamp = Date.now();
    for (let item of window.currentFaturaItens) {
        if (item.status !== 'Pago') {
            await dbLocal.movimentacoes.update(item.id, {
                status: 'Pago',
                valor_realizado: item.valor_total,
                sync_status: 'pending_update',
                updated_at: timestamp
            });
        }
    }
    showToast('Fatura paga com sucesso!');
    fecharModalFatura();
    carregarPlanejamento();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}

// Carregar Dados da Tela Inicial
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checarResetInicialDoZero === 'function') {
        await checarResetInicialDoZero();
    }
    initHeader();
    updateMonthLabel();
    applyFinanceZoom();
    setInterval(syncFinanceWithServer, 10000);
});

// Zoom para Gestao Financeira
let financeZoom = parseFloat(localStorage.getItem('financeZoom')) || 1.0;
function applyFinanceZoom() {
    const wrappers = document.querySelectorAll('.content-wrapper');
    wrappers.forEach(w => {
        w.style.zoom = financeZoom;
    });
    const lbl = document.getElementById('lblZoomPercent');
    if (lbl) {
        lbl.innerText = Math.round(financeZoom * 100) + '%';
    }
    // Trigger resize on charts to fix rendering issues
    if(typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display !== 'none') {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            if(window.pbiChartDiff) window.pbiChartDiff.resize();
            if(window.pbiChartFontesRec) window.pbiChartFontesRec.resize();
            if(window.pbiChartFontesDes) window.pbiChartFontesDes.resize();
            if(window.pbiChartGauge) window.pbiChartGauge.resize();
        }, 100);
    }
}

function zoomFinance(step) {
    financeZoom = Math.round((financeZoom + step) * 10) / 10;
    if (financeZoom < 0.7) financeZoom = 0.7;
    if (financeZoom > 1.4) financeZoom = 1.4;
    localStorage.setItem('financeZoom', financeZoom.toFixed(1));
    applyFinanceZoom();
}

function resetFinanceZoom() {
    financeZoom = 1.0;
    localStorage.setItem('financeZoom', '1.0');
    applyFinanceZoom();
    showToast('Visualização resetada para 100%');
}

// Ação de Sair do Aplicativo
function confirmarSairApp() {
    if (confirm("Deseja realmente sair do aplicativo e desconectar sua conta?")) {
        if (typeof logout === 'function') {
            logout();
        }
    }
}

// ==========================================================================
// ABA EXTRATO COMPLETO DE LANÇAMENTOS
// ==========================================================================
window.extratoFiltroAtual = 'todos';

function filtrarExtratoTab(filtro, btn) {
    window.extratoFiltroAtual = filtro;
    const container = document.getElementById('filtrosExtratoContainer');
    if (container) {
        container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    renderizarExtratoCompleto();
}

function renderizarExtratoCompleto() {
    const container = document.getElementById('listaExtratoContainer');
    if (!container) return;
    
    let itens = (window.currentMesItens || []).slice();
    if (window.extratoFiltroAtual === 'receitas') {
        itens = itens.filter(i => i.tipo_gasto === 'Receita' || i.tipo_gasto === 'Resgate de Reserva');
    } else if (window.extratoFiltroAtual === 'despesas') {
        itens = itens.filter(i => i.tipo_gasto !== 'Receita' && i.tipo_gasto !== 'Resgate de Reserva');
    }
    
    container.innerHTML = '';
    
    if (itens.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94A3B8; padding: 2.5rem 1rem;">Nenhum lançamento encontrado para os filtros selecionados.</p>';
        return;
    }
    
    itens.sort((a, b) => new Date(a.data_lancamento) - new Date(b.data_lancamento));
    
    itens.forEach(item => {
        const [y, m, d] = (item.data_lancamento || '2026-01-01').split('-');
        const dataBr = `${d}/${m}`;
        const isReceita = (item.tipo_gasto === 'Receita' || item.tipo_gasto === 'Resgate de Reserva');
        
        let cssClass = item.isVirtual ? 'projected' : 'pending';
        if (item.status === 'Cancelado') cssClass = 'cancelled';
        if (item.status === 'Pago') cssClass = '';
        
        const tagCancelado = item.status === 'Cancelado' ? '<span class="badge" style="background:#FEE2E2; color:#EF4444; margin-left: 6px;">Cancelado</span>' : '';
        const tagStatus = item.status === 'Pago' ? '<span class="badge" style="background:rgba(16,185,129,0.2); color:#10B981; margin-left: 6px;">Pago</span>' :
                          (item.status === 'Pendente' ? '<span class="badge" style="background:rgba(245,158,11,0.2); color:#F59E0B; margin-left: 6px;">Pendente</span>' : '');
        const tagParcela = item.parcelado === 'Sim' ? `<span class="badge" style="margin-left: 6px;">Parc. ${item.parcela_atual}/${item.total_parcelas}</span>` : '';
        
        const btnActions = item.isVirtual ? 
            `<p style="font-size:0.75rem; color:#94A3B8; margin-top:6px;">Projeção de parcelamento. Edite no mês da 1ª parcela.</p>` :
            `<div style="display:flex; gap:8px; margin-top:8px;">
                <button onclick="editarLancamento('${item.id}')" style="background:#1E293B; border:1px solid var(--border-color); color:#60A5FA; padding:4px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; font-weight:600;">Editar</button>
                <button onclick="excluirLancamento('${item.id}')" style="background:#1E293B; border:1px solid var(--border-color); color:#EF4444; padding:4px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; font-weight:600;">Excluir</button>
            </div>`;

        const vOrcado = window.privacyMode ? '•••••' : parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',');
        const vRealizado = window.privacyMode ? '•••••' : parseFloat(item.valor_realizado || 0).toFixed(2).replace('.', ',');

        const div = document.createElement('div');
        div.className = `card ${cssClass}`;
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.style.borderLeft = isReceita ? '4px solid #10B981' : '4px solid #EF4444';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div class="card-details">
                    <h4 style="display:flex; align-items:center; gap:6px; font-size: 0.95rem;">
                        <span>${isReceita ? '📥' : '📤'}</span>
                        ${item.descricao} ${tagCancelado} ${tagStatus}
                    </h4>
                    <p style="color:#94A3B8; font-size:0.8rem; margin-top:3px;">
                        ${dataBr} • ${item.tipo_gasto || 'Geral'} &nbsp; ${tagParcela}
                    </p>
                </div>
                <div class="card-value" style="text-align: right; ${item.status === 'Cancelado' ? 'text-decoration: line-through; opacity:0.6;' : ''}">
                    <div style="font-size:1.05rem; font-weight:800; color:${isReceita ? '#10B981' : '#EF4444'};">
                        ${isReceita ? '+' : '-'} R$ ${vRealizado !== '0,00' ? vRealizado : vOrcado}
                    </div>
                    <div style="font-size:0.75rem; color:#64748B;">Previsto: R$ ${vOrcado}</div>
                </div>
            </div>
            ${btnActions}
        `;
        container.appendChild(div);
    });
}


