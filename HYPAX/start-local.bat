@echo off
REM HelferNet lokal starten (Windows) - ohne Docker. Benoetigt nur Node.js 20 oder neuer.
REM   start-local.bat            mit Demo-Daten beim ersten Start
REM   start-local.bat --no-demo  ohne Demo-Daten
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt: https://nodejs.org & pause & exit /b 1)
if not exist node_modules\embedded-postgres call npm install || (pause & exit /b 1)
node scripts\local.mjs %*
if errorlevel 1 pause
