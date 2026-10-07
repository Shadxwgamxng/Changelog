#!/bin/sh
# Vollständiger End-to-End-Lauf: frische E2E-Datenbank + Produktionsserver (nach `npm run build`) + Browser-Tests.
set -e
cd "$(dirname "$0")/.."
export E2E_DATABASE_URL="postgresql://hypax:hypax@localhost:5432/hypax_e2e?schema=public"
scripts/serve.sh stop
scripts/e2e-db.sh
scripts/serve.sh start
for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf http://localhost:3100/api/health >/dev/null 2>&1 && break; sleep 1; done
status=0
node tests/e2e/e2e.mjs || status=$?
scripts/serve.sh stop
exit $status
