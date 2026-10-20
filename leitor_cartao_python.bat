@echo off
chcp 65001 > nul
title Leitor de Notificações Bancárias & Cartões (Python)
cd /d "%~dp0"

echo ========================================================
echo   LEITOR INTELIGENTE DE NOTIFICAÇÕES BANCÁRIAS (PYTHON)  
echo ========================================================
echo.
echo Iniciando leitor com suporte a Débito e Crédito...
python leitor_notificacoes.py --gui
