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

// Interpreta texto de comprovantes brasileiros (Pix, Boletos, Cartões, Maquininhas, Cupons e Notificações de Celular)
function interpretarTextoComprovante(texto, origem) {
    ocultarStatusOcr();
    if (!texto) return;

// Normaliza string para número float considerando pontos e vírgulas de impressoras térmicas
function normalizarValorNumero(str) {
    if (!str) return 0;
    let s = str.trim().replace(/^R?\$?\s*/i, '');
    // Se tem tanto ponto quanto vírgula (ex: 1.234,56 ou 1,234.56)
    if (s.includes('.') && s.includes(',')) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            // Padrão brasileiro: 1.234,56
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            // Padrão americano: 1,234.56
            s = s.replace(/,/g, '');
        }
    } else if (s.includes(',')) {
        // Ex: 37,35
        s = s.replace(',', '.');
    } else if (s.includes('.')) {
        // Ex: 37.35 ou 1000.00
        const partes = s.split('.');
        if (partes[partes.length - 1].length === 2) {
            // Duas casas decimais térmicas: 37.35
            s = partes.slice(0, -1).join('') + '.' + partes[partes.length - 1];
        } else {
            s = s.replace(/\./g, '');
        }
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function formatarValorParaInput(val) {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Extração robusta do valor total da compra em cupons fiscais, TEF e comprovantes
function extrairValorComprovante(texto) {
    if (!texto) return null;

    const linhas = texto.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

    // Palavras que indicam TRIBUTOS, TROCO ou DESCONTOS - JAMAIS devem ser pegas como valor da compra!
    const palavrasIgnorar = /\b(FEDERAL|ESTADUAL|MUNICIPAL|TRIBUTOS?|IMPOSTOS?|ICMS|ISS|PIS|COFINS|TROCO|DESCONTO|ABATIMENTO|DEVOLUCAO|VALOR\s+UNIT|VL\s+UNIT|UNITARIO)\b/i;

    // 1. PRIORIDADE MÁXIMA: Rótulos explícitos de Total a Pagar e Compra
    const regexTotalPrioritario = [
        /(?:VALOR\s*A\s*PAGAR|TOTAL\s*A\s*PAGAR)[\s:]*R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
        /(?:VALOR\s*TOTAL|TOTAL\s*LIQUIDO|VALOR\s*LIQUIDO)[\s:]*R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
        /(?:VALOR\s*PAGO|TOTAL\s*PAGO)[\s:]*R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
        /(?:COMPRA:?.*?VALOR:?|VALOR:?.*?COMPRA)[\s:]*R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
        /(?:CARTAO\s+DEBITO|CARTAO\s+CREDITO|TICKET|ALIMENTACAO|VOUCHER)[\s:]*R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
        /\bTOTAL[\s:]+R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i
    ];

    for (const regex of regexTotalPrioritario) {
        for (const linha of linhas) {
            if (palavrasIgnorar.test(linha)) continue;
            const m = linha.match(regex);
            if (m && m[1]) {
                const val = normalizarValorNumero(m[1]);
                if (val > 0) return { formatado: formatarValorParaInput(val), numero: val };
            }
        }
    }

    for (const regex of regexTotalPrioritario) {
        const m = texto.match(regex);
        if (m && m[1]) {
            const idx = m.index || 0;
            const trecho = texto.substring(Math.max(0, idx - 40), Math.min(texto.length, idx + 40));
            if (!palavrasIgnorar.test(trecho)) {
                const val = normalizarValorNumero(m[1]);
                if (val > 0) return { formatado: formatarValorParaInput(val), numero: val };
            }
        }
    }

    // 2. PRIORIDADE MÉDIA: "VALOR:", "VALOR DA TRANSACAO", "VALOR PIX", "VALOR COBRADO"
    const regexSecundario = [
        /(?:VALOR\s*(?:DA\s*TRANSACAO|PIX|COBRADO|RECEBIDO|PRINCIPAL|FINAL)?|PAGO|COMPRA)[\s:]*R?\$?\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i,
        /R\$\s*([0-9]{1,4}(?:[.,][0-9]{3})*[.,][0-9]{2})/i
    ];

    for (const regex of regexSecundario) {
        for (const linha of linhas) {
            if (palavrasIgnorar.test(linha)) continue;
            if (/\b(SALDO|SALDO\s+DISP|DISPONIVEL)\b/i.test(linha)) continue;
            const m = linha.match(regex);
            if (m && m[1]) {
                const val = normalizarValorNumero(m[1]);
                if (val > 0) return { formatado: formatarValorParaInput(val), numero: val };
            }
        }
    }

    return null;
}

function limparNomeEstabelecimento(str) {
    if (!str) return '';
    return str
        .replace(/\b(LTDA|EIRELI|S\/?A|S\.A\.|M\.?E\.?|EPP|MEI)\b/gi, '')
        .replace(/^[:\-\s\.\*]+|[:\-\s\.\*]+$/g, '')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.length > 2 ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : w.toUpperCase())
        .join(' ')
        .trim();
}

// Extrai o nome real do estabelecimento (mercado, loja, posto) de cupons fiscais e recibos
function extrairEstabelecimentoComprovante(texto, textoLimpo) {
    if (!texto) return '';

    const linhas = texto.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

    // 1. Procura nas primeiras 6 linhas (cabeçalho de cupom fiscal NFC-e / SAT / ECF)
    for (let i = 0; i < Math.min(linhas.length, 6); i++) {
        let l = linhas[i].trim();
        if (/^(CNPJ|CPF|IE|IM|AV|AVENIDA|RUA|RODOVIA|TRAVESSA|PRACA|CEP|FONE|TEL|DOCUMENTO|DANFE|EXTRATO|NOTA\s+FISCAL|NFC-?E|SAT|SISTEMA)/i.test(l)) continue;
        if (l.length < 3 || l.length > 50) continue;

        if (/\b(LTDA|EIRELI|S\/?A|M\.?E\.?|EPP|SUPERMERCADO|MERCADO|POSTO|PADARIA|FARMACIA|DROGARIA|LANCHONETE|RESTAURANTE|COMERCIO|DISTRIBUIDORA|CONVENIENCIA)\b/i.test(l)) {
            return limparNomeEstabelecimento(l);
        }
        if (i + 1 < linhas.length && /CNPJ/i.test(linhas[i + 1])) {
            return limparNomeEstabelecimento(l);
        }
    }

    // 2. Procura no comprovante TEF (frequentemente "NOME ESTABELECIMENTO DD/MM/AAAA HH:MM")
    for (const linha of linhas) {
        if (/^(REDE|AUTORIZACAO|TRANSACAO|CARTAO|COMPRA|SALDO|VALOR|VIA|CLIENTE)/i.test(linha)) continue;
        const matchDataHora = linha.match(/^([A-Za-z0-9\s\.\-_&]{3,40}?)\s+[0-3]?[0-9][\/\.-][0-1]?[0-9][\/\.-]20[2-3][0-9]/i);
        if (matchDataHora && matchDataHora[1] && matchDataHora[1].trim().length > 3) {
            return limparNomeEstabelecimento(matchDataHora[1]);
        }
    }

    // 3. Notificações de Celular (Nubank, Sicredi, Itaú, etc.): "em Loja X", "para Fulano"
    const matchNotif = texto.match(/\b(?:em|na|no|para|de)\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)/i);
    if (matchNotif && matchNotif[1]) {
        const cand = matchNotif[1].trim();
        if (!/^(NUBANK|CART[AÃ]O|SICREDI|ITA[UÚ]|BRADESCO|SANTANDER|INTER|BANCO|OUROCARD|CAIXA|C6|DEBITO|CREDITO|CONTA)\b/i.test(cand)) {
            return limparNomeEstabelecimento(cand);
        }
    }

    // 4. Comprovantes com rótulos clássicos
    const matchRotulo = texto.match(/(?:ESTABELECIMENTO|RAZAO\s+SOCIAL|NOME\s+FANTASIA|BENEFICIARIO|DESTINATARIO|EMPRESA)[\s:]+([^\n\r,]+)/i);
    if (matchRotulo && matchRotulo[1] && matchRotulo[1].trim().length > 2) {
        return limparNomeEstabelecimento(matchRotulo[1]);
    }

    return '';
}

