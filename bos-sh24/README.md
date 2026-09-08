# BOS_SH24 – Presseportal

Vollständige, moderne Presseplattform für BOS_SH24 – gebaut mit Next.js 14 (App Router),
TypeScript, Prisma/SQLite, NextAuth und Tailwind CSS. Frontend, Backend, Datenbank,
Authentifizierung, Rollensystem und Admin-Dashboard sind vollständig miteinander verbunden.

## Features

- **Öffentliche Seiten:** Startseite mit Hero/Top-Themen, Beiträge (mit Kategorie-Filter &
  Pagination), Artikelseiten mit Galerie/Teilen/Ähnliche Beiträge, Veranstaltungen (Liste +
  Filter + Detail), globale Suche, Kontaktformular mit Spam-Schutz, Über uns, Impressum,
  Datenschutz, Cookie-Einstellungen.
- **Benutzerkonten:** Registrierung, Login/Logout, Passwort vergessen/zurücksetzen, Profil
  bearbeiten, Beiträge favorisieren, Benachrichtigungen.
- **Rollensystem:** Besucher, Benutzer, Redakteur, Administrator – serverseitig via
  Middleware & API-Rollenprüfung durchgesetzt.
- **Admin-Dashboard:** Statistiken, Beitragsverwaltung mit Rich-Text-Editor (Tiptap: Bilder,
  Videos, Tabellen, Zitate, Listen, Trennlinien), Veranstaltungsverwaltung, Kategorien,
  Medienbibliothek mit Upload, Benutzerverwaltung, Kontaktanfragen-Verwaltung,
  Website-Einstellungen (inkl. Impressum/Datenschutz), Newsletter-Abonnenten.
- **SEO:** Individuelle Metadaten, Open-Graph, JSON-LD (NewsArticle), sitemap.xml, robots.txt.
- **Sicherheit:** bcrypt-Passwort-Hashing, Zod-Validierung, HTML-Sanitizing (XSS-Schutz),
  Honeypot + Zeitprüfung gegen Spam, Rate-Limiting im Kontaktformular, validierte
  Datei-Uploads, rollenbasierte Zugriffskontrolle auf allen Admin-API-Routen.

## Setup

```bash
npm install
npm run db:push     # Datenbankschema anlegen (SQLite-Datei dev.db)
npm run db:seed      # Realistische Beispieldaten einspielen
npm run dev           # Entwicklungsserver auf http://localhost:3000
```

Für einen Produktions-Build:

```bash
npm run build
npm run start
```

## Demo-Zugangsdaten

Nach dem Seed stehen folgende Test-Konten zur Verfügung (Passwort für alle: `Passwort123!`):

| Rolle          | E-Mail                        |
|----------------|--------------------------------|
| Administrator  | admin@bos-sh24.de              |
| Redakteurin    | mira.jansen@bos-sh24.de        |
| Redakteur      | tom.reimers@bos-sh24.de        |
| Benutzerin     | sophie.wagner@beispiel.de      |
| Benutzer       | jonas.clausen@beispiel.de      |

Alle Beispielinhalte (Beiträge, Veranstaltungen, Kategorien, Kontaktanfragen, Medien) können
vollständig über das Admin-Dashboard unter `/admin` bearbeitet oder gelöscht werden.

## Datenbank umstellen (Postgres/MySQL)

Standardmäßig wird SQLite verwendet (keine externe Datenbank nötig). Für den Produktivbetrieb
in `prisma/schema.prisma` den `provider` im `datasource`-Block anpassen und `DATABASE_URL` in
`.env` entsprechend setzen.

## Hinweis zu E-Mails

E-Mail-Versand (Registrierung, Passwort-Reset) ist als Stub implementiert
(`src/lib/mailer.ts`) und loggt Nachrichten in die Konsole. Für den Produktivbetrieb dort
einen echten SMTP-Versand (z. B. via nodemailer) ergänzen.
