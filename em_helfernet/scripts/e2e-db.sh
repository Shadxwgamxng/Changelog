#!/bin/sh
# Legt eine frische, leere E2E-Datenbank an (Migrationen + Test-Daten). Betrifft nur die Datenbank "helfernet_e2e".
set -e
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS helfernet_e2e'" 
su postgres -c "psql -q -c 'CREATE DATABASE helfernet_e2e OWNER helfernet'"
export DATABASE_URL="postgresql://helfernet:helfernet@localhost:5432/helfernet_e2e?schema=public"
npx prisma migrate deploy > /dev/null 2>&1
npx tsx tests/fixtures/demo-seed.ts | tail -1 | cut -c1-60
