@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SH Airsoft Kommando - Team Panel

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte von https://nodejs.org installieren ^(LTS^) und diese Datei erneut starten.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Erster Start: Abhaengigkeiten werden installiert ^(ca. 1-3 Minuten, Internet noetig^) ...
  call npm install
  if errorlevel 1 (
    echo Installation fehlgeschlagen.
    pause
    exit /b 1
  )
)

node scripts\local.mjs
echo.
echo Das Panel wurde beendet.
pause
