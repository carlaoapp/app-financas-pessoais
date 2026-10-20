/**
 * finance-ocr.js - Sistema Inteligente de Leitura, OCR e Reconhecimento de Comprovantes
 * Interpreta fotos de comprovantes (Pix, Cartão, Cupom Fiscal, Boletos) e preenche os campos automaticamente.
 */

window.midiaComprovanteTemp = null;

// Normaliza texto para comparações
function ocrNormalizarTexto(txt) {
    if (!txt) return '';
    return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// Abre o modal de colar texto
function abrirPromptColarTextoComprovante() {
    const m = document.getElementById('modalColarTextoComprovante');
    const txt = document.getElementById('txtComprovanteColado');
    if (txt) txt.value = '';
    if (m) m.style.display = 'flex';
    setTimeout(() => { if (txt) txt.focus(); }, 100);
}
window.abrirPromptColarTextoComprovante = abrirPromptColarTextoComprovante;

function fecharModalColarTexto() {
    const m = document.getElementById('modalColarTextoComprovante');
    if (m) m.style.display = 'none';
}
window.fecharModalColarTexto = fecharModalColarTexto;

// Processa texto colado manualmente
function processarTextoComprovanteColado() {
    const txt = document.getElementById('txtComprovanteColado');
    if (!txt || !txt.value.trim()) {
        alert("Cole o texto do comprovante para que o sistema possa analisar.");
        return;
    }
    const textoBruto = txt.value.trim();
    fecharModalColarTexto();
    abrirModalConfirmacaoExpressoComTexto(textoBruto, '', "Texto Colado Manualmente");
}
window.processarTextoComprovanteColado = processarTextoComprovanteColado;

// Processa arquivo ou foto capturada pela câmera
async function processarArquivoComprovante(inputEl) {
    if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];

    mostrarStatusOcr("Comprimindo e preparando imagem...");

    try {
        const base64Comprimida = await comprimirImagemComprovante(file);
        window.midiaComprovanteTemp = base64Comprimida;

        // Atualizar thumbnail imediatamente
        const thumb = document.getElementById('thumbComprovante');
        if (thumb) thumb.src = base64Comprimida;
        const previewBox = document.getElementById('previewComprovanteContainer');
        if (previewBox) previewBox.style.display = 'flex';

        mostrarStatusOcr("Lendo texto e interpretando comprovante com IA...");

        // Executar OCR na imagem
        const textoExtraido = await extrairTextoImagem(base64Comprimida);

        if (textoExtraido && textoExtraido.trim().length > 10) {
            interpretarTextoComprovante(textoExtraido, file.name);
        } else {
            ocultarStatusOcr();
            const det = document.getElementById('detalhesComprovanteLido');
            if (det) det.innerText = "Comprovante anexado (Preencha os campos ao lado)";
            if (typeof showToast === 'function') {
                showToast("Comprovante anexado! Complete os campos necessários.");
            }
        }
    } catch (err) {
        console.error("Erro no processamento do comprovante:", err);
        ocultarStatusOcr();
        alert("Não foi possível ler o comprovante automaticamente. A foto foi anexada e você pode preencher os campos manualmente.");
    } finally {
        inputEl.value = '';
    }
}
window.processarArquivoComprovante = processarArquivoComprovante;

