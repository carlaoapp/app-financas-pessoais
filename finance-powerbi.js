// Lógica do Demonstrativo Financeiro Simples - Estilo Power BI Acessível com Filtro Multi-Anos e Multi-Meses

let pbiChartDiff = null;
let pbiChartFontesRec = null;
let pbiChartFontesDes = null;
let pbiChartGauge = null;
let filtroDemonstrativoAtual = 'todos';

const MESES_NOMES_DEMO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS_DEMO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ANOS_PADRAO_DEMO = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Estado de período selecionado no Demonstrativo (permite 1 ou mais anos e 1 ou mais meses)
let anosFiltroDemo = [];
let mesesFiltroDemo = [];
let periodoDemoInicializado = false;

function obterAnoPadraoHeader() {
    if (typeof currentViewDate !== 'undefined' && currentViewDate) return currentViewDate.getFullYear();
    const sel = document.getElementById('anoBaseSelector');
    return sel && sel.value ? parseInt(sel.value, 10) : new Date().getFullYear();
}

function obterMesPadraoHeader() {
    if (typeof currentViewDate !== 'undefined' && currentViewDate) return currentViewDate.getMonth();
    const sel = document.getElementById('mesBaseSelector');
    return sel && sel.value !== '' ? parseInt(sel.value, 10) : new Date().getMonth();
}

function garantirPeriodoDemoInicializado() {
    if (!periodoDemoInicializado || anosFiltroDemo.length === 0 || mesesFiltroDemo.length === 0) {
        anosFiltroDemo = [obterAnoPadraoHeader()];
        mesesFiltroDemo = [obterMesPadraoHeader()];
        periodoDemoInicializado = true;
    }
}

// Sincroniza quando o usuário muda o seletor de Ano ou Mês lá no topo do app
window.sincronizarPeriodoDemoComHeader = function() {
    anosFiltroDemo = [obterAnoPadraoHeader()];
    mesesFiltroDemo = [obterMesPadraoHeader()];
    periodoDemoInicializado = true;
    renderizarBotoesPeriodoModalDemo();
};

function formatarDescricaoPeriodoDemo() {
    garantirPeriodoDemoInicializado();
    const anosOrd = [...anosFiltroDemo].sort((a, b) => a - b);
    const mesesOrd = [...mesesFiltroDemo].sort((a, b) => a - b);

    const strAnos = anosOrd.length === ANOS_PADRAO_DEMO.length
        ? 'Todos os Anos (' + anosOrd[0] + '-' + anosOrd[anosOrd.length - 1] + ')'
        : anosOrd.join(', ');

    let strMeses = '';
    if (mesesOrd.length === 12) {
        strMeses = 'Todos os 12 meses';
    } else if (mesesOrd.length === 1) {
        strMeses = MESES_NOMES_DEMO[mesesOrd[0]];
    } else if (mesesOrd.length <= 4) {
        strMeses = mesesOrd.map(m => MESES_CURTOS_DEMO[m]).join(', ');
    } else {
        strMeses = `${mesesOrd.length} meses selecionados`;
    }

    const totalCombinacoes = anosOrd.length * mesesOrd.length;
    if (anosOrd.length === 1 && mesesOrd.length === 1) {
        return `${MESES_NOMES_DEMO[mesesOrd[0]]} / ${anosOrd[0]}`;
    }
    return `${strMeses} • ${strAnos} (${totalCombinacoes} ${totalCombinacoes === 1 ? 'mês' : 'meses'})`;
}

