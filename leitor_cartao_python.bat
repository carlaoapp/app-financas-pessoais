@echo off
chcp 65001 > nul
title Leitor Inteligente de Prints, Comprovantes & Notificações (Python)
cd /d "%~dp0"

echo ========================================================
echo   LEITOR INTELIGENTE DE PRINTS E COMPROVANTES (PYTHON)   
echo ========================================================
echo.
echo Iniciando leitor com suporte a Fotos, Prints, PDFs e Textos...
python leitor_notificacoes.py --gui