// Comprime imagem para no máximo 1280px e 80% qualidade
function comprimirImagemComprovante(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const maxDim = 1280;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Extração de texto usando Tesseract.js com pré-processamento
async function extrairTextoImagem(dataUrl) {
    if (typeof Tesseract === 'undefined') {
        console.warn("Tesseract.js não carregado. Tentando carregar dinamicamente...");
        await carregarTesseractDinamicamente();
    }

    if (typeof Tesseract !== 'undefined') {
        try {
            const worker = await Tesseract.createWorker('por');
            const ret = await worker.recognize(dataUrl);
            await worker.terminate();
            return ret.data.text;
        } catch (e) {
            console.warn("Falha no worker em português, tentando idioma padrão:", e);
            try {
                const worker = await Tesseract.createWorker('eng');
                const ret = await worker.recognize(dataUrl);
                await worker.terminate();
                return ret.data.text;
            } catch (err2) {
                console.error("Falha no OCR Tesseract:", err2);
            }
        }
    }
    return "";
}

function carregarTesseractDinamicamente() {
    return new Promise((resolve) => {
        if (typeof Tesseract !== 'undefined') return resolve(true);
        const script = document.createElement('script');
        script.src = 'tesseract.min.js';
        script.onload = () => resolve(true);
        script.onerror = () => {
            const scriptCdn = document.createElement('script');
            scriptCdn.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            scriptCdn.onload = () => resolve(true);
            scriptCdn.onerror = () => resolve(false);
            document.head.appendChild(scriptCdn);
        };
        document.head.appendChild(script);
    });
}

// Interpreta texto de comprovantes brasileiros
function interpretarTextoComprovante(texto, origem) {
    ocultarStatusOcr();
    if (!texto) return;

    const textoLimpo = ocrNormalizarTexto(texto);
    console.log("=== TEXTO OCR IDENTIFICADO ===", texto);

    let valorEncontrado = null;
    let dataEncontrada = null;
    let descricaoEncontrada = "";
    let tipoMovimentacao = "Despesa Variável";
    let isStatusPago = false;

    // 1. EXTRAÇÃO DE VALOR (R$)
    // Prioriza padrões com R$ ou Palavras-Chave (VALOR, TOTAL, VALOR PAGO)
    const regexValores = [
        /(?:VALOR\s*PAGO|VALOR\s*TOTAL|TOTAL\s*A\s*PAGAR|TOTAL|VALOR\s*DA\s*TRANSACAO|VALOR\s*LIQUIDO|VALOR)[\s:]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
        /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
        /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*(?:BRL|REAIS)/i,
        /(?:VALOR|TOTAL)[\s:]*R?\$?\s*([0-9]+,[0-9]{2})/i,
        /R\$\s*([0-9]+,[0-9]{2})/i
    ];

    for (let r of regexValores) {
        const match = texto.match(r);
        if (match && match[1]) {
            valorEncontrado = match[1];
            break;
        }
    }

    // Se não encontrou formato vírgula, busca formato ponto
    if (!valorEncontrado) {
        const matchPonto = texto.match(/(?:TOTAL|VALOR|R\$)[\s:]*([0-9]+\.[0-9]{2})/i);
        if (matchPonto && matchPonto[1]) {
            valorEncontrado = matchPonto[1].replace('.', ',');
        }
    }

    // 2. EXTRAÇÃO DE DATA
    // Formato DD/MM/AAAA ou DD/MM/AA
    const matchData = texto.match(/\b([0-3]?[0-9])[\/\.\-]([0-1]?[0-9])[\/\.\-](20[2-3][0-9]|[2-3][0-9])\b/);
    if (matchData) {
        let dia = matchData[1].padStart(2, '0');
        let mes = matchData[2].padStart(2, '0');
        let ano = matchData[3];
        if (ano.length === 2) ano = "20" + ano;
        if (parseInt(mes) >= 1 && parseInt(mes) <= 12 && parseInt(dia) >= 1 && parseInt(dia) <= 31) {
            dataEncontrada = `${ano}-${mes}-${dia}`;
        }
    }

    // Meses por extenso: ex: 18 de Outubro de 2026
    if (!dataEncontrada) {
        const mesesMap = {
            'JANEIRO': '01', 'FEVEREIRO': '02', 'MARCO': '03', 'ABRIL': '04',
            'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
            'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
        };
        const matchExtenso = textoLimpo.match(/\b([0-3]?[0-9])\s+DE\s+([A-Z]+)\s+DE\s+(20[2-3][0-9])\b/);
        if (matchExtenso && mesesMap[matchExtenso[2]]) {
            const d = matchExtenso[1].padStart(2, '0');
            const m = mesesMap[matchExtenso[2]];
            const a = matchExtenso[3];
            dataEncontrada = `${a}-${m}-${d}`;
        }
    }

    // 3. TIPO DE MOVIMENTAÇÃO E STATUS MULTIBANCO (DÉBITO E CRÉDITO)
    let cartaoBancoDetectado = "";
    const bancosCartoesRegex = [
        { nome: "Visa Gold", regex: /\bVISA\s+GOLD\b/i },
        { nome: "Visa Infinite", regex: /\bVISA\s+INFINITE\b/i },
        { nome: "Visa Platinum", regex: /\bVISA\s+PLATINUM\b/i },
        { nome: "Visa", regex: /\bVISA\b/i },
        { nome: "Mastercard Black", regex: /\bMASTERCARD\s+BLACK\b/i },
        { nome: "Mastercard", regex: /\bMASTERCARD\b/i },
        { nome: "Elo Nanquim", regex: /\bELO\s+NANQUIM\b/i },
        { nome: "Elo", regex: /\bELO\b/i },
        { nome: "Sicredi", regex: /\bSICREDI\b/i },
        { nome: "Nubank", regex: /\bNUBANK\b/i },
        { nome: "Inter", regex: /\b(BANCO\s+INTER|INTER)\b/i },
        { nome: "Itaú", regex: /\bITA[UÚ]\b/i },
        { nome: "Bradesco", regex: /\bBRADESCO\b/i },
        { nome: "Santander", regex: /\bSANTANDER\b/i },
        { nome: "Banco do Brasil", regex: /\b(BANCO\s+DO\s+BRASIL|OUROCARD|BB)\b/i },
        { nome: "Caixa", regex: /\bCAIXA\b/i },
        { nome: "C6 Bank", regex: /\b(C6\s*BANK|C6)\b/i }
    ];

    for (let b of bancosCartoesRegex) {
        if (b.regex.test(textoLimpo)) {
            cartaoBancoDetectado = b.nome;
            break;
        }
    }

    const isDebitoNotif = /\b(DEBITO|COMPRA\s+DEBITO|NO\s+DEBITO|CARTAO\s+DE\s+DEBITO)\b/i.test(textoLimpo);
    const isCreditoNotif = /\b(CREDITO|COMPRA\s+CREDITO|NO\s+CREDITO|CARTAO\s+DE\s+CREDITO|FATURA|PARCELADO)\b/i.test(textoLimpo);

    if (textoLimpo.includes('PIX RECEBIDO') || textoLimpo.includes('TRANSFERENCIA RECEBIDA') || textoLimpo.includes('CREDITO EM CONTA') || textoLimpo.includes('SALARIO') || textoLimpo.includes('PROVENTOS')) {
        tipoMovimentacao = 'Receita';
        isStatusPago = true;
    } else if (isCreditoNotif) {
        tipoMovimentacao = 'Cartão de Crédito';
        isStatusPago = true;
    } else if (isDebitoNotif) {
        tipoMovimentacao = 'Despesa Variável';
        isStatusPago = true;
    } else if (textoLimpo.includes('BOLETO') || textoLimpo.includes('PAGAMENTO DE CONTA') || textoLimpo.includes('ENEL') || textoLimpo.includes('SABESP') || textoLimpo.includes('COPASA') || textoLimpo.includes('CONDOMINIO')) {
        tipoMovimentacao = 'Despesa Fixa';
        isStatusPago = textoLimpo.includes('PAGO COM SUCESSO') || textoLimpo.includes('AUTENTICACAO') || textoLimpo.includes('COMPROVANTE');
    } else {
        tipoMovimentacao = 'Despesa Variável';
        isStatusPago = true;
    }

    // 4. ESTABELECIMENTO / BENEFICIÁRIO / DESCRIÇÃO MULTIBANCO
    // Caso Sicredi (ex: 20/10 SATSOM COMPONENTES ELE Paranavai BR R$ 4,50)
    const matchSicredi = texto.match(/[0-3]?[0-9]\/[0-1]?[0-9]\s+([A-Z0-9\s\.\-_&]{3,40}?)(?:\s+(?:Paranavai|Curitiba|Maringa|SP|PR|RJ|BR|R\$|-|\d{4}))/i);
    if (matchSicredi && matchSicredi[1]) {
        descricaoEncontrada = matchSicredi[1].trim();
    }

    // Padrão Nubank / Itaú / Inter / Santander: "em Estabelecimento" ou "na Estabelecimento"
    if (!descricaoEncontrada) {
        const matchEm = texto.match(/\bem\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)/i) || texto.match(/\b(?:em|na|no)\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)/i);
        if (matchEm && matchEm[1]) {
            const cand = matchEm[1].trim();
            if (!/^(NUBANK|CART[AÃ]O|SICREDI|ITA[UÚ]|BRADESCO|SANTANDER|INTER|BANCO|OUROCARD|CAIXA|C6)\b/i.test(cand)) {
                descricaoEncontrada = cand;
            }
        }
    }

    const regexFavorecido = [
        /(?:DESTINATARIO|RECEBEDOR|NOME DO BENEFICIARIO|BENEFICIARIO|PAGO A|PARA|ESTABELECIMENTO|RAZAO SOCIAL|NOME FANTASIA)[\s:]*([^\n\r,]+)/i,
        /(?:DEBITADO DE|CONTA ORIGEM|EMPRESA)[\s:]*([^\n\r,]+)/i
    ];

    if (!descricaoEncontrada) {
        for (let r of regexFavorecido) {
            const match = texto.match(r);
            if (match && match[1] && match[1].trim().length > 2) {
                descricaoEncontrada = match[1].trim().replace(/^[:\-\s]+/, '');
                break;
            }
        }
    }

    // Se não encontrou rótulo formal, procura termos comuns do cotidiano
    if (!descricaoEncontrada) {
        const estabelecimentosComuns = [
            'MERCADO LIVRE', 'SUPERMERCADO', 'POSTO', 'SHELL', 'IPIRANGA', 'PETROBRAS',
            'FARMACIA', 'DROGASIL', 'DROGA RAIA', 'PAGUE MENOS', 'PADARIA', 'RESTAURANTE',
            'UBER', 'IFOOD', 'NETFLIX', 'SPOTIFY', 'AMAZON', 'ENEL', 'SABESP', 'COPASA',
            'VIVO', 'CLARO', 'TIM', 'PAGSEGURO', 'NUBANK', 'PICPAY', 'INTER'
        ];
        for (let est of estabelecimentosComuns) {
            if (textoLimpo.includes(est)) {
                descricaoEncontrada = est.charAt(0) + est.slice(1).toLowerCase();
                break;
            }
        }
    }

    // Limpeza de ruídos no estabelecimento
    if (descricaoEncontrada) {
        descricaoEncontrada = descricaoEncontrada.replace(/^(COMPRA|D[EÉ]BITO|CR[EÉ]DITO|APROVADA|CART[AÃ]O|VISA|MASTERCARD)\s+/i, '');
        descricaoEncontrada = descricaoEncontrada.replace(/\s+(BR|PARANAVAI|CURITIBA|SP|RJ|PR)$/i, '');
        descricaoEncontrada = descricaoEncontrada.split(' ')
            .filter(Boolean)
            .map(p => p.length > 2 ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : p.toUpperCase())
            .join(' ');
    }

    // APLICAR CAMPOS NO FORMULÁRIO DO MODAL
    let camposPreenchidos = [];

    // Tipo
    const selTipo = document.getElementById('inputTipoGasto');
    if (selTipo) {
        selTipo.value = tipoMovimentacao;
        if (typeof atualizarTextoStatus === 'function') atualizarTextoStatus();
        camposPreenchidos.push("Tipo");
    }

    // Valor Orçado e Realizado
    if (valorEncontrado) {
        const valFmt = "R$ " + valorEncontrado;
        const inpValor = document.getElementById('inputValor');
        const inpRealizado = document.getElementById('inputValorRealizado');
        if (inpValor) inpValor.value = valFmt;
        if (inpRealizado && isStatusPago) inpRealizado.value = valFmt;
        camposPreenchidos.push("Valor: " + valFmt);
    }

    // Data
    if (dataEncontrada) {
        const inpData = document.getElementById('inputData');
        if (inpData) {
            inpData.value = dataEncontrada;
            camposPreenchidos.push("Data: " + dataEncontrada.split('-').reverse().join('/'));
        }
    }

    // Status
    const selStatus = document.getElementById('inputStatus');
    if (selStatus && isStatusPago) {
        selStatus.value = 'Pago';
        camposPreenchidos.push("Status: Pago");
    }

    // Casamento de Categoria Pré-definida
    const selCat = document.getElementById('selectCategoriaPredefinida');
    if (selCat) {
        let encontrouCat = false;
        const descUpper = ocrNormalizarTexto(descricaoEncontrada || textoLimpo);
        
        for (let i = 0; i < selCat.options.length; i++) {
            const optVal = selCat.options[i].value;
            if (!optVal) continue;
            const optNorm = ocrNormalizarTexto(optVal);
            if (descUpper.includes(optNorm) || (descricaoEncontrada && optNorm.includes(descUpper))) {
                selCat.selectedIndex = i;
                encontrouCat = true;
                if (typeof aoSelecionarCategoriaPredefinida === 'function') {
                    aoSelecionarCategoriaPredefinida(optVal);
                }
                camposPreenchidos.push("Categoria: " + optVal);
                break;
            }
        }

        // Se não casou na lista predefinida mas encontrou o favorecido, coloca no campo de descrição
        if (!encontrouCat && descricaoEncontrada) {
            const inpDesc = document.getElementById('inputDescricao');
            if (inpDesc) inpDesc.value = descricaoEncontrada;
            camposPreenchidos.push("Descrição: " + descricaoEncontrada);
        }
    }

    // Casamento de Conta Bancária ou Cartão de Crédito
    const selConta = document.getElementById('inputContaId');
    if (selConta) {
        let encontrouConta = false;
        if (cartaoBancoDetectado) {
            const termoBusca = ocrNormalizarTexto(cartaoBancoDetectado);
            for (let i = 0; i < selConta.options.length; i++) {
                const optTxt = ocrNormalizarTexto(selConta.options[i].text);
                if (optTxt.includes(termoBusca) || (optTxt && termoBusca.includes(optTxt))) {
                    selConta.selectedIndex = i;
                    encontrouConta = true;
                    camposPreenchidos.push("Conta: " + selConta.options[i].text.split('(')[0].trim());
                    break;
                }
            }
        }
        if (!encontrouConta && tipoMovimentacao === 'Cartão de Crédito') {
            for (let i = 0; i < selConta.options.length; i++) {
                if (selConta.options[i].dataset && selConta.options[i].dataset.tipo === 'Cartão de Crédito') {
                    selConta.selectedIndex = i;
                    camposPreenchidos.push("Cartão: " + selConta.options[i].text.split('(')[0].trim());
                    break;
                }
            }
        }
    }

    // Atualiza a legenda do comprovante anexado
    const det = document.getElementById('detalhesComprovanteLido');
    if (det) {
        det.innerText = camposPreenchidos.length > 0 
            ? "Identificado: " + camposPreenchidos.slice(0, 3).join(' • ') 
            : "Comprovante lido. Confira os campos.";
    }

    if (typeof showToast === 'function') {
        showToast("✓ Comprovante identificado com sucesso!");
    }
}

