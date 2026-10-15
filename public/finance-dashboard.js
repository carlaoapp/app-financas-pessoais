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

// Proteção de dados do usuário: desativação definitiva de qualquer rotina de reset automático
async function checarResetInicialDoZero() {
    // Nunca apaga os dados do usuário. Os lançamentos pertencem ao perfil cadastrado.
    return;
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
        if (typeof aplicarTema === 'function') aplicarTema(temaSalvo);
    }

    // Força a remoção de qualquer card de saldo hero residual
    document.querySelectorAll('.hero-balance-card').forEach(el => el.remove());
}

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.hero-balance-card').forEach(el => el.remove());
});

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
    if (typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display !== 'none') {
        renderPowerBIDashboard();
    }
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

    // --- CÁLCULO DO PAINEL DE RESUMO (ORÇADO VS REALIZADO) ---
    let recRealizado = 0, recOrcado = 0;
    let despRealizado = 0, despOrcado = 0;
    let invRealizado = 0, invOrcado = 0;
    let resMesRealizado = 0, resMesOrcado = 0;

    itensDoMes.forEach(item => {
        if (item.status === 'Cancelado') return;

        const vOrcado = parseFloat(item.valor_total) || 0;
        const vRealizado = parseFloat(item.valor_realizado) || 0;

        if (item.tipo_gasto === 'Receita' || item.tipo_gasto === 'Resgate de Reserva') {
            // Resgate entra como "Receita" do mês para cobrir o buraco
            recOrcado += vOrcado; 
            recRealizado += vRealizado; 
        } else if (item.tipo_gasto === 'Investimento') {
            // Investimento tem seu totalizador próprio e isolado
            invOrcado += vOrcado;
            invRealizado += vRealizado;
        } else if (item.tipo_gasto === 'Reserva de Emergência') {
            // Reserva de Emergência tem seu totalizador próprio e isolado
            resMesOrcado += vOrcado;
            resMesRealizado += vRealizado;
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
    
    // Atualiza o cartão da Reserva (exibe a reserva acumulada histórica)
    document.getElementById('valReservaRealizado').innerText = formatCurrency(reservaRealizadoTotal);
    document.getElementById('valReservaOrcado').innerText = formatCurrency(reservaOrcadoTotal);
    
    // Atualizado: Saldo Livre = Receitas - Despesas - Investimentos - Reserva de Emergência do Mês
    const saldoRealizado = recRealizado - despRealizado - invRealizado - resMesRealizado;
    const saldoOrcado = recOrcado - despOrcado - invOrcado - resMesOrcado;
    
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
    if (typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display !== 'none') {
        renderPowerBIDashboard();
    }

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
    if (!containerDespesas && !containerEntradas) return;
    
    if (containerDespesas) containerDespesas.innerHTML = '';
    if (containerEntradas) containerEntradas.innerHTML = '';

    if (itens.length === 0) {
        if (containerDespesas) containerDespesas.innerHTML = '<p style="text-align:center; color:#94A3B8;">Nenhuma saída pendente para este mês.</p>';
        if (containerEntradas) containerEntradas.innerHTML = '<p style="text-align:center; color:#94A3B8;">Nenhuma entrada pendente para este mês.</p>';
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

        let tagTipo = '';
        let borderLeftColor = '#EF4444';
        if (item.tipo_gasto === 'Receita') {
            borderLeftColor = '#10B981';
            tagTipo = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; margin-left:6px;">Entrada</span>';
        } else if (item.tipo_gasto === 'Reserva de Emergência') {
            borderLeftColor = '#F59E0B';
            tagTipo = '<span class="badge" style="background:rgba(245,158,11,0.2); color:#F59E0B; margin-left:6px;">🛡️ Reserva</span>';
        } else if (item.tipo_gasto === 'Investimento') {
            borderLeftColor = '#8B5CF6';
            tagTipo = '<span class="badge" style="background:rgba(139,92,246,0.2); color:#A78BFA; margin-left:6px;">📈 Investimento</span>';
        } else if (item.tipo_gasto === 'Resgate de Reserva') {
            borderLeftColor = '#10B981';
            tagTipo = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#34D399; margin-left:6px;">💰 Resgate</span>';
        } else if (item.tipo_gasto === 'Despesa Fixa') {
            tagTipo = '<span class="badge" style="background:rgba(239,68,68,0.15); color:#F87171; margin-left:6px;">Fixa</span>';
        } else if (item.tipo_gasto === 'Despesa Variável') {
            tagTipo = '<span class="badge" style="background:rgba(239,68,68,0.15); color:#F87171; margin-left:6px;">Variável</span>';
        }

        const div = document.createElement('div');
        div.className = `card ${cssClass}`;
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.style.borderLeft = '4px solid ' + borderLeftColor;
        
        const vOrcado = window.privacyMode ? '•••••' : parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',');
        const vRealizado = window.privacyMode ? '•••••' : parseFloat(item.valor_realizado || 0).toFixed(2).replace('.', ',');

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <div class="card-details">
                    <h4 style="display:flex; align-items:center; gap:6px;">${item.descricao} ${tagTipo} ${tagCancelado}</h4>
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

// ==================================================================
// GERENCIADOR DE TIPOS DE RECEITA E DESPESA (CATEGORIAS RÁPIDAS)
// ==================================================================
const CATEGORIAS_PADRAO_SISTEMA = [
    "Salário",
    "Luz (Energia)",
    "Água",
    "Celular / Telefone",
    "Internet",
    "Mercado / Alimentação",
    "Aluguel / Moradia",
    "Condomínio",
    "Combustível / Transporte",
    "Cartão de Crédito",
    "Farmácia / Saúde",
    "Educação / Cursos",
    "Lazer / Entretenimento",
    "Assinaturas / Streaming",
    "Investimentos",
    "Reserva de Emergência",
    "Outros"
];

let indiceCategoriaEmEdicao = -1;

function obterCategoriasCustomizadas() {
    try {
        const salvas = localStorage.getItem('finance_tipos_categorias');
        if (salvas) {
            const parsed = JSON.parse(salvas);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error('Erro ao ler categorias do localStorage:', e);
    }
    try {
        localStorage.setItem('finance_tipos_categorias', JSON.stringify(CATEGORIAS_PADRAO_SISTEMA));
    } catch (e) {}
    return [...CATEGORIAS_PADRAO_SISTEMA];
}

function salvarCategoriasCustomizadas(lista) {
    try {
        localStorage.setItem('finance_tipos_categorias', JSON.stringify(lista));
    } catch (e) {
        console.error('Erro ao salvar categorias:', e);
    }
    renderizarSelectCategorias();
    renderizarListaGerenciarCategorias();
}

function renderizarSelectCategorias() {
    const sel = document.getElementById('selectCategoriaPredefinida');
    const dlist = document.getElementById('listaCategoriasDescricao');
    if (!sel && !dlist) return;

    const lista = obterCategoriasCustomizadas();

    if (sel) {
        const valAtual = sel.value;
        sel.innerHTML = '<option value="">📋 Escolha da lista (Salário, Luz, Água, Celular...)</option>' +
            lista.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (valAtual && lista.includes(valAtual)) {
            sel.value = valAtual;
        }
    }

    if (dlist) {
        dlist.innerHTML = lista.map(cat => `<option value="${cat}">`).join('');
    }
}

function aoSelecionarCategoriaPredefinida(val) {
    const inp = document.getElementById('inputDescricao');
    if (inp) inp.value = val || '';
}

function abrirModalGerenciarCategorias() {
    indiceCategoriaEmEdicao = -1;
    const inputNova = document.getElementById('inputNovaCategoria');
    const lbl = document.getElementById('lblFormGerenciarCategoria');
    const btnSalvar = document.getElementById('btnSalvarCategoria');
    const btnCanc = document.getElementById('btnCancelarEdicaoCategoria');
    
    if (inputNova) inputNova.value = '';
    if (lbl) lbl.innerHTML = '➕ Cadastrar Novo Tipo:';
    if (btnSalvar) btnSalvar.innerHTML = '+ Inserir';
    if (btnCanc) btnCanc.style.display = 'none';

    renderizarListaGerenciarCategorias();

    const m = document.getElementById('modalGerenciarCategorias');
    if (m) {
        m.style.display = 'flex';
        if (inputNova) setTimeout(() => inputNova.focus(), 100);
    }
}

function fecharModalGerenciarCategorias() {
    const m = document.getElementById('modalGerenciarCategorias');
    if (m) m.style.display = 'none';
}

function renderizarListaGerenciarCategorias() {
    const container = document.getElementById('listaCategoriasGerenciar');
    const countEl = document.getElementById('countCategorias');
    if (!container) return;

    const lista = obterCategoriasCustomizadas();
    if (countEl) countEl.innerText = lista.length;

    if (lista.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748B; padding: 20px 0; font-size: 0.85rem;">Nenhum tipo cadastrado. Clique acima para cadastrar ou restaurar os padrões.</div>';
        return;
    }

    container.innerHTML = lista.map((cat, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #141F36; border: 1px solid #1E293B; border-radius: 8px; padding: 8px 12px; gap: 8px;">
            <span style="font-size: 0.88rem; font-weight: 700; color: #E2E8F0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                ${cat}
            </span>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                <button type="button" onclick="iniciarEdicaoCategoria(${idx})" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3B82F6; color: #93C5FD; padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;" title="Editar nome">
                    ✏️ Editar
                </button>
                <button type="button" onclick="excluirCategoriaCustomizada(${idx})" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #EF4444; color: #FCA5A5; padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;" title="Excluir este tipo">
                    🗑️ Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function salvarNovaOuEditadaCategoria() {
    const inputNova = document.getElementById('inputNovaCategoria');
    if (!inputNova) return;
    const nome = inputNova.value.trim();
    if (!nome) {
        showToast('Digite o nome do tipo (ex: Internet, Luz...).');
        inputNova.focus();
        return;
    }

    let lista = obterCategoriasCustomizadas();

    if (indiceCategoriaEmEdicao >= 0 && indiceCategoriaEmEdicao < lista.length) {
        lista[indiceCategoriaEmEdicao] = nome;
        salvarCategoriasCustomizadas(lista);
        cancelarEdicaoCategoria();
        showToast(`Tipo "${nome}" atualizado com sucesso!`);
    } else {
        const jaExiste = lista.some(item => item.toLowerCase() === nome.toLowerCase());
        if (jaExiste) {
            showToast(`O tipo "${nome}" já está cadastrado.`);
            inputNova.focus();
            return;
        }
        lista.push(nome);
        salvarCategoriasCustomizadas(lista);
        inputNova.value = '';
        inputNova.focus();
        showToast(`Tipo "${nome}" cadastrado com sucesso!`);
    }
}

function iniciarEdicaoCategoria(idx) {
    const lista = obterCategoriasCustomizadas();
    if (idx < 0 || idx >= lista.length) return;

    indiceCategoriaEmEdicao = idx;
    const inputNova = document.getElementById('inputNovaCategoria');
    const lbl = document.getElementById('lblFormGerenciarCategoria');
    const btnSalvar = document.getElementById('btnSalvarCategoria');
    const btnCanc = document.getElementById('btnCancelarEdicaoCategoria');

    if (inputNova) {
        inputNova.value = lista[idx];
        inputNova.focus();
    }
    if (lbl) lbl.innerHTML = `✏️ Alterar Tipo: <span style="color: #FCD34D;">${lista[idx]}</span>`;
    if (btnSalvar) btnSalvar.innerHTML = 'Salvar';
    if (btnCanc) btnCanc.style.display = 'block';
}

function cancelarEdicaoCategoria() {
    indiceCategoriaEmEdicao = -1;
    const inputNova = document.getElementById('inputNovaCategoria');
    const lbl = document.getElementById('lblFormGerenciarCategoria');
    const btnSalvar = document.getElementById('btnSalvarCategoria');
    const btnCanc = document.getElementById('btnCancelarEdicaoCategoria');

    if (inputNova) inputNova.value = '';
    if (lbl) lbl.innerHTML = '➕ Cadastrar Novo Tipo:';
    if (btnSalvar) btnSalvar.innerHTML = '+ Inserir';
    if (btnCanc) btnCanc.style.display = 'none';
}

function excluirCategoriaCustomizada(idx) {
    let lista = obterCategoriasCustomizadas();
    if (idx < 0 || idx >= lista.length) return;

    const nome = lista[idx];
    if (!confirm(`Deseja remover "${nome}" da lista de opções rápidas?`)) return;

    lista.splice(idx, 1);
    salvarCategoriasCustomizadas(lista);
    if (indiceCategoriaEmEdicao === idx) cancelarEdicaoCategoria();
    showToast(`Tipo "${nome}" removido!`);
}

function restaurarCategoriasPadrao() {
    if (!confirm('Deseja restaurar a lista original de tipos padrão do sistema?')) return;
    salvarCategoriasCustomizadas([...CATEGORIAS_PADRAO_SISTEMA]);
    cancelarEdicaoCategoria();
    showToast('Lista de tipos padrão restaurada!');
}

window.abrirModalGerenciarCategorias = abrirModalGerenciarCategorias;
window.fecharModalGerenciarCategorias = fecharModalGerenciarCategorias;
window.aoSelecionarCategoriaPredefinida = aoSelecionarCategoriaPredefinida;
window.salvarNovaOuEditadaCategoria = salvarNovaOuEditadaCategoria;
window.iniciarEdicaoCategoria = iniciarEdicaoCategoria;
window.cancelarEdicaoCategoria = cancelarEdicaoCategoria;
window.excluirCategoriaCustomizada = excluirCategoriaCustomizada;
window.restaurarCategoriasPadrao = restaurarCategoriasPadrao;
window.renderizarSelectCategorias = renderizarSelectCategorias;

// ==================================================================
// SISTEMA DE MÁSCARA MONETÁRIA BRASILEIRA (R$ COM PONTUAÇÃO DINÂMICA)
// ==================================================================
function desformatarMoedaInput(valorStr) {
    if (typeof valorStr === 'number') return isNaN(valorStr) ? 0 : valorStr;
    if (!valorStr) return 0;
    const digitos = String(valorStr).replace(/\D/g, '');
    if (!digitos) return 0;
    return parseInt(digitos, 10) / 100;
}

function setarValorMoedaInput(input, valorNum) {
    if (!input) return;
    if (valorNum === '' || valorNum === null || valorNum === undefined) {
        input.value = '';
        return;
    }
    const num = typeof valorNum === 'number' ? valorNum : parseFloat(valorNum);
    if (isNaN(num)) {
        input.value = '';
        return;
    }
    input.value = 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function aplicarMascaraMoedaEmElemento(input) {
    if (!input || input.dataset.maskMoedaAtiva === 'true') return;
    input.dataset.maskMoedaAtiva = 'true';

    input.addEventListener('input', () => {
        let digitos = input.value.replace(/\D/g, '');
        if (!digitos) {
            input.value = '';
            return;
        }
        let centavos = parseInt(digitos, 10);
        if (centavos === 0) {
            input.value = 'R$ 0,00';
            return;
        }
        let val = centavos / 100;
        input.value = 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            const digitos = input.value.replace(/\D/g, '');
            if (digitos.length <= 1 || digitos === '00' || digitos === '0') {
                input.value = '';
                e.preventDefault();
            }
        }
    });

    input.addEventListener('focus', () => {
        if (!input.value || input.value.trim() === '') {
            input.value = 'R$ 0,00';
            setTimeout(() => {
                input.setSelectionRange(input.value.length, input.value.length);
            }, 10);
        }
    });

    input.addEventListener('blur', () => {
        if (input.value === 'R$ 0,00' && !input.required) {
            input.value = '';
        }
    });
}

function inicializarMascarasMoeda() {
    const ids = ['inputValor', 'inputValorRealizado', 'novaContaValor', 'novoDesejoValor'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) aplicarMascaraMoedaEmElemento(el);
    });
}

window.desformatarMoedaInput = desformatarMoedaInput;
window.setarValorMoedaInput = setarValorMoedaInput;
window.inicializarMascarasMoeda = inicializarMascarasMoeda;

function fecharModalLancamento() {
    const m = document.getElementById('modalLancamento');
    if (m) {
        m.style.display = 'none';
        delete m.dataset.origemDesejoId;
        delete m.dataset.origemContaId;
    }
    document.body.style.overflow = '';
}

function abrirModalLancamento() {
    document.getElementById('inputIdMovimentacao').value = '';
    document.getElementById('formLancamento').reset();
    setarValorMoedaInput(document.getElementById('inputValor'), '');
    setarValorMoedaInput(document.getElementById('inputValorRealizado'), 0);
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
    renderizarSelectCategorias();
    const selCat = document.getElementById('selectCategoriaPredefinida');
    if (selCat) selCat.value = '';
    const inpDesc = document.getElementById('inputDescricao');
    if (inpDesc) inpDesc.value = '';

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
    
    const descItem = (item.descricao || '').trim();
    const selCatEdit = document.getElementById('selectCategoriaPredefinida');
    if (selCatEdit) {
        let optExiste = Array.from(selCatEdit.options).some(o => o.value === descItem);
        if (!optExiste && descItem) {
            const newOpt = document.createElement('option');
            newOpt.value = descItem;
            newOpt.innerText = descItem;
            selCatEdit.appendChild(newOpt);
        }
        selCatEdit.value = descItem;
    }
    const inpDescEdit = document.getElementById('inputDescricao');
    if (inpDescEdit) inpDescEdit.value = descItem;
    setarValorMoedaInput(document.getElementById('inputValor'), item.valor_total);
    setarValorMoedaInput(document.getElementById('inputValorRealizado'), item.valor_realizado || 0);
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

// --- SISTEMA INTELIGENTE DE EXCLUSÃO (ÚNICA / REPETIÇÕES / QUANTIDADE) ---
let itemParaExcluir = null;
let irmaosParaExcluir = [];
let modoExclusaoSelecionado = 'atual';

async function iniciarExclusaoLancamento(id) {
    if (!id) return;
    
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
    if (!item) {
        showToast('Lançamento não encontrado.');
        return;
    }

    itemParaExcluir = item;
    modoExclusaoSelecionado = 'atual';

    // Busca repetições / lançamentos vinculados a partir da data atual
    const allMovs = await dbLocal.movimentacoes.toArray();
    const activeMovs = allMovs.filter(m => m.deleted !== 1);
    
    let irmaos = [];
    if (item.id_grupo && item.id_grupo.trim() !== '') {
        irmaos = activeMovs.filter(m => m.id_grupo === item.id_grupo && (m.data_lancamento >= item.data_lancamento || (m.parcela_atual && item.parcela_atual && m.parcela_atual >= item.parcela_atual)));
    } else {
        // Procura lançamentos com mesma descrição base e tipo a partir da data deste lançamento
        const descBase = (item.descricao || '').replace(/\s*\(\d+\/\d+\)$/, '').trim().toLowerCase();
        irmaos = activeMovs.filter(m => {
            const mDescBase = (m.descricao || '').replace(/\s*\(\d+\/\d+\)$/, '').trim().toLowerCase();
            return mDescBase === descBase && m.tipo_gasto === item.tipo_gasto && m.data_lancamento >= item.data_lancamento;
        });
    }

    irmaos.sort((a, b) => new Date(a.data_lancamento || 0) - new Date(b.data_lancamento || 0));
    if (!irmaos.some(i => String(i.id) === String(item.id))) {
        irmaos.unshift(item);
    }
    irmaosParaExcluir = irmaos;

    // Formata valor e data para exibição
    const [y, m, d] = (item.data_lancamento || '2026-01-01').split('-');
    const dataBr = `${d}/${m}/${y}`;
    const valFormat = parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',');

    const infoEl = document.getElementById('modalExclusaoInfoLancamento');
    if (infoEl) {
        infoEl.innerHTML = `
            <div style="font-weight: 800; font-size: 1.05rem; color: #FFFFFF; margin-bottom: 4px;">${item.descricao}</div>
            <div style="display: flex; gap: 14px; font-size: 0.85rem; color: #94A3B8; flex-wrap: wrap;">
                <span>📅 Vencimento: <strong style="color: #60A5FA;">${dataBr}</strong></span>
                <span>💰 Valor: <strong style="color: #34D399;">R$ ${valFormat}</strong></span>
                <span>🏷️ Tipo: <strong style="color: #FBBF24;">${item.tipo_gasto}</strong></span>
            </div>
        `;
    }

    const optTodos = document.getElementById('lblOptExcluirTodos');
    const optQtd = document.getElementById('lblOptExcluirQtd');
    const descTodos = document.getElementById('descOptExcluirTodos');
    const inputQtd = document.getElementById('inputQtdExclusao');
    const lblTotal = document.getElementById('lblQtdDisponivelTotal');

    if (irmaos.length > 1) {
        if (optTodos) optTodos.style.display = 'flex';
        if (optQtd) optQtd.style.display = 'flex';
        if (descTodos) descTodos.innerText = `Apaga este lançamento e todas as ${irmaos.length - 1} repetições futuras vinculadas (${irmaos.length} no total).`;
        if (inputQtd) {
            inputQtd.max = irmaos.length;
            inputQtd.value = Math.min(2, irmaos.length);
        }
        if (lblTotal) lblTotal.innerText = `(de um total de ${irmaos.length})`;
    } else {
        if (optTodos) optTodos.style.display = 'none';
        if (optQtd) optQtd.style.display = 'none';
    }

    aoMudarOpcaoExclusao('atual');

    const modalExcl = document.getElementById('modalConfirmarExclusao');
    if (modalExcl) modalExcl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function aoMudarOpcaoExclusao(opcao) {
    modoExclusaoSelecionado = opcao;
    const optAtual = document.getElementById('lblOptExcluirAtual');
    const optTodos = document.getElementById('lblOptExcluirTodos');
    const optQtd = document.getElementById('lblOptExcluirQtd');
    const containerControle = document.getElementById('containerControleQtdExclusao');

    const radioAtual = document.querySelector('input[name="opcaoExclusao"][value="atual"]');
    const radioTodos = document.querySelector('input[name="opcaoExclusao"][value="todos"]');
    const radioQtd = document.querySelector('input[name="opcaoExclusao"][value="quantidade"]');

    if (radioAtual) radioAtual.checked = (opcao === 'atual');
    if (radioTodos) radioTodos.checked = (opcao === 'todos');
    if (radioQtd) radioQtd.checked = (opcao === 'quantidade');

    if (optAtual) {
        optAtual.style.borderColor = (opcao === 'atual') ? '#2563EB' : '#334155';
        optAtual.style.background = (opcao === 'atual') ? 'rgba(37, 99, 235, 0.15)' : '#0F172A';
    }
    if (optTodos) {
        optTodos.style.borderColor = (opcao === 'todos') ? '#EF4444' : '#334155';
        optTodos.style.background = (opcao === 'todos') ? 'rgba(239, 68, 68, 0.15)' : '#0F172A';
    }
    if (optQtd) {
        optQtd.style.borderColor = (opcao === 'quantidade') ? '#F59E0B' : '#334155';
        optQtd.style.background = (opcao === 'quantidade') ? 'rgba(245, 158, 11, 0.15)' : '#0F172A';
    }

    if (containerControle) {
        containerControle.style.display = (opcao === 'quantidade') ? 'flex' : 'none';
    }
}

function alterarQtdExclusao(delta) {
    const inp = document.getElementById('inputQtdExclusao');
    if (!inp) return;
    let val = parseInt(inp.value, 10) || 1;
    val += delta;
    const max = parseInt(inp.max, 10) || irmaosParaExcluir.length || 1;
    if (val < 1) val = 1;
    if (val > max) val = max;
    inp.value = val;
}

function validarQtdExclusao(inp) {
    if (!inp) return;
    let val = parseInt(inp.value, 10) || 1;
    const max = parseInt(inp.max, 10) || irmaosParaExcluir.length || 1;
    if (val < 1) val = 1;
    if (val > max) val = max;
    inp.value = val;
}

function fecharModalConfirmarExclusao() {
    const m = document.getElementById('modalConfirmarExclusao');
    if (m) m.style.display = 'none';
    const mPrincipal = document.getElementById('modalLancamento');
    if (!mPrincipal || mPrincipal.style.display === 'none') {
        document.body.style.overflow = '';
    }
    itemParaExcluir = null;
    irmaosParaExcluir = [];
}

async function executarConfirmacaoExclusao() {
    if (!itemParaExcluir) return;

    let alvos = [];
    if (modoExclusaoSelecionado === 'atual') {
        alvos = [itemParaExcluir];
    } else if (modoExclusaoSelecionado === 'todos') {
        alvos = irmaosParaExcluir.length > 0 ? irmaosParaExcluir : [itemParaExcluir];
    } else if (modoExclusaoSelecionado === 'quantidade') {
        const inp = document.getElementById('inputQtdExclusao');
        const qtd = parseInt(inp ? inp.value : '1', 10) || 1;
        alvos = irmaosParaExcluir.slice(0, qtd);
        if (alvos.length === 0) alvos = [itemParaExcluir];
    }

    const timestamp = Date.now();
    for (const alvo of alvos) {
        await dbLocal.movimentacoes.update(alvo.id, {
            deleted: 1,
            sync_status: 'pending_update',
            updated_at: timestamp
        });
    }

    const msg = alvos.length > 1 ? 
        `${alvos.length} lançamentos excluídos com sucesso!` : 
        'Lançamento excluído com sucesso!';
    showToast(msg);

    fecharModalConfirmarExclusao();
    if (typeof fecharModalLancamento === 'function') fecharModalLancamento();
    if (document.getElementById('modalFatura') && document.getElementById('modalFatura').style.display === 'flex') {
        fecharModalFatura();
    }

    carregarPlanejamento();
    if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
    if (typeof carregarContasAPagar === 'function') carregarContasAPagar();
    if (typeof carregarListaDesejos === 'function') carregarListaDesejos();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}

async function excluirLancamento(id) {
    await iniciarExclusaoLancamento(id);
}
window.excluirLancamento = excluirLancamento;
window.iniciarExclusaoLancamento = iniciarExclusaoLancamento;
window.aoMudarOpcaoExclusao = aoMudarOpcaoExclusao;
window.alterarQtdExclusao = alterarQtdExclusao;
window.validarQtdExclusao = validarQtdExclusao;
window.fecharModalConfirmarExclusao = fecharModalConfirmarExclusao;
window.executarConfirmacaoExclusao = executarConfirmacaoExclusao;

async function salvarLancamento(event) {
    event.preventDefault();
    
    const idAtual = document.getElementById('inputIdMovimentacao').value;
    const tipoGasto = document.getElementById('inputTipoGasto').value;
    const selCat = document.getElementById('selectCategoriaPredefinida');
    const inpDesc = document.getElementById('inputDescricao');
    const descricao = (selCat && selCat.value ? selCat.value : (inpDesc ? inpDesc.value : '')).trim();

    if (!descricao) {
        alert("Por favor, selecione ou informe a Descrição / Tipo de Movimentação!");
        if (selCat) selCat.focus();
        return;
    }

    const valorOrcado = desformatarMoedaInput(document.getElementById('inputValor').value);
    const valorRealizado = desformatarMoedaInput(document.getElementById('inputValorRealizado').value);

    if (valorOrcado <= 0) {
        alert("Por favor, digite um valor orçado maior que zero!");
        document.getElementById('inputValor').focus();
        return;
    }
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
            const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
            const currentUserId = authUser ? authUser.id : (localStorage.getItem('financas_current_user_id') || null);

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
                user_id: currentUserId,
                deleted: 0,
                sync_status: 'pending_insert',
                updated_at: timestamp
            };
            await dbLocal.movimentacoes.put(novoLancamento);
        }
        console.log(`Foram salvos ${qtdCriar} lançamentos localmente.`);
        showToast(qtdCriar > 1 ? `Foram adicionados ${qtdCriar} lançamentos com sucesso!` : 'Lançamento adicionado com sucesso!');
    }

    // Se este lançamento veio de dar andamento a um Sonho/Desejo, marcar o desejo original como Conquistado
    const modalEl = document.getElementById('modalLancamento');
    const origemDesejoId = modalEl ? modalEl.dataset.origemDesejoId : null;
    if (origemDesejoId) {
        try {
            let desejoOriginal = await dbLocal.movimentacoes.get(origemDesejoId);
            if (!desejoOriginal && !isNaN(origemDesejoId)) desejoOriginal = await dbLocal.movimentacoes.get(Number(origemDesejoId));
            if (desejoOriginal) {
                await dbLocal.movimentacoes.update(desejoOriginal.id, {
                    status: 'Pago',
                    sync_status: 'pending_update',
                    updated_at: timestamp
                });
                console.log('Desejo de origem marcado como conquistado no orçamento:', desejoOriginal.id);
            }
        } catch(e) {
            console.warn('Erro ao atualizar status do desejo de origem:', e);
        }
    }

    // Se este lançamento veio de programar uma Conta a Pagar (Gaveta), marcar a conta como Programada/Paga
    const origemContaId = modalEl ? modalEl.dataset.origemContaId : null;
    if (origemContaId) {
        try {
            let contaOriginal = await dbLocal.movimentacoes.get(origemContaId);
            if (!contaOriginal && !isNaN(origemContaId)) contaOriginal = await dbLocal.movimentacoes.get(Number(origemContaId));
            if (contaOriginal) {
                await dbLocal.movimentacoes.update(contaOriginal.id, {
                    status: 'Pago',
                    sync_status: 'pending_update',
                    updated_at: timestamp
                });
                console.log('Conta da gaveta marcada como programada no orçamento:', contaOriginal.id);
            }
        } catch(e) {
            console.warn('Erro ao atualizar status da conta de origem:', e);
        }
    }
    
    fecharModalLancamento();
    carregarPlanejamento();
    if(typeof carregarContasAPagar === 'function') carregarContasAPagar();
    if(typeof carregarListaDesejos === 'function') carregarListaDesejos();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
    
    if (tipoGasto === 'Lista de Desejos') {
        switchFinanceTab('Desejos');
    } else if (tipoGasto === 'Conta a Pagar') {
        switchFinanceTab('APagar');
    } else {
        switchFinanceTab('Lancamentos');
    }
}

async function excluirLancamentoAtual() {
    const idAtual = document.getElementById('inputIdMovimentacao').value;
    if (!idAtual) return;
    await iniciarExclusaoLancamento(idAtual);
}
window.excluirLancamentoAtual = excluirLancamentoAtual;

// --- SISTEMA DE ABAS ORGANIZADO (DESKTOP & MOBILE) ---
function switchFinanceTab(tabName) {
    // Redireciona qualquer chamada legada da aba Painel/Resumo para a aba Lançamentos
    if (tabName === 'Painel') tabName = 'Lancamentos';

    const tabs = ['Lancamentos', 'APagar', 'PowerBI', 'Desejos'];
    
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
    if (!container) return;
    container.innerHTML = '';

    if (contasAPagar.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 26px 16px; color: #64748B; background: var(--bg-card); border-radius: 14px; border: 1px dashed var(--border-color);">
                <div style="font-size: 2rem; margin-bottom: 6px;">📂</div>
                <div style="font-weight: 700; color: #94A3B8; margin-bottom: 2px;">Nenhuma conta na gaveta</div>
                <div style="font-size: 0.85rem;">Cadastre acima as contas que você quer monitorar para programar o pagamento!</div>
            </div>
        `;
        return;
    }

    contasAPagar.forEach(c => {
        const div = document.createElement('div');
        div.className = 'conta-card-item';
        div.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-color); border-left: 4px solid #F59E0B; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: 0 2px 8px rgba(0,0,0,0.15);';

        const valorFormatado = window.privacyMode ? '•••••' : 'R$ ' + parseFloat(c.valor_total || 0).toFixed(2).replace('.', ',');

        div.innerHTML = `
            <div style="flex: 1; min-width: 170px;">
                <h4 style="margin: 0 0 4px 0; font-size: 1rem; color: #F8FAFC; font-weight: 700;">${c.descricao}</h4>
                <div style="font-size: 0.88rem; color: #F59E0B; font-weight: 700;">
                    Valor Estimado: ${valorFormatado}
                </div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <button class="btn-acao-programar" onclick="programarConta('${c.id}')" title="Programar pagamento e abrir tela de lançamento">
                    📅 Programar
                </button>
                <button class="btn-acao-editar" onclick="editarContaNoFormulario('${c.id}')" title="Editar conta no formulário">
                    ✏️ Editar
                </button>
                <button class="btn-acao-excluir" onclick="excluirConta('${c.id}')" title="Excluir conta da gaveta">
                    🗑️
                </button>
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
                            <button class="btn-acao-andamento" onclick="darAndamentoAoDesejo('${d.id}')" title="Dar andamento ao sonho e fazer lançamento no orçamento">🚀 Dar Andamento (Lançar)</button>
                            ${!isPago ? `<button class="btn-acao-conquistar" onclick="marcarDesejoConquistado('${d.id}')" title="Marcar como realizado/comprado">✓ Conquistado</button>` : ''}
                            <button class="btn-acao-editar" onclick="editarDesejoNoFormulario('${d.id}')" title="Editar este desejo no formulário">✏️ Editar</button>
                            <button class="btn-acao-excluir" onclick="excluirDesejo('${d.id}')" title="Excluir este desejo">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Salvar Desejo no Formulário (Novo ou Edição)
async function salvarDesejoFormulario() {
    const desc = document.getElementById('novoDesejoDesc').value.trim();
    const valor = desformatarMoedaInput(document.getElementById('novoDesejoValor').value);
    const linkInput = document.getElementById('novoDesejoLink');
    const linkUrl = linkInput ? linkInput.value.trim() : '';
    const idInput = document.getElementById('idDesejoEmEdicao');
    const idEdicao = idInput ? idInput.value : '';

    if (!desc || isNaN(valor) || valor <= 0) {
        alert("Por favor, preencha o que você quer conquistar e o valor estimado.");
        return;
    }

    const timestamp = Date.now();

    if (idEdicao) {
        // Atualizar desejo existente
        let item = await dbLocal.movimentacoes.get(idEdicao);
        if (!item && !isNaN(idEdicao)) item = await dbLocal.movimentacoes.get(Number(idEdicao));
        const targetId = item ? item.id : idEdicao;

        await dbLocal.movimentacoes.update(targetId, {
            descricao: desc,
            valor_total: valor,
            link_url: linkUrl,
            midia_url: midiaDesejoTemp.url || (item ? item.midia_url : ''),
            midia_tipo: midiaDesejoTemp.tipo || (item ? item.midia_tipo : ''),
            sync_status: 'pending_update',
            updated_at: timestamp
        });

        showToast('Desejo atualizado com sucesso!');
    } else {
        // Criar novo desejo
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
            updated_at: timestamp
        };

        await dbLocal.movimentacoes.put(novoLancamento);
        showToast('Desejo adicionado com sucesso!');
    }

    cancelarEdicaoDesejo();
    carregarListaDesejos();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.salvarDesejoFormulario = salvarDesejoFormulario;
window.adicionarDesejoRapido = salvarDesejoFormulario; // Compatibilidade

// Carregar Desejo no Formulário para Edição
async function editarDesejoNoFormulario(id) {
    if (!id) return;
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) {
        showToast('Desejo não encontrado.');
        return;
    }

    const idInput = document.getElementById('idDesejoEmEdicao');
    if (idInput) idInput.value = item.id;

    const descInput = document.getElementById('novoDesejoDesc');
    if (descInput) descInput.value = item.descricao || '';

    const valorInput = document.getElementById('novoDesejoValor');
    if (valorInput) setarValorMoedaInput(valorInput, item.valor_total || 0);

    const linkInput = document.getElementById('novoDesejoLink');
    if (linkInput) linkInput.value = item.link_url || '';

    // Mídia
    if (item.midia_url) {
        midiaDesejoTemp = { url: item.midia_url, tipo: item.midia_tipo || 'foto' };
        renderizarPreviewMidiaDesejo();
    } else {
        removerMidiaDesejo();
    }

    // Exibir botões de Excluir e Cancelar no formulário
    const btnExcluirForm = document.getElementById('btnExcluirDesejoForm');
    if (btnExcluirForm) btnExcluirForm.style.display = 'flex';

    const btnCancelarForm = document.getElementById('btnCancelarDesejoForm');
    if (btnCancelarForm) btnCancelarForm.style.display = 'flex';

    // Rolar suavemente até o formulário de desejo
    if (descInput) {
        descInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => descInput.focus(), 300);
    }

    showToast('Desejo carregado para edição no topo. Altere e clique em Salvar.');
}
window.editarDesejoNoFormulario = editarDesejoNoFormulario;

// Cancelar Edição do Desejo
function cancelarEdicaoDesejo() {
    const idInput = document.getElementById('idDesejoEmEdicao');
    if (idInput) idInput.value = '';

    const descInput = document.getElementById('novoDesejoDesc');
    if (descInput) descInput.value = '';

    const valorInput = document.getElementById('novoDesejoValor');
    if (valorInput) valorInput.value = '';

    const linkInput = document.getElementById('novoDesejoLink');
    if (linkInput) linkInput.value = '';

    removerMidiaDesejo();

    const btnExcluirForm = document.getElementById('btnExcluirDesejoForm');
    if (btnExcluirForm) btnExcluirForm.style.display = 'none';

    const btnCancelarForm = document.getElementById('btnCancelarDesejoForm');
    if (btnCancelarForm) btnCancelarForm.style.display = 'none';
}
window.cancelarEdicaoDesejo = cancelarEdicaoDesejo;

// Excluir Desejo que está sendo editado no formulário
async function excluirDesejoEmEdicao() {
    const idInput = document.getElementById('idDesejoEmEdicao');
    const id = idInput ? idInput.value : '';
    if (!id) return;
    await excluirDesejo(id);
}
window.excluirDesejoEmEdicao = excluirDesejoEmEdicao;

// Excluir Desejo
async function excluirDesejo(id) {
    if (!id) return;
    if (!confirm("Tem certeza que deseja excluir este desejo da sua lista?")) return;

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

    const idInput = document.getElementById('idDesejoEmEdicao');
    if (idInput && String(idInput.value) === String(id)) {
        cancelarEdicaoDesejo();
    }

    showToast('Desejo excluído com sucesso!');
    carregarListaDesejos();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.excluirDesejo = excluirDesejo;

// Dar Andamento ao Desejo (Fazer Lançamento no Orçamento na mesma tela de receitas/despesas)
async function darAndamentoAoDesejo(id) {
    if (!id) return;
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) {
        showToast('Desejo não encontrado.');
        return;
    }

    // Abre a tela padrão de lançamento
    abrirModalLancamento();

    const modal = document.getElementById('modalLancamento');
    if (modal) {
        modal.dataset.origemDesejoId = item.id;
    }

    // Preenche a tela de lançamento com os dados do desejo
    document.getElementById('inputDescricao').value = item.descricao || '';
    setarValorMoedaInput(document.getElementById('inputValor'), item.valor_total || 0);
    setarValorMoedaInput(document.getElementById('inputValorRealizado'), 0);

    const inputTipo = document.getElementById('inputTipoGasto');
    if (inputTipo) inputTipo.value = 'Despesa Variável';

    const modalInputLink = document.getElementById('modalInputLinkUrl');
    if (modalInputLink) modalInputLink.value = item.link_url || '';
    if (item.midia_url && typeof carregarMidiaNoModal === 'function') {
        carregarMidiaNoModal(item.midia_url, item.midia_tipo || 'foto');
    }

    const btnSalvarModal = document.getElementById('btnSalvar');
    if (btnSalvarModal) {
        btnSalvarModal.innerText = '🚀 Confirmar Lançamento no Orçamento';
    }

    showToast('Sonho pronto para lançamento! Defina a data, parcelas e confirme.');
}
window.darAndamentoAoDesejo = darAndamentoAoDesejo;

// Salvar Conta a Pagar no Formulário (Novo ou Edição)
async function salvarContaFormulario() {
    const desc = document.getElementById('novaContaDesc').value.trim();
    const valor = desformatarMoedaInput(document.getElementById('novaContaValor').value);
    const idInput = document.getElementById('idContaEmEdicao');
    const idEdicao = idInput ? idInput.value : '';

    if (!desc || isNaN(valor) || valor <= 0) {
        alert("Por favor, preencha a descrição e o valor da conta.");
        return;
    }

    const timestamp = Date.now();

    if (idEdicao) {
        // Atualizar conta existente
        let item = await dbLocal.movimentacoes.get(idEdicao);
        if (!item && !isNaN(idEdicao)) item = await dbLocal.movimentacoes.get(Number(idEdicao));
        const targetId = item ? item.id : idEdicao;

        await dbLocal.movimentacoes.update(targetId, {
            descricao: desc,
            valor_total: valor,
            sync_status: 'pending_update',
            updated_at: timestamp
        });

        showToast('Conta a Pagar atualizada com sucesso!');
    } else {
        // Nova Conta a Pagar na Gaveta
        const novoLancamento = {
            id: generateUUID(),
            descricao: desc,
            valor_total: valor,
            valor_realizado: 0,
            data_lancamento: '', // Fica livre na gaveta até ser programada
            tipo_gasto: 'Conta a Pagar',
            status: 'Pendente',
            conta_id: '1',
            parcelado: 'Não',
            total_parcelas: 1,
            parcela_atual: 1,
            id_grupo: '',
            deleted: 0,
            sync_status: 'pending_insert',
            updated_at: timestamp
        };

        await dbLocal.movimentacoes.put(novoLancamento);
        showToast('Conta a Pagar salva com sucesso!');
    }

    cancelarEdicaoConta();
    carregarContasAPagar();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.salvarContaFormulario = salvarContaFormulario;
window.adicionarContaRapida = salvarContaFormulario; // Compatibilidade

// Carregar Conta no Formulário para Edição
async function editarContaNoFormulario(id) {
    if (!id) return;
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) {
        showToast('Conta não encontrada.');
        return;
    }

    const idInput = document.getElementById('idContaEmEdicao');
    if (idInput) idInput.value = item.id;

    const descInput = document.getElementById('novaContaDesc');
    if (descInput) descInput.value = item.descricao || '';

    const valorInput = document.getElementById('novaContaValor');
    if (valorInput) setarValorMoedaInput(valorInput, item.valor_total || 0);

    const btnExcluirForm = document.getElementById('btnExcluirContaForm');
    if (btnExcluirForm) btnExcluirForm.style.display = 'flex';

    const btnCancelarForm = document.getElementById('btnCancelarContaForm');
    if (btnCancelarForm) btnCancelarForm.style.display = 'flex';

    if (descInput) {
        descInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => descInput.focus(), 300);
    }

    showToast('Conta carregada para edição no topo! Altere e clique em Salvar.');
}
window.editarContaNoFormulario = editarContaNoFormulario;

// Cancelar Edição da Conta
function cancelarEdicaoConta() {
    const idInput = document.getElementById('idContaEmEdicao');
    if (idInput) idInput.value = '';

    const descInput = document.getElementById('novaContaDesc');
    if (descInput) descInput.value = '';

    const valorInput = document.getElementById('novaContaValor');
    if (valorInput) valorInput.value = '';

    const btnExcluirForm = document.getElementById('btnExcluirContaForm');
    if (btnExcluirForm) btnExcluirForm.style.display = 'none';

    const btnCancelarForm = document.getElementById('btnCancelarContaForm');
    if (btnCancelarForm) btnCancelarForm.style.display = 'none';
}
window.cancelarEdicaoConta = cancelarEdicaoConta;

// Excluir Conta em Edição no Formulário
async function excluirContaEmEdicao() {
    const idInput = document.getElementById('idContaEmEdicao');
    const id = idInput ? idInput.value : '';
    if (!id) return;
    await excluirConta(id);
}
window.excluirContaEmEdicao = excluirContaEmEdicao;

// Excluir Conta da Gaveta
async function excluirConta(id) {
    if (!id) return;
    if (!confirm("Tem certeza que deseja excluir esta conta da gaveta?")) return;

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

    const idInput = document.getElementById('idContaEmEdicao');
    if (idInput && String(idInput.value) === String(id)) {
        cancelarEdicaoConta();
    }

    showToast('Conta excluída com sucesso!');
    carregarContasAPagar();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.excluirConta = excluirConta;

// Programar Conta (Abre a tela padrão de lançamento de despesa, investimento, receita, etc.)
async function programarConta(id) {
    if (!id) return;
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) {
        showToast('Conta não encontrada.');
        return;
    }

    // Abre a mesma tela de lançamento padrão de receitas/despesas
    abrirModalLancamento();

    const modal = document.getElementById('modalLancamento');
    if (modal) {
        modal.dataset.origemContaId = item.id;
    }

    // Preenche a tela de lançamento com os dados da conta
    document.getElementById('inputDescricao').value = item.descricao || '';
    setarValorMoedaInput(document.getElementById('inputValor'), item.valor_total || 0);
    setarValorMoedaInput(document.getElementById('inputValorRealizado'), 0);

    // Tipo padrão Despesa Fixa (ou o usuário pode escolher Despesa Variável, Investimento, etc.)
    const inputTipo = document.getElementById('inputTipoGasto');
    if (inputTipo) inputTipo.value = 'Despesa Fixa';

    // Data de hoje
    const inputData = document.getElementById('inputData');
    if (inputData) {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const dd = String(hoje.getDate()).padStart(2, '0');
        inputData.value = `${yyyy}-${mm}-${dd}`;
    }

    const btnSalvarModal = document.getElementById('btnSalvar');
    if (btnSalvarModal) {
        btnSalvarModal.innerText = '📅 Confirmar Programação no Orçamento';
    }

    showToast('Conta pronta para programação! Escolha o tipo, vencimento, parcelas e confirme.');
}
window.programarConta = programarConta;

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
    inicializarMascarasMoeda();
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
    if (btn) {
        btn.classList.add('active');
    } else {
        const idBtn = filtro === 'receitas' ? 'btnFiltroReceitas' : (filtro === 'despesas' ? 'btnFiltroDespesas' : (filtro === 'todos' ? 'btnFiltroTodos' : null));
        if (idBtn) {
            const b = document.getElementById(idBtn);
            if (b) b.classList.add('active');
        }
    }
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
    } else if (window.extratoFiltroAtual === 'investimentos') {
        itens = itens.filter(i => i.tipo_gasto === 'Investimento');
    } else if (window.extratoFiltroAtual === 'reserva') {
        itens = itens.filter(i => i.tipo_gasto === 'Reserva de Emergência');
    }
    
    container.innerHTML = '';
    
    if (itens.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94A3B8; padding: 2.5rem 1rem;">Nenhum lançamento encontrado para os filtros selecionados.</p>';
        return;
    }
    
    const getValorComparacao = (item) => {
        const vr = parseFloat(item.valor_realizado) || 0;
        const vo = parseFloat(item.valor_total) || 0;
        return vr > 0 ? vr : vo;
    };

    const isReceita = (i) => (i.tipo_gasto === 'Receita' || i.tipo_gasto === 'Resgate de Reserva');

    // Separar Receitas e Despesas/Saídas
    const listaReceitas = itens.filter(isReceita);
    const listaDespesas = itens.filter(i => !isReceita(i));

    // Ordenar da MAIOR para a MENOR
    listaReceitas.sort((a, b) => getValorComparacao(b) - getValorComparacao(a));
    listaDespesas.sort((a, b) => getValorComparacao(b) - getValorComparacao(a));

    const renderItemCard = (item) => {
        const [y, m, d] = (item.data_lancamento || '2026-01-01').split('-');
        const dataBr = `${d}/${m}`;
        const itemIsReceita = isReceita(item);
        
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

        const isReserva = (item.tipo_gasto === 'Reserva de Emergência');
        const isInvestimento = (item.tipo_gasto === 'Investimento');

        let borderLeftColor = '#EF4444';
        let iconCat = '📤';
        let corValor = '#EF4444';
        let sinalValor = '-';

        if (itemIsReceita) {
            borderLeftColor = '#10B981';
            iconCat = '📥';
            corValor = '#10B981';
            sinalValor = '+';
        } else if (isReserva) {
            borderLeftColor = '#F59E0B';
            iconCat = '🛡️';
            corValor = '#F59E0B';
            sinalValor = '-';
        } else if (isInvestimento) {
            borderLeftColor = '#8B5CF6';
            iconCat = '📈';
            corValor = '#8B5CF6';
            sinalValor = '-';
        }

        const div = document.createElement('div');
        div.className = `card ${cssClass}`;
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.style.borderLeft = '4px solid ' + borderLeftColor;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div class="card-details">
                    <h4 style="display:flex; align-items:center; gap:6px; font-size: 0.95rem;">
                        <span>${iconCat}</span>
                        ${item.descricao} ${tagCancelado} ${tagStatus}
                    </h4>
                    <p style="color:#94A3B8; font-size:0.8rem; margin-top:3px;">
                        ${dataBr} • ${item.tipo_gasto || 'Geral'} &nbsp; ${tagParcela}
                    </p>
                </div>
                <div class="card-value" style="text-align: right; ${item.status === 'Cancelado' ? 'text-decoration: line-through; opacity:0.6;' : ''}">
                    <div style="font-size:1.05rem; font-weight:800; color:${corValor};">
                        ${sinalValor} R$ ${vRealizado !== '0,00' ? vRealizado : vOrcado}
                    </div>
                    <div style="font-size:0.75rem; color:#64748B;">Previsto: R$ ${vOrcado}</div>
                </div>
            </div>
            ${btnActions}
        `;
        return div;
    };

    // SEÇÃO DE RECEITAS (SEMPRE NO INÍCIO)
    if (listaReceitas.length > 0) {
        if (!window.extratoFiltroAtual || window.extratoFiltroAtual === 'todos') {
            const headerRec = document.createElement('div');
            headerRec.style.cssText = 'font-size:0.85rem; font-weight:800; color:#10B981; padding:8px 12px; margin-top:4px; margin-bottom:4px; display:flex; align-items:center; justify-content:space-between; background:rgba(16,185,129,0.08); border-radius:10px; border-left:4px solid #10B981;';
            headerRec.innerHTML = `
                <span style="display:flex; align-items:center; gap:6px;"><span>📥</span> RECEITAS (MAIOR PARA A MENOR)</span>
                <span style="font-size:0.75rem; background:rgba(16,185,129,0.18); padding:2px 8px; border-radius:6px;">${listaReceitas.length} item(ns)</span>
            `;
            container.appendChild(headerRec);
        }
        listaReceitas.forEach(item => container.appendChild(renderItemCard(item)));
    }

    // SEÇÃO DE DESPESAS (SEMPRE ABAIXO DAS RECEITAS, NUNCA MISTURADAS)
    if (listaDespesas.length > 0) {
        if (!window.extratoFiltroAtual || window.extratoFiltroAtual === 'todos') {
            const headerDes = document.createElement('div');
            headerDes.style.cssText = 'font-size:0.85rem; font-weight:800; color:#EF4444; padding:8px 12px; margin-top:14px; margin-bottom:4px; display:flex; align-items:center; justify-content:space-between; background:rgba(239,68,68,0.08); border-radius:10px; border-left:4px solid #EF4444;';
            headerDes.innerHTML = `
                <span style="display:flex; align-items:center; gap:6px;"><span>📤</span> DESPESAS E SAÍDAS (MAIOR PARA A MENOR)</span>
                <span style="font-size:0.75rem; background:rgba(239,68,68,0.18); padding:2px 8px; border-radius:6px;">${listaDespesas.length} item(ns)</span>
            `;
            container.appendChild(headerDes);
        }
        listaDespesas.forEach(item => container.appendChild(renderItemCard(item)));
    }
}

// ==========================================================================
// AÇÕES DO EXTRATO: BACKUP (EXCEL / JSON) E ESTRATO (PDF)
// ==========================================================================

// Variável temporária para dados carregados para importação
let _dadosImportacaoTemp = null;

// Função auxiliar para verificar se a data do lançamento pertence ao período selecionado
function isLancamentoNoPeriodo(dataStr, anoInicio, mesInicio, qtdMeses) {
    if (!dataStr) return false;
    const parts = dataStr.split('-');
    if (parts.length < 2) return false;
    const ano = parseInt(parts[0], 10);
    const mes = parseInt(parts[1], 10) - 1; // 0-indexed (0 a 11)
    if (isNaN(ano) || isNaN(mes)) return false;

    const diff = (ano - anoInicio) * 12 + (mes - mesInicio);
    return diff >= 0 && diff < qtdMeses;
}

// 1. Abrir Modal de Exportação com Informações Dinâmicas do Mês Atual
async function abrirModalExportarBackup() {
    try {
        const modal = document.getElementById('modalExportarBackupExcel');
        if (!modal) {
            exportarBackupFinancasDireto('mes_atual');
            return;
        }

        const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const anoAtual = currentViewDate.getFullYear();
        const mesAtual = currentViewDate.getMonth();
        const mesNome = mesesNomes[mesAtual];

        const movs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
        const movsMes = movs.filter(m => isLancamentoNoPeriodo(m.data_lancamento, anoAtual, mesAtual, 1));

        // Atualiza textos do modal
        const txtTituloMes = document.getElementById('txtBackupMesAtualTitulo');
        if (txtTituloMes) txtTituloMes.innerText = `Apenas o mês atual (${mesNome}/${anoAtual})`;

        const txtContagemMes = document.getElementById('txtBackupMesAtualContagem');
        if (txtContagemMes) txtContagemMes.innerText = `${movsMes.length} lançamento(s) encontrado(s) para este mês`;

        const txtContagemTodos = document.getElementById('txtBackupTodosContagem');
        if (txtContagemTodos) txtContagemTodos.innerText = `${movs.length} lançamento(s) registrados no histórico total`;

        // Reseta opção padrão para "mes_atual"
        const radMes = document.querySelector('input[name="opcaoPeriodoBackup"][value="mes_atual"]');
        if (radMes) radMes.checked = true;
        aoMudarOpcaoPeriodoBackup('mes_atual');

        modal.style.display = 'flex';
    } catch (err) {
        console.error('Erro ao abrir modal de backup:', err);
        exportarBackupFinancasDireto('mes_atual');
    }
}
window.abrirModalExportarBackup = abrirModalExportarBackup;
window.exportarBackupFinancas = abrirModalExportarBackup;

function fecharModalExportarBackup() {
    const modal = document.getElementById('modalExportarBackupExcel');
    if (modal) modal.style.display = 'none';
}
window.fecharModalExportarBackup = fecharModalExportarBackup;

function aoMudarOpcaoPeriodoBackup(opcao) {
    const lblMes = document.getElementById('lblOptBackupMesAtual');
    const lblQtd = document.getElementById('lblOptBackupQtdMeses');
    const lblTodos = document.getElementById('lblOptBackupTodos');
    const containerQtd = document.getElementById('containerControleQtdMesesBackup');

    if (lblMes) {
        lblMes.style.borderColor = (opcao === 'mes_atual') ? '#3B82F6' : '#334155';
        lblMes.style.background = (opcao === 'mes_atual') ? 'rgba(59, 130, 246, 0.12)' : '#0F172A';
    }
    if (lblQtd) {
        lblQtd.style.borderColor = (opcao === 'qtd_meses') ? '#10B981' : '#334155';
        lblQtd.style.background = (opcao === 'qtd_meses') ? 'rgba(16, 185, 129, 0.12)' : '#0F172A';
    }
    if (lblTodos) {
        lblTodos.style.borderColor = (opcao === 'todos') ? '#8B5CF6' : '#334155';
        lblTodos.style.background = (opcao === 'todos') ? 'rgba(139, 92, 246, 0.12)' : '#0F172A';
    }

    if (containerQtd) {
        containerQtd.style.display = (opcao === 'qtd_meses') ? 'flex' : 'none';
    }

    if (opcao === 'qtd_meses') {
        atualizarPreviaQtdMesesBackup();
    }
}
window.aoMudarOpcaoPeriodoBackup = aoMudarOpcaoPeriodoBackup;

function alterarQtdMesesBackup(delta) {
    const inp = document.getElementById('inputQtdMesesBackup');
    if (!inp) return;
    let v = (parseInt(inp.value, 10) || 1) + delta;
    if (v < 1) v = 1;
    if (v > 120) v = 120;
    inp.value = v;
    atualizarPreviaQtdMesesBackup();
}
window.alterarQtdMesesBackup = alterarQtdMesesBackup;

function validarQtdMesesBackup(inp) {
    let v = parseInt(inp.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 120) v = 120;
    inp.value = v;
    atualizarPreviaQtdMesesBackup();
}
window.validarQtdMesesBackup = validarQtdMesesBackup;

async function atualizarPreviaQtdMesesBackup() {
    const inp = document.getElementById('inputQtdMesesBackup');
    const txtPrevia = document.getElementById('txtPreviaPeriodoQtd');
    if (!inp || !txtPrevia) return;

    const qtd = parseInt(inp.value, 10) || 1;
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const anoAtual = currentViewDate.getFullYear();
    const mesAtual = currentViewDate.getMonth();

    const fimDate = new Date(anoAtual, mesAtual + qtd - 1, 1);
    const anoFim = fimDate.getFullYear();
    const mesFim = fimDate.getMonth();

    try {
        const movs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
        const count = movs.filter(m => isLancamentoNoPeriodo(m.data_lancamento, anoAtual, mesAtual, qtd)).length;
        txtPrevia.innerText = `Período: ${mesesNomes[mesAtual]}/${anoAtual} até ${mesesNomes[mesFim]}/${anoFim} (${qtd} meses) • ${count} lançamentos`;
    } catch(e) {
        txtPrevia.innerText = `Período: ${mesesNomes[mesAtual]}/${anoAtual} até ${mesesNomes[mesFim]}/${anoFim} (${qtd} meses)`;
    }
}
window.atualizarPreviaQtdMesesBackup = atualizarPreviaQtdMesesBackup;

async function confirmarExportacaoBackupExcel() {
    const rad = document.querySelector('input[name="opcaoPeriodoBackup"]:checked');
    const opcao = rad ? rad.value : 'mes_atual';
    fecharModalExportarBackup();
    await exportarBackupFinancasDireto(opcao);
}
window.confirmarExportacaoBackupExcel = confirmarExportacaoBackupExcel;

// Exportação Direta de Backup com geração do arquivo Excel (.xlsx)
async function exportarBackupFinancasDireto(opcao) {
    try {
        const movs = await dbLocal.movimentacoes.filter(m => m.deleted !== 1).toArray();
        const contas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
        const origens = await dbLocal.origens_renda.filter(o => o.deleted !== 1).toArray();

        const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const anoAtual = currentViewDate.getFullYear();
        const mesAtual = currentViewDate.getMonth();

        const now = new Date();
        const dataStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const horaStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        let movsFiltradas = [];
        let periodoDesc = '';
        let fileName = '';

        if (opcao === 'mes_atual') {
            movsFiltradas = movs.filter(m => isLancamentoNoPeriodo(m.data_lancamento, anoAtual, mesAtual, 1));
            periodoDesc = `${mesesCompletos[mesAtual]} de ${anoAtual}`;
            fileName = `backup_financas_${mesesCompletos[mesAtual]}_${anoAtual}.xlsx`;
        } else if (opcao === 'qtd_meses') {
            const inpQtd = document.getElementById('inputQtdMesesBackup');
            const qtd = inpQtd ? (parseInt(inpQtd.value, 10) || 1) : 1;
            movsFiltradas = movs.filter(m => isLancamentoNoPeriodo(m.data_lancamento, anoAtual, mesAtual, qtd));
            const fimDate = new Date(anoAtual, mesAtual + qtd - 1, 1);
            periodoDesc = `${mesesCompletos[mesAtual]}/${anoAtual} a ${mesesCompletos[fimDate.getMonth()]}/${fimDate.getFullYear()} (${qtd} meses)`;
            fileName = `backup_financas_${qtd}meses_${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}_a_${fimDate.getFullYear()}-${String(fimDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
        } else {
            // Todos os meses
            movsFiltradas = movs.slice();
            periodoDesc = 'Todos os Meses (Histórico Completo)';
            fileName = `backup_financas_completo_${dataStr}.xlsx`;
        }

        // Ordena por data (mais recente primeiro)
        movsFiltradas.sort((a, b) => {
            const dA = a.data_lancamento || '';
            const dB = b.data_lancamento || '';
            return dB.localeCompare(dA);
        });

        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();

            // 1. Aba Lançamentos
            const rowsLancamentos = movsFiltradas.map(m => {
                let dataFmt = m.data_lancamento || '';
                if (dataFmt && dataFmt.includes('-')) {
                    const p = dataFmt.split('-');
                    if (p.length === 3) dataFmt = `${p[2]}/${p[1]}/${p[0]}`;
                }

                return {
                    'ID': m.id || '',
                    'Data': dataFmt,
                    'Descrição': m.descricao || '',
                    'Categoria / Tipo': m.tipo_gasto || '',
                    'Valor Orçado (R$)': parseFloat(m.valor_total || 0),
                    'Valor Realizado (R$)': parseFloat(m.valor_realizado || 0),
                    'Status': m.status || 'Pendente',
                    'Parcelado': m.parcelado || 'Não',
                    'Parcela Atual': m.parcela_atual || 1,
                    'Total Parcelas': m.total_parcelas || 1,
                    'Grupo': m.id_grupo || '',
                    'Link da Fonte': m.link_url || '',
                    'Tipo de Mídia': m.midia_tipo || ''
                };
            });

            const wsLancamentos = XLSX.utils.json_to_sheet(rowsLancamentos);

            wsLancamentos['!cols'] = [
                { wch: 15 }, // ID
                { wch: 12 }, // Data
                { wch: 32 }, // Descrição
                { wch: 22 }, // Categoria / Tipo
                { wch: 18 }, // Valor Orçado
                { wch: 18 }, // Valor Realizado
                { wch: 14 }, // Status
                { wch: 12 }, // Parcelado
                { wch: 14 }, // Parcela Atual
                { wch: 14 }, // Total Parcelas
                { wch: 14 }, // Grupo
                { wch: 30 }, // Link
                { wch: 14 }  // Mídia
            ];

            XLSX.utils.book_append_sheet(wb, wsLancamentos, 'Lançamentos');

            // 2. Aba Resumo Geral
            let totReceitas = 0, totDespesas = 0, totInvest = 0, totReserva = 0, totGaveta = 0, totDesejos = 0;
            movsFiltradas.forEach(m => {
                const v = parseFloat(m.valor_total || 0);
                if (m.tipo_gasto === 'Receita') totReceitas += v;
                else if (m.tipo_gasto === 'Despesa Fixa' || m.tipo_gasto === 'Despesa Variável') totDespesas += v;
                else if (m.tipo_gasto === 'Investimento') totInvest += v;
                else if (m.tipo_gasto === 'Reserva de Emergência') totReserva += v;
                else if (m.tipo_gasto === 'Conta a Pagar') totGaveta += v;
                else if (m.tipo_gasto === 'Lista de Desejos') totDesejos += v;
            });

            const rowsResumo = [
                { 'Indicador Financeiro': 'Período do Backup', 'Valor (R$) / Info': periodoDesc },
                { 'Indicador Financeiro': 'Data e Hora da Exportação', 'Valor (R$) / Info': `${dataStr} às ${horaStr}` },
                { 'Indicador Financeiro': 'Total de Lançamentos Exportados', 'Valor (R$) / Info': movsFiltradas.length },
                { 'Indicador Financeiro': 'Total de Receitas Lançadas', 'Valor (R$) / Info': totReceitas },
                { 'Indicador Financeiro': 'Total de Despesas Orçadas', 'Valor (R$) / Info': totDespesas },
                { 'Indicador Financeiro': 'Saldo Previsto (Receitas - Despesas)', 'Valor (R$) / Info': (totReceitas - totDespesas) },
                { 'Indicador Financeiro': 'Total Alocado em Investimentos', 'Valor (R$) / Info': totInvest },
                { 'Indicador Financeiro': 'Total em Reserva de Emergência', 'Valor (R$) / Info': totReserva },
                { 'Indicador Financeiro': 'Contas a Pagar na Gaveta', 'Valor (R$) / Info': totGaveta },
                { 'Indicador Financeiro': 'Metas e Lista de Desejos', 'Valor (R$) / Info': totDesejos }
            ];

            const wsResumo = XLSX.utils.json_to_sheet(rowsResumo);
            wsResumo['!cols'] = [{ wch: 38 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');

            // 3. Aba de Dados Técnicos para restauração 100% perfeita
            const backupPayload = {
                app: "Finanças Pessoais",
                versao: "1.4.0",
                periodo: periodoDesc,
                data_exportacao: new Date().toISOString(),
                total_lancamentos: movsFiltradas.length,
                movimentacoes: movsFiltradas,
                contas_bancarias: (opcao === 'todos') ? contas : [],
                origens_renda: (opcao === 'todos') ? origens : []
            };
            const wsRaw = XLSX.utils.json_to_sheet([
                { 'METADADOS_SISTEMA': JSON.stringify(backupPayload) }
            ]);
            XLSX.utils.book_append_sheet(wb, wsRaw, 'Backup_Dados_Sistema');

            // Gera binário XLSX e dispara download
            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`✅ Backup em Excel gerado com sucesso! (${movsFiltradas.length} lançamentos de ${periodoDesc})`);
            return;
        }

        // Fallback JSON
        const backupData = {
            app: "Finanças Pessoais",
            versao: "1.4.0",
            periodo: periodoDesc,
            data_exportacao: new Date().toISOString(),
            total_lancamentos: movsFiltradas.length,
            movimentacoes: movsFiltradas,
            contas_bancarias: (opcao === 'todos') ? contas : [],
            origens_renda: (opcao === 'todos') ? origens : []
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.xlsx', '.json');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`✅ Backup exportado com sucesso! (${movsFiltradas.length} lançamentos)`);
    } catch (err) {
        console.error('Erro ao exportar backup:', err);
        alert('Erro ao exportar backup: ' + err.message);
    }
}
window.exportarBackupFinancasDireto = exportarBackupFinancasDireto;

// 2. Importar Backup em Excel (.xlsx) ou JSON
function fecharModalConfirmarImportacao() {
    const modal = document.getElementById('modalConfirmarImportacao');
    if (modal) modal.style.display = 'none';
    _dadosImportacaoTemp = null;
    const inp = document.getElementById('inputImportarBakap');
    if (inp) inp.value = '';
}
window.fecharModalConfirmarImportacao = fecharModalConfirmarImportacao;

async function importarBackupFinancas(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
        const fileName = (file.name || '').toLowerCase();
        let movsParaImportar = [];
        let contasParaImportar = [];
        let origensParaImportar = [];

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            if (typeof XLSX === 'undefined') {
                alert('Módulo de leitura do Excel não carregado. Recarregue a página e tente novamente.');
                event.target.value = '';
                return;
            }

            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

            // 1. Tenta restaurar pela aba de metadados de sistema se existir
            if (wb.Sheets['Backup_Dados_Sistema']) {
                try {
                    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets['Backup_Dados_Sistema']);
                    if (rawRows.length > 0 && rawRows[0]['METADADOS_SISTEMA']) {
                        const payload = JSON.parse(rawRows[0]['METADADOS_SISTEMA']);
                        if (Array.isArray(payload.movimentacoes)) movsParaImportar = payload.movimentacoes;
                        if (Array.isArray(payload.contas_bancarias)) contasParaImportar = payload.contas_bancarias;
                        if (Array.isArray(payload.origens_renda)) origensParaImportar = payload.origens_renda;
                    }
                } catch(e) {
                    console.warn('Não foi possível ler metadados embutidos, fazendo fallback para colunas da planilha:', e);
                }
            }

            // 2. Se não pegou por metadados, faz o parse direto da aba de Lançamentos
            if (movsParaImportar.length === 0) {
                const sheetName = wb.Sheets['Lançamentos'] ? 'Lançamentos' : wb.SheetNames[0];
                const sheet = wb.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet);

                rows.forEach(r => {
                    const desc = r['Descrição'] || r['Descricao'] || r['descricao'] || '';
                    if (!desc && !r['Valor Orçado (R$)'] && !r['Valor'] && !r['valor_total']) return;

                    let dataStr = '';
                    const rawData = r['Data'] || r['data_lancamento'] || r['data'] || '';
                    if (rawData instanceof Date && !isNaN(rawData.getTime())) {
                        const y = rawData.getFullYear();
                        const m = String(rawData.getMonth() + 1).padStart(2, '0');
                        const d = String(rawData.getDate()).padStart(2, '0');
                        dataStr = `${y}-${m}-${d}`;
                    } else if (typeof rawData === 'number') {
                        const jsDate = new Date(Math.round((rawData - 25569) * 86400 * 1000));
                        if (!isNaN(jsDate.getTime())) {
                            const y = jsDate.getUTCFullYear();
                            const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
                            const d = String(jsDate.getUTCDate()).padStart(2, '0');
                            dataStr = `${y}-${m}-${d}`;
                        }
                    } else if (typeof rawData === 'string' && rawData.trim()) {
                        const s = rawData.trim();
                        if (s.includes('/')) {
                            const parts = s.split('/');
                            if (parts.length === 3) {
                                dataStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                        } else if (s.includes('-')) {
                            const parts = s.split('-');
                            if (parts.length === 3) {
                                if (parts[0].length === 4) {
                                    dataStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                                } else {
                                    dataStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                }
                            }
                        }
                    }

                    const valOrcado = parseFloat(r['Valor Orçado (R$)'] || r['Valor Orçado'] || r['Valor'] || r['valor_total'] || 0);
                    const valRealizado = parseFloat(r['Valor Realizado (R$)'] || r['Valor Realizado'] || r['valor_realizado'] || 0);

                    movsParaImportar.push({
                        id: r['ID'] || r['id'] || generateUUID(),
                        data_lancamento: dataStr,
                        descricao: desc,
                        tipo_gasto: r['Categoria / Tipo'] || r['Categoria'] || r['Tipo'] || r['tipo_gasto'] || 'Despesa Variável',
                        valor_total: isNaN(valOrcado) ? 0 : valOrcado,
                        valor_realizado: isNaN(valRealizado) ? 0 : valRealizado,
                        status: r['Status'] || r['status'] || 'Pendente',
                        parcelado: r['Parcelado'] || r['parcelado'] || 'Não',
                        parcela_atual: parseInt(r['Parcela Atual'] || r['parcela_atual'], 10) || 1,
                        total_parcelas: parseInt(r['Total Parcelas'] || r['total_parcelas'], 10) || 1,
                        id_grupo: r['Grupo'] || r['id_grupo'] || '',
                        link_url: r['Link da Fonte'] || r['Link Original'] || r['link_url'] || '',
                        midia_tipo: r['Tipo de Mídia'] || r['Mídia (Tipo)'] || r['midia_tipo'] || '',
                        deleted: 0
                    });
                });
            }
        } else {
            // Arquivo JSON
            const text = await file.text();
            const data = JSON.parse(text);

            if (Array.isArray(data)) {
                movsParaImportar = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.movimentacoes)) movsParaImportar = data.movimentacoes;
                if (Array.isArray(data.contas_bancarias)) contasParaImportar = data.contas_bancarias;
                if (Array.isArray(data.origens_renda)) origensParaImportar = data.origens_renda;
            }
        }

        if (movsParaImportar.length === 0 && contasParaImportar.length === 0) {
            alert('Arquivo de backup inválido ou sem dados para importar.');
            event.target.value = '';
            return;
        }

        // Identifica período dos lançamentos importados
        const datas = movsParaImportar.map(m => m.data_lancamento).filter(Boolean).sort();
        let periodoIdentificado = 'Diversos';
        if (datas.length > 0) {
            const dMin = datas[0];
            const dMax = datas[datas.length - 1];
            if (dMin === dMax) {
                const [y, m, d] = dMin.split('-');
                periodoIdentificado = `${d}/${m}/${y}`;
            } else if (dMin.slice(0, 7) === dMax.slice(0, 7)) {
                const [y, m] = dMin.split('-');
                const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                periodoIdentificado = `${mesesNomes[parseInt(m, 10) - 1]}/${y}`;
            } else {
                const [y1, m1, d1] = dMin.split('-');
                const [y2, m2, d2] = dMax.split('-');
                periodoIdentificado = `${d1}/${m1}/${y1} a ${d2}/${m2}/${y2}`;
            }
        }

        // Guarda os dados para confirmação
        _dadosImportacaoTemp = {
            movs: movsParaImportar,
            contas: contasParaImportar,
            origens: origensParaImportar,
            fileName: file.name
        };

        // Abre o modal estilizado de confirmação de importação
        const modal = document.getElementById('modalConfirmarImportacao');
        if (modal) {
            const txtResumo = document.getElementById('txtImportResumoArquivo');
            if (txtResumo) txtResumo.innerText = `Arquivo: ${file.name}`;

            const lblQtd = document.getElementById('lblImportQtdLancamentos');
            if (lblQtd) lblQtd.innerText = movsParaImportar.length;

            const lblPeriodo = document.getElementById('lblImportPeriodo');
            if (lblPeriodo) lblPeriodo.innerText = periodoIdentificado;

            modal.style.display = 'flex';
        } else {
            // Fallback para confirm se o modal não estiver no DOM
            const confirmou = confirm(`Deseja importar este backup contendo ${movsParaImportar.length} lançamento(s) (${periodoIdentificado})?\n\nTodos os registros serão restaurados no aplicativo e sincronizados.`);
            if (confirmou) {
                await executarImportacaoConfirmada();
            } else {
                event.target.value = '';
                _dadosImportacaoTemp = null;
            }
        }
    } catch (err) {
        console.error('Erro ao processar arquivo de backup:', err);
        alert('Erro ao processar arquivo de backup: ' + err.message);
        event.target.value = '';
        _dadosImportacaoTemp = null;
    }
}
window.importarBackupFinancas = importarBackupFinancas;

