let currentViewDate = new Date(2026, 5, 14); // Iniciando com data de exemplo

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

window.privacyMode = true;

window.togglePrivacyMode = function() {
    window.privacyMode = !window.privacyMode;
    const iconOn = document.getElementById('iconPrivacyOn');
    const iconOff = document.getElementById('iconPrivacyOff');
    if(iconOn) iconOn.style.display = window.privacyMode ? 'block' : 'none';
    if(iconOff) iconOff.style.display = window.privacyMode ? 'none' : 'block';
    
    const iconHeaderOn = document.getElementById('iconPrivacyHeaderOn');
    const iconHeaderOff = document.getElementById('iconPrivacyHeaderOff');
    const textHeader = document.getElementById('textPrivacyHeader');
    if(iconHeaderOn) iconHeaderOn.style.display = window.privacyMode ? 'block' : 'none';
    if(iconHeaderOff) iconHeaderOff.style.display = window.privacyMode ? 'none' : 'block';
    if(textHeader) textHeader.innerText = window.privacyMode ? 'Ocultar' : 'Mostrar';

    carregarPlanejamento();
    if(document.getElementById('tabAPagar').style.display === 'block') {
        if(typeof carregarContasAPagar === 'function') carregarContasAPagar();
    }
    if(document.getElementById('tabDesejos').style.display === 'block') {
        if(typeof carregarListaDesejos === 'function') carregarListaDesejos();
    }
    if(document.getElementById('modalFatura').style.display === 'flex') {
        const mesAtualLabel = document.getElementById('lblFaturaTituloMes').innerText;
        abrirModalFatura(mesAtualLabel);
    }
    if(typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI').style.display !== 'none') {
        renderPowerBIDashboard();
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
        anoSelect.value = currentViewDate.getFullYear();
    }
    
    // Aplicar tema salvo
    const temaSalvo = localStorage.getItem('app_tema');
    if (temaSalvo) {
        document.getElementById('temaSelector').value = temaSalvo;
        aplicarTema(temaSalvo);
    }
}

function updateMonthLabel() {
    const mesesCompletos = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    // Usa data de hoje se o mês e ano baterem com o currentViewDate
    const hoje = new Date();
    let displayDate = currentViewDate;
    if (hoje.getMonth() === currentViewDate.getMonth() && hoje.getFullYear() === currentViewDate.getFullYear()) {
        displayDate = hoje;
    }
    
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

    const monthGrid = document.getElementById('monthGrid');
    if (monthGrid) {
        monthGrid.innerHTML = '';
        const mesesCurtos = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        mesesCurtos.forEach((mesStr, index) => {
            const isActive = index === currentViewDate.getMonth() ? 'active' : '';
            monthGrid.innerHTML += `
                <div class="month-tab ${isActive}" onclick="selecionarMes(${index})">
                    ${mesStr}
                    <div class="dot"></div>
                </div>
            `;
        });
    }

    carregarPlanejamento();
}

function selecionarMes(mesIndex) {
    currentViewDate.setMonth(mesIndex);
    updateMonthLabel();
    if(document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display === 'block' && typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();
}

function selecionarAno(anoStr) {
    currentViewDate.setFullYear(parseInt(anoStr));
    updateMonthLabel();
    if(document.getElementById('tabPowerBI') && document.getElementById('tabPowerBI').style.display === 'block' && typeof renderPowerBIDashboard === 'function') renderPowerBIDashboard();
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
            statusSelect.options[1].text = 'Programar';
        } else if (tipo === 'Conta a Pagar') {
            statusSelect.options[1].text = 'Programado';
        } else {
            statusSelect.options[1].text = 'Pago';
        }
    }
}


function fecharModalLancamento() {
    document.getElementById('modalLancamento').style.display = 'none';
}

function abrirModalLancamento() {
    document.getElementById('inputIdMovimentacao').value = '';
    document.getElementById('formLancamento').reset();
    document.getElementById('inputParcelado').disabled = false;
    document.getElementById('divParcelas').style.display = 'none';
    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'none';
    if(document.getElementById('divDataFim')) document.getElementById('divDataFim').style.display = 'none';
    document.getElementById('btnSalvar').innerText = 'Salvar Lançamento';
    document.getElementById('modalLancamento').style.display = 'flex';
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
    const item = await dbLocal.movimentacoes.get(id);
    if (!item) return;

    await abrirModalLancamento(); // Prepara o modal e carrega as contas

    document.getElementById('inputIdMovimentacao').value = item.id;
    document.getElementById('inputTipoGasto').value = item.tipo_gasto;
    document.getElementById('inputDescricao').value = item.descricao;
    document.getElementById('inputValor').value = item.valor_total;
    document.getElementById('inputValorRealizado').value = item.valor_realizado || 0;
    document.getElementById('inputData').value = item.data_lancamento;
    document.getElementById('inputStatus').value = item.status;
    
    const btnExcluir = document.getElementById('btnExcluir');
    if(btnExcluir) btnExcluir.style.display = 'block';

    document.getElementById('inputParcelado').checked = (item.parcelado === 'Sim');
    document.getElementById('inputParcelado').disabled = true; 
    toggleParcelas();

    if(item.parcelado === 'Sim') {
        document.getElementById('inputTotalParcelas').value = item.total_parcelas;
    }

    document.getElementById('btnSalvar').innerText = 'Atualizar';
    atualizarTextoStatus();
}

