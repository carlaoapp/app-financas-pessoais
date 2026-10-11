@echo off
chcp 65001 > nul
title APP Finanças Pessoais - Computador & Mobbi

echo ========================================================
echo        APP FINANÇAS PESSOAIS - COMPUTADOR & MOBBI       
echo ========================================================
echo.

cd /d "%~dp0"

if not exist "node_modules\" (
    echo [INFO] Instalando dependências pela primeira vez...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependências. Verifique se o Node.js está instalado.
        pause
        exit /b 1
    )
)

echo [INFO] Abrindo APP Finanças Pessoais no seu navegador...
start "" "http://localhost:3000"

echo [INFO] Iniciando o servidor...
node server.js

pause