// Execução da Importação Confirmada
async function executarImportacaoConfirmada() {
    if (!_dadosImportacaoTemp) return;

    try {
        const { movs, contas, origens } = _dadosImportacaoTemp;
        const currentUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
        const currentUserId = currentUser ? currentUser.id : (localStorage.getItem('financas_current_user_id') || null);

        // Salva movimentações no IndexedDB local
        for (const m of movs) {
            if (!m.id) m.id = generateUUID();
            m.deleted = 0;
            m.sync_status = 'pending_insert';
            m.updated_at = Date.now();
            if (currentUserId && !m.user_id) m.user_id = currentUserId;
            await dbLocal.movimentacoes.put(m);
        }

        // Salva contas bancárias
        for (const c of contas) {
            if (!c.id) c.id = generateUUID();
            c.deleted = 0;
            c.sync_status = 'pending_insert';
            c.updated_at = Date.now();
            if (currentUserId && !c.user_id) c.user_id = currentUserId;
            await dbLocal.contas_bancarias.put(c);
        }

        // Salva origens de renda
        for (const o of origens) {
            if (!o.id) o.id = generateUUID();
            o.deleted = 0;
            o.sync_status = 'pending_insert';
            o.updated_at = Date.now();
            if (currentUserId && !o.user_id) o.user_id = currentUserId;
            await dbLocal.origens_renda.put(o);
        }

        fecharModalConfirmarImportacao();

        // Atualiza a interface
        if (typeof carregarPlanejamento === 'function') {
            await carregarPlanejamento();
        }
        if (typeof renderizarExtratoCompleto === 'function') {
            renderizarExtratoCompleto();
        }
        if (typeof carregarContasAPagar === 'function') {
            carregarContasAPagar();
        }
        if (typeof carregarListaDesejos === 'function') {
            carregarListaDesejos();
        }

        // Dispara sincronização com o servidor SQLite/Render
        if (typeof syncFinanceWithServer === 'function') {
            syncFinanceWithServer();
        }

        showToast(`✅ ${movs.length} lançamento(s) importado(s) com sucesso!`);
    } catch (err) {
        console.error('Erro ao executar importação:', err);
        alert('Erro ao salvar lançamentos importados: ' + err.message);
        fecharModalConfirmarImportacao();
    }
}
window.executarImportacaoConfirmada = executarImportacaoConfirmada;
window.importarBackupFinancas = importarBackupFinancas;