// Controle de UI do status de leitura
function mostrarStatusOcr(msg) {
    const el = document.getElementById('statusProcessamentoComprovante');
    const txt = document.getElementById('textoStatusProcessamento');
    if (txt) txt.innerText = msg;
    if (el) el.style.display = 'flex';
}

function ocultarStatusOcr() {
    const el = document.getElementById('statusProcessamentoComprovante');
    if (el) el.style.display = 'none';
}

// Remove o comprovante atual do modal
function removerComprovanteAtual() {
    window.midiaComprovanteTemp = null;
    const thumb = document.getElementById('thumbComprovante');
    if (thumb) thumb.src = '';
    const previewBox = document.getElementById('previewComprovanteContainer');
    if (previewBox) previewBox.style.display = 'none';
    ocultarStatusOcr();
}
window.removerComprovanteAtual = removerComprovanteAtual;

// Modal de visualização ampliada do comprovante
function abrirModalVisualizarComprovante(url) {
    if (!url) return;
    const m = document.getElementById('modalVisualizarComprovante');
    const img = document.getElementById('imgComprovanteGrande');
    const btnDown = document.getElementById('btnBaixarComprovante');
    if (img) img.src = url;
    if (btnDown) btnDown.href = url;
    if (m) m.style.display = 'flex';
}
window.abrirModalVisualizarComprovante = abrirModalVisualizarComprovante;

