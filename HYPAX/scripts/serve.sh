#!/bin/sh
# Entwicklungshilfe: Produktionsserver im Hintergrund starten/stoppen (Stopp über den Port, nicht über Prozessnamen).
PORT="${PORT:-3100}"
case "$1" in
  stop) fuser -k "$PORT/tcp" >/dev/null 2>&1; sleep 1 ;;
  start) [ -n "$E2E_DATABASE_URL" ] && export DATABASE_URL="$E2E_DATABASE_URL"; setsid nohup npx next start -p "$PORT" > /tmp/next-start.log 2>&1 & ;;
esac