// 3. Gerar Extrato em PDF ("Estrato")
async function gerarExtratoPDF() {
    try {
        let itens = (window.currentMesItens || []).slice();
        if (window.extratoFiltroAtual === 'receitas') {
            itens = itens.filter(i => i.tipo_gasto === 'Receita' || i.tipo_gasto === 'Resgate de Reserva');
        } else if (window.extratoFiltroAtual === 'despesas') {
            itens = itens.filter(i => i.tipo_gasto !== 'Receita' && i.tipo_gasto !== 'Resgate de Reserva');
        }

        if (itens.length === 0) {
            alert('Não há lançamentos no mês selecionado para gerar o extrato em PDF.');
            return;
        }

        const getValorComparacao = (item) => {
            const vr = parseFloat(item.valor_realizado) || 0;
            const vo = parseFloat(item.valor_total) || 0;
            return vr > 0 ? vr : vo;
        };
        const isReceita = (i) => (i.tipo_gasto === 'Receita' || i.tipo_gasto === 'Resgate de Reserva');

        const recsPDF = itens.filter(isReceita).sort((a, b) => getValorComparacao(b) - getValorComparacao(a));
        const despsPDF = itens.filter(i => !isReceita(i)).sort((a, b) => getValorComparacao(b) - getValorComparacao(a));
        itens = [...recsPDF, ...despsPDF];

        const mesesNomes = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const mesIdx = (typeof currentViewDate !== 'undefined') ? currentViewDate.getMonth() : new Date().getMonth();
        const anoNum = (typeof currentViewDate !== 'undefined') ? currentViewDate.getFullYear() : new Date().getFullYear();
        const nomeMes = mesesNomes[mesIdx] || 'Mês Atual';

        let totalReceitas = 0;
        let totalDespesas = 0;

        itens.forEach(item => {
            if (item.status === 'Cancelado') return;
            const vReal = parseFloat(item.valor_realizado || 0);
            const vOrc = parseFloat(item.valor_total || 0);
            const valorFinal = vReal > 0 ? vReal : vOrc;

            if (item.tipo_gasto === 'Receita' || item.tipo_gasto === 'Resgate de Reserva') {
                totalReceitas += valorFinal;
            } else {
                totalDespesas += valorFinal;
            }
        });

        const saldoMes = totalReceitas - totalDespesas;
        const fmtMoeda = (val) => 'R$ ' + (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const user = (typeof getAuthUser === 'function') ? getAuthUser() : null;
        const nomeUsuario = user ? (user.name || user.email) : 'Usuário Finanças';

        // Se jsPDF estiver disponível, gera arquivo PDF formatado direto
        if (window.jspdf && window.jspdf.jsPDF) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Top Banner Escuro
            doc.setFillColor(15, 23, 42); // #0F172A
            doc.rect(0, 0, 210, 32, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(15);
            doc.setFont('helvetica', 'bold');
            doc.text('FINANÇAS PESSOAIS - EXTRATO MENSAL', 14, 13);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184); // #94A3B8
            const dataEmissao = new Date().toLocaleString('pt-BR');
            doc.text(`Titular: ${nomeUsuario}   |   Mês Referência: ${nomeMes} de ${anoNum}   |   Emitido em: ${dataEmissao}`, 14, 23);

            // Bloco de Resumo (KPIs)
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, 38, 182, 22, 3, 3, 'FD');

            // Receitas
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('TOTAL RECEITAS', 20, 45);
            doc.setFontSize(10.5);
            doc.setTextColor(16, 185, 129); // Verde
            doc.text(fmtMoeda(totalReceitas), 20, 53);

            // Despesas
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('TOTAL DESPESAS', 82, 45);
            doc.setFontSize(10.5);
            doc.setTextColor(239, 68, 68); // Vermelho
            doc.text(fmtMoeda(totalDespesas), 82, 53);

            // Saldo
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('SALDO DO MÊS', 144, 45);
            doc.setFontSize(10.5);
            if (saldoMes >= 0) {
                doc.setTextColor(37, 99, 235); // Azul
            } else {
                doc.setTextColor(239, 68, 68); // Vermelho
            }
            doc.text(fmtMoeda(saldoMes), 144, 53);

            // Tabela de Dados
            const tableBody = itens.map(item => {
                const [y, m, d] = (item.data_lancamento || '2026-01-01').split('-');
                const dataBr = `${d}/${m}/${y}`;
                const isReceita = (item.tipo_gasto === 'Receita' || item.tipo_gasto === 'Resgate de Reserva');
                const vReal = parseFloat(item.valor_realizado || 0);
                const vOrc = parseFloat(item.valor_total || 0);
                const valorFinal = vReal > 0 ? vReal : vOrc;
                const sinal = isReceita ? '+ ' : '- ';
                const statusTexto = item.status === 'Pago' ? 'Pago' : (item.status === 'Cancelado' ? 'Cancelado' : 'Pendente');

                return [
                    dataBr,
                    item.descricao || 'Sem descrição',
                    item.tipo_gasto || 'Geral',
                    statusTexto,
                    sinal + fmtMoeda(valorFinal)
                ];
            });

            doc.autoTable({
                startY: 66,
                head: [['Data', 'Descrição', 'Categoria / Tipo', 'Status', 'Valor (R$)']],
                body: tableBody,
                headStyles: {
                    fillColor: [37, 99, 235], // #2563EB
                    textColor: [255, 255, 255],
                    fontSize: 8.5,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    textColor: [30, 41, 59]
                },
                columnStyles: {
                    0: { cellWidth: 22, halign: 'center' },
                    1: { cellWidth: 72 },
                    2: { cellWidth: 38 },
                    3: { cellWidth: 22, halign: 'center' },
                    4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
                },
                didDrawPage: function(data) {
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height || pageSize.getHeight();
                    doc.setFontSize(7.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Finanças Pessoais - Computador & Mobbi • Página ${doc.internal.getNumberOfPages()}`,
                        14,
                        pageHeight - 8
                    );
                }
            });

            const nomeArquivo = `extrato_${nomeMes.toLowerCase()}_${anoNum}.pdf`;
            doc.save(nomeArquivo);

            if (typeof showToast === 'function') {
                showToast('📄 Extrato gerado e baixado em PDF com sucesso!');
            }
        } else {
            // Fallback de impressão / Salvar PDF do navegador
            imprimirExtratoHTML(nomeMes, anoNum, nomeUsuario, totalReceitas, totalDespesas, saldoMes, itens);
        }
    } catch (err) {
        console.error('Erro ao gerar extrato em PDF:', err);
        alert('Erro ao gerar extrato em PDF: ' + err.message);
    }
}

// Fallback: visualização para impressão/salvar PDF nativo
function imprimirExtratoHTML(nomeMes, anoNum, nomeUsuario, totalReceitas, totalDespesas, saldoMes, itens) {
    const fmtMoeda = (val) => 'R$ ' + (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let rowsHtml = '';
    itens.forEach(item => {
        const [y, m, d] = (item.data_lancamento || '2026-01-01').split('-');
        const dataBr = `${d}/${m}/${y}`;
        const isReceita = (item.tipo_gasto === 'Receita' || item.tipo_gasto === 'Resgate de Reserva');
        const vReal = parseFloat(item.valor_realizado || 0);
        const vOrc = parseFloat(item.valor_total || 0);
        const valorFinal = vReal > 0 ? vReal : vOrc;
        const cor = isReceita ? '#10B981' : '#EF4444';
        const sinal = isReceita ? '+ ' : '- ';
        rowsHtml += `
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px; text-align: center;">${dataBr}</td>
                <td style="padding: 8px;">${item.descricao || ''}</td>
                <td style="padding: 8px;">${item.tipo_gasto || ''}</td>
                <td style="padding: 8px; text-align: center;">${item.status || 'Pendente'}</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: ${cor};">${sinal}${fmtMoeda(valorFinal)}</td>
            </tr>
        `;
    });

    const janela = window.open('', '_blank');
    if (!janela) {
        alert('Por favor, permita pop-ups para imprimir ou salvar o extrato como PDF.');
        return;
    }
    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Extrato - ${nomeMes} / ${anoNum}</title>
            <style>
                body { font-family: sans-serif; padding: 24px; color: #1E293B; }
                h1 { margin: 0 0 4px 0; color: #1E3A8A; font-size: 1.4rem; }
                .sub { color: #64748B; font-size: 0.85rem; margin-bottom: 20px; }
                .kpis { display: flex; gap: 20px; margin-bottom: 24px; }
                .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 18px; flex: 1; }
                .kpi-title { font-size: 0.75rem; text-transform: uppercase; color: #64748B; font-weight: bold; }
                .kpi-val { font-size: 1.15rem; font-weight: 800; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                th { background: #2563EB; color: white; padding: 10px 8px; text-align: left; }
                @media print { button { display: none !important; } }
            </style>
        </head>
        <body>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1>FINANÇAS PESSOAIS - EXTRATO MENSAL</h1>
                    <div class="sub">Titular: ${nomeUsuario} | Período: ${nomeMes} de ${anoNum}</div>
                </div>
                <button onclick="window.print()" style="padding: 8px 16px; background:#2563EB; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Imprimir / Salvar PDF</button>
            </div>
            <div class="kpis">
                <div class="kpi-card">
                    <div class="kpi-title">Total Receitas</div>
                    <div class="kpi-val" style="color: #10B981;">${fmtMoeda(totalReceitas)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Total Despesas</div>
                    <div class="kpi-val" style="color: #EF4444;">${fmtMoeda(totalDespesas)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Saldo Líquido</div>
                    <div class="kpi-val" style="color: #2563EB;">${fmtMoeda(saldoMes)}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="text-align: center;">Data</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th style="text-align: center;">Status</th>
                        <th style="text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </body>
        </html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); }, 500);
}



