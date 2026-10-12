// Muss als ERSTER Import geladen werden: richtet die Test-Datenbank ein.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://helfernet:helfernet@localhost:5432/helfernet_test?schema=public";
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.STORAGE_DIR = process.env.STORAGE_DIR || "/tmp/helfernet-test-storage";
