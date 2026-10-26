# -*- coding: utf-8 -*-
"""
automacao_bancaria_python.py - Sistema de Automação Inteligente e Integração Bancária em Python
Permite a leitura direta de comprovantes (fotos, prints, PDFs) e monitoramento de notificações bancárias.
Totalmente integrado ao banco de dados SQLite local e à API de nuvem do APP Finanças Pessoais.
"""

import os
import sys
import argparse
from leitor_notificacoes import LeitorNotificacaoBancaria, abrir_interface_grafica

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def main():
    parser = argparse.ArgumentParser(description="Automação Bancária Inteligente em Python")
    parser.add_argument("--monitor", action="store_true", help="Inicia o monitor automático de notificações da área de transferência")
    parser.add_argument("--imagem", help="Caminho do print ou foto do comprovante para leitura com OCR")
    parser.add_argument("--texto", help="Texto bruto da notificação bancária para leitura e lançamento")
    parser.add_argument("--sicredi-teste", action="store_true", help="Executa o teste de leitura com a notificação do Sicredi")
    parser.add_argument("--gui", action="store_true", help="Abre a tela visual moderna do leitor de comprovantes")

    args = parser.parse_args()
    leitor = LeitorNotificacaoBancaria()

    if args.sicredi_teste:
        texto_exemplo = "💳 Compra débito Visa Gold AP.. 26/10 LIVRARIA MARANATHA PARANAVAI BR R$ 4,99 - Dúvidas: 0800-..."
        print("\n" + "="*65)
        print("   TESTE DE LEITURA & LANÇAMENTO AUTOMÁTICO SICREDI")
        print("="*65)
        res = leitor.interpretar_notificacao(texto_exemplo)
        print(f"• Operação:        {res['operacao']}")
        print(f"• Valor:           {res['valor_formatado']}")
        print(f"• Estabelecimento: {res['estabelecimento']}")
        print(f"• Cartão/Banco:    {res['cartao_banco']}")
        print(f"• Data/Hora:       {res['data']} às {res['hora']}")
        salvo = leitor.registrar_transacao(res)
        print(f"\n✓ Lançado na Conta '{salvo['nome_conta']}'")
        print(f"✓ Saldo anterior: R$ {salvo['saldo_anterior']:.2f} -> Novo Saldo: R$ {salvo['saldo_novo']:.2f}")
        print("="*65 + "\n")
        return

    if args.monitor:
        leitor.monitorar_clipboard()
        return

    if args.imagem:
        print(f"[OCR] Processando imagem do comprovante: {args.imagem}...")
        txt = leitor.extrair_texto_imagem(args.imagem)
        print(f"[Texto Extraído]: {txt}")
        res = leitor.interpretar_notificacao(txt)
        if res and res.get('valor'):
            salvo = leitor.registrar_transacao(res)
            print(f"[SUCESSO] Lançado com sucesso: {res['operacao']} {res['valor_formatado']} em {res['estabelecimento']} ({salvo['nome_conta']})")
        else:
            print("[AVISO] Não foi possível identificar valores na imagem.")
        return

    if args.texto:
        res = leitor.interpretar_notificacao(args.texto)
        if res and res.get('valor'):
            salvo = leitor.registrar_transacao(res)
            print(f"[SUCESSO] Lançado com sucesso: {res['operacao']} {res['valor_formatado']} em {res['estabelecimento']} ({salvo['nome_conta']})")
        return

    # Padrão: Abre a interface gráfica
    abrir_interface_grafica()

if __name__ == '__main__':
    main()