function renderizarBotoesPeriodoModalDemo() {
    garantirPeriodoDemoInicializado();

    const gridAnos = document.getElementById('gridAnosFiltroDemo');
    if (gridAnos) {
        const anoHeader = obterAnoPadraoHeader();
        const listaAnos = Array.from(new Set([...ANOS_PADRAO_DEMO, anoHeader, ...anosFiltroDemo])).sort((a, b) => a - b);
        gridAnos.innerHTML = listaAnos.map(ano => {
            const ativo = anosFiltroDemo.includes(ano);
            return `
                <button type="button" onclick="toggleAnoFiltroDemo(${ano}, event)" style="padding: 8px 4px; border-radius: 9px; font-size: 0.82rem; font-weight: 800; cursor: pointer; transition: all 0.15s; border: 1.5px solid ${ativo ? '#3B82F6' : '#334155'}; background: ${ativo ? 'rgba(37, 99, 235, 0.28)' : '#0F172A'}; color: ${ativo ? '#FFFFFF' : '#94A3B8'}; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    <span>${ativo ? '✓' : ''}</span>
                    <span>${ano}</span>
                </button>
            `;
        }).join('');
    }

    const gridMeses = document.getElementById('gridMesesFiltroDemo');
    if (gridMeses) {
        gridMeses.innerHTML = MESES_CURTOS_DEMO.map((nomeCurto, idx) => {
            const ativo = mesesFiltroDemo.includes(idx);
            return `
                <button type="button" onclick="toggleMesFiltroDemo(${idx}, event)" style="padding: 8px 4px; border-radius: 9px; font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: all 0.15s; border: 1.5px solid ${ativo ? '#10B981' : '#334155'}; background: ${ativo ? 'rgba(16, 185, 129, 0.24)' : '#0F172A'}; color: ${ativo ? '#FFFFFF' : '#94A3B8'}; display: flex; align-items: center; justify-content: center; gap: 3px;">
                    <span>${ativo ? '✓' : ''}</span>
                    <span>${nomeCurto}</span>
                </button>
            `;
        }).join('');
    }

    const lblResumoModal = document.getElementById('lblResumoPeriodoModalDemo');
    const descPeriodo = formatarDescricaoPeriodoDemo();
    if (lblResumoModal) {
        lblResumoModal.innerHTML = `📊 Período ativo: <strong style="color:#FFFFFF;">${descPeriodo}</strong>`;
    }

    const lblBadgeTopo = document.getElementById('lblPeriodoDemoAtivoTexto');
    if (lblBadgeTopo) {
        lblBadgeTopo.innerText = `Período: ${descPeriodo} (Toque para alterar)`;
    }
}

window.toggleAnoFiltroDemo = function(ano, event) {
    if (event) event.stopPropagation();
    garantirPeriodoDemoInicializado();
    const idx = anosFiltroDemo.indexOf(ano);
    if (idx >= 0) {
        if (anosFiltroDemo.length > 1) {
            anosFiltroDemo.splice(idx, 1);
        } else if (typeof showToast === 'function') {
            showToast('Mantenha pelo menos 1 ano selecionado.');
        }
    } else {
        anosFiltroDemo.push(ano);
    }
    renderizarBotoesPeriodoModalDemo();
    renderPowerBIDashboard();
};

window.toggleMesFiltroDemo = function(mesIdx, event) {
    if (event) event.stopPropagation();
    garantirPeriodoDemoInicializado();
    const idx = mesesFiltroDemo.indexOf(mesIdx);
    if (idx >= 0) {
        if (mesesFiltroDemo.length > 1) {
            mesesFiltroDemo.splice(idx, 1);
        } else if (typeof showToast === 'function') {
            showToast('Mantenha pelo menos 1 mês selecionado.');
        }
    } else {
        mesesFiltroDemo.push(mesIdx);
    }
    renderizarBotoesPeriodoModalDemo();
    renderPowerBIDashboard();
};

window.selecionarAnosDemoRapido = function(modo) {
    if (modo === 'todos') {
        anosFiltroDemo = [...ANOS_PADRAO_DEMO];
    } else {
        anosFiltroDemo = [obterAnoPadraoHeader()];
    }
    periodoDemoInicializado = true;
    renderizarBotoesPeriodoModalDemo();
    renderPowerBIDashboard();
};

window.selecionarMesesDemoRapido = function(modo) {
    if (modo === 'todos') {
        mesesFiltroDemo = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    } else {
        mesesFiltroDemo = [obterMesPadraoHeader()];
    }
    periodoDemoInicializado = true;
    renderizarBotoesPeriodoModalDemo();
    renderPowerBIDashboard();
};

function getOrCreateChart(domId) {
    const el = document.getElementById(domId);
    if (!el) return null;
    return echarts.getInstanceByDom(el) || echarts.init(el, 'dark');
}

