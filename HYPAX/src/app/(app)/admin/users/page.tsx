import { requireCtx } from "@/server/session";
import { hasAnywhere, unitsWith } from "@/server/context";
import { listRoles, listUsers } from "@/server/services/users";
import { loadUnits } from "@/server/units";
import { Badge, Card, Field, PageHeader, Tabs } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { SYSTEM_ROLE_LABEL } from "@/lib/constants";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions";
import { fmtDate } from "@/lib/dates";
import { assignRoleAction, createRoleAction, createStandaloneUserAction, removeRoleAction, resetPwAction, setSystemRoleAction, toggleUserAction, updateRoleAction } from "../actions";
import { forbidden } from "@/server/errors";

export const metadata = { title: "Benutzer & Rollen" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireCtx();
  if (!hasAnywhere(ctx, "user.view") && !hasAnywhere(ctx, "user.manage")) throw forbidden();
  const tab = (await searchParams).tab === "rollen" ? "rollen" : "benutzer";
  const tabs = [{ key: "benutzer", label: "Benutzer", href: "/admin/users" }, { key: "rollen", label: "Rollen & Rechte", href: "/admin/users?tab=rollen" }];
  return (<><PageHeader title="Benutzer & Rollen" subtitle="Rollen gelten pro Einheit – optional samt Untereinheiten. Einzelne Rechte lassen sich je Zuweisung gewähren oder entziehen." /><Tabs tabs={tabs} active={tab} />{tab === "benutzer" ? <Users ctx={ctx} /> : <Roles ctx={ctx} />}</>);
}

