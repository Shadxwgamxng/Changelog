#!/usr/bin/env bash
# HYPAX lokal starten (Linux/macOS). Benötigt: Node.js >= 20 und entweder Docker (für PostgreSQL) oder eine eigene PostgreSQL-Datenbank.
#   ./start-local.sh            normal starten (Demo-Daten beim ersten Start)
#   ./start-local.sh --no-demo  ohne Demo-Daten (stattdessen: npm run bootstrap -- mail@example.org "Passwort")
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-3000}"

command -v node >/dev/null || { echo "Node.js (>= 20) fehlt: https://nodejs.org"; exit 1; }
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || { echo "Bitte Node.js >= 20 verwenden."; exit 1; }

# 1) Konfiguration beim ersten Start erzeugen
if [ ! -f .env ]; then
  KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  CRON=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  cat > .env <<ENV
DATABASE_URL="postgresql://hypax:hypax@localhost:5432/hypax?schema=public"
APP_URL="http://localhost:${PORT}"
APP_ENCRYPTION_KEY="${KEY}"
STORAGE_DIR="./storage"
CRON_SECRET="${CRON}"
ENV
  echo "→ .env erzeugt (Schlüssel gut aufbewahren: ohne APP_ENCRYPTION_KEY sind Dokumente unlesbar)."
fi

# 2) PostgreSQL: per Docker, falls verfügbar und noch nicht erreichbar
if command -v docker >/dev/null && ! (echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  echo "→ Starte PostgreSQL in Docker …"
  docker rm -f hypax-db >/dev/null 2>&1 || true
  docker run -d --name hypax-db --restart unless-stopped -e POSTGRES_USER=hypax -e POSTGRES_PASSWORD=hypax -e POSTGRES_DB=hypax \
    -p 127.0.0.1:5432:5432 -v hypax-data:/var/lib/postgresql/data postgres:16 >/dev/null
  for _ in $(seq 1 30); do docker exec hypax-db pg_isready -U hypax >/dev/null 2>&1 && break; sleep 1; done
fi
(echo > /dev/tcp/127.0.0.1/5432) 2>/dev/null || { echo "Keine PostgreSQL-Datenbank erreichbar. Docker installieren oder DATABASE_URL in .env auf deine Datenbank setzen."; exit 1; }

# 3) Installieren, Datenbank vorbereiten, bauen, starten
[ -d node_modules ] || npm install
npx prisma migrate deploy
if [ "${1:-}" != "--no-demo" ]; then npx tsx prisma/seed.ts || true; fi
[ -d .next ] || npm run build
echo
echo "HYPAX läuft auf http://localhost:${PORT}"
echo "Demo-Login: admin@demo.hypax.de  /  max@demo.hypax.de   Passwort: Demo#Passwort1"
exec npx next start -p "${PORT}"
