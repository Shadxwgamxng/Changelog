# HelferNet (em_helfernet) – Dienst- und Helferverwaltung

Webbasierte Plattform von EmergencyForge für Helfer, Dienste, Qualifikationen, Verfügbarkeiten, Veranstaltungen, Lagekarte, Fahrzeuge, Material, Dokumente und Kommunikation – mandantenfähig mit beliebig tiefem Einheitenbaum. Reine Web-Anwendung: Bedienung im Browser (PC, Tablet, Smartphone), keine App.

**Stack:** Next.js 15 (App Router, React 19, TypeScript) · PostgreSQL 16 · Prisma · Tailwind · serverseitige Sessions · optionales TOTP-2FA.

## Installation

Kurzfassung für einen Linux-Server mit Docker und einer Domain, die auf den Server zeigt:

```bash
git clone <repo> && cd <repo>/em_helfernet
sh scripts/install.sh        # fragt die Domain, erzeugt .env mit allen Geheimnissen, startet alles (inkl. HTTPS)
```

Danach im Browser `https://<domain>/setup?token=…` öffnen (Link wird ausgegeben) und Organisation + ersten Administrator anlegen. Ausführlich – inklusive Betrieb ohne Docker, E-Mail, Backups, Updates: **[INSTALLATION.md](INSTALLATION.md)**.

Es werden **keine Beispieldaten** angelegt; die Datenbank startet leer (nur Standardrollen und Standard-Qualifikationsarten).

## Funktionsumfang (Abgleich mit der Anforderung)

| Bereich | Umsetzung |
|---|---|
| **Rollen & Rechte** | 36 granulare Rechte; Rollenvorlagen (Einheitenleiter, Bereitschaftsleiter, Zugführer, Gruppenführer, Dienstplaner, Helfer, Gast) frei editierbar + eigene Rollen; Zuweisung je Einheit, optional inkl. Untereinheiten; pro Zuweisung zusätzliche Rechte gewähren/entziehen; Systemrollen Superadmin/Systemadmin/Support. Eskalationsschutz: man kann nur Rechte vergeben, die man selbst besitzt. |
| **Mandantenfähigkeit** | Einheitenbaum (Kreisverband → Ortsverein → Bereitschaft/Einsatzeinheit/SEG/Wasserwacht/JRK/…) mit materialisiertem Pfad; jede Abfrage wird über `scopeWhere()` auf berechtigte Einheiten begrenzt. |
| **Dashboard** | persönlich (nächste Dienste/Termine, Anfragen/Einladungen, Alarm, Qualifikationswarnungen, Verfügbarkeit, Aufgaben, Bekanntmachungen) + Führungsübersicht (Besetzung, offene Positionen, Einsatzbereitschaft, Qualifikationen, Stunden, Warnungen). |
| **Helferverwaltung/-profil** | Stammdaten, Organisation, Funktionen, Planungswünsche, Qualifikationen mit Ablaufstatus, Diensthistorie/Stunden, Dokumente, interne Notizen; **feldweise Sichtbarkeit** (Basis / Kontakt / sensibel / Planung / Qualifikationen). |
| **Qualifikationen** | Arten (Gültigkeit, „deckt ab“-Hierarchie, z. B. Rettungssanitäter ⊇ Sanitätshelfer), Ablauf zum **Dienstzeitpunkt** geprüft, Warnung 90/30/7 Tage + abgelaufen, Meldung durch Helfer mit Bestätigung durch die Leitung, Übersicht/Inhaber/Ablaufliste. |
| **Dienstplanung** | Dienste mit Positionen (Anzahl, Funktion, Qualifikationen), Entwurf → veröffentlicht → abgeschlossen/abgesagt, Fahrzeuge und Material mit Doppelbuchungs-/Bestandsprüfung, Selbstmeldung für den ganzen Dienst oder nur einen Teil (Zeitraum), Meldeschluss, Einteilen im gemeldeten Zeitraum (außerhalb nur als protokollierte Ausnahme), Positionen können sich zeitlich geteilt werden (Abdeckungsleiste mit Lücken), Warteliste, Einladungen, Absagen, Stundenbuchung nach eingeteiltem Zeitraum. Seite „Meldung abgeben“ für Veranstaltungen mit mehreren Schichten/Abschnitten (je Schicht Uhrzeit von–bis auch über Mitternacht, Bemerkung, Status; bestätigte Meldungen nur durch die Dienstplanung änderbar), Meldeschluss auch je Veranstaltung. Kapazitäten werden unter Zeilensperre geprüft (keine Überbuchung). |
| **Intelligente Besetzung** | „Beste Besetzung“: harte Kriterien (Qualifikation, Funktion, Verfügbarkeit, Überschneidung, Ruhezeit, Monatslimit, Status) + gewichteter Passungswert 0–100 % (Verfügbarkeit, Lastverteilung, Ruhepuffer, Wunschzeiten, Selbstmeldung, Einheit); Übernahme wird serverseitig erneut geprüft; Ausnahmen nur mit Override und Audit-Eintrag. |
| **Verfügbarkeit** | Kalender je Helfer (🟢🟡🔴⚪), Zeiträume, private Gründe (nur der Helfer selbst sieht sie), Team-Matrix für Planer. |
| **Kalender** | Monat/Woche/Tag/Liste, Filter (eigene Dienste, Einheit, Veranstaltung, Ausbildung, Besprechung, Einsatz, Fahrzeug, Material), iCalendar-Export + privater Abo-Link. |
| **Veranstaltungen** | Veranstaltung bündelt Dienste und Aufgaben. |
| **Lagekarte** (nur Sanitätsdienste) | Karte pro Dienst auf Basis der **GTA-V-/FiveM-Karte** (lokale Kacheln unter `public/map/gta`, ca. 31 MB, kein Internet nötig) mit taktischen Zeichen nach DV 102, Fahrzeugen des Dienstes, Linien, Flächen, Texten, Legende, Ortssprüngen, GeoJSON-Export, Druck, Vollbild und Live-Aktualisierung. Bearbeiten mit Recht `shift.edit`. Hinweis: Kartenmaterial stammt aus dem ignis-Repository (© Rockstar Games) – Nutzungsrechte vor einer Veröffentlichung prüfen. |
| **Fahrzeuge / Material** | Status, Fälligkeiten (TÜV/HU/Versicherung), Wartungen, Kilometerstand; Bestand, Mindestbestand, Ablauf, Wartung, Ausgabe/Rückgabe, Defekt. |
| **Dokumente** | verschlüsselt (AES-256-GCM), versioniert, drei Zugriffsstufen, Typ-/Inhaltsprüfung, Integritätsprüfung (SHA-256), Abrufe im Audit-Log. |
| **Kommunikation** | Nachrichten (einzeln, Einheit, Gruppe, Dienstbesatzung, Führungskräfte), Bekanntmachungen, Benachrichtigungen je Ereignis/Kanal einstellbar (In HelferNet, E-Mail). |
| **Auswertung** | Dienststunden (Helfer/Monat/Einheit/Dienstart), Helfer-, Dienst-, Qualifikations- und Leistungsstatistik, Diagramme, Export PDF/Excel/CSV (mit Formel-Injektionsschutz). |
| **Suche** | globale Suche über alle Bereiche, durch dieselben Rechtefilter wie die Listen. |
| **Mobil** | Reine Web-Anwendung, mobile-first: läuft in jedem aktuellen Browser auf PC, Tablet und Smartphone (keine App nötig). |

