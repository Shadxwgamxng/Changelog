-- Umbenennung HYPAX → HelferNet: Schutzfunktion des Audit-Logs unter neuem Namen und mit neuer Session-Einstellung.
CREATE OR REPLACE FUNCTION helfernet_audit_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('helfernet.allow_audit_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditLog ist unveränderlich (% verweigert)', TG_OP USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable_row ON "AuditLog";
DROP TRIGGER IF EXISTS audit_log_immutable_truncate ON "AuditLog";
CREATE TRIGGER audit_log_immutable_row
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION helfernet_audit_immutable();
CREATE TRIGGER audit_log_immutable_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION helfernet_audit_immutable();
DROP FUNCTION IF EXISTS hypax_audit_immutable();