function fecharModalVisualizarComprovante() {
    const m = document.getElementById('modalVisualizarComprovante');
    if (m) m.style.display = 'none';
}
window.fecharModalVisualizarComprovante = fecharModalVisualizarComprovante;


// =========================================================================
// SISTEMA EXPRESSO DE LANÇAMENTO AUTOMÁTICO POR PRINT OU COMPROVANTE DO BANCO
// =========================================================================

window.dadosComprovanteExpressoTemp = null;

function abrirModalEscolhaComprovante() {
    const m = document.getElementById('modalEscolhaOrigemComprovante');
    if (m) m.style.display = 'flex';
}
window.abrirModalEscolhaComprovante = abrirModalEscolhaComprovante;

function fecharModalEscolhaComprovante() {
    const m = document.getElementById('modalEscolhaOrigemComprovante');
    if (m) m.style.display = 'none';
}
window.fecharModalEscolhaComprovante = fecharModalEscolhaComprovante;

function acionarOrigemComprovante(origem) {
    fecharModalEscolhaComprovante();
    if (origem === 'camera') {
        const inp = document.getElementById('inputComprovanteExpressoCamera');
        if (inp) inp.click();
    } else if (origem === 'galeria') {
        const inp = document.getElementById('inputComprovanteExpressoGaleria');
        if (inp) inp.click();
    } else if (origem === 'texto') {
        if (typeof abrirPromptColarTextoComprovante === 'function') {
            abrirPromptColarTextoComprovante();
        }
    }
}
window.acionarOrigemComprovante = acionarOrigemComprovante;

