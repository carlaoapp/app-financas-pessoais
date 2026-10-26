@echo off
chcp 65001 > nul
title Automação Bancária Inteligente em Python - APP Finanças Pessoais
cd /d "%~dp0"
color 0B

echo =================================================================
echo   AUTOMAÇÃO BANCÁRIA INTELIGENTE EM PYTHON (PAYTON)
echo =================================================================
echo.
echo  [1] Abrir Leitor Visual de Prints e Comprovantes (Janela GUI)
echo  [2] Iniciar Monitor Automático de Notificações em Tempo Real
echo  [3] Executar Teste com a Notificação do Sicredi (Livraria Maranatha)
echo  [4] Sair
echo.
echo =================================================================
set /p opcao="Escolha uma opção [1-4] (Padrão: 1): "

if "%opcao%"=="2" goto monitor
if "%opcao%"=="3" goto teste
if "%opcao%"=="4" goto fim

:gui
echo.
echo [*] Abrindo interface gráfica do Leitor Python...
python automacao_bancaria_python.py --gui
goto fim

:monitor
echo.
echo [*] Iniciando Monitor Inteligente de Notificações e Clipboard...
python automacao_bancaria_python.py --monitor
pause
goto fim

:teste
echo.
echo [*] Executando teste automatizado do Sicredi...
python automacao_bancaria_python.py --sicredi-teste
pause
goto fim

:fim
