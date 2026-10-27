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

// Funções globais de detecção de Reserva de Emergência e Resgate
function isTipoReservaEmergencia(m) {
    if (!m) return false;
    const tipo = String(m.tipo_gasto || '').toLowerCase();
    const desc = String(m.descricao || '').toLowerCase();
    const cat = String(m.categoria || '').toLowerCase();
    return tipo.includes('reserva') || desc.includes('reserva de emerg') || cat.includes('reserva de emerg');
}

function isTipoResgateReserva(m) {
    if (!m) return false;
    const tipo = String(m.tipo_gasto || '').toLowerCase();
    const desc = String(m.descricao || '').toLowerCase();
    const cat = String(m.categoria || '').toLowerCase();
    return tipo.includes('resgate') || desc.includes('resgate') || cat.includes('resgate');
}

// Detecção inteligente e segura de palavras-chave de Receita (Salário, Pró-Labore, etc.)
function isDescricaoReceita(desc) {
    if (!desc || typeof desc !== 'string') return false;
    const d = desc.toLowerCase().trim();
    return (
        d.includes('salário') ||
        d.includes('salario') ||
        d.includes('pró-labore') ||
        d.includes('pro-labore') ||
        d.includes('comissão') ||
        d.includes('comissao') ||
        d.includes('honorário') ||
        d.includes('honorario') ||
        d.includes('13º') ||
        d.includes('13o') ||
        d.includes('décimo terceiro') ||
        d.includes('decimo terceiro') ||
        d.includes('rendimento') ||
        d.includes('adiantamento') ||
        d.includes('receita') ||
        d.startsWith('renda')
    );
}

window.privacyMode = localStorage.getItem('financas_privacy_mode') === 'true';

