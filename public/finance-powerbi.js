// Lógica do Demonstrativo Financeiro Simples - Estilo Power BI Acessível

let pbiChartDiff = null;
let pbiChartFontesRec = null;
let pbiChartFontesDes = null;
let pbiChartGauge = null;
let filtroDemonstrativoAtual = 'todos';

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

// Confirmar escolha: fecha o modal e mantém exatamente o que foi escolhido na tela
function confirmarFiltrosDemo() {
    fecharModalFiltroDemo();
    aplicarFiltrosDemonstrativo();
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
    const novoValor = event && event.target && event.target.id === 'chkDemoTudo' 
        ? chkTudo.checked 
        : true;

    chkTudo.checked = true;
    filtrosAtivosDemo = {
        receitas: true,
        despesas: true,
        investimentos: true,
        reserva: true
    };

    document.getElementById('chkDemoRec').checked = true;
    document.getElementById('chkDemoDes').checked = true;
    document.getElementById('chkDemoInv').checked = true;
    document.getElementById('chkDemoRes').checked = true;

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

    // Se usuário desmarcou tudo, mantém pelo menos a opção clicada ou marca tudo
    const totalSelecionadas = [receitas, despesas, investimentos, reserva].filter(Boolean).length;

    // Atualiza rótulo do botão principal
    const lbl = document.getElementById('lblDemoFiltroSelecionado');
    if (lbl) {
        if (todasMarcadas || nenhumaMarcada) {
            lbl.innerText = 'Ver Tudo (Completo)';
        } else if (totalSelecionadas === 1) {
            if (receitas) lbl.innerText = 'Receitas (Entradas)';
            else if (despesas) lbl.innerText = 'Despesas (Saídas)';
            else if (investimentos) lbl.innerText = 'Investimentos';
            else if (reserva) lbl.innerText = 'Reserva de Emergência';
        } else {
            lbl.innerText = `${totalSelecionadas} Categorias Selecionadas`;
        }
    }

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
    // Foca exclusivamente na opção clicada
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

async function renderPowerBIDashboard() {
    if (typeof echarts === 'undefined') return;

    initPowerBICharts();

    // Pegar o ano e mês selecionados no select do cabeçalho
    const anoBaseSelect = document.getElementById('anoBaseSelector');
    const ano = anoBaseSelect ? parseInt(anoBaseSelect.value) : new Date().getFullYear();
    const mesBaseSelect = document.getElementById('mesBaseSelector');
    const mes = mesBaseSelect ? parseInt(mesBaseSelect.value) : new Date().getMonth();

    try {
        const todasMovs = await dbLocal.movimentacoes.toArray();

        let totalReceitasMes = 0;
        let totalDespesasMes = 0;
        let totalInvestimentosMes = 0;
        let reservaAcumuladaTotal = 0;

        const receitasPorCat = {};
        const despesasPorCat = {};

        todasMovs.forEach(m => {
            if (m.deleted === 1 || m.status === 'Cancelado') return;

            const vTotal = parseFloat(m.valor_total) || 0;
            const vReal = (m.valor_realizado !== undefined && m.valor_realizado !== null && m.valor_realizado !== '')
                ? parseFloat(m.valor_realizado)
                : vTotal;

            // Histórico geral acumulado da Reserva de Emergência
            if (m.tipo_gasto === 'Reserva de Emergência') {
                reservaAcumuladaTotal += vReal;
            } else if (m.tipo_gasto === 'Resgate de Reserva') {
                reservaAcumuladaTotal -= vReal;
            }

            // Filtragem específica do mês selecionado
            if (!m.data_lancamento) return;
            const dataObj = new Date(m.data_lancamento + 'T12:00:00');
            if (dataObj.getFullYear() === ano && dataObj.getMonth() === mes) {
                const descName = m.descricao ? m.descricao.split(' (')[0].trim() : 'Outros';

                if (m.tipo_gasto === 'Receita' || m.tipo_gasto === 'Resgate de Reserva') {
                    totalReceitasMes += vReal;
                    receitasPorCat[descName] = (receitasPorCat[descName] || 0) + vReal;
                } else if (m.tipo_gasto === 'Investimento') {
                    totalInvestimentosMes += vReal;
                } else if (m.tipo_gasto === 'Reserva de Emergência') {
                    // Contabilizado no acumulado da reserva
                } else if (m.tipo_gasto !== 'Lista de Desejos' && m.tipo_gasto !== 'Conta a Pagar') {
                    totalDespesasMes += vReal;
                    despesasPorCat[descName] = (despesasPorCat[descName] || 0) + vReal;
                }
            }
        });

        const saldoMes = totalReceitasMes - totalDespesasMes - totalInvestimentosMes;

        // Atualizar os 4 Cards de Demonstrativo (KPIs)
        const elRec = document.getElementById('pbiValReceitas');
        const elDes = document.getElementById('pbiValDespesas');
        const elInv = document.getElementById('pbiValInvestimentos');
        const elRes = document.getElementById('pbiValReserva');
        const elSaldo = document.getElementById('pbiValSaldo');

        if (elRec) elRec.innerText = formatBRL(totalReceitasMes);
        if (elDes) elDes.innerText = formatBRL(totalDespesasMes);
        if (elInv) elInv.innerText = formatBRL(totalInvestimentosMes);
        if (elRes) elRes.innerText = formatBRL(reservaAcumuladaTotal);
        if (elSaldo) {
            elSaldo.innerText = formatBRL(saldoMes);
            elSaldo.style.color = saldoMes >= 0 ? '#10B981' : '#EF4444';
        }

        const saldoIcon = document.getElementById('demoSaldoIcon');
        const saldoTitulo = document.getElementById('demoSaldoTitulo');
        if (saldoIcon && saldoTitulo) {
            if (saldoMes >= 0) {
                saldoIcon.innerText = '🟢';
                saldoTitulo.innerText = 'Saldo Positivo no Mês (Sobra Livre)';
            } else {
                saldoIcon.innerText = '🔴';
                saldoTitulo.innerText = 'Atenção: Despesas Superaram as Entradas no Mês';
            }
        }

        // --- Gráfico 1: Comparativo Amigável (Entradas vs Saídas vs Investido) ---
        const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesExtenso = mesesNomes[mes] + ' / ' + ano;

        const diffOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                textStyle: { color: '#F8FAFC' },
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
                textStyle: { color: '#94A3B8', fontSize: 12 },
                top: 0
            },
            grid: { left: '3%', right: '4%', bottom: '8%', top: '45px', containLabel: true },
            xAxis: {
                type: 'category',
                data: [mesExtenso],
                axisLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: 'bold' },
                axisLine: { lineStyle: { color: '#334155' } }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#94A3B8', formatter: (val) => formatBRL(val) },
                splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.4)' } }
            },
            series: [
                {
                    name: 'Receitas (Entrou)',
                    type: 'bar',
                    data: [totalReceitasMes],
                    itemStyle: { color: '#10B981', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#34D399', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                },
                {
                    name: 'Despesas (Saiu)',
                    type: 'bar',
                    data: [totalDespesasMes],
                    itemStyle: { color: '#EF4444', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#F87171', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                },
                {
                    name: 'Investimentos (Guardado)',
                    type: 'bar',
                    data: [totalInvestimentosMes],
                    itemStyle: { color: '#8B5CF6', borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: 'top', color: '#C4B5FD', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
                }
            ]
        };
        pbiChartDiff.setOption(diffOption);

        // --- Gráfico 2: De Onde Veio o Dinheiro (Receitas) ---
        const catRecArr = Object.keys(receitasPorCat)
            .map(k => ({ name: k, value: receitasPorCat[k] }))
            .sort((a, b) => a.value - b.value);

        const fontesRecOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                textStyle: { color: '#F8FAFC' },
                formatter: function(params) {
                    return params[0].name + '<br/><strong>' + formatBRL(params[0].value) + '</strong>';
                }
            },
            grid: { left: '3%', right: '22%', bottom: '3%', top: '15px', containLabel: true },
            xAxis: { type: 'value', show: false },
            yAxis: {
                type: 'category',
                data: catRecArr.length > 0 ? catRecArr.map(c => c.name) : ['Nenhum lançamento'],
                axisLabel: { color: '#CBD5E1', fontSize: 11 },
                axisLine: { lineStyle: { color: '#334155' } }
            },
            series: [{
                type: 'bar',
                data: catRecArr.length > 0 ? catRecArr.map(c => c.value) : [0],
                itemStyle: { color: '#10B981', borderRadius: [0, 6, 6, 0] },
                label: { show: true, position: 'right', color: '#34D399', fontWeight: 'bold', formatter: (p) => formatBRL(p.value) }
            }]
        };
        pbiChartFontesRec.setOption(fontesRecOption);

        // --- Gráfico 3: Onde Foi Gasto o Dinheiro (Despesas - Rosca / Pizza Clara) ---
        const catDesArr = Object.keys(despesasPorCat)
            .map(k => ({ name: k, value: despesasPorCat[k] }))
            .sort((a, b) => b.value - a.value);

        const fontesDesOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                textStyle: { color: '#F8FAFC' },
                formatter: function(p) {
                    return p.name + '<br/><strong>' + formatBRL(p.value) + '</strong> (' + p.percent + '%)';
                }
            },
            legend: {
                orient: 'horizontal',
                bottom: '0',
                textStyle: { color: '#94A3B8', fontSize: 11 }
            },
            series: [{
                name: 'Despesas',
                type: 'pie',
                radius: ['40%', '68%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#0F172A',
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
                        color: '#FFFFFF',
                        formatter: '{b}\n{d}%'
                    }
                },
                data: catDesArr.length > 0 ? catDesArr : [{ name: 'Sem Despesas', value: 0 }]
            }]
        };
        pbiChartFontesDes.setOption(fontesDesOption);

        // --- Gráfico 4: Medidor / Termômetro da Reserva de Emergência ---
        // Meta de segurança: 3 meses de despesas médias (ou 3x despesa do mês atual)
        const metaReservaRecomendada = totalDespesasMes > 0 ? (totalDespesasMes * 3) : 5000;
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
                axisLabel: { color: '#94A3B8', distance: -36, formatter: '{value}%' },
                title: { offsetCenter: [0, '25%'], color: '#94A3B8', fontSize: 13 },
                detail: {
                    fontSize: 22,
                    offsetCenter: [0, '-5%'],
                    valueAnimation: true,
                    formatter: function (value) {
                        return window.privacyMode ? '•••%' : value.toFixed(0) + '% da meta';
                    },
                    color: '#FFFFFF',
                    fontWeight: 'bold'
                },
                data: [{ value: percentualReserva.toFixed(1), name: 'Segurança Atual' }]
            }]
        };
        pbiChartGauge.setOption(gaugeOption);

        // Aplica o filtro selecionado inicialmente
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
