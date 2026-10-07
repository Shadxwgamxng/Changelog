@echo off
REM HYPAX lokal starten (Windows). Benötigt: Node.js >= 20 und Docker Desktop (für PostgreSQL) oder eine eigene PostgreSQL-Datenbank.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt: https://nodejs.org & pause & exit /b 1)

if not exist .env (
  for /f %%k in ('node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"') do set KEY=%%k
  for /f %%c in ('node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"') do set CRON=%%c
  (
    echo DATABASE_URL="postgresql://hypax:hypax@localhost:5432/hypax?schema=public"
    echo APP_URL="http://localhost:3000"
    echo APP_ENCRYPTION_KEY="%KEY%"
    echo STORAGE_DIR="./storage"
    echo CRON_SECRET="%CRON%"
  ) > .env
  echo .env erzeugt. Schluessel gut aufbewahren.
)

where docker >nul 2>nul && (
  docker rm -f hypax-db >nul 2>nul
  docker run -d --name hypax-db --restart unless-stopped -e POSTGRES_USER=hypax -e POSTGRES_PASSWORD=hypax -e POSTGRES_DB=hypax -p 127.0.0.1:5432:5432 -v hypax-data:/var/lib/postgresql/data postgres:16
  timeout /t 8 /nobreak >nul
)

if not exist node_modules call npm install
call npx prisma migrate deploy || (echo Datenbank nicht erreichbar. & pause & exit /b 1)
call npx tsx prisma/seed.ts
if not exist .next call npm run build
echo.
echo HYPAX laeuft auf http://localhost:3000
echo Demo-Login: admin@demo.hypax.de / max@demo.hypax.de   Passwort: Demo#Passwort1
call npx next start -p 3000
