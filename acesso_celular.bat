@echo off
title Acesso Celular - APP Finanças Pessoais
chcp 65001 > nul
cd /d "%~dp0"
color 0B

echo ================================================================
echo       ACESSO PELO CELULAR (REDE WI-FI LOCAL)
echo ================================================================
echo.

for /f "tokens=4" %%a in ('route print^|find " 0.0.0.0"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)

:found_ip
echo [*] Conecte seu celular na MESMA rede Wi-Fi deste computador.
echo.
echo [*] Abra o navegador do celular (Chrome ou Safari) e digite:
echo.
echo    👉  http://%LOCAL_IP%:3000
echo.
echo [*] No celular, toque em "Instalar aplicativo" ou "Adicionar a tela de inicio"
echo     para ter o APP Finanças Pessoais como aplicativo nativo (Mobbi)!
echo.
echo ================================================================
echo.
pause
