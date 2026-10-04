#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js fehlt (Version 20+): https://nodejs.org"; exit 1; }
[ -d node_modules ] || npm install || exit 1
[ -f dist/index.html ] || npm run build || exit 1
echo "CBRN Erkunder läuft auf http://localhost:3001 (Strg+C beendet)"
(command -v xdg-open >/dev/null && xdg-open http://localhost:3001 || command -v open >/dev/null && open http://localhost:3001) >/dev/null 2>&1 &
exec node dist-server/index.js
