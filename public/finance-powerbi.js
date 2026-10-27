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

function isTabDemonstrativoAtiva() {
    const tab = document.getElementById('tabPowerBI');
    return !!(tab && tab.style.display !== 'none');
}
window.isTabDemonstrativoAtiva = isTabDemonstrativoAtiva;

function obterAnoPadraoHeader() {
    if (typeof currentViewDate !== 'undefined' && currentViewDate) return currentViewDate.getFullYear();
    const sel = document.getElementById('anoBaseSelector');
    const val = sel && sel.value && sel.value !== 'MULTI_DEMO' ? parseInt(sel.value, 10) : NaN;
    return !isNaN(val) ? val : new Date().getFullYear();
}

function obterMesPadraoHeader() {
    if (typeof currentViewDate !== 'undefined' && currentViewDate) return currentViewDate.getMonth();
    const sel = document.getElementById('mesBaseSelector');
    const val = sel && sel.value !== '' && sel.value !== 'MULTI_DEMO' ? parseInt(sel.value, 10) : NaN;
    return !isNaN(val) ? val : new Date().getMonth();
}

function garantirPeriodoDemoInicializado() {
    if (!periodoDemoInicializado || anosFiltroDemo.length === 0 || mesesFiltroDemo.length === 0) {
        anosFiltroDemo = [obterAnoPadraoHeader()];
        mesesFiltroDemo = [obterMesPadraoHeader()];
        periodoDemoInicializado = true;
    }
}

// Atualiza os seletores ANO: e MÊS: do cabeçalho superior para refletir a seleção do usuário APENAS na tela Demonstrativo
window.sincronizarHeaderComPeriodoDemo = function() {
    if (!isTabDemonstrativoAtiva()) return;
    garantirPeriodoDemoInicializado();

    const anosOrd = [...anosFiltroDemo].sort((a, b) => a - b);
    const mesesOrd = [...mesesFiltroDemo].sort((a, b) => a - b);

    const anoSelect = document.getElementById('anoBaseSelector');
    if (anoSelect) {
        let optMultiAno = document.getElementById('optAnoMultiDemo');
        if (anosOrd.length === 1) {
            if (optMultiAno) optMultiAno.remove();
            anoSelect.value = String(anosOrd[0]);
        } else {
            const labelAnos = anosOrd.length >= ANOS_PADRAO_DEMO.length
                ? `Todos (${anosOrd[0]}-${anosOrd[anosOrd.length - 1]})`
                : anosOrd.join(', ');
            if (!optMultiAno) {
                optMultiAno = document.createElement('option');
                optMultiAno.id = 'optAnoMultiDemo';
                optMultiAno.value = 'MULTI_DEMO';
                anoSelect.insertBefore(optMultiAno, anoSelect.firstChild);
            }
            optMultiAno.text = labelAnos;
            anoSelect.value = 'MULTI_DEMO';
        }
    }

    const mesSelect = document.getElementById('mesBaseSelector');
    if (mesSelect) {
        let optMultiMes = document.getElementById('optMesMultiDemo');
        if (mesesOrd.length === 1) {
            if (optMultiMes) optMultiMes.remove();
            mesSelect.value = String(mesesOrd[0]);
        } else {
            let labelMeses = '';
            if (mesesOrd.length === 12) {
                labelMeses = 'Todos (12 Meses)';
            } else if (mesesOrd.length <= 5) {
                labelMeses = mesesOrd.map(m => MESES_CURTOS_DEMO[m]).join(', ');
            } else {
                labelMeses = `${mesesOrd.map(m => MESES_CURTOS_DEMO[m]).slice(0, 3).join(', ')}... (${mesesOrd.length} meses)`;
            }
            if (!optMultiMes) {
                optMultiMes = document.createElement('option');
                optMultiMes.id = 'optMesMultiDemo';
                optMultiMes.value = 'MULTI_DEMO';
                mesSelect.insertBefore(optMultiMes, mesSelect.firstChild);
            }
            optMultiMes.text = labelMeses;
            mesSelect.value = 'MULTI_DEMO';
        }
    }
};

// Restaura o cabeçalho superior (ANO: e MÊS:) ao padrão das demais abas quando sai da tela Demonstrativo
window.restaurarHeaderPadraoForaDoDemo = function() {
    const optMultiAno = document.getElementById('optAnoMultiDemo');
    if (optMultiAno) optMultiAno.remove();

    const optMultiMes = document.getElementById('optMesMultiDemo');
    if (optMultiMes) optMultiMes.remove();

    const anoSelect = document.getElementById('anoBaseSelector');
    if (anoSelect && typeof currentViewDate !== 'undefined' && currentViewDate) {
        anoSelect.value = String(currentViewDate.getFullYear());
    }

    const mesSelect = document.getElementById('mesBaseSelector');
    if (mesSelect && typeof currentViewDate !== 'undefined' && currentViewDate) {
        mesSelect.value = String(currentViewDate.getMonth());
    }
};

// Quando o usuário altera o ANO diretamente no cabeçalho estando na tela Demonstrativo
window.definirAnoUnicoDemoPeloHeader = function(anoNum) {
    if (isNaN(anoNum)) return;
    garantirPeriodoDemoInicializado();
    anosFiltroDemo = [anoNum];
    periodoDemoInicializado = true;
    renderizarBotoesPeriodoModalDemo();
    window.sincronizarHeaderComPeriodoDemo();
    renderPowerBIDashboard();
};

// Quando o usuário altera o MÊS diretamente no cabeçalho estando na tela Demonstrativo
window.definirMesUnicoDemoPeloHeader = function(mesNum) {
    if (isNaN(mesNum)) return;
    garantirPeriodoDemoInicializado();
    mesesFiltroDemo = [mesNum];
    periodoDemoInicializado = true;
    renderizarBotoesPeriodoModalDemo();
    window.sincronizarHeaderComPeriodoDemo();
    renderPowerBIDashboard();
};