## Datenschutz & Sicherheit

- **Autorisierung zentral:** Weboberfläche und REST-API (`/api/v1`) nutzen dieselben Services; nicht berechtigte Datensätze sind weder sichtbar noch abrufbar (404 statt 403, wo schon die Existenz vertraulich ist). Felder, die man nicht sehen darf, werden gar nicht erst ausgeliefert.
- **Authentifizierung:** scrypt-Passwörter, Passwortrichtlinie, Sperre nach 5 Fehlversuchen, IP-/Konto-Rate-Limit, einheitliche Fehlermeldung, Sitzungen serverseitig (nur Token-**Hash** in der DB), Inaktivitäts-Timeout (30 min) und Maximaldauer (12 h), Abmeldung aller Geräte, optional TOTP-2FA mit Wiederherstellungscodes.
- **CSRF/Header:** Origin-/Fetch-Metadata-Prüfung für die API, Server Actions mit Origin-Prüfung, `SameSite=Lax`, HttpOnly-Cookie, `X-Frame-Options: DENY`, `nosniff`.
- **Audit-Log:** append-only – UPDATE/DELETE/TRUNCATE werden **per Datenbank-Trigger** verweigert; einzige Ausnahme ist die Aufbewahrungs-Bereinigung. Sensible Felder werden in Änderungsprotokollen maskiert.
- **DSGVO:** Datenminimierung (kein Patientenfeld, Mitgliedsnummer nur sichtbar, wo Kontaktdaten sichtbar sind), Auskunft/Export (JSON), Anonymisierung/Löschung, **Löschkonzept** automatisiert (Ausgetretene nach 24 Monaten, Benachrichtigungen 90 Tage, Audit 36 Monate – konfigurierbar).

## Entwicklung & Tests

```bash
npm install
cp .env.example .env            # DATABASE_URL auf eine lokale PostgreSQL setzen, APP_ENCRYPTION_KEY erzeugen
npx prisma migrate deploy
npm run dev                     # http://localhost:3000 → /setup
npm test                        # Unit-Tests
npm run test:integration        # Integrationstests gegen PostgreSQL (DB „helfernet_test“)
npm run build && npm run test:e2e   # Browser-/API-Ablauf (frische DB „helfernet_e2e“, Playwright-Chromium)
```

Die Testdaten für die automatischen Tests liegen ausschließlich unter `tests/fixtures/` und werden nie in eine echte Installation geladen.

## Architektur

```
src/lib/        reine Logik ohne DB: Rechtekatalog, Matching, Qualifikationen, Zeit, ICS, CSV, Krypto, TOTP
src/server/     Kontext/Autorisierung (context.ts), Auth, Audit, Benachrichtigungen, Speicher, REST-Router
  services/     Fachlogik je Bereich – jede Funktion prüft Rechte selbst
src/app/        Next.js-Seiten (Server Components), Server Actions, API-Routen
prisma/         Schema, Migrationen (inkl. Audit-Trigger)
```

Erweiterbar: Speicher-Backend über `ObjectStorage` (`src/server/storage.ts`), neue Rechte in `src/lib/permissions.ts`, neue Benachrichtigungstypen im Prisma-Enum + `constants.ts`.

## Bekannte Grenzen

- **Object Storage:** Dokumente liegen verschlüsselt im Dateisystem (`STORAGE_DIR`, im Docker-Betrieb ein Volume). Ein S3-Treiber ist nicht enthalten – nur die Schnittstelle dafür.
- **Eine Instanz:** Das Login-Rate-Limit gilt pro Prozess; für mehrere App-Instanzen müsste es z. B. durch Redis ersetzt werden.
- **Kein Self-Service „Passwort vergessen“:** Zurücksetzen erfolgt durch die Leitung/Administration.
- **Rechtliches:** Kartenmaterial der Lagekarte (© Rockstar Games) und verwendete Logos vor einer Veröffentlichung hinsichtlich Nutzungsrechten prüfen. Datenschutz-Folgenabschätzung und Verarbeitungsverzeichnis erstellt der Betreiber.