// Interpreta texto de comprovantes brasileiros (Pix, Boletos, Cartões, Maquininhas, Cupons e Notificações de Celular)
function interpretarTextoComprovante(texto, origem) {
    ocultarStatusOcr();
    if (!texto) return;

    const textoLimpo = ocrNormalizarTexto(texto);
    console.log("=== TEXTO OCR IDENTIFICADO ===", texto);

    let valorEncontrado = null;
    let dataEncontrada = null;
    let horaEncontrada = null;
    let descricaoEncontrada = "";
    let tipoMovimentacao = "Despesa Variável";
    let isStatusPago = true;
    let parcelasDetectadas = 1;

    // 1. EXTRAÇÃO ROBUSTA DE VALOR (Total a Pagar / Gasto Total)
    const resValor = extrairValorComprovante(texto);
    if (resValor) {
        valorEncontrado = resValor.formatado;
    }

    // 2. EXTRAÇÃO DE DATA E HORA
    // Formato DD/MM/AAAA ou DD/MM/AA ou DD-MM-AAAA ou DD.MM.AAAA
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

    // Meses por extenso: ex: 18 de Outubro de 2026 / 18 OUT 2026
    if (!dataEncontrada) {
        const mesesMap = {
            'JANEIRO': '01', 'FEVEREIRO': '02', 'MARCO': '03', 'ABRIL': '04',
            'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
            'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12',
            'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05',
            'JUN': '06', 'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10',
            'NOV': '11', 'DEZ': '12'
        };
        const matchExtenso = textoLimpo.match(/\b([0-3]?[0-9])\s+(?:DE\s+)?([A-Z]{3,9})(?:\s+DE|\s+)?\s+(20[2-3][0-9])\b/);
        if (matchExtenso && mesesMap[matchExtenso[2]]) {
            const d = matchExtenso[1].padStart(2, '0');
            const m = mesesMap[matchExtenso[2]];
            const a = matchExtenso[3];
            dataEncontrada = `${a}-${m}-${d}`;
        }
    }

    if (!dataEncontrada) {
        dataEncontrada = (new Date()).toISOString().split('T')[0];
    }

    // Hora (HH:MM:SS ou HH:MM)
    const matchHora = texto.match(/\b([0-2]?[0-9]):([0-5][0-9])(?::([0-5][0-9]))?\b/);
    if (matchHora) {
        horaEncontrada = `${matchHora[1].padStart(2, '0')}:${matchHora[2]}`;
    }

    // 3. DETECÇÃO INTELIGENTE DE PARCELAMENTO (1x a 48x)
    const matchXValor = texto.match(/\b([0-9]{1,2})\s*X\s+(?:DE\s+)?R?\$?\s*([0-9]+[,\.][0-9]{2})/i);
    const matchParcFracao = texto.match(/\bPARC(?:ELAS?)?[\s:]*([0-9]{1,2})\s*[\/]\s*([0-9]{1,2})\b/i);
    const matchParcSimples = texto.match(/\bPARC(?:ELAS?)?[\s:]*([0-9]{1,2})\b/i);
    const matchEmX = texto.match(/\bEM\s+([0-9]{1,2})\s*(?:X|VEZES|PARCELAS)\b/i);
    const matchParcEm = texto.match(/\bPARCELADO\s+(?:EM\s+)?([0-9]{1,2})\s*(?:X|VEZES)?\b/i);
    const matchXSolto = texto.match(/\b([2-9]|1[0-9]|2[0-4])\s*X\b/i);

    if (matchParcFracao && matchParcFracao[2]) {
        parcelasDetectadas = parseInt(matchParcFracao[2], 10);
    } else if (matchParcSimples && matchParcSimples[1]) {
        parcelasDetectadas = parseInt(matchParcSimples[1], 10);
    } else if (matchXValor && matchXValor[1]) {
        parcelasDetectadas = parseInt(matchXValor[1], 10);
    } else if (matchEmX && matchEmX[1]) {
        parcelasDetectadas = parseInt(matchEmX[1], 10);
    } else if (matchParcEm && matchParcEm[1]) {
        parcelasDetectadas = parseInt(matchParcEm[1], 10);
    } else if (matchXSolto && matchXSolto[1] && (textoLimpo.includes('CREDITO') || textoLimpo.includes('CARTAO') || textoLimpo.includes('COMPRA') || textoLimpo.includes('PARCELA'))) {
        parcelasDetectadas = parseInt(matchXSolto[1], 10);
    }

    // 4. DETECÇÃO DE BANCOS, CARTÕES E BANDEIRAS
    let cartaoBancoDetectado = "";
    const bancosCartoesRegex = [
        { nome: "Ticket", regex: /\bTICKET(?:\s+ALIMENTACAO|\s+FLEX|\s+REFEICAO)?\b/i },
        { nome: "Alelo", regex: /\bALELO\b/i },
        { nome: "Sodexo / Pluxee", regex: /\b(SODEXO|PLUXEE)\b/i },
        { nome: "VR Benefícios", regex: /\bVR(?:\s+(?:BENEFICIOS|ALIMENTACAO|REFEICAO))?\b/i },
        { nome: "Flash", regex: /\bFLASH\b/i },
        { nome: "Caju", regex: /\bCAJU\b/i },
        { nome: "Swile", regex: /\bSWILE\b/i },
        { nome: "Alimentação", regex: /\b(VALE\s+ALIMENTACAO|ALIMENTACAO|REFEICAO)\b/i },
        { nome: "Sicredi", regex: /\bSICREDI\b/i },
        { nome: "Nubank", regex: /\bNUBANK\b/i },
        { nome: "Inter", regex: /\b(BANCO\s+INTER|INTER)\b/i },
        { nome: "Itaú", regex: /\bITA[UÚ]\b/i },
        { nome: "Bradesco", regex: /\bBRADESCO\b/i },
        { nome: "Santander", regex: /\bSANTANDER\b/i },
        { nome: "Banco do Brasil", regex: /\b(BANCO\s+DO\s+BRASIL|OUROCARD|BB)\b/i },
        { nome: "Caixa", regex: /\bCAIXA\b/i },
        { nome: "C6 Bank", regex: /\b(C6\s*BANK|C6)\b/i },
        { nome: "PagBank", regex: /\b(PAGBANK|PAGSEGURO)\b/i },
        { nome: "Mercado Pago", regex: /\b(MERCADO\s+PAGO|MERCADOPAGO)\b/i },
        { nome: "PicPay", regex: /\bPICPAY\b/i },
        { nome: "Sicoob", regex: /\bSICOOB\b/i },
        { nome: "BTG Pactual", regex: /\bBTG(?:\s+PACTUAL)?\b/i },
        { nome: "Stone", regex: /\bSTONE\b/i },
        { nome: "Visa Gold", regex: /\bVISA\s+GOLD\b/i },
        { nome: "Visa Infinite", regex: /\bVISA\s+INFINITE\b/i },
        { nome: "Visa Platinum", regex: /\bVISA\s+PLATINUM\b/i },
        { nome: "Visa", regex: /\bVISA\b/i },
        { nome: "Mastercard Black", regex: /\bMASTERCARD\s+BLACK\b/i },
        { nome: "Mastercard", regex: /\bMASTERCARD\b/i },
        { nome: "Elo Nanquim", regex: /\bELO\s+NANQUIM\b/i },
        { nome: "Elo", regex: /\bELO\b/i }
    ];

    for (let b of bancosCartoesRegex) {
        if (b.regex.test(textoLimpo)) {
            cartaoBancoDetectado = b.nome;
            break;
        }
    }

    const isAlimentacaoNotif = /\b(ALELO|SODEXO|PLUXEE|TICKET|VR|FLASH|CAJU|SWILE|VALE\s+ALIMENTACAO|VALE\s+REFEICAO|ALIMENTACAO|REFEICAO)\b/i.test(textoLimpo);
    const isDebitoNotif = /\b(DEBITO|COMPRA\s+DEBITO|NO\s+DEBITO|CARTAO\s+DE\s+DEBITO)\b/i.test(textoLimpo);
    const isCreditoNotif = (parcelasDetectadas > 1) || /\b(CREDITO|COMPRA\s+CREDITO|NO\s+CREDITO|CARTAO\s+DE\s+CREDITO|FATURA|PARCELADO)\b/i.test(textoLimpo);

    if (textoLimpo.includes('PIX RECEBIDO') || textoLimpo.includes('TRANSFERENCIA RECEBIDA') || textoLimpo.includes('CREDITO EM CONTA') || textoLimpo.includes('SALARIO') || textoLimpo.includes('PROVENTOS') || textoLimpo.includes('VOCE RECEBEU UM PIX') || textoLimpo.includes('RECEBEU UMA TRANSFERENCIA')) {
        tipoMovimentacao = 'Receita';
        isStatusPago = true;
    } else if (isAlimentacaoNotif) {
        tipoMovimentacao = 'Cartão Alimentação';
        isStatusPago = true;
    } else if (isCreditoNotif) {
        tipoMovimentacao = 'Cartão de Crédito';
        isStatusPago = true;
    } else if (isDebitoNotif) {
        tipoMovimentacao = 'Despesa Variável';
        isStatusPago = true;
    } else if (textoLimpo.includes('BOLETO') || textoLimpo.includes('PAGAMENTO DE CONTA') || textoLimpo.includes('ENEL') || textoLimpo.includes('SABESP') || textoLimpo.includes('COPASA') || textoLimpo.includes('CONDOMINIO') || textoLimpo.includes('COPEL') || textoLimpo.includes('SANEPAR') || textoLimpo.includes('FATURA VIVO') || textoLimpo.includes('FATURA CLARO')) {
        tipoMovimentacao = 'Despesa Fixa';
        isStatusPago = textoLimpo.includes('PAGO COM SUCESSO') || textoLimpo.includes('AUTENTICACAO') || textoLimpo.includes('COMPROVANTE');
    } else if (textoLimpo.includes('APLICACAO') || textoLimpo.includes('INVESTIMENTO') || textoLimpo.includes('TESOURO DIRETO') || textoLimpo.includes('CDB')) {
        tipoMovimentacao = 'Investimento';
        isStatusPago = true;
    } else {
        tipoMovimentacao = 'Despesa Variável';
        isStatusPago = true;
    }

    // 5. ESTABELECIMENTO / BENEFICIÁRIO / DESCRIÇÃO REAL
    descricaoEncontrada = extrairEstabelecimentoComprovante(texto, textoLimpo);
        descricaoEncontrada = descricaoEncontrada.replace(/^(COMPRA|D[EÉ]BITO|CR[EÉ]DITO|APROVADA|CART[AÃ]O|VISA|MASTERCARD)\s+/i, '');
        descricaoEncontrada = descricaoEncontrada.replace(/\s+(BR|PARANAVAI|CURITIBA|MARINGA|SP|RJ|PR)$/i, '');
        descricaoEncontrada = descricaoEncontrada.split(' ')
            .filter(Boolean)
            .map(p => p.length > 2 ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : p.toUpperCase())
            .join(' ');
    }

    // 6. EXTRAÇÃO DE METADADOS DO COMPROVANTE (AUTENTICAÇÃO, PIX, CNPJ, PROTOCOLO)
    const dadosComprovanteArr = [];

    // Chave Pix
    const matchChavePix = texto.match(/(?:CHAVE(?:\s+PIX)?|CHAVE\s+VINCULADA)[\s:]*([A-Za-z0-9_\-\.\@\+]{5,60})/i);
    if (matchChavePix && matchChavePix[1]) {
        dadosComprovanteArr.push("Chave Pix: " + matchChavePix[1].trim());
    }

    // ID da Transação / End-to-End
    const matchIdTransacao = texto.match(/(?:ID\s+(?:DA\s+)?TRANSACAO|ID\s+PIX|END-TO-END[\s-]?ID|CODIGO\s+(?:DA\s+)?TRANSACAO|ID)[\s:]*([A-Za-z0-9\-_]{8,45})/i);
    if (matchIdTransacao && matchIdTransacao[1]) {
        dadosComprovanteArr.push("ID: " + matchIdTransacao[1].trim());
    }

    // Código de Autenticação / Protocolo / Autorização
    const matchAutenticacao = texto.match(/(?:AUTENTICACAO(?:\s+MECANICA|\s+ELETRONICA)?|PROTOCOLO|AUTORIZACAO|CODIGO\s+DE\s+AUTENTICACAO|AUT)[\s:]*([A-Za-z0-9\.\-_]{6,40})/i);
    if (matchAutenticacao && matchAutenticacao[1]) {
        dadosComprovanteArr.push("Aut: " + matchAutenticacao[1].trim());
    }

    // NSU / DOC
    const matchNsu = texto.match(/\b(?:NSU|DOC)[\s:]*([0-9]{4,14})\b/i);
    if (matchNsu && matchNsu[1]) {
        dadosComprovanteArr.push("NSU: " + matchNsu[1].trim());
    }

    // CNPJ do Favorecido / Beneficiário
    const matchCnpj = texto.match(/\bCNPJ[\s:]*([0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[\-]?[0-9]{2})\b/i);
    if (matchCnpj && matchCnpj[1]) {
        dadosComprovanteArr.push("CNPJ: " + matchCnpj[1].trim());
    }

    if (horaEncontrada) {
        dadosComprovanteArr.push("Hora: " + horaEncontrada);
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

    // Parcelas Automáticas
    const cbParcelado = document.getElementById('inputParcelado');
    const inpTotalParc = document.getElementById('inputTotalParcelas');
    if (parcelasDetectadas > 1 && parcelasDetectadas <= 60) {
        if (cbParcelado) cbParcelado.checked = true;
        if (inpTotalParc) inpTotalParc.value = parcelasDetectadas;
        if (typeof toggleParcelas === 'function') toggleParcelas();
        camposPreenchidos.push(`${parcelasDetectadas}x Parcelas`);
    } else if (cbParcelado) {
        cbParcelado.checked = false;
        if (typeof toggleParcelas === 'function') toggleParcelas();
    }

    // Observações / Detalhes do Comprovante
    const inpObservacoes = document.getElementById('inputObservacoes');
    const badgeOcrObs = document.getElementById('badgeOcrObs');
    if (dadosComprovanteArr.length > 0) {
        const obsTexto = dadosComprovanteArr.join(' • ');
        if (inpObservacoes) inpObservacoes.value = obsTexto;
        if (badgeOcrObs) badgeOcrObs.style.display = 'inline-block';
        camposPreenchidos.push("Dados Comprovante");
    } else {
        if (badgeOcrObs) badgeOcrObs.style.display = 'none';
    }

    // Casamento de Categoria Pré-definida ou Digitação Livre do Nome
    const selCat = document.getElementById('selectCategoriaPredefinida');
    const inpDescCustom = document.getElementById('inputDescricaoPersonalizada');
    const inpDescOculto = document.getElementById('inputDescricao');
    const btnCustom = document.getElementById('btnAlternarNomeCustom');

    if (descricaoEncontrada) {
        // Prioriza o nome real do estabelecimento preenchido diretamente no campo de descrição
        if (inpDescCustom) {
            inpDescCustom.value = descricaoEncontrada;
            inpDescCustom.style.display = 'block';
        }
        if (inpDescOculto) inpDescOculto.value = descricaoEncontrada;
        if (selCat) selCat.style.display = 'none';
        if (btnCustom) btnCustom.innerHTML = '<span>📋</span> Usar Lista';
        camposPreenchidos.push("Nome: " + descricaoEncontrada);

        // Se houver categoria compatível (ex: Supermercado para Supermercado Guguy), seleciona a categoria
        if (selCat) {
            const descNorm = ocrNormalizarTexto(descricaoEncontrada);
            for (let i = 0; i < selCat.options.length; i++) {
                const optVal = selCat.options[i].value;
                if (!optVal) continue;
                const optNorm = ocrNormalizarTexto(optVal);
                if (optNorm.length >= 4 && (descNorm.includes(optNorm) || optNorm.includes(descNorm))) {
                    selCat.selectedIndex = i;
                    break;
                }
            }
        }
    } else if (selCat) {
        // Sem estabelecimento detectado, mantém lista limpa sem escolher termos aleatórios
        if (inpDescCustom) inpDescCustom.value = '';
        if (inpDescOculto) inpDescOculto.value = '';
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
        } else if (!encontrouConta && tipoMovimentacao === 'Cartão Alimentação') {
            for (let i = 0; i < selConta.options.length; i++) {
                if (selConta.options[i].dataset && selConta.options[i].dataset.tipo === 'Cartão Alimentação') {
                    selConta.selectedIndex = i;
                    camposPreenchidos.push("Alimentação: " + selConta.options[i].text.split('(')[0].trim());
                    break;
                }
            }
        }
    }

    // Atualiza a legenda do comprovante anexado
    const det = document.getElementById('detalhesComprovanteLido');
    if (det) {
        det.innerText = camposPreenchidos.length > 0 
            ? "✓ Identificado: " + camposPreenchidos.slice(0, 4).join(' • ') 
            : "Comprovante lido. Confira os campos.";
    }

    if (typeof showToast === 'function') {
        showToast("✓ Comprovante lido com sucesso! Todos os dados foram preenchidos.");
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

    // 1. EXTRAÇÃO DE VALOR ROBUSTA
    let valorNum = 0;
    let valorFmt = "R$ 0,00";
    const resVal = extrairValorComprovante(texto);
    if (resVal) {
        valorNum = resVal.numero;
        valorFmt = formatBRL(valorNum);
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

    // 2.5 DETECÇÃO DE PARCELAMENTO (EXPRESSO)
    let parcelasDetectadas = 1;
    const matchXValor = texto.match(/\b([0-9]{1,2})\s*X\s+(?:DE\s+)?R?\$?\s*([0-9]+[,\.][0-9]{2})/i);
    const matchParcFracao = texto.match(/\bPARC(?:ELAS?)?[\s:]*([0-9]{1,2})\s*[\/]\s*([0-9]{1,2})\b/i);
    const matchParcSimples = texto.match(/\bPARC(?:ELAS?)?[\s:]*([0-9]{1,2})\b/i);
    const matchEmX = texto.match(/\bEM\s+([0-9]{1,2})\s*(?:X|VEZES|PARCELAS)\b/i);
    const matchParcEm = texto.match(/\bPARCELADO\s+(?:EM\s+)?([0-9]{1,2})\s*(?:X|VEZES)?\b/i);
    const matchXSolto = texto.match(/\b([2-9]|1[0-9]|2[0-4])\s*X\b/i);

    if (matchParcFracao && matchParcFracao[2]) {
        parcelasDetectadas = parseInt(matchParcFracao[2], 10);
    } else if (matchParcSimples && matchParcSimples[1]) {
        parcelasDetectadas = parseInt(matchParcSimples[1], 10);
    } else if (matchXValor && matchXValor[1]) {
        parcelasDetectadas = parseInt(matchXValor[1], 10);
    } else if (matchEmX && matchEmX[1]) {
        parcelasDetectadas = parseInt(matchEmX[1], 10);
    } else if (matchParcEm && matchParcEm[1]) {
        parcelasDetectadas = parseInt(matchParcEm[1], 10);
    } else if (matchXSolto && matchXSolto[1] && (textoLimpo.includes('CREDITO') || textoLimpo.includes('CARTAO') || textoLimpo.includes('COMPRA') || textoLimpo.includes('PARCELA'))) {
        parcelasDetectadas = parseInt(matchXSolto[1], 10);
    }

    // 2.6 EXTRAÇÃO DE METADADOS DO COMPROVANTE (AUTENTICAÇÃO, PIX, CNPJ)
    const dadosComprovanteArr = [];
    const matchChavePix = texto.match(/(?:CHAVE(?:\s+PIX)?|CHAVE\s+VINCULADA)[\s:]*([A-Za-z0-9_\-\.\@\+]{5,60})/i);
    if (matchChavePix && matchChavePix[1]) dadosComprovanteArr.push("Chave Pix: " + matchChavePix[1].trim());

    const matchIdTransacao = texto.match(/(?:ID\s+(?:DA\s+)?TRANSACAO|ID\s+PIX|END-TO-END[\s-]?ID|CODIGO\s+(?:DA\s+)?TRANSACAO|ID)[\s:]*([A-Za-z0-9\-_]{8,45})/i);
    if (matchIdTransacao && matchIdTransacao[1]) dadosComprovanteArr.push("ID: " + matchIdTransacao[1].trim());

    const matchAutenticacao = texto.match(/(?:AUTENTICACAO(?:\s+MECANICA|\s+ELETRONICA)?|PROTOCOLO|AUTORIZACAO|CODIGO\s+DE\s+AUTENTICACAO|AUT)[\s:]*([A-Za-z0-9\.\-_]{6,40})/i);
    if (matchAutenticacao && matchAutenticacao[1]) dadosComprovanteArr.push("Aut: " + matchAutenticacao[1].trim());

    const matchNsu = texto.match(/\b(?:NSU|DOC)[\s:]*([0-9]{4,14})\b/i);
    if (matchNsu && matchNsu[1]) dadosComprovanteArr.push("NSU: " + matchNsu[1].trim());

    const matchCnpj = texto.match(/\bCNPJ[\s:]*([0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[\-]?[0-9]{2})\b/i);
    if (matchCnpj && matchCnpj[1]) dadosComprovanteArr.push("CNPJ: " + matchCnpj[1].trim());

    const obsTextoFinal = dadosComprovanteArr.join(' • ');

    // 3. OPERAÇÃO E TIPO DE GASTO
    const isAlimentacao = /\b(ALELO|SODEXO|PLUXEE|TICKET|VR|FLASH|CAJU|SWILE|VALE\s+ALIMENTACAO|VALE\s+REFEICAO|ALIMENTACAO|REFEICAO)\b/i.test(textoLimpo);
    const isDebito = /\b(DEBITO|COMPRA\s+DEBITO|NO\s+DEBITO|CARTAO\s+DE\s+DEBITO)\b/i.test(textoLimpo);
    const isCredito = (parcelasDetectadas > 1) || /\b(CREDITO|COMPRA\s+CREDITO|NO\s+CREDITO|CARTAO\s+DE\s+CREDITO|FATURA|PARCELADO)\b/i.test(textoLimpo);
    const isBoleto = /\b(BOLETO|PAGAMENTO\s+DE\s+CONTA|CODIGO\s+DE\s+BARRAS|LINHA\s+DIGITAVEL)\b/i.test(textoLimpo);
    const isPixRec = /\b(PIX\s+RECEBIDO|TRANSFERENCIA\s+RECEBIDA|CREDITO\s+EM\s+CONTA|VOCE\s+RECEBEU\s+UM\s+PIX)\b/i.test(textoLimpo);
    const isPixEnv = /\b(PIX\s+ENVIADO|PIX\s+PAGO|TRANSFERENCIA\s+PIX|COMPROVANTE\s+PIX|VOCE\s+FEZ\s+UM\s+PIX)\b/i.test(textoLimpo);

    let tipoGasto = "Despesa Variável";
    let badgeTitulo = "Débito em Conta";
    let badgeCor = "#10B981";

    if (isAlimentacao) {
        tipoGasto = "Cartão Alimentação";
        badgeTitulo = "Cartão Alimentação";
        badgeCor = "#F97316";
    } else if (isCredito) {
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
    let estabelecimento = extrairEstabelecimentoComprovante(texto, textoLimpo);
    if (!estabelecimento) {
        estabelecimento = isAlimentacao ? "Compra Alimentação" : (isCredito ? "Compra no Cartão" : (isBoleto ? "Pagamento de Boleto" : "Pagamento / Compra"));
    }

    // 5. BANCO OU CARTÃO
    let cartaoDetectado = "";
    const bancos = ["Visa Gold", "Visa", "Mastercard", "Elo", "Sicredi", "Nubank", "Inter", "Itaú", "Bradesco", "Santander", "Banco do Brasil", "Caixa", "C6 Bank", "PagBank", "Mercado Pago", "PicPay", "Sicoob"];
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
        totalParcelas: parcelasDetectadas,
        parcelado: parcelasDetectadas > 1 ? 'Sim' : 'Não',
        observacoes: obsTextoFinal,
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

    const badgeParc = document.getElementById('badgeParcelasExpresso');
    if (badgeParc) {
        if (parcelasDetectadas > 1) {
            badgeParc.style.display = 'inline-block';
            badgeParc.innerText = `${parcelasDetectadas}x Parcelas`;
        } else {
            badgeParc.style.display = 'none';
        }
    }

    const txtEstab = document.getElementById('txtEstabelecimentoExpresso');
    if (txtEstab) txtEstab.innerText = estabelecimento;

    const txtData = document.getElementById('txtDataHoraExpresso');
    if (txtData) txtData.innerText = `${dataFmt} às ${horaStr}`;

    const txtObsExp = document.getElementById('txtObservacoesExpresso');
    if (txtObsExp) {
        if (obsTextoFinal) {
            txtObsExp.style.display = 'block';
            txtObsExp.innerText = `📝 ${obsTextoFinal}`;
        } else {
            txtObsExp.style.display = 'none';
        }
    }

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
                const titInfo = c.titular ? ` [👤 ${c.titular}]` : '';
                const detalhe = c.tipo_conta === 'Cartão de Crédito' ? `(Limite: ${formatBRL(c.limite_cartao || 0)})` : `(Saldo: ${formatBRL(c.saldo_atual || 0)})`;
                opt.innerText = `${icone} ${c.nome_conta}${titInfo} ${detalhe}`;
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
        const parcTxt = dados.totalParcelas > 1 ? ` (${dados.totalParcelas}x parcelado)` : '';
        box.innerHTML = `💳 <strong>Cartão de Crédito${parcTxt}:</strong> Adicionado à fatura. Limite: ${formatBRL(limTotal)}`;
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
    const totalParc = dados.totalParcelas || 1;
    const isParc = totalParc > 1;
    const idGrupo = isParc ? generateUUID() : '';

    const authUser = (typeof getAuthUser === 'function') ? getAuthUser() : null;
    const currentUserId = authUser ? authUser.id : (localStorage.getItem('financas_current_user_id') || null);

    const valorPorParcela = isParc ? (dados.valor / totalParc) : dados.valor;

    let anoBase = 2026, mesBase = 0, diaBase = 1;
    if (dados.data) {
        const p = dados.data.split('-');
        anoBase = parseInt(p[0], 10);
        mesBase = parseInt(p[1], 10) - 1;
        diaBase = parseInt(p[2], 10);
    }

    for (let i = 0; i < totalParc; i++) {
        let dataParcela = dados.data;
        if (isParc && dados.data) {
            const tempD = new Date(anoBase, mesBase + i, 1, 12, 0, 0);
            const a = tempD.getFullYear();
            const m = tempD.getMonth();
            const maxDias = new Date(a, m + 1, 0).getDate();
            const d = Math.min(diaBase, maxDias);
            const dtFinal = new Date(a, m, d, 12, 0, 0);
            dataParcela = `${dtFinal.getFullYear()}-${String(dtFinal.getMonth() + 1).padStart(2, '0')}-${String(dtFinal.getDate()).padStart(2, '0')}`;
        }

        const descFinal = isParc ? `${dados.descricao} (${i + 1}/${totalParc})` : dados.descricao;
        const statusFinal = (dados.tipoGasto === 'Cartão de Crédito') 
            ? 'Pendente' 
            : (isParc ? (i === 0 ? 'Pago' : 'Pendente') : 'Pago');
        const valorRealizadoFinal = (statusFinal === 'Pago') ? valorPorParcela : 0;

        const novoLancamento = {
            id: generateUUID(),
            descricao: descFinal,
            valor_total: valorPorParcela,
            valor_realizado: valorRealizadoFinal,
            data_lancamento: dataParcela,
            tipo_gasto: dados.tipoGasto,
            status: statusFinal,
            conta_id: contaIdFinal || '1',
            parcelado: isParc ? 'Sim' : 'Não',
            total_parcelas: isParc ? totalParc : 1,
            parcela_atual: isParc ? (i + 1) : 1,
            id_grupo: idGrupo,
            link_url: '',
            midia_url: dados.midiaUrl || '',
            midia_tipo: dados.midiaUrl ? 'foto' : '',
            observacoes: dados.observacoes || '',
            user_id: currentUserId,
            deleted: 0,
            sync_status: 'pending_insert',
            updated_at: ts
        };

        await dbLocal.movimentacoes.put(novoLancamento);
    }

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
        showToast(isParc 
            ? `⚡ ${totalParc} parcelas de ${dados.descricao} lançadas com sucesso!` 
            : `⚡ Lançamento de ${dados.valorFmt} confirmado automaticamente!`);
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
            const btnCustom = document.getElementById('btnAlternarNomeCustom');
            if (inpDesc) inpDesc.value = dados.descricao;
            if (inpCustom) {
                inpCustom.value = dados.descricao;
                inpCustom.style.display = 'block';
            }
            if (btnCustom) btnCustom.innerHTML = '<span>📋</span> Usar Lista';
            const selCat = document.getElementById('selectCategoriaPredefinida');
            if (selCat) selCat.style.display = 'none';

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

            // Parcelamento
            if (dados.totalParcelas > 1) {
                const cbParc = document.getElementById('inputParcelado');
                const inpTotal = document.getElementById('inputTotalParcelas');
                if (cbParc) cbParc.checked = true;
                if (inpTotal) inpTotal.value = dados.totalParcelas;
                if (typeof toggleParcelas === 'function') toggleParcelas();
            }

            // Observações
            const inpObs = document.getElementById('inputObservacoes');
            const badgeObs = document.getElementById('badgeOcrObs');
            if (inpObs && dados.observacoes) {
                inpObs.value = dados.observacoes;
                if (badgeObs) badgeObs.style.display = 'inline-block';
            }

            if (dados.midiaUrl) {
                window.midiaComprovanteTemp = dados.midiaUrl;
                const thumb = document.getElementById('thumbComprovante');
                if (thumb) thumb.src = dados.midiaUrl;
                const previewBox = document.getElementById('previewComprovanteContainer');
                if (previewBox) previewBox.style.display = 'flex';
                const det = document.getElementById('detalhesComprovanteLido');
                if (det) det.innerText = "Comprovante anexado à movimentação";
            }
        }
    }
}
window.abrirNoFormularioCompletoExpresso = abrirNoFormularioCompletoExpresso;