async function processarArquivoComprovanteExpresso(inputEl) {
    if (!inputEl || !inputEl.files || inputEl.files.length === 0) return;
    const file = inputEl.files[0];

    mostrarStatusOcr("Comprimindo e analisando comprovante/print com IA...");

    try {
        const base64Comprimida = await comprimirImagemComprovante(file);
        window.midiaComprovanteTemp = base64Comprimida;

        // Executar OCR na imagem
        const textoExtraido = await extrairTextoImagem(base64Comprimida);
        ocultarStatusOcr();

        if (textoExtraido && textoExtraido.trim().length > 10) {
            await abrirModalConfirmacaoExpressoComTexto(textoExtraido, base64Comprimida, file.name);
        } else {
            if (typeof abrirModalLancamento === 'function') {
                abrirModalLancamento();
                const thumb = document.getElementById('thumbComprovante');
                if (thumb) thumb.src = base64Comprimida;
                const previewBox = document.getElementById('previewComprovanteContainer');
                if (previewBox) previewBox.style.display = 'flex';
            }
            if (typeof showToast === 'function') {
                showToast("Comprovante anexado! Complete os campos necessários.");
            }
        }
    } catch (err) {
        console.error("Erro no processamento expresso do comprovante:", err);
        ocultarStatusOcr();
        alert("Não foi possível ler o comprovante automaticamente. Tente uma foto com mais nitidez.");
    } finally {
        inputEl.value = '';
    }
}
window.processarArquivoComprovanteExpresso = processarArquivoComprovanteExpresso;

