#!/bin/sh
# Legt eine frische, leere E2E-Datenbank an (Migrationen + Demo-Daten). Betrifft nur die Datenbank "hypax_e2e".
set -e
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS hypax_e2e'" 
su postgres -c "psql -q -c 'CREATE DATABASE hypax_e2e OWNER hypax'"
export DATABASE_URL="postgresql://hypax:hypax@localhost:5432/hypax_e2e?schema=public"
npx prisma migrate deploy > /dev/null 2>&1
npx tsx prisma/seed.ts | tail -1 | cut -c1-60
