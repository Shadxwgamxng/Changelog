# HYPAX – Verwaltungs- und Organisationssystem für DRK-Gliederungen

Zentrale Plattform für Helfer, Dienste, Qualifikationen, Verfügbarkeiten, Veranstaltungen, Einsätze, Alarmierung, Fahrzeuge, Material, Dokumente und Kommunikation – mandantenfähig vom kleinen Ortsverein bis zum Kreisverband.

**Stack:** Next.js 15 (App Router, React 19, TypeScript) · PostgreSQL 16 · Prisma · Tailwind · serverseitige Sessions · optionales TOTP-2FA.
**Oberflächendesign:** orientiert an [EmergencyForge/ignis](https://github.com/EmergencyForge/ignis) (dunkel-first, neutrale Flächen, ein Akzent, kompakte Typografie). Die Logos stammen aus `assets/img` dieses Projekts (`public/brand/`).

## Schnellstart (Entwicklung)

```bash
npm install
cp .env.example .env            # DATABASE_URL, APP_ENCRYPTION_KEY, … anpassen
npx prisma migrate deploy       # Schema + Audit-Trigger anlegen
npm run db:seed                 # Demo-Daten (nur Entwicklung!)
npm run dev                     # http://localhost:3000
```

Demo-Konten (Passwort für alle: `Demo#Passwort1`): `admin@demo.hypax.de` (Superadmin), `leitung@…` (Einheitenleiter Ortsverein), `bereitschaft@…` (Bereitschaftsleiter), `planer@…` (Dienstplaner), `max@…` (Helfer), `fremd@…` (andere Einheit).

## Betrieb (Produktion)

1. `.env` aus `.env.example` erzeugen. **Pflicht:** `DATABASE_URL`, `APP_URL`, `APP_ENCRYPTION_KEY` (32 Byte Base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Der Server startet bei unvollständiger Konfiguration nicht.
2. `npm ci && npm run build && npm run start:prod` (führt `prisma migrate deploy` aus) – oder `docker compose up -d` (siehe `Dockerfile`/`docker-compose.yml`).
3. Ersten Administrator anlegen: `npm run bootstrap -- admin@example.org "Sicheres#Passwort1"` (legt auch Standardrollen und DRK-Qualifikationsarten an; Passwortwechsel beim ersten Login erzwungen).
4. **HTTPS-Reverse-Proxy** davorstellen (setzt `X-Forwarded-For`; `APP_URL` mit `https://` aktiviert „Secure“-Cookies).
5. Täglich `npm run maintenance` (Cron) **oder** `POST /api/cron/maintenance` mit `Authorization: Bearer $CRON_SECRET`.
6. Backups: PostgreSQL **und** `STORAGE_DIR` (Dokumente sind AES-256-GCM-verschlüsselt – ohne `APP_ENCRYPTION_KEY` unlesbar; Schlüssel separat sichern!).

## Funktionsumfang (Abgleich mit der Anforderung)

| Bereich | Umsetzung |
|---|---|
| **Rollen & Rechte** | 33 granulare Rechte; Rollenvorlagen (Einheitenleiter, Bereitschaftsleiter, Zugführer, Gruppenführer, Dienstplaner, Helfer, Gast) frei editierbar + eigene Rollen; Zuweisung je Einheit, optional inkl. Untereinheiten; pro Zuweisung zusätzliche Rechte gewähren/entziehen; Systemrollen Superadmin/Systemadmin/Support. Eskalationsschutz: man kann nur Rechte vergeben, die man selbst besitzt. |
| **Mandantenfähigkeit** | Einheitenbaum (Kreisverband → Ortsverein → Bereitschaft/Einsatzeinheit/SEG/Wasserwacht/JRK/…) mit materialisiertem Pfad; jede Abfrage wird über `scopeWhere()` auf berechtigte Einheiten begrenzt. |
| **Dashboard** | persönlich (nächste Dienste/Termine, Anfragen/Einladungen, Alarm, Qualifikationswarnungen, Verfügbarkeit, Aufgaben, Bekanntmachungen) + Führungsübersicht (Besetzung, offene Positionen, Einsatzbereitschaft, Qualifikationen, Stunden, Warnungen). |
| **Helferverwaltung/-profil** | Stammdaten, Organisation, Funktionen, Planungswünsche, Qualifikationen mit Ablaufstatus, Diensthistorie/Stunden, Dokumente, interne Notizen; **feldweise Sichtbarkeit** (Basis / Kontakt / sensibel / Planung / Qualifikationen). |
| **Qualifikationen** | Arten (Gültigkeit, „deckt ab“-Hierarchie, z. B. Rettungssanitäter ⊇ Sanitätshelfer), Ablauf zum **Dienstzeitpunkt** geprüft, Warnung 90/30/7 Tage + abgelaufen, Meldung durch Helfer mit Bestätigung durch die Leitung, Übersicht/Inhaber/Ablaufliste. |
| **Dienstplanung** | Dienste mit Positionen (Anzahl, Funktion, Qualifikationen), Entwurf → veröffentlicht → abgeschlossen/abgesagt, Fahrzeuge und Material mit Doppelbuchungs-/Bestandsprüfung, Selbstanmeldung (bestätigen/ablehnen/Warteliste), Einladungen, Absagen, Stundenbuchung. Kapazitäten werden unter Zeilensperre geprüft (keine Überbuchung). |
| **Intelligente Besetzung** | „Beste Besetzung“: harte Kriterien (Qualifikation, Funktion, Verfügbarkeit, Überschneidung, Ruhezeit, Monatslimit, Status) + gewichteter Passungswert 0–100 % (Verfügbarkeit, Lastverteilung, Ruhepuffer, Wunschzeiten, Selbstmeldung, Einheit); Übernahme wird serverseitig erneut geprüft; Ausnahmen nur mit Override und Audit-Eintrag. |
| **Verfügbarkeit** | Kalender je Helfer (🟢🟡🔴⚪), Zeiträume, private Gründe (nur der Helfer selbst sieht sie), Team-Matrix für Planer. |
| **Kalender** | Monat/Woche/Tag/Liste, Filter (eigene Dienste, Einheit, Veranstaltung, Ausbildung, Besprechung, Einsatz, Fahrzeug, Material), iCalendar-Export + privater Abo-Link. |
| **Veranstaltungen / Einsätze** | Veranstaltung bündelt Dienste und Aufgaben; Einsätze datensparsam (bewusst **keine** Patientendaten-Felder). |
| **Alarmierung** | Empfängerkreis Einheit/Gruppe/Qualifikation/Alarmgruppe, Rückmeldung Ich komme/eventuell/kann nicht, Live-Status (5-s-Aktualisierung), telefonische Nachpflege durch die Leitung. |
| **Fahrzeuge / Material** | Status, Fälligkeiten (TÜV/HU/Versicherung), Wartungen, Kilometerstand; Bestand, Mindestbestand, Ablauf, Wartung, Ausgabe/Rückgabe, Defekt. |
| **Dokumente** | verschlüsselt (AES-256-GCM), versioniert, drei Zugriffsstufen, Typ-/Inhaltsprüfung, Integritätsprüfung (SHA-256), Abrufe im Audit-Log. |
| **Kommunikation** | Nachrichten (einzeln, Einheit, Gruppe, Dienstbesatzung, Führungskräfte), Bekanntmachungen, Benachrichtigungen je Ereignis/Kanal einstellbar (In-App, E-Mail, Web-Push). |
| **Auswertung** | Dienststunden (Helfer/Monat/Einheit/Dienstart), Helfer-, Dienst-, Qualifikations- und Leistungsstatistik, Diagramme, Export PDF/Excel/CSV (mit Formel-Injektionsschutz). |
| **Suche** | globale Suche über alle Bereiche, durch dieselben Rechtefilter wie die Listen. |
| **Mobil** | Mobile-first, Drawer-Navigation, große Touch-Flächen auf Touch-Geräten, PWA (Manifest, Service Worker, installierbar). |

## Datenschutz & Sicherheit

- **Autorisierung zentral:** Weboberfläche und REST-API (`/api/v1`) nutzen dieselben Services; nicht berechtigte Datensätze sind weder sichtbar noch abrufbar (404 statt 403, wo schon die Existenz vertraulich ist). Felder, die man nicht sehen darf, werden gar nicht erst ausgeliefert.
- **Authentifizierung:** scrypt-Passwörter, Passwortrichtlinie, Sperre nach 5 Fehlversuchen, IP-/Konto-Rate-Limit, einheitliche Fehlermeldung, Sitzungen serverseitig (nur Token-**Hash** in der DB), Inaktivitäts-Timeout (30 min) und Maximaldauer (12 h), Abmeldung aller Geräte, optional TOTP-2FA mit Wiederherstellungscodes.
- **CSRF/Header:** Origin-/Fetch-Metadata-Prüfung für die API, Server Actions mit Origin-Prüfung, `SameSite=Lax`, HttpOnly-Cookie, `X-Frame-Options: DENY`, `nosniff`.
- **Audit-Log:** append-only – UPDATE/DELETE/TRUNCATE werden **per Datenbank-Trigger** verweigert; einzige Ausnahme ist die Aufbewahrungs-Bereinigung. Sensible Felder werden in Änderungsprotokollen maskiert.
- **DSGVO:** Datenminimierung (kein Patientenfeld, Mitgliedsnummer nur sichtbar, wo Kontaktdaten sichtbar sind), Auskunft/Export (JSON), Anonymisierung/Löschung, **Löschkonzept** automatisiert (Ausgetretene nach 24 Monaten, Benachrichtigungen 90 Tage, Audit 36 Monate – konfigurierbar).

## Tests

```bash
npm test                  # 18 Unit-Tests (Krypto, TOTP, Zeitzonen, Qualifikationen, Matching, ICS, CSV)
npm run test:integration  # 34 Integrationstests gegen PostgreSQL (DB „hypax_test“ anlegen + migrate deploy)
npm run build && npm run test:e2e   # 28 Browser-/API-Schritte (frische DB „hypax_e2e“, Playwright-Chromium)
```

Abgedeckt u. a.: Mandantentrennung, Feldschutz, Rechte-Eskalation, Dienst-Ablauf (Anmeldung → Entscheidung → Besetzung), Empfehlungs-Korrektheit, Audit-Unveränderlichkeit, Löschkonzept, Upload-Prüfungen, CSRF, Export-Formate, 37 Seiten auf Desktop und Smartphone ohne Fehler/Überlauf.

## Architektur

```
src/lib/        reine Logik ohne DB: Rechtekatalog, Matching, Qualifikationen, Zeit, ICS, CSV, Krypto, TOTP
src/server/     Kontext/Autorisierung (context.ts), Auth, Audit, Benachrichtigungen, Speicher, REST-Router
  services/     Fachlogik je Bereich – jede Funktion prüft Rechte selbst
src/app/        Next.js-Seiten (Server Components), Server Actions, API-Routen
prisma/         Schema, Migrationen (inkl. Audit-Trigger), Seed
```

Erweiterbar: Speicher-Backend über `ObjectStorage` (`src/server/storage.ts`), neue Rechte in `src/lib/permissions.ts`, neue Benachrichtigungstypen im Prisma-Enum + `constants.ts`.

## Bekannte Grenzen (ehrlich benannt)

- **Object Storage:** Dokumente liegen verschlüsselt im Dateisystem (`STORAGE_DIR`). Ein S3-Treiber ist **nicht** enthalten – nur die Schnittstelle dafür.
- **Nicht end-to-end getestet:** E-Mail-Versand (SMTP), Web-Push (benötigt VAPID-Schlüssel und HTTPS), Docker-Image/Compose, mehrere Server-Instanzen (Rate-Limit ist pro Prozess; für Skalierung durch Redis ersetzen).
- **Kein Self-Service „Passwort vergessen“:** Zurücksetzen erfolgt durch die Leitung/Administration (bewusst, da keine garantierte E-Mail-Zustellung).
- **Alarmierung** ist eine App-interne Benachrichtigung (Live-Seite, E-Mail, Push) – keine Anbindung an Funkmeldeempfänger/SMS/Leitstelle.
- **Native iOS/Android-App** nicht enthalten; die PWA deckt die mobilen Kernfunktionen ab.
- **Rechtliches:** Die Logos aus dem ignis-Repository (GPL-3.0; keine eigene Marken-Regelung im Repo erkennbar) sowie DRK-/EmergencyForge-Bezeichnungen sollten vor einer Veröffentlichung hinsichtlich Nutzungsrechten geprüft werden. Eine Datenschutz-Folgenabschätzung und ein Verarbeitungsverzeichnis muss der Betreiber selbst erstellen.