async function Users({ ctx }: { ctx: Awaited<ReturnType<typeof requireCtx>> }) {
  const [users, roles, manage, units] = await Promise.all([listUsers(ctx), listRoles(), unitsWith(ctx, "user.manage"), loadUnits()]);
  const canManage = manage.length > 0;
  return (
    <div className="space-y-3">
      {ctx.all && (
        <Collapse summary="＋ Benutzerkonto ohne Helferprofil anlegen (Administrator/Support)"><ActionForm action={createStandaloneUserAction} className="grid gap-3 sm:grid-cols-3"><Field label="E-Mail" required><input type="email" name="email" className="input" required /></Field><Field label="Systemrolle"><select name="systemRole" className="input"><option value="NONE">Keine</option><option value="SUPPORT">Support</option>{ctx.systemRole === "SUPERADMIN" && <><option value="SYSTEMADMIN">Systemadministrator</option><option value="SUPERADMIN">Superadministrator</option></>}</select></Field><div className="flex items-end"><SubmitButton>Anlegen</SubmitButton></div></ActionForm></Collapse>
      )}
      {users.map((u) => (
        <Card key={u.id} pad={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div><p className="font-medium">{u.helper ? `${u.helper.firstName} ${u.helper.lastName}` : u.email}</p><p className="text-xs text-fg-muted">{u.email} · letzter Login {u.lastLoginAt ? fmtDate(u.lastLoginAt) : "nie"}</p></div>
            <div className="flex flex-wrap items-center gap-1.5">{u.systemRole !== "NONE" && <Badge tone="brand">{SYSTEM_ROLE_LABEL[u.systemRole]}</Badge>}{u.totpEnabled && <Badge tone="ok">2FA</Badge>}{!u.active && <Badge tone="danger">Gesperrt</Badge>}</div>
          </div>
          <div className="border-t border-line px-4 py-2.5">
            <ul className="mb-2 flex flex-wrap gap-2">{u.roleAssignments.map((a) => <li key={a.id} className="flex items-center gap-1.5 rounded border border-line bg-bg-2 px-2 py-1 text-xs"><strong>{a.role.name}</strong> · {units.get(a.unitId)?.name}{a.scope === "SUBTREE" ? " (+ Untereinheiten)" : ""}{a.grants.length > 0 && <Badge tone="ok">+{a.grants.length}</Badge>}{a.denies.length > 0 && <Badge tone="danger">−{a.denies.length}</Badge>}{canManage && <ActionButton action={removeRoleAction} fields={{ id: a.id }} variant="ghost" label="✕" confirm="Rolle entziehen?" />}</li>)}{u.roleAssignments.length === 0 && <li className="text-xs text-fg-subtle">Keine Rollen</li>}</ul>
            {canManage && (
              <details><summary className="text-xs text-info hover:underline">Rolle zuweisen / Konto verwalten</summary>
                <div className="mt-3 space-y-4">
                  <ActionForm action={assignRoleAction} className="grid gap-3 sm:grid-cols-4"><input type="hidden" name="userId" value={u.id} /><label className="block"><span className="label">Rolle</span><select name="roleKey" className="input">{roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></label><label className="block"><span className="label">Einheit</span><select name="unitId" className="input">{manage.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label className="block"><span className="label">Geltungsbereich</span><select name="scope" className="input"><option value="UNIT">Nur diese Einheit</option><option value="SUBTREE">Inkl. Untereinheiten</option></select></label><div className="flex items-end"><SubmitButton>Zuweisen</SubmitButton></div>
                    <details className="sm:col-span-4"><summary className="text-xs text-fg-muted hover:underline">Einzelrechte zusätzlich gewähren / entziehen (optional)</summary><div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{ALL_PERMISSIONS.map((p) => <div key={p} className="flex items-center gap-2 text-xs"><label className="flex items-center gap-1"><input type="checkbox" name="grants[]" value={p} /> +</label><label className="flex items-center gap-1"><input type="checkbox" name="denies[]" value={p} /> −</label><span title={PERMISSIONS[p]}>{p}</span></div>)}</div></details>
                  </ActionForm>
                  <div className="flex flex-wrap gap-2"><ActionButton action={resetPwAction} fields={{ userId: u.id }} label="Passwort zurücksetzen" confirm="Neues Initialpasswort erzeugen?" /><ActionButton action={toggleUserAction} fields={{ userId: u.id, ...(u.active ? {} : { active: "on" }) }} label={u.active ? "Konto sperren" : "Konto entsperren"} variant={u.active ? "danger" : "ok"} />
                    {ctx.all && <ActionForm action={setSystemRoleAction} className="flex items-center gap-2" compact><input type="hidden" name="userId" value={u.id} /><select name="role" defaultValue={u.systemRole} className="input !w-auto !min-h-[28px]" aria-label="Systemrolle"><option value="NONE">Keine Systemrolle</option><option value="SUPPORT">Support</option>{ctx.systemRole === "SUPERADMIN" && <><option value="SYSTEMADMIN">Systemadministrator</option><option value="SUPERADMIN">Superadministrator</option></>}</select><SubmitButton small>Setzen</SubmitButton></ActionForm>}</div>
                </div>
              </details>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

async function Roles({ ctx }: { ctx: Awaited<ReturnType<typeof requireCtx>> }) {
  const roles = await listRoles();
  const groups = Object.groupBy(ALL_PERMISSIONS, (p) => p.split(".")[0]);
  const matrix = (r?: { permissions: string[] }) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(groups).map(([g, ps]) => <fieldset key={g}><legend className="label capitalize">{g}</legend><div className="space-y-1">{ps!.map((p) => <label key={p} className="flex items-start gap-2 text-xs"><input type="checkbox" name="permissions[]" value={p} defaultChecked={r?.permissions.includes(p)} disabled={!ctx.all} className="mt-0.5" /><span><code className="text-[11px] text-fg-subtle">{p}</code><br />{PERMISSIONS[p]}</span></label>)}</div></fieldset>)}</div>
  );
  return (
    <div className="space-y-3">
      {!ctx.all && <p className="text-sm text-fg-muted">Rollenvorlagen kann nur die Systemadministration ändern. Du siehst hier, welche Rechte welche Rolle bündelt.</p>}
      {roles.map((r) => (
        <Collapse key={r.id} summary={<span><strong>{r.name}</strong> <span className="ml-2 text-xs text-fg-subtle">{r.permissions.length} Rechte{r.system ? " · Systemrolle" : ""}</span></span>}>
          <p className="mb-3 text-sm text-fg-muted">{r.description}</p>
          <ActionForm action={updateRoleAction} className="space-y-4"><input type="hidden" name="id" value={r.id} />{ctx.all && <div className="grid gap-3 sm:grid-cols-2"><input name="name" defaultValue={r.name} className="input" aria-label="Name" /><input name="description" defaultValue={r.description ?? ""} className="input" aria-label="Beschreibung" /></div>}{matrix(r)}{ctx.all && <SubmitButton>Speichern</SubmitButton>}</ActionForm>
        </Collapse>
      ))}
      {ctx.all && <Collapse summary="＋ Eigene Rolle anlegen"><ActionForm action={createRoleAction} className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Field label="Schlüssel (z. B. FUNKWART)" required><input name="key" className="input" required /></Field><Field label="Name" required><input name="name" className="input" required /></Field><Field label="Beschreibung"><input name="description" className="input" /></Field></div>{matrix()}<SubmitButton>Anlegen</SubmitButton></ActionForm></Collapse>}
    </div>
  );
}