function initPowerBICharts() {
    window.pbiChartDiff = pbiChartDiff = getOrCreateChart('pbiChartDiff');
    window.pbiChartFontesRec = pbiChartFontesRec = getOrCreateChart('pbiChartFontesRec');
    window.pbiChartFontesDes = pbiChartFontesDes = getOrCreateChart('pbiChartFontesDes');
    window.pbiChartGauge = pbiChartGauge = getOrCreateChart('pbiChartGauge');

    window.addEventListener('resize', function() {
        redimensionarGraficos();
    });
}

function redimensionarGraficos() {
    setTimeout(() => {
        if (pbiChartDiff) pbiChartDiff.resize();
        if (pbiChartFontesRec) pbiChartFontesRec.resize();
        if (pbiChartFontesDes) pbiChartFontesDes.resize();
        if (pbiChartGauge) pbiChartGauge.resize();
    }, 80);
}

function formatBRL(value) {
    if (window.privacyMode) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

// Estado das opções ativas no demonstrativo
let filtrosAtivosDemo = {
    receitas: true,
    despesas: true,
    investimentos: true,
    reserva: true
};

// Abrir modal expandido de filtros
function abrirModalFiltroDemo(event) {
    if (event) event.stopPropagation();
    renderizarBotoesPeriodoModalDemo();
    const modal = document.getElementById('modalFiltroDemo');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Fechar modal expandido de filtros
function fecharModalFiltroDemo() {
    const modal = document.getElementById('modalFiltroDemo');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Confirmar escolha: fecha o modal e atualiza todo o demonstrativo com o período e categorias escolhidas
function confirmarFiltrosDemo() {
    fecharModalFiltroDemo();
    renderPowerBIDashboard();
}

// Fechar modal ao clicar fora da caixa interna
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modalFiltroDemo');
    if (modal && e.target === modal) {
        fecharModalFiltroDemo();
    }
});

// Ação de 'Ver Tudo (Completo)'
function selecionarFiltroDemoTudo(event) {
    if (event) event.stopPropagation();
    const chkTudo = document.getElementById('chkDemoTudo');

    if (chkTudo) chkTudo.checked = true;
    filtrosAtivosDemo = {
        receitas: true,
        despesas: true,
        investimentos: true,
        reserva: true
    };

    const ids = ['chkDemoRec', 'chkDemoDes', 'chkDemoInv', 'chkDemoRes'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = true;
    });

    aplicarFiltrosDemonstrativo();
}

// Alternar uma opção específica (Receitas, Despesas, Investimentos, Reserva)
function toggleOpcaoFiltroDemo(tipo, event) {
    if (event) event.stopPropagation();
    
    const idMap = {
        receitas: 'chkDemoRec',
        despesas: 'chkDemoDes',
        investimentos: 'chkDemoInv',
        reserva: 'chkDemoRes'
    };
    
    const chk = document.getElementById(idMap[tipo]);
    if (!chk) return;

    if (!event || event.target.id !== idMap[tipo]) {
        chk.checked = !chk.checked;
    }

    filtrosAtivosDemo[tipo] = chk.checked;

    // Atualiza estado do "Ver Tudo"
    const todasMarcadas = filtrosAtivosDemo.receitas && filtrosAtivosDemo.despesas && filtrosAtivosDemo.investimentos && filtrosAtivosDemo.reserva;
    const chkTudo = document.getElementById('chkDemoTudo');
    if (chkTudo) chkTudo.checked = todasMarcadas;

    aplicarFiltrosDemonstrativo();
}

