#!/usr/bin/env bash
# HelferNet lokal starten (Linux/macOS) – ohne Docker. Benötigt nur Node.js >= 20.
#   ./start-local.sh            mit Demo-Daten beim ersten Start
#   ./start-local.sh --no-demo  ohne Demo-Daten
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js (>= 20) fehlt: https://nodejs.org"; exit 1; }
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || { echo "Bitte Node.js >= 20 verwenden."; exit 1; }
[ -d node_modules/embedded-postgres ] || npm install || exit 1
exec node scripts/local.mjs "$@"
