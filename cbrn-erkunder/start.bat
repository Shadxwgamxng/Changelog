@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CBRN Erkunder Software
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte Version 22 oder neuer installieren: https://nodejs.org
  pause
  exit /b 1
)
for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 22 (
  echo Node.js %NODEMAJOR% ist zu alt. Bitte Node.js 22 oder neuer installieren: https://nodejs.org
  pause
  exit /b 1
)
rem Entwicklungs-Pakete immer mitinstallieren (auch wenn npm auf "production" steht)
set NODE_ENV=
if not exist node_modules\fastify (
  echo Installiere Abhaengigkeiten ^(nur beim ersten Start^) ...
  call npm install --include=dev || (echo Installation fehlgeschlagen. & pause & exit /b 1)
)
if not exist dist\index.html goto build
if not exist dist-server\index.js goto build
goto run
:build
echo Baue die Web-App ^(nur beim ersten Start^) ...
call npm install --include=dev || (echo Installation fehlgeschlagen. & pause & exit /b 1)
call npm run build || (echo Build fehlgeschlagen. & pause & exit /b 1)
:run
echo.
echo CBRN Erkunder laeuft auf http://localhost:3001  ^(Fenster offen lassen, Strg+C beendet^)
start "" http://localhost:3001
node dist-server\index.js
pause
