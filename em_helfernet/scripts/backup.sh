#!/bin/sh
# HelferNet – Sicherung von Datenbank und Dateispeicher (Docker-Betrieb).
#   sh scripts/backup.sh [Zielordner]      Standard: ./backups
# Empfohlen täglich per Cron, z. B.:  30 2 * * *  cd /opt/em_helfernet && sh scripts/backup.sh >/dev/null
# Wiederherstellen: siehe INSTALLATION.md
set -eu
cd "$(dirname "$0")/.."
DEST="${1:-./backups}"
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"
docker compose exec -T db pg_dump -U helfernet -d helfernet --format=custom > "$DEST/helfernet-db-$STAMP.dump"
docker compose exec -T app tar -C /data -czf - storage > "$DEST/helfernet-dateien-$STAMP.tar.gz"
# Alte Sicherungen (älter als 14 Tage) entfernen
find "$DEST" -name 'helfernet-*' -mtime +14 -delete
echo "Sicherung abgelegt in $DEST ($STAMP)."