async function excluirLancamento(id) {
    if(!confirm("Tem certeza que deseja excluir permanentemente esta conta?")) return;
    
    const timestamp = Date.now();
    await dbLocal.movimentacoes.update(id, { deleted: 1, sync_status: 'pending_update', updated_at: timestamp });
    
    carregarPlanejamento();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}

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

    if (idAtual) {
        // UPDATE (Edição)
        await dbLocal.movimentacoes.update(idAtual, {
            descricao: descricao,
            valor_total: valorOrcado,
            valor_realizado: valorRealizado,
            data_lancamento: data,
            tipo_gasto: tipoGasto,
            status: status,
            sync_status: 'pending_update',
            updated_at: timestamp
        });
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
        switchTab('Desejos');
    } else if (tipoGasto === 'Conta a Pagar') {
        switchTab('APagar');
    } else {
        switchTab('Painel');
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
        if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
        
        if (document.getElementById('modalFatura').style.display === 'flex') {
            fecharModalFatura();
        }
    }
}

// --- SISTEMA DE ABAS ---
function switchFinanceTab(tabName) {
    const isDesktop = window.innerWidth > 768; // simple desktop check
    
    if (tabName === 'Painel') {
        if (isDesktop && typeof renderPowerBIDashboard === 'function') {
            document.getElementById('tabPainel').style.display = 'none';
            if(document.getElementById('tabPowerBI')) document.getElementById('tabPowerBI').style.display = 'block';
            renderPowerBIDashboard();
        } else {
            if(document.getElementById('tabPowerBI')) document.getElementById('tabPowerBI').style.display = 'none';
            document.getElementById('tabPainel').style.display = 'block';
        }
    } else {
        document.getElementById('tabPainel').style.display = 'none';
        if(document.getElementById('tabPowerBI')) document.getElementById('tabPowerBI').style.display = 'none';
    }

    document.getElementById('tabDesejos').style.display = tabName === 'Desejos' ? 'block' : 'none';
    document.getElementById('tabAPagar').style.display = tabName === 'APagar' ? 'block' : 'none';
    
    document.getElementById('navPainel').classList.toggle('active', tabName === 'Painel');
    document.getElementById('navDesejos').classList.toggle('active', tabName === 'Desejos');
    document.getElementById('navAPagar').classList.toggle('active', tabName === 'APagar');

    if (tabName === 'Desejos') {
        carregarListaDesejos();
    } else if (tabName === 'APagar') {
        carregarContasAPagar();
    }
}

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

// --- CARREGAR LISTA DE DESEJOS ---
async function carregarListaDesejos() {
    const movs = await dbLocal.movimentacoes.toArray();
    const desejos = movs.filter(m => m.tipo_gasto === 'Lista de Desejos' && m.status !== 'Cancelado' && m.deleted !== 1);
    
    const container = document.getElementById('listaDesejosContainer');
    container.innerHTML = '';

    if (desejos.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #64748B;">Nenhum desejo na lista ainda. Clique no + para sonhar!</div>';
        return;
    }

    desejos.forEach(d => {
        const div = document.createElement('div');
        div.className = 'desejo-card';
        if(d.status === 'Pago') {
            div.style.borderLeftColor = '#10B981'; // Verde se já comprou
            div.style.opacity = '0.7';
        }

        div.innerHTML = `
            <div class="card-details" style="flex:1;">
                <h4 style="${d.status === 'Pago' ? 'text-decoration: line-through;' : ''}">${d.descricao}</h4>
                <p>Estimado: ${window.privacyMode ? '•••••' : 'R$ ' + parseFloat(d.valor_total).toFixed(2).replace('.', ',')}</p>
            </div>
            <div class="desejo-actions">
                ${d.status !== 'Pago' ? `<button class="btn-comprar" style="background:#3B82F6;" onclick="editarLancamento('${d.id}')">Editar</button>` : '<span style="color:#10B981; font-weight:bold; margin-right:10px;">Programado!</span>'}
                <button class="btn-excluir" onclick="excluirLancamento('${d.id}')">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Ação de Salvar Desejo Rápido
async function adicionarDesejoRapido() {
    const desc = document.getElementById('novoDesejoDesc').value;
    const valor = parseFloat(document.getElementById('novoDesejoValor').value);

    if (!desc || !valor) {
        alert("Preencha o desejo e o valor estimado.");
        return;
    }

    const novoLancamento = {
        id: generateUUID(),
        descricao: desc,
        valor_total: valor,
        valor_realizado: 0,
        data_lancamento: '', // Deixa livre
        tipo_gasto: 'Lista de Desejos',
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
    
    // Limpa os campos
    document.getElementById('novoDesejoDesc').value = '';
    document.getElementById('novoDesejoValor').value = '';
    
    carregarListaDesejos();
    if(typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
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
document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    updateMonthLabel();
    setInterval(syncFinanceWithServer, 10000);
});


// Zoom para Gestao Financeira
let financeZoom = parseFloat(localStorage.getItem('financeZoom')) || 1.0;
function applyFinanceZoom() {
    const tabs = document.querySelectorAll('#finance-view .tab-content');
    tabs.forEach(tab => {
        tab.style.zoom = financeZoom;
    });
    // Trigger resize on charts to fix rendering issues
    if(typeof renderPowerBIDashboard === 'function' && document.getElementById('tabPowerBI').style.display !== 'none') {
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
    financeZoom += step;
    if (financeZoom < 0.6) financeZoom = 0.6;
    if (financeZoom > 1.5) financeZoom = 1.5;
    localStorage.setItem('financeZoom', financeZoom.toFixed(1));
    applyFinanceZoom();
}
document.addEventListener('DOMContentLoaded', () => {
    applyFinanceZoom();
});

