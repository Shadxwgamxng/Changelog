# SH Airsoft Kommando – Team Panel

Interne Teamplattform des **Schleswig-Holstein Airsoft Kommandos** („Wind von vorn“): Mitglieder, Spieltage mit Zu-/Absagen, Ausrüstung samt Einkaufsliste, Ankündigungen, Kalender, Benachrichtigungen und Audit-Log – mit echter Anmeldung, Rollen/Rechten und PostgreSQL-Datenbank.

- **Kein Mockup:** Alle Funktionen schreiben und lesen echte Daten (PostgreSQL via Prisma). Es gibt keine simulierten API-Antworten und keine statischen Fake-Daten im Betrieb. Die Demo-Daten kommen ausschließlich aus dem optionalen Seed-Script.
- Dunkles, taktisches Design, vollständig responsive (Desktop-Sidebar, mobile Tab-Leiste, Touch-Buttons für schnelle Zu-/Absagen).

---

## Inhalt

1. [Tech-Stack und Begründung](#tech-stack-und-begründung)
2. [Voraussetzungen](#voraussetzungen)
3. [Schnellstart (lokal)](#schnellstart-lokal)
4. [Umgebungsvariablen](#umgebungsvariablen)
5. [Datenbank, Migrationen, Seed](#datenbank-migrationen-seed)
6. [Demo-Zugänge](#demo-zugänge)
7. [npm-Skripte](#npm-skripte)
8. [Rollen und Rechte](#rollen-und-rechte)
9. [Sicherheit](#sicherheit)
10. [Funktionsüberblick](#funktionsüberblick)
11. [Projektstruktur und Erweiterbarkeit](#projektstruktur-und-erweiterbarkeit)
12. [Tests](#tests)
13. [Deployment](#deployment)
14. [Betrieb: Backups, E-Mail, Uploads](#betrieb-backups-e-mail-uploads)
15. [Bekannte Grenzen](#bekannte-grenzen)

---

## Tech-Stack und Begründung

| Bereich | Wahl |
|---|---|
| Framework | **Next.js 15** (App Router) + **React 19**, **TypeScript** (`strict`, zusätzlich `noUncheckedIndexedAccess`) |
| Styling | **Tailwind CSS 3**, selbst gehostete Schriften (`@fontsource`, kein Google-CDN) |
| Datenbank | **PostgreSQL** + **Prisma 6** (Migrationen, Foreign Keys, Indizes) |
| Validierung | **Zod** (jede Eingabe wird serverseitig validiert) |
| Backend | Next **Server Actions** (Mutationen) + **Route Handlers** (Upload, Datei-Auslieferung, Healthcheck) |
| Auth | **Eigene, minimale Session-Auth** (siehe unten) |
| Mail | `nodemailer` (optional, sonst Log-Ausgabe) |

**Warum keine Auth.js?** Das Panel braucht Login mit Passwort, sofort widerrufbare Sessions (Deaktivieren/Passwortwechsel meldet überall ab), Einladungen und Passwort-Reset. Auth.js Credentials erzwingt JWT-Sessions, die sich nicht serverseitig sofort entziehen lassen. Die eigene Lösung ist klein (`src/lib/auth.ts`), nutzt **DB-Sessions mit gehashten Tokens**, `scrypt` aus Node (keine native Abhängigkeit) und lässt sich vollständig prüfen.

Alle Abhängigkeiten sind bewusst schlank gehalten: `next`, `react`, `@prisma/client`, `zod`, `nodemailer`, `lucide-react`, `clsx`, zwei Schriftpakete, `server-only`.

---

## Voraussetzungen

- **Node.js ≥ 20.9** (getestet mit 22) und npm
- **PostgreSQL ≥ 14** (getestet mit 16) – lokal installiert oder per Docker (`docker compose up -d db`)

---

## Schnellstart (lokal, ohne Docker und ohne PostgreSQL-Installation)

Nur Node.js (≥ 20.9) wird benötigt. Das Startskript startet eine **eingebettete PostgreSQL-Datenbank** (Daten in `./data`), wendet die Migrationen an, legt beim ersten Start Demo-Daten an, baut die App und startet sie:

- **Windows:** Doppelklick auf `start.bat`
- **Linux/macOS:** `./start.sh`

Danach läuft das Panel auf <http://localhost:3000> (Login `admin@example.local`, Passwort siehe [Demo-Zugänge](#demo-zugänge)). Beenden mit Strg+C. Zurücksetzen: Panel beenden und den Ordner `data` löschen. Nur zum lokalen Testen gedacht; der Datenbankprozess läuft nicht als Administrator/root (PostgreSQL verweigert das).

## Als Handy-App nutzen (PWA)

Das Panel ist eine **installierbare Web-App**: eigenes Icon auf dem Startbildschirm, Vollbild ohne Browserleiste, Offline-Hinweisseite. Es gibt keine Store-App; dafür muss der Server vom Handy aus erreichbar sein.

**Installieren**

- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.

**Erreichbarkeit**

- *Echter Betrieb (empfohlen):* Panel auf einem Server hinter **HTTPS** betreiben (siehe Deployment). Nur dann bieten Android/iOS die Installation an.
- *Test im Heim-WLAN:* Mit `start.bat` läuft das Panel auf deinem PC auch für andere Geräte im selben WLAN: auf dem PC `ipconfig` → IPv4-Adresse, am Handy `http://<IPv4>:3000` öffnen. Bei der Windows-Firewall-Abfrage „Privates Netzwerk“ zulassen. Per HTTP kann man das Panel am Handy nutzen und als Lesezeichen/Verknüpfung ablegen, die echte Installation als App braucht aber HTTPS.
- *Schnelles HTTPS ohne Server:* ein Tunnel wie Cloudflare Tunnel oder Tailscale Funnel auf `localhost:3000`; danach `APP_URL` auf die Tunnel-Adresse setzen und `AUTH_COOKIE_SECURE="true"`.

Der Service Worker (`public/sw.js`) speichert nur Build-Dateien und Icons, **keine angemeldeten Seiten oder Daten**.

## Schnellstart mit eigener Datenbank (Entwicklung)

```bash
cd teampanel

# 1) Konfiguration
cp .env.example .env              # danach DATABASE_URL etc. prüfen

# 2) Datenbank starten (Variante Docker; alternativ eigene PostgreSQL-Instanz nutzen)
docker compose up -d db

# 3) Abhängigkeiten, Schema und Demo-Daten
npm install
npm run db:deploy                 # Migrationen anwenden
npm run db:seed                   # Demo-Daten (optional, nur Entwicklung!)

# 4) Starten
npm run dev                       # http://localhost:3000
```

Produktions-Build lokal testen:

```bash
npm run build && npm start        # bei http://localhost: AUTH_COOKIE_SECURE="false" lassen
```

Ohne Docker, eigene PostgreSQL-Instanz:

```sql
CREATE USER panel WITH PASSWORD 'panel' CREATEDB;
CREATE DATABASE shak_panel OWNER panel;
```

---

## Umgebungsvariablen

Siehe `.env.example`. Es werden **keine Secrets ans Frontend** ausgeliefert (kein `NEXT_PUBLIC_*`).

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `DATABASE_URL` | ja | PostgreSQL-Verbindung, z. B. `postgresql://panel:panel@localhost:5432/shak_panel?schema=public` |
| `APP_URL` | ja (Prod) | Öffentliche Basis-URL, wird in Einladungs-/Reset-Links verwendet |
| `APP_TIMEZONE` | nein | Zeitzone für Ein-/Ausgabe von Terminen (Standard `Europe/Berlin`); in der DB liegt UTC |
| `AUTH_COOKIE_SECURE` | nein | `true` = Cookie nur über HTTPS (Standard in Produktion). Bei `npm start` über `http://localhost` auf `false` setzen |
| `SESSION_DAYS` | nein | Sitzungsdauer in Tagen (Standard 14) |
| `UPLOADS_DIR` | nein | Speicherort hochgeladener Bilder (Standard `./storage/uploads`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | nein | E-Mail-Versand (Passwort-Reset). Ohne `SMTP_HOST` landen Mails im Server-Log |
| `SEED_DEMO_PASSWORD` | nein | Passwort der Demo-Accounts (Standard `DEMO-Passwort-2026!`) |
| `INITIAL_SUPERADMIN_EMAIL`, `_USERNAME`, `_PASSWORD` | nein | Erster Superadmin für Produktion (`npm run db:bootstrap`) |

---

## Datenbank, Migrationen, Seed

Das Datenmodell liegt in `prisma/schema.prisma` (inkl. Foreign Keys und Indizes). Migrationen liegen versioniert in `prisma/migrations/`.

**Modelle:** `User`, `Role`, `TeamMemberProfile`, `Event`, `EventAttendance`, `EventEquipment`, `Equipment`, `UserEquipment`, `PersonalItem`, `EquipmentRequirement`, `Announcement`, `ShoppingItem`, `TeamSettings`, `AuditLog` – zusätzlich `Session`, `Invitation`, `PasswordResetToken`, `Notification`, `RateLimit`.

| Aufgabe | Befehl |
|---|---|
| Migrationen anwenden (Produktion/CI) | `npm run db:deploy` |
| Neue Migration nach Schema-Änderung (Entwicklung) | `npm run db:migrate -- --name beschreibung` |
| Alles löschen, neu migrieren, seeden | `npm run db:reset` |
| Demo-Daten einspielen | `npm run db:seed` (bricht ab, wenn schon Benutzer existieren; `SEED_FORCE=true npm run db:seed` löscht alles und seedet neu) |
| **Produktion ohne Demo-Daten** | `npm run db:bootstrap` – legt Systemrollen + Teameinstellungen an und, wenn `INITIAL_SUPERADMIN_*` gesetzt sind, den ersten Superadmin |

Der Seed erzeugt 11 Mitglieder (inkl. einem inaktiven), 4 Rollen-Accounts, 5 Termine (kommend, Training, Besprechung, vergangen), 16 Ausrüstungsgegenstände, persönliche Ausrüstungsstände, offene Anforderungen, Einkaufsartikel, 3 Ankündigungen (u. a. eine dringende) und Audit-Einträge. Termine werden **relativ zum Seed-Datum** angelegt.

---

## Demo-Zugänge

Nur vorhanden, wenn `npm run db:seed` ausgeführt wurde. Passwort für alle: **`DEMO-Passwort-2026!`** (oder `SEED_DEMO_PASSWORD`).

| E-Mail | Systemrolle |
|---|---|
| `superadmin@example.local` | Superadmin |
| `admin@example.local` | Admin (Rufname „Raptor“) |
| `leader@example.local` | Teamleitung („Alpha“) |
| `member@example.local` | Mitglied („Ghost“) |

> ⚠️ **Das sind Demo-Accounts mit öffentlich bekanntem Passwort.** Die Accounts sind als „Passwort ändern“ markiert (Hinweis-Banner). Vor jeder produktiven Nutzung: Passwörter ändern **oder** Demo-Accounts löschen. In Produktion kein Seed ausführen, sondern `npm run db:bootstrap`.

---

## npm-Skripte

| Skript | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` / `npm start` | Produktions-Build / -Server |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run lint` | ESLint |
| `npm test` | Unit-Tests (Rechte, Datum/Zeitzone, Passwort-Hashing, Event-Status) |
| `npm run test:e2e` | Browser-E2E-Test (Playwright) gegen eine laufende Instanz mit Demo-Daten |
| `npm run db:deploy` / `db:migrate` / `db:reset` | Migrationen |
| `npm run db:seed` / `db:bootstrap` | Demo-Daten / Produktions-Setup |

---

## Rollen und Rechte

Es gibt **zwei getrennte Rollensysteme**, die nie vermischt werden:

- **Systemrolle** (`Role`): Superadmin, Admin, Teamleitung, Mitglied – steuert **Rechte**.
- **Airsoft-Rolle** (`TeamMemberProfile.airsoftRole`): Squad Leader, Rifleman, Support Gunner, Medic, Recon, Sniper, Funker, Fahrer, Sonstige – rein **informativ**.

Alle Rechte sind **zentral in `src/lib/permissions.ts`** definiert (Rolle → Rechteliste). Frontend (Navigation, Buttons, Seiten) und Backend (Server Actions, API-Routen) rufen dieselben Funktionen (`can`, `canManageUser`, `canAssignRole`, …) auf.

| Recht | Superadmin | Admin | Teamleitung | Mitglied |
|---|:-:|:-:|:-:|:-:|
| Eigenes Profil, Zu-/Absagen, eigene Ausrüstung, Ankündigungen lesen | ✅ | ✅ | ✅ | ✅ |
| Mitgliederverwaltung ansehen (Kontaktdaten) | ✅ | ✅ | ✅ | – |
| Private Admin-Notizen lesen/schreiben | ✅ | ✅ | – | – |
| Mitglieder anlegen/bearbeiten/(de)aktivieren/löschen | ✅ | ✅¹ | – | – |
| Systemrollen vergeben, Einladungslinks | ✅ | ✅¹ | – | – |
| Termine erstellen | ✅ | ✅ | ✅ | – |
| Termine bearbeiten | alle | alle | nur eigene | – |
| Termine löschen | ✅ | ✅ | – | – |
| Anwesenheit anderer pflegen, Teilnehmerübersicht | ✅ | ✅ | ✅ | – |
| Ausrüstungskatalog, Ausrüstung/Anforderungen anderer, Einkaufsliste | ✅ | ✅ | ✅ | – |
| Ankündigungen erstellen | ✅ | ✅ | ✅ | – |
| Ankündigungen bearbeiten/löschen | alle | alle | nur eigene | – |
| Teamdaten, Admin-Dashboard, Audit-Log | ✅ | ✅ | – | – |

¹ **Rang-Regel gegen Rechteausweitung:** Ein Admin darf nur Benutzer verwalten, deren Rang **niedriger** ist (also Teamleitung/Mitglied), und nur Rollen unterhalb des eigenen Rangs vergeben. Nur der Superadmin verwaltet Admins/Superadmins. Der letzte aktive Superadmin kann weder gelöscht, deaktiviert noch herabgestuft werden.

Rechte ändern: nur `src/lib/permissions.ts` anpassen (und den Test `src/lib/__tests__/permissions.test.ts`).

---

## Sicherheit

- **Passwörter:** `scrypt` mit zufälligem Salt (Node-intern), Zeitkonstanter Vergleich; Mindestlänge 10 Zeichen mit Buchstaben und Zahlen.
- **Sessions:** zufälliges 256-Bit-Token im **HttpOnly-, SameSite=Lax-** (und in Produktion **Secure-**)Cookie; in der DB nur der **SHA-256-Hash**. Deaktivieren eines Mitglieds, Passwortreset/-wechsel löschen Sessions. Pro Login neues Token (keine Session Fixation).
- **Autorisierung serverseitig:** Jede Server Action und jede API-Route prüft Session **und** Recht gegen die Datenbank – manipulierte Requests umgehen nichts (wird im E2E-Test mit einem nachgespielten Server-Action-Request geprüft). Seiten ohne Berechtigung liefern 404.
- **CSRF:** Server Actions prüfen von Haus aus Origin/Host; Cookies sind `SameSite=Lax`; es gibt keine zustandsändernden GET-Routen.
- **Login-Rate-Limiting:** DB-basiert (funktioniert auch mit mehreren Instanzen), je Konto **und** je IP; auch für Passwort-Reset, Registrierung und Passwortwechsel. Gleiche Fehlermeldung für „unbekannter Benutzer“ und „falsches Passwort“ (auch Timing-angeglichen).
- **Eingabevalidierung:** Zod-Schemas für alle Eingaben (Längen, Formate, Enums, URLs nur `http(s)`).
- **SQL-Injection:** ausschließlich Prisma (parametrisierte Queries), kein Raw-SQL mit Nutzereingaben.
- **XSS:** React escaped alle Ausgaben; Nutzertexte werden nie als HTML gerendert (E2E-Test mit `<script>` in einer Ankündigung). Externe Links mit `rel="noopener noreferrer nofollow"`.
- **Uploads:** nur PNG/JPG/WebP/GIF (Prüfung der **Magic Bytes**, kein SVG), max. 3 MB, Zufallsdateinamen, Auslieferung nur an angemeldete Benutzer mit `nosniff` und restriktiver CSP; Pfad-Traversal ausgeschlossen.
- **Datenschutz:** private Admin-Notizen, E-Mail und Telefon werden serverseitig je nach Betrachter herausgefiltert, bevor Daten die UI erreichen.
- **Header:** `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; kein `X-Powered-By`.
- **Secrets:** nur über Umgebungsvariablen, `.env` ist in `.gitignore`.
- **Audit-Log:** wichtige Änderungen (Mitglieder, Rollen, Termine, Ausrüstung, Anforderungen, Einkauf, Ankündigungen, Teamdaten, Einladungen) werden mit Akteur, Ziel, Zeit und Daten protokolliert.

---

## Funktionsüberblick

- **Dashboard:** „Moin, Vorname!“, nächster Termin mit Zusagen-Zähler und Zu-/Absage-Buttons, dringende Ankündigungen hervorgehoben, Pflichtausrüstungs-Fortschritt mit Shop-Links, Teamübersicht.
- **Team:** Mitgliederkarten (Suche, Filter nach Teamrolle/Airsoft-Rolle), Detailseite („Müller, Max – Raptor“), Teamprofil (Logo, Gründungsjahr, Regeln, Kontakt, Social Links, nächste Termine).
- **Spieltage:** Typen (Spieltag, Training, Besprechung, Sonstiges), Status (geplant, Anmeldung offen, voll – automatisch bei Limit –, abgeschlossen – automatisch nach Ende –, abgesagt), Anmeldefrist, Teilnehmerlimit, Kosten, Treffpunkt/Abfahrt, Maps-Link, benötigte Ausrüstung. Zusage/Vielleicht/Absage, Mitfahrbörse (Fahrer, freie Plätze, Abfahrtsort), Kommentar. Teilnehmertabelle für Teamleitung/Admin inkl. „Noch keine Antwort“ und Pflege für andere.
- **Kalender:** Monats- und Listenansicht (mobil mit Punkten), farbcodiert nach Terminart.
- **Ausrüstung:** zentraler Katalog (16 Kategorien, Pflicht/optional, Preis, Shop-Link, Bild, Hersteller, Priorität, Notizen); persönliche Ausrüstung mit Status (vorhanden, fehlt, bestellt, teilweise, defekt); Admin-Zuweisung von Anforderungen an mehrere Mitglieder gleichzeitig mit Frist; daraus entsteht die **persönliche Einkaufsliste** („🔴 dringend / 🟡 zusätzlich“, „Zum Shop“ im neuen Tab).
- **Mein Inventar:** Jedes Mitglied legt eigene Ausrüstung frei an – **Kleidung** und **Waffen**, darunter **Anbauteile** (gehören zu einer Waffe) und **Gadgets** (an einer Waffe oder einzeln). Sichtbar nur für das Mitglied selbst und – lesend – für Teamleitung/Admin (Mitgliederverwaltung). Beim Löschen einer Waffe verschwinden ihre Anbauteile, Gadgets bleiben einzeln erhalten.
- **Team-Einkaufsliste:** Artikel mit Preis, Priorität, Shop, Bild, Status; Bedarfsberechnung („5 Mitglieder benötigen diesen Artikel“) bei Verknüpfung mit dem Katalog; „Katalog → Einkaufsliste“ per Klick.
- **Ankündigungen:** Prioritäten normal/wichtig/dringend, anheften, Bild, geplante Veröffentlichung; wichtige/dringende lösen Benachrichtigungen aus.
- **Benachrichtigungen (intern):** neue Termine, Terminabsagen, Rolle geändert, Ausrüstung zugewiesen, wichtige Ankündigungen sowie automatisch erzeugte Erinnerungen (Termin in ≤ 7 Tagen, fehlende Pflichtausrüstung; ohne Cron beim Seitenaufruf, dedupliziert).
- **Administration:** Kennzahlen (Mitglieder, aktiv, kommende Spieltage, Ø Teilnahme, offene Anforderungen, offene Einkaufsartikel), Mitgliederverwaltung (anlegen mit generiertem Einmalpasswort, bearbeiten, deaktivieren, löschen, Rollen, Profilbild, Notizen, Einladungslinks, Passwort-Links), Anforderungsübersicht, Teamdaten, Aktivitätsprotokoll mit Filter und Paging.
- **UX:** Toasts, Bestätigungsdialoge vor jedem Löschen, Ladezustände (Button-Spinner, Navigationsbalken), Empty States, Error-Boundary, verständliche Fehlermeldungen.

---

## Projektstruktur und Erweiterbarkeit

```
prisma/               schema.prisma, migrations/, seed.ts (Demo), base.ts (Stammdaten)
scripts/bootstrap.ts  Produktions-Setup
src/
  middleware.ts       grobe Vorprüfung (Cookie vorhanden?) – die echte Prüfung erfolgt serverseitig
  app/
    (auth)/           login, forgot-password, reset-password/[token], register/[token]
    (app)/            geschützter Bereich: Dashboard, team, events, calendar, equipment,
                      shopping, announcements, notifications, profile, admin/*
    api/              upload, files/[...path], health
  components/
    ui/               Button, Card, Modal, Form-Felder, Table, Badge, Alert, Avatar, Toast,
                      Confirm-Dialog, Dropdown, Tabs, Filter-Leiste …
    layout/           App-Shell (Sidebar, mobile Navigation)
    features/         EventCard, EquipmentCard, MemberCard, AnnouncementCard, Formulare …
  lib/                permissions.ts (zentral), auth.ts, password.ts, rate-limit.ts, audit.ts,
                      dates.ts, validation.ts, labels.ts, uploads.ts, mailer.ts, events.ts
  server/
    actions/          Mutationen je Fachbereich (auth, members, events, equipment, shopping, …)
    queries/          Lesezugriffe je Fachbereich (inkl. Sichtbarkeitsfilter)
    notifications.ts  interne Benachrichtigungen
```

**Konventionen für neue Module** (z. B. Chat, Dateiablage, Trainingsplanung, Finanzen, Discord-Integration):

1. Modelle in `prisma/schema.prisma` ergänzen → `npm run db:migrate -- --name chat`.
2. Neues Recht in `src/lib/permissions.ts` eintragen und Rollen zuordnen.
3. Lesezugriffe in `src/server/queries/<modul>.ts`, Mutationen in `src/server/actions/<modul>.ts` (jede Action beginnt mit `actionPermission(...)`/`actionUser()`, validiert mit Zod und schreibt einen `audit(...)`-Eintrag).
4. Seiten unter `src/app/(app)/<modul>/`, Navigationspunkt in `src/components/layout/app-shell.tsx`.
5. Benachrichtigungen über `notifyUsers`/`notifyAllActive`; E-Mail-/Push-Versand lässt sich dort zentral ergänzen (`src/lib/mailer.ts` ist bereits angebunden).

---

## Tests

```bash
npm test            # Unit-Tests: Rechte & Rangregeln, Zeitzonen/DST, Passwort-Hash, Event-Status
npm run typecheck
npm run lint
npm run build

# Browser-E2E (benötigt laufende Instanz mit Demo-Daten und ein Chromium):
BASE_URL=http://localhost:3000 CHROME_PATH=/pfad/zu/chromium npm run test:e2e
```

Zusätzlich wurde die Anwendung mit einem **Browser-End-to-End-Test (Playwright/Chromium, Desktop + Smartphone-Viewport)** gegen den Produktions-Build geprüft: Login/Logout, Rate-Limit, Rechte pro Rolle (inkl. 404 für fremde Bereiche), Mitglied anlegen/bearbeiten/Rolle ändern, Einladung & Registrierung, Passwort-Reset und -Änderung, Spieltag erstellen, Zu-/Absage, Teilnehmerlimit, Kalender, Ausrüstung erstellen/zuweisen, Einkaufsliste mit Bedarf, Ankündigungen (inkl. XSS-Probe), Uploads (Typ-/Rechteprüfung), Audit-Log und ein nachgespielter, manipulierter Server-Action-Request als Mitglied.

---

## Deployment

### Variante A – Docker Compose (App + Datenbank)

```bash
cp .env.example .env
# .env anpassen: APP_URL (https://panel.example.org), POSTGRES_PASSWORD, AUTH_COOKIE_SECURE=true,
# INITIAL_SUPERADMIN_EMAIL / _USERNAME / _PASSWORD
docker compose --profile app up -d --build
```

Beim Start führt der Container `prisma migrate deploy` und `db:bootstrap` aus (Rollen, Teameinstellungen, erster Superadmin) und startet dann die App auf Port 3000. Uploads liegen im Volume `uploads`, die Datenbank im Volume `dbdata`. Danach `INITIAL_SUPERADMIN_PASSWORD` aus der `.env` entfernen.

### Variante B – direkt auf einem Server

```bash
git clone … && cd teampanel
cp .env.example .env              # DATABASE_URL, APP_URL, AUTH_COOKIE_SECURE=true, UPLOADS_DIR, INITIAL_SUPERADMIN_*
npm ci
npm run db:deploy                 # Migrationen
npm run db:bootstrap              # Rollen + erster Superadmin (kein Seed in Produktion!)
npm run build
npm start                         # Port 3000 (PORT=… ändert ihn)
```

Als Dienst (systemd, Beispiel):

```ini
[Unit]
Description=SH Airsoft Kommando Team Panel
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/teampanel
EnvironmentFile=/opt/teampanel/.env
ExecStart=/usr/bin/npm start
Restart=always
User=teampanel

[Install]
WantedBy=multi-user.target
```

### HTTPS / Reverse Proxy

Betreibe das Panel **immer hinter HTTPS** (Caddy, nginx, Traefik) und setze `AUTH_COOKIE_SECURE="true"` sowie `APP_URL="https://…"`. Beispiel Caddy:

```
panel.example.org {
  reverse_proxy localhost:3000
}
```

Der Proxy muss `X-Forwarded-For` setzen (Caddy/nginx tun das), damit das IP-basierte Rate-Limit greift. Das Panel selbst nicht ohne Proxy direkt ins Internet stellen, wenn `X-Forwarded-For` von Clients gefälscht werden könnte.

### Updates

```bash
git pull && npm ci && npm run db:deploy && npm run build && sudo systemctl restart teampanel
```

---

## Betrieb: Backups, E-Mail, Uploads

- **Backups:** `pg_dump shak_panel > backup.sql` regelmäßig sichern (z. B. per Cron) **und** das Verzeichnis `UPLOADS_DIR` mitsichern.
- **E-Mail:** Mit `SMTP_*` versendet das Panel Passwort-Reset-Mails. Ohne SMTP erscheint der Link im Server-Log; Admins können zusätzlich unter *Administration → Mitglieder → ⋮ → Passwort-Link erstellen* einen 24-Stunden-Link erzeugen und weitergeben.
- **Uploads:** Müssen auf persistentem Speicher liegen (Volume), sonst gehen Bilder beim Neustart verloren.
- **Zeitzone:** Termine werden als UTC gespeichert und in `APP_TIMEZONE` ein- und ausgegeben (inkl. Sommer-/Winterzeit).
- **Healthcheck:** `GET /api/health` → `{"status":"ok"}` (prüft die DB-Verbindung).

---

## Bekannte Grenzen

- Keine Zwei-Faktor-Authentifizierung und keine Social Logins.
- Sitzungen laufen nach `SESSION_DAYS` absolut ab (kein gleitendes Verlängern).
- Benachrichtigungen sind nur intern; E-Mail/Push sind vorbereitet, aber nicht aktiv.
- Auto-Erinnerungen werden beim Seitenaufruf erzeugt (kein Hintergrundjob). Für zeitgenaue Mails/Push später einen Cron-Job auf Basis von `syncAutoNotifications` ergänzen.
- `npm audit` meldet Hinweise zu Entwicklungs-/Build-Abhängigkeiten (Prisma-CLI, im Next-Build gebündeltes PostCSS); sie betreffen nicht die zur Laufzeit verarbeiteten Eingaben.
