/**
 * finance-auto-notificacoes.js - Sistema de Leitura Automática de Notificações e Web Share Target
 * APP Finanças Pessoais v1.8.36
 *
 * Funcionalidades:
 * 1. Web Share Target: recebe comprovantes (imagens/PDFs/textos) compartilhados diretamente de apps de bancos.
 * 2. Ingestão Automática de Notificações: interpreta notificações bancárias do celular (Pix, Cartão, Débito, Boleto, Alimentação).
 * 3. Identificação e associação automática com as contas cadastradas do usuário.
 * 4. Popup/Modal de Lançamentos Automáticos ao abrir o app para conferência ou ajuste.
 * 5. Central de Automação com Simulador de Testes em tempo real.
 */

// Chaves de armazenamento
const KEY_NOVOS_LANCAMENTOS = 'financas_novos_lancamentos_auto';
const KEY_HISTORICO_NOTIF = 'financas_historico_notificacoes_auto';

// ==========================================================================
// 1. WEB SHARE TARGET (COMPARTILHAMENTO DE COMPROVANTE DIRETO DO BANCO)
// ==========================================================================

function lerComprovanteCompartilhadoIDB() {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open('FinancasCompartilhamentoDB', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('comprovantes_temp')) {
                    db.createObjectStore('comprovantes_temp', { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('comprovantes_temp')) {
                    db.close();
                    return resolve(null);
                }
                const tx = db.transaction('comprovantes_temp', 'readwrite');
                const store = tx.objectStore('comprovantes_temp');
                const getReq = store.get('ultimo');
                getReq.onsuccess = () => {
                    const result = getReq.result;
                    if (result) {
                        store.delete('ultimo');
                    }
                    db.close();
                    resolve(result || null);
                };
                getReq.onerror = () => { db.close(); resolve(null); };
            };
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

// Verifica se o app foi aberto através do menu Compartilhar do celular
async function checarComprovanteCompartilhado() {
    const params = new URLSearchParams(window.location.search);
    const temFlag = params.has('comprovante_compartilhado') || params.has('shared');

    const dadoCompartilhado = await lerComprovanteCompartilhadoIDB();

    if (temFlag) {
        // Limpa a URL sem recarregar a tela
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    if (!dadoCompartilhado) return;

    console.log('[SHARE TARGET] Comprovante compartilhado detectado:', dadoCompartilhado);

    if (dadoCompartilhado.file && dadoCompartilhado.file.type && dadoCompartilhado.file.type.startsWith('image/')) {
        // Arquivo de imagem: aciona OCR e leitura inteligente
        if (typeof mostrarStatusOcr === 'function') mostrarStatusOcr("Lendo comprovante compartilhado com IA...");
        try {
            const base64 = await comprimirImagemComprovante(dadoCompartilhado.file);
            window.midiaComprovanteTemp = base64;
            const textoLido = await extrairTextoImagem(base64);
            if (typeof abrirModalConfirmacaoExpressoComTexto === 'function') {
                abrirModalConfirmacaoExpressoComTexto(textoLido, base64, "Comprovante Compartilhado");
            }
        } catch (err) {
            console.error('[SHARE TARGET ERROR]', err);
            alert("Não foi possível ler o comprovante compartilhado automaticamente. Você pode anexá-lo manualmente.");
        } finally {
            if (typeof ocultarStatusOcr === 'function') ocultarStatusOcr();
        }
    } else if (dadoCompartilhado.text || dadoCompartilhado.title) {
        // Compartilhamento em formato de texto (muitos bancos compartilham texto de Pix/Comprovante)
        const textoCompleto = [dadoCompartilhado.title, dadoCompartilhado.text].filter(Boolean).join('\n');
        if (typeof abrirModalConfirmacaoExpressoComTexto === 'function') {
            abrirModalConfirmacaoExpressoComTexto(textoCompleto, '', "Comprovante Compartilhado (Texto)");
        }
    }
}

// ==========================================================================
// 2. PARSER E MOTOR DE INGESTÃO AUTOMÁTICA DE NOTIFICAÇÕES
// ==========================================================================

// Normaliza texto removendo acentos e pontuação excessiva
function limparTextoNotificacao(txt) {
    if (!txt) return '';
    return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// Interpreta a notificação recebida e extrai os dados estruturados do lançamento
async function interpretarNotificacaoBancaria(notificacao) {
    const rawTitulo = notificacao.titulo || '';
    const rawTexto = notificacao.texto || '';
    const rawApp = notificacao.app_pacote || notificacao.app || '';

    const textoBruto = `${rawTitulo} ${rawTexto}`;
    const textoLimpo = limparTextoNotificacao(textoBruto);

    console.log('[NOTIFICAÇÃO ENGINE] Interpretando texto:', textoBruto);

    // 1. Extração de Valor com alta precisão
    let valorNum = 0;
    if (typeof extrairValorComprovante === 'function') {
        const resVal = extrairValorComprovante(textoBruto);
        if (resVal && resVal.numero > 0) valorNum = resVal.numero;
    }
    if (!valorNum) {
        // Fallback robusto para R$ 00,00 ou R$00.00
        const mVal = textoBruto.match(/(?:R\$|\$)\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
                     textoBruto.match(/(?:R\$|\$)\s*([0-9]+[,\.][0-9]{2})/i) ||
                     textoBruto.match(/\b([0-9]{1,5}[,\.][0-9]{2})\b/);
        if (mVal) {
            const numStr = mVal[1].replace(/\./g, '').replace(',', '.');
            valorNum = parseFloat(numStr) || 0;
        }
    }

    // Se não encontrou valor numérico válido, descarta notificação irrelevante
    if (!valorNum || valorNum <= 0) {
        return null;
    }

    // 2. Detecção de Parcelamento (ex: "em 3x", "parcelado em 2x", "1/4")
    let totalParcelas = 1;
    const mParc = textoBruto.match(/\b([0-9]{1,2})\s*X\b/i) ||
                  textoBruto.match(/\bEM\s+([0-9]{1,2})\s*(?:X|VEZES|PARCELAS)\b/i) ||
                  textoBruto.match(/\bPARCELA(?:DO)?\s+(?:EM\s+)?([0-9]{1,2})\b/i);
    if (mParc && mParc[1]) {
        const p = parseInt(mParc[1], 10);
        if (p > 1 && p <= 48) totalParcelas = p;
    }

    // 3. Detecção de Tipo de Operação
    const isPixRecebido = /\b(PIX\s+RECEBIDO|TRANSFERENCIA\s+RECEBIDA|VOCE\s+RECEBEU\s+UM\s+PIX|CREDITO\s+EM\s+CONTA|RECEBEU\s+R\$|SALARIO|PROVENTOS)\b/i.test(textoLimpo);
    const isAlimentacao = /\b(TICKET|ALELO|SODEXO|PLUXEE|VR|FLASH|CAJU|SWILE|ALIMENTACAO|REFEICAO)\b/i.test(textoLimpo) || /ticket|alelo|sodexo|pluxee|vr|flash|caju/i.test(rawApp);
    const isCredito = (totalParcelas > 1) || /\b(CREDITO|COMPRA\s+NO\s+CREDITO|CARTAO\s+DE\s+CREDITO|FATURA|NO\s+CREDITO)\b/i.test(textoLimpo);
    const isDebito = /\b(DEBITO|COMPRA\s+NO\s+DEBITO|CARTAO\s+DE\s+DEBITO|NO\s+DEBITO|CONTA\s+CORRENTE)\b/i.test(textoLimpo);
    const isBoleto = /\b(BOLETO|PAGAMENTO\s+DE\s+CONTA|FATURA\s+PAGA|PAGO\s+COM\s+SUCESSO)\b/i.test(textoLimpo);

    let tipoGasto = "Despesa Variável";
    let status = "Pago";

    if (isPixRecebido) {
        tipoGasto = "Receita";
        status = "Pago";
    } else if (isAlimentacao) {
        tipoGasto = "Cartão Alimentação";
        status = "Pago";
    } else if (isCredito) {
        tipoGasto = "Cartão de Crédito";
        status = "Pendente"; // Compras no cartão ficam pendentes na fatura até o pagamento desta
    } else if (isBoleto) {
        tipoGasto = "Despesa Fixa";
        status = "Pago";
    } else if (isDebito) {
        tipoGasto = "Despesa Variável";
        status = "Pago";
    }

    // 4. Reconhecimento de Banco e Associação com Conta Cadastrada
    let contasCadastradas = [];
    if (typeof dbLocal !== 'undefined' && dbLocal && dbLocal.contas_bancarias) {
        contasCadastradas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
    }

    let contaId = "";
    let nomeBancoIdentificado = "";

    const listaBancos = [
        { nome: "Sicredi", regex: /\b(SICREDI|VISA\s+GOLD|OUROCARD\s+SICREDI)\b/i, pacote: /sicredi/i },
        { nome: "Nubank", regex: /\bNUBANK|NU\b/i, pacote: /nu\.production|nubank/i },
        { nome: "Inter", regex: /\b(BANCO\s+INTER|INTER)\b/i, pacote: /intermedium|bancointer/i },
        { nome: "Itaú", regex: /\bITA[UÚ]\b/i, pacote: /itau/i },
        { nome: "Bradesco", regex: /\bBRADESCO\b/i, pacote: /bradesco/i },
        { nome: "Santander", regex: /\bSANTANDER\b/i, pacote: /santander/i },
        { nome: "Banco do Brasil", regex: /\b(BANCO\s+DO\s+BRASIL|OUROCARD|BB)\b/i, pacote: /bancodobrasil/i },
        { nome: "Caixa", regex: /\bCAIXA\b/i, pacote: /caixa/i },
        { nome: "C6 Bank", regex: /\b(C6\s*BANK|C6)\b/i, pacote: /c6bank/i },
        { nome: "PagBank", regex: /\b(PAGBANK|PAGSEGURO)\b/i, pacote: /pagseguro/i },
        { nome: "Mercado Pago", regex: /\b(MERCADO\s+PAGO|MERCADOPAGO)\b/i, pacote: /mercadopago/i },
        { nome: "PicPay", regex: /\bPICPAY\b/i, pacote: /picpay/i },
        { nome: "Ticket Flex", regex: /\bTICKET(?:\s+FLEX)?\b/i, pacote: /ticket/i },
        { nome: "Alelo", regex: /\bALELO\b/i, pacote: /alelo/i }
    ];

    for (let b of listaBancos) {
        if (b.regex.test(textoLimpo) || (rawApp && b.pacote.test(rawApp))) {
            nomeBancoIdentificado = b.nome;
            break;
        }
    }

    // Busca melhor conta cadastrada para vincular com prioridade de tipo de conta
    if (contasCadastradas.length > 0) {
        if (nomeBancoIdentificado) {
            const bNorm = limparTextoNotificacao(nomeBancoIdentificado);
            const candidatas = contasCadastradas.filter(c => {
                const n = limparTextoNotificacao(c.nome_conta || '');
                const b = limparTextoNotificacao(c.banco || '');
                return n.includes(bNorm) || b.includes(bNorm) || bNorm.includes(n);
            });

            if (isDebito) {
                const cDeb = candidatas.find(c => c.tipo_conta === 'Conta Corrente' || c.tipo_conta === 'Conta Salário');
                if (cDeb) contaId = cDeb.id;
            } else if (isCredito) {
                const cCred = candidatas.find(c => c.tipo_conta === 'Cartão de Crédito');
                if (cCred) contaId = cCred.id;
            } else if (isAlimentacao) {
                const cAlim = candidatas.find(c => c.tipo_conta === 'Cartão Alimentação');
                if (cAlim) contaId = cAlim.id;
            }

            if (!contaId && candidatas.length > 0) {
                contaId = candidatas[0].id;
            }
        }

        // Se ainda não casou com conta específica, filtra por tipo global
        if (!contaId) {
            if (tipoGasto === 'Cartão Alimentação') {
                const cAlim = contasCadastradas.find(c => c.tipo_conta === 'Cartão Alimentação' || /ticket|alelo|sodexo|vr/i.test(c.nome_conta || ''));
                if (cAlim) contaId = cAlim.id;
            } else if (tipoGasto === 'Cartão de Crédito') {
                const cCred = contasCadastradas.find(c => c.tipo_conta === 'Cartão de Crédito');
                if (cCred) contaId = cCred.id;
            } else {
                const cCorr = contasCadastradas.find(c => c.tipo_conta !== 'Cartão de Crédito' && c.tipo_conta !== 'Cartão Alimentação');
                if (cCorr) contaId = cCorr.id;
            }
            if (!contaId) contaId = contasCadastradas[0].id;
        }
    }

    // 5. Extração de Estabelecimento / Descrição
    let estabelecimento = "";
    if (typeof extrairEstabelecimentoComprovante === 'function') {
        estabelecimento = extrairEstabelecimentoComprovante(textoBruto, textoLimpo);
    }
    // Padrão Sicredi Notificação: "26/10 LIVRARIA MARANATHA PARANAVAI BR R$ 4,99"
    if (!estabelecimento) {
        const mSicredi = textoBruto.match(/[0-3]?[0-9]\/[0-1]?[0-9]\s+([A-Za-z0-9\s\.\-_&]{3,40}?)(?:\s+(?:Paranavai|Curitiba|Maringa|Londrina|Cascavel|SP|PR|RJ|SC|RS|MG|BR|R\$|\-|\d{4}))/i);
        if (mSicredi && mSicredi[1]) {
            estabelecimento = mSicredi[1].trim();
        }
    }
    if (!estabelecimento || /acesso|aprovada|compra|cartao|terminal/i.test(estabelecimento)) {
        // Padrões comuns em notificações: "Compra de R$ 50 aprovada em PADARIA ESTRELA"
        const mEst = textoBruto.match(/(?:em|para|no|na)\s+([A-Za-z0-9\s\.\-]{3,35})(?:\s+no|\s+no\s+crédito|\s+no\s+débito|\.|$)/i);
        if (mEst && mEst[1]) {
            estabelecimento = mEst[1].trim();
        }
    }
    if (!estabelecimento) {
        estabelecimento = isPixRecebido ? "Recebimento Pix" : (isAlimentacao ? "Supermercado / Refeição" : (isCredito ? "Compra no Cartão" : "Pagamento / Compra"));
    }

    // Formatação limpa do estabelecimento (Title Case)
    estabelecimento = estabelecimento.split(' ')
        .filter(Boolean)
        .map(p => p.length > 2 ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : p.toUpperCase())
        .join(' ');

    const hojeIso = new Date().toISOString().split('T')[0];

    return {
        descricao: estabelecimento,
        valorTotal: valorNum,
        valorRealizado: (status === 'Pago') ? valorNum : 0,
        dataLancamento: hojeIso,
        tipoGasto: tipoGasto,
        status: status,
        contaId: contaId,
        parcelado: totalParcelas > 1 ? 'Sim' : 'Não',
        totalParcelas: totalParcelas,
        parcelaAtual: 1,
        bancoDetectado: nomeBancoIdentificado,
        textoOrigem: textoBruto
    };
}

// Executa o lançamento de uma notificação diretamente no banco local com total segurança
async function executarLancamentoAutomatico(notificacao) {
    const dados = await interpretarNotificacaoBancaria(notificacao);
    if (!dados) {
        console.warn('[NOTIFICAÇÃO ENGINE] Ignorada por não conter dados de compra/valor válido:', notificacao);
        return null;
    }

    if (typeof dbLocal === 'undefined' || !dbLocal || !dbLocal.movimentacoes) {
        console.error('[NOTIFICAÇÃO ENGINE] dbLocal não disponível.');
        return null;
    }

    const novoId = (typeof generateUUID === 'function') ? generateUUID() : ('mov_auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
    const timestamp = Date.now();

    const novoLancamento = {
        id: novoId,
        descricao: dados.descricao,
        valor_total: dados.valorTotal,
        valor_realizado: dados.valorRealizado,
        data_lancamento: dados.dataLancamento,
        tipo_gasto: dados.tipoGasto,
        status: dados.status,
        conta_id: dados.contaId || null,
        parcelado: dados.parcelado,
        total_parcelas: dados.totalParcelas,
        parcela_atual: 1,
        id_grupo: dados.parcelado === 'Sim' ? novoId : null,
        observacoes: `🤖 Lançamento Automático via Notificação: "${dados.textoOrigem.slice(0, 120)}"`,
        origem: 'notificacao_automatica',
        sync_status: 'pending_insert',
        updated_at: timestamp
    };

    await dbLocal.movimentacoes.put(novoLancamento);
    console.log('[NOTIFICAÇÃO ENGINE] Lançamento criado com sucesso:', novoLancamento);

    // Se for débito imediato de conta bancária ou cartão alimentação, debita do saldo da conta
    if (dados.contaId && (dados.tipoGasto === 'Cartão Alimentação' || (dados.tipoGasto !== 'Cartão de Crédito' && dados.status === 'Pago'))) {
        const conta = await dbLocal.contas_bancarias.get(dados.contaId);
        if (conta) {
            let saldoAtual = parseFloat(conta.saldo_atual) || 0;
            if (dados.tipoGasto === 'Receita') {
                saldoAtual += dados.valorTotal;
            } else {
                saldoAtual -= dados.valorTotal;
            }
            await dbLocal.contas_bancarias.update(conta.id, {
                saldo_atual: saldoAtual,
                sync_status: 'pending_update',
                updated_at: timestamp
            });
            console.log(`[NOTIFICAÇÃO ENGINE] Saldo de ${conta.nome_conta} atualizado para ${saldoAtual}`);
        }
    }

    // Registra na lista de novos lançamentos automáticos aguardando conferência do usuário
    try {
        let novos = JSON.parse(localStorage.getItem(KEY_NOVOS_LANCAMENTOS) || '[]');
        novos.push({
            id: novoLancamento.id,
            descricao: novoLancamento.descricao,
            valor: novoLancamento.valor_total,
            tipoGasto: novoLancamento.tipo_gasto,
            status: novoLancamento.status,
            data: novoLancamento.data_lancamento,
            banco: dados.bancoDetectado || 'Conta Automática',
            parcelas: dados.totalParcelas,
            timestamp: timestamp
        });
        localStorage.setItem(KEY_NOVOS_LANCAMENTOS, JSON.stringify(novos));
    } catch (e) {}

    // Notifica o servidor se houver ID de notificação
    if (notificacao.id) {
        try {
            fetch('/api/notificacoes/marcar-processada', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: notificacao.id, status: 'processada', lancamento_id: novoId })
            }).catch(() => {});
        } catch (e) {}
    }

    // Atualiza a visualização caso a tela esteja aberta
    if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();

    return novoLancamento;
}

// ==========================================================================
// 3. SINCRONIZAÇÃO COM O SERVIDOR DE NOTIFICAÇÕES EM SEGUNDO PLANO
// ==========================================================================

async function sincronizarNotificacoesPendentesDoServidor() {
    try {
        const user = (typeof getAuthUser === 'function') ? getAuthUser() : null;
        const headers = user && user.id ? { 'x-user-id': user.id } : {};

        const res = await fetch('/api/notificacoes/pendentes', { headers });
        if (!res.ok) return;

        const pendentes = await res.json();
        if (!Array.isArray(pendentes) || pendentes.length === 0) return;

        console.log(`[NOTIFICAÇÃO SYNC] ${pendentes.length} nova(s) notificação(ões) bancária(s) recebida(s) do celular.`);

        let criados = 0;
        for (let notif of pendentes) {
            const lanc = await executarLancamentoAutomatico(notif);
            if (lanc) criados++;
        }

        if (criados > 0) {
            exibirModalLancamentosAutomaticos();
        }
    } catch (err) {
        console.warn('[NOTIFICAÇÃO SYNC] Não foi possível verificar notificações do servidor:', err);
    }
}

// ==========================================================================
// 4. POPUP / MODAL DE CONFERÊNCIA AO ABRIR O APP
// ==========================================================================

function exibirModalLancamentosAutomaticos() {
    let novos = [];
    try {
        novos = JSON.parse(localStorage.getItem(KEY_NOVOS_LANCAMENTOS) || '[]');
    } catch (e) {
        novos = [];
    }

    if (!novos || novos.length === 0) return;

    let modal = document.getElementById('modalAvisoLancamentosAutomaticos');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalAvisoLancamentosAutomaticos';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 999999; align-items: center; justify-content: center; padding: 14px;';
        document.body.appendChild(modal);
    }

    const fmtMoeda = (v) => 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');

    const linhasHtml = novos.map((item, idx) => {
        let corBadge = '#3B82F6';
        let iconeTipo = '💳';
        if (item.tipoGasto === 'Receita') { corBadge = '#10B981'; iconeTipo = '📥'; }
        else if (item.tipoGasto === 'Cartão Alimentação') { corBadge = '#F97316'; iconeTipo = '🍽️'; }
        else if (item.tipoGasto === 'Cartão de Crédito') { corBadge = '#8B5CF6'; iconeTipo = '💳'; }
        else if (item.tipoGasto === 'Despesa Fixa') { corBadge = '#F59E0B'; iconeTipo = '📄'; }

        const parcTxt = item.parcelas > 1 ? `<span style="background: rgba(139,92,246,0.2); color:#C084FC; padding: 2px 6px; border-radius: 5px; font-size: 0.72rem; font-weight: 700;">${item.parcelas}x</span>` : '';

        return `
            <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid #334155; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                    <div style="font-size: 1.35rem; background: rgba(255,255,255,0.06); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${iconeTipo}
                    </div>
                    <div style="min-width: 0;">
                        <div style="font-weight: 800; color: #FFFFFF; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${item.descricao}
                        </div>
                        <div style="font-size: 0.74rem; color: #94A3B8; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="color: ${corBadge}; font-weight: 700;">${item.banco}</span>
                            <span>&bull;</span>
                            <span>${item.tipoGasto}</span>
                            ${parcTxt}
                        </div>
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 1.05rem; font-weight: 900; color: ${item.tipoGasto === 'Receita' ? '#10B981' : '#F87171'};">
                        ${item.tipoGasto === 'Receita' ? '+' : '-'} ${fmtMoeda(item.valor)}
                    </div>
                    <div style="margin-top: 4px; display: flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" onclick="fecharModalLancamentosAutomaticos(); if(typeof editarLancamento === 'function') editarLancamento('${item.id}');" style="background: rgba(59,130,246,0.15); border: 1px solid #3B82F6; color: #93C5FD; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">
                            ✏️ Ajustar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #0B1120, #0F172A); border: 1.5px solid #3B82F6; border-radius: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; padding: 22px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.85); animation: modalFadeIn 0.25s ease;">
            <div style="text-align: center; margin-bottom: 16px;">
                <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #2563EB, #1D4ED8); margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 15px rgba(37,99,235,0.4);">
                    🤖
                </div>
                <h3 style="font-size: 1.15rem; font-weight: 900; color: #FFFFFF; margin: 0;">Lançamentos Automáticos Realizados!</h3>
                <p style="font-size: 0.80rem; color: #94A3B8; margin: 6px 0 0;">
                    Identificamos <strong>${novos.length}</strong> nova(s) notificação(ões) de compras/Pix no seu celular e já organizamos tudo no seu sistema:
                </p>
            </div>

            <div style="max-height: 280px; overflow-y: auto; margin-bottom: 16px; padding-right: 2px;">
                ${linhasHtml}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button type="button" onclick="confirmarTodosLancamentosAutomaticos()" style="background: linear-gradient(135deg, #10B981, #059669); color: #FFFFFF; border: none; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.90rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                    <span>✓</span> Confirmar Todos e Fechar
                </button>
                <button type="button" onclick="fecharModalLancamentosAutomaticos(); if(typeof switchFinanceTab === 'function') switchFinanceTab('Lancamentos');" style="background: rgba(255,255,255,0.06); border: 1px solid #334155; color: #CBD5E1; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer;">
                    🔍 Conferir no Extrato
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function fecharModalLancamentosAutomaticos() {
    const modal = document.getElementById('modalAvisoLancamentosAutomaticos');
    if (modal) modal.style.display = 'none';
}

function confirmarTodosLancamentosAutomaticos() {
    localStorage.removeItem(KEY_NOVOS_LANCAMENTOS);
    fecharModalLancamentosAutomaticos();
    if (typeof showToast === 'function') {
        showToast('✓ Lançamentos automáticos confirmados com sucesso!');
    }
}

// ==========================================================================
// 5. CENTRAL DE NOTIFICAÇÕES & SIMULADOR DE TESTES EM TEMPO REAL
// ==========================================================================

function abrirModalCentralNotificacoes() {
    let modal = document.getElementById('modalCentralNotificacoes');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalCentralNotificacoes';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 999999; align-items: center; justify-content: center; padding: 14px;';
        document.body.appendChild(modal);
    }

    const hostAtual = window.location.origin;
    const user = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const userId = user && user.id ? user.id : 'default';
    const webhookUrl = `${hostAtual}/api/notificacoes/receber?user_id=${userId}`;

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #0B1120, #0F172A); border: 1.5px solid #3B82F6; border-radius: 20px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 22px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.85); animation: modalFadeIn 0.25s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #1E293B; padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem;">⚡</span>
                    <div>
                        <h3 style="font-size: 1.10rem; font-weight: 900; color: #FFFFFF; margin: 0;">Central de Notificações e Comprovantes</h3>
                        <p style="font-size: 0.74rem; color: #94A3B8; margin: 2px 0 0;">Leitura automática de compras de bancos e comprovantes</p>
                    </div>
                </div>
                <button type="button" onclick="fecharModalCentralNotificacoes()" style="background: none; border: none; color: #94A3B8; font-size: 1.4rem; cursor: pointer; padding: 4px;">&times;</button>
            </div>

            <!-- Card 1: Como enviar Comprovante direto do Banco -->
            <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 12px; padding: 12px; margin-bottom: 14px;">
                <div style="font-size: 0.88rem; font-weight: 800; color: #60A5FA; display: flex; align-items: center; gap: 6px;">
                    <span>📤</span> 1. Compartilhar Comprovante Direto do Banco para o App
                </div>
                <p style="font-size: 0.78rem; color: #CBD5E1; margin: 6px 0 0; line-height: 1.4;">
                    Ao gerar o comprovante em qualquer app de banco (Pix, Cartão, Boleto), clique em <strong>Compartilhar</strong> e escolha o <strong>Finanças Pessoais</strong>. O app abrirá e preencherá tudo automaticamente para sua confirmação com 1 clique!
                </p>
            </div>

            <!-- Card 2: Leitor Direto de Notificação / Print (Sem Aplicativo de Terceiros) -->
            <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid #10B981; border-radius: 12px; padding: 12px; margin-bottom: 14px;">
                <div style="font-size: 0.88rem; font-weight: 800; color: #34D399; display: flex; align-items: center; gap: 6px;">
                    <span>⚡</span> 2. Leitor Direto de Notificação / Print (Nativo)
                </div>
                <p style="font-size: 0.76rem; color: #CBD5E1; margin: 6px 0 8px; line-height: 1.4;">
                    Cole abaixo o texto da notificação do banco (ex: Sicredi, Nubank, Itaú) ou carregue o print da tela do celular para lançamento instantâneo:
                </p>
                <textarea id="txtInputNotificacaoManual" rows="2" placeholder="Cole aqui o texto da notificação (ex: Compra débito Visa Gold 26/10 Livraria Maranatha R$ 4,99)..." style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1px solid #334155; border-radius: 8px; color: #F8FAFC; padding: 8px 10px; font-size: 0.78rem; resize: vertical; margin-bottom: 8px; font-family: inherit;"></textarea>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" onclick="processarNotificacaoTextoInput()" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 0.76rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <span>⚡</span> Lançar Notificação Agora
                    </button>
                    <label style="background: #1E293B; border: 1px solid #475569; color: #E2E8F0; padding: 8px 12px; border-radius: 8px; font-weight: 700; font-size: 0.76rem; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <span>📷</span> Carregar Print / Foto
                        <input type="file" accept="image/*" style="display: none;" onchange="if(this.files[0]) processarPrintNotificacaoInput(this.files[0])">
                    </label>
                </div>
            </div>

            <!-- Card 3: Automação Inteligente com Python (Payton) -->
            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid #3B82F6; border-radius: 12px; padding: 12px; margin-bottom: 14px;">
                <div style="font-size: 0.88rem; font-weight: 800; color: #60A5FA; display: flex; align-items: center; gap: 6px;">
                    <span>🐍</span> 3. Automação Avançada com Python (Payton)
                </div>
                <p style="font-size: 0.76rem; color: #CBD5E1; margin: 6px 0 6px; line-height: 1.4;">
                    Nosso módulo Python nativo (<strong>automacao_bancaria_python.py</strong>) faz a leitura automática de capturas de tela e da área de transferência em segundo plano sem exigir aplicativos de terceiros.
                </p>
                <div style="font-size: 0.72rem; color: #94A3B8; background: #0B1120; border: 1px solid #1E293B; padding: 6px 10px; border-radius: 6px; font-family: monospace;">
                    Execute: <strong>leitor_cartao_python.bat</strong> ou <strong>iniciar_automacao_python.bat</strong>
                </div>
            </div>

            <!-- Card 4: SIMULADOR DE TESTES EM TEMPO REAL -->
            <div style="background: rgba(139, 92, 246, 0.08); border: 1.5px solid #8B5CF6; border-radius: 12px; padding: 12px;">
                <div style="font-size: 0.88rem; font-weight: 800; color: #C084FC; display: flex; align-items: center; gap: 6px;">
                    <span>🧪</span> 4. Teste o Lançamento Automático Agora
                </div>
                <p style="font-size: 0.76rem; color: #CBD5E1; margin: 4px 0 10px;">
                    Clique em qualquer botão abaixo para simular uma notificação real de banco e testar o funcionamento automático imediatamente:
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button type="button" onclick="testarNotificacaoSimulada('sicredi_debito_maranatha')" style="background: rgba(16,185,129,0.22); border: 1.5px solid #10B981; color: #A7F3D0; padding: 8px; border-radius: 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; text-align: left;">
                        💳 <strong>Sicredi Débito</strong><br><span style="font-size:0.68rem; color:#6EE7B7;">R$ 4,99 Livraria Maranatha</span>
                    </button>
                    <button type="button" onclick="testarNotificacaoSimulada('nubank_credito')" style="background: rgba(139,92,246,0.18); border: 1px solid #8B5CF6; color: #E9D5FF; padding: 8px; border-radius: 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; text-align: left;">
                        💳 <strong>Nubank Crédito</strong><br><span style="font-size:0.68rem; color:#A78BFA;">R$ 89,90 Mercado Livre</span>
                    </button>
                    <button type="button" onclick="testarNotificacaoSimulada('sicredi_pix')" style="background: rgba(16,185,129,0.18); border: 1px solid #10B981; color: #A7F3D0; padding: 8px; border-radius: 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; text-align: left;">
                        📥 <strong>Sicredi Pix</strong><br><span style="font-size:0.68rem; color:#6EE7B7;">+ R$ 350,00 Receita</span>
                    </button>
                    <button type="button" onclick="testarNotificacaoSimulada('ticket_alimentacao')" style="background: rgba(249,115,22,0.18); border: 1px solid #F97316; color: #FFEDD5; padding: 8px; border-radius: 8px; font-size: 0.74rem; font-weight: 700; cursor: pointer; text-align: left;">
                        🍽️ <strong>Ticket Alimentação</strong><br><span style="font-size:0.68rem; color:#FDBA74;">R$ 145,20 Supermercado</span>
                    </button>
                </div>
            </div>

            <div style="margin-top: 16px; text-align: right;">
                <button type="button" onclick="fecharModalCentralNotificacoes()" style="background: #2563EB; border: none; color: white; padding: 10px 18px; border-radius: 8px; font-weight: 800; font-size: 0.82rem; cursor: pointer;">
                    Fechar
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function fecharModalCentralNotificacoes() {
    const modal = document.getElementById('modalCentralNotificacoes');
    if (modal) modal.style.display = 'none';
}

function copiarLinkWebhook() {
    const txt = document.getElementById('txtWebhookUrl');
    if (txt) {
        txt.select();
        navigator.clipboard.writeText(txt.value).then(() => {
            if (typeof showToast === 'function') showToast('✓ Link do Webhook copiado!');
        }).catch(() => {
            alert('Link copiado: ' + txt.value);
        });
    }
}

// Processa texto de notificação inserido manualmente ou colado no modal
async function processarNotificacaoTextoInput() {
    const txtEl = document.getElementById('txtInputNotificacaoManual');
    const texto = txtEl ? txtEl.value.trim() : '';
    if (!texto) {
        alert('Por favor, cole o texto da notificação ou do comprovante.');
        return;
    }
    if (typeof showToast === 'function') showToast('Processando notificação bancária...');
    const notifObj = {
        titulo: 'Notificação Bancária',
        texto: texto,
        app: ''
    };
    const lanc = await executarLancamentoAutomatico(notifObj);
    if (lanc) {
        if (txtEl) txtEl.value = '';
        fecharModalCentralNotificacoes();
        exibirModalLancamentosAutomaticos();
    } else {
        alert('Não foi possível identificar valor ou dados suficientes na notificação informada. Verifique se o valor está presente.');
    }
}

// Processa print/foto de notificação selecionada pelo usuário
async function processarPrintNotificacaoInput(file) {
    if (!file) return;
    if (typeof mostrarStatusOcr === 'function') mostrarStatusOcr('Lendo print da notificação com IA...');
    try {
        const base64 = await comprimirImagemComprovante(file);
        const textoLido = await extrairTextoImagem(base64);
        if (!textoLido || textoLido.trim().length < 5) {
            alert('Não foi possível identificar o texto do print. Tente colar o texto da notificação.');
            return;
        }
        const notifObj = {
            titulo: 'Print Notificação',
            texto: textoLido,
            app: ''
        };
        const lanc = await executarLancamentoAutomatico(notifObj);
        if (lanc) {
            fecharModalCentralNotificacoes();
            exibirModalLancamentosAutomaticos();
        } else {
            if (typeof abrirModalConfirmacaoExpressoComTexto === 'function') {
                abrirModalConfirmacaoExpressoComTexto(textoLido, base64, 'Print Notificação');
            }
        }
    } catch (e) {
        alert('Erro ao processar imagem da notificação: ' + (e.message || e));
    } finally {
        if (typeof ocultarStatusOcr === 'function') ocultarStatusOcr();
    }
}

// Executa simulação imediata com dados realistas de teste
async function testarNotificacaoSimulada(tipo) {
    let payload = null;

    if (tipo === 'sicredi_debito_maranatha') {
        payload = {
            titulo: '💳 Compra débito Visa Gold AP..',
            texto: '26/10 LIVRARIA MARANATHA PARANAVAI BR R$ 4,99 - Dúvidas: 0800-...',
            app: 'br.com.sicredi.mobile'
        };
    } else if (tipo === 'nubank_credito') {
        payload = {
            titulo: 'Compra no cartão Nubank',
            texto: 'Compra de R$ 89,90 aprovada em Mercado Livre no crédito.',
            app: 'com.nu.production'
        };
    } else if (tipo === 'sicredi_pix') {
        payload = {
            titulo: 'Sicredi - Pix Recebido',
            texto: 'Você recebeu um Pix de R$ 350,00 de Carlos Silva na sua conta.',
            app: 'br.com.sicredi'
        };
    } else if (tipo === 'ticket_alimentacao') {
        payload = {
            titulo: 'Ticket Flex',
            texto: 'Compra de R$ 145,20 aprovada em Supermercado Bom Preço no cartão de alimentação.',
            app: 'br.com.ticket'
        };
    } else if (tipo === 'credito_parcelado') {
        payload = {
            titulo: 'Sicredi Cartões',
            texto: 'Compra de R$ 300,00 aprovada em Eletro Magazine parcelado em 3x no crédito.',
            app: 'br.com.sicredi'
        };
    }

    if (!payload) return;

    if (typeof showToast === 'function') showToast('Processando notificação simulada...');

    const resultado = await executarLancamentoAutomatico(payload);
    if (resultado) {
        fecharModalCentralNotificacoes();
        exibirModalLancamentosAutomaticos();
    }
}

// ==========================================================================
// 6. INICIALIZAÇÃO AUTOMÁTICA AO CARREGAR O SISTEMA
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Checa se o app foi aberto via Web Share Target (compartilhamento de comprovante)
    setTimeout(() => {
        checarComprovanteCompartilhado();
    }, 400);

    // 2. Checa se há novos lançamentos automáticos aguardando conferência
    setTimeout(() => {
        let novos = [];
        try { novos = JSON.parse(localStorage.getItem(KEY_NOVOS_LANCAMENTOS) || '[]'); } catch (e) {}
        if (novos && novos.length > 0) {
            exibirModalLancamentosAutomaticos();
        }
    }, 800);

    // 3. Sincroniza notificações pendentes do servidor em segundo plano
    setTimeout(() => {
        sincronizarNotificacoesPendentesDoServidor();
    }, 1500);

    // 4. Polling periódico silencioso (a cada 30 segundos) para novas notificações
    setInterval(() => {
        sincronizarNotificacoesPendentesDoServidor();
    }, 30000);
});

// Exportações Globais
window.abrirModalCentralNotificacoes = abrirModalCentralNotificacoes;
window.fecharModalCentralNotificacoes = fecharModalCentralNotificacoes;
window.exibirModalLancamentosAutomaticos = exibirModalLancamentosAutomaticos;
window.fecharModalLancamentosAutomaticos = fecharModalLancamentosAutomaticos;
window.confirmarTodosLancamentosAutomaticos = confirmarTodosLancamentosAutomaticos;
window.testarNotificacaoSimulada = testarNotificacaoSimulada;
window.copiarLinkWebhook = copiarLinkWebhook;
window.executarLancamentoAutomatico = executarLancamentoAutomatico;
window.processarNotificacaoTextoInput = processarNotificacaoTextoInput;
window.processarPrintNotificacaoInput = processarPrintNotificacaoInput;