// Aplica visualmente os filtros ativos na tela
function aplicarFiltrosDemonstrativo() {
    const { receitas, despesas, investimentos, reserva } = filtrosAtivosDemo;
    const todasMarcadas = receitas && despesas && investimentos && reserva;
    const nenhumaMarcada = !receitas && !despesas && !investimentos && !reserva;

    const totalSelecionadas = [receitas, despesas, investimentos, reserva].filter(Boolean).length;

    // Atualiza rótulo do botão principal
    const lbl = document.getElementById('lblDemoFiltroSelecionado');
    if (lbl) {
        let nomeFiltro = 'Ver Tudo (Completo)';
        if (todasMarcadas || nenhumaMarcada) {
            nomeFiltro = 'Ver Tudo (Completo)';
        } else if (totalSelecionadas === 1) {
            if (receitas) nomeFiltro = 'Receitas (Entradas)';
            else if (despesas) nomeFiltro = 'Despesas (Saídas)';
            else if (investimentos) nomeFiltro = 'Investimentos';
            else if (reserva) nomeFiltro = 'Reserva de Emergência';
        } else {
            nomeFiltro = `${totalSelecionadas} Categorias Selecionadas`;
        }
        lbl.innerText = nomeFiltro;
    }

    renderizarBotoesPeriodoModalDemo();

    // Exibe / Oculta cada um dos 4 Cards de Demonstrativo (KPIs)
    const cardRec = document.getElementById('cardKpiRec');
    const cardDes = document.getElementById('cardKpiDes');
    const cardInv = document.getElementById('cardKpiInv');
    const cardRes = document.getElementById('cardKpiRes');

    if (cardRec) cardRec.style.display = (todasMarcadas || nenhumaMarcada || receitas) ? 'flex' : 'none';
    if (cardDes) cardDes.style.display = (todasMarcadas || nenhumaMarcada || despesas) ? 'flex' : 'none';
    if (cardInv) cardInv.style.display = (todasMarcadas || nenhumaMarcada || investimentos) ? 'flex' : 'none';
    if (cardRes) cardRes.style.display = (todasMarcadas || nenhumaMarcada || reserva) ? 'flex' : 'none';

    // Exibe / Oculta Seções de Gráficos correspondentes
    const boxDiff = document.getElementById('boxChartDiff');
    const boxGridFontes = document.getElementById('boxGridFontes');
    const boxFontesRec = document.getElementById('boxChartFontesRec');
    const boxFontesDes = document.getElementById('boxChartFontesDes');
    const boxReserva = document.getElementById('boxChartReserva');

    // Comparativo geral aparece se houver pelo menos 2 categorias ou se for Ver Tudo
    if (boxDiff) {
        boxDiff.style.display = (todasMarcadas || nenhumaMarcada || (receitas && despesas) || totalSelecionadas >= 2) ? 'block' : 'none';
    }

    // Fontes de Receita e Fontes de Despesa
    const showRec = todasMarcadas || nenhumaMarcada || receitas;
    const showDes = todasMarcadas || nenhumaMarcada || despesas;

    if (boxFontesRec) boxFontesRec.style.display = showRec ? 'block' : 'none';
    if (boxFontesDes) boxFontesDes.style.display = showDes ? 'block' : 'none';

    if (boxGridFontes) {
        if (showRec && showDes) {
            boxGridFontes.style.display = 'grid';
            boxGridFontes.style.gridTemplateColumns = window.innerWidth > 900 ? '1fr 1fr' : '1fr';
        } else if (showRec || showDes) {
            boxGridFontes.style.display = 'block';
        } else {
            boxGridFontes.style.display = 'none';
        }
    }

    // Termômetro da Reserva
    if (boxReserva) {
        boxReserva.style.display = (todasMarcadas || nenhumaMarcada || reserva) ? 'block' : 'none';
    }

    redimensionarGraficos();
}

// Compatibilidade com clique direto nos cards
function filtrarDemonstrativo(tipo) {
    if (tipo === 'todos') {
        selecionarFiltroDemoTudo();
        return;
    }
    filtrosAtivosDemo = {
        receitas: tipo === 'receitas',
        despesas: tipo === 'despesas',
        investimentos: tipo === 'investimentos',
        reserva: tipo === 'reserva'
    };

    document.getElementById('chkDemoTudo').checked = false;
    document.getElementById('chkDemoRec').checked = tipo === 'receitas';
    document.getElementById('chkDemoDes').checked = tipo === 'despesas';
    document.getElementById('chkDemoInv').checked = tipo === 'investimentos';
    document.getElementById('chkDemoRes').checked = tipo === 'reserva';

    aplicarFiltrosDemonstrativo();
}

