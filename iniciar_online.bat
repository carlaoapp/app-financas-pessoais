@echo off
title APP Finanças Pessoais - Link Online (Computador & Mobbi)
chcp 65001 > nul
cd /d "%~dp0"
color 0B

echo ================================================================
echo    APP FINANÇAS PESSOAIS - INICIALIZADOR COM LINK ONLINE
echo ================================================================
echo.

node start_online.js
pause
