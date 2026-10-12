-- Audit-Log ist append-only: UPDATE, DELETE und TRUNCATE werden von der Datenbank verweigert.
-- Einzige Ausnahme: die Aufbewahrungsfrist-Bereinigung (scripts/maintenance.ts) setzt innerhalb
-- ihrer Transaktion `SET LOCAL hypax.allow_audit_purge = 'on'` und darf dann ausschließlich löschen.
CREATE OR REPLACE FUNCTION hypax_audit_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('hypax.allow_audit_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditLog ist unveränderlich (% verweigert)', TG_OP USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable_row
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION hypax_audit_immutable();

CREATE TRIGGER audit_log_immutable_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION hypax_audit_immutable();
