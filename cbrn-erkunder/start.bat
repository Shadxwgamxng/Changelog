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
if not exist node_modules (
  echo Installiere Abhaengigkeiten ^(nur beim ersten Start^) ...
  call npm install || (echo Installation fehlgeschlagen. & pause & exit /b 1)
)
if not exist dist\index.html (
  echo Baue die Web-App ^(nur beim ersten Start^) ...
  call npm run build || (echo Build fehlgeschlagen. & pause & exit /b 1)
)
echo.
echo CBRN Erkunder laeuft auf http://localhost:3001  ^(Fenster offen lassen, Strg+C beendet^)
start "" http://localhost:3001
node dist-server\index.js
pause
