@echo off
title Publicar e Atualizar APP Finanças Pessoais
chcp 65001 > nul
cd /d "%~dp0"
color 0A

echo ================================================================
echo    PUBLICAR ATUALIZAÇÃO AUTOMÁTICA - APP FINANÇAS PESSOAIS
echo ================================================================
echo.

:: 1. Incrementa versão para disparar notificação no celular e computador
echo [*] Incrementando versão do aplicativo...
node increment_version.js

:: 2. Configura remote do repositório no GitHub se necessário
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [*] Configurando conexao com o GitHub carlaoapp/app-financas-pessoais...
    git remote add origin https://github.com/carlaoapp/app-financas-pessoais.git
)

:: 3. Adiciona todos os arquivos
echo [*] Mapeando arquivos atualizados...
git add -A

:: 4. Grava commit com data e hora
set "DATA_HORA=%date% as %time:~0,5%"
echo [*] Gravando alteracoes no Git (%DATA_HORA%)...
git commit -m "Auto-Deploy: Versao atualizada em %DATA_HORA%"

:: 5. Envia para o GitHub na nuvem
echo.
echo [*] Enviando para o GitHub na nuvem...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo   [SUCESSO TOTAL!]
    echo   1. Arquivos enviados para o GitHub!
    echo   2. O Render ja detectou o envio e esta atualizando o site na nuvem!
    echo   3. Todos os celulares e computadores com o app aberto receberao
    echo      a mensagem: "Nova Versao Disponivel! [Atualizar App Agora]"
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   [PRIMEIRO ENVIO OU REPOSITORIO AINDA NAO CRIADO NO GITHUB]
    echo.
    echo   Se o repositorio ainda nao foi criado na sua conta do GitHub:
    echo   1. Estamos abrindo o GitHub no seu navegador agora...
    echo   2. Basta clicar no botao verde "Create repository" (sem alterar nada).
    echo ================================================================
    start "" "https://github.com/new?name=app-financas-pessoais"
    echo.
    echo Apois clicar em "Create repository", aperte qualquer tecla aqui para tentar o envio novamente:
    pause
    echo [*] Tentando envio novamente...
    git push -u origin main
)

echo.
pause
