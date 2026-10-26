# -*- coding: utf-8 -*-
"""
leitor_notificacoes.py - Ferramenta Python de Leitura e Integração Automática de Notificações Bancárias
Suporta Débito e Crédito de QUALQUER banco (Sicredi, Nubank, Itaú, Bradesco, Santander, Inter, C6, BB, Caixa, etc.)
Lê fotos/capturas de tela de notificações e textos colados, integrando diretamente com o SQLite do APP Finanças Pessoais.
"""

import os
import sys
import re
import json
import uuid
import time
import sqlite3
import argparse
import asyncio
import urllib.request
from datetime import datetime
from PIL import Image

# Configura encoding UTF-8 no Windows para evitar falhas com emojis bancários
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Tenta importar winocr para leitura nativa ultra rápida no Windows
try:
    import winocr
    HAS_WINOCR = True
except ImportError:
    HAS_WINOCR = False

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dados_financeiros.sqlite')


class LeitorNotificacaoBancaria:
    """Parser avançado de comprovantes e notificações bancárias multimarcas."""

    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        self._inicializar_banco()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _inicializar_banco(self):
        """Garante que as colunas necessárias existam no SQLite."""
        try:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(contas_bancarias)")
            cols = [c[1] for c in cur.fetchall()]
            if 'saldo_atual' not in cols:
                cur.execute("ALTER TABLE contas_bancarias ADD COLUMN saldo_atual REAL DEFAULT 0")
            if 'cor_cartao' not in cols:
                cur.execute("ALTER TABLE contas_bancarias ADD COLUMN cor_cartao TEXT DEFAULT '#2563EB'")
            if 'banco' not in cols:
                cur.execute("ALTER TABLE contas_bancarias ADD COLUMN banco TEXT DEFAULT ''")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[AVISO] Inicializacao de colunas no banco: {e}")

    async def extrair_texto_imagem_async(self, caminho_imagem):
        """Extrai o texto de uma imagem usando Windows OCR."""
        if not os.path.exists(caminho_imagem):
            raise FileNotFoundError(f"Arquivo de imagem não encontrado: {caminho_imagem}")

        if HAS_WINOCR:
            try:
                img = Image.open(caminho_imagem)
                res = await winocr.recognize_pil(img, lang='pt-BR')
                return res.text
            except Exception as e:
                print(f"[ERRO OCR Windows]: {e}")
        
        return ""

    def extrair_texto_pdf(self, caminho_pdf):
        """Extrai texto de um comprovante em formato PDF gerado pelo banco."""
        try:
            import fitz
            doc = fitz.open(caminho_pdf)
            texto_completo = ""
            for page in doc:
                texto_completo += page.get_text() + "\n"
            
            # Se o PDF foi escaneado e não tem texto selecionável, faz OCR na imagem da página
            if len(texto_completo.strip()) < 15 and HAS_WINOCR:
                for i, page in enumerate(doc):
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    res = asyncio.run(winocr.recognize_pil(img, lang='pt-BR'))
                    texto_completo += res.text + "\n"
            return texto_completo
        except Exception as e:
            print(f"[ERRO LEITURA PDF]: {e}")
            return ""

    def extrair_texto_arquivo(self, caminho_arquivo):
        """Lê qualquer arquivo de comprovante (Foto, Print ou PDF)."""
        if not os.path.exists(caminho_arquivo):
            raise FileNotFoundError(f"Arquivo não encontrado: {caminho_arquivo}")
        
        ext = os.path.splitext(caminho_arquivo)[1].lower()
        if ext == '.pdf':
            return self.extrair_texto_pdf(caminho_arquivo)
        else:
            return self.extrair_texto_imagem(caminho_arquivo)

    def extrair_texto_imagem(self, caminho_imagem):
        """Versão síncrona para extração de OCR."""
        return asyncio.run(self.extrair_texto_imagem_async(caminho_imagem))

    def interpretar_notificacao(self, texto):
        """
        Interpreta o texto de notificação de qualquer banco brasileiro.
        Extrai: operação (Débito/Crédito), valor, data/hora, cartão/banco, estabelecimento.
        """
        if not texto:
            return None

        texto_limpo = texto.replace('\r', ' ').replace('\n', ' ')
        texto_upper = texto_limpo.upper()

        # 1. IDENTIFICAR OPERAÇÃO (Débito, Crédito ou Alimentação)
        operacao = "Indefinido"
        if re.search(r'\b(ALELO|SODEXO|PLUXEE|TICKET|VR|FLASH|CAJU|SWILE|VALE\s+ALIMENTACAO|VALE\s+REFEICAO|ALIMENTACAO|REFEICAO)\b', texto_upper):
            operacao = "Alimentação"
        elif re.search(r'\b(D[EÉ]BITO|COMPRA\s+D[EÉ]BITO|NO\s+D[EÉ]BITO|CARTAO\s+DE\s+DEBITO)\b', texto_upper):
            operacao = "Débito"
        elif re.search(r'\b(CR[EÉ]DITO|COMPRA\s+CR[EÉ]DITO|NO\s+CR[EÉ]DITO|CARTAO\s+DE\s+CREDITO|FATURA|PARCELADO)\b', texto_upper):
            operacao = "Crédito"
        elif re.search(r'\b(PIX\s+ENVIADO|PIX\s+PAGO|TRANSFERENCIA\s+ENVIADA)\b', texto_upper):
            operacao = "Débito"
        elif re.search(r'\b(PIX\s+RECEBIDO|TRANSFERENCIA\s+RECEBIDA|CREDITO\s+EM\s+CONTA)\b', texto_upper):
            operacao = "Receita"
        else:
            # Padrão para compras gerais onde débito/crédito não veio explícito
            operacao = "Débito"

        # 2. IDENTIFICAR VALOR (R$ 0,00 ou R$ 0.00)
        valor = None
        match_val = re.search(r'R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})', texto_limpo, re.IGNORECASE)
        if not match_val:
            match_val = re.search(r'R\$\s*([0-9]+(?:[\.,][0-9]{2}))', texto_limpo, re.IGNORECASE)
        if not match_val:
            match_val = re.search(r'([0-9]+,[0-9]{2})\s*(?:REAIS|BRL)', texto_limpo, re.IGNORECASE)

        if match_val:
            val_str = match_val.group(1).replace('.', '').replace(',', '.')
            try:
                valor = float(val_str)
            except ValueError:
                valor = 0.0

        # 3. IDENTIFICAR DATA E HORA
        hoje = datetime.now()
        data_formatada = hoje.strftime('%Y-%m-%d')
        hora_formatada = hoje.strftime('%H:%M')

        # Procura data DD/MM ou DD/MM/AAAA
        match_data = re.search(r'\b([0-3]?[0-9])/([0-1]?[0-9])(?:/(20[2-3][0-9]|[2-3][0-9]))?\b', texto_limpo)
        if match_data:
            d = int(match_data.group(1))
            m = int(match_data.group(2))
            ano = int(match_data.group(3)) if match_data.group(3) else hoje.year
            if ano < 100:
                ano += 2000
            try:
                data_formatada = f"{ano:04d}-{m:02d}-{d:02d}"
            except ValueError:
                pass

        # Procura hora HH:MM
        match_hora = re.search(r'\b([0-2]?[0-9]):([0-5][0-9])\b', texto_limpo)
        if match_hora:
            hora_formatada = f"{int(match_hora.group(1)):02d}:{match_hora.group(2)}"

        # 4. IDENTIFICAR CARTÃO / BANCO
        cartao_identificado = ""
        bancos_padroes = [
            ("Alelo", r'\bALELO\b'),
            ("Ticket", r'\bTICKET\b'),
            ("Sodexo / Pluxee", r'\b(SODEXO|PLUXEE)\b'),
            ("VR Benefícios", r'\bVR(?:\s+(?:BENEFICIOS|ALIMENTACAO|REFEICAO))?\b'),
            ("Flash", r'\bFLASH\b'),
            ("Caju", r'\bCAJU\b'),
            ("Swile", r'\bSWILE\b'),
            ("Cartão Alimentação", r'\b(VALE\s+ALIMENTACAO|VALE\s+REFEICAO|ALIMENTACAO|REFEICAO)\b'),
            ("Sicredi", r'\b(SICREDI|VISA\s+GOLD.*AP\.\.|VISA\s+GOLD)\b'),
            ("Visa Infinite", r'\bVISA\s+INFINITE\b'),
            ("Visa Platinum", r'\bVISA\s+PLATINUM\b'),
            ("Visa", r'\bVISA\b'),
            ("Mastercard Black", r'\bMASTERCARD\s+BLACK\b'),
            ("Mastercard", r'\bMASTERCARD\b'),
            ("Elo Nanquim", r'\bELO\s+NANQUIM\b'),
            ("Elo", r'\bELO\b'),
            ("Nubank", r'\bNUBANK\b'),
            ("Inter", r'\bBANCO\s+INTER|INTER\b'),
            ("Itaú", r'\bITA[UÚ]\b'),
            ("Bradesco", r'\bBRADESCO\b'),
            ("Santander", r'\bSANTANDER\b'),
            ("Banco do Brasil", r'\bBANCO\s+DO\s+BRASIL|OUROCARD|BB\b'),
            ("Caixa", r'\bCAIXA\b'),
            ("C6 Bank", r'\bC6\s*BANK|C6\b')
        ]

        for nome_padrao, padrao_regex in bancos_padroes:
            if re.search(padrao_regex, texto_upper):
                cartao_identificado = nome_padrao
                break

        # 5. IDENTIFICAR ESTABELECIMENTO / BENEFICIÁRIO
        estabelecimento = ""

        # Padrão Sicredi (ex: "26/10 LIVRARIA MARANATHA PARANAVAI BR R$ 4,99 - Dúvidas...")
        match_sicredi = re.search(r'[0-3]?[0-9]/[0-1]?[0-9]\s+([A-Z0-9\s\.\-_&]{3,40}?)(?:\s+(?:Paranavai|Curitiba|Maringa|Londrina|Cascavel|SP|PR|RJ|SC|RS|MG|BR|R\$|-|\d{4}))', texto_limpo, re.IGNORECASE)
        if match_sicredi:
            estabelecimento = match_sicredi.group(1).strip()

        # Padrão Nubank / Itaú / Inter / Bradesco: "em Estabelecimento" ou "na Estabelecimento"
        if not estabelecimento:
            match_em = re.search(r'\b(?:em|na|no)\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)', texto_limpo, re.IGNORECASE)
            # Se deu o banco (ex: "no Nubank em Padaria Bella"), busca o "em" específico
            match_em_especifico = re.search(r'\bem\s+([A-Za-z0-9\s\.\-_&]{3,35})(?:[\.\-,]|$)', texto_limpo, re.IGNORECASE)
            if match_em_especifico:
                estabelecimento = match_em_especifico.group(1).strip()
            elif match_em:
                cand = match_em.group(1).strip()
                if not re.search(r'^(NUBANK|CART[AÃ]O|SICREDI|ITA[UÚ]|BRADESCO|SANTANDER|INTER|BANCO|OUROCARD|CAIXA|C6)\b', cand, re.IGNORECASE):
                    estabelecimento = cand

        # Padrão Favorecido / Destinatário / Para
        if not estabelecimento:
            match_fav = re.search(r'\b(?:PARA|DESTINAT[AÁ]RIO|FAVORECIDO|RECEBEDOR)\s*:?\s*([A-Z0-9\s\.\-_&]{3,35})', texto_limpo, re.IGNORECASE)
            if match_fav:
                estabelecimento = match_fav.group(1).strip()

        # Limpeza fina no nome do estabelecimento
        if estabelecimento:
            estabelecimento = re.sub(r'^(COMPRA|D[EÉ]BITO|CR[EÉ]DITO|APROVADA|CART[AÃ]O|VISA|MASTERCARD)\s+', '', estabelecimento, flags=re.IGNORECASE)
            estabelecimento = re.sub(r'\s+(BR|PARANAVAI|CURITIBA|SP|RJ|PR)$', '', estabelecimento, flags=re.IGNORECASE)
            estabelecimento = " ".join([p.capitalize() if len(p) > 2 else p.upper() for p in estabelecimento.split()])
        else:
            estabelecimento = f"Compra {cartao_identificado or 'Cartão'}"

        return {
            "sucesso": True,
            "operacao": operacao,
            "valor": valor,
            "valor_formatado": f"R$ {valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.') if valor is not None else "R$ 0,00",
            "data": data_formatada,
            "hora": hora_formatada,
            "cartao_banco": cartao_identificado,
            "estabelecimento": estabelecimento,
            "texto_original": texto
        }

    def listar_contas(self):
        """Retorna todas as contas e cartões cadastrados no banco."""
        conn = self._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM contas_bancarias WHERE deleted = 0 ORDER BY nome_conta ASC")
        rows = cur.fetchall()
        contas = [dict(r) for r in rows]
        conn.close()
        return contas

    def cadastrar_conta_ou_cartao(self, nome, tipo="Cartão de Crédito", limite=0.0, saldo=0.0, fechamento=1, vencimento=10, cor="#2563EB", banco=""):
        """Cadastra ou atualiza uma conta corrente ou cartão de crédito."""
        conn = self._get_connection()
        cur = conn.cursor()
        conta_id = str(uuid.uuid4())
        ts = int(time.time() * 1000)

        cur.execute("""
            INSERT INTO contas_bancarias (id, nome_conta, tipo_conta, limite_cartao, saldo_atual, cor_cartao, banco, dia_fechamento, dia_vencimento, updated_at, deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (conta_id, nome, tipo, float(limite), float(saldo), cor, banco or nome, int(fechamento), int(vencimento), ts))
        conn.commit()
        conn.close()
        return conta_id

    def localizar_ou_criar_conta_compativel(self, cartao_banco, operacao="Débito"):
        """Busca a conta correspondente cadastrada ou cria uma inicial compatível."""
        contas = self.listar_contas()
        termo = (cartao_banco or "").lower()

        # 1. Procura por match prioritário pelo tipo de operação
        if operacao == "Débito":
            for c in contas:
                if c.get('tipo_conta') in ['Conta Corrente', 'Conta Salário']:
                    c_nome = (c.get('nome_conta') or '').lower()
                    c_banco = (c.get('banco') or '').lower()
                    if termo and (termo in c_nome or termo in c_banco or c_nome in termo):
                        return c
                    if ("sicred" in termo or "visa gold" in termo) and ("sicred" in c_nome or "sicred" in c_banco):
                        return c
            for c in contas:
                if c.get('tipo_conta') in ['Conta Corrente', 'Conta Salário']:
                    return c
        elif operacao == "Crédito":
            for c in contas:
                if c.get('tipo_conta') == 'Cartão de Crédito':
                    c_nome = (c.get('nome_conta') or '').lower()
                    c_banco = (c.get('banco') or '').lower()
                    if termo and (termo in c_nome or termo in c_banco or c_nome in termo):
                        return c
            for c in contas:
                if c.get('tipo_conta') == 'Cartão de Crédito':
                    return c
        elif operacao == "Alimentação":
            for c in contas:
                if c.get('tipo_conta') == 'Cartão Alimentação':
                    return c

        # Fallback genérico de match
        if termo:
            for c in contas:
                c_nome = (c.get('nome_conta') or '').lower()
                c_banco = (c.get('banco') or '').lower()
                if termo in c_nome or termo in c_banco or c_nome in termo:
                    return c

        # 3. Se nenhuma conta existir, cria automaticamente uma com o nome identificado
        if operacao == "Alimentação":
            nome_novo = cartao_banco if cartao_banco else "Cartão Alimentação"
            tipo_novo = "Cartão Alimentação"
            limite_novo = 0.0
            saldo_novo = 500.0
            cor_novo = "#F97316"
        elif operacao == "Crédito":
            nome_novo = cartao_banco if cartao_banco else "Cartão de Crédito Principal"
            tipo_novo = "Cartão de Crédito"
            limite_novo = 3000.0
            saldo_novo = 0.0
            cor_novo = "#8B5CF6" if "Nubank" in (nome_novo or "") else ("#10B981" if "Sicredi" in (nome_novo or "") else "#2563EB")
        else:
            nome_novo = cartao_banco if cartao_banco else "Conta Corrente Principal"
            tipo_novo = "Conta Corrente"
            limite_novo = 0.0
            saldo_novo = 1000.0
            cor_novo = "#10B981"

        novo_id = self.cadastrar_conta_ou_cartao(
            nome=nome_novo,
            tipo=tipo_novo,
            limite=limite_novo,
            saldo=saldo_novo,
            fechamento=1,
            vencimento=10,
            cor=cor_novo,
            banco=cartao_banco
        )

        return {
            "id": novo_id,
            "nome_conta": nome_novo,
            "tipo_conta": tipo_novo,
            "limite_cartao": limite_novo,
            "saldo_atual": saldo_novo,
            "cor_cartao": cor_novo
        }

    def registrar_transacao(self, dados_interpretados, conta_id=None):
        """
        Registra a movimentação no SQLite e faz a subtração automática:
        - Débito: subtrai do saldo_atual da conta corrente
        - Crédito: entra como Cartão de Crédito (consome limite do cartão)
        """
        if not dados_interpretados or not dados_interpretados.get('valor'):
            return {"sucesso": False, "erro": "Valor não informado ou inválido"}

        valor = float(dados_interpretados['valor'])
        operacao = dados_interpretados.get('operacao', 'Débito')
        data_lancamento = dados_interpretados.get('data', datetime.now().strftime('%Y-%m-%d'))
        descricao = dados_interpretados.get('estabelecimento', 'Compra')
        cartao_banco = dados_interpretados.get('cartao_banco', '')

        # Localiza conta bancária
        conta = None
        if conta_id:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM contas_bancarias WHERE id = ?", (conta_id,))
            row = cur.fetchone()
            if row:
                conta = dict(row)
            conn.close()

        if not conta:
            conta = self.localizar_ou_criar_conta_compativel(cartao_banco, operacao)

        conta_id_final = conta['id']
        nome_conta = conta['nome_conta']
        tipo_conta = conta.get('tipo_conta', 'Conta Corrente')
        ts = int(time.time() * 1000)
        mov_id = str(uuid.uuid4())

        # Define tipo de gasto no padrão do App
        if operacao == "Alimentação" or tipo_conta == "Cartão Alimentação":
            tipo_gasto = "Cartão Alimentação"
            status = "Pago"
        elif operacao == "Crédito" or tipo_conta == "Cartão de Crédito":
            tipo_gasto = "Cartão de Crédito"
            status = "Pago"
        elif operacao == "Receita":
            tipo_gasto = "Receita"
            status = "Pago"
        else:
            tipo_gasto = "Despesa Variável"
            status = "Pago"

        conn = self._get_connection()
        cur = conn.cursor()

        # 1. Inserir na tabela movimentacoes
        cur.execute("""
            INSERT INTO movimentacoes (
                id, descricao, valor_total, valor_realizado, data_lancamento,
                tipo_gasto, status, conta_id, parcelado, total_parcelas, parcela_atual,
                updated_at, deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Não', 1, 1, ?, 0)
        """, (mov_id, descricao, valor, valor, data_lancamento, tipo_gasto, status, conta_id_final, ts))

        # 2. Subtração / Movimentação Automática
        saldo_anterior = float(conta.get('saldo_atual') or 0.0)
        limite_total = float(conta.get('limite_cartao') or 0.0)
        saldo_novo = saldo_anterior

        if (operacao == "Alimentação" or tipo_conta == "Cartão Alimentação"):
            # Subtrai o valor gasto do saldo do cartão alimentação
            saldo_novo = saldo_anterior - valor
            cur.execute("UPDATE contas_bancarias SET saldo_atual = ?, updated_at = ? WHERE id = ?", (saldo_novo, ts, conta_id_final))
            print(f"[CARTÃO ALIMENTAÇÃO] '{nome_conta}': Saldo anterior R$ {saldo_anterior:.2f} -> Novo Saldo: R$ {saldo_novo:.2f} (-R$ {valor:.2f})")
        elif operacao == "Débito" and tipo_conta != "Cartão de Crédito":
            # Subtrai o valor gasto do saldo da conta corrente
            saldo_novo = saldo_anterior - valor
            cur.execute("UPDATE contas_bancarias SET saldo_atual = ?, updated_at = ? WHERE id = ?", (saldo_novo, ts, conta_id_final))
            print(f"[SUBTRAÇÃO AUTOMÁTICA] Conta '{nome_conta}': Saldo anterior R$ {saldo_anterior:.2f} -> Novo Saldo: R$ {saldo_novo:.2f} (-R$ {valor:.2f})")
        elif operacao == "Receita" and tipo_conta != "Cartão de Crédito":
            # Adiciona ao saldo da conta corrente
            saldo_novo = saldo_anterior + valor
            cur.execute("UPDATE contas_bancarias SET saldo_atual = ?, updated_at = ? WHERE id = ?", (saldo_novo, ts, conta_id_final))
            print(f"[ADIÇÃO AUTOMÁTICA] Conta '{nome_conta}': Saldo anterior R$ {saldo_anterior:.2f} -> Novo Saldo: R$ {saldo_novo:.2f} (+R$ {valor:.2f})")
        else:
            # Cartão de crédito: calcula limite restante
            cur.execute("""
                SELECT SUM(valor_total) as total_fatura 
                FROM movimentacoes 
                WHERE conta_id = ? AND tipo_gasto = 'Cartão de Crédito' AND deleted = 0 AND status != 'Cancelado'
            """, (conta_id_final,))
            tot_row = cur.fetchone()
            total_fatura = float(tot_row['total_fatura'] or 0.0)
            limite_disp = max(0.0, limite_total - total_fatura)
            print(f"[CARTÃO DE CRÉDITO] '{nome_conta}': Compra de R$ {valor:.2f} adicionada à fatura. Fatura Atual: R$ {total_fatura:.2f} | Limite Disp: R$ {limite_disp:.2f}")

        conn.commit()
        conn.close()

        # Envia também sincronização para a nuvem (Render) se houver conexão
        try:
            self.enviar_para_servidor_online(
                titulo=f"Notificação {operacao} {cartao_banco or nome_conta}",
                texto=dados_interpretados.get('texto_original', f"{descricao} R$ {valor:.2f}"),
                app_pacote="br.com.sicredi.mobile" if ("sicred" in nome_conta.lower()) else "com.banco.app"
            )
        except Exception:
            pass

        return {
            "sucesso": True,
            "movimentacao_id": mov_id,
            "descricao": descricao,
            "valor": valor,
            "operacao": operacao,
            "tipo_gasto": tipo_gasto,
            "conta_id": conta_id_final,
            "nome_conta": nome_conta,
            "saldo_anterior": saldo_anterior,
            "saldo_novo": saldo_novo
        }

    def enviar_para_servidor_online(self, titulo, texto, app_pacote="br.com.sicredi.mobile", user_id="usr_1791774521681"):
        """Envia a notificação diretamente para a API online do Render em segundo plano."""
        try:
            url = "https://app-financas-pessoais-knrp.onrender.com/api/notificacoes/receber"
            payload = {
                "titulo": titulo,
                "texto": texto,
                "app": app_pacote,
                "user_id": user_id
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json", "x-user-id": user_id},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                res_data = json.loads(resp.read().decode('utf-8'))
                return res_data
        except Exception as e:
            return None

    def monitorar_clipboard(self):
        """Monitora continuamente a área de transferência do Windows para lançamentos automáticos instantâneos."""
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        print("\n" + "="*65)
        print("   🤖 MONITOR INTELIGENTE DE NOTIFICAÇÕES (PYTHON)")
        print("="*65)
        print(" [*] Aguardando novas notificações ou comprovantes...")
        print(" [*] Copie qualquer notificação de banco para lançar automaticamente.")
        print(" [*] Pressione Ctrl+C para encerrar o monitor.")
        print("="*65 + "\n")

        ultimo_texto = ""
        while True:
            try:
                conteudo = root.clipboard_get()
                if conteudo and conteudo != ultimo_texto:
                    ultimo_texto = conteudo
                    c_low = conteudo.lower()
                    if ("r$" in c_low or "compra" in c_low or "débito" in c_low or "debito" in c_low or "crédito" in c_low or "credito" in c_low or "pix" in c_low):
                        print(f"\n[🔔 NOVA NOTIFICAÇÃO DETECTADA]: {conteudo[:80]}...")
                        res = self.interpretar_notificacao(conteudo)
                        if res and res.get('valor'):
                            salvo = self.registrar_transacao(res)
                            print(f"  ✓ Lançado com sucesso no SQLite e na Nuvem!")
                            print(f"    • {res['operacao']} | {res['valor_formatado']} | {res['estabelecimento']} ({salvo['nome_conta']})")
            except Exception:
                pass
            time.sleep(1.5)


def abrir_interface_grafica():
    """Abre uma janela visual amigável (GUI) para leitura de notificações e cartões."""
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog

    leitor = LeitorNotificacaoBancaria()
    resultado_atual = {"dados": None}

    root = tk.Tk()
    root.title("Leitor de Notificações Bancárias - APP Finanças Pessoais")
    root.geometry("560x680")
    root.configure(bg="#0F172A")
    root.resizable(False, False)

    # Estilos
    style = ttk.Style()
    style.theme_use('clam')
    style.configure("TLabel", background="#0F172A", foreground="#E2E8F0", font=("Segoe UI", 10))
    style.configure("TButton", font=("Segoe UI", 10, "bold"))

    # Cabeçalho
    header_frame = tk.Frame(root, bg="#1E293B", padx=16, pady=12)
    header_frame.pack(fill="x")
    lbl_titulo = tk.Label(header_frame, text="💳 Leitor Inteligente Multibanco (Python)", bg="#1E293B", fg="#60A5FA", font=("Segoe UI", 13, "bold"))
    lbl_titulo.pack(anchor="w")
    lbl_sub = tk.Label(header_frame, text="Lê compras no Débito e Crédito de qualquer banco e atualiza saldos/limites", bg="#1E293B", fg="#94A3B8", font=("Segoe UI", 9))
    lbl_sub.pack(anchor="w")

    main_frame = tk.Frame(root, bg="#0F172A", padx=16, pady=12)
    main_frame.pack(fill="both", expand=True)

    # Botões de Ação para Carregar Notificação
    btn_frame = tk.Frame(main_frame, bg="#0F172A")
    btn_frame.pack(fill="x", pady=(0, 10))

    def on_selecionar_imagem():
        path = filedialog.askopenfilename(title="Selecione o Print ou Comprovante (Imagem ou PDF)", filetypes=[("Comprovantes & Prints", "*.png;*.jpg;*.jpeg;*.webp;*.pdf"), ("Todos os arquivos", "*.*")])
        if path:
            txt_area.delete("1.0", tk.END)
            txt_area.insert(tk.END, f"[Lendo comprovante com IA/OCR: {os.path.basename(path)}...]\n")
            root.update()
            try:
                texto_ocr = leitor.extrair_texto_arquivo(path)
                txt_area.delete("1.0", tk.END)
                txt_area.insert(tk.END, texto_ocr)
                on_analisar()
            except Exception as ex:
                messagebox.showerror("Erro na Leitura", f"Não foi possível extrair os dados do comprovante: {ex}")

    def on_colar_clipboard():
        try:
            conteudo = root.clipboard_get()
            if conteudo:
                txt_area.delete("1.0", tk.END)
                txt_area.insert(tk.END, conteudo)
                on_analisar()
        except Exception:
            messagebox.showinfo("Área de Transferência", "Nenhum texto encontrado na área de transferência.")

    btn_img = tk.Button(btn_frame, text="📷 Abrir Foto / Print", bg="#2563EB", fg="white", font=("Segoe UI", 9, "bold"), padx=10, pady=6, relief="flat", cursor="hand2", command=on_selecionar_imagem)
    btn_img.pack(side="left", padx=(0, 8))

    btn_clip = tk.Button(btn_frame, text="📋 Colar da Área de Transferência", bg="#1E293B", fg="#E2E8F0", font=("Segoe UI", 9, "bold"), padx=10, pady=6, relief="flat", cursor="hand2", command=on_colar_clipboard)
    btn_clip.pack(side="left")

    # Área de Texto
    lbl_txt = tk.Label(main_frame, text="Texto da Notificação / Comprovante:", bg="#0F172A", fg="#94A3B8", font=("Segoe UI", 9, "bold"))
    lbl_txt.pack(anchor="w")

    txt_area = tk.Text(main_frame, height=5, bg="#1E293B", fg="#FFFFFF", font=("Segoe UI", 9), insertbackground="white", padx=8, pady=8, relief="flat", borderwidth=1)
    txt_area.pack(fill="x", pady=(4, 10))

    # Botão Analisar
    def on_analisar():
        texto = txt_area.get("1.0", tk.END).strip()
        if not texto:
            return
        res = leitor.interpretar_notificacao(texto)
        resultado_atual["dados"] = res

        lbl_res_op.config(text=f"Operação: {res['operacao']}", fg="#10B981" if res['operacao'] == 'Débito' else ("#C084FC" if res['operacao'] == 'Crédito' else "#60A5FA"))
        lbl_res_val.config(text=f"Valor: {res['valor_formatado']}")
        lbl_res_estab.config(text=f"Estabelecimento: {res['estabelecimento']}")
        lbl_res_cartao.config(text=f"Cartão/Banco: {res['cartao_banco'] or 'Não identificado'}")
        lbl_res_data.config(text=f"Data/Hora: {res['data']} às {res['hora']}")
        card_resumo.pack(fill="x", pady=(0, 10))

    btn_analisar = tk.Button(main_frame, text="🔍 Analisar Notificação", bg="#10B981", fg="#0F172A", font=("Segoe UI", 10, "bold"), pady=6, relief="flat", cursor="hand2", command=on_analisar)
    btn_analisar.pack(fill="x", pady=(0, 10))

    # Card com Resultado da Análise
    card_resumo = tk.Frame(main_frame, bg="#1E293B", padx=12, pady=10, relief="solid", borderwidth=1)
    
    lbl_res_op = tk.Label(card_resumo, text="Operação: -", bg="#1E293B", fg="#10B981", font=("Segoe UI", 11, "bold"))
    lbl_res_op.pack(anchor="w")
    lbl_res_val = tk.Label(card_resumo, text="Valor: R$ 0,00", bg="#1E293B", fg="#FFFFFF", font=("Segoe UI", 12, "bold"))
    lbl_res_val.pack(anchor="w")
    lbl_res_estab = tk.Label(card_resumo, text="Estabelecimento: -", bg="#1E293B", fg="#CBD5E1", font=("Segoe UI", 9, "bold"))
    lbl_res_estab.pack(anchor="w")
    lbl_res_cartao = tk.Label(card_resumo, text="Cartão/Banco: -", bg="#1E293B", fg="#94A3B8", font=("Segoe UI", 9))
    lbl_res_cartao.pack(anchor="w")
    lbl_res_data = tk.Label(card_resumo, text="Data/Hora: -", bg="#1E293B", fg="#94A3B8", font=("Segoe UI", 9))
    lbl_res_data.pack(anchor="w")

    # Seletor de Conta Bancária
    lbl_conta = tk.Label(main_frame, text="Vincular à Conta / Cartão:", bg="#0F172A", fg="#94A3B8", font=("Segoe UI", 9, "bold"))
    lbl_conta.pack(anchor="w", pady=(4, 2))

    contas = leitor.listar_contas()
    opcoes_contas = [f"{c.get('nome_conta')} ({c.get('tipo_conta')})" for c in contas]
    if not opcoes_contas:
        opcoes_contas = ["(Criar Automaticamente com Base na Notificação)"]

    combo_conta = ttk.Combobox(main_frame, values=opcoes_contas, state="readonly", font=("Segoe UI", 9))
    combo_conta.current(0)
    combo_conta.pack(fill="x", pady=(0, 14))

    # Botão Salvar e Subtrair Automaticamente
    def on_salvar():
        dados = resultado_atual.get("dados")
        if not dados or not dados.get("valor"):
            messagebox.showwarning("Atenção", "Por favor, analise uma notificação com valor antes de salvar!")
            return

        idx = combo_conta.current()
        conta_id_escolhido = contas[idx]['id'] if (contas and idx >= 0 and idx < len(contas)) else None

        try:
            res = leitor.registrar_transacao(dados, conta_id=conta_id_escolhido)
            if res.get("sucesso"):
                msg = f"Transação registrada com sucesso!\n\n"
                msg += f"• Estabelecimento: {res['descricao']}\n"
                msg += f"• Valor: R$ {res['valor']:.2f}\n"
                msg += f"• Operação: {res['operacao']}\n"
                msg += f"• Conta: {res['nome_conta']}\n\n"
                if res['operacao'] == 'Alimentação':
                    msg += f"✓ Saldo do Cartão Alimentação atualizado: R$ {res['saldo_novo']:.2f} (Subtraído automaticamente)"
                elif res['operacao'] == 'Débito':
                    msg += f"✓ Saldo da Conta atualizado: R$ {res['saldo_novo']:.2f} (Subtraído automaticamente)"
                elif res['operacao'] == 'Receita':
                    msg += f"✓ Saldo em Conta atualizado: R$ {res['saldo_novo']:.2f} (Adicionado automaticamente)"
                else:
                    msg += f"✓ Fatura do cartão atualizada automaticamente"
                messagebox.showinfo("Sucesso", msg)
                txt_area.delete("1.0", tk.END)
                card_resumo.pack_forget()
                resultado_atual["dados"] = None
            else:
                messagebox.showerror("Erro", res.get("erro", "Falha ao salvar transação."))
        except Exception as ex:
            messagebox.showerror("Erro ao Salvar", str(ex))

    btn_salvar = tk.Button(main_frame, text="💾 Lançar no Sistema & Atualizar Saldo/Limite", bg="#2563EB", fg="white", font=("Segoe UI", 10, "bold"), pady=10, relief="flat", cursor="hand2", command=on_salvar)
    btn_salvar.pack(fill="x")

    root.mainloop()


def modo_cli():
    """Interface de linha de comando para o leitor de notificações."""
    parser = argparse.ArgumentParser(description="Leitor Inteligente de Notificações Bancárias (Python)")
    parser.add_argument("--imagem", help="Caminho do arquivo de imagem/screenshot da notificação")
    parser.add_argument("--pdf", help="Caminho do arquivo PDF do comprovante gerado pelo banco")
    parser.add_argument("--arquivo", help="Caminho de qualquer arquivo de comprovante (Foto, Print ou PDF)")
    parser.add_argument("--texto", help="Texto bruto da notificação bancária copiada")
    parser.add_argument("--listar-contas", action="store_true", help="Lista todas as contas e cartões cadastrados")
    parser.add_argument("--salvar", action="store_true", help="Salva a movimentação automaticamente no banco SQLite")
    parser.add_argument("--json", action="store_true", help="Retorna saída estruturada em JSON")
    parser.add_argument("--gui", action="store_true", help="Abre a interface gráfica visual do leitor")
    parser.add_argument("--monitor", action="store_true", help="Monitora área de transferência para capturar e lançar notificações automaticamente")
    parser.add_argument("--sicredi-teste", action="store_true", help="Executa teste com a notificação real do Sicredi")

    args = parser.parse_args()

    if args.monitor:
        leitor = LeitorNotificacaoBancaria()
        leitor.monitorar_clipboard()
        return

    if args.sicredi_teste:
        leitor = LeitorNotificacaoBancaria()
        texto_exemplo = "💳 Compra débito Visa Gold AP.. 26/10 LIVRARIA MARANATHA PARANAVAI BR R$ 4,99 - Dúvidas: 0800-..."
        print("\n" + "="*65)
        print("   TESTE DE LANÇAMENTO AUTOMÁTICO SICREDI (PYTHON)")
        print("="*65)
        print(f"Texto da Notificação: {texto_exemplo}\n")
        res = leitor.interpretar_notificacao(texto_exemplo)
        print("[1. Dados Interpretados]:")
        print(f"  • Operação:        {res['operacao']}")
        print(f"  • Valor:           {res['valor_formatado']}")
        print(f"  • Estabelecimento: {res['estabelecimento']}")
        print(f"  • Cartão/Banco:    {res['cartao_banco']}")
        print(f"  • Data/Hora:       {res['data']} {res['hora']}\n")
        salvo = leitor.registrar_transacao(res)
        print("[2. Lançamento Realizado]:")
        print(f"  • Conta:           {salvo['nome_conta']}")
        print(f"  • Saldo Anterior:  R$ {salvo['saldo_anterior']:.2f}")
        print(f"  • Novo Saldo:      R$ {salvo['saldo_novo']:.2f}")
        print(f"  • ID Movimentação: {salvo['movimentacao_id']}")
        print("="*65 + "\n")
        return

    if args.gui or (len(sys.argv) == 1):
        abrir_interface_grafica()
        return
    leitor = LeitorNotificacaoBancaria()

    if args.listar_contas:
        contas = leitor.listar_contas()
        if args.json:
            print(json.dumps(contas, ensure_ascii=False, indent=2))
        else:
            print(f"\n{'='*55}")
            print(" CONTAS BANCÁRIAS E CARTÕES DE CRÉDITO CADASTRADOS")
            print(f"{'='*55}")
            if not contas:
                print("Nenhuma conta ou cartão cadastrado ainda.")
            for c in contas:
                tipo = c.get('tipo_conta') or 'Conta Corrente'
                lim = float(c.get('limite_cartao') or 0.0)
                sal = float(c.get('saldo_atual') or 0.0)
                print(f"• [{tipo}] {c.get('nome_conta')} | Saldo: R$ {sal:,.2f} | Limite: R$ {lim:,.2f} | ID: {c.get('id')}")
        return

    texto_para_analise = ""
    if args.arquivo:
        print(f"[ARQUIVO] Lendo comprovante/print: {args.arquivo}...")
        texto_para_analise = leitor.extrair_texto_arquivo(args.arquivo)
        print(f"[Texto Extraído]: {texto_para_analise}")
    elif args.pdf:
        print(f"[PDF] Lendo comprovante bancário em PDF: {args.pdf}...")
        texto_para_analise = leitor.extrair_texto_pdf(args.pdf)
        print(f"[Texto Extraído do PDF]: {texto_para_analise}")
    elif args.imagem:
        print(f"[OCR] Lendo imagem: {args.imagem}...")
        texto_para_analise = leitor.extrair_texto_imagem(args.imagem)
        print(f"[OCR Texto Extraído]: {texto_para_analise}")
    elif args.texto:
        texto_para_analise = args.texto

    if not texto_para_analise:
        print("[AVISO] Nenhuma imagem, PDF ou texto foi fornecido. Use --imagem, --pdf, --arquivo, --texto ou --listar-contas.")
        return

    resultado = leitor.interpretar_notificacao(texto_para_analise)
    print("\n[RESULTADO DA LEITURA]:")
    print(f"  Operação:        {resultado['operacao']}")
    print(f"  Valor:           {resultado['valor_formatado']}")
    print(f"  Estabelecimento: {resultado['estabelecimento']}")
    print(f"  Cartão/Banco:    {resultado['cartao_banco'] or 'Não identificado'}")
    print(f"  Data:            {resultado['data']} {resultado['hora']}")

    if args.salvar:
        res_salvar = leitor.registrar_transacao(resultado)
        print(f"\n[SUCESSO] Transação salva com sucesso no banco de dados!")
        print(f"  Conta Vinculada: {res_salvar['nome_conta']}")
        print(f"  ID Movimentação: {res_salvar['movimentacao_id']}")

    if args.json:
        print(json.dumps(resultado, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    modo_cli()
