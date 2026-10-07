import { requireCtx } from "@/server/session";
import { listUnitTree } from "@/server/services/units";
import { canIn, unitsWith } from "@/server/context";
import { loadUnits } from "@/server/units";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { UNIT_TYPE_LABEL } from "@/lib/constants";
import { createUnitAction, deleteUnitAction, moveUnitAction, updateUnitAction } from "../actions";
import { forbidden } from "@/server/errors";
import { prisma } from "@/server/db";

export const metadata = { title: "Einheiten" };

export default async function UnitsPage() {
  const ctx = await requireCtx();
  const [tree, manageable] = await Promise.all([listUnitTree(ctx), unitsWith(ctx, "unit.manage")]);
  if (!tree.length && !ctx.all) throw forbidden();
  const counts = await prisma.helper.groupBy({ by: ["unitId"], where: { status: "AKTIV" }, _count: { _all: true } });
  const n = new Map(counts.map((c) => [c.unitId, c._count._all]));
  const units = await loadUnits();
  const canManage = (id: string) => ctx.all || canIn(ctx, "unit.manage", units.get(id)!);
  return (
    <>
      <PageHeader title="Einheiten" subtitle="Kreisverband → Ortsverein → Bereitschaft, Einsatzeinheit, SEG, Wasserwacht, Jugendrotkreuz …" />
      <Card pad={false} className="mb-5"><ul className="divide-y divide-line">
        {tree.map((u) => (
          <li key={u.id} className="px-4 py-2.5" style={{ paddingLeft: `${1 + u.depth * 1.5}rem` }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2"><span className="font-medium">{u.name}</span><Badge>{UNIT_TYPE_LABEL[u.type]}</Badge><span className="text-xs text-fg-subtle">{n.get(u.id) ?? 0} aktive Helfer</span></span>
              {canManage(u.id) && <span className="flex gap-1.5"><ActionButton action={deleteUnitAction} fields={{ id: u.id }} variant="ghost" label="Löschen" confirm={`Einheit „${u.name}“ löschen? Nur möglich, wenn sie leer ist.`} /></span>}
            </div>
            {canManage(u.id) && (
              <details className="mt-2"><summary className="text-xs text-info hover:underline">Bearbeiten / verschieben</summary>
                <div className="mt-2 grid gap-3 rounded-md border border-line p-3 sm:grid-cols-2">
                  <ActionForm action={updateUnitAction} className="space-y-2" compact><input type="hidden" name="id" value={u.id} /><input name="name" defaultValue={u.name} className="input" aria-label="Name" /><select name="type" defaultValue={u.type} className="input" aria-label="Typ">{Object.entries(UNIT_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4" /> aktiv</label><SubmitButton small>Speichern</SubmitButton></ActionForm>
                  <ActionForm action={moveUnitAction} className="space-y-2" compact><input type="hidden" name="id" value={u.id} /><select name="parentId" defaultValue={u.parentId ?? ""} className="input" aria-label="Übergeordnete Einheit">{ctx.all && <option value="">— oberste Ebene —</option>}{manageable.filter((m) => !m.path.startsWith(u.path)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><SubmitButton small>Verschieben</SubmitButton></ActionForm>
                </div>
              </details>
            )}
          </li>
        ))}
      </ul></Card>
      {(manageable.length > 0 || ctx.all) && (
        <Collapse summary="＋ Neue Einheit anlegen" open={tree.length === 0}>
          <ActionForm action={createUnitAction} className="grid gap-3 sm:grid-cols-3" resetOnSuccess>
            <Field label="Name" required><input name="name" className="input" required /></Field>
            <Field label="Typ"><select name="type" className="input">{Object.entries(UNIT_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Übergeordnet"><select name="parentId" className="input">{ctx.all && <option value="">— oberste Ebene —</option>}{manageable.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            <div className="sm:col-span-3"><SubmitButton>Anlegen</SubmitButton></div>
          </ActionForm>
        </Collapse>
      )}
    </>
  );
}