// Coleta todos os lançamentos (físicos + projeções de parcelas) para um Ano e Mês específicos sem duplicar grupos
function obterItensDeAnoEMes(movsAtivas, targetYear, targetMonth) {
    const itens = [];
    const gruposFisicosNoMes = new Set();

    // 1ª passagem: identifica lançamentos diretos do mês
    movsAtivas.forEach(m => {
        if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
        if (m.tipo_gasto === 'Conta a Pagar') return;
        if (!m.data_lancamento) return;

        const [year, month, day] = m.data_lancamento.split('-');
        let effectiveMonth = parseInt(month, 10) - 1;
        let effectiveYear = parseInt(year, 10);

        if (m.tipo_gasto === 'Cartão de Crédito' && parseInt(day, 10) > 25) {
            effectiveMonth++;
            if (effectiveMonth > 11) {
                effectiveMonth = 0;
                effectiveYear++;
            }
        }

        if (effectiveYear === targetYear && effectiveMonth === targetMonth) {
            itens.push({ ...m, isVirtual: false });
            if (m.id_grupo) gruposFisicosNoMes.add(m.id_grupo);
        }
    });

    // 2ª passagem: projeta parcelas virtuais apenas para grupos que não possuem parcela física salva neste mês
    movsAtivas.forEach(m => {
        if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
        if (m.tipo_gasto === 'Conta a Pagar') return;
        if (!m.data_lancamento) return;
        if (m.parcelado !== 'Sim' || !m.id_grupo) return;
        if (gruposFisicosNoMes.has(m.id_grupo)) return;

        const [year, month, day] = m.data_lancamento.split('-');
        const launchDate = new Date(year, parseInt(month, 10) - 1, day);
        let effectiveMonth = launchDate.getMonth();
        let effectiveYear = launchDate.getFullYear();

        if (m.tipo_gasto === 'Cartão de Crédito' && parseInt(day, 10) > 25) {
            effectiveMonth++;
            if (effectiveMonth > 11) {
                effectiveMonth = 0;
                effectiveYear++;
            }
        }

        const diffMonths = (targetYear - effectiveYear) * 12 + (targetMonth - effectiveMonth);
        if (diffMonths > 0) {
            const novaParcela = (parseInt(m.parcela_atual, 10) || 1) + diffMonths;
            if (novaParcela <= (parseInt(m.total_parcelas, 10) || 1)) {
                gruposFisicosNoMes.add(m.id_grupo);
                itens.push({
                    ...m,
                    isVirtual: true,
                    parcela_atual: novaParcela,
                    status: 'Pendente'
                });
            }
        }
    });

    return itens;
}

