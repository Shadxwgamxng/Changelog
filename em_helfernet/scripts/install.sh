#!/bin/sh
# HelferNet – Installation auf einem Linux-Server mit Docker.
#   sh scripts/install.sh                 → fragt die Domain ab, legt .env an, baut und startet alles
#   sh scripts/install.sh --env-only      → legt nur die .env an
set -eu
cd "$(dirname "$0")/.."

command -v docker >/dev/null 2>&1 || { echo "Docker fehlt. Installation: https://docs.docker.com/engine/install/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose (Plugin) fehlt."; exit 1; }

rand() { head -c "$1" /dev/urandom | base64 | tr -d '\n'; }
hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [ -f .env ]; then
  echo ".env existiert bereits – sie wird nicht überschrieben."
else
  printf "Domain, unter der HelferNet erreichbar sein soll (z. B. helfernet.meinserver.de): "
  read -r DOMAIN
  [ -n "$DOMAIN" ] || { echo "Keine Domain angegeben."; exit 1; }
  printf "Mitgelieferten HTTPS-Proxy (Caddy, Ports 80/443) verwenden? [J/n]: "
  read -r USE_CADDY
  case "$USE_CADDY" in n|N|nein|Nein) PROFILES="" ;; *) PROFILES="caddy" ;; esac
  sed \
    -e "s|^HELFERNET_DOMAIN=.*|HELFERNET_DOMAIN=\"$DOMAIN\"|" \
    -e "s|^APP_URL=.*|APP_URL=\"https://$DOMAIN\"|" \
    -e "s|^HELFERNET_DB_PASSWORD=.*|HELFERNET_DB_PASSWORD=\"$(hex 24)\"|" \
    -e "s|^COMPOSE_PROFILES=.*|COMPOSE_PROFILES=\"$PROFILES\"|" \
    -e "s|^APP_ENCRYPTION_KEY=.*|APP_ENCRYPTION_KEY=\"$(rand 32)\"|" \
    -e "s|^SETUP_TOKEN=.*|SETUP_TOKEN=\"$(hex 12)\"|" \
    -e "s|^CRON_SECRET=.*|CRON_SECRET=\"$(hex 24)\"|" \
    -e "s|^SMTP_FROM=.*|SMTP_FROM=\"HelferNet <no-reply@$DOMAIN>\"|" \
    .env.example > .env
  chmod 600 .env
  echo ".env angelegt. Bitte eine Sicherungskopie davon aufbewahren (enthält den Schlüssel für verschlüsselte Dokumente)."
  echo "E-Mail-Versand (SMTP) kann jederzeit in der .env ergänzt werden."
fi

[ "${1:-}" = "--env-only" ] && exit 0

docker compose up -d --build

DOMAIN=$(sed -n 's/^HELFERNET_DOMAIN="\(.*\)"/\1/p' .env)
TOKEN=$(sed -n 's/^SETUP_TOKEN="\(.*\)"/\1/p' .env)
echo
echo "HelferNet startet. Ersteinrichtung im Browser:"
echo "  https://$DOMAIN/setup?token=$TOKEN"
echo "(Ohne Caddy: über deinen Reverse-Proxy bzw. http://127.0.0.1:3000/setup?token=$TOKEN)"
