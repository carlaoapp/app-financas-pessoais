// Lógica do Dashboard Financeiro - Estilo Power BI

let pbiChartDiff, pbiChartFontesRec, pbiChartFontesDes, pbiChartGauge;

function initPowerBICharts() {
    // Inicializa instâncias do ECharts
    window.pbiChartDiff = pbiChartDiff = echarts.init(document.getElementById('pbiChartDiff'), 'dark');
    window.pbiChartFontesRec = pbiChartFontesRec = echarts.init(document.getElementById('pbiChartFontesRec'), 'dark');
    window.pbiChartFontesDes = pbiChartFontesDes = echarts.init(document.getElementById('pbiChartFontesDes'), 'dark');
    window.pbiChartGauge = pbiChartGauge = echarts.init(document.getElementById('pbiChartGauge'), 'dark');

    window.addEventListener('resize', function() {
        if(pbiChartDiff) pbiChartDiff.resize();
        if(pbiChartFontesRec) pbiChartFontesRec.resize();
        if(pbiChartFontesDes) pbiChartFontesDes.resize();
        if(pbiChartGauge) pbiChartGauge.resize();
    });
}

function formatBRL(value) {
    if (window.privacyMode) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function renderPowerBIDashboard() {
    if (typeof echarts === 'undefined') return;
    
    initPowerBICharts();
    
    // Pegar o ano e mês selecionados no select geral de Finanças
    const anoBaseSelect = document.getElementById('anoBaseSelector');
    const ano = anoBaseSelect ? parseInt(anoBaseSelect.value) : new Date().getFullYear();
    const mesBaseSelect = document.getElementById('mesBaseSelector');
    const mes = mesBaseSelect ? parseInt(mesBaseSelect.value) : new Date().getMonth();

    try {
        const todasMovs = await dbLocal.movimentacoes.toArray();
        const movsMes = todasMovs.filter(m => {
            if (m.deleted === 1) return false;
            if (!m.data_lancamento) return false;
            const dataObj = new Date(m.data_lancamento + 'T12:00:00');
            return dataObj.getFullYear() === ano && dataObj.getMonth() === mes;
        });

        let totalReceitasMes = 0;
        let totalDespesasMes = 0;

        // Agrupamentos por categoria
        const receitasPorCat = {};
        const despesasPorCat = {};

        movsMes.forEach(m => {
            const val = parseFloat(m.valor_total) || 0;
            const descName = m.descricao ? m.descricao.split(' (')[0].trim() : 'Outros';

            if (m.tipo_gasto === 'Receita') {
                totalReceitasMes += val;
                receitasPorCat[descName] = (receitasPorCat[descName] || 0) + val;
            } else if (m.tipo_gasto !== 'Receita' && m.tipo_gasto !== 'Reserva de Emergência' && m.tipo_gasto !== 'Lista de Desejos' && m.tipo_gasto !== 'Conta a Pagar') {
                totalDespesasMes += val;
                despesasPorCat[descName] = (despesasPorCat[descName] || 0) + val;
            }
        });

        const saldoMes = totalReceitasMes - totalDespesasMes;

        // Atualizar KPIs
        document.getElementById('pbiValReceitas').innerText = formatBRL(totalReceitasMes);
        document.getElementById('pbiValDespesas').innerText = formatBRL(totalDespesasMes);
        document.getElementById('pbiValSaldo').innerText = formatBRL(saldoMes);

        // --- Chart 1: Diferença Receita e Despesa ---
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mesLabel = mesesNomes[mes];
        const diffOption = {
            tooltip: { trigger: 'axis', formatter: function(params) {
                let res = params[0].name + '<br/>';
                params.forEach(p => {
                    res += p.seriesName + ': ' + formatBRL(p.value) + '<br/>';
                });
                return res;
            }, axisPointer: { type: 'shadow' } },
            legend: { data: ['Receita', 'Despesas'], textStyle: { color: '#fff' }, left: 0 },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: { type: 'category', data: [mesLabel], axisLabel: { color: '#fff' } },
            yAxis: { type: 'value', axisLabel: { color: '#fff', formatter: (value) => formatBRL(value) } },
            series: [
                {
                    name: 'Receita',
                    type: 'bar',
                    data: [totalReceitasMes],
                    itemStyle: { color: '#00d2ff' },
                    label: { show: true, position: 'top', color: '#fff', formatter: (p) => 'R$ ' + p.value }
                },
                {
                    name: 'Despesas',
                    type: 'bar',
                    data: [totalDespesasMes],
                    itemStyle: { color: '#ff003c' },
                    label: { show: true, position: 'top', color: '#fff', formatter: (p) => 'R$ ' + p.value }
                }
            ]
        };
        pbiChartDiff.setOption(diffOption);

        // --- Chart 2: Fontes de Receitas (Barra Horizontal) ---
        const catRecArr = Object.keys(receitasPorCat).map(k => ({ name: k, value: receitasPorCat[k] })).sort((a,b)=>a.value - b.value);
        const fontesRecOption = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function(params) {
                return params[0].name + '<br/>' + formatBRL(params[0].value);
            }},
            grid: { left: '3%', right: '15%', bottom: '3%', containLabel: true },
            xAxis: { type: 'value', show: false },
            yAxis: { type: 'category', data: catRecArr.map(c => c.name), axisLabel: { color: '#fff' } },
            series: [
                {
                    type: 'bar',
                    data: catRecArr.map(c => c.value),
                    itemStyle: { color: '#00d2ff' },
                    label: { show: true, position: 'right', color: '#fff', formatter: (p) => formatBRL(p.value) }
                }
            ]
        };
        pbiChartFontesRec.setOption(fontesRecOption);

        // --- Chart 3: Fontes de Despesas (Treemap) ---
        const catDesArr = Object.keys(despesasPorCat).map(k => ({ name: k, value: despesasPorCat[k] }));
        const treemapOption = {
            tooltip: { formatter: function(p) { return p.name + ': ' + formatBRL(p.value); } },
            series: [{
                type: 'treemap',
                width: '100%', height: '100%',
                roam: false,
                nodeClick: false,
                breadcrumb: { show: false },
                label: { show: true, formatter: function(p) { return p.name + '\n' + formatBRL(p.value); }, color: '#fff', fontSize: 12 },
                itemStyle: { borderColor: '#030816', borderWidth: 2 },
                data: catDesArr
            }]
        };
        pbiChartFontesDes.setOption(treemapOption);

        // --- Chart 4: Gauge Reserva de Emergência ---
        // Simulação: Saldo vs Meta de 20% das Receitas do mês.
        const metaReserva = totalReceitasMes * 0.20;
        let percentualReserva = 0;
        if (saldoMes > 0 && metaReserva > 0) {
            percentualReserva = (saldoMes / metaReserva) * 100;
        } else if (saldoMes >= metaReserva && metaReserva === 0) {
            percentualReserva = 100;
        }
        if (percentualReserva > 100) percentualReserva = 100;

        const gaugeOption = {
            series: [{
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                min: 0,
                max: 100,
                splitNumber: 4,
                axisLine: {
                    lineStyle: {
                        width: 20,
                        color: [
                            [0.3, '#ff003c'],
                            [0.7, '#f5b041'],
                            [1, '#10b981']
                        ]
                    }
                },
                pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '12%', width: 20, offsetCenter: [0, '-60%'], itemStyle: { color: 'auto' } },
                axisTick: { length: 12, lineStyle: { color: 'auto', width: 2 } },
                splitLine: { length: 20, lineStyle: { color: 'auto', width: 5 } },
                axisLabel: { color: '#fff', distance: -40, formatter: '{value}%' },
                title: { offsetCenter: [0, '30%'], color: '#fff', fontSize: 14 },
                detail: { 
                    fontSize: 24, 
                    offsetCenter: [0, '0%'], 
                    valueAnimation: true, 
                    formatter: function (value) {
                        return window.privacyMode ? '•••%' : value.toFixed(0) + '%';
                    }, 
                    color: '#fff' 
                },
                data: [{ value: percentualReserva.toFixed(2), name: '' }]
            }]
        };
        pbiChartGauge.setOption(gaugeOption);

    } catch(err) {
        console.error("Erro ao renderizar PowerBI", err);
    }
}