async function renderPowerBIDashboard() {
    if (typeof echarts === 'undefined') return;

    initPowerBICharts();
    garantirPeriodoDemoInicializado();

    const anosOrd = [...anosFiltroDemo].sort((a, b) => a - b);
    const mesesOrd = [...mesesFiltroDemo].sort((a, b) => a - b);
    const qtdMesesTotal = anosOrd.length * mesesOrd.length;
    const isMultiPeriodo = qtdMesesTotal > 1;
    const descPeriodo = formatarDescricaoPeriodoDemo();

    try {
        const todasMovs = await dbLocal.movimentacoes.toArray();
        const movsAtivas = todasMovs.filter(m => m.deleted !== 1 && m.status !== 'Cancelado');

        let totalReceitasMes = 0;
        let totalDespesasMes = 0;
        let totalInvestimentosMes = 0;
        let totalReservaMes = 0;
        let reservaAcumuladaTotal = 0;

        const receitasPorCat = {};
        const despesasPorCat = {};

        // 1. Histórico acumulado total da Reserva de Emergência
        movsAtivas.forEach(m => {
            const vr = parseFloat(m.valor_realizado) || 0;
            const vt = parseFloat(m.valor_total) || 0;
            const val = vr > 0 ? vr : vt;

            if (m.tipo_gasto === 'Reserva de Emergência') {
                reservaAcumuladaTotal += val;
            } else if (m.tipo_gasto === 'Resgate de Reserva') {
                reservaAcumuladaTotal -= val;
            }
        });

        // 2. Coletar e somar itens de TODOS os anos e meses selecionados pelo usuário
        const todosItensDoPeriodo = [];
        for (const anoItem of anosOrd) {
            for (const mesItem of mesesOrd) {
                const itensPar = obterItensDeAnoEMes(movsAtivas, anoItem, mesItem);
                todosItensDoPeriodo.push(...itensPar);
            }
        }

        todosItensDoPeriodo.forEach(m => {
            if (m.deleted === 1 || m.status === 'Cancelado') return;
            if (m.tipo_gasto === 'Conta a Pagar') return;
            if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;

            const vTotal = parseFloat(m.valor_total) || 0;
            const vReal = parseFloat(m.valor_realizado) || 0;
            const vEfetivo = vReal > 0 ? vReal : vTotal;

            const descName = m.descricao ? m.descricao.split(' (')[0].trim() : 'Outros';

            if (m.tipo_gasto === 'Receita' || m.tipo_gasto === 'Resgate de Reserva') {
                totalReceitasMes += vEfetivo;
                receitasPorCat[descName] = (receitasPorCat[descName] || 0) + vEfetivo;
            } else if (m.tipo_gasto === 'Investimento') {
                totalInvestimentosMes += vEfetivo;
            } else if (m.tipo_gasto === 'Reserva de Emergência') {
                totalReservaMes += vEfetivo;
            } else {
                totalDespesasMes += vEfetivo;
                despesasPorCat[descName] = (despesasPorCat[descName] || 0) + vEfetivo;
            }
        });

        const saldoMes = totalReceitasMes - totalDespesasMes - totalInvestimentosMes - totalReservaMes;

        // Atualizar os 4 Cards de Demonstrativo (KPIs) e seus textos explicativos conforme o período
        const elRec = document.getElementById('pbiValReceitas');
        const elDes = document.getElementById('pbiValDespesas');
        const elInv = document.getElementById('pbiValInvestimentos');
        const elRes = document.getElementById('pbiValReserva');
        const elSaldo = document.getElementById('pbiValSaldo');

        const subRec = document.getElementById('subKpiRec');
        const subDes = document.getElementById('subKpiDes');
        const subInv = document.getElementById('subKpiInv');
        const subRes = document.getElementById('subKpiRes');

        if (elRec) elRec.innerText = formatBRL(totalReceitasMes);
        if (elDes) elDes.innerText = formatBRL(totalDespesasMes);
        if (elInv) elInv.innerText = formatBRL(totalInvestimentosMes);
        // Se o usuário selecionou vários meses/anos, mostra quanto guardou na reserva no período (ou o acumulado se for 0 no período)
        if (elRes) elRes.innerText = formatBRL(isMultiPeriodo && totalReservaMes > 0 ? totalReservaMes : reservaAcumuladaTotal);

        if (subRec) {
            subRec.innerText = isMultiPeriodo
                ? `Soma das entradas em ${descPeriodo}`
                : `Total de entradas em ${descPeriodo}`;
        }
        if (subDes) {
            subDes.innerText = isMultiPeriodo
                ? `Soma das despesas (gasto/previsto) em ${descPeriodo}`
                : `Total de contas e gastos em ${descPeriodo}`;
        }
        if (subInv) {
            subInv.innerText = isMultiPeriodo
                ? `Soma investida/prevista em ${descPeriodo}`
                : `Aplicações no período (${descPeriodo})`;
        }
        if (subRes) {
            subRes.innerText = isMultiPeriodo
                ? `No período: ${formatBRL(totalReservaMes)} • Acumulado total: ${formatBRL(reservaAcumuladaTotal)}`
                : `No mês: ${formatBRL(totalReservaMes)} • Acumulado total: ${formatBRL(reservaAcumuladaTotal)}`;
        }

        if (elSaldo) {
            elSaldo.innerText = formatBRL(saldoMes);
            elSaldo.style.color = saldoMes >= 0 ? '#10B981' : '#EF4444';
        }

        const saldoIcon = document.getElementById('demoSaldoIcon');
        const saldoTitulo = document.getElementById('demoSaldoTitulo');
        if (saldoIcon && saldoTitulo) {
            if (saldoMes >= 0) {
                saldoIcon.innerText = '🟢';
                saldoTitulo.innerText = isMultiPeriodo
                    ? `Saldo Positivo no Período (${descPeriodo})`
                    : `Saldo Positivo no Mês (${descPeriodo})`;
            } else {
                saldoIcon.innerText = '🔴';
                saldoTitulo.innerText = isMultiPeriodo
                    ? `Atenção: Saídas Superaram Entradas no Período (${descPeriodo})`
                    : `Atenção: Despesas Superaram as Entradas (${descPeriodo})`;
            }
        }

        // --- Cores Dinâmicas por Tema ---
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'preto';
        const isThemeClaro = currentTheme === 'claro';
        const isThemeCinza = currentTheme === 'cinza';

        const chartTextColor = isThemeClaro ? '#0F172A' : '#F8FAFC';
        const chartSubtextColor = isThemeClaro ? '#334155' : (isThemeCinza ? '#E2E8F0' : '#CBD5E1');
        const chartAxisLineColor = isThemeClaro ? '#94A3B8' : (isThemeCinza ? '#475569' : '#334155');
        const chartSplitLineColor = isThemeClaro ? 'rgba(148, 163, 184, 0.45)' : (isThemeCinza ? 'rgba(255, 255, 255, 0.15)' : 'rgba(51, 65, 85, 0.5)');
        const chartTooltipBg = isThemeClaro ? '#FFFFFF' : (isThemeCinza ? '#282E39' : '#1E293B');
        const chartTooltipBorder = isThemeClaro ? '#CBD5E1' : (isThemeCinza ? '#475569' : '#334155');
        const chartPieBorder = isThemeClaro ? '#FFFFFF' : (isThemeCinza ? '#242932' : '#0F172A');

        // --- Gráfico 1: Comparativo Amigável (Entradas vs Saídas vs Investido) ---
        const diffOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: chartTooltipBg,
                borderColor: chartTooltipBorder,
                textStyle: { color: chartTextColor },
                formatter: function(params) {
                    let res = '<strong>' + params[0].name + '</strong><br/>';
                    params.forEach(p => {
                        res += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color};"></span>`
                            + p.seriesName + ': <strong>' + formatBRL(p.value) + '</strong><br/>';
                    });
                    return res;
                },
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: ['Receitas (Entrou)', 'Despesas (Saiu)', 'Investimentos (Guardado)'],
                textStyle: { color: chartSubtextColor, fontSize: 12, fontWeight: 'bold' },
                top: 0
            },
            grid: { left: '3%', right: '4%', bottom: '8%', top: '45px', containLabel: true },
            xAxis: {
                type: 'category',
                data: [descPeriodo],
                axisLabel: { color: chartTextColor, fontSize: 11, fontWeight: 'bold' },
                axisLine: { lineStyle: { color: chartAxisLineColor, width: 1.5 } }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: chartSubtextColor, fontWeight: 'bold', formatter: (val) => formatBRL(val) },
                splitLine: { lineStyle: { color: chartSplitLineColor, type: 'dashed' } }
            },
            series: [
                {
                    name: 'Receitas (Entrou)',
                    type: 'bar',
                    data: [totalReceitasMes],
                    itemStyle: { color: '#10B981', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#10B981', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                },
                {
                    name: 'Despesas (Saiu)',
                    type: 'bar',
                    data: [totalDespesasMes],
                    itemStyle: { color: '#EF4444', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#EF4444', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                },
                {
                    name: 'Investimentos (Guardado)',
                    type: 'bar',
                    data: [totalInvestimentosMes],
                    itemStyle: { color: '#8B5CF6', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#8B5CF6', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                }
            ]
        };
        pbiChartDiff.setOption(diffOption, true);

        // --- Gráfico 2: De Onde Veio o Dinheiro (Receitas) ---
        const catRecArr = Object.keys(receitasPorCat)
            .map(k => ({ name: k, value: receitasPorCat[k] }))
            .sort((a, b) => a.value - b.value);

        const fontesRecOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: chartTooltipBg,
                borderColor: chartTooltipBorder,
                textStyle: { color: chartTextColor },
                formatter: function(params) {
                    return params[0].name + '<br/><strong>' + formatBRL(params[0].value) + '</strong>';
                }
            },
            grid: { left: '3%', right: '22%', bottom: '3%', top: '15px', containLabel: true },
            xAxis: { type: 'value', show: false },
            yAxis: {
                type: 'category',
                data: catRecArr.length > 0 ? catRecArr.map(c => c.name) : ['Nenhum lançamento'],
                axisLabel: { color: chartSubtextColor, fontSize: 11, fontWeight: '600' },
                axisLine: { lineStyle: { color: chartAxisLineColor, width: 1.5 } }
            },
            series: [{
                type: 'bar',
                data: catRecArr.length > 0 ? catRecArr.map(c => c.value) : [0],
                itemStyle: { color: '#10B981', borderRadius: [0, 6, 6, 0] },
                label: { show: true, position: 'right', color: '#10B981', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
            }]
        };
        pbiChartFontesRec.setOption(fontesRecOption, true);

        // --- Gráfico 3: Onde Foi Gasto o Dinheiro (Despesas - Rosca / Pizza Clara) ---
        const catDesArr = Object.keys(despesasPorCat)
            .map(k => ({ name: k, value: despesasPorCat[k] }))
            .sort((a, b) => b.value - a.value);

        const fontesDesOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: chartTooltipBg,
                borderColor: chartTooltipBorder,
                textStyle: { color: chartTextColor },
                formatter: function(p) {
                    return p.name + '<br/><strong>' + formatBRL(p.value) + '</strong> (' + p.percent + '%)';
                }
            },
            legend: {
                orient: 'horizontal',
                bottom: '0',
                textStyle: { color: chartSubtextColor, fontSize: 11, fontWeight: '600' }
            },
            series: [{
                name: 'Despesas',
                type: 'pie',
                radius: ['40%', '68%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: chartPieBorder,
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: chartTextColor,
                        formatter: '{b}\n{d}%'
                    }
                },
                data: catDesArr.length > 0 ? catDesArr : [{ name: 'Sem Despesas', value: 0 }]
            }]
        };
        pbiChartFontesDes.setOption(fontesDesOption, true);

        // --- Gráfico 4: Medidor / Termômetro da Reserva de Emergência ---
        const despesaMediaMensal = qtdMesesTotal > 0 ? (totalDespesasMes / qtdMesesTotal) : totalDespesasMes;
        const metaReservaRecomendada = despesaMediaMensal > 0 ? (despesaMediaMensal * 3) : 5000;
        let percentualReserva = 0;
        if (metaReservaRecomendada > 0) {
            percentualReserva = (reservaAcumuladaTotal / metaReservaRecomendada) * 100;
        }
        if (percentualReserva > 100) percentualReserva = 100;

        const gaugeOption = {
            backgroundColor: 'transparent',
            series: [{
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                min: 0,
                max: 100,
                splitNumber: 4,
                radius: '100%',
                center: ['50%', '75%'],
                axisLine: {
                    lineStyle: {
                        width: 20,
                        color: [
                            [0.35, '#EF4444'],
                            [0.70, '#F59E0B'],
                            [1.0, '#10B981']
                        ]
                    }
                },
                pointer: {
                    icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                    length: '14%',
                    width: 18,
                    offsetCenter: [0, '-62%'],
                    itemStyle: { color: 'auto' }
                },
                axisTick: { length: 8, lineStyle: { color: 'auto', width: 2 } },
                splitLine: { length: 18, lineStyle: { color: 'auto', width: 4 } },
                axisLabel: { color: chartSubtextColor, distance: -36, formatter: '{value}%', fontWeight: '600' },
                title: { offsetCenter: [0, '25%'], color: chartSubtextColor, fontSize: 13, fontWeight: 'bold' },
                detail: {
                    fontSize: 22,
                    offsetCenter: [0, '-5%'],
                    valueAnimation: true,
                    formatter: function (value) {
                        return window.privacyMode ? '•••%' : value.toFixed(0) + '% da meta';
                    },
                    color: chartTextColor,
                    fontWeight: 'bold'
                },
                data: [{ value: percentualReserva.toFixed(1), name: 'Segurança Atual' }]
            }]
        };
        pbiChartGauge.setOption(gaugeOption, true);

        aplicarFiltrosDemonstrativo();

    } catch(err) {
        console.error("Erro ao renderizar Demonstrativo PowerBI:", err);
    }
}

window.renderPowerBIDashboard = renderPowerBIDashboard;
window.filtrarDemonstrativo = filtrarDemonstrativo;
window.abrirModalFiltroDemo = abrirModalFiltroDemo;
window.fecharModalFiltroDemo = fecharModalFiltroDemo;
window.confirmarFiltrosDemo = confirmarFiltrosDemo;
window.selecionarFiltroDemoTudo = selecionarFiltroDemoTudo;
window.toggleOpcaoFiltroDemo = toggleOpcaoFiltroDemo;
window.aplicarFiltrosDemonstrativo = aplicarFiltrosDemonstrativo;
