// Muss als ERSTER Import geladen werden: richtet die Test-Datenbank ein.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://hypax:hypax@localhost:5432/hypax_test?schema=public";
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.STORAGE_DIR = process.env.STORAGE_DIR || "/tmp/hypax-test-storage";
