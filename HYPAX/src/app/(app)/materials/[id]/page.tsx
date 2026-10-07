import { notFound } from "next/navigation";
import { requireCtx } from "@/server/session";
import { getMaterial } from "@/server/services/materials";
import { helperOptions } from "@/server/services/helpers";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { MATERIAL_STATUS_LABEL } from "@/lib/constants";
import { materialTone } from "@/lib/ui-maps";
import { fmtDateTime, fmtDate } from "@/lib/dates";
import { deleteMaterialAction, issueAction, returnAction, updateMaterialAction } from "../actions";
import { MaterialFields } from "../material-fields";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMaterial(await requireCtx(), (await params).id).catch(() => null);
  return { title: m?.name ?? "Material" };
}

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const m = await getMaterial(ctx, id).catch(() => null);
  if (!m) notFound();
  const helpers = m.canManage ? await helperOptions(ctx, m.unitId) : [];
  const open = m.history.filter((h) => !h.returnedAt);
  return (
    <>
      <PageHeader title={m.name} back={{ href: "/materials", label: "Material" }} subtitle={[m.category, m.unitName, m.location].filter(Boolean).join(" · ")} actions={<Badge tone={materialTone[m.status]}>{MATERIAL_STATUS_LABEL[m.status]}</Badge>} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Verfügbar" value={m.available} tone={m.flags.includes("MINDESTBESTAND") ? "danger" : undefined} /><Stat label="Bestand" value={m.quantity} sub={m.minQuantity ? `Mindestbestand ${m.minQuantity}` : undefined} /><Stat label="Ausgegeben" value={m.issuedOut} /><Stat label="Ablauf / Wartung" value={m.expiresAt ? fmtDate(m.expiresAt) : "–"} sub={m.maintenanceDue ? `Wartung ${fmtDate(m.maintenanceDue)}` : undefined} /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Ausgabe & Rückgabe" pad={false}>
          {m.canManage && <div className="border-b border-line p-4"><ActionForm action={issueAction} className="grid gap-3 sm:grid-cols-4" resetOnSuccess><input type="hidden" name="id" value={id} /><label className="block sm:col-span-2"><span className="label">An Helfer</span><select name="helperId" className="input" required><option value="">— wählen —</option>{helpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><label className="block"><span className="label">Menge</span><input name="quantity" type="number" min={1} defaultValue={1} className="input" /></label><div className="flex items-end"><SubmitButton>Ausgeben</SubmitButton></div></ActionForm></div>}
          {m.history.length === 0 ? <p className="p-4 text-sm text-fg-muted">Noch keine Ausgaben.</p> : <ul className="divide-y divide-line">{m.history.map((h) => <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"><span><strong>{h.quantity}×</strong> {h.helperName}<span className="block text-xs text-fg-subtle">{fmtDateTime(h.issuedAt)}{h.returnedAt ? ` → zurück ${fmtDateTime(h.returnedAt)}` : ""}</span></span>{!h.returnedAt && (m.canManage ? <ActionButton action={returnAction} fields={{ issueId: h.id }} label="Rücknahme" /> : <Badge tone="warn">ausgegeben</Badge>)}</li>)}</ul>}
          {open.length > 0 && <p className="border-t border-line px-4 py-2 text-xs text-fg-subtle">{open.length} offene Ausgabe(n)</p>}
        </Card>
        {m.canManage && (
          <div className="space-y-5">
            <Card title="Bearbeiten"><ActionForm action={updateMaterialAction} className="space-y-4"><input type="hidden" name="id" value={id} /><MaterialFields m={m as never} helpers={helpers} /><SubmitButton>Speichern</SubmitButton></ActionForm></Card>
            <ActionButton action={deleteMaterialAction} fields={{ id }} variant="ghost" small={false} label="Material löschen" confirm="Material löschen?" />
          </div>
        )}
      </div>
    </>
  );
}
