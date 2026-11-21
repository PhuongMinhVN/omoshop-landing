@echo off
chcp 65001 >nul
title PMVN Sales Landing Page - omoshop.live (Port 3088)
cd /d "%~dp0"

set "PORT=3088"
set "HOSTNAME=::"

echo ====================================================================
echo       PHUONG MINH SOFTWARE PMS - LANDING PAGE (omoshop.live)
echo                   Chay doc lap tren cong %PORT%
echo ====================================================================
echo.

:LOOP
node server.mjs
echo [!] May chu tam ngung, tu khoi dong lai sau 3 giay...
timeout /t 3 /nobreak >nul
goto LOOP
