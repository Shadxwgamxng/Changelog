#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js fehlt (Version 22+): https://nodejs.org"; exit 1; }
unset NODE_ENV
[ -d node_modules/fastify ] || npm install --include=dev || exit 1
if [ ! -f dist/index.html ] || [ ! -f dist-server/index.js ]; then npm install --include=dev && npm run build || exit 1; fi
echo "CBRN Erkunder läuft auf http://localhost:3001 (Strg+C beendet)"
(command -v xdg-open >/dev/null && xdg-open http://localhost:3001 || command -v open >/dev/null && open http://localhost:3001) >/dev/null 2>&1 &
exec node dist-server/index.js
