# HelferNet installieren

HelferNet ist eine reine Web-Anwendung. Sie läuft auf einem eigenen Server; alle Nutzer arbeiten im Browser.

## Voraussetzungen

- Linux-Server (z. B. Debian/Ubuntu) mit mind. 2 GB RAM und 10 GB freiem Speicher
- [Docker Engine](https://docs.docker.com/engine/install/) mit Compose-Plugin
- Eine (Sub-)Domain, deren DNS-Eintrag (A/AAAA) auf den Server zeigt, z. B. `helfernet.meinserver.de`
- Ports **80 und 443** offen (für HTTPS über den mitgelieferten Caddy-Proxy)
- Optional, aber empfohlen: ein SMTP-Konto für E-Mail-Benachrichtigungen

## 1. Installieren

```bash
cd /opt
git clone <repo-url> helfernet
cd helfernet/em_helfernet
sh scripts/install.sh
```

Das Skript

1. fragt die Domain ab und ob der mitgelieferte HTTPS-Proxy (Caddy) genutzt werden soll,
2. legt die Datei `.env` mit zufälligen Geheimnissen an (Datenbank-Passwort, Verschlüsselungsschlüssel, Einrichtungs-Code, Cron-Geheimnis),
3. baut das Image und startet Datenbank, HelferNet, den täglichen Wartungslauf und Caddy (`docker compose up -d --build`),
4. gibt den Link zur Ersteinrichtung aus.

Beim Start spielt HelferNet automatisch alle Datenbank-Migrationen ein. Caddy holt das HTTPS-Zertifikat selbstständig (Let's Encrypt) – das kann beim ersten Aufruf ein paar Sekunden dauern.

> **Wichtig:** Bewahre eine Kopie der `.env` sicher auf. Ohne `APP_ENCRYPTION_KEY` sind hochgeladene Dokumente und 2FA-Einstellungen nicht mehr lesbar. Den Schlüssel nie ändern, sobald Daten vorhanden sind.

## 2. Ersteinrichtung im Browser

Öffne den ausgegebenen Link `https://<domain>/setup?token=<Einrichtungs-Code>` und lege an:

- **Organisation** – Name und Art der obersten Einheit (weitere Einheiten später unter *Administration → Einheiten*),
- **Administrator-Konto** – E-Mail und Passwort (mind. 10 Zeichen, drei Zeichenarten).

Danach bist du angemeldet. Die Seite `/setup` ist ab dann gesperrt (sie funktioniert nur, solange noch kein Benutzer existiert). Standardrollen und Standard-Qualifikationsarten werden automatisch angelegt; es gibt **keine Beispieldaten**.

Empfohlene nächste Schritte:

1. *Konto* → Zwei-Faktor-Anmeldung aktivieren.
2. *Administration → Einheiten*: Untereinheiten anlegen.
3. *Administration → Benutzer & Rollen*: Rollenvorlagen prüfen/anpassen.
4. *Helfer*: Helfer anlegen und ihnen ein Benutzerkonto geben, Rollen je Einheit zuweisen.

Alternative ohne Browser (z. B. für Skripte):

```bash
docker compose exec app npm run bootstrap -- admin@example.org "Sicheres#Passwort1"
```

## 3. E-Mail einrichten (empfohlen)

In der `.env` die `SMTP_*`-Werte eintragen und neu starten:

```bash
docker compose up -d
```

Ohne SMTP funktionieren alle Benachrichtigungen innerhalb von HelferNet; E-Mails werden dann nur ins Protokoll geschrieben.

## 4. Login mit Discord einrichten (optional)

1. Im [Discord Developer Portal](https://discord.com/developers/applications) „New Application“ anlegen (Name z. B. „HelferNet“).
2. Unter **OAuth2** die **Client ID** kopieren, ein **Client Secret** erzeugen und kopieren.
3. Unter **OAuth2 → Redirects** genau diese Adresse eintragen: `https://<domain>/api/auth/discord/callback`
4. In der `.env` eintragen und neu starten (`docker compose up -d`):
   ```
   DISCORD_CLIENT_ID="…"
   DISCORD_CLIENT_SECRET="…"
   ```

Danach erscheint auf der Anmeldeseite „Mit Discord anmelden“. Es können sich **nur Konten anmelden, die mit Discord verknüpft sind** – fremde Discord-Nutzer kommen nicht hinein. Verknüpfen geht auf zwei Wegen:

- Der Helfer meldet sich einmal mit E-Mail und Passwort an und klickt unter **Konto → Discord** auf „Mit Discord verknüpfen“.
- Die Leitung trägt unter **Administration → Benutzer & Rollen → Konto verwalten** die Discord-ID ein (in Discord: Einstellungen → Erweitert → Entwicklermodus, dann Rechtsklick auf den Benutzer → „ID kopieren“). Der Helfer kann sich dann sofort mit Discord anmelden, ohne das Initialpasswort zu kennen.

Ist die Zwei-Faktor-Anmeldung aktiv, wird der Code auch beim Discord-Login abgefragt.

## Betrieb

| Aufgabe | Befehl |
|---|---|
| Status | `docker compose ps` |
| Protokolle | `docker compose logs -f app` |
| Neu starten | `docker compose restart app` |
| Stoppen | `docker compose down` (Daten bleiben in den Volumes erhalten) |
| Update | `git pull && docker compose up -d --build` (Migrationen laufen beim Start automatisch) |

Der Wartungslauf (Ablaufwarnungen für Qualifikationen/Dokumente, Löschkonzept) läuft im Container `maintenance` einmal täglich.

### Eigener Reverse-Proxy statt Caddy

Bei der Installation „nein“ zum HTTPS-Proxy wählen (oder in der `.env` `COMPOSE_PROFILES=""` setzen). HelferNet lauscht dann nur auf `127.0.0.1:3000` (Port über `HELFERNET_PORT` änderbar). Den eigenen Proxy (nginx, Traefik, …) mit HTTPS darauf zeigen lassen und `X-Forwarded-For` setzen. `APP_URL` muss mit `https://` beginnen, damit Sitzungs-Cookies als „Secure“ markiert werden.

## Datensicherung

```bash
sh scripts/backup.sh              # legt Datenbank-Dump + Dateispeicher unter ./backups ab (14 Tage aufbewahrt)
```

Täglich per Cron:

```
30 2 * * *  cd /opt/helfernet/em_helfernet && sh scripts/backup.sh >/dev/null
```

Sicherungen zusätzlich auf einen anderen Rechner kopieren. Zur Wiederherstellung gehört auch die `.env` (Schlüssel!).

### Wiederherstellen

```bash
docker compose stop app maintenance
docker compose exec -T db pg_restore -U helfernet -d helfernet --clean --if-exists < backups/helfernet-db-<DATUM>.dump
docker compose run --rm -T --entrypoint sh app -c "rm -rf /data/storage/* && tar -C /data -xzf -" < backups/helfernet-dateien-<DATUM>.tar.gz
docker compose up -d
```

## Installation ohne Docker

1. Node.js ≥ 20 und PostgreSQL ≥ 14 installieren; Datenbank und Benutzer `helfernet` anlegen.
2. `cp .env.example .env` und ausfüllen: `DATABASE_URL`, `APP_URL`, `APP_ENCRYPTION_KEY` (`openssl rand -base64 32`), `STORAGE_DIR`, `SETUP_TOKEN`.
3. `npm ci && npm run build`
4. `npm run start:prod` (spielt Migrationen ein, startet auf Port 3000) – z. B. als systemd-Dienst.
5. Täglich per Cron: `npm run maintenance`.
6. HTTPS-Reverse-Proxy davorstellen und `https://<domain>/setup` aufrufen.

## Konfiguration (`.env`)

| Variable | Bedeutung |
|---|---|
| `HELFERNET_DOMAIN` | Domain für Caddy/HTTPS |
| `APP_URL` | Öffentliche Basis-URL (Links in E-Mails/Kalender, Secure-Cookies bei `https://`) |
| `HELFERNET_DB_PASSWORD` | Passwort der Docker-Datenbank |
| `APP_ENCRYPTION_KEY` | 32 Byte Base64 – Verschlüsselung von Dokumenten und 2FA-Geheimnissen |
| `SETUP_TOKEN` | Einrichtungs-Code für `/setup` |
| `CRON_SECRET` | optional: Wartungslauf per HTTP (`POST /api/cron/maintenance`, `Authorization: Bearer …`) |
| `SMTP_*` | E-Mail-Versand |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | optional: Login mit Discord |
| `SESSION_IDLE_MINUTES`, `SESSION_MAX_HOURS` | Abmeldung nach Inaktivität / maximale Sitzungsdauer |
| `RETAIN_*` | Aufbewahrungsfristen (Löschkonzept) |

Der Server startet nicht, wenn Pflichtwerte fehlen, und nennt dann im Protokoll, was fehlt.