// Analisa os dados do texto do comprovante e abre a tela de confirmação expressa
async function abrirModalConfirmacaoExpressoComTexto(texto, base64Imagem = '', origem = '') {
    const textoLimpo = ocrNormalizarTexto(texto);

    // 1. EXTRAÇÃO DE VALOR
    let valorNum = 0;
    let valorFmt = "R$ 0,00";
    const regexValores = [
        /(?:VALOR\s*PAGO|VALOR\s*TOTAL|TOTAL\s*A\s*PAGAR|TOTAL|VALOR\s*DA\s*TRANSACAO|VALOR\s*LIQUIDO|VALOR)[\s:]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
        /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i,
        /([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s*(?:BRL|REAIS)/i,
        /R\$\s*([0-9]+,[0-9]{2})/i,
        /(?:TOTAL|VALOR|R\$)[\s:]*([0-9]+\.[0-9]{2})/i
    ];

    for (let r of regexValores) {
        const m = texto.match(r);
        if (m && m[1]) {
            let s = m[1].replace(/\./g, '').replace(',', '.');
            let v = parseFloat(s);
            if (!isNaN(v) && v > 0) {
                valorNum = v;
                valorFmt = formatBRL(v);
                break;
            }
        }
    }

    // 2. EXTRAÇÃO DE DATA E HORA
    let dataIso = (new Date()).toISOString().split('T')[0];
    let dataFmt = (new Date()).toLocaleDateString('pt-BR');
    const matchData = texto.match(/\b([0-3]?[0-9])[\/\.\-]([0-1]?[0-9])(?:[\/\.\-](20[2-3][0-9]|[2-3][0-9]))?\b/);
    if (matchData) {
        let dia = matchData[1].padStart(2, '0');
        let mes = matchData[2].padStart(2, '0');
        let ano = matchData[3] || (new Date()).getFullYear().toString();
        if (ano.length === 2) ano = "20" + ano;
        dataIso = `${ano}-${mes}-${dia}`;
        dataFmt = `${dia}/${mes}/${ano}`;
    }

    let horaStr = (new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const matchHora = texto.match(/\b([0-2]?[0-9]):([0-5][0-9])\b/);
    if (matchHora) {
        horaStr = `${matchHora[1].padStart(2, '0')}:${matchHora[2]}`;
    }

    // 3. OPERAÇÃO E TIPO DE GASTO
    const isDebito = /\b(DEBITO|COMPRA\s+DEBITO|NO\s+DEBITO|CARTAO\s+DE\s+DEBITO)\b/i.test(textoLimpo);
    const isCredito = /\b(CREDITO|COMPRA\s+CREDITO|NO\s+CREDITO|CARTAO\s+DE\s+CREDITO|FATURA|PARCELADO)\b/i.test(textoLimpo);
    const isBoleto = /\b(BOLETO|PAGAMENTO\s+DE\s+CONTA|CODIGO\s+DE\s+BARRAS|LINHA\s+DIGITAVEL)\b/i.test(textoLimpo);
    const isPixRec = /\b(PIX\s+RECEBIDO|TRANSFERENCIA\s+RECEBIDA|CREDITO\s+EM\s+CONTA)\b/i.test(textoLimpo);
    const isPixEnv = /\b(PIX\s+ENVIADO|PIX\s+PAGO|TRANSFERENCIA\s+PIX|COMPROVANTE\s+PIX)\b/i.test(textoLimpo);

    let tipoGasto = "Despesa Variável";
    let badgeTitulo = "Débito em Conta";
    let badgeCor = "#10B981";

    if (isCredito) {
        tipoGasto = "Cartão de Crédito";
        badgeTitulo = "Cartão de Crédito";
        badgeCor = "#A78BFA";
    } else if (isPixRec) {
        tipoGasto = "Receita";
        badgeTitulo = "Receita Pix";
        badgeCor = "#34D399";
    } else if (isBoleto) {
        tipoGasto = "Despesa Fixa";
        badgeTitulo = "Pagamento de Boleto / Conta";
        badgeCor = "#F59E0B";
    } else if (isPixEnv) {
        tipoGasto = "Despesa Variável";
        badgeTitulo = "Transferência Pix (Débito)";
        badgeCor = "#10B981";
    }

    // 4. ESTABELECIMENTO / BENEFICIÁRIO
    let estabelecimento = "";
    const matchSicredi = texto.match(/[0-3]?[0-9]\/[0-1]?[0-9]\s+([A-Z0-9\s\.\-_&]{3,40}?)(?:\s+(?:Paranavai|Curitiba|Maringa|SP|PR|RJ|BR|R\$|-|\d{4}))/i);
    if (matchSicredi && matchSicredi[1]) {
        estabelecimento = matchSicredi[1].trim();
    }

    if (!estabelecimento) {
        const matchEm = texto.match(/\bem\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)/i) || texto.match(/\b(?:em|na|no)\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)/i);
        if (matchEm && matchEm[1]) {
            const cand = matchEm[1].trim();
            if (!/^(NUBANK|CART[AÃ]O|SICREDI|ITA[UÚ]|BRADESCO|SANTANDER|INTER|BANCO|OUROCARD|CAIXA|C6)\b/i.test(cand)) {
                estabelecimento = cand;
            }
        }
    }

    if (!estabelecimento) {
        const regexFav = [
            /(?:DESTINATARIO|RECEBEDOR|NOME DO BENEFICIARIO|BENEFICIARIO|PAGO A|PARA|ESTABELECIMENTO|RAZAO SOCIAL|NOME FANTASIA)[\s:]*([^\n\r,]+)/i,
            /(?:DEBITADO DE|CONTA ORIGEM|EMPRESA)[\s:]*([^\n\r,]+)/i
        ];
        for (let r of regexFav) {
            const m = texto.match(r);
            if (m && m[1] && m[1].trim().length > 2) {
                estabelecimento = m[1].trim().replace(/^[:\-\s]+/, '');
                break;
            }
        }
    }

    if (estabelecimento) {
        estabelecimento = estabelecimento.replace(/^(COMPRA|D[EÉ]BITO|CR[EÉ]DITO|APROVADA|CART[AÃ]O|VISA|MASTERCARD)\s+/i, '');
        estabelecimento = estabelecimento.replace(/\s+(BR|PARANAVAI|CURITIBA|SP|RJ|PR)$/i, '');
        estabelecimento = estabelecimento.split(' ')
            .filter(Boolean)
            .map(p => p.length > 2 ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : p.toUpperCase())
            .join(' ');
    } else {
        estabelecimento = isCredito ? "Compra no Cartão" : (isBoleto ? "Pagamento de Boleto" : "Pagamento / Compra");
    }

    // 5. BANCO OU CARTÃO
    let cartaoDetectado = "";
    const bancos = ["Visa Gold", "Visa", "Mastercard", "Elo", "Sicredi", "Nubank", "Inter", "Itaú", "Bradesco", "Santander", "Banco do Brasil", "Caixa", "C6 Bank"];
    for (let b of bancos) {
        if (new RegExp('\\b' + b.replace(' ', '\\s+') + '\\b', 'i').test(textoLimpo)) {
            cartaoDetectado = b;
            break;
        }
    }

    // Carrega contas do banco para casar
    let contas = [];
    if (typeof dbLocal !== 'undefined' && dbLocal && dbLocal.contas_bancarias) {
        contas = await dbLocal.contas_bancarias.filter(c => c.deleted !== 1).toArray();
    }

    // Seleciona a melhor conta
    let contaSelecionadaId = "";
    if (cartaoDetectado && contas.length > 0) {
        const tBusca = ocrNormalizarTexto(cartaoDetectado);
        const matchC = contas.find(c => {
            const n = ocrNormalizarTexto(c.nome_conta || '');
            const b = ocrNormalizarTexto(c.banco || '');
            return n.includes(tBusca) || b.includes(tBusca) || tBusca.includes(n);
        });
        if (matchC) contaSelecionadaId = matchC.id;
    }

    if (!contaSelecionadaId && contas.length > 0) {
        if (tipoGasto === 'Cartão de Crédito') {
            const cCartao = contas.find(c => c.tipo_conta === 'Cartão de Crédito');
            if (cCartao) contaSelecionadaId = cCartao.id;
        } else {
            const cCorrente = contas.find(c => c.tipo_conta !== 'Cartão de Crédito');
            if (cCorrente) contaSelecionadaId = cCorrente.id;
        }
        if (!contaSelecionadaId && contas.length > 0) {
            contaSelecionadaId = contas[0].id;
        }
    }

    window.dadosComprovanteExpressoTemp = {
        descricao: estabelecimento,
        valor: valorNum,
        valorFmt: valorFmt,
        data: dataIso,
        dataFmt: `${dataFmt} às ${horaStr}`,
        tipoGasto: tipoGasto,
        badgeTitulo: badgeTitulo,
        badgeCor: badgeCor,
        contaId: contaSelecionadaId,
        midiaUrl: base64Imagem || window.midiaComprovanteTemp || '',
        textoOriginal: texto
    };

    // Preenche os campos do modal expresso
    const imgPrevia = document.getElementById('imgPreviaComprovanteExpresso');
    if (imgPrevia) {
        imgPrevia.src = window.dadosComprovanteExpressoTemp.midiaUrl || 'favicon.png';
    }

    const badgeEl = document.getElementById('badgeTipoExpresso');
    if (badgeEl) {
        badgeEl.innerText = badgeTitulo;
        badgeEl.style.color = badgeCor;
        badgeEl.style.background = `${badgeCor}25`;
    }

    const txtEstab = document.getElementById('txtEstabelecimentoExpresso');
    if (txtEstab) txtEstab.innerText = estabelecimento;

    const txtData = document.getElementById('txtDataHoraExpresso');
    if (txtData) txtData.innerText = `${dataFmt} às ${horaStr}`;

    const txtVal = document.getElementById('txtValorExpresso');
    if (txtVal) txtVal.innerText = valorFmt;

    // Popula o select de contas do modal expresso
    const selConta = document.getElementById('selectContaExpresso');
    if (selConta) {
        selConta.innerHTML = '';
        if (contas.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = 'Conta Principal (Padrão)';
            selConta.appendChild(opt);
        } else {
            contas.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.dataset.tipo = c.tipo_conta;
                opt.dataset.saldo = c.saldo_atual || 0;
                opt.dataset.limite = c.limite_cartao || 0;
                const icone = c.tipo_conta === 'Cartão de Crédito' ? '💳' : '🏦';
                const detalhe = c.tipo_conta === 'Cartão de Crédito' ? `(Limite: ${formatBRL(c.limite_cartao || 0)})` : `(Saldo: ${formatBRL(c.saldo_atual || 0)})`;
                opt.innerText = `${icone} ${c.nome_conta} ${detalhe}`;
                if (String(c.id) === String(contaSelecionadaId)) opt.selected = true;
                selConta.appendChild(opt);
            });
        }
    }

    atualizarImpactoSaldoExpresso();

    const m = document.getElementById('modalConfirmacaoComprovanteExpresso');
    if (m) m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