// Função global universal de formatação em BRL com suporte estrito a modo privacidade
function formatBRL(value) {
    if (window.privacyMode) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
window.formatBRL = formatBRL;

window.togglePrivacyMode = function() {
    window.privacyMode = !window.privacyMode;
    try {
        localStorage.setItem('financas_privacy_mode', window.privacyMode ? 'true' : 'false');
    } catch(e) {}

    const iconOpen = document.getElementById('iconPrivacyOpen');
    const iconClosed = document.getElementById('iconPrivacyClosed');
    
    // Quando privacyMode === false (visível): mostra Olho Aberto
    // Quando privacyMode === true (oculto): mostra Olho Riscado/Fechado
    if(iconOpen) iconOpen.style.display = window.privacyMode ? 'none' : 'block';
    if(iconClosed) iconClosed.style.display = window.privacyMode ? 'block' : 'none';
    
    // 1. Aba Lançamentos (Orçamento, Saldo Livre e Extrato)
    if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
    if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();

    // 2. Aba Cartões & Contas Bancárias (Crédito, Alimentação, Bancos e Todos)
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();

    // 3. Aba Contas a Pagar (Gaveta de Boletos)
    if (typeof carregarContasAPagar === 'function') carregarContasAPagar();

    // 4. Aba Metas & Lista de Desejos
    if (typeof carregarListaDesejos === 'function') carregarListaDesejos();

    // 5. Aba Planejamento de Rendas Extras
    if (typeof carregarPlanejamentoRendaExtra === 'function') carregarPlanejamentoRendaExtra();

    // 6. Aba Demonstrativo (PowerBI, Gráficos e Metas)
    if (typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();

    // 7. Modal de Fatura se estiver aberto
    if (document.getElementById('modalFatura') && document.getElementById('modalFatura').style.display === 'flex') {
        const mesAtualLabel = document.getElementById('lblFaturaTituloMes') ? document.getElementById('lblFaturaTituloMes').innerText : '';
        if (typeof abrirModalFatura === 'function') abrirModalFatura(mesAtualLabel);
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

    // Sincroniza estado visual do botão Ocultar Valores conforme preferência salva
    const iconOpen = document.getElementById('iconPrivacyOpen');
    const iconClosed = document.getElementById('iconPrivacyClosed');
    if (iconOpen) iconOpen.style.display = window.privacyMode ? 'none' : 'block';
    if (iconClosed) iconClosed.style.display = window.privacyMode ? 'block' : 'none';

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

    if (typeof window.isTabDemonstrativoAtiva === 'function' && window.isTabDemonstrativoAtiva()) {
        if (typeof window.sincronizarHeaderComPeriodoDemo === 'function') window.sincronizarHeaderComPeriodoDemo();
    } else {
        if (typeof window.restaurarHeaderPadraoForaDoDemo === 'function') window.restaurarHeaderPadraoForaDoDemo();
        const anoSelect = document.getElementById('anoBaseSelector');
        if (anoSelect) anoSelect.value = ano;

        const mesSelect = document.getElementById('mesBaseSelector');
        if (mesSelect) mesSelect.value = displayDate.getMonth();
    }

    const badgeMesHero = document.getElementById('lblFaturaMesHero');
    if (badgeMesHero) {
        const hoje = new Date();
        const isMesAtual = (hoje.getMonth() === displayDate.getMonth() && hoje.getFullYear() === displayDate.getFullYear());
        badgeMesHero.innerText = isMesAtual ? 'Mês Ativo' : `${mesNome}/${ano}`;
        badgeMesHero.title = isMesAtual ? 'Você está visualizando o mês atual' : 'Clique para voltar ao mês atual';
    }

    carregarPlanejamento();
    if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
    if (typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display !== 'none') {
        renderPowerBIDashboard();
    }
}

function selecionarMes(mesIndex) {
    if (typeof window.isTabDemonstrativoAtiva === 'function' && window.isTabDemonstrativoAtiva()) {
        if (typeof window.definirMesUnicoDemoPeloHeader === 'function') {
            window.definirMesUnicoDemoPeloHeader(parseInt(mesIndex, 10));
        }
        return;
    }
    currentViewDate.setMonth(parseInt(mesIndex, 10));
    if (typeof window.sincronizarPeriodoDemoComHeader === 'function') window.sincronizarPeriodoDemoComHeader();
    updateMonthLabel();
}

function selecionarAno(anoStr) {
    if (typeof window.isTabDemonstrativoAtiva === 'function' && window.isTabDemonstrativoAtiva()) {
        if (typeof window.definirAnoUnicoDemoPeloHeader === 'function') {
            window.definirAnoUnicoDemoPeloHeader(parseInt(anoStr, 10));
        }
        return;
    }
    currentViewDate.setFullYear(parseInt(anoStr, 10));
    if (typeof window.sincronizarPeriodoDemoComHeader === 'function') window.sincronizarPeriodoDemoComHeader();
    updateMonthLabel();
}

function selecionarMesAtual() {
    currentViewDate = new Date();
    if (typeof window.sincronizarPeriodoDemoComHeader === 'function') window.sincronizarPeriodoDemoComHeader();
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
    if (tipo === 'Investimento') {
        alternarCampoNomePersonalizado(true);
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

    // Autocorreção transparente: se houver lançamentos ativos com nome de Salário/Receita cadastrados como Despesa, corrige para Receita
    let houveAutocorrecaoReceita = false;
    for (const m of movs) {
        if (isDescricaoReceita(m.descricao) && (m.tipo_gasto === 'Despesa Variável' || m.tipo_gasto === 'Despesa Fixa')) {
            m.tipo_gasto = 'Receita';
            m.sync_status = 'pending_update';
            m.updated_at = Date.now();
            dbLocal.movimentacoes.put(m).catch(e => console.warn('Erro ao autocorrigir:', e));
            houveAutocorrecaoReceita = true;
        }
    }
    if (houveAutocorrecaoReceita && typeof syncFinanceWithServer === 'function') {
        syncFinanceWithServer();
    }

    // Autocorreção transparente de Cartão Alimentação e Comprovante Ticket
    let houveAutocorrecaoAlim = false;
    let contasCadastradas = [];
    try {
        contasCadastradas = await dbLocal.contas_bancarias.toArray();
    } catch(e) {}
    const contasMap = new Map(contasCadastradas.map(c => [String(c.id), c]));

    for (const m of movs) {
        let mudou = false;
        const cAlvo = m.conta_id ? contasMap.get(String(m.conta_id)) : null;
        const isContaAlimentacao = cAlvo && cAlvo.tipo_conta === 'Cartão Alimentação';

        // Corrige texto de OCR corrompido de comprovante do Ticket Alimentação
        if (m.descricao && (/acesso\s+enera/i.test(m.descricao) || /enera\s+o\s+vuv/i.test(m.descricao))) {
            m.descricao = 'Supermercado / Alimentação (Ticket)';
            m.tipo_gasto = 'Cartão Alimentação';
            mudou = true;
        }

        // Se o lançamento estiver vinculado a uma conta de Cartão Alimentação, garante que o tipo seja 'Cartão Alimentação'
        if (isContaAlimentacao && m.tipo_gasto !== 'Cartão Alimentação') {
            m.tipo_gasto = 'Cartão Alimentação';
            mudou = true;
        }

        // Auto-correção para lançamento do Supermercado Guguy onde o OCR anterior extraiu o imposto federal (4,46) em vez do total da nota (37,35)
        const valorAbs = Math.abs(parseFloat(m.valor_total) || 0);
        if (Math.abs(valorAbs - 4.46) < 0.001) {
            const ehGuguy = (m.descricao && /guguy|supermercado/i.test(m.descricao)) ||
                            (m.midia_url && m.midia_url.length > 30) ||
                            isContaAlimentacao;
            if (ehGuguy) {
                const sinal = (m.valor_total < 0) ? -1 : 1;
                m.valor_total = sinal * 37.35;
                m.valor_realizado = sinal * 37.35;
                if (!m.descricao || /comprovante|despesa/i.test(m.descricao)) {
                    m.descricao = 'Supermercado Guguy';
                }
                mudou = true;
            }
        }

        if (mudou) {
            m.sync_status = 'pending_update';
            m.updated_at = Date.now();
            dbLocal.movimentacoes.put(m).catch(e => console.warn('Erro ao autocorrigir alim:', e));
            houveAutocorrecaoAlim = true;
        }
    }
    if (houveAutocorrecaoAlim && typeof syncFinanceWithServer === 'function') {
        syncFinanceWithServer();
    }

    const itensDoMes = [];
    const gruposFisicosNoMes = new Set();

    const targetYear = currentViewDate.getFullYear();
    const targetMonth = currentViewDate.getMonth();

    // Saldo histórico da Reserva de Emergência
    let reservaOrcadoTotal = 0;
    let reservaRealizadoTotal = 0;

    // 1ª Passagem: lançamentos físicos pertencentes ao mês atual
    movs.forEach(m => {
        // Regra especial para "Lista de Desejos": Se estiver Pendente, só aparece na Aba Desejos.
        if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
        
        // Regra especial para "Conta a Pagar": Nunca aparece no painel, é exclusivo da Gaveta
        if (m.tipo_gasto === 'Conta a Pagar') return;

        // Regra especial para "Planejamento Renda Extra": Exclusivo da Aba Planejamento de Rendas Extras
        if (m.tipo_gasto === 'Planejamento Renda Extra') return;

        // Se por acaso faltar a data, a gente ignora do calendário.
        if (!m.data_lancamento) return;

        const [year, month, day] = m.data_lancamento.split('-');
        const launchDate = new Date(year, parseInt(month) - 1, day);
        
        const effectiveMonth = launchDate.getMonth();
        const effectiveYear = launchDate.getFullYear();
        
        const diffMonths = (targetYear - effectiveYear) * 12 + (targetMonth - effectiveMonth);

        // Calcula o Saldo Acumulado da Reserva (Tudo que aconteceu ATÉ o mês atual)
        if (m.status !== 'Cancelado' && diffMonths >= 0) {
            const histOrcado = parseFloat(m.valor_total) || 0;
            const histRealizado = parseFloat(m.valor_realizado) || 0;
            
            // Tratamento especial para o histórico da reserva:
            // - Orçado (histOrcado) é a Meta da Reserva definida pelo usuário
            // - Realizado (histRealizado) é o que foi efetivamente Guardado
            if (isTipoReservaEmergencia(m)) {
                reservaOrcadoTotal += histOrcado;
                reservaRealizadoTotal += histRealizado;
            } else if (isTipoResgateReserva(m)) {
                reservaOrcadoTotal -= histOrcado;
                reservaRealizadoTotal -= histRealizado;
            }
        }

        if (diffMonths === 0) {
            itensDoMes.push({ ...m, isVirtual: false });
            if (m.id_grupo) gruposFisicosNoMes.add(m.id_grupo);
        }
    });

    // 2ª Passagem: projeta parcelas virtuais apenas para grupos que não possuem registro físico no mês
    movs.forEach(m => {
        if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
        if (m.tipo_gasto === 'Conta a Pagar') return;
        if (m.tipo_gasto === 'Planejamento Renda Extra') return;
        if (!m.data_lancamento) return;
        if (m.parcelado !== 'Sim' || !m.id_grupo) return;
        if (gruposFisicosNoMes.has(m.id_grupo)) return;

        const [year, month, day] = m.data_lancamento.split('-');
        const launchDate = new Date(year, parseInt(month) - 1, day);
        const effectiveMonth = launchDate.getMonth();
        const effectiveYear = launchDate.getFullYear();

        const diffMonths = (targetYear - effectiveYear) * 12 + (targetMonth - effectiveMonth);
        if (diffMonths > 0) {
            const novaParcela = parseInt(m.parcela_atual) + diffMonths;
            if (novaParcela <= parseInt(m.total_parcelas)) {
                gruposFisicosNoMes.add(m.id_grupo);
                const projM = { ...m, isVirtual: true };
                projM.parcela_atual = novaParcela;
                if (projM.status !== 'Cancelado') {
                    projM.status = 'Pendente'; 
                    const virtualDate = new Date(launchDate);
                    virtualDate.setMonth(virtualDate.getMonth() + diffMonths);
                    projM.data_lancamento = virtualDate.toISOString().split('T')[0];
                    itensDoMes.push(projM);
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
        if (item.tipo_gasto === 'Transferência Interna' || item.tipo_gasto === 'Transferência') return;
        if (item.tipo_gasto === 'Cartão Alimentação') return; // Benefício isolado: debita apenas do saldo do cartão alimentação, nunca do orçamento/salário

        const vOrcado = parseFloat(item.valor_total) || 0;
        const vRealizado = parseFloat(item.valor_realizado) || 0;

        if (isTipoResgateReserva(item) || item.tipo_gasto === 'Receita') {
            // Resgate entra como "Receita" do mês para cobrir o buraco
            recOrcado += vOrcado; 
            recRealizado += vRealizado; 
        } else if (item.tipo_gasto === 'Investimento') {
            // Investimento tem seu totalizador próprio e isolado
            invOrcado += vOrcado;
            invRealizado += vRealizado;
        } else if (isTipoReservaEmergencia(item)) {
            // Reserva de Emergência tem seu totalizador próprio e isolado (Orçado = Meta / Realizado = Guardado)
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
    
    // Formatação monetária com exibição explícita do sinal negativo "- R$ X,XX"
    const formatCurrencySigned = (val) => {
        if (window.privacyMode) return '•••••';
        const num = Number(val) || 0;
        if (num < -0.005) {
            return '- R$ ' + Math.abs(num).toFixed(2).replace('.', ',');
        }
        return 'R$ ' + Math.abs(num).toFixed(2).replace('.', ',');
    };
    
    // Identifica se há déficit / saldo negativo no mês:
    // 1) Se as despesas já realizadas superam as receitas: saldoRealizado < 0
    // 2) Se há despesas orçadas mas nenhuma receita (ou receitas insuficientes): saldoRealizado <= 0 e saldoOrcado < 0
    const isNegativo = (saldoRealizado < -0.005) || (saldoRealizado <= 0.005 && saldoOrcado < -0.005);

    // Atualiza o Rótulo Dinâmico: "Saldo Negativo" se houver déficit, ou "Saldo Livre" se positivo
    const elLblSaldo = document.getElementById('lblSaldoResumo') || document.querySelector('.saldo-livre-label');
    if (elLblSaldo) {
        if (isNegativo) {
            elLblSaldo.innerText = 'Saldo Negativo';
            elLblSaldo.classList.add('is-negativo');
            elLblSaldo.classList.remove('is-positivo');
            elLblSaldo.style.setProperty('color', '#EF4444', 'important');
        } else if (saldoRealizado > 0.005) {
            elLblSaldo.innerText = 'Saldo Livre';
            elLblSaldo.classList.add('is-positivo');
            elLblSaldo.classList.remove('is-negativo');
            elLblSaldo.style.setProperty('color', '#10B981', 'important');
        } else {
            elLblSaldo.innerText = 'Saldo Livre';
            elLblSaldo.classList.remove('is-negativo', 'is-positivo');
            elLblSaldo.style.setProperty('color', 'var(--color-brand, #3B82F6)', 'important');
        }
    }

    // Orçado
    const elOrcado = document.getElementById('valSaldoOrcado');
    if (elOrcado) {
        elOrcado.innerText = formatCurrencySigned(saldoOrcado);
        if (saldoOrcado < -0.005) {
            elOrcado.classList.add('is-negativo');
            elOrcado.classList.remove('is-positivo');
            elOrcado.style.setProperty('color', '#EF4444', 'important');
        } else if (saldoOrcado > 0.005) {
            elOrcado.classList.add('is-positivo');
            elOrcado.classList.remove('is-negativo');
            elOrcado.style.setProperty('color', '#10B981', 'important');
        } else {
            elOrcado.classList.remove('is-negativo', 'is-positivo');
            elOrcado.style.setProperty('color', 'var(--text-secondary, #94A3B8)', 'important');
        }
    }

    // Realizado
    const elRealizado = document.getElementById('valSaldoRealizado');
    if (elRealizado) {
        elRealizado.innerText = formatCurrencySigned(saldoRealizado);
        if (saldoRealizado < -0.005) {
            elRealizado.classList.add('is-negativo');
            elRealizado.classList.remove('is-positivo');
            elRealizado.style.setProperty('color', '#EF4444', 'important');
        } else if (saldoRealizado > 0.005) {
            elRealizado.classList.add('is-positivo');
            elRealizado.classList.remove('is-negativo');
            elRealizado.style.setProperty('color', '#10B981', 'important');
        } else {
            elRealizado.classList.remove('is-negativo', 'is-positivo');
            elRealizado.style.setProperty('color', 'var(--text-secondary, #94A3B8)', 'important');
        }
    }

    const elHero = document.getElementById('valSaldoHero');
    if (elHero) {
        elHero.innerText = formatCurrencySigned(saldoRealizado);
        elHero.style.setProperty('color', saldoRealizado < -0.005 ? '#EF4444' : (saldoRealizado > 0.005 ? '#10B981' : 'var(--text-secondary, #94A3B8)'), 'important');
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
    window._cacheContasMap = new Map(contasBancarias.map(c => [String(c.id), c]));
    const pendentesParaExibir = itensDoMes.filter(item => (item.status === 'Pendente' || item.status === 'Cancelado') && item.tipo_gasto !== 'Cartão de Crédito' && item.tipo_gasto !== 'Transferência Interna');
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
        } else if (isTipoResgateReserva(item)) {
            borderLeftColor = '#10B981';
            tagTipo = '<span class="badge" style="background:rgba(16,185,129,0.15); color:#34D399; margin-left:6px;">💰 Resgate</span>';
        } else if (isTipoReservaEmergencia(item)) {
            borderLeftColor = '#F59E0B';
            tagTipo = '<span class="badge" style="background:rgba(245,158,11,0.2); color:#F59E0B; margin-left:6px;">🛡️ Reserva</span>';
        } else if (item.tipo_gasto === 'Investimento') {
            borderLeftColor = '#8B5CF6';
            tagTipo = '<span class="badge" style="background:rgba(139,92,246,0.2); color:#A78BFA; margin-left:6px;">📈 Investimento</span>';
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

        let tagMeioPagamento = '';
        if (item.conta_id === 'DINHEIRO') {
            tagMeioPagamento = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10B981; margin-left:4px;">💵 Dinheiro</span>`;
        } else if (item.conta_id && item.conta_id !== '1' && window._cacheContasMap) {
            const cObj = window._cacheContasMap.get(String(item.conta_id));
            if (cObj) {
                const nCurto = (cObj.nome_conta || cObj.banco || 'Conta').replace(/\b(Conta\s+Corrente|Conta\s+Poupan[cç]a|Cart[aã]o\s+Alimenta[cç][aã]o|Cart[aã]o\s+de\s+Cr[eé]dito)\b/gi, '').trim();
                const titCurto = cObj.titular ? ` • ${cObj.titular}` : '';
                tagMeioPagamento = `<span class="badge" style="background:rgba(59,130,246,0.15); color:#3B82F6; margin-left:4px;">🏦 ${nCurto}${titCurto}</span>`;
            }
        }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <div class="card-details">
                    <h4 style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">${item.descricao} ${tagTipo} ${tagMeioPagamento} ${tagCancelado}</h4>
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
    const tipo = document.getElementById('inputTipoGasto') ? document.getElementById('inputTipoGasto').value : '';
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

    // Adaptação dos campos de Prazo de Início e Prazo Final para Reserva e Investimentos
    const lblInputData = document.getElementById('lblInputData');
    const lblInputRecorrencia = document.getElementById('lblInputRecorrencia');
    const lblInputDataFim = document.getElementById('lblInputDataFim');
    const selectRec = document.getElementById('inputRecorrencia');
    const divDataFim = document.getElementById('divDataFim');
    const inputDataFim = document.getElementById('inputDataFim');
    const inputData = document.getElementById('inputData');
    const boxMetaPrazos = document.getElementById('boxMetaPrazosAviso');
    const rowParcelado = document.getElementById('rowParcelado');

    const isMetaComPrazo = (tipo === 'Investimento' || tipo === 'Reserva de Emergência');

    if (isMetaComPrazo) {
        if (lblInputData) {
            lblInputData.innerHTML = tipo === 'Investimento' 
                ? '📅 Prazo de Início (Investimento)' 
                : '📅 Prazo de Início (Meta da Reserva)';
            lblInputData.style.color = tipo === 'Investimento' ? '#C084FC' : '#FBBF24';
        }
        if (lblInputRecorrencia) {
            lblInputRecorrencia.innerText = '🎯 Planejamento de Prazo / Meta';
            lblInputRecorrencia.style.color = tipo === 'Investimento' ? '#C084FC' : '#FBBF24';
        }
        if (lblInputDataFim) {
            lblInputDataFim.innerText = '🏁 Prazo Final (Mês/Ano Final)';
            lblInputDataFim.style.color = '#34D399';
        }

        if (selectRec) {
            const valAntigo = selectRec.value;
            selectRec.innerHTML = `
                <option value="DataFinal">🏁 Definir Prazo Final (Início e Fim)</option>
                <option value="Continua">🔄 Contínua (Aporte mensal sem término)</option>
                <option value="Unica">1️⃣ Aporte Único (Apenas no início)</option>
            `;
            // Se for criação de novo lançamento e ainda não estava selecionado, definir como DataFinal
            const idAtual = document.getElementById('inputIdMovimentacao') ? document.getElementById('inputIdMovimentacao').value : '';
            if (!idAtual && valAntigo !== 'Continua' && valAntigo !== 'Unica') {
                selectRec.value = 'DataFinal';
            } else if (valAntigo) {
                selectRec.value = valAntigo;
            }
        }

        // Sugerir prazo final padrão se vazio (ex: 6 meses a partir da data de início)
        if (divDataFim && selectRec && selectRec.value === 'DataFinal') {
            divDataFim.style.display = 'block';
            if (inputDataFim && !inputDataFim.value && inputData && inputData.value) {
                const [anoIni, mesIni] = inputData.value.split('-').map(Number);
                const dtSugerida = new Date(anoIni, mesIni - 1 + 5, 1); // 6 meses
                const aSug = dtSugerida.getFullYear();
                const mSug = String(dtSugerida.getMonth() + 1).padStart(2, '0');
                inputDataFim.value = `${aSug}-${mSug}`;
            }
        } else if (divDataFim && selectRec) {
            divDataFim.style.display = selectRec.value === 'DataFinal' ? 'block' : 'none';
        }

        // Para metas de investimento e reserva, esconder parcelamento para não confundir
        if (rowParcelado) {
            rowParcelado.style.display = 'none';
        }

        atualizarAvisoMetaPrazos();
    } else {
        // Restaura modo padrão
        if (lblInputData) {
            lblInputData.innerText = 'Data';
            lblInputData.style.color = '#94A3B8';
        }
        if (lblInputRecorrencia) {
            lblInputRecorrencia.innerText = 'Recorrência (Mensal)';
            lblInputRecorrencia.style.color = '#94A3B8';
        }
        if (lblInputDataFim) {
            lblInputDataFim.innerText = 'Até qual mês/ano?';
            lblInputDataFim.style.color = '#94A3B8';
        }
        if (selectRec) {
            const valAntigo = selectRec.value;
            selectRec.innerHTML = `
                <option value="Unica">Única (Não se repete)</option>
                <option value="Continua">Contínua (Repete todo mês)</option>
                <option value="DataFinal">Repetir até uma data</option>
            `;
            selectRec.value = (valAntigo === 'DataFinal' || valAntigo === 'Continua' || valAntigo === 'Unica') ? valAntigo : 'Unica';
        }
        if (rowParcelado) {
            rowParcelado.style.display = 'flex';
        }
        if (boxMetaPrazos) {
            boxMetaPrazos.style.display = 'none';
        }
        if (divDataFim && selectRec) {
            divDataFim.style.display = selectRec.value === 'DataFinal' ? 'block' : 'none';
        }
    }
}

function atualizarAvisoMetaPrazos() {
    const boxMetaPrazos = document.getElementById('boxMetaPrazosAviso');
    if (!boxMetaPrazos) return;

    const tipo = document.getElementById('inputTipoGasto') ? document.getElementById('inputTipoGasto').value : '';
    const isMetaComPrazo = (tipo === 'Investimento' || tipo === 'Reserva de Emergência');
    if (!isMetaComPrazo) {
        boxMetaPrazos.style.display = 'none';
        return;
    }

    const selectRec = document.getElementById('inputRecorrencia');
    const recVal = selectRec ? selectRec.value : '';
    const inputData = document.getElementById('inputData');
    const inputDataFim = document.getElementById('inputDataFim');

    const corTema = tipo === 'Investimento' ? '#8B5CF6' : '#F59E0B';
    const bgTema = tipo === 'Investimento' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)';
    const bordaTema = tipo === 'Investimento' ? 'rgba(139, 92, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)';
    const icone = tipo === 'Investimento' ? '📈' : '🛡️';
    const tituloTipo = tipo === 'Investimento' ? 'Investimento' : 'Reserva de Emergência';

    boxMetaPrazos.style.background = bgTema;
    boxMetaPrazos.style.border = `1.5px solid ${bordaTema}`;

    if (recVal === 'DataFinal') {
        const dataIni = inputData ? inputData.value : '';
        const dataFim = inputDataFim ? inputDataFim.value : '';

        if (dataIni && dataFim) {
            const [yIni, mIni, dIni] = dataIni.split('-').map(Number);
            const [yFim, mFim] = dataFim.split('-').map(Number);
            const diffMeses = (yFim - yIni) * 12 + (mFim - mIni) + 1;
            const qtdMeses = Math.max(1, diffMeses);

            boxMetaPrazos.innerHTML = `
                <div style="font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span>${icone}</span>
                    <span>Prazo da Meta de ${tituloTipo}: <strong>${qtdMeses} ${qtdMeses === 1 ? 'mês' : 'meses'} de duração</strong></span>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.8rem; margin-top: 4px;">
                    <span style="color: #94A3B8;">📅 Início: <strong style="color: #60A5FA;">${String(dIni).padStart(2,'0')}/${String(mIni).padStart(2,'0')}/${yIni}</strong></span>
                    <span style="color: #94A3B8;">🏁 Prazo Final: <strong style="color: #34D399;">${String(mFim).padStart(2,'0')}/${yFim}</strong></span>
                </div>
                <div style="font-size: 0.74rem; color: #CBD5E1; margin-top: 6px; line-height: 1.35;">
                    ℹ️ Os lançamentos mensais de aporte serão gerados automaticamente no seu planejamento durante todo o período programado.
                </div>
            `;
            boxMetaPrazos.style.display = 'block';
        } else {
            boxMetaPrazos.innerHTML = `
                <div style="color: #FBBF24; font-weight: 600;">
                    ${icone} Informe a Data Inicial e o Mês/Ano Final para calcularmos o prazo da sua meta.
                </div>
            `;
            boxMetaPrazos.style.display = 'block';
        }
    } else if (recVal === 'Continua') {
        boxMetaPrazos.innerHTML = `
            <div style="color: #93C5FD; font-weight: 600;">
                🔄 <strong>Meta Contínua:</strong> O aporte de ${tituloTipo} será repetido mensalmente sem prazo final estipulado.
            </div>
        `;
        boxMetaPrazos.style.display = 'block';
    } else {
        boxMetaPrazos.innerHTML = `
            <div style="color: #94A3B8; font-weight: 600;">
                1️⃣ <strong>Aporte Único:</strong> O valor será registrado exclusivamente no mês da Data de Início informada.
            </div>
        `;
        boxMetaPrazos.style.display = 'block';
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

function alternarCampoNomePersonalizado(forcarAbrir) {
    const sel = document.getElementById('selectCategoriaPredefinida');
    const inpCustom = document.getElementById('inputDescricaoPersonalizada');
    const btn = document.getElementById('btnAlternarNomeCustom');
    if (!inpCustom) return;

    const deveAbrir = (forcarAbrir !== undefined) ? forcarAbrir : (inpCustom.style.display === 'none');

    if (deveAbrir) {
        inpCustom.style.display = 'block';
        if (sel) sel.style.display = 'none';
        if (btn) btn.innerHTML = '<span>📋</span> Ver Lista';
        inpCustom.focus();
    } else {
        inpCustom.style.display = 'none';
        if (sel) sel.style.display = 'block';
        if (btn) {
            const tipo = document.getElementById('inputTipoGasto') ? document.getElementById('inputTipoGasto').value : '';
            btn.innerHTML = (tipo === 'Investimento') ? '<span>✏️</span> Nome do Investimento' : '<span>✏️</span> Digitar Nome';
        }
    }
}
window.alternarCampoNomePersonalizado = alternarCampoNomePersonalizado;

function renderizarSelectCategorias() {
    const sel = document.getElementById('selectCategoriaPredefinida');
    const dlist = document.getElementById('listaCategoriasDescricao');
    if (!sel && !dlist) return;

    const lista = obterCategoriasCustomizadas();

    if (sel) {
        const valAtual = sel.value;
        sel.innerHTML = '<option value="">📋 Escolha da lista (Salário, Luz, Água, Celular...)</option>' +
            lista.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
            '<option value="__DIGITAR_NOVO__">✏️ + Digitar outro nome personalizado...</option>';
        if (valAtual && lista.includes(valAtual)) {
            sel.value = valAtual;
        }
    }

    if (dlist) {
        dlist.innerHTML = lista.map(cat => `<option value="${cat}">`).join('');
    }
}

function aoSelecionarCategoriaPredefinida(val) {
    if (val === '__DIGITAR_NOVO__') {
        alternarCampoNomePersonalizado(true);
        const sel = document.getElementById('selectCategoriaPredefinida');
        if (sel) sel.value = '';
        return;
    }
    const inp = document.getElementById('inputDescricao');
    if (inp) inp.value = val || '';
    if (val && typeof val === 'string') {
        const lower = val.toLowerCase();
        const selTipo = document.getElementById('inputTipoGasto');
        if (selTipo) {
            if (isDescricaoReceita(val)) {
                selTipo.value = 'Receita';
            } else if (lower.includes('reserva de emerg') || lower.includes('reserva')) {
                selTipo.value = 'Reserva de Emergência';
            } else if (lower.includes('resgate')) {
                selTipo.value = 'Resgate de Reserva';
            } else if (lower.includes('investimento') || lower.includes('ações') || lower.includes('fundo') || lower.includes('tesouro')) {
                selTipo.value = 'Investimento';
            } else if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('fatura') || lower.includes('crédito') || lower.includes('credito')) {
                selTipo.value = 'Cartão de Crédito';
            } else if (lower.includes('aluguel') || lower.includes('condomínio') || lower.includes('condominio') || lower.includes('internet') || lower.includes('assinatura') || lower.includes('streaming') || lower.includes('celular') || lower.includes('telefone') || lower.includes('plano') || lower.includes('escola') || lower.includes('faculdade') || lower.includes('curso') || lower.includes('empréstimo') || lower.includes('financiamento')) {
                selTipo.value = 'Despesa Fixa';
            } else if (lower.includes('luz') || lower.includes('água') || lower.includes('agua') || lower.includes('mercado') || lower.includes('supermercado') || lower.includes('alimentação') || lower.includes('combustível') || lower.includes('combustivel') || lower.includes('farmácia') || lower.includes('farmacia') || lower.includes('saúde') || lower.includes('lazer')) {
                selTipo.value = 'Despesa Variável';
            }
            if (typeof aoMudarTipoGastoLancamento === 'function') {
                aoMudarTipoGastoLancamento(selTipo.value);
            } else if (typeof atualizarTextoStatus === 'function') {
                atualizarTextoStatus();
            }
        }
    }
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
        container.innerHTML = '<div style="text-align: center; color: #64748B; padding: 20px 0; font-size: 0.85rem;">Nenhuma descrição cadastrada. Clique acima para cadastrar ou restaurar os padrões.</div>';
        return;
    }

    container.innerHTML = lista.map((cat, idx) => `
        <div class="item-gerenciar-card">
            <div class="item-gerenciar-titulo">
                ${cat}
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
                <button type="button" onclick="iniciarEdicaoCategoria(${idx})" class="btn-gerenciar-item-edit" title="Editar nome">
                    <span>✏️</span> Editar
                </button>
                <button type="button" onclick="excluirCategoriaCustomizada(${idx})" class="btn-gerenciar-item-delete" title="Excluir este item">
                    <span>🗑️</span> Excluir
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
        showToast('Digite a descrição/categoria (ex: Internet, Luz...).');
        inputNova.focus();
        return;
    }

    let lista = obterCategoriasCustomizadas();

    if (indiceCategoriaEmEdicao >= 0 && indiceCategoriaEmEdicao < lista.length) {
        lista[indiceCategoriaEmEdicao] = nome;
        salvarCategoriasCustomizadas(lista);
        cancelarEdicaoCategoria();
        showToast(`"${nome}" atualizada com sucesso!`);
    } else {
        const jaExiste = lista.some(item => item.toLowerCase() === nome.toLowerCase());
        if (jaExiste) {
            showToast(`"${nome}" já está cadastrada.`);
            inputNova.focus();
            return;
        }
        lista.push(nome);
        salvarCategoriasCustomizadas(lista);
        inputNova.value = '';
        inputNova.focus();
        showToast(`"${nome}" cadastrada com sucesso!`);
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
    if (lbl) lbl.innerHTML = `✏️ Editando: <span style="color: #FCD34D;">${lista[idx]}</span>`;
    if (btnSalvar) btnSalvar.innerHTML = '<span>💾</span> Salvar Alteração';
    if (btnCanc) btnCanc.style.display = 'block';
}

function cancelarEdicaoCategoria() {
    indiceCategoriaEmEdicao = -1;
    const inputNova = document.getElementById('inputNovaCategoria');
    const lbl = document.getElementById('lblFormGerenciarCategoria');
    const btnSalvar = document.getElementById('btnSalvarCategoria');
    const btnCanc = document.getElementById('btnCancelarEdicaoCategoria');

    if (inputNova) inputNova.value = '';
    if (lbl) lbl.innerHTML = '➕ Cadastrar Nova Descrição / Categoria:';
    if (btnSalvar) btnSalvar.innerHTML = '<span>➕</span> Inserir Novo Item';
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
    showToast(`"${nome}" removida!`);
}

function restaurarCategoriasPadrao() {
    if (!confirm('Deseja restaurar a lista original de descrições padrão do sistema?')) return;
    salvarCategoriasCustomizadas([...CATEGORIAS_PADRAO_SISTEMA]);
    cancelarEdicaoCategoria();
    showToast('Lista de descrições padrão restaurada!');
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
// GERENCIADOR DE TIPOS DE MOVIMENTAÇÃO (CUSTOMIZÁVEIS PELO USUÁRIO)
// ==================================================================
const TIPOS_GASTO_PADRAO_SISTEMA = [
    // Despesas
    "Despesa Variável",
    "Despesa Fixa",
    "Cartão de Crédito",
    "Cartão Alimentação",
    "Conta a Pagar",
    "Empréstimo",
    "Lista de Desejos",
    // Receitas
    "Receita",
    "Planejamento Renda Extra",
    "Resgate de Reserva",
    // Investimentos & Reservas
    "Investimento",
    "Reserva de Emergência"
];

let indiceTipoGastoEmEdicao = -1;

function normalizarTipoGastoCanonico(t) {
    if (!t || typeof t !== 'string') return '';
    const v = t.trim();
    const low = v.toLowerCase();
    if (low.startsWith('resgate de reserva')) return 'Resgate de Reserva';
    if (low.startsWith('reserva de emerg')) return 'Reserva de Emergência';
    if (low.startsWith('conta a pagar')) return 'Conta a Pagar';
    if (low === 'renda extra' || low.startsWith('planejamento renda extra')) return 'Planejamento Renda Extra';
    if (low.startsWith('cartão alimentação') || low.startsWith('cartao alimentacao')) return 'Cartão Alimentação';
    if (low.startsWith('cartão de crédito') || low.startsWith('cartao de credito')) return 'Cartão de Crédito';
    return v;
}

function obterTiposGastoCustomizados() {
    let lista = [...TIPOS_GASTO_PADRAO_SISTEMA];
    try {
        const salvas = localStorage.getItem('finance_tipos_gasto_custom');
        if (salvas) {
            const parsed = JSON.parse(salvas);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const setTipos = new Set();
                parsed.forEach(item => {
                    const norm = normalizarTipoGastoCanonico(item);
                    if (norm) setTipos.add(norm);
                });
                TIPOS_GASTO_PADRAO_SISTEMA.forEach(t => setTipos.add(t));
                lista = Array.from(setTipos);
                // Persiste lista limpa caso houvesse duplicatas antigas
                if (lista.length !== parsed.length) {
                    localStorage.setItem('finance_tipos_gasto_custom', JSON.stringify(lista));
                }
            }
        }
    } catch (e) {
        console.error('Erro ao ler tipos de movimentação do localStorage:', e);
    }
    return lista;
}

function salvarTiposGastoCustomizados(lista) {
    const limpa = Array.from(new Set((lista || []).map(normalizarTipoGastoCanonico).filter(Boolean)));
    try {
        localStorage.setItem('finance_tipos_gasto_custom', JSON.stringify(limpa));
    } catch (e) {
        console.error('Erro ao salvar tipos de movimentação:', e);
    }
    renderizarSelectTiposGasto();
    renderizarListaGerenciarTiposGasto();
}

function renderizarSelectTiposGasto() {
    const sel = document.getElementById('inputTipoGasto');
    if (!sel) return;
    const lista = obterTiposGastoCustomizados();
    const valAtual = normalizarTipoGastoCanonico(sel.value);

    const grupos = {
        '💸 Despesas': [
            'Despesa Variável', 'Despesa Fixa', 'Cartão de Crédito', 
            'Cartão Alimentação', 'Conta a Pagar', 
            'Empréstimo', 'Lista de Desejos'
        ],
        '💰 Receitas': [
            'Receita', 'Planejamento Renda Extra', 
            'Resgate de Reserva'
        ],
        '📈 Investimentos & Reservas': [
            'Investimento', 'Reserva de Emergência'
        ]
    };

    let html = '';
    const tiposAlocados = new Set();
    const labelsUsados = new Set();

    for (const [nomeGrupo, itensGrupo] of Object.entries(grupos)) {
        const itensPresentes = lista.filter(t => itensGrupo.includes(t));
        if (itensPresentes.length > 0) {
            html += `<optgroup label="${nomeGrupo}">`;
            itensPresentes.forEach(t => {
                tiposAlocados.add(t);
                let label = t;
                if (t === 'Cartão Alimentação') label = '🍽️ Cartão Alimentação';
                else if (t === 'Cartão de Crédito') label = '💳 Cartão de Crédito';
                else if (t === 'Conta a Pagar') label = '📂 Conta a Pagar';
                else if (t === 'Planejamento Renda Extra') label = '⚡ Renda Extra';
                else if (t === 'Resgate de Reserva') label = '🔓 Resgate de Reserva';
                else if (t === 'Reserva de Emergência') label = '🛡️ Reserva de Emergência';
                else if (t === 'Investimento') label = '📈 Investimento';
                else if (t === 'Receita') label = '💰 Receita';
                else if (t === 'Despesa Fixa') label = '📌 Despesa Fixa';
                else if (t === 'Despesa Variável') label = '🛒 Despesa Variável';
                else if (t === 'Empréstimo') label = '🤝 Empréstimo';
                else if (t === 'Lista de Desejos') label = '🎁 Lista de Desejos';

                if (!labelsUsados.has(label)) {
                    labelsUsados.add(label);
                    html += `<option value="${t}">${label}</option>`;
                }
            });
            html += `</optgroup>`;
        }
    }

    const outros = lista.filter(t => !tiposAlocados.has(t));
    if (outros.length > 0) {
        html += `<optgroup label="✨ Outros Tipos Customizados">`;
        outros.forEach(t => {
            if (!labelsUsados.has(t)) {
                labelsUsados.add(t);
                html += `<option value="${t}">${t}</option>`;
            }
        });
        html += `</optgroup>`;
    }

    sel.innerHTML = html;
    if (valAtual && lista.includes(valAtual)) {
        sel.value = valAtual;
    } else if (lista.length > 0) {
        sel.value = lista[0];
    }
}

function abrirModalGerenciarTiposGasto() {
    indiceTipoGastoEmEdicao = -1;
    const inputNovo = document.getElementById('inputNovoTipoGasto');
    const lbl = document.getElementById('lblFormGerenciarTipoGasto');
    const btnSalvar = document.getElementById('btnSalvarTipoGasto');
    const btnCanc = document.getElementById('btnCancelarEdicaoTipoGasto');
    
    if (inputNovo) inputNovo.value = '';
    if (lbl) lbl.innerHTML = '➕ Cadastrar Novo Tipo de Movimentação:';
    if (btnSalvar) btnSalvar.innerHTML = '<span>➕</span> Inserir Novo Tipo';
    if (btnCanc) btnCanc.style.display = 'none';

    renderizarListaGerenciarTiposGasto();

    const m = document.getElementById('modalGerenciarTiposGasto');
    if (m) {
        m.style.display = 'flex';
        if (inputNovo) setTimeout(() => inputNovo.focus(), 100);
    }
}
window.abrirModalGerenciarTiposGasto = abrirModalGerenciarTiposGasto;

function fecharModalGerenciarTiposGasto() {
    const m = document.getElementById('modalGerenciarTiposGasto');
    if (m) m.style.display = 'none';
}
window.fecharModalGerenciarTiposGasto = fecharModalGerenciarTiposGasto;

function renderizarListaGerenciarTiposGasto() {
    const container = document.getElementById('listaTiposGastoGerenciar');
    const countEl = document.getElementById('countTiposGasto');
    if (!container) return;

    const lista = obterTiposGastoCustomizados();
    if (countEl) countEl.innerText = lista.length;

    if (lista.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748B; padding: 20px 0; font-size: 0.85rem;">Nenhum tipo cadastrado. Clique acima para cadastrar ou restaurar os padrões.</div>';
        return;
    }

    container.innerHTML = lista.map((tipo, idx) => `
        <div class="item-gerenciar-card">
            <div class="item-gerenciar-titulo">
                ${tipo}
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
                <button type="button" onclick="iniciarEdicaoTipoGasto(${idx})" class="btn-gerenciar-item-edit" title="Editar nome">
                    <span>✏️</span> Editar
                </button>
                <button type="button" onclick="excluirTipoGastoCustomizado(${idx})" class="btn-gerenciar-item-delete" title="Excluir este tipo">
                    <span>🗑️</span> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function salvarNovoOuEditadoTipoGasto() {
    const inputNovo = document.getElementById('inputNovoTipoGasto');
    if (!inputNovo) return;
    const nome = inputNovo.value.trim();
    if (!nome) {
        showToast('Digite o nome do tipo de movimentação.');
        inputNovo.focus();
        return;
    }

    let lista = obterTiposGastoCustomizados();

    if (indiceTipoGastoEmEdicao >= 0 && indiceTipoGastoEmEdicao < lista.length) {
        lista[indiceTipoGastoEmEdicao] = nome;
        salvarTiposGastoCustomizados(lista);
        cancelarEdicaoTipoGasto();
        showToast(`Tipo "${nome}" atualizado com sucesso!`);
    } else {
        const jaExiste = lista.some(item => item.toLowerCase() === nome.toLowerCase());
        if (jaExiste) {
            showToast(`O tipo "${nome}" já está cadastrado.`);
            inputNovo.focus();
            return;
        }
        lista.push(nome);
        salvarTiposGastoCustomizados(lista);
        inputNovo.value = '';
        inputNovo.focus();
        showToast(`Tipo "${nome}" cadastrado com sucesso!`);
    }
}
window.salvarNovoOuEditadoTipoGasto = salvarNovoOuEditadoTipoGasto;

function iniciarEdicaoTipoGasto(idx) {
    const lista = obterTiposGastoCustomizados();
    if (idx < 0 || idx >= lista.length) return;
    
    indiceTipoGastoEmEdicao = idx;
    const inputNovo = document.getElementById('inputNovoTipoGasto');
    const lbl = document.getElementById('lblFormGerenciarTipoGasto');
    const btnSalvar = document.getElementById('btnSalvarTipoGasto');
    const btnCanc = document.getElementById('btnCancelarEdicaoTipoGasto');

    if (inputNovo) {
        inputNovo.value = lista[idx];
        inputNovo.focus();
    }
    if (lbl) lbl.innerHTML = `✏️ Editando: <span style="color:#F8FAFC;">${lista[idx]}</span>`;
    if (btnSalvar) btnSalvar.innerHTML = '<span>💾</span> Salvar Alteração';
    if (btnCanc) btnCanc.style.display = 'block';
}
window.iniciarEdicaoTipoGasto = iniciarEdicaoTipoGasto;

function cancelarEdicaoTipoGasto() {
    indiceTipoGastoEmEdicao = -1;
    const inputNovo = document.getElementById('inputNovoTipoGasto');
    const lbl = document.getElementById('lblFormGerenciarTipoGasto');
    const btnSalvar = document.getElementById('btnSalvarTipoGasto');
    const btnCanc = document.getElementById('btnCancelarEdicaoTipoGasto');

    if (inputNovo) inputNovo.value = '';
    if (lbl) lbl.innerHTML = '➕ Cadastrar Novo Tipo de Movimentação:';
    if (btnSalvar) btnSalvar.innerHTML = '<span>➕</span> Inserir Novo Tipo';
    if (btnCanc) btnCanc.style.display = 'none';
}
window.cancelarEdicaoTipoGasto = cancelarEdicaoTipoGasto;

function excluirTipoGastoCustomizado(idx) {
    let lista = obterTiposGastoCustomizados();
    if (idx < 0 || idx >= lista.length) return;
    const itemNome = lista[idx];

    if (!confirm(`Tem certeza de que deseja excluir o tipo "${itemNome}"?`)) return;

    if (indiceTipoGastoEmEdicao === idx) {
        cancelarEdicaoTipoGasto();
    }
    lista.splice(idx, 1);
    salvarTiposGastoCustomizados(lista);
    showToast(`Tipo "${itemNome}" excluído.`);
}
window.excluirTipoGastoCustomizado = excluirTipoGastoCustomizado;

function restaurarTiposGastoPadrao() {
    if (!confirm('Deseja restaurar a lista padrão de tipos de movimentação do sistema?')) return;
    cancelarEdicaoTipoGasto();
    salvarTiposGastoCustomizados([...TIPOS_GASTO_PADRAO_SISTEMA]);
    showToast('Tipos de movimentação restaurados para o padrão.');
}
window.restaurarTiposGastoPadrao = restaurarTiposGastoPadrao;
window.renderizarSelectTiposGasto = renderizarSelectTiposGasto;

// ==================================================================
// SISTEMA DE MÁSCARA MONETÁRIA BRASILEIRA (R$ COM PONTUAÇÃO DINÂMICA)
// ==================================================================
function desformatarMoedaInput(valorStr) {
    if (typeof valorStr === 'number') return isNaN(valorStr) ? 0 : valorStr;
    if (!valorStr) return 0;
    let str = String(valorStr).trim();
    if (!str) return 0;
    const isNeg = str.includes('-');

    // Caso 1: String com formatação brasileira (possui vírgula para centavos, ex: "R$ 1.000,00", "1.000,00", "10,00", "0,50")
    if (str.includes(',')) {
        const parts = str.split(',');
        const inteiros = parts[0].replace(/\D/g, '') || '0';
        const centavos = (parts[1] || '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
        const val = parseFloat(`${inteiros}.${centavos}`) || 0;
        return isNeg ? -val : val;
    }

    // Caso 2: String com ponto decimal ou de milhar (ex: "1000.50" ou "1.000")
    if (str.includes('.')) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount === 1) {
            const parts = str.split('.');
            // Se tiver exatamente 3 dígitos após o ponto e parte inteira maior que 0, é separador de milhar (ex: "1.000")
            if (parts[1].length === 3 && parseInt(parts[0], 10) > 0) {
                const val = parseInt(str.replace(/\D/g, ''), 10) || 0;
                return isNeg ? -val : val;
            }
            // Caso contrário, é ponto decimal padrão (ex: "1000.50", "10.5")
            const val = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
            return isNeg ? -val : val;
        } else {
            // Mais de 1 ponto (ex: "1.000.000") -> milhar
            const val = parseInt(str.replace(/\D/g, ''), 10) || 0;
            return isNeg ? -val : val;
        }
    }

    // Caso 3: String contendo apenas dígitos numéricos inteiros (ex: "1000", "50", "200")
    // Se o usuário digitou sem pontuação nem centavos, é o valor integral em Reais (NÃO dividir por 100!)
    const digitos = str.replace(/\D/g, '');
    if (!digitos) return 0;
    const val = parseInt(digitos, 10) || 0;
    return isNeg ? -val : val;
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
    const isNeg = num < 0;
    const absVal = Math.abs(num);
    input.value = (isNeg ? '-R$ ' : 'R$ ') + absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (input.id === 'contaSaldo') {
        input.dataset.sinalNegativo = isNeg ? 'true' : 'false';
        input.style.color = isNeg ? '#EF4444' : '#10B981';
        if (typeof atualizarBotoesSinalSaldo === 'function') {
            atualizarBotoesSinalSaldo(isNeg);
        }
    }
}

function aplicarMascaraMoedaEmElemento(input) {
    if (!input || input.dataset.maskMoedaAtiva === 'true') return;
    input.dataset.maskMoedaAtiva = 'true';

    input.addEventListener('input', () => {
        const permiteNegativo = input.id === 'contaSaldo';
        let isNeg = permiteNegativo && (input.dataset.sinalNegativo === 'true' || input.value.includes('-'));

        let digitos = input.value.replace(/\D/g, '');
        if (!digitos) {
            input.value = '';
            return;
        }
        let centavos = parseInt(digitos, 10);
        if (centavos === 0) {
            input.value = isNeg ? '-R$ 0,00' : 'R$ 0,00';
            return;
        }
        let val = centavos / 100;
        input.value = (isNeg ? '-R$ ' : 'R$ ') + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (permiteNegativo) {
            input.dataset.sinalNegativo = isNeg ? 'true' : 'false';
            input.style.color = isNeg ? '#EF4444' : '#10B981';
            if (typeof atualizarBotoesSinalSaldo === 'function') {
                atualizarBotoesSinalSaldo(isNeg);
            }
        }
    });

    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
        if (!pastedText) return;
        const num = desformatarMoedaInput(pastedText);
        setarValorMoedaInput(input, num);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    input.addEventListener('keydown', (e) => {
        if (input.id === 'contaSaldo' && (e.key === '-' || e.key === 'Subtract')) {
            e.preventDefault();
            if (typeof alternarSinalSaldoConta === 'function') {
                alternarSinalSaldoConta();
            }
            return;
        }
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
            const permiteNegativo = input.id === 'contaSaldo';
            const isNeg = permiteNegativo && input.dataset.sinalNegativo === 'true';
            input.value = isNeg ? '-R$ 0,00' : 'R$ 0,00';
            setTimeout(() => {
                input.setSelectionRange(input.value.length, input.value.length);
            }, 10);
        }
    });

    input.addEventListener('blur', () => {
        if ((input.value === 'R$ 0,00' || input.value === '-R$ 0,00') && !input.required) {
            input.value = '';
            return;
        }
        if (input.value && input.value.trim() !== '') {
            const val = desformatarMoedaInput(input.value);
            setarValorMoedaInput(input, val);
        }
    });
}

function inicializarMascarasMoeda() {
    const ids = [
        'inputValor', 'inputValorRealizado', 'novaContaValor', 'novoDesejoValor',
        'inputRendaExtraValor', 'contaLimite', 'contaSaldo', 'contaValorRecarga',
        'transferenciaValor', 'metaPlanoValor', 'metaPlanoRealizado'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) aplicarMascaraMoedaEmElemento(el);
    });
    document.querySelectorAll('.input-money-mask').forEach(el => {
        aplicarMascaraMoedaEmElemento(el);
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
    if (typeof carregarSelectContasModal === 'function') carregarSelectContasModal();
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
    if (typeof removerComprovanteAtual === 'function') removerComprovanteAtual();
    const inpObs = document.getElementById('inputObservacoes');
    if (inpObs) inpObs.value = '';
    const badgeOcrObs = document.getElementById('badgeOcrObs');
    if (badgeOcrObs) badgeOcrObs.style.display = 'none';

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
    renderizarSelectTiposGasto();
    const selCat = document.getElementById('selectCategoriaPredefinida');
    if (selCat) {
        selCat.value = '';
        selCat.style.display = 'block';
    }
    const inpDesc = document.getElementById('inputDescricao');
    if (inpDesc) inpDesc.value = '';
    const inpCustom = document.getElementById('inputDescricaoPersonalizada');
    if (inpCustom) {
        inpCustom.value = '';
        inpCustom.style.display = 'none';
    }
    const btnCustom = document.getElementById('btnAlternarNomeCustom');
    if (btnCustom) btnCustom.innerHTML = '<span>✏️</span> Digitar Nome';

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
    const rec = document.getElementById('inputRecorrencia') ? document.getElementById('inputRecorrencia').value : 'Unica';
    const divDataFim = document.getElementById('divDataFim');
    if (divDataFim) {
        divDataFim.style.display = rec === 'DataFinal' ? 'block' : 'none';
    }
    if (typeof atualizarAvisoMetaPrazos === 'function') {
        atualizarAvisoMetaPrazos();
    }
}
window.toggleRecorrencia = toggleRecorrencia;
window.atualizarTextoStatus = atualizarTextoStatus;
window.atualizarAvisoMetaPrazos = atualizarAvisoMetaPrazos;

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
    if (typeof carregarSelectContasModal === 'function') await carregarSelectContasModal(item.conta_id);

    document.getElementById('inputIdMovimentacao').value = item.id;
    const selTipoGasto = document.getElementById('inputTipoGasto');
    if (selTipoGasto && item.tipo_gasto) {
        let optExiste = Array.from(selTipoGasto.options).some(o => o.value === item.tipo_gasto);
        if (!optExiste) {
            const newOpt = document.createElement('option');
            newOpt.value = item.tipo_gasto;
            newOpt.innerText = item.tipo_gasto;
            selTipoGasto.appendChild(newOpt);
        }
        selTipoGasto.value = item.tipo_gasto;
    }
    
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
    
    const inpObsEdit = document.getElementById('inputObservacoes');
    if (inpObsEdit) inpObsEdit.value = item.observacoes || '';
    const badgeOcrObsEdit = document.getElementById('badgeOcrObs');
    if (badgeOcrObsEdit) badgeOcrObsEdit.style.display = item.observacoes ? 'inline-block' : 'none';

    // Carregar extras de lista de desejos no modal
    if (item.tipo_gasto === 'Lista de Desejos') {
        const modalInputLink = document.getElementById('modalInputLinkUrl');
        if (modalInputLink) modalInputLink.value = item.link_url || '';
        if (item.midia_url && typeof carregarMidiaNoModal === 'function') {
            carregarMidiaNoModal(item.midia_url, item.midia_tipo || 'foto');
        }
    } else if (item.midia_url) {
        // Carregar comprovante anexado
        window.midiaComprovanteTemp = item.midia_url;
        const thumb = document.getElementById('thumbComprovante');
        if (thumb) thumb.src = item.midia_url;
        const previewBox = document.getElementById('previewComprovanteContainer');
        if (previewBox) previewBox.style.display = 'flex';
        const det = document.getElementById('detalhesComprovanteLido');
        if (det) det.innerText = "Comprovante anexado à movimentação";
    } else {
        if (typeof removerComprovanteAtual === 'function') removerComprovanteAtual();
    }

    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'block';

    document.getElementById('inputParcelado').checked = (item.parcelado === 'Sim');
    document.getElementById('inputParcelado').disabled = true; 
    toggleParcelas();

    if(item.parcelado === 'Sim') {
        document.getElementById('inputTotalParcelas').value = item.total_parcelas;
    }

    // Se fizer parte de um grupo ou meta com prazo final, carregar o prazo final
    if (item.id_grupo) {
        try {
            const allMovs = await dbLocal.movimentacoes.toArray();
            const movsGrupo = allMovs.filter(m => m.id_grupo === item.id_grupo && m.deleted !== 1);
            const datasGrupo = movsGrupo.map(m => m.data_lancamento).filter(Boolean).sort();
            if (datasGrupo.length > 1) {
                const selRec = document.getElementById('inputRecorrencia');
                if (selRec) selRec.value = 'DataFinal';
                const inpFim = document.getElementById('inputDataFim');
                if (inpFim) {
                    const ultData = datasGrupo[datasGrupo.length - 1];
                    const [yUlt, mUlt] = ultData.split('-');
                    inpFim.value = `${yUlt}-${mUlt}`;
                }
                const divFim = document.getElementById('divDataFim');
                if (divFim) divFim.style.display = 'block';
            }
        } catch(e) {
            console.warn("Erro ao buscar datas do grupo na edição:", e);
        }
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
    const valFormat = window.privacyMode ? '•••••' : parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',');

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
        if (typeof aplicarAjusteSaldoBancario === 'function') {
            await aplicarAjusteSaldoBancario(alvo, null, timestamp);
        }
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
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
    if (typeof carregarSelectContasModal === 'function') carregarSelectContasModal();
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

// --- SISTEMA INTELIGENTE DE EDIÇÃO DE REPETIÇÕES ---
let modoEdicaoSelecionado = 'todos';
window.edicaoPendente = null;

function abrirModalConfirmarEdicao(itemOriginal, updateData, irmaosFuturos) {
    modoEdicaoSelecionado = 'todos';
    const modal = document.getElementById('modalConfirmarEdicao');
    const info = document.getElementById('modalEdicaoInfoLancamento');
    const descTodos = document.getElementById('descOptEditarTodos');

    const [y, m, d] = (itemOriginal.data_lancamento || '2026-01-01').split('-');
    const dataBr = `${d}/${m}/${y}`;
    const valorFmt = window.privacyMode ? '•••••' : parseFloat(updateData.valor_total || 0).toFixed(2).replace('.', ',');

    if (info) {
        info.innerHTML = `
            <div style="font-weight: 800; font-size: 1.05rem; color: #FFFFFF; margin-bottom: 6px;">${updateData.descricao}</div>
            <div style="display: flex; gap: 14px; font-size: 0.85rem; color: #94A3B8; flex-wrap: wrap;">
                <span>📅 Mês: <strong style="color: #60A5FA;">${dataBr}</strong></span>
                <span>🏷️ Tipo: <strong style="color: ${updateData.tipo_gasto === 'Receita' ? '#10B981' : '#F59E0B'};">${updateData.tipo_gasto}</strong></span>
                <span>💰 Valor: <strong style="color: #34D399;">R$ ${valorFmt}</strong></span>
            </div>
            <div style="margin-top: 8px; font-size: 0.82rem; color: #38BDF8; font-weight: 600;">
                ℹ️ Foram encontradas <strong>${irmaosFuturos.length} repetições vinculadas</strong> nos próximos meses.
            </div>
        `;
    }

    if (descTodos) {
        descTodos.innerText = `Aplica o novo tipo (${updateData.tipo_gasto}), valor e descrição neste mês e em todas as ${irmaosFuturos.length} repetições futuras.`;
    }

    aoMudarOpcaoEdicao('todos');

    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function aoMudarOpcaoEdicao(opcao) {
    modoEdicaoSelecionado = opcao;
    const optTodos = document.getElementById('lblOptEditarTodos');
    const optAtual = document.getElementById('lblOptEditarAtual');

    if (optTodos) {
        if (opcao === 'todos') {
            optTodos.style.border = '1.5px solid #2563EB';
            optTodos.style.background = 'rgba(37, 99, 235, 0.12)';
        } else {
            optTodos.style.border = '1px solid #334155';
            optTodos.style.background = '#0F172A';
        }
    }
    if (optAtual) {
        if (opcao === 'atual') {
            optAtual.style.border = '1.5px solid #2563EB';
            optAtual.style.background = 'rgba(37, 99, 235, 0.12)';
        } else {
            optAtual.style.border = '1px solid #334155';
            optAtual.style.background = '#0F172A';
        }
    }
}

function fecharModalConfirmarEdicao() {
    const modal = document.getElementById('modalConfirmarEdicao');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    window.edicaoPendente = null;
}

async function executarConfirmacaoEdicao() {
    if (!window.edicaoPendente) {
        fecharModalConfirmarEdicao();
        return;
    }

    const { idAtual, updateData, itemOriginal, irmaosFuturos, origemDesejoId, origemContaId } = window.edicaoPendente;
    const timestamp = Date.now();

    try {
        // 1. Atualiza o lançamento atual
        await dbLocal.movimentacoes.update(idAtual, updateData);
        if (typeof aplicarAjusteSaldoBancario === 'function') {
            await aplicarAjusteSaldoBancario(itemOriginal, updateData, timestamp);
        }

        // 2. Se escolheu atualizar todas as repetições
        if (modoEdicaoSelecionado === 'todos' && Array.isArray(irmaosFuturos) && irmaosFuturos.length > 0) {
            for (const irmao of irmaosFuturos) {
                const patch = {
                    tipo_gasto: updateData.tipo_gasto,
                    sync_status: 'pending_update',
                    updated_at: timestamp
                };

                // Se o valor orçado foi modificado em relação ao original, propaga o novo valor
                if (parseFloat(updateData.valor_total) !== parseFloat(itemOriginal.valor_total)) {
                    patch.valor_total = updateData.valor_total;
                }

                // Se a descrição foi modificada
                if (updateData.descricao !== itemOriginal.descricao) {
                    if (irmao.parcelado !== 'Sim') {
                        patch.descricao = updateData.descricao;
                    } else if (irmao.parcela_atual && irmao.total_parcelas) {
                        const descSemParc = updateData.descricao.replace(/\s*\(\d+\/\d+\)$/, '').trim();
                        patch.descricao = `${descSemParc} (${irmao.parcela_atual}/${irmao.total_parcelas})`;
                    }
                }

                await dbLocal.movimentacoes.update(irmao.id, patch);
            }
            showToast(`✅ Atualizado este mês e todas as ${irmaosFuturos.length} repetições futuras!`);
        } else {
            showToast('Lançamento atualizado!');
        }

        // Trata vínculos de desejo ou gaveta se houver
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
                }
            } catch(e) {}
        }
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
                }
            } catch(e) {}
        }

        fecharModalConfirmarEdicao();
        fecharModalLancamento();

        // Atualiza a tela e sincroniza com o servidor
        carregarPlanejamento();
        if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
        if (typeof carregarSelectContasModal === 'function') carregarSelectContasModal();
        if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
        if (typeof carregarContasAPagar === 'function') carregarContasAPagar();
        if (typeof carregarListaDesejos === 'function') carregarListaDesejos();
        if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();

    } catch (err) {
        console.error('Erro ao executar confirmação de edição:', err);
        alert('Erro ao atualizar repetições: ' + err.message);
        fecharModalConfirmarEdicao();
    }
}

window.abrirModalConfirmarEdicao = abrirModalConfirmarEdicao;
window.aoMudarOpcaoEdicao = aoMudarOpcaoEdicao;
window.fecharModalConfirmarEdicao = fecharModalConfirmarEdicao;
window.executarConfirmacaoEdicao = executarConfirmacaoEdicao;

// Ajusta o saldo físico de contas bancárias (Sicredi, etc.)
// REGRA: Lançamentos pendentes/orçados NUNCA alteram o saldo bancário.
// Somente transações efetivamente Pagas debitam ou creditam a conta!
async function aplicarAjusteSaldoBancario(itemOriginal, itemNovo, timestamp) {
    if (!itemNovo && !itemOriginal) return;
    try {
        const idOrig = itemOriginal ? itemOriginal.conta_id : null;
        const idNovo = itemNovo ? itemNovo.conta_id : null;
        const tipoOrig = itemOriginal ? itemOriginal.tipo_gasto : null;
        const tipoNovo = itemNovo ? itemNovo.tipo_gasto : null;
        const statusOrig = itemOriginal ? itemOriginal.status : null;
        const statusNovo = itemNovo ? itemNovo.status : null;
        const valOrig = (itemOriginal && statusOrig === 'Pago') ? (parseFloat(itemOriginal.valor_realizado) || parseFloat(itemOriginal.valor_total) || 0) : 0;
        const valNovo = (itemNovo && statusNovo === 'Pago') ? (parseFloat(itemNovo.valor_realizado) || parseFloat(itemNovo.valor_total) || 0) : 0;

        // Se nada mudou em relação ao status de pagamento, valor pago ou conta, não altera o saldo
        if (idOrig === idNovo && statusOrig === statusNovo && valOrig === valNovo && tipoOrig === tipoNovo) {
            return;
        }

        // 1. Reverter impacto anterior se antes já estava marcado como Pago
        if (idOrig && valOrig > 0 && statusOrig === 'Pago') {
            const contaOrig = await dbLocal.contas_bancarias.get(idOrig);
            if (contaOrig && contaOrig.tipo_conta !== 'Cartão de Crédito') {
                const saldoAtual = parseFloat(contaOrig.saldo_atual) || 0;
                // Se antes era Receita, estornar subtrai. Se antes era Despesa, estornar soma de volta.
                const saldoEstornado = (tipoOrig === 'Receita') ? (saldoAtual - valOrig) : (saldoAtual + valOrig);
                await dbLocal.contas_bancarias.update(idOrig, {
                    saldo_atual: saldoEstornado,
                    sync_status: 'pending_update',
                    updated_at: timestamp
                });
                console.log(`[SALDO ESTORNO] Conta '${contaOrig.nome_conta}' revertida: ${saldoAtual} -> ${saldoEstornado}`);
            }
        }

        // 2. Aplicar novo impacto se agora a movimentação está com status Pago
        if (idNovo && valNovo > 0 && statusNovo === 'Pago') {
            const contaNova = await dbLocal.contas_bancarias.get(idNovo);
            if (contaNova && contaNova.tipo_conta !== 'Cartão de Crédito') {
                const saldoAtual = parseFloat(contaNova.saldo_atual) || 0;
                // Se agora é Receita, soma. Se é Despesa/Gasto, subtrai.
                const saldoAplicado = (tipoNovo === 'Receita') ? (saldoAtual + valNovo) : (saldoAtual - valNovo);
                await dbLocal.contas_bancarias.update(idNovo, {
                    saldo_atual: saldoAplicado,
                    sync_status: 'pending_update',
                    updated_at: timestamp
                });
                console.log(`[SALDO APLICADO] Conta '${contaNova.nome_conta}' atualizada: ${saldoAtual} -> ${saldoAplicado}`);
            }
        }
    } catch(e) {
        console.warn('Erro ao ajustar saldo bancário:', e);
    }
}
window.aplicarAjusteSaldoBancario = aplicarAjusteSaldoBancario;

async function salvarLancamento(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    
    try {
        const idAtual = document.getElementById('inputIdMovimentacao').value;
        let tipoGasto = document.getElementById('inputTipoGasto').value;
        let contaId = document.getElementById('inputContaId') ? document.getElementById('inputContaId').value : '';

        // Auto-vinculação se o usuário lançar Cartão de Crédito ou Cartão Alimentação sem selecionar conta específica
        if (!contaId || contaId === '1') {
            try {
                if (tipoGasto === 'Cartão de Crédito') {
                    const cList = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1 && c.tipo_conta === 'Cartão de Crédito').toArray();
                    if (cList.length > 0) contaId = cList[0].id;
                } else if (tipoGasto === 'Cartão Alimentação') {
                    const aList = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1 && c.tipo_conta === 'Cartão Alimentação').toArray();
                    if (aList.length > 0) contaId = aList[0].id;
                }
            } catch(e) {}
        }

        const selCat = document.getElementById('selectCategoriaPredefinida');
        const inpDesc = document.getElementById('inputDescricao');
        const inpCustom = document.getElementById('inputDescricaoPersonalizada');

        let descricao = '';
        if (inpCustom && inpCustom.style.display !== 'none' && inpCustom.value.trim()) {
            descricao = inpCustom.value.trim();
        } else if (selCat && selCat.value && selCat.value !== '__DIGITAR_NOVO__') {
            descricao = selCat.value.trim();
        } else if (inpDesc && inpDesc.value) {
            descricao = inpDesc.value.trim();
        } else if (inpCustom && inpCustom.value.trim()) {
            descricao = inpCustom.value.trim();
        }

        if (!descricao) {
            alert("Por favor, informe o nome ou descrição da movimentação ou investimento!");
            if (inpCustom && inpCustom.style.display !== 'none') inpCustom.focus();
            else if (selCat) selCat.focus();
            return;
        }

        // Salvar a nova descrição nas categorias customizadas para reuso futuro
        try {
            const listaCats = obterCategoriasCustomizadas();
            if (descricao && !listaCats.includes(descricao)) {
                listaCats.push(descricao);
                salvarCategoriasCustomizadas(listaCats);
            }
        } catch(e) {}

        // Auto-correção e proteção: se a descrição for de Receita (ex: Salário), tipo_gasto NUNCA pode ser Despesa!
        if (isDescricaoReceita(descricao) && (tipoGasto === 'Despesa Variável' || tipoGasto === 'Despesa Fixa')) {
            tipoGasto = 'Receita';
        }

        // Normalização automática de Reserva de Emergência e Resgate
        const descLower = descricao.toLowerCase();
        const tipoLower = (tipoGasto || '').toLowerCase();
        if (descLower.includes('reserva de emerg') || (tipoLower.includes('reserva') && !tipoLower.includes('resgate'))) {
            tipoGasto = 'Reserva de Emergência';
        } else if (descLower.includes('resgate') || tipoLower.includes('resgate')) {
            tipoGasto = 'Resgate de Reserva';
        }

        const valorOrcado = desformatarMoedaInput(document.getElementById('inputValor').value);
        let valorRealizado = desformatarMoedaInput(document.getElementById('inputValorRealizado').value);

        if (valorOrcado <= 0) {
            alert("Por favor, digite um valor orçado maior que zero!");
            document.getElementById('inputValor').focus();
            return;
        }
        const data = document.getElementById('inputData').value;
        const status = document.getElementById('inputStatus').value || 'Pendente';
        if (status === 'Pago' && valorRealizado <= 0) {
            valorRealizado = valorOrcado;
        }
        const isParcelado = document.getElementById('inputParcelado').checked;
        const totalParcelas = isParcelado ? (parseInt(document.getElementById('inputTotalParcelas').value) || 1) : 1;
        
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
            if (typeof serializarMidiasDesejo === 'function' && Array.isArray(midiasModalDesejoTemp)) {
                const ser = serializarMidiasDesejo(midiasModalDesejoTemp);
                midiaUrlDesejo = ser.midia_url;
                midiaTipoDesejo = ser.midia_tipo;
            }
        }

        const inpObsSalvar = document.getElementById('inputObservacoes');
        const observacoes = inpObsSalvar ? inpObsSalvar.value.trim() : '';

        if (idAtual) {
            // UPDATE (Edição)
            let contaAlvo = null;
            if (contaId) {
                try {
                    contaAlvo = await dbLocal.contas_bancarias.get(contaId);
                } catch(e) {}
            }
            if (contaAlvo && contaAlvo.tipo_conta === 'Cartão de Crédito' && tipoGasto !== 'Cartão de Crédito') {
                tipoGasto = 'Cartão de Crédito';
            }
            if (contaAlvo && contaAlvo.tipo_conta === 'Cartão Alimentação' && tipoGasto !== 'Cartão Alimentação') {
                tipoGasto = 'Cartão Alimentação';
            }

            const updateData = {
                descricao: descricao,
                valor_total: valorOrcado,
                valor_realizado: valorRealizado,
                data_lancamento: data,
                tipo_gasto: tipoGasto,
                conta_id: contaId || '1',
                status: status,
                observacoes: observacoes,
                sync_status: 'pending_update',
                updated_at: timestamp
            };
            if (tipoGasto === 'Lista de Desejos') {
                updateData.link_url = linkDesejo;
                updateData.midia_url = midiaUrlDesejo;
                updateData.midia_tipo = midiaTipoDesejo;
            } else if (window.midiaComprovanteTemp) {
                updateData.midia_url = window.midiaComprovanteTemp;
                updateData.midia_tipo = 'foto';
            } else {
                updateData.midia_url = '';
                updateData.midia_tipo = '';
            }

            // Verifica se este lançamento faz parte de repetições futuras
            let itemOriginal = await dbLocal.movimentacoes.get(idAtual);
            if (!itemOriginal && !isNaN(idAtual)) itemOriginal = await dbLocal.movimentacoes.get(Number(idAtual));
            
            const allMovs = await dbLocal.movimentacoes.toArray();
            const activeMovs = allMovs.filter(m => m.deleted !== 1);
            let irmaosFuturos = [];

            if (itemOriginal && itemOriginal.id_grupo && itemOriginal.id_grupo.trim() !== '') {
                irmaosFuturos = activeMovs.filter(m => 
                    m.id_grupo === itemOriginal.id_grupo && 
                    String(m.id) !== String(itemOriginal.id) && 
                    (m.data_lancamento >= itemOriginal.data_lancamento || (m.parcela_atual && itemOriginal.parcela_atual && m.parcela_atual > itemOriginal.parcela_atual))
                );
            } else if (itemOriginal) {
                const descBase = (itemOriginal.descricao || '').replace(/\s*\(\d+\/\d+\)$/, '').trim().toLowerCase();
                irmaosFuturos = activeMovs.filter(m => {
                    const mDescBase = (m.descricao || '').replace(/\s*\(\d+\/\d+\)$/, '').trim().toLowerCase();
                    return String(m.id) !== String(itemOriginal.id) && mDescBase === descBase && m.data_lancamento >= itemOriginal.data_lancamento;
                });
            }

            if (irmaosFuturos.length > 0) {
                const modalEl = document.getElementById('modalLancamento');
                window.edicaoPendente = {
                    idAtual,
                    updateData,
                    itemOriginal,
                    irmaosFuturos,
                    origemDesejoId: modalEl ? modalEl.dataset.origemDesejoId : null,
                    origemContaId: modalEl ? modalEl.dataset.origemContaId : null
                };
                abrirModalConfirmarEdicao(itemOriginal, updateData, irmaosFuturos);
                return; // Aguarda escolha do usuário no modal
            }

            await dbLocal.movimentacoes.update(idAtual, updateData);
            await aplicarAjusteSaldoBancario(itemOriginal, updateData, timestamp);
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

            // Identificação de Cartão de Crédito e Regra de Fechamento de Fatura
            let contaAlvo = null;
            if (contaId) {
                try {
                    contaAlvo = await dbLocal.contas_bancarias.get(contaId);
                } catch(e) {}
            }
            const isCartaoCredito = (tipoGasto === 'Cartão de Crédito') || (contaAlvo && contaAlvo.tipo_conta === 'Cartão de Crédito');
            if (isCartaoCredito && tipoGasto !== 'Cartão de Crédito') {
                tipoGasto = 'Cartão de Crédito';
            }
            const isCartaoAlimentacao = (tipoGasto === 'Cartão Alimentação') || (contaAlvo && contaAlvo.tipo_conta === 'Cartão Alimentação');
            if (isCartaoAlimentacao && tipoGasto !== 'Cartão Alimentação') {
                tipoGasto = 'Cartão Alimentação';
            }

            let diaFechamento = null;
            if (contaAlvo && contaAlvo.tipo_conta === 'Cartão de Crédito' && contaAlvo.dia_fechamento) {
                diaFechamento = parseInt(contaAlvo.dia_fechamento, 10);
            } else if (isCartaoCredito) {
                try {
                    const cartoes = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1 && c.tipo_conta === 'Cartão de Crédito').toArray();
                    if (cartoes.length > 0 && cartoes[0].dia_fechamento) {
                        diaFechamento = parseInt(cartoes[0].dia_fechamento, 10);
                    }
                } catch(e) {}
            }

            let diaCompra = 1;
            let mesCompraZero = 0;
            let anoCompra = 2026;
            let offsetMesCartao = 0;

            if (data) {
                const parts = data.split('-');
                anoCompra = parseInt(parts[0], 10);
                mesCompraZero = parseInt(parts[1], 10) - 1;
                diaCompra = parseInt(parts[2], 10);

                // Se a compra for feita a partir do dia de fechamento do cartão, entra na fatura do mês seguinte!
                if (isCartaoCredito && diaFechamento && diaCompra >= diaFechamento) {
                    offsetMesCartao = 1;
                }
            }

            const valorFinalPorParcela = isParcelado ? (valorOrcado / totalParcelas) : valorOrcado;
            const valorRealizadoPorParcela = isParcelado ? (valorRealizado / totalParcelas) : valorRealizado;

            const midiaSalvarUrl = (tipoGasto === 'Lista de Desejos') ? midiaUrlDesejo : (window.midiaComprovanteTemp || '');
            const midiaSalvarTipo = (tipoGasto === 'Lista de Desejos') ? midiaTipoDesejo : (window.midiaComprovanteTemp ? 'foto' : '');

            for (let i = 0; i < qtdCriar; i++) {
                let nextDateStr = '';
                if (data) {
                    const mesOffset = (isCartaoCredito ? offsetMesCartao : 0) + i;
                    const tempDate = new Date(anoCompra, mesCompraZero + mesOffset, 1, 12, 0, 0);
                    const anoReal = tempDate.getFullYear();
                    const mesReal = tempDate.getMonth();
                    const maxDiasNoMes = new Date(anoReal, mesReal + 1, 0).getDate();
                    const diaReal = Math.min(diaCompra, maxDiasNoMes);
                    const finalDate = new Date(anoReal, mesReal, diaReal, 12, 0, 0);
                    const yStr = finalDate.getFullYear();
                    const mStr = String(finalDate.getMonth() + 1).padStart(2, '0');
                    const dStr = String(finalDate.getDate()).padStart(2, '0');
                    nextDateStr = `${yStr}-${mStr}-${dStr}`;
                }
                
                let desc = descricao;
                if (isParcelado) desc = `${descricao} (${i + 1}/${totalParcelas})`;
                
                let l_valor_realizado = 0;
                let l_status = status;
                if (isCartaoCredito) {
                    // Lançamentos no cartão de crédito entram na fatura como Pendente
                    l_status = (status === 'Cancelado') ? 'Cancelado' : 'Pendente';
                    l_valor_realizado = 0;
                } else if (isParcelado) {
                    l_valor_realizado = (i === 0 && status === 'Pago') ? valorRealizadoPorParcela : 0;
                    l_status = (status === 'Pago') ? (i === 0 ? 'Pago' : 'Pendente') : status;
                } else {
                    l_valor_realizado = valorRealizado;
                    l_status = status;
                }

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
                    conta_id: contaId || '1',
                    parcelado: isParcelado ? 'Sim' : 'Não',
                    total_parcelas: isParcelado ? totalParcelas : 1,
                    parcela_atual: isParcelado ? (i + 1) : 1,
                    id_grupo: idGrupo,
                    link_url: linkDesejo,
                    midia_url: midiaSalvarUrl,
                    midia_tipo: midiaSalvarTipo,
                    observacoes: observacoes,
                    user_id: currentUserId,
                    deleted: 0,
                    sync_status: 'pending_insert',
                    updated_at: timestamp
                };
                await dbLocal.movimentacoes.put(novoLancamento);
            }
            console.log(`Foram salvos ${qtdCriar} lançamentos localmente.`);

            // Subtração ou Adição Automática em Conta Bancária se vinculada
            // REGRA: Somente debita/credita do saldo real do banco se a movimentação for REALMENTE PAGA!
            // Lançamentos pendentes/orçados NUNCA alteram o saldo bancário físico.
            if (contaId && status === 'Pago') {
                const valReal = isParcelado ? (parseFloat(valorRealizadoPorParcela) || 0) : (parseFloat(valorRealizado) || 0);
                if (valReal > 0) {
                    await aplicarAjusteSaldoBancario(null, {
                        conta_id: contaId,
                        tipo_gasto: tipoGasto,
                        status: 'Pago',
                        valor_realizado: valReal
                    }, timestamp);
                }
            }

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
        if(typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
        if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
        
        if (tipoGasto === 'Lista de Desejos') {
            switchFinanceTab('Desejos');
        } else if (tipoGasto === 'Conta a Pagar') {
            switchFinanceTab('APagar');
        } else if (tipoGasto === 'Cartão de Crédito') {
            switchFinanceTab('Cartoes');
        } else {
            switchFinanceTab('Lancamentos');
        }
    } catch (err) {
        console.error('Erro crítico ao salvar lançamento:', err);
        alert('Erro ao salvar lançamento: ' + err.message);
    }
}
window.salvarLancamento = salvarLancamento;

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

    const tabs = ['Lancamentos', 'Cartoes', 'APagar', 'PowerBI', 'Desejos', 'RendaExtra', 'Tema'];
    
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

    if (tabName === 'PowerBI') {
        if (typeof window.sincronizarHeaderComPeriodoDemo === 'function') {
            window.sincronizarHeaderComPeriodoDemo();
        }
        if (typeof renderPowerBIDashboard === 'function') {
            setTimeout(renderPowerBIDashboard, 100);
        }
    } else {
        if (typeof window.restaurarHeaderPadraoForaDoDemo === 'function') {
            window.restaurarHeaderPadraoForaDoDemo();
        }
        if (tabName === 'Desejos') {
            carregarListaDesejos();
        } else if (tabName === 'Cartoes') {
            if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
        } else if (tabName === 'RendaExtra') {
            if (typeof carregarPlanejamentoRendaExtra === 'function') carregarPlanejamentoRendaExtra();
        } else if (tabName === 'APagar') {
            carregarContasAPagar();
        } else if (tabName === 'Lancamentos') {
            carregarPlanejamento();
            if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
        } else if (tabName === 'Tema') {
            const temaAtual = localStorage.getItem('financas_app_theme') || 'preto';
            atualizarCardsSelecaoTema(temaAtual);
        }
    }

    if (typeof syncFinanceWithServer === 'function') {
        syncFinanceWithServer();
    }

    // Rola para o topo suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchFinanceTab = switchFinanceTab;
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
            <div style="text-align:center; padding: 26px 16px; color: var(--text-muted); background: var(--card-3d-bg, var(--bg-card)); border-radius: 14px; border: 1.5px dashed var(--border-color); box-shadow: var(--card-3d-shadow);">
                <div style="font-size: 2rem; margin-bottom: 6px;">📂</div>
                <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Nenhuma conta na gaveta</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Cadastre acima as contas que você quer monitorar para programar o pagamento!</div>
            </div>
        `;
        return;
    }

    contasAPagar.forEach(c => {
        const div = document.createElement('div');
        div.className = 'conta-card-item';
        div.style.cssText = 'background: var(--card-3d-bg, var(--bg-card)); border: 1.5px solid var(--border-color); border-left: 5px solid #F59E0B; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: var(--card-3d-shadow);';

        const valorFormatado = window.privacyMode ? '•••••' : 'R$ ' + parseFloat(c.valor_total || 0).toFixed(2).replace('.', ',');

        div.innerHTML = `
            <div style="flex: 1; min-width: 170px;">
                <h4 style="margin: 0 0 4px 0; font-size: 1rem; color: var(--text-primary); font-weight: 700;">${c.descricao}</h4>
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

    // Card Totalizador no rodapé das Contas a Pagar (Gaveta) conforme solicitado
    const somaTotalGaveta = contasAPagar.reduce((acc, c) => acc + (parseFloat(c.valor_total) || 0), 0);
    const totalFormatado = window.privacyMode ? '•••••' : 'R$ ' + somaTotalGaveta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const totalCard = document.createElement('div');
    totalCard.className = 'conta-card-total-gaveta';
    totalCard.style.cssText = 'background: var(--card-3d-bg, var(--bg-card)); border: 1.5px solid var(--border-color); border-left: 5px solid #F59E0B; border-radius: 12px; padding: 14px 18px; margin-top: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.16);';

    totalCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">📂</span>
            <div>
                <h4 style="margin: 0; font-size: 1.05rem; color: #F59E0B; font-weight: 800;">Contas a pagar (Gaveta)</h4>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">Total somado (${contasAPagar.length} ${contasAPagar.length === 1 ? 'conta' : 'contas'})</div>
            </div>
        </div>
        <div style="font-size: 1.25rem; font-weight: 900; color: #F59E0B; white-space: nowrap;">
            ${totalFormatado}
        </div>
    `;
    container.appendChild(totalCard);
}

// ==================================================================
// MÓDULO LISTA DE DESEJOS - MÚLTIPLAS FOTOS, VÍDEOS, LINK E LIGHTBOX
// ==================================================================

// Listas acumulativas de mídias para o formulário de Desejos e para o Modal
let midiasDesejoTemp = [];
let indiceAtivoPreviewDesejo = 0;
let midiasModalDesejoTemp = [];
let indiceAtivoPreviewModal = 0;
let midiaModalDesejoRemovida = false;
window.midiasDesejosCache = {};
window.midiaAtivaDesejoCard = {};

// Converte midia_url / midia_tipo do banco em array padronizado [{ url, tipo }, ...]
function parseMidiasDesejo(midia_url, midia_tipo) {
    if (!midia_url || typeof midia_url !== 'string' || !midia_url.trim()) return [];
    const raw = midia_url.trim();
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(item => item && item.url)
                    .map(item => ({
                        url: item.url,
                        tipo: item.tipo === 'video' || String(item.url).startsWith('data:video') ? 'video' : 'foto'
                    }));
            }
        } catch (e) {}
    }
    const isVideo = midia_tipo === 'video' || raw.startsWith('data:video');
    return [{ url: raw, tipo: isVideo ? 'video' : 'foto' }];
}
window.parseMidiasDesejo = parseMidiasDesejo;

// Serializa o array [{ url, tipo }, ...] para salvar nas colunas midia_url e midia_tipo
function serializarMidiasDesejo(lista) {
    if (!Array.isArray(lista) || lista.length === 0) {
        return { midia_url: '', midia_tipo: '' };
    }
    if (lista.length === 1) {
        return {
            midia_url: lista[0].url || '',
            midia_tipo: lista[0].tipo || 'foto'
        };
    }
    return {
        midia_url: JSON.stringify(lista),
        midia_tipo: 'multi'
    };
}
window.serializarMidiasDesejo = serializarMidiasDesejo;

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

// Leitura de vídeo com validação de tamanho (máx 35MB por vídeo)
function lerVideoDesejo(file) {
    return new Promise((resolve, reject) => {
        if (file.size > 35 * 1024 * 1024) {
            alert(`O vídeo "${file.name || ''}" ultrapassa 35MB. Grave ou escolha um vídeo mais curto.`);
            return reject(new Error('Vídeo muito grande'));
        }
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erro ao ler vídeo'));
        reader.readAsDataURL(file);
    });
}

// Manipulador de upload acumulativo para a aba Lista de Desejos (quantas fotos e vídeos quiser)
window.capturarMidiaDesejo = async function(input, tipoDesejado) {
    if (!input || !input.files || input.files.length === 0) return;
    const files = Array.from(input.files);

    try {
        showToast(files.length > 1 ? `Processando ${files.length} mídias...` : 'Processando mídia...');
        let adicionados = 0;

        for (const file of files) {
            const isVideo = (file.type && file.type.startsWith('video/')) || tipoDesejado === 'video';
            try {
                if (isVideo) {
                    const videoData = await lerVideoDesejo(file);
                    midiasDesejoTemp.push({ url: videoData, tipo: 'video' });
                    adicionados++;
                } else {
                    const fotoData = await otimizarImagemDesejo(file);
                    midiasDesejoTemp.push({ url: fotoData, tipo: 'foto' });
                    adicionados++;
                }
            } catch (itemErr) {
                console.warn('Falha ao processar um arquivo de mídia:', itemErr);
            }
        }

        // Limpa o input para permitir tirar outra foto/vídeo ou escolher mais arquivos em seguida
        input.value = '';
        if (adicionados > 0) {
            indiceAtivoPreviewDesejo = Math.max(0, midiasDesejoTemp.length - 1);
        }
        renderizarPreviewMidiaDesejo();

        if (adicionados > 0) {
            showToast(
                adicionados > 1
                    ? `✅ ${adicionados} mídias adicionadas! Total: ${midiasDesejoTemp.length}`
                    : `✅ Mídia adicionada! Total anexado: ${midiasDesejoTemp.length}`
            );
        }
    } catch (err) {
        console.error('Erro ao capturar mídia:', err);
    }
};

window.selecionarMidiaPreviewDesejo = function(index) {
    if (!Array.isArray(midiasDesejoTemp) || index < 0 || index >= midiasDesejoTemp.length) return;
    indiceAtivoPreviewDesejo = index;
    renderizarPreviewMidiaDesejo();
};

function renderizarPreviewMidiaDesejo() {
    const container = document.getElementById('previewMidiaContainer');
    const thumb = document.getElementById('previewMidiaThumb');
    const titulo = document.getElementById('previewMidiaTitulo');
    const info = document.getElementById('previewMidiaInfo');
    const badgeContador = document.getElementById('badgeContadorMidiasDesejo');
    if (!container || !thumb) return;

    if (!Array.isArray(midiasDesejoTemp) || midiasDesejoTemp.length === 0) {
        container.style.display = 'none';
        thumb.innerHTML = '';
        indiceAtivoPreviewDesejo = 0;
        if (badgeContador) {
            badgeContador.style.display = 'none';
            badgeContador.innerText = '0 anexos';
        }
        return;
    }

    if (indiceAtivoPreviewDesejo < 0 || indiceAtivoPreviewDesejo >= midiasDesejoTemp.length) {
        indiceAtivoPreviewDesejo = 0;
    }

    const qtdFotos = midiasDesejoTemp.filter(m => m.tipo !== 'video').length;
    const qtdVideos = midiasDesejoTemp.filter(m => m.tipo === 'video').length;
    const partesResumo = [];
    if (qtdFotos > 0) partesResumo.push(`${qtdFotos} ${qtdFotos === 1 ? 'foto' : 'fotos'}`);
    if (qtdVideos > 0) partesResumo.push(`${qtdVideos} ${qtdVideos === 1 ? 'vídeo' : 'vídeos'}`);

    if (badgeContador) {
        badgeContador.style.display = 'inline-block';
        badgeContador.innerText = `${midiasDesejoTemp.length} ${midiasDesejoTemp.length === 1 ? 'anexo' : 'anexos'}`;
    }

    container.style.display = 'flex';
    if (titulo) {
        titulo.innerText = `📎 ${midiasDesejoTemp.length} ${midiasDesejoTemp.length === 1 ? 'Mídia Anexada' : 'Mídias Anexadas'} (${partesResumo.join(' e ')})`;
    }
    if (info) {
        info.innerText = 'Toque na miniatura para ver na foto maior e toque na foto maior para abrir em tela cheia';
    }

    const midiaAtiva = midiasDesejoTemp[indiceAtivoPreviewDesejo];
    const isVidAtiva = midiaAtiva.tipo === 'video';
    const badgeDestaque = midiasDesejoTemp.length > 1
        ? `📸 ${indiceAtivoPreviewDesejo + 1}/${midiasDesejoTemp.length} • 🔍 Toque para ampliar`
        : (isVidAtiva ? '▶ Toque para reproduzir' : '🔍 Toque para ampliar');

    const destaqueHtml = `
        <div id="previewMidiaDestaqueBox" onclick="abrirModalLightboxTemporario('desejo', ${indiceAtivoPreviewDesejo})" title="Toque na foto maior para visualizar em tela cheia" style="width: 100%; height: 175px; border-radius: 10px; overflow: hidden; position: relative; cursor: pointer; background: #000; border: 1.5px solid ${isVidAtiva ? '#EC4899' : '#8B5CF6'}; box-shadow: 0 4px 12px rgba(0,0,0,0.45);">
            ${isVidAtiva
                ? `<video src="${midiaAtiva.url}" preload="metadata" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#fff;background:rgba(0,0,0,0.25);pointer-events:none;">▶</span>`
                : `<img src="${midiaAtiva.url}" style="width:100%; height:100%; object-fit:cover;">`
            }
            <div class="desejo-midia-badge">${badgeDestaque}</div>
        </div>
    `;

    const miniaturasHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; width: 100%;">
            ${midiasDesejoTemp.map((m, idx) => {
                const isVid = m.tipo === 'video';
                const isSelected = idx === indiceAtivoPreviewDesejo;
                return `
                    <div style="position: relative; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; background: #000; border: ${isSelected ? '2.5px solid #F59E0B' : `1.5px solid ${isVid ? '#EC4899' : '#8B5CF6'}`}; flex-shrink: 0; box-shadow: ${isSelected ? '0 0 10px rgba(245, 158, 11, 0.65)' : '0 4px 10px rgba(0,0,0,0.4)'}; transform: ${isSelected ? 'scale(1.04)' : 'none'}; transition: all 0.18s ease;">
                        <div onclick="selecionarMidiaPreviewDesejo(${idx})" title="Toque para exibir na foto maior" style="width: 100%; height: 100%; cursor: pointer;">
                            ${isVid
                                ? `<video src="${m.url}" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#fff;background:rgba(0,0,0,0.3);pointer-events:none;">▶</span>`
                                : `<img src="${m.url}" style="width:100%; height:100%; object-fit:cover;">`
                            }
                            <span style="position: absolute; bottom: 3px; left: 3px; background: rgba(0,0,0,0.75); color: #fff; font-size: 0.62rem; font-weight: 800; padding: 1px 5px; border-radius: 4px; pointer-events: none;">
                                ${isVid ? '🎥' : '📷'} ${idx + 1}
                            </span>
                        </div>
                        <button type="button" onclick="event.stopPropagation(); removerItemMidiaDesejo(${idx})" title="Remover apenas esta mídia" style="position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border-radius: 50%; background: rgba(239, 68, 68, 0.95); border: 1px solid #fff; color: #fff; font-size: 0.68rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
                            ✕
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    thumb.style.flexDirection = 'column';
    thumb.style.alignItems = 'stretch';
    thumb.innerHTML = destaqueHtml + miniaturasHtml;
}

window.removerItemMidiaDesejo = function(index) {
    if (!Array.isArray(midiasDesejoTemp)) return;
    midiasDesejoTemp.splice(index, 1);
    if (indiceAtivoPreviewDesejo >= midiasDesejoTemp.length) {
        indiceAtivoPreviewDesejo = Math.max(0, midiasDesejoTemp.length - 1);
    }
    renderizarPreviewMidiaDesejo();
    showToast('Mídia removida da lista.');
};

window.removerMidiaDesejo = function() {
    midiasDesejoTemp = [];
    indiceAtivoPreviewDesejo = 0;
    ['inputCapturaFoto', 'inputCapturaVideo', 'inputCapturaGaleria'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderizarPreviewMidiaDesejo();
};

// Manipulador de upload acumulativo para o Modal de Lançamento / Edição
window.capturarMidiaModalDesejo = async function(input, tipoDesejado) {
    if (!input || !input.files || input.files.length === 0) return;
    const files = Array.from(input.files);

    try {
        showToast(files.length > 1 ? `Processando ${files.length} mídias...` : 'Processando mídia...');
        let adicionados = 0;

        for (const file of files) {
            const isVideo = (file.type && file.type.startsWith('video/')) || tipoDesejado === 'video';
            try {
                if (isVideo) {
                    const videoData = await lerVideoDesejo(file);
                    midiasModalDesejoTemp.push({ url: videoData, tipo: 'video' });
                    adicionados++;
                } else {
                    const fotoData = await otimizarImagemDesejo(file);
                    midiasModalDesejoTemp.push({ url: fotoData, tipo: 'foto' });
                    adicionados++;
                }
            } catch (itemErr) {
                console.warn('Falha ao processar mídia no modal:', itemErr);
            }
        }

        input.value = '';
        midiaModalDesejoRemovida = false;
        if (adicionados > 0) {
            indiceAtivoPreviewModal = Math.max(0, midiasModalDesejoTemp.length - 1);
        }
        atualizarPreviewMidiaModal();
        if (adicionados > 0) {
            showToast(`✅ ${adicionados} ${adicionados === 1 ? 'mídia adicionada' : 'mídias adicionadas'} ao lançamento!`);
        }
    } catch (err) {
        console.error('Erro ao capturar mídia modal:', err);
    }
};

window.carregarMidiaNoModal = function(url, tipo) {
    midiasModalDesejoTemp = parseMidiasDesejo(url, tipo);
    indiceAtivoPreviewModal = 0;
    midiaModalDesejoRemovida = false;
    atualizarPreviewMidiaModal();
};

window.selecionarMidiaPreviewModal = function(index) {
    if (!Array.isArray(midiasModalDesejoTemp) || index < 0 || index >= midiasModalDesejoTemp.length) return;
    indiceAtivoPreviewModal = index;
    atualizarPreviewMidiaModal();
};

window.removerItemMidiaModalDesejo = function(index) {
    if (!Array.isArray(midiasModalDesejoTemp)) return;
    midiasModalDesejoTemp.splice(index, 1);
    if (indiceAtivoPreviewModal >= midiasModalDesejoTemp.length) {
        indiceAtivoPreviewModal = Math.max(0, midiasModalDesejoTemp.length - 1);
    }
    if (midiasModalDesejoTemp.length === 0) midiaModalDesejoRemovida = true;
    atualizarPreviewMidiaModal();
};

window.removerMidiaModalDesejo = function() {
    midiasModalDesejoTemp = [];
    indiceAtivoPreviewModal = 0;
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

    if (!Array.isArray(midiasModalDesejoTemp) || midiasModalDesejoTemp.length === 0) {
        container.style.display = 'none';
        thumb.innerHTML = '';
        indiceAtivoPreviewModal = 0;
        return;
    }

    if (indiceAtivoPreviewModal < 0 || indiceAtivoPreviewModal >= midiasModalDesejoTemp.length) {
        indiceAtivoPreviewModal = 0;
    }

    container.style.display = 'flex';
    if (label) {
        label.innerText = `📎 ${midiasModalDesejoTemp.length} ${midiasModalDesejoTemp.length === 1 ? 'mídia anexada' : 'mídias anexadas'}`;
    }

    const midiaAtiva = midiasModalDesejoTemp[indiceAtivoPreviewModal];
    const isVidAtiva = midiaAtiva.tipo === 'video';
    const badgeDestaque = midiasModalDesejoTemp.length > 1
        ? `📸 ${indiceAtivoPreviewModal + 1}/${midiasModalDesejoTemp.length} • 🔍 Ampliar`
        : (isVidAtiva ? '▶ Vídeo' : '🔍 Ampliar');

    const destaqueModalHtml = `
        <div onclick="abrirModalLightboxTemporario('modal', ${indiceAtivoPreviewModal})" title="Toque na foto maior para visualizar em tela cheia" style="width: 100%; height: 150px; border-radius: 10px; overflow: hidden; position: relative; cursor: pointer; background: #000; border: 1.5px solid ${isVidAtiva ? '#EC4899' : '#8B5CF6'};">
            ${isVidAtiva
                ? `<video src="${midiaAtiva.url}" preload="metadata" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#fff;background:rgba(0,0,0,0.25);pointer-events:none;">▶</span>`
                : `<img src="${midiaAtiva.url}" style="width:100%; height:100%; object-fit:cover;">`
            }
            <div class="desejo-midia-badge">${badgeDestaque}</div>
        </div>
    `;

    const miniaturasModalHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; width: 100%;">
            ${midiasModalDesejoTemp.map((m, idx) => {
                const isVid = m.tipo === 'video';
                const isSelected = idx === indiceAtivoPreviewModal;
                return `
                    <div style="position: relative; width: 58px; height: 58px; border-radius: 8px; overflow: hidden; background: #000; border: ${isSelected ? '2.5px solid #F59E0B' : `1.5px solid ${isVid ? '#EC4899' : '#8B5CF6'}`}; flex-shrink: 0; box-shadow: ${isSelected ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none'};">
                        <div onclick="selecionarMidiaPreviewModal(${idx})" title="Toque para exibir na foto maior" style="width: 100%; height: 100%; cursor: pointer;">
                            ${isVid
                                ? `<video src="${m.url}" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#fff;background:rgba(0,0,0,0.3);pointer-events:none;">▶</span>`
                                : `<img src="${m.url}" style="width:100%; height:100%; object-fit:cover;">`
                            }
                        </div>
                        <button type="button" onclick="event.stopPropagation(); removerItemMidiaModalDesejo(${idx})" title="Remover esta mídia" style="position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(239, 68, 68, 0.95); border: 1px solid #fff; color: #fff; font-size: 0.65rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;">
                            ✕
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    thumb.style.flexDirection = 'column';
    thumb.style.alignItems = 'stretch';
    thumb.innerHTML = destaqueModalHtml + miniaturasModalHtml;
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

// ==================================================================
// LIGHTBOX COM GALERIA (NAVEGAÇÃO ENTRE FOTOS E VÍDEOS DO DESEJO)
// ==================================================================
let lightboxListaAtual = [];
let lightboxIndiceAtual = 0;
let lightboxTituloAtual = '';

function renderizarSlideLightbox() {
    const modal = document.getElementById('modalMidiaLightbox');
    const content = document.getElementById('modalMidiaLightboxContent');
    const caption = document.getElementById('modalMidiaLightboxCaption');
    const counter = document.getElementById('modalMidiaLightboxCounter');
    const btnPrev = document.getElementById('btnLightboxPrev');
    const btnNext = document.getElementById('btnLightboxNext');
    const thumbsContainer = document.getElementById('modalMidiaLightboxThumbs');
    if (!modal || !content || lightboxListaAtual.length === 0) return;

    if (lightboxIndiceAtual < 0) lightboxIndiceAtual = lightboxListaAtual.length - 1;
    if (lightboxIndiceAtual >= lightboxListaAtual.length) lightboxIndiceAtual = 0;

    const item = lightboxListaAtual[lightboxIndiceAtual];
    const isVideo = item.tipo === 'video';

    if (isVideo) {
        content.innerHTML = `<video src="${item.url}" controls autoplay playsinline style="max-width:88vw; max-height:68vh; border-radius:10px; outline:none; background:#000;"></video>`;
    } else {
        content.innerHTML = `<img src="${item.url}" alt="${lightboxTituloAtual || 'Mídia'}" style="max-width:88vw; max-height:68vh; object-fit:contain; border-radius:10px; background:#000;">`;
    }

    if (caption) {
        caption.innerText = lightboxTituloAtual
            ? (lightboxListaAtual.length > 1 ? `${lightboxTituloAtual} (${lightboxIndiceAtual + 1}/${lightboxListaAtual.length})` : lightboxTituloAtual)
            : '';
    }

    if (lightboxListaAtual.length > 1) {
        if (counter) {
            counter.style.display = 'inline-block';
            counter.innerText = `${lightboxIndiceAtual + 1} / ${lightboxListaAtual.length}`;
        }
        if (btnPrev) btnPrev.style.display = 'flex';
        if (btnNext) btnNext.style.display = 'flex';
        if (thumbsContainer) {
            thumbsContainer.style.display = 'flex';
            thumbsContainer.innerHTML = lightboxListaAtual.map((m, i) => {
                const active = i === lightboxIndiceAtual;
                const isVid = m.tipo === 'video';
                return `
                    <div onclick="irParaSlideLightbox(${i})" style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; cursor: pointer; flex-shrink: 0; border: 2px solid ${active ? '#F59E0B' : 'rgba(255,255,255,0.25)'}; opacity: ${active ? '1' : '0.6'}; position: relative; background: #000;">
                        ${isVid
                            ? `<video src="${m.url}" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;background:rgba(0,0,0,0.35);">▶</span>`
                            : `<img src="${m.url}" style="width:100%; height:100%; object-fit:cover;">`
                        }
                    </div>
                `;
            }).join('');
        }
    } else {
        if (counter) counter.style.display = 'none';
        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'none';
        if (thumbsContainer) {
            thumbsContainer.style.display = 'none';
            thumbsContainer.innerHTML = '';
        }
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

window.navegarLightbox = function(delta) {
    if (lightboxListaAtual.length <= 1) return;
    lightboxIndiceAtual += delta;
    renderizarSlideLightbox();
};

window.irParaSlideLightbox = function(index) {
    lightboxIndiceAtual = index;
    renderizarSlideLightbox();
};

window.abrirModalLightboxTemporario = function(origem, index = 0) {
    const lista = origem === 'modal' ? midiasModalDesejoTemp : midiasDesejoTemp;
    if (!Array.isArray(lista) || lista.length === 0) return;
    lightboxListaAtual = lista.slice();
    lightboxIndiceAtual = index;
    lightboxTituloAtual = 'Pré-visualização dos Anexos';
    renderizarSlideLightbox();
};

window.abrirModalLightboxDesejo = function(desejoId, index = 0, titulo = '') {
    const lista = window.midiasDesejosCache && window.midiasDesejosCache[desejoId];
    if (!Array.isArray(lista) || lista.length === 0) return;
    lightboxListaAtual = lista.slice();
    lightboxIndiceAtual = index;
    lightboxTituloAtual = titulo || '';
    renderizarSlideLightbox();
};

// Compatibilidade direta para chamadas de 1 item
window.abrirModalLightbox = function(url, tipo, titulo) {
    const lista = parseMidiasDesejo(url, tipo);
    if (lista.length === 0) return;
    lightboxListaAtual = lista;
    lightboxIndiceAtual = 0;
    lightboxTituloAtual = titulo || '';
    renderizarSlideLightbox();
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

// Selecionar miniatura no card do Desejo para apresentá-la na foto maior do card
window.selecionarMidiaCardDesejo = function(desejoId, index, safeDesc = '') {
    const lista = window.midiasDesejosCache && window.midiasDesejosCache[desejoId];
    if (!Array.isArray(lista) || index < 0 || index >= lista.length) return;

    window.midiaAtivaDesejoCard = window.midiaAtivaDesejoCard || {};
    window.midiaAtivaDesejoCard[desejoId] = index;

    const item = lista[index];
    const isVid = item.tipo === 'video';
    const badgeTexto = lista.length > 1
        ? `📸 ${index + 1}/${lista.length} • 🔍 Ampliar`
        : (isVid ? '▶ Vídeo' : '🔍 Ampliar');

    const mainBox = document.getElementById(`desejo-midia-box-${desejoId}`);
    if (mainBox) {
        mainBox.innerHTML = isVid
            ? `<video src="${item.url}" preload="metadata" muted playsinline></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#fff;background:rgba(0,0,0,0.25);pointer-events:none;">▶</span><div class="desejo-midia-badge">${badgeTexto}</div>`
            : `<img src="${item.url}" alt="${safeDesc || 'Mídia'}" loading="lazy"><div class="desejo-midia-badge">${badgeTexto}</div>`;
    }

    lista.forEach((m, idx) => {
        const thumbEl = document.getElementById(`desejo-thumb-${desejoId}-${idx}`);
        if (thumbEl) {
            const isV = m.tipo === 'video';
            const isSelected = idx === index;
            thumbEl.style.border = isSelected ? '2.5px solid #F59E0B' : `1.5px solid ${isV ? '#EC4899' : '#8B5CF6'}`;
            thumbEl.style.boxShadow = isSelected ? '0 0 8px rgba(245, 158, 11, 0.65)' : 'none';
            thumbEl.style.transform = isSelected ? 'scale(1.06)' : 'none';
        }
    });
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
                <div style="font-size: 0.85rem;">Adicione acima o que você quer conquistar com quantas fotos e vídeos quiser!</div>
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

        // Múltiplas Mídias (Fotos e Vídeos)
        const midias = parseMidiasDesejo(d.midia_url, d.midia_tipo);
        window.midiasDesejosCache[d.id] = midias;
        window.midiaAtivaDesejoCard = window.midiaAtivaDesejoCard || {};

        let midiaHtml = '';
        let galeriaMiniaturasHtml = '';
        const safeDesc = (d.descricao || '').replace(/'/g, "\\'");

        if (midias.length > 0) {
            let idxAtivo = window.midiaAtivaDesejoCard[d.id] || 0;
            if (idxAtivo < 0 || idxAtivo >= midias.length) idxAtivo = 0;
            window.midiaAtivaDesejoCard[d.id] = idxAtivo;

            const capa = midias[idxAtivo];
            const isVid = capa.tipo === 'video';
            const badgeTexto = midias.length > 1
                ? `📸 ${idxAtivo + 1}/${midias.length} • 🔍 Ampliar`
                : (isVid ? '▶ Vídeo' : '🔍 Ampliar');

            midiaHtml = `
                <div id="desejo-midia-box-${d.id}" class="desejo-midia-box" onclick="abrirModalLightboxDesejo('${d.id}', (window.midiaAtivaDesejoCard && window.midiaAtivaDesejoCard['${d.id}']) || 0, '${safeDesc}')" title="Toque na foto maior para abrir em tela cheia">
                    ${isVid ? 
                        `<video src="${capa.url}" preload="metadata" muted playsinline></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#fff;background:rgba(0,0,0,0.25);pointer-events:none;">▶</span><div class="desejo-midia-badge">${badgeTexto}</div>` : 
                        `<img src="${capa.url}" alt="${d.descricao}" loading="lazy"><div class="desejo-midia-badge">${badgeTexto}</div>`
                    }
                </div>
            `;

            if (midias.length > 1) {
                galeriaMiniaturasHtml = `
                    <div style="display: flex; gap: 6px; overflow-x: auto; padding: 4px 2px; margin-top: 2px;">
                        ${midias.map((m, idx) => {
                            const isV = m.tipo === 'video';
                            const isSelected = idx === idxAtivo;
                            return `
                                <div id="desejo-thumb-${d.id}-${idx}" onclick="selecionarMidiaCardDesejo('${d.id}', ${idx}, '${safeDesc}')" title="Toque para exibir na foto maior (${idx + 1} de ${midias.length})" style="position: relative; width: 46px; height: 46px; border-radius: 8px; overflow: hidden; cursor: pointer; flex-shrink: 0; border: ${isSelected ? '2.5px solid #F59E0B' : `1.5px solid ${isV ? '#EC4899' : '#8B5CF6'}`}; box-shadow: ${isSelected ? '0 0 8px rgba(245, 158, 11, 0.65)' : 'none'}; transform: ${isSelected ? 'scale(1.06)' : 'none'}; transition: all 0.18s ease; background: #000;">
                                    ${isV
                                        ? `<video src="${m.url}" preload="metadata" muted playsinline style="width:100%; height:100%; object-fit:cover;"></video><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#fff;background:rgba(0,0,0,0.35);pointer-events:none;">▶</span>`
                                        : `<img src="${m.url}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">`
                                    }
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
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
                    
                    ${galeriaMiniaturasHtml}
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
    const midiasSerializadas = serializarMidiasDesejo(midiasDesejoTemp);
    const currentUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = currentUser ? currentUser.id : (localStorage.getItem('financas_current_user_id') || null);

    if (idEdicao) {
        // Atualizar desejo existente
        let item = await dbLocal.movimentacoes.get(idEdicao);
        if (!item && !isNaN(idEdicao)) item = await dbLocal.movimentacoes.get(Number(idEdicao));
        const targetId = item ? item.id : idEdicao;

        await dbLocal.movimentacoes.update(targetId, {
            descricao: desc,
            valor_total: valor,
            link_url: linkUrl,
            midia_url: midiasSerializadas.midia_url,
            midia_tipo: midiasSerializadas.midia_tipo,
            user_id: currentUserId || (item ? item.user_id : null),
            sync_status: 'pending_update',
            updated_at: timestamp
        });

        showToast('Desejo atualizado com sucesso!');
    } else {
        // Criar novo desejo
        const novoLancamento = {
            id: String(generateUUID()),
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
            midia_url: midiasSerializadas.midia_url,
            midia_tipo: midiasSerializadas.midia_tipo,
            user_id: currentUserId,
            deleted: 0,
            sync_status: 'pending_insert',
            updated_at: timestamp
        };

        await dbLocal.movimentacoes.put(novoLancamento);
        showToast('Desejo adicionado com sucesso!');
    }

    cancelarEdicaoDesejo();
    await carregarListaDesejos();
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

    // Mídias (carrega todas as fotos e vídeos existentes para permitir adicionar mais ou remover individuais)
    midiasDesejoTemp = parseMidiasDesejo(item.midia_url, item.midia_tipo);
    renderizarPreviewMidiaDesejo();

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

    showToast('Desejo carregado para edição no topo. Adicione mais fotos/vídeos ou altere e clique em Salvar.');
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

// ==================================================================
// MÓDULO PLANEJAMENTO DE RENDAS EXTRAS (COM ABATIMENTO ATÉ ZERAR)
// ==================================================================

function parseDadosRendaExtra(item) {
    const padrao = { origem: '', aplicacao: '', gastos: [] };
    if (!item) return padrao;
    const raw = (item.midia_url && String(item.midia_url).trim()) || (item.link_url && String(item.link_url).trim()) || '';
    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw);
            return {
                origem: parsed.origem || '',
                aplicacao: parsed.aplicacao || '',
                gastos: Array.isArray(parsed.gastos) ? parsed.gastos : []
            };
        } catch (e) {}
    }
    return padrao;
}

function serializarDadosRendaExtra(dados) {
    return JSON.stringify({
        origem: (dados && dados.origem) ? String(dados.origem).trim() : '',
        aplicacao: (dados && dados.aplicacao) ? String(dados.aplicacao).trim() : '',
        gastos: (dados && Array.isArray(dados.gastos)) ? dados.gastos : []
    });
}

function formatarMoedaRendaExtra(val) {
    if (window.privacyMode) return '•••••';
    const num = parseFloat(val) || 0;
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Controle de expansão dos cards e formulário de Renda Extra
window.rendasExtrasExpandidas = window.rendasExtrasExpandidas || new Set();

function toggleFormularioRendaExtra(forcarAberto) {
    const container = document.getElementById('containerFormRendaExtra');
    const txtEl = document.getElementById('txtBtnToggleFormRendaExtra');
    const icoEl = document.getElementById('icoBtnToggleFormRendaExtra');
    const btn = document.getElementById('btnToggleFormRendaExtra');
    if (!container) return;

    const estaOculto = container.style.display === 'none' || window.getComputedStyle(container).display === 'none';
    const abrir = forcarAberto !== undefined ? Boolean(forcarAberto) : estaOculto;
    if (abrir) {
        container.style.display = 'block';
        if (txtEl) txtEl.innerText = '✕ Ocultar Cadastro';
        if (icoEl) icoEl.innerText = '▲';
        if (btn) {
            btn.style.background = 'rgba(239, 68, 68, 0.15)';
            btn.style.borderColor = '#EF4444';
            btn.style.color = '#EF4444';
        }
    } else {
        container.style.display = 'none';
        if (txtEl) txtEl.innerText = '➕ Nova Renda Extra';
        if (icoEl) icoEl.innerText = '▼';
        if (btn) {
            btn.style.background = 'rgba(16, 185, 129, 0.15)';
            btn.style.borderColor = '#10B981';
            btn.style.color = '#10B981';
        }
    }
}
window.toggleFormularioRendaExtra = toggleFormularioRendaExtra;

function toggleDetalhesRendaExtra(id) {
    if (!window.rendasExtrasExpandidas) window.rendasExtrasExpandidas = new Set();
    const sid = String(id);
    const elDetalhes = document.getElementById(`detalhesRendaExtra_${sid}`);
    const elBtn = document.getElementById(`btnToggleDetalhes_${sid}`);
    const elTxt = document.getElementById(`txtBtnToggleDetalhes_${sid}`) || document.getElementById(`lblToggleDetalhes_${sid}`);
    const elIco = document.getElementById(`icoToggleDetalhes_${sid}`);

    const estaAberto = elDetalhes ? (elDetalhes.style.display !== 'none') : window.rendasExtrasExpandidas.has(sid);

    if (estaAberto) {
        window.rendasExtrasExpandidas.delete(sid);
        if (elDetalhes) elDetalhes.style.display = 'none';
        if (elTxt) elTxt.innerText = '🔍 Ver Gastos e Detalhes';
        if (elIco) elIco.innerText = '▼';
        if (elBtn) {
            elBtn.style.background = 'rgba(16, 185, 129, 0.15)';
            elBtn.style.borderColor = '#10B981';
            elBtn.style.color = '#10B981';
        }
    } else {
        window.rendasExtrasExpandidas.add(sid);
        if (elDetalhes) elDetalhes.style.display = 'block';
        if (elTxt) elTxt.innerText = '✕ Ocultar Gastos e Detalhes';
        if (elIco) elIco.innerText = '▲';
        if (elBtn) {
            elBtn.style.background = 'rgba(239, 68, 68, 0.15)';
            elBtn.style.borderColor = '#EF4444';
            elBtn.style.color = '#EF4444';
        }
    }
}
window.toggleDetalhesRendaExtra = toggleDetalhesRendaExtra;

async function carregarPlanejamentoRendaExtra() {
    const container = document.getElementById('listaRendasExtrasContainer');
    const resumoBox = document.getElementById('resumoGeralRendaExtra');
    if (!container) return;

    // Conforme solicitado, os 3 cards com totais gerais permanecem ocultos
    if (resumoBox) resumoBox.style.display = 'none';

    const movs = await dbLocal.movimentacoes.toArray();
    const rendas = movs
        .filter(m => m.tipo_gasto === 'Planejamento Renda Extra' && Number(m.deleted || 0) !== 1)
        .sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0));

    container.innerHTML = '';

    if (rendas.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 36px 20px; background: var(--bg-card); border: 1.5px dashed var(--border-color); border-radius: 16px;">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">💰</div>
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Nenhuma Renda Extra planejada ainda</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Clique em <strong>➕ Nova Renda Extra</strong> acima para cadastrar o valor da sua renda extra, de onde veio e onde será aplicada para controlar os gastos até zerar!</div>
            </div>
        `;
        return;
    }

    rendas.forEach(r => {
        const dados = parseDadosRendaExtra(r);
        const valorInicial = parseFloat(r.valor_total) || 0;
        const totalGasto = dados.gastos.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
        const saldoRestante = Math.max(0, valorInicial - totalGasto);
        const excedente = totalGasto > valorInicial ? (totalGasto - valorInicial) : 0;

        const percentualGasto = valorInicial > 0 ? Math.min(100, Math.round((totalGasto / valorInicial) * 100)) : 0;
        const zerou = valorInicial > 0 && saldoRestante <= 0.009;

        let badgeStatusHtml = '';
        let corSaldo = '#10B981';
        let corBarra = 'linear-gradient(90deg, #10B981, #3B82F6)';

        if (excedente > 0.009) {
            badgeStatusHtml = `<span style="background: rgba(239, 68, 68, 0.2); border: 1px solid #EF4444; color: #FCA5A5; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;">⚠️ Ultrapassou em ${formatarMoedaRendaExtra(excedente)}</span>`;
            corSaldo = '#EF4444';
            corBarra = 'linear-gradient(90deg, #F59E0B, #EF4444)';
        } else if (zerou) {
            badgeStatusHtml = `<span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #34D399; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;">✅ Saldo Zerado (100% Aplicado)</span>`;
            corSaldo = '#34D399';
            corBarra = 'linear-gradient(90deg, #10B981, #059669)';
        } else if (totalGasto > 0) {
            badgeStatusHtml = `<span style="background: rgba(245, 158, 11, 0.18); border: 1px solid #F59E0B; color: #FCD34D; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;">⏳ Em Uso (${percentualGasto}% utilizado)</span>`;
            corSaldo = '#38BDF8';
            corBarra = 'linear-gradient(90deg, #3B82F6, #F59E0B)';
        } else {
            badgeStatusHtml = `<span style="background: rgba(59, 130, 246, 0.18); border: 1px solid #3B82F6; color: #93C5FD; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 999px;">💎 100% Disponível</span>`;
        }

        // Verifica se este card está expandido pelo usuário
        const estaAberto = Boolean(window.rendasExtrasExpandidas && window.rendasExtrasExpandidas.has(String(r.id)));

        // Monta histórico de gastos desta renda extra com abatimento progressivo
        let saldoAcumulado = valorInicial;
        const listaGastosHtml = dados.gastos.length === 0
            ? `<div style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.82rem; background: var(--bg-secondary); border-radius: 8px; border: 1px dashed var(--border-color);">Nenhum gasto lançado ainda nesta renda extra. Lance abaixo conforme for gastando!</div>`
            : dados.gastos.map((g, idx) => {
                const vGasto = parseFloat(g.valor) || 0;
                saldoAcumulado = Math.max(0, saldoAcumulado - vGasto);
                const dataGastoBr = g.data ? g.data.split('-').reverse().join('/') : '';
                return `
                    <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-left: 3.5px solid #F59E0B; border-radius: 10px;">
                        <!-- Linha 1: Descrição e Data à esquerda, Valor à direita -->
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem; display: flex; align-items: center; gap: 6px; min-width: 0;">
                                <span style="color: #F59E0B; font-size: 0.78rem; font-weight: 800; flex-shrink: 0;">#${idx + 1}</span>
                                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${g.descricao || 'Gasto'}</span>
                                ${dataGastoBr ? `<span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 600; flex-shrink: 0;">(${dataGastoBr})</span>` : ''}
                            </div>
                            <div style="font-weight: 800; color: #EF4444; font-size: 0.95rem; white-space: nowrap; flex-shrink: 0;">
                                - ${formatarMoedaRendaExtra(vGasto)}
                            </div>
                        </div>
                        <!-- Linha 2: Saldo restante à esquerda, Botões de Ação à direita -->
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px dashed var(--border-color); padding-top: 6px;">
                            <div style="font-size: 0.74rem; color: var(--text-secondary); white-space: nowrap;">
                                Saldo após este gasto: <strong style="color: #0284C7;">${formatarMoedaRendaExtra(saldoAcumulado)}</strong>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                <button type="button" onclick="editarGastoRendaExtra('${r.id}', '${g.id}')" title="Editar este gasto" style="background: rgba(59, 130, 246, 0.15); border: 1px solid #3B82F6; color: #3B82F6; padding: 4px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    ✏️ Editar
                                </button>
                                <button type="button" onclick="excluirGastoRendaExtra('${r.id}', '${g.id}')" title="Excluir este gasto e devolver ao saldo" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #EF4444; color: #EF4444; padding: 4px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    🗑️ Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        const card = document.createElement('div');
        card.style.cssText = 'background: var(--bg-card); border: 1.5px solid var(--border-color); border-left: 5px solid #10B981; border-radius: 16px; padding: 16px; margin-bottom: 16px; box-shadow: var(--shadow-sm, 0 6px 20px rgba(0,0,0,0.28));';

        card.innerHTML = `
            <!-- Cabeçalho da Renda Extra: Título e Ações na mesma linha -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">💰 ${r.descricao || 'Renda Extra'}</h3>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
                    <button type="button" onclick="editarRendaExtraNoFormulario('${r.id}')" style="background: rgba(59, 130, 246, 0.15); border: 1px solid #3B82F6; color: #3B82F6; padding: 5px 10px; border-radius: 8px; font-size: 0.76rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        ✏️ Editar
                    </button>
                    <button type="button" onclick="excluirRendaExtra('${r.id}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #EF4444; color: #EF4444; padding: 5px 9px; border-radius: 8px; font-size: 0.76rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        🗑️ Excluir
                    </button>
                </div>
            </div>

            <!-- Linha com Badge de Status (Saldo Zerado 100% Aplicado / Em Uso / Disponível) -->
            <div style="margin-bottom: 8px;">
                <div style="display: inline-block;">${badgeStatusHtml}</div>
            </div>

            <!-- Botão Filtro posicionado ABAIXO da escrita de Saldo Zerado / Status -->
            <div style="margin-bottom: 10px;">
                <button type="button" id="btnToggleDetalhes_${r.id}" onclick="toggleDetalhesRendaExtra('${r.id}')" style="background: ${estaAberto ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; border: 1.5px solid ${estaAberto ? '#EF4444' : '#10B981'}; color: ${estaAberto ? '#EF4444' : '#10B981'}; padding: 8px 14px; border-radius: 9px; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s ease;">
                    <span id="icoToggleDetalhes_${r.id}" style="font-size: 0.76rem;">${estaAberto ? '▲' : '▼'}</span>
                    <span id="txtBtnToggleDetalhes_${r.id}">${estaAberto ? '✕ Ocultar Gastos e Detalhes' : '🔍 Ver Gastos e Detalhes'}</span>
                    <span style="font-size: 0.72rem; opacity: 0.85; margin-left: 2px;">(${dados.gastos.length} ${dados.gastos.length === 1 ? 'gasto' : 'gastos'})</span>
                </button>
            </div>

            <!-- Informações e Gastos abaixo da escrita que abrem/fecham ao clicar no filtro -->
            <div id="detalhesRendaExtra_${r.id}" style="display: ${estaAberto ? 'block' : 'none'}; border-top: 1px dashed var(--border-color); padding-top: 12px; margin-top: 4px;">
                <!-- Origem / Destino -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
                    <span style="background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); color: #3B82F6; font-size: 0.74rem; font-weight: 700; padding: 5px 8px; border-radius: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        👤 De onde veio: <strong>${dados.origem || 'Não inf.'}</strong>
                    </span>
                    <span style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #D97706; font-size: 0.74rem; font-weight: 700; padding: 5px 8px; border-radius: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        🎯 Onde aplicar: <strong>${dados.aplicacao || 'Uso Geral'}</strong>
                    </span>
                </div>

                <!-- Painel de Valores: 3 Colunas na Mesma Linha -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 6px; text-align: center; min-width: 0;">
                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Renda Extra</div>
                        <div style="font-size: 0.95rem; font-weight: 800; color: #10B981; margin-top: 2px; white-space: nowrap;">${formatarMoedaRendaExtra(valorInicial)}</div>
                    </div>
                    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 8px 6px; text-align: center; min-width: 0;">
                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Total Gasto</div>
                        <div style="font-size: 0.95rem; font-weight: 800; color: #F59E0B; margin-top: 2px; white-space: nowrap;">- ${formatarMoedaRendaExtra(totalGasto)}</div>
                    </div>
                    <div style="background: var(--bg-secondary); border: 1.5px solid ${corSaldo}; border-radius: 10px; padding: 8px 6px; text-align: center; min-width: 0;">
                        <div style="font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Saldo Restante</div>
                        <div style="font-size: 1rem; font-weight: 900; color: ${corSaldo}; margin-top: 2px; white-space: nowrap;">${formatarMoedaRendaExtra(saldoRestante)}</div>
                    </div>
                </div>

                <!-- Barra de Progresso do Saldo -->
                <div style="width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 999px; overflow: hidden; margin-bottom: 12px; border: 1px solid var(--border-color);">
                    <div style="width: ${window.privacyMode ? 0 : percentualGasto}%; height: 100%; background: ${corBarra}; transition: width 0.3s ease;"></div>
                </div>

                <!-- Sub-formulário para Lançar / Editar o que vai ser gasto nesta Renda Extra -->
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
                    <div id="lblTituloFormGasto_${r.id}" style="font-size: 0.78rem; font-weight: 800; color: #0284C7; margin-bottom: 8px;">
                        <span>💸 Lançar gasto desta Renda Extra (Abater do Saldo):</span>
                    </div>
                    <input type="hidden" id="idGastoRendaEmEdicao_${r.id}" value="">
                    
                    <!-- Inputs em Linha Única -->
                    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="inputGastoRendaDesc_${r.id}" placeholder="O que vai ser gasto? (Ex: Material...)" style="width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); font-size: 0.85rem;">
                        <input type="text" inputmode="numeric" id="inputGastoRendaValor_${r.id}" class="input-gasto-renda-extra-mask" placeholder="R$ 0,00" style="width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1px solid #F59E0B; border-radius: 8px; background: var(--bg-card); color: #D97706; font-weight: 800; font-size: 0.88rem;">
                    </div>

                    <!-- Botões Alinhados Ocupando 100% da Linha -->
                    <div style="display: flex; gap: 8px; width: 100%;">
                        <button type="button" id="btnSalvarGastoRenda_${r.id}" onclick="salvarGastoRendaExtra('${r.id}')" style="flex: 2; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; border: none; padding: 10px 12px; border-radius: 8px; font-weight: 800; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap;">
                            + Abater Gasto
                        </button>
                        <button type="button" id="btnExcluirGastoRenda_${r.id}" onclick="excluirGastoRendaExtraEmEdicao('${r.id}')" style="display: none; flex: 1; background: rgba(239, 68, 68, 0.18); border: 1px solid #EF4444; color: #EF4444; padding: 10px 10px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
                            🗑️ Excluir
                        </button>
                        <button type="button" id="btnCancelarGastoRenda_${r.id}" onclick="cancelarEdicaoGastoRendaExtra('${r.id}')" style="flex: 1; background: var(--bg-card); border: 1.5px solid var(--border-color); color: var(--text-primary); padding: 10px 10px; border-radius: 8px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
                            ✕ Limpar
                        </button>
                    </div>
                </div>

                <!-- Lista de Gastos Abatidos -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-size: 0.74rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px;">
                        Histórico de Gastos / Aplicações (${dados.gastos.length})
                    </div>
                    ${listaGastosHtml}
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    // Aplica máscara monetária nos campos dinâmicos de gasto de cada Renda Extra
    document.querySelectorAll('.input-gasto-renda-extra-mask').forEach(el => {
        aplicarMascaraMoedaEmElemento(el);
    });
}
window.carregarPlanejamentoRendaExtra = carregarPlanejamentoRendaExtra;

// Salvar Renda Extra (Nova ou Edição)
async function salvarRendaExtraFormulario() {
    const descEl = document.getElementById('inputRendaExtraDesc');
    const valorEl = document.getElementById('inputRendaExtraValor');
    const origemEl = document.getElementById('inputRendaExtraOrigem');
    const aplicacaoEl = document.getElementById('inputRendaExtraAplicacao');
    const idInput = document.getElementById('idRendaExtraEmEdicao');

    const desc = descEl ? descEl.value.trim() : '';
    const valor = valorEl ? desformatarMoedaInput(valorEl.value) : 0;
    const origem = origemEl ? origemEl.value.trim() : '';
    const aplicacao = aplicacaoEl ? aplicacaoEl.value.trim() : '';
    const idEdicao = idInput ? idInput.value.trim() : '';

    if (!desc || isNaN(valor) || valor <= 0) {
        alert('Por favor, informe do que é a Renda Extra e o valor em R$.');
        return;
    }

    const timestamp = Date.now();
    const currentUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = currentUser ? currentUser.id : (localStorage.getItem('financas_current_user_id') || null);

    if (idEdicao) {
        let item = await dbLocal.movimentacoes.get(idEdicao);
        if (!item && !isNaN(idEdicao)) item = await dbLocal.movimentacoes.get(Number(idEdicao));
        if (!item) {
            const all = await dbLocal.movimentacoes.toArray();
            item = all.find(m => String(m.id) === String(idEdicao));
        }
        const targetId = item ? item.id : idEdicao;
        const dadosAtuais = parseDadosRendaExtra(item);
        dadosAtuais.origem = origem;
        dadosAtuais.aplicacao = aplicacao;

        const totalGasto = dadosAtuais.gastos.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
        const novoStatus = totalGasto >= valor ? 'Pago' : 'Pendente';

        await dbLocal.movimentacoes.update(targetId, {
            descricao: desc,
            valor_total: valor,
            valor_realizado: totalGasto,
            status: novoStatus,
            midia_url: serializarDadosRendaExtra(dadosAtuais),
            midia_tipo: 'renda_extra_json',
            user_id: currentUserId || (item ? item.user_id : null),
            sync_status: 'pending_update',
            updated_at: timestamp
        });

        showToast('Planejamento de Renda Extra atualizado com sucesso!');
    } else {
        const dadosIniciais = {
            origem: origem,
            aplicacao: aplicacao,
            gastos: []
        };

        const novaRendaExtra = {
            id: String(generateUUID()),
            descricao: desc,
            valor_total: valor,
            valor_realizado: 0,
            data_lancamento: new Date().toISOString().split('T')[0],
            tipo_gasto: 'Planejamento Renda Extra',
            status: 'Pendente',
            conta_id: '1',
            parcelado: 'Não',
            total_parcelas: 1,
            parcela_atual: 1,
            id_grupo: '',
            link_url: '',
            midia_url: serializarDadosRendaExtra(dadosIniciais),
            midia_tipo: 'renda_extra_json',
            user_id: currentUserId,
            deleted: 0,
            sync_status: 'pending_insert',
            updated_at: timestamp
        };

        await dbLocal.movimentacoes.put(novaRendaExtra);
        showToast('Renda Extra cadastrada! Agora você pode lançar os gastos para abater do saldo.');
    }

    cancelarEdicaoRendaExtra();
    await carregarPlanejamentoRendaExtra();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.salvarRendaExtraFormulario = salvarRendaExtraFormulario;

// Carregar Renda Extra no Formulário do Topo para Edição
async function editarRendaExtraNoFormulario(id) {
    if (!id) return;
    toggleFormularioRendaExtra(true);
    let item = await dbLocal.movimentacoes.get(id);
    if (!item && !isNaN(id)) item = await dbLocal.movimentacoes.get(Number(id));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(id));
    }
    if (!item) {
        showToast('Renda Extra não encontrada.');
        return;
    }

    const dados = parseDadosRendaExtra(item);

    const idInput = document.getElementById('idRendaExtraEmEdicao');
    if (idInput) idInput.value = item.id;

    const descEl = document.getElementById('inputRendaExtraDesc');
    if (descEl) descEl.value = item.descricao || '';

    const valorEl = document.getElementById('inputRendaExtraValor');
    if (valorEl) setarValorMoedaInput(valorEl, item.valor_total || 0);

    const origemEl = document.getElementById('inputRendaExtraOrigem');
    if (origemEl) origemEl.value = dados.origem || '';

    const aplicacaoEl = document.getElementById('inputRendaExtraAplicacao');
    if (aplicacaoEl) aplicacaoEl.value = dados.aplicacao || '';

    const btnSalvar = document.getElementById('btnSalvarRendaExtra');
    if (btnSalvar) btnSalvar.innerHTML = '💾 Salvar Alterações';

    const btnExcluir = document.getElementById('btnExcluirRendaExtraForm');
    if (btnExcluir) btnExcluir.style.display = 'flex';

    if (descEl) {
        descEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => descEl.focus(), 250);
    }

    showToast('Renda Extra carregada para edição no topo.');
}
window.editarRendaExtraNoFormulario = editarRendaExtraNoFormulario;

// Cancelar Edição / Limpar Formulário de Renda Extra
function cancelarEdicaoRendaExtra() {
    const idInput = document.getElementById('idRendaExtraEmEdicao');
    if (idInput) idInput.value = '';

    ['inputRendaExtraDesc', 'inputRendaExtraValor', 'inputRendaExtraOrigem', 'inputRendaExtraAplicacao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const btnSalvar = document.getElementById('btnSalvarRendaExtra');
    if (btnSalvar) btnSalvar.innerHTML = '💾 Salvar Renda Extra';

    const btnExcluir = document.getElementById('btnExcluirRendaExtraForm');
    if (btnExcluir) btnExcluir.style.display = 'none';
}
window.cancelarEdicaoRendaExtra = cancelarEdicaoRendaExtra;

// Excluir Renda Extra que está em edição no formulário
async function excluirRendaExtraEmEdicao() {
    const idInput = document.getElementById('idRendaExtraEmEdicao');
    const id = idInput ? idInput.value : '';
    if (!id) return;
    await excluirRendaExtra(id);
}
window.excluirRendaExtraEmEdicao = excluirRendaExtraEmEdicao;

// Excluir Renda Extra
async function excluirRendaExtra(id) {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este Planejamento de Renda Extra e seus gastos?')) return;

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
        await dbLocal.movimentacoes.update(targetId, {
            deleted: 1,
            sync_status: 'pending_update',
            updated_at: timestamp
        });
    } else {
        await dbLocal.movimentacoes.delete(targetId);
    }

    const idInput = document.getElementById('idRendaExtraEmEdicao');
    if (idInput && String(idInput.value) === String(id)) {
        cancelarEdicaoRendaExtra();
    }

    showToast('Renda Extra excluída com sucesso!');
    await carregarPlanejamentoRendaExtra();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.excluirRendaExtra = excluirRendaExtra;

// Salvar (ou Atualizar) um Gasto / Abatimento dentro de uma Renda Extra
async function salvarGastoRendaExtra(rendaId) {
    if (!rendaId) return;
    const descEl = document.getElementById(`inputGastoRendaDesc_${rendaId}`);
    const valorEl = document.getElementById(`inputGastoRendaValor_${rendaId}`);
    const idGastoEl = document.getElementById(`idGastoRendaEmEdicao_${rendaId}`);

    const desc = descEl ? descEl.value.trim() : '';
    const valor = valorEl ? desformatarMoedaInput(valorEl.value) : 0;
    const gastoIdEdicao = idGastoEl ? idGastoEl.value.trim() : '';

    if (!desc || isNaN(valor) || valor <= 0) {
        alert('Informe o que vai ser gasto e o valor em R$ para abater da Renda Extra.');
        return;
    }

    let item = await dbLocal.movimentacoes.get(rendaId);
    if (!item && !isNaN(rendaId)) item = await dbLocal.movimentacoes.get(Number(rendaId));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(rendaId));
    }
    if (!item) {
        showToast('Renda Extra não encontrada.');
        return;
    }

    const dados = parseDadosRendaExtra(item);

    if (gastoIdEdicao) {
        const idx = dados.gastos.findIndex(g => String(g.id) === String(gastoIdEdicao));
        if (idx !== -1) {
            dados.gastos[idx].descricao = desc;
            dados.gastos[idx].valor = valor;
        }
    } else {
        dados.gastos.push({
            id: 'g_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            descricao: desc,
            valor: valor,
            data: new Date().toISOString().split('T')[0]
        });
    }

    const totalGasto = dados.gastos.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
    const valorRenda = parseFloat(item.valor_total) || 0;
    const novoStatus = totalGasto >= valorRenda ? 'Pago' : 'Pendente';
    const timestamp = Date.now();

    await dbLocal.movimentacoes.update(item.id, {
        valor_realizado: totalGasto,
        status: novoStatus,
        midia_url: serializarDadosRendaExtra(dados),
        midia_tipo: 'renda_extra_json',
        sync_status: 'pending_update',
        updated_at: timestamp
    });

    const saldoRestante = Math.max(0, valorRenda - totalGasto);
    if (saldoRestante <= 0.009) {
        showToast('✅ Gasto registrado! O saldo desta Renda Extra chegou a R$ 0,00 (Zerado)!');
    } else {
        showToast(gastoIdEdicao ? 'Gasto atualizado! Saldo recalculado.' : 'Gasto abatido do saldo da Renda Extra!');
    }

    if (!window.rendasExtrasExpandidas) window.rendasExtrasExpandidas = new Set();
    window.rendasExtrasExpandidas.add(String(rendaId));

    await carregarPlanejamentoRendaExtra();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.salvarGastoRendaExtra = salvarGastoRendaExtra;

// Carregar um Gasto da Renda Extra para Edição
async function editarGastoRendaExtra(rendaId, gastoId) {
    if (!rendaId || !gastoId) return;
    if (!window.rendasExtrasExpandidas) window.rendasExtrasExpandidas = new Set();
    window.rendasExtrasExpandidas.add(String(rendaId));
    let item = await dbLocal.movimentacoes.get(rendaId);
    if (!item && !isNaN(rendaId)) item = await dbLocal.movimentacoes.get(Number(rendaId));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(rendaId));
    }
    if (!item) return;

    const dados = parseDadosRendaExtra(item);
    const gasto = dados.gastos.find(g => String(g.id) === String(gastoId));
    if (!gasto) return;

    const idGastoEl = document.getElementById(`idGastoRendaEmEdicao_${rendaId}`);
    const descEl = document.getElementById(`inputGastoRendaDesc_${rendaId}`);
    const valorEl = document.getElementById(`inputGastoRendaValor_${rendaId}`);
    const btnSalvar = document.getElementById(`btnSalvarGastoRenda_${rendaId}`);
    const btnExcluir = document.getElementById(`btnExcluirGastoRenda_${rendaId}`);
    const lblTitulo = document.getElementById(`lblTituloFormGasto_${rendaId}`);

    if (idGastoEl) idGastoEl.value = gasto.id;
    if (descEl) {
        descEl.value = gasto.descricao || '';
        descEl.focus();
    }
    if (valorEl) setarValorMoedaInput(valorEl, gasto.valor || 0);
    if (btnSalvar) btnSalvar.innerHTML = '💾 Salvar Gasto';
    if (btnExcluir) btnExcluir.style.display = 'inline-flex';
    if (lblTitulo) lblTitulo.innerHTML = `<span style="color: #FCD34D;">✏️ Editando gasto: "${gasto.descricao}"</span>`;
}
window.editarGastoRendaExtra = editarGastoRendaExtra;

// Cancelar Edição / Limpar campos de Gasto da Renda Extra
function cancelarEdicaoGastoRendaExtra(rendaId) {
    const idGastoEl = document.getElementById(`idGastoRendaEmEdicao_${rendaId}`);
    const descEl = document.getElementById(`inputGastoRendaDesc_${rendaId}`);
    const valorEl = document.getElementById(`inputGastoRendaValor_${rendaId}`);
    const btnSalvar = document.getElementById(`btnSalvarGastoRenda_${rendaId}`);
    const btnExcluir = document.getElementById(`btnExcluirGastoRenda_${rendaId}`);
    const lblTitulo = document.getElementById(`lblTituloFormGasto_${rendaId}`);

    if (idGastoEl) idGastoEl.value = '';
    if (descEl) descEl.value = '';
    if (valorEl) valorEl.value = '';
    if (btnSalvar) btnSalvar.innerHTML = '+ Abater Gasto';
    if (btnExcluir) btnExcluir.style.display = 'none';
    if (lblTitulo) lblTitulo.innerHTML = `<span>💸 Lançar o que vai ser gasto desta Renda Extra (Abater do Saldo):</span>`;
}
window.cancelarEdicaoGastoRendaExtra = cancelarEdicaoGastoRendaExtra;

// Excluir Gasto em Edição na Renda Extra
async function excluirGastoRendaExtraEmEdicao(rendaId) {
    const idGastoEl = document.getElementById(`idGastoRendaEmEdicao_${rendaId}`);
    const gastoId = idGastoEl ? idGastoEl.value : '';
    if (!gastoId) return;
    await excluirGastoRendaExtra(rendaId, gastoId);
}
window.excluirGastoRendaExtraEmEdicao = excluirGastoRendaExtraEmEdicao;

// Excluir um Gasto específico da Renda Extra (devolvendo o valor ao saldo restante)
async function excluirGastoRendaExtra(rendaId, gastoId) {
    if (!rendaId || !gastoId) return;
    if (!confirm('Deseja excluir este gasto e devolver o valor ao saldo disponível da Renda Extra?')) return;

    let item = await dbLocal.movimentacoes.get(rendaId);
    if (!item && !isNaN(rendaId)) item = await dbLocal.movimentacoes.get(Number(rendaId));
    if (!item) {
        const all = await dbLocal.movimentacoes.toArray();
        item = all.find(m => String(m.id) === String(rendaId));
    }
    if (!item) return;

    const dados = parseDadosRendaExtra(item);
    dados.gastos = dados.gastos.filter(g => String(g.id) !== String(gastoId));

    const totalGasto = dados.gastos.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);
    const valorRenda = parseFloat(item.valor_total) || 0;
    const novoStatus = totalGasto >= valorRenda ? 'Pago' : 'Pendente';
    const timestamp = Date.now();

    await dbLocal.movimentacoes.update(item.id, {
        valor_realizado: totalGasto,
        status: novoStatus,
        midia_url: serializarDadosRendaExtra(dados),
        midia_tipo: 'renda_extra_json',
        sync_status: 'pending_update',
        updated_at: timestamp
    });

    if (!window.rendasExtrasExpandidas) window.rendasExtrasExpandidas = new Set();
    window.rendasExtrasExpandidas.add(String(rendaId));

    showToast('Gasto excluído! O valor voltou para o saldo da Renda Extra.');
    await carregarPlanejamentoRendaExtra();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.excluirGastoRendaExtra = excluirGastoRendaExtra;

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
    if (!window.currentFaturaItens || window.currentFaturaItens.length === 0) {
        showToast('Nenhum item pendente na fatura encontrado.');
        return;
    }

    const totalFatura = window.currentFaturaTotal || 0;
    const formatBRL = (v) => 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');

    const contasCorrentes = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1 && c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação').toArray();

    let contaDebito = null;
    if (contasCorrentes.length > 0) {
        let mensagemPrompt = `💳 PAGAMENTO DE FATURA - ${window.currentFaturaMes || 'Mês Atual'}\n\n`;
        mensagemPrompt += `Valor Total da Fatura: ${formatBRL(totalFatura)}\n\n`;
        mensagemPrompt += `Escolha qual conta bancária debitará o pagamento:\n`;
        contasCorrentes.forEach((cc, idx) => {
            mensagemPrompt += `${idx + 1} - ${cc.nome_conta} (Saldo: ${formatBRL(cc.saldo_atual || 0)})\n`;
        });
        mensagemPrompt += `\nDigite o número da conta (ou deixe em branco para pagar sem debitar de conta):`;

        const escolha = prompt(mensagemPrompt, "1");
        if (escolha === null) return; // Cancelou

        const idxEscolhido = parseInt(escolha.trim(), 10) - 1;
        if (!isNaN(idxEscolhido) && idxEscolhido >= 0 && idxEscolhido < contasCorrentes.length) {
            contaDebito = contasCorrentes[idxEscolhido];
        }
    } else {
        if (!confirm(`Deseja pagar a fatura de ${formatBRL(totalFatura)}? Isso marcará todos os itens do cartão como Pagos.`)) return;
    }

    const timestamp = Date.now();

    if (contaDebito) {
        const novoSaldo = (parseFloat(contaDebito.saldo_atual) || 0) - totalFatura;
        await dbLocal.contas_bancarias.update(contaDebito.id, {
            saldo_atual: novoSaldo,
            sync_status: 'pending_update',
            updated_at: timestamp
        });
        console.log(`[PAGAR FATURA COMPLETA] Debitado ${totalFatura} de ${contaDebito.nome_conta}. Novo saldo: ${novoSaldo}`);
    }

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

    showToast(`✓ Fatura de ${formatBRL(totalFatura)} paga com sucesso!`);
    fecharModalFatura();
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
    carregarPlanejamento();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
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
    renderizarSelectCategorias();
    renderizarSelectTiposGasto();
    if (typeof carregarSelectContasModal === 'function') carregarSelectContasModal();
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
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
    
    // Os gastos do Cartão Alimentação e do Cartão de Crédito são gerenciados exclusivamente pelos cards dedicados
    let itens = (window.currentMesItens || []).filter(i => i.tipo_gasto !== 'Cartão Alimentação' && i.tipo_gasto !== 'Cartão de Crédito');
    if (window.extratoFiltroAtual === 'receitas') {
        itens = itens.filter(i => i.tipo_gasto === 'Receita' || i.tipo_gasto === 'Resgate de Reserva');
    } else if (window.extratoFiltroAtual === 'despesas') {
        itens = itens.filter(i => i.tipo_gasto !== 'Receita' && i.tipo_gasto !== 'Resgate de Reserva' && i.tipo_gasto !== 'Transferência Interna');
    } else if (window.extratoFiltroAtual === 'investimentos') {
        itens = itens.filter(i => i.tipo_gasto === 'Investimento');
    } else if (window.extratoFiltroAtual === 'reserva') {
        itens = itens.filter(i => i.tipo_gasto === 'Reserva de Emergência');
    }
    
    container.innerHTML = '';

    // Total de compras no Cartão de Crédito deste mês (Requisito 1: Total de compras feitas no cartão naquele mês)
    const comprasCartaoMes = (window.currentMesItens || []).filter(i => i.tipo_gasto === 'Cartão de Crédito' && i.status !== 'Cancelado');
    const totalComprasCartaoMes = comprasCartaoMes.reduce((acc, i) => acc + (parseFloat(i.valor_realizado) > 0 ? parseFloat(i.valor_realizado) : (parseFloat(i.valor_total) || 0)), 0);
    const totalComprasCartaoFmt = window.privacyMode ? '•••••' : totalComprasCartaoMes.toFixed(2).replace('.', ',');

    if (comprasCartaoMes.length > 0 && (!window.extratoFiltroAtual || window.extratoFiltroAtual === 'todos' || window.extratoFiltroAtual === 'despesas')) {
        const bannerCartao = document.createElement('div');
        bannerCartao.style.cssText = 'background: var(--bg-secondary); border: 1.5px solid #3B82F6; border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 14px rgba(37,99,235,0.12);';
        bannerCartao.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem;">💳</span>
                <div>
                    <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-primary);">Total de Compras no Cartão de Crédito deste Mês</div>
                    <div style="font-size: 0.76rem; color: #3B82F6; font-weight: 600; margin-top: 2px;">
                        ${comprasCartaoMes.length} compra(s) na fatura &bull; Cada fatura mensal é descontada na receita
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="text-align: right;">
                    <div style="font-size: 0.70rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">Total no Mês</div>
                    <div style="font-size: 1.25rem; font-weight: 900; color: #EF4444;">- R$ ${totalComprasCartaoFmt}</div>
                </div>
                <button type="button" onclick="if(typeof switchFinanceTab === 'function') switchFinanceTab('cartoes')" style="background: #2563EB; border: none; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                    <span>🔍</span> Ver Cartões
                </button>
            </div>
        `;
        container.appendChild(bannerCartao);
    }
    
    if (itens.length === 0) {
        if (comprasCartaoMes.length > 0 && (!window.extratoFiltroAtual || window.extratoFiltroAtual === 'todos' || window.extratoFiltroAtual === 'despesas')) {
            container.innerHTML += '<p style="text-align:center; color:#94A3B8; padding: 2rem 1rem; font-size: 0.88rem;">Não há outras despesas ou receitas avulsas neste mês.<br><span style="font-size: 0.80rem; color: #64748B;">As compras do cartão estão consolidadas no card acima e detalhadas na aba <strong>Cartões & Bancos</strong>.</span></p>';
        } else {
            container.innerHTML += '<p style="text-align:center; color:#94A3B8; padding: 2.5rem 1rem;">Nenhum lançamento encontrado para os filtros selecionados.</p>';
        }
        return;
    }
    
    const getValorComparacao = (item) => {
        const vr = parseFloat(item.valor_realizado) || 0;
        const vo = parseFloat(item.valor_total) || 0;
        return vr > 0 ? vr : vo;
    };

    const isReceita = (i) => (i.tipo_gasto === 'Receita' || isTipoResgateReserva(i));

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
        
        const isParcelado = item.parcelado === 'Sim' || (parseInt(item.total_parcelas, 10) > 1);
        const totalParcelas = parseInt(item.total_parcelas, 10) || 1;
        const parcelaAtual = parseInt(item.parcela_atual || item.numero_parcela, 10) || 1;
        const valParcelaFloat = parseFloat(item.valor_realizado) > 0 ? parseFloat(item.valor_realizado) : (parseFloat(item.valor_total) || 0);
        const valorTotalCompra = valParcelaFloat * totalParcelas;
        const valorTotalCompraFmt = window.privacyMode ? '•••••' : valorTotalCompra.toFixed(2).replace('.', ',');

        const tagCancelado = item.status === 'Cancelado' ? '<span class="badge" style="background:#FEE2E2; color:#EF4444; margin-left: 6px;">Cancelado</span>' : '';
        const tagStatus = item.status === 'Pago' ? '<span class="badge" style="background:rgba(16,185,129,0.2); color:#10B981; margin-left: 6px;">Pago</span>' :
                          (item.status === 'Pendente' ? '<span class="badge" style="background:rgba(245,158,11,0.2); color:#F59E0B; margin-left: 6px;">Pendente</span>' : '');
        
        // Exibição clara do total da compra quando parcelado (Requisito 1)
        const tagParcela = isParcelado ? `<span class="badge" style="margin-left: 6px; background: rgba(139, 92, 246, 0.2); color: #C084FC; font-weight: 700;">🏷️ Parc. ${parcelaAtual}/${totalParcelas} • Total da Compra: R$ ${valorTotalCompraFmt}</span>` : '';
        const tagComprovante = item.midia_url ? `<button type="button" onclick="event.stopPropagation(); abrirModalVisualizarComprovante('${item.midia_url}')" style="background: rgba(59, 130, 246, 0.18); border: 1px solid #3B82F6; color: #93C5FD; padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin-left: 6px;" title="Ver Comprovante Anexado">📷 Comprovante</button>` : '';
        
        const btnActions = item.isVirtual ? 
            `<p style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px; font-weight:500;">Projeção de parcelamento. Edite no mês da 1ª parcela.</p>` :
            `<div style="display:flex; gap:8px; margin-top:8px;">
                <button onclick="editarLancamento('${item.id}')" class="btn-card-action-edit" style="background:var(--bg-secondary); border:1px solid var(--border-color); color:#60A5FA; padding:5px 12px; border-radius:7px; font-size:0.78rem; cursor:pointer; font-weight:700;">Editar</button>
                <button onclick="excluirLancamento('${item.id}')" class="btn-card-action-delete" style="background:var(--bg-secondary); border:1px solid var(--border-color); color:#EF4444; padding:5px 12px; border-radius:7px; font-size:0.78rem; cursor:pointer; font-weight:700;">Excluir</button>
            </div>`;

        const vOrcado = window.privacyMode ? '•••••' : parseFloat(item.valor_total || 0).toFixed(2).replace('.', ',');
        const vRealizado = window.privacyMode ? '•••••' : parseFloat(item.valor_realizado || 0).toFixed(2).replace('.', ',');

        const isReserva = isTipoReservaEmergencia(item);
        const isInvestimento = (item.tipo_gasto === 'Investimento');
        const isTransf = (item.tipo_gasto === 'Transferência Interna');

        let borderLeftColor = '#EF4444';
        let iconCat = '📤';
        let corValor = '#EF4444';
        let sinalValor = '-';

        if (itemIsReceita) {
            borderLeftColor = '#10B981';
            iconCat = '📥';
            corValor = '#10B981';
            sinalValor = '+';
        } else if (isTransf) {
            borderLeftColor = '#06B6D4';
            iconCat = '🔄';
            corValor = '#38BDF8';
            sinalValor = '⇄ ';
        } else if (item.tipo_gasto === 'Cartão Alimentação') {
            borderLeftColor = '#F97316';
            iconCat = '🍽️';
            corValor = '#FB923C';
            sinalValor = '-';
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
        div.style.borderLeft = '5px solid ' + borderLeftColor;

        let infoContaBadge = '';
        if (item.conta_id === 'DINHEIRO') {
            infoContaBadge = ' • <span style="color:#10B981; font-weight:700;">💵 Dinheiro</span>';
        } else if (item.conta_id && item.conta_id !== '1' && window._cacheContasMap) {
            const cObj = window._cacheContasMap.get(String(item.conta_id));
            if (cObj) {
                const nCurto = (cObj.nome_conta || cObj.banco || 'Conta').replace(/\b(Conta\s+Corrente|Conta\s+Poupan[cç]a|Cart[aã]o\s+Alimenta[cç][aã]o|Cart[aã]o\s+de\s+Cr[eé]dito)\b/gi, '').trim();
                const titCurto = cObj.titular ? ` (${cObj.titular})` : '';
                infoContaBadge = ` • <span style="color:#3B82F6; font-weight:700;">🏦 ${nCurto}${titCurto}</span>`;
            }
        }

        const subInfoTipo = (item.tipo_gasto === 'Cartão Alimentação') 
            ? `<span style="color:#FB923C; font-weight:700;">🍽️ Cartão Alimentação</span>${infoContaBadge}` 
            : `${item.tipo_gasto || 'Geral'}${infoContaBadge}`;

        const labelPrevisto = (item.tipo_gasto === 'Cartão Alimentação')
            ? `Previsto: R$ ${vOrcado} (Saldo do Cartão)`
            : (isParcelado
                ? `Previsto Parcela: R$ ${vOrcado} (Total da Compra: R$ ${valorTotalCompraFmt})`
                : `Previsto: R$ ${vOrcado}`);

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div class="card-details">
                    <h4 style="display:flex; align-items:center; gap:6px; font-size: 0.96rem; color:var(--text-primary); font-weight:700; flex-wrap: wrap;">
                        <span>${iconCat}</span>
                        ${item.descricao} ${tagCancelado} ${tagStatus} ${tagComprovante}
                    </h4>
                    <p style="color:var(--text-secondary); font-size:0.82rem; margin-top:3px; font-weight:500;">
                        ${dataBr} • ${subInfoTipo} &nbsp; ${tagParcela}
                    </p>
                </div>
                <div class="card-value" style="text-align: right; ${item.status === 'Cancelado' ? 'text-decoration: line-through; opacity:0.6;' : ''}">
                    <div style="font-size:1.05rem; font-weight:800; color:${corValor};">
                        ${sinalValor} R$ ${vRealizado !== '0,00' ? vRealizado : vOrcado}
                    </div>
                    <div class="card-value-previsto" style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${labelPrevisto}</div>
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

            // Função de segurança para garantir que nenhum texto de célula ultrapasse o limite de 32767 caracteres do Excel
            const safeExcelStr = (val) => {
                if (val === null || val === undefined) return '';
                const s = String(val);
                return s.length > 32700 ? s.slice(0, 32700) : s;
            };

            // 1. Aba Lançamentos
            const rowsLancamentos = movsFiltradas.map(m => {
                let dataFmt = m.data_lancamento || '';
                if (dataFmt && dataFmt.includes('-')) {
                    const p = dataFmt.split('-');
                    if (p.length === 3) dataFmt = `${p[2]}/${p[1]}/${p[0]}`;
                }

                return {
                    'ID': safeExcelStr(m.id),
                    'Data': safeExcelStr(dataFmt),
                    'Descrição': safeExcelStr(m.descricao),
                    'Categoria / Tipo': safeExcelStr(m.tipo_gasto),
                    'Valor Orçado (R$)': parseFloat(m.valor_total || 0),
                    'Valor Realizado (R$)': parseFloat(m.valor_realizado || 0),
                    'Status': safeExcelStr(m.status || 'Pendente'),
                    'Parcelado': safeExcelStr(m.parcelado || 'Não'),
                    'Parcela Atual': m.parcela_atual || 1,
                    'Total Parcelas': m.total_parcelas || 1,
                    'Grupo': safeExcelStr(m.id_grupo),
                    'Link da Fonte': safeExcelStr(m.link_url),
                    'Tipo de Mídia': safeExcelStr(m.midia_tipo)
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
                if (m.tipo_gasto === 'Receita' || isTipoResgateReserva(m)) totReceitas += v;
                else if (isTipoReservaEmergencia(m)) totReserva += v;
                else if (m.tipo_gasto === 'Investimento') totInvest += v;
                else if (m.tipo_gasto === 'Conta a Pagar') totGaveta += v;
                else if (m.tipo_gasto === 'Lista de Desejos') totDesejos += v;
                else totDespesas += v;
            });

            const rowsResumo = [
                { 'Indicador Financeiro': 'Período do Backup', 'Valor (R$) / Info': safeExcelStr(periodoDesc) },
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

            // 3. Aba de Dados Técnicos dividida em blocos de até 30.000 caracteres (limite do Excel é 32.767)
            const backupPayload = {
                app: "Finanças Pessoais",
                versao: "1.8.32",
                periodo: periodoDesc,
                data_exportacao: new Date().toISOString(),
                total_lancamentos: movsFiltradas.length,
                movimentacoes: movsFiltradas,
                contas_bancarias: (opcao === 'todos') ? contas : [],
                origens_renda: (opcao === 'todos') ? origens : []
            };

            const jsonStr = JSON.stringify(backupPayload);
            const CHUNK_SIZE = 30000;
            const rowsChunks = [];
            for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
                rowsChunks.push({
                    'PARTE': rowsChunks.length + 1,
                    'DADOS': jsonStr.slice(i, i + CHUNK_SIZE)
                });
            }

            const wsRaw = XLSX.utils.json_to_sheet(rowsChunks);
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
                    let jsonStr = '';
                    if (rawRows.length > 0 && rawRows[0]['DADOS']) {
                        jsonStr = rawRows.map(r => r['DADOS'] || '').join('');
                    } else if (rawRows.length > 0 && rawRows[0]['METADADOS_SISTEMA']) {
                        jsonStr = rawRows[0]['METADADOS_SISTEMA'];
                    }
                    if (jsonStr) {
                        const payload = JSON.parse(jsonStr);
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
        let itens = (window.currentMesItens || []).filter(i => i.tipo_gasto !== 'Cartão Alimentação');
        if (window.extratoFiltroAtual === 'receitas') {
            itens = itens.filter(i => i.tipo_gasto === 'Receita' || isTipoResgateReserva(i));
        } else if (window.extratoFiltroAtual === 'despesas') {
            itens = itens.filter(i => i.tipo_gasto !== 'Receita' && !isTipoResgateReserva(i));
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
        const isReceita = (i) => (i.tipo_gasto === 'Receita' || isTipoResgateReserva(i));

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

            if (item.tipo_gasto === 'Receita' || isTipoResgateReserva(item)) {
                totalReceitas += valorFinal;
            } else if (!isTipoReservaEmergencia(item)) {
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
                const isReceita = (item.tipo_gasto === 'Receita' || isTipoResgateReserva(item));
                const isReserva = isTipoReservaEmergencia(item);
                const vReal = parseFloat(item.valor_realizado || 0);
                const vOrc = parseFloat(item.valor_total || 0);
                const valorFinal = vReal > 0 ? vReal : vOrc;
                const sinal = isReceita ? '+ ' : (isReserva ? '🛡️ ' : '- ');
                const statusTexto = item.status === 'Pago' ? 'Pago' : (item.status === 'Cancelado' ? 'Cancelado' : 'Pendente');

                let descFinal = item.descricao || 'Sem descrição';
                if (item.parcelado === 'Sim' || (parseInt(item.total_parcelas, 10) > 1)) {
                    const totP = parseInt(item.total_parcelas, 10) || 1;
                    const numP = parseInt(item.parcela_atual || item.numero_parcela, 10) || 1;
                    const totC = valorFinal * totP;
                    descFinal += ` (Parc. ${numP}/${totP} - Total Compra: ${fmtMoeda(totC)})`;
                }

                return [
                    dataBr,
                    descFinal,
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
                        `Finanças Pessoais • Página ${doc.internal.getNumberOfPages()}`,
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
        const isReceita = (item.tipo_gasto === 'Receita' || isTipoResgateReserva(item));
        const isReserva = isTipoReservaEmergencia(item);
        const vReal = parseFloat(item.valor_realizado || 0);
        const vOrc = parseFloat(item.valor_total || 0);
        const valorFinal = vReal > 0 ? vReal : vOrc;
        const cor = isReceita ? '#10B981' : (isReserva ? '#F59E0B' : '#EF4444');
        const sinal = isReceita ? '+ ' : (isReserva ? '🛡️ ' : '- ');
        let descFinal = item.descricao || '';
        if (item.parcelado === 'Sim' || (parseInt(item.total_parcelas, 10) > 1)) {
            const totP = parseInt(item.total_parcelas, 10) || 1;
            const numP = parseInt(item.parcela_atual || item.numero_parcela, 10) || 1;
            const totC = valorFinal * totP;
            descFinal += ` (Parc. ${numP}/${totP} - Total Compra: ${fmtMoeda(totC)})`;
        }
        rowsHtml += `
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 8px; text-align: center;">${dataBr}</td>
                <td style="padding: 8px;">${descFinal}</td>
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

// ==========================================================================
// GERENCIADOR DE TEMAS VISUAIS 3D (PRETO, CINZA, CLARO SUAVE)
// ==========================================================================

function abrirModalTema() {
    switchFinanceTab('Tema');
    const modal = document.getElementById('modalTema');
    if (modal) {
        modal.style.display = 'flex';
        const temaAtual = localStorage.getItem('financas_app_theme') || 'preto';
        atualizarCardsSelecaoTema(temaAtual);
    }
}
window.abrirModalTema = abrirModalTema;

function fecharModalTema() {
    const modal = document.getElementById('modalTema');
    if (modal) {
        modal.style.display = 'none';
    }
}
window.fecharModalTema = fecharModalTema;

function selecionarTema(tema, salvar = true) {
    const temasValidos = ['preto', 'verde', 'rosa', 'cinza', 'azul', 'roxo', 'claro'];
    if (!temasValidos.includes(tema)) {
        tema = 'preto';
    }

    // Aplica o tema na tag <html> e no <body>
    document.documentElement.setAttribute('data-theme', tema);
    if (document.body) {
        document.body.setAttribute('data-theme', tema);
        
        // Sincroniza classes de tema compatíveis com o Tudo em Dia
        temasValidos.forEach(t => document.body.classList.remove('theme-' + t));
        document.body.classList.add('theme-' + tema);
    }

    // Salva preferência no localStorage
    if (salvar) {
        localStorage.setItem('financas_app_theme', tema);
        localStorage.setItem('app-theme', tema);
    }

    // Atualiza estado visual no modal de seleção e na aba dedicada
    atualizarCardsSelecaoTema(tema);

    // Se a aba de Demonstrativo estiver aberta, atualizar gráficos se necessário
    if (typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display !== 'none') {
        setTimeout(renderPowerBIDashboard, 100);
    }
}
window.selecionarTema = selecionarTema;

function atualizarCardsSelecaoTema(temaAtivo) {
    const temas = ['preto', 'verde', 'rosa', 'cinza', 'azul', 'roxo', 'claro'];

    // Sincroniza todos os selects de filtro de tema da tela
    const selectIds = ['mThemeSelector', 'desktopThemeSelector', 'modalThemeSelector', 'tabThemeSelector', 'theme-selector'];
    selectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = temaAtivo;
    });

    // Atualiza anel ativo nos ícones de cores simples e padrão
    temas.forEach(t => {
        const cap = t.charAt(0).toUpperCase() + t.slice(1);
        const dot = document.getElementById('dot' + cap);
        const tabDot = document.getElementById('tabDot' + cap);
        const isActive = (t === temaAtivo);

        [dot, tabDot].forEach(d => {
            if (d) {
                if (isActive) {
                    d.style.boxShadow = '0 0 0 3px #3b82f6, 0 0 10px rgba(59, 130, 246, 0.5)';
                    d.style.transform = 'scale(1.15)';
                } else {
                    d.style.boxShadow = 'none';
                    d.style.transform = 'scale(1)';
                }
            }
        });
    });
}
window.atualizarCardsSelecaoTema = atualizarCardsSelecaoTema;

// Inicialização automática do tema
(function inicializarTemaApp() {
    try {
        const temaSalvo = localStorage.getItem('financas_app_theme') || localStorage.getItem('app-theme') || 'preto';
        selecionarTema(temaSalvo, false);
    } catch(e) {
        console.warn('Erro ao inicializar tema:', e);
    }
})();