// Sincroniza quando o usuário muda o seletor de Ano ou Mês lá no topo do app fora da aba Demonstrativo
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
                <button type="button" onclick="toggleAnoFiltroDemo(${ano}, event)" style="padding: 8px 4px; border-radius: 9px; font-size: 0.82rem; font-weight: 800; cursor: pointer; transition: all 0.15s; border: 1.5px solid ${ativo ? '#3B82F6' : 'var(--border-color)'}; background: ${ativo ? 'rgba(37, 99, 235, 0.22)' : 'var(--bg-card)'}; color: ${ativo ? 'var(--text-primary)' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; gap: 4px;">
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
                <button type="button" onclick="toggleMesFiltroDemo(${idx}, event)" style="padding: 8px 4px; border-radius: 9px; font-size: 0.8rem; font-weight: 800; cursor: pointer; transition: all 0.15s; border: 1.5px solid ${ativo ? '#10B981' : 'var(--border-color)'}; background: ${ativo ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)'}; color: ${ativo ? 'var(--text-primary)' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; gap: 3px;">
                    <span>${ativo ? '✓' : ''}</span>
                    <span>${nomeCurto}</span>
                </button>
            `;
        }).join('');
    }

    const lblResumoModal = document.getElementById('lblResumoPeriodoModalDemo');
    const descPeriodo = formatarDescricaoPeriodoDemo();
    if (lblResumoModal) {
        lblResumoModal.innerHTML = `📊 Período ativo: <strong style="color:var(--text-primary);">${descPeriodo}</strong>`;
    }

    window.sincronizarHeaderComPeriodoDemo();
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
window.formatBRL = formatBRL;

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
        if (m.tipo_gasto === 'Planejamento Renda Extra') return;
        if (m.tipo_gasto === 'Transferência Interna' || m.tipo_gasto === 'Transferência') return;
        if (m.tipo_gasto === 'Cartão Alimentação') return;
        if (!m.data_lancamento) return;

        const [year, month, day] = m.data_lancamento.split('-');
        let effectiveMonth = parseInt(month, 10) - 1;
        let effectiveYear = parseInt(year, 10);

        if (effectiveYear === targetYear && effectiveMonth === targetMonth) {
            itens.push({ ...m, isVirtual: false });
            if (m.id_grupo) gruposFisicosNoMes.add(m.id_grupo);
        }
    });

    // 2ª passagem: projeta parcelas virtuais apenas para grupos que não possuem parcela física salva neste mês
    movsAtivas.forEach(m => {
        if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
        if (m.tipo_gasto === 'Conta a Pagar') return;
        if (m.tipo_gasto === 'Planejamento Renda Extra') return;
        if (m.tipo_gasto === 'Transferência Interna' || m.tipo_gasto === 'Transferência') return;
        if (m.tipo_gasto === 'Cartão Alimentação') return;
        if (!m.data_lancamento) return;
        if (m.parcelado !== 'Sim' || !m.id_grupo) return;
        if (gruposFisicosNoMes.has(m.id_grupo)) return;

        const [year, month, day] = m.data_lancamento.split('-');
        const launchDate = new Date(year, parseInt(month, 10) - 1, day);
        let effectiveMonth = launchDate.getMonth();
        let effectiveYear = launchDate.getFullYear();

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

// Funções utilitárias para detecção precisa e flexível de Reserva de Emergência
function isTipoReservaEmergencia(m) {
    if (!m) return false;
    const tipo = String(m.tipo_gasto || '').trim();
    const desc = String(m.descricao || '').trim();
    const cat = String(m.categoria || '').trim();
    
    if (tipo.toLowerCase().includes('resgate') || desc.toLowerCase().includes('resgate') || cat.toLowerCase().includes('resgate')) {
        return false;
    }
    
    if (tipo === 'Reserva de Emergência' || tipo === 'Reserva de Emergência (Guardar)' || tipo === 'Reserva de Emergencia' || tipo === 'Reserva') {
        return true;
    }
    
    const descLower = desc.toLowerCase();
    const catLower = cat.toLowerCase();
    if (descLower === 'reserva de emergência' || descLower === 'reserva de emergencia' || descLower === 'reserva emergência' || descLower === 'reserva emergencia' ||
        catLower === 'reserva de emergência' || catLower === 'reserva de emergencia' ||
        descLower.startsWith('reserva de emergência') || descLower.startsWith('reserva de emergencia')) {
        if (tipo !== 'Receita') {
            return true;
        }
    }
    
    return false;
}
window.isTipoReservaEmergencia = isTipoReservaEmergencia;

function isTipoResgateReserva(m) {
    if (!m) return false;
    const tipo = String(m.tipo_gasto || '').trim();
    const desc = String(m.descricao || '').trim();
    const cat = String(m.categoria || '').trim();
    
    return (
        tipo === 'Resgate de Reserva' ||
        tipo === 'Resgate de Reserva (Usar)' ||
        tipo.toLowerCase().includes('resgate de reserva') ||
        desc.toLowerCase().includes('resgate de reserva') ||
        cat.toLowerCase().includes('resgate de reserva') ||
        desc.toLowerCase().includes('resgate da reserva')
    );
}
window.isTipoResgateReserva = isTipoResgateReserva;

async function renderPowerBIDashboard() {
    if (typeof echarts === 'undefined') return;

    initPowerBICharts();
    garantirPeriodoDemoInicializado();
    if (typeof window.sincronizarHeaderComPeriodoDemo === 'function') {
        window.sincronizarHeaderComPeriodoDemo();
    }

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
        let metaReservaOrcadaTotal = 0;

        const receitasPorCat = {};
        const despesasPorCat = {};

        // 1. Histórico acumulado da Reserva de Emergência e Investimentos:
        // - valor_realizado (vr) é o que foi efetivamente GUARDADO / INVESTIDO
        // - valor_total (vt) é a META definida pelo usuário no Orçado
        const datasReserva = [];
        const datasInvestimento = [];
        let totalInvestimentosAcumulado = 0;
        let metaInvestimentosOrcadaTotal = 0;
        const investimentosPorNome = {};

        movsAtivas.forEach(m => {
            const vr = parseFloat(m.valor_realizado) || 0;
            const vt = parseFloat(m.valor_total) || 0;

            if (isTipoReservaEmergencia(m)) {
                reservaAcumuladaTotal += vr;
                metaReservaOrcadaTotal += vt;
                if (m.data_lancamento && m.data_lancamento.includes('-')) {
                    datasReserva.push(m.data_lancamento);
                }
            } else if (isTipoResgateReserva(m)) {
                reservaAcumuladaTotal -= vr;
            } else if (m.tipo_gasto === 'Investimento' || (m.descricao && m.descricao.toLowerCase().includes('investimento'))) {
                totalInvestimentosAcumulado += vr;
                metaInvestimentosOrcadaTotal += vt;
                if (m.data_lancamento && m.data_lancamento.includes('-')) {
                    datasInvestimento.push(m.data_lancamento);
                }

                // Agrupamento detalhado por nome individual do investimento
                const nomeInv = m.descricao ? m.descricao.replace(/\s*\(\d+\/\d+\)$/, '').trim() : 'Investimentos';
                if (!investimentosPorNome[nomeInv]) {
                    investimentosPorNome[nomeInv] = {
                        nome: nomeInv,
                        totalRealizado: 0,
                        totalOrcado: 0,
                        datas: []
                    };
                }
                investimentosPorNome[nomeInv].totalRealizado += vr;
                investimentosPorNome[nomeInv].totalOrcado += vt;
                if (m.data_lancamento && m.data_lancamento.includes('-')) {
                    investimentosPorNome[nomeInv].datas.push(m.data_lancamento);
                }
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

        let totalComprasCartaoDemo = 0;
        let totalComprasParceladasDemo = 0;

        todosItensDoPeriodo.forEach(m => {
            if (m.deleted === 1 || m.status === 'Cancelado') return;
            if (m.tipo_gasto === 'Conta a Pagar') return;
            if (m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Pago') return;
            if (m.tipo_gasto === 'Transferência Interna' || m.tipo_gasto === 'Transferência') return;
            if (m.tipo_gasto === 'Cartão Alimentação') return;

            const vTotal = parseFloat(m.valor_total) || 0;
            const vReal = parseFloat(m.valor_realizado) || 0;
            const vEfetivo = vReal > 0 ? vReal : vTotal;

            const isParc = m.parcelado === 'Sim' || (parseInt(m.total_parcelas, 10) > 1);
            const totParc = parseInt(m.total_parcelas, 10) || 1;
            const parcAtu = parseInt(m.parcela_atual || m.numero_parcela, 10) || 1;

            if (m.tipo_gasto === 'Cartão de Crédito') {
                totalComprasCartaoDemo += vEfetivo;
            }
            if (isParc && totParc > 1) {
                totalComprasParceladasDemo += (vEfetivo * totParc);
            }

            const descName = m.descricao ? m.descricao.split(' (')[0].trim() : 'Outros';

            if (m.tipo_gasto === 'Receita' || isTipoResgateReserva(m)) {
                totalReceitasMes += vEfetivo;
                receitasPorCat[descName] = (receitasPorCat[descName] || 0) + vEfetivo;
            } else if (m.tipo_gasto === 'Investimento') {
                totalInvestimentosMes += vEfetivo;
            } else if (isTipoReservaEmergencia(m)) {
                totalReservaMes += vReal;
            } else {
                totalDespesasMes += vEfetivo;
                let catLabel = descName;
                if (isParc && totParc > 1) {
                    catLabel = `${descName} (${parcAtu}/${totParc} - Tot: ${formatBRL(vEfetivo * totParc)})`;
                }
                despesasPorCat[catLabel] = (despesasPorCat[catLabel] || 0) + vEfetivo;
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
        // O valor exibido no card de Reserva é estritamente o que foi GUARDADO (Realizado)
        if (elRes) elRes.innerText = formatBRL(reservaAcumuladaTotal);

        if (subRec) {
            subRec.innerText = isMultiPeriodo
                ? `Soma das entradas em ${descPeriodo}`
                : `Total de entradas em ${descPeriodo}`;
        }
        if (subDes) {
            let infoExtraCartao = '';
            if (totalComprasCartaoDemo > 0 || totalComprasParceladasDemo > 0) {
                infoExtraCartao = ` &bull; 💳 Cartão: ${formatBRL(totalComprasCartaoDemo)}${totalComprasParceladasDemo > 0 ? ` (Total Parcelado: ${formatBRL(totalComprasParceladasDemo)})` : ''}`;
            }
            subDes.innerText = (isMultiPeriodo
                ? `Soma das despesas em ${descPeriodo}`
                : `Total de contas e gastos em ${descPeriodo}`) + infoExtraCartao;
        }
        if (subInv) {
            subInv.innerText = isMultiPeriodo
                ? `Soma investida/prevista em ${descPeriodo}`
                : `Aplicações no período (${descPeriodo})`;
        }
        if (subRes) {
            subRes.innerText = isMultiPeriodo
                ? `Guardado no período: ${formatBRL(totalReservaMes)} • Total Guardado: ${formatBRL(reservaAcumuladaTotal)}`
                : `Guardado no mês: ${formatBRL(totalReservaMes)} • Total Guardado: ${formatBRL(reservaAcumuladaTotal)}`;
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
                    ? `Saldo Positivo no Período • ${descPeriodo}`
                    : `Saldo Positivo no Mês (${descPeriodo})`;
            } else {
                saldoIcon.innerText = '🔴';
                saldoTitulo.innerText = isMultiPeriodo
                    ? `Atenção: Saídas Superaram Entradas • ${descPeriodo}`
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
                data: ['Receitas', 'Despesas', 'Investimentos'],
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
                    name: 'Receitas',
                    type: 'bar',
                    data: [totalReceitasMes],
                    itemStyle: { color: '#10B981', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#10B981', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                },
                {
                    name: 'Despesas',
                    type: 'bar',
                    data: [totalDespesasMes],
                    itemStyle: { color: '#EF4444', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#EF4444', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                },
                {
                    name: 'Investimentos',
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
        
        // Regra de Meta da Reserva:
        // O valor Orçado lançado pelo usuário é a sua Meta de Reserva Emergencial.
        // Caso o usuário não tenha lançado nenhum orçado para a reserva, usa a recomendação de 3 meses de despesas (mínimo R$ 3.000).
        let metaReservaFinal = 0;
        let labelMeta = 'Meta da Reserva';
        if (metaReservaOrcadaTotal > 0) {
            metaReservaFinal = metaReservaOrcadaTotal;
            labelMeta = 'Meta da Reserva';
        } else {
            metaReservaFinal = Math.max(despesaMediaMensal * 3, 3000);
            labelMeta = 'Meta (3 meses)';
        }

        let percentualReserva = 0;
        if (metaReservaFinal > 0) {
            percentualReserva = Math.min(100, Math.max(0, (reservaAcumuladaTotal / metaReservaFinal) * 100));
        }

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
                        return window.privacyMode ? '•••%' : Number(value).toFixed(0) + '% da meta';
                    },
                    color: chartTextColor,
                    fontWeight: 'bold'
                },
                data: [{ value: Number(percentualReserva.toFixed(1)), name: 'Segurança Atual' }]
            }]
        };
        pbiChartGauge.setOption(gaugeOption, true);

        const elResumoGauge = document.getElementById('lblResumoGaugeReserva');
        if (elResumoGauge) {
            elResumoGauge.innerHTML = `🛡️ <strong>Guardado:</strong> ${formatBRL(reservaAcumuladaTotal)} &bull; <strong>${labelMeta}:</strong> ${formatBRL(metaReservaFinal)}`;
        }

        const elPeriodoMeta = document.getElementById('lblPeriodoMetaReserva');
        if (elPeriodoMeta) {
            if (datasReserva.length > 0) {
                datasReserva.sort();
                const dIniIso = datasReserva[0];
                const dFimIso = datasReserva[datasReserva.length - 1];

                const formatarDataAmigavel = (isoStr) => {
                    const [y, m, d] = isoStr.split('-');
                    const idx = parseInt(m, 10) - 1;
                    const nomeMes = MESES_NOMES_DEMO[idx] || m;
                    return {
                        dataFormatada: `${d}/${m}/${y}`,
                        mesAno: `${nomeMes}/${y}`,
                        textoCompleto: `${d}/${m}/${y} (${nomeMes}/${y})`
                    };
                };

                const inicioInfo = formatarDataAmigavel(dIniIso);
                const fimInfo = formatarDataAmigavel(dFimIso);

                const [yIni, mIni] = dIniIso.split('-').map(Number);
                const [yFim, mFim] = dFimIso.split('-').map(Number);
                const qtdMesesMeta = Math.max(1, (yFim - yIni) * 12 + (mFim - mIni) + 1);

                elPeriodoMeta.innerHTML = `
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; margin-top: 4px;">
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); padding: 5px 12px; border-radius: 8px; color: #3B82F6; font-size: 0.8rem; font-weight: 700;">
                            <span>📅</span> Início da Meta: <strong style="color: var(--text-primary);">${inicioInfo.textoCompleto}</strong>
                        </span>
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 5px 12px; border-radius: 8px; color: #10B981; font-size: 0.8rem; font-weight: 700;">
                            <span>🏁</span> Prazo Final: <strong style="color: var(--text-primary);">${fimInfo.textoCompleto}</strong>
                        </span>
                        ${qtdMesesMeta > 1 ? `
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); padding: 5px 10px; border-radius: 8px; color: #D97706; font-size: 0.8rem; font-weight: 700;">
                            <span>⏱️</span> Prazo: ${qtdMesesMeta} meses
                        </span>` : ''}
                    </div>
                `;
                elPeriodoMeta.style.display = 'block';

                const badgeResKpi = document.getElementById('badgePeriodoReservaKpi');
                if (badgeResKpi) {
                    badgeResKpi.innerHTML = `📅 ${inicioInfo.mesAno} ➜ 🏁 ${fimInfo.mesAno} (${qtdMesesMeta}m)`;
                    badgeResKpi.style.display = 'block';
                }
                const lblPrazoResumoRes = document.getElementById('lblPrazoResumoReserva');
                if (lblPrazoResumoRes) {
                    lblPrazoResumoRes.innerText = `Prazo: ${inicioInfo.dataFormatada} a ${fimInfo.dataFormatada} (${qtdMesesMeta} meses)`;
                    lblPrazoResumoRes.style.display = 'block';
                }
            } else {
                elPeriodoMeta.innerHTML = '';
                elPeriodoMeta.style.display = 'none';
                const badgeResKpi = document.getElementById('badgePeriodoReservaKpi');
                if (badgeResKpi) badgeResKpi.style.display = 'none';
                const lblPrazoResumoRes = document.getElementById('lblPrazoResumoReserva');
                if (lblPrazoResumoRes) lblPrazoResumoRes.style.display = 'none';
            }
        }

        // ==============================================================
        // RENDERIZAÇÃO DE METAS E PRAZOS DE INVESTIMENTOS
        // ==============================================================
        const elResumoInv = document.getElementById('lblResumoInvestimentos');
        const barraProgressoInv = document.getElementById('barraProgressoInvestimento');
        const lblPercInv = document.getElementById('lblPercentualMetaInvestimento');
        const elPeriodoMetaInv = document.getElementById('lblPeriodoMetaInvestimento');
        const badgeInvKpi = document.getElementById('badgePeriodoInvestimentoKpi');
        const lblPrazoResumoInv = document.getElementById('lblPrazoResumoInvestimento');

        if (datasInvestimento.length > 0) {
            datasInvestimento.sort();
            const dIniIsoInv = datasInvestimento[0];
            const dFimIsoInv = datasInvestimento[datasInvestimento.length - 1];

            const formatarDataAmigavelInv = (isoStr) => {
                const [y, m, d] = isoStr.split('-');
                const idx = parseInt(m, 10) - 1;
                const nomeMes = MESES_NOMES_DEMO[idx] || m;
                return {
                    dataFormatada: `${d}/${m}/${y}`,
                    mesAno: `${nomeMes}/${y}`,
                    textoCompleto: `${d}/${m}/${y} (${nomeMes}/${y})`
                };
            };

            const inicioInvInfo = formatarDataAmigavelInv(dIniIsoInv);
            const fimInvInfo = formatarDataAmigavelInv(dFimIsoInv);

            const [yIniInv, mIniInv] = dIniIsoInv.split('-').map(Number);
            const [yFimInv, mFimInv] = dFimIsoInv.split('-').map(Number);
            const qtdMesesInv = Math.max(1, (yFimInv - yIniInv) * 12 + (mFimInv - mIniInv) + 1);

            const metaInvFinal = metaInvestimentosOrcadaTotal > 0 ? metaInvestimentosOrcadaTotal : totalInvestimentosAcumulado;
            const percInv = metaInvFinal > 0 ? Math.min(100, Math.round((totalInvestimentosAcumulado / metaInvFinal) * 100)) : 100;

            if (elResumoInv) {
                elResumoInv.innerHTML = `📈 <strong>Total Investido (Realizado):</strong> ${formatBRL(totalInvestimentosAcumulado)} &bull; <strong>Meta Orçada:</strong> ${formatBRL(metaInvFinal)}`;
            }
            if (barraProgressoInv) {
                barraProgressoInv.style.width = `${window.privacyMode ? 0 : percInv}%`;
            }
            if (lblPercInv) {
                lblPercInv.innerText = window.privacyMode ? '•••% (Meta Oculta)' : `${percInv}% (${formatBRL(totalInvestimentosAcumulado)} / ${formatBRL(metaInvFinal)})`;
            }

            if (elPeriodoMetaInv) {
                elPeriodoMetaInv.innerHTML = `
                    <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap; margin-top: 4px;">
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); padding: 5px 12px; border-radius: 8px; color: #8B5CF6; font-size: 0.8rem; font-weight: 700;">
                            <span>📅</span> Início da Meta: <strong style="color: var(--text-primary);">${inicioInvInfo.textoCompleto}</strong>
                        </span>
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 5px 12px; border-radius: 8px; color: #10B981; font-size: 0.8rem; font-weight: 700;">
                            <span>🏁</span> Prazo Final: <strong style="color: var(--text-primary);">${fimInvInfo.textoCompleto}</strong>
                        </span>
                        ${qtdMesesInv > 1 ? `
                        <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); padding: 5px 10px; border-radius: 8px; color: #3B82F6; font-size: 0.8rem; font-weight: 700;">
                            <span>⏱️</span> Prazo: ${qtdMesesInv} meses
                        </span>` : ''}
                    </div>
                `;
                elPeriodoMetaInv.style.display = 'block';
            }

            if (badgeInvKpi) {
                badgeInvKpi.innerHTML = `📅 ${inicioInvInfo.mesAno} ➜ 🏁 ${fimInvInfo.mesAno} (${qtdMesesInv}m)`;
                badgeInvKpi.style.display = 'block';
            }

            if (lblPrazoResumoInv) {
                lblPrazoResumoInv.innerText = `Prazo: ${inicioInvInfo.dataFormatada} a ${fimInvInfo.dataFormatada} (${qtdMesesInv} meses)`;
                lblPrazoResumoInv.style.display = 'block';
            }

            // Exibição de cada investimento individual com seu respectivo prazo e valor
            const listaDetalhadosEl = document.getElementById('listaInvestimentosDetalhados');
            if (listaDetalhadosEl) {
                const chavesInv = Object.keys(investimentosPorNome);
                if (chavesInv.length > 0) {
                    let htmlCards = '<div style="font-size: 0.8rem; font-weight: 700; color: #8B5CF6; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">📋 Seus Investimentos Ativos:</div>';
                    chavesInv.forEach(nome => {
                        const inv = investimentosPorNome[nome];
                        inv.datas.sort();
                        const dIni = inv.datas[0] || '';
                        const dFim = inv.datas[inv.datas.length - 1] || '';
                        
                        let prazoTexto = 'Data pontual';
                        let qtdM = 1;
                        if (dIni && dFim) {
                            const [y1, m1, dia1] = dIni.split('-');
                            const [y2, m2, dia2] = dFim.split('-');
                            qtdM = Math.max(1, (parseInt(y2) - parseInt(y1)) * 12 + (parseInt(m2) - parseInt(m1)) + 1);
                            prazoTexto = `📅 Início: ${dia1}/${m1}/${y1} • 🏁 Fim: ${dia2}/${m2}/${y2} (${qtdM} ${qtdM === 1 ? 'mês' : 'meses'})`;
                        }

                        const metaItem = inv.totalOrcado > 0 ? inv.totalOrcado : inv.totalRealizado;
                        const percItem = metaItem > 0 ? Math.min(100, Math.round((inv.totalRealizado / metaItem) * 100)) : 100;

                        htmlCards += `
                            <div style="background: var(--bg-secondary); border: 1.5px solid rgba(139, 92, 246, 0.45); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: all 0.2s;" onclick="abrirGerenciadorMeta('Investimento', '${inv.nome.replace(/'/g, "\\'")}')" title="Clique para editar ou excluir a meta de ${inv.nome}">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 800; color: var(--text-primary); font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                                        <span>📈</span> <span>${inv.nome}</span>
                                    </span>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-weight: 800; color: #8B5CF6; font-size: 0.95rem;">${formatBRL(inv.totalRealizado)}</span>
                                        <span style="font-size: 0.74rem; background: rgba(139, 92, 246, 0.2); border: 1px solid #8B5CF6; color: #8B5CF6; padding: 2px 8px; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                                            <span>✏️</span> Editar
                                        </span>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-secondary); font-weight: 600;">
                                    <span>Meta Prevista: <strong style="color: var(--text-primary);">${formatBRL(metaItem)}</strong></span>
                                    <span style="color: #8B5CF6; font-weight: 700;">${window.privacyMode ? '•••%' : percItem + '%'}</span>
                                </div>
                                <div style="width: 100%; height: 6px; background: var(--bg-card); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
                                    <div style="width: ${window.privacyMode ? 0 : percItem}%; height: 100%; background: linear-gradient(90deg, #8B5CF6, #A855F7); border-radius: 4px;"></div>
                                </div>
                                <div style="font-size: 0.75rem; color: #3B82F6; font-weight: 700; margin-top: 2px;">
                                    ${prazoTexto}
                                </div>
                            </div>
                        `;
                    });
                    listaDetalhadosEl.innerHTML = htmlCards;
                    listaDetalhadosEl.style.display = 'flex';
                } else {
                    listaDetalhadosEl.innerHTML = '';
                    listaDetalhadosEl.style.display = 'none';
                }
            }
        } else {
            if (elResumoInv) elResumoInv.innerHTML = `📈 <strong>Total Investido:</strong> R$ 0,00`;
            if (barraProgressoInv) barraProgressoInv.style.width = '0%';
            if (lblPercInv) lblPercInv.innerText = '0%';
            if (elPeriodoMetaInv) {
                elPeriodoMetaInv.innerHTML = '';
                elPeriodoMetaInv.style.display = 'none';
            }
            if (badgeInvKpi) badgeInvKpi.style.display = 'none';
            if (lblPrazoResumoInv) lblPrazoResumoInv.style.display = 'none';
            const listaDetalhadosEl = document.getElementById('listaInvestimentosDetalhados');
            if (listaDetalhadosEl) {
                listaDetalhadosEl.innerHTML = '';
                listaDetalhadosEl.style.display = 'none';
            }
        }

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

// ==============================================================
// GESTÃO DIRETA DE METAS E PRAZOS (RESERVA E INVESTIMENTOS)
// Permite editar, salvar, cancelar e excluir o plano todo
// ==============================================================
window.planoMetaAtual = null;

async function abrirGerenciadorMeta(tipo, nomeInvestimento) {
    window.planoMetaAtual = null;
    const modal = document.getElementById('modalGerenciarPlanoMeta');
    if (!modal) return;

    const iconeEl = document.getElementById('iconeModalGerenciarMeta');
    const tituloEl = document.getElementById('tituloModalGerenciarMeta');
    const grupoNome = document.getElementById('grupoNomeMeta');
    const lblNome = document.getElementById('lblMetaPlanoNome');
    const inputNome = document.getElementById('metaPlanoNome');
    const inputTipo = document.getElementById('metaPlanoTipoGasto');
    const inputValor = document.getElementById('metaPlanoValor');
    const inputRealizado = document.getElementById('metaPlanoRealizado');
    const inputDataIni = document.getElementById('metaPlanoDataInicio');
    const inputDataFim = document.getElementById('metaPlanoDataFim');
    const btnExcluir = document.getElementById('btnExcluirPlanoMeta');
    const lblValor = document.getElementById('lblMetaPlanoValor');

    if (inputTipo) inputTipo.value = tipo;

    const isReserva = (tipo === 'Reserva de Emergência');
    if (iconeEl) iconeEl.innerText = isReserva ? '🛡️' : '📈';
    if (tituloEl) {
        tituloEl.innerText = isReserva
            ? 'Gerenciar Meta: Reserva de Emergência'
            : (nomeInvestimento ? `Gerenciar Meta: ${nomeInvestimento}` : 'Gerenciar Meta: Investimentos');
    }

    if (lblValor) {
        lblValor.innerText = isReserva ? 'Meta Mensal (Orçado)' : 'Meta Mensal (Orçado)';
    }

    if (lblNome) {
        lblNome.innerText = isReserva ? 'Nome da Meta' : 'Nome do Investimento';
    }

    if (grupoNome) {
        grupoNome.style.display = 'block';
    }
    if (inputNome) {
        inputNome.value = nomeInvestimento || (isReserva ? 'Reserva de Emergência' : 'Investimento');
        if (isReserva) {
            inputNome.readOnly = true;
            inputNome.style.opacity = '0.85';
            inputNome.style.background = 'var(--bg-secondary)';
        } else {
            inputNome.readOnly = false;
            inputNome.style.opacity = '1';
            inputNome.style.background = 'var(--bg-secondary)';
        }
    }

    // Buscar movimentações existentes desse plano no banco Dexie
    const allMovs = await dbLocal.movimentacoes.toArray();
    const activeMovs = allMovs.filter(m => m.deleted !== 1);
    let movs = [];

    if (isReserva) {
        movs = activeMovs.filter(m => isTipoReservaEmergencia(m));
    } else {
        if (nomeInvestimento) {
            movs = activeMovs.filter(m => {
                const desc = (m.descricao || '').replace(/\s*\(\d+\/\d+\)$/, '').trim();
                return (m.tipo_gasto === 'Investimento' || (m.descricao && m.descricao.toLowerCase().includes('investimento'))) && desc === nomeInvestimento;
            });
        } else {
            movs = activeMovs.filter(m => m.tipo_gasto === 'Investimento' || (m.descricao && m.descricao.toLowerCase().includes('investimento')));
        }
    }

    // Ordenar cronologicamente
    movs.sort((a, b) => (a.data_lancamento || '').localeCompare(b.data_lancamento || ''));

    if (movs.length > 0) {
        const dIniIso = movs[0].data_lancamento || (new Date()).toISOString().split('T')[0];
        const dFimIso = movs[movs.length - 1].data_lancamento || dIniIso;

        // Meta orçada: pega o valor_total da movimentação
        const vOrcado = parseFloat(movs[0].valor_total) || 0;
        
        // Realizado: soma do que já foi guardado
        let vRealizado = 0;
        movs.forEach(m => {
            vRealizado += (parseFloat(m.valor_realizado) || 0);
        });

        if (inputValor && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inputValor, vOrcado);
        if (inputRealizado && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inputRealizado, vRealizado);
        if (inputDataIni) inputDataIni.value = dIniIso;
        if (inputDataFim) inputDataFim.value = dFimIso.substring(0, 7);
        if (btnExcluir) {
            btnExcluir.disabled = false;
            btnExcluir.style.opacity = '1';
            btnExcluir.style.cursor = 'pointer';
            btnExcluir.style.display = 'flex';
        }

        window.planoMetaAtual = {
            tipo,
            nomeInvestimento: nomeInvestimento || movs[0].descricao.replace(/\s*\(\d+\/\d+\)$/, '').trim(),
            movs,
            idGrupo: movs[0].id_grupo || ''
        };
    } else {
        // Não há plano criado ainda
        const hoje = new Date();
        const y = hoje.getFullYear();
        const m = String(hoje.getMonth() + 1).padStart(2, '0');
        const d = String(hoje.getDate()).padStart(2, '0');
        const dIniStr = `${y}-${m}-${d}`;

        const dFimObj = new Date(y, hoje.getMonth() + 5, 1);
        const yFim = dFimObj.getFullYear();
        const mFim = String(dFimObj.getMonth() + 1).padStart(2, '0');
        const dFimStr = `${yFim}-${mFim}`;

        if (inputValor && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inputValor, 0);
        if (inputRealizado && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inputRealizado, 0);
        if (inputDataIni) inputDataIni.value = dIniStr;
        if (inputDataFim) inputDataFim.value = dFimStr;
        if (btnExcluir) {
            btnExcluir.disabled = true;
            btnExcluir.style.opacity = '0.35';
            btnExcluir.style.cursor = 'not-allowed';
            btnExcluir.style.display = 'flex';
        }

        window.planoMetaAtual = {
            tipo,
            nomeInvestimento: nomeInvestimento || (isReserva ? 'Reserva de Emergência' : 'Investimento'),
            movs: [],
            idGrupo: ''
        };
    }

    atualizarResumoCalculadoModalMeta();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function fecharModalGerenciarMeta() {
    const modal = document.getElementById('modalGerenciarPlanoMeta');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    window.planoMetaAtual = null;
}

function atualizarResumoCalculadoModalMeta() {
    const box = document.getElementById('boxResumoCalculoMeta');
    if (!box) return;

    const dataIni = document.getElementById('metaPlanoDataInicio')?.value;
    const dataFim = document.getElementById('metaPlanoDataFim')?.value;
    const valOrc = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('metaPlanoValor')?.value) : 0;
    const valReal = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('metaPlanoRealizado')?.value) : 0;
    const tipo = document.getElementById('metaPlanoTipoGasto')?.value || '';

    if (!dataIni || !dataFim) {
        box.innerHTML = `<span style="color: #94A3B8;">Informe a data de início e o mês final para calcular o plano.</span>`;
        return;
    }

    const [yIni, mIni, dIni] = dataIni.split('-').map(Number);
    const [yFim, mFim] = dataFim.split('-').map(Number);
    const diffMeses = (yFim - yIni) * 12 + (mFim - mIni);

    if (diffMeses < 0) {
        box.innerHTML = `<span style="color: #EF4444; font-weight: 700;">⚠️ O prazo final não pode ser anterior à data de início!</span>`;
        return;
    }

    const qtdMeses = diffMeses + 1;
    const totalProgramado = qtdMeses * valOrc;
    const cor = (tipo === 'Investimento') ? '#8B5CF6' : '#D97706';

    box.innerHTML = `
        <div style="font-weight: 800; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
            <span>⏱️ Duração: <strong style="color: ${cor};">${qtdMeses} ${qtdMeses === 1 ? 'mês' : 'meses'}</strong></span>
            <span style="color: #10B981; font-weight: 800;">Total: ${formatBRL(totalProgramado)}</span>
        </div>
        <div style="display: flex; gap: 4px 10px; flex-wrap: wrap; font-size: 0.76rem; color: var(--text-secondary);">
            <span>📅 De: <strong style="color: #3B82F6;">${String(dIni).padStart(2,'0')}/${String(mIni).padStart(2,'0')}/${yIni}</strong></span>
            <span>🏁 Até: <strong style="color: #10B981;">${String(mFim).padStart(2,'0')}/${yFim}</strong></span>
            <span>💰 Aporte: <strong style="color: var(--text-primary);">${formatBRL(valOrc)}</strong></span>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.3;">
            ℹ️ Ao salvar, o sistema atualizará ou criará automaticamente as movimentações no seu plano financeiro.
        </div>
    `;
}

async function salvarPlanoMetaSubmit(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    const dataIni = document.getElementById('metaPlanoDataInicio')?.value;
    const dataFim = document.getElementById('metaPlanoDataFim')?.value;
    const valOrc = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('metaPlanoValor')?.value) : 0;
    const valReal = (typeof desformatarMoedaInput === 'function') ? desformatarMoedaInput(document.getElementById('metaPlanoRealizado')?.value) : 0;
    const tipo = document.getElementById('metaPlanoTipoGasto')?.value || 'Investimento';
    const nome = (tipo === 'Reserva de Emergência') ? 'Reserva de Emergência' : (document.getElementById('metaPlanoNome')?.value.trim() || 'Investimento');

    if (!dataIni || !dataFim) {
        alert("Por favor, preencha a data de início e o prazo final!");
        return;
    }

    const [yIni, mIni, dIni] = dataIni.split('-').map(Number);
    const [yFim, mFim] = dataFim.split('-').map(Number);
    const diffMeses = (yFim - yIni) * 12 + (mFim - mIni);

    if (diffMeses < 0) {
        alert("O prazo final não pode ser anterior à data de início!");
        return;
    }

    const qtdMeses = diffMeses + 1;
    const timestamp = Date.now();
    const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = authUser ? authUser.id : (localStorage.getItem('financas_current_user_id') || null);

    try {
        const plano = window.planoMetaAtual || { movs: [] };
        const movsAntigas = plano.movs || [];

        // Definir ID do grupo
        let idGrupo = plano.idGrupo;
        if (!idGrupo) {
            idGrupo = 'GRP-' + generateUUID().split('-')[0].toUpperCase();
        }

        // Gerar datas alvo para cada mês do período
        const baseDate = new Date(yIni, mIni - 1, dIni, 12, 0, 0);
        const datasAlvo = [];
        for (let i = 0; i < qtdMeses; i++) {
            const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0);
            datasAlvo.push(dt.toISOString().split('T')[0]);
        }

        const mesesAlvoMap = new Set(datasAlvo.map(d => d.substring(0, 7)));

        // 1. Atualizar existentes ou criar novos para cada mês alvo
        for (let i = 0; i < datasAlvo.length; i++) {
            const dataStr = datasAlvo[i];
            const mesAno = dataStr.substring(0, 7);

            const movExistente = movsAntigas.find(m => m.data_lancamento && m.data_lancamento.substring(0, 7) === mesAno);

            const vr = (i === 0) ? valReal : (movExistente ? (parseFloat(movExistente.valor_realizado) || 0) : 0);
            const statusLanc = (vr > 0) ? 'Pago' : 'Pendente';

            if (movExistente) {
                await dbLocal.movimentacoes.update(movExistente.id, {
                    descricao: nome,
                    valor_total: valOrc,
                    valor_realizado: vr,
                    data_lancamento: dataStr,
                    tipo_gasto: tipo,
                    status: statusLanc,
                    id_grupo: idGrupo,
                    deleted: 0,
                    sync_status: 'pending_update',
                    updated_at: timestamp
                });
            } else {
                const novo = {
                    id: generateUUID(),
                    descricao: nome,
                    valor_total: valOrc,
                    valor_realizado: vr,
                    data_lancamento: dataStr,
                    tipo_gasto: tipo,
                    status: statusLanc,
                    conta_id: '1',
                    parcelado: 'Não',
                    total_parcelas: 1,
                    parcela_atual: 1,
                    id_grupo: idGrupo,
                    user_id: currentUserId,
                    deleted: 0,
                    sync_status: 'pending_insert',
                    updated_at: timestamp
                };
                await dbLocal.movimentacoes.put(novo);
            }
        }

        // 2. Excluir movimentações antigas que ficaram fora do novo período (caso tenha encurtado)
        for (const m of movsAntigas) {
            const mesAno = (m.data_lancamento || '').substring(0, 7);
            if (!mesesAlvoMap.has(mesAno)) {
                await dbLocal.movimentacoes.update(m.id, {
                    deleted: 1,
                    sync_status: 'pending_delete',
                    updated_at: timestamp
                });
            }
        }

        fecharModalGerenciarMeta();
        showToast(`✅ Plano de ${nome} atualizado com sucesso (${qtdMeses} meses programados)!`);

        // Recarregar todas as visões do sistema
        if (typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();
        if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
        if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
        if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();

    } catch(err) {
        console.error("Erro ao salvar plano de meta:", err);
        alert("Erro ao salvar plano: " + err.message);
    }
}

async function excluirPlanoMetaConfirmar() {
    const plano = window.planoMetaAtual;
    if (!plano || !plano.movs || plano.movs.length === 0) {
        fecharModalGerenciarMeta();
        return;
    }

    const nome = plano.nomeInvestimento || plano.tipo;
    const qtd = plano.movs.length;

    if (!confirm(`⚠️ ATENÇÃO: Tem certeza de que deseja excluir este plano de ${nome}?\n\nTodas as ${qtd} movimentações programadas deste período serão removidas do seu planejamento financeiro.`)) {
        return;
    }

    try {
        const timestamp = Date.now();
        for (const m of plano.movs) {
            await dbLocal.movimentacoes.update(m.id, {
                deleted: 1,
                sync_status: 'pending_delete',
                updated_at: timestamp
            });
        }

        fecharModalGerenciarMeta();
        showToast(`🗑️ Plano de ${nome} excluído com sucesso!`);

        if (typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();
        if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
        if (typeof renderizarExtratoCompleto === 'function') renderizarExtratoCompleto();
        if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();

    } catch (err) {
        console.error("Erro ao excluir plano de meta:", err);
        alert("Erro ao excluir plano: " + err.message);
    }
}

window.abrirGerenciadorMeta = abrirGerenciadorMeta;
window.fecharModalGerenciarMeta = fecharModalGerenciarMeta;
window.atualizarResumoCalculadoModalMeta = atualizarResumoCalculadoModalMeta;
window.salvarPlanoMetaSubmit = salvarPlanoMetaSubmit;
window.excluirPlanoMetaConfirmar = excluirPlanoMetaConfirmar;