window.abrirModalConfirmacaoExpressoComTexto = abrirModalConfirmacaoExpressoComTexto;

function fecharModalConfirmacaoExpresso() {
    const m = document.getElementById('modalConfirmacaoComprovanteExpresso');
    if (m) m.style.display = 'none';
    document.body.style.overflow = 'auto';
    window.dadosComprovanteExpressoTemp = null;
}
window.fecharModalConfirmacaoExpresso = fecharModalConfirmacaoExpresso;

// Atualiza o texto dinâmico de impacto no saldo ou fatura
async function atualizarImpactoSaldoExpresso() {
    const box = document.getElementById('txtImpactoSaldoExpresso');
    const sel = document.getElementById('selectContaExpresso');
    if (!box || !sel) return;

    const dados = window.dadosComprovanteExpressoTemp;
    if (!dados) return;

    const contaId = sel.value;
    if (!contaId) {
        box.innerHTML = `ℹ️ O lançamento será registrado no seu extrato e planejamento financeiro.`;
        return;
    }

    const conta = await dbLocal.contas_bancarias.get(contaId);
    if (!conta) return;

    const val = dados.valor || 0;

    if (conta.tipo_conta === 'Cartão de Crédito' || dados.tipoGasto === 'Cartão de Crédito') {
        const limTotal = parseFloat(conta.limite_cartao) || 0;
        box.innerHTML = `💳 <strong>Cartão de Crédito:</strong> Será adicionado à fatura deste mês. Limite Total: ${formatBRL(limTotal)}`;
        box.style.color = '#A78BFA';
        box.style.background = 'rgba(167, 139, 250, 0.12)';
    } else {
        const saldoAtual = parseFloat(conta.saldo_atual) || 0;
        if (dados.tipoGasto === 'Receita') {
            const novoSaldo = saldoAtual + val;
            box.innerHTML = `💰 <strong>Receita:</strong> Saldo de <strong>${conta.nome_conta}</strong> aumentará de ${formatBRL(saldoAtual)} para <strong style="color: #10B981;">${formatBRL(novoSaldo)}</strong> (+${formatBRL(val)})`;
            box.style.color = '#34D399';
            box.style.background = 'rgba(52, 211, 153, 0.12)';
        } else {
            const novoSaldo = saldoAtual - val;
            box.innerHTML = `🏦 <strong>Débito Automático:</strong> Saldo de <strong>${conta.nome_conta}</strong> será subtraído de ${formatBRL(saldoAtual)} para <strong style="color: #60A5FA;">${formatBRL(novoSaldo)}</strong> (-${formatBRL(val)})`;
            box.style.color = '#38BDF8';
            box.style.background = 'rgba(56, 189, 248, 0.12)';
        }
    }
}
window.atualizarImpactoSaldoExpresso = atualizarImpactoSaldoExpresso;

