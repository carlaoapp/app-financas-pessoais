@echo off
title Enviar para o GitHub - APP Finanças Pessoais
chcp 65001 > nul
cd /d "%~dp0"
color 0A

echo ================================================================
echo       ENVIAR APP FINANÇAS PESSOAIS PARA O GITHUB
echo ================================================================
echo.

:: 1. Verifica se o Git foi inicializado nesta pasta
if not exist ".git\" (
    echo [*] Primeira configuracao detectada!
    echo.
    echo Por favor, crie primeiro o repositorio no seu GitHub (ex: app-financas-pessoais)
    echo em: https://github.com/new (deixe como Publico ou Privado, sem README).
    echo.
    set /p REPO_URL="Cole o link do seu repositorio GitHub (ou aperte ENTER para usar https://github.com/carlaoapp/app-financas-pessoais.git): "
    
    if "%REPO_URL%"=="" (
        set "REPO_URL=https://github.com/carlaoapp/app-financas-pessoais.git"
    )
    
    echo [*] Inicializando Git e conectando a %REPO_URL%...
    git init
    git branch -M main
    git remote add origin %REPO_URL%
    echo [+] Conexao com o GitHub configurada!
    echo.
)

:: 2. Identifica e adiciona todos os arquivos
echo [*] Mapeando arquivos do projeto...
git add -A

:: 3. Verifica se ha alteracoes para enviar
git status --porcelain > "%temp%\git_status_financas.txt"
set /p TEM_ALTERACOES=<"%temp%\git_status_financas.txt"

if "%TEM_ALTERACOES%"=="" (
    echo.
    echo ================================================================
    echo   TUDO ATUALIZADO! Nao ha nenhum arquivo modificado para subir.
    echo   Seu GitHub ja esta 100%% em dia com o seu computador!
    echo ================================================================
    echo.
    pause
    exit /b 0
)

:: 4. Cria o commit com data e hora
set "DATA_HORA=%date% as %time:~0,5%"
echo [*] Gravando alteracoes: %DATA_HORA%...
git commit -m "Atualizacao APP Financas Pessoais: %DATA_HORA%"

:: 5. Envia para o GitHub na branch main
echo [*] Enviando arquivos para o GitHub na nuvem...
echo.
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ================================================================
    echo   [SUCESSO TOTAL!]
    echo   Todos os arquivos foram enviados para o GitHub com sucesso!
    echo   O Render ira atualizar o site automaticamente em minutos.
    echo ================================================================
) else (
    echo ================================================================
    echo   [AUTENTICACAO OU REPOSITORIO NOVO]
    echo   Se for a primeira vez, certifique-se de ter criado o repositorio
    echo   vazio no GitHub com o mesmo nome e autorize o login no navegador.
    echo ================================================================
)

echo.
pause