// Confirma o lançamento automático com 1 toque
async function confirmarLancamentoAutomaticoExpresso() {
    const dados = window.dadosComprovanteExpressoTemp;
    if (!dados || !dados.valor) {
        alert("Nenhum dado válido para lançamento.");
        return;
    }

    const sel = document.getElementById('selectContaExpresso');
    const contaIdFinal = sel ? sel.value : (dados.contaId || '1');
    const ts = Date.now();
    const movId = generateUUID();

    const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = authUser ? authUser.id : (localStorage.getItem('financas_current_user_id') || null);

    const novoLancamento = {
        id: movId,
        descricao: dados.descricao,
        valor_total: dados.valor,
        valor_realizado: dados.valor,
        data_lancamento: dados.data,
        tipo_gasto: dados.tipoGasto,
        status: 'Pago',
        conta_id: contaIdFinal || '1',
        parcelado: 'Não',
        total_parcelas: 1,
        parcela_atual: 1,
        id_grupo: '',
        link_url: '',
        midia_url: dados.midiaUrl || '',
        midia_tipo: dados.midiaUrl ? 'foto' : '',
        user_id: currentUserId,
        deleted: 0,
        sync_status: 'pending_insert',
        updated_at: ts
    };

    await dbLocal.movimentacoes.put(novoLancamento);

    // Subtração ou Adição Automática em Conta Corrente
    if (contaIdFinal) {
        try {
            const conta = await dbLocal.contas_bancarias.get(contaIdFinal);
            if (conta && conta.tipo_conta !== 'Cartão de Crédito') {
                const saldoAnt = parseFloat(conta.saldo_atual) || 0;
                const novoSaldo = (dados.tipoGasto === 'Receita') ? (saldoAnt + dados.valor) : (saldoAnt - dados.valor);
                await dbLocal.contas_bancarias.update(contaIdFinal, {
                    saldo_atual: novoSaldo,
                    sync_status: 'pending_update',
                    updated_at: ts
                });
                console.log(`[LANÇAMENTO AUTOMÁTICO] Conta '${conta.nome_conta}' atualizada: ${saldoAnt} -> ${novoSaldo}`);
            }
        } catch(e) {
            console.warn("Erro ao atualizar saldo da conta vinculada:", e);
        }
    }

    fecharModalConfirmacaoExpresso();

    if (typeof showToast === 'function') {
        showToast(`⚡ Lançamento de ${dados.valorFmt} confirmado automaticamente!`);
    }

    if (typeof carregarPlanejamento === 'function') carregarPlanejamento();
    if (typeof carregarCartoesEContas === 'function') carregarCartoesEContas();
    if (typeof syncFinanceWithServer === 'function') syncFinanceWithServer();
}
window.confirmarLancamentoAutomaticoExpresso = confirmarLancamentoAutomaticoExpresso;

// Permite abrir no formulário completo com tudo pré-preenchido caso o usuário queira editar
function abrirNoFormularioCompletoExpresso() {
    const dados = window.dadosComprovanteExpressoTemp;
    fecharModalConfirmacaoExpresso();

    if (typeof abrirModalLancamento === 'function') {
        abrirModalLancamento();

        if (dados) {
            const selTipo = document.getElementById('inputTipoGasto');
            if (selTipo) selTipo.value = dados.tipoGasto;

            const inpDesc = document.getElementById('inputDescricao');
            const inpCustom = document.getElementById('inputDescricaoPersonalizada');
            if (inpDesc) inpDesc.value = dados.descricao;
            if (inpCustom) {
                inpCustom.value = dados.descricao;
                inpCustom.style.display = 'block';
            }

            const inpValor = document.getElementById('inputValor');
            const inpReal = document.getElementById('inputValorRealizado');
            if (inpValor && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpValor, dados.valor);
            if (inpReal && typeof setarValorMoedaInput === 'function') setarValorMoedaInput(inpReal, dados.valor);

            const inpData = document.getElementById('inputData');
            if (inpData) inpData.value = dados.data;

            const selStatus = document.getElementById('inputStatus');
            if (selStatus) selStatus.value = 'Pago';

            const selConta = document.getElementById('inputContaId');
            if (selConta && dados.contaId) selConta.value = dados.contaId;

            if (dados.midiaUrl) {
                window.midiaComprovanteTemp = dados.midiaUrl;
                const thumb = document.getElementById('thumbComprovante');
                if (thumb) thumb.src = dados.midiaUrl;
                const previewBox = document.getElementById('previewComprovanteContainer');
                if (previewBox) previewBox.style.display = 'flex';
            }
        }
    }
}
window.abrirNoFormularioCompletoExpresso = abrirNoFormularioCompletoExpresso;
