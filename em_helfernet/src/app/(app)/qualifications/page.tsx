import Link from "next/link";
import { requireCtx } from "@/server/session";
import { hasAnywhere, unitsWith } from "@/server/context";
import { expiringQualifications, listQualTypes, qualificationOverview } from "@/server/services/qualifications";
import { Badge, Card, Empty, PageHeader, Tabs } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { QUAL_CATEGORY_LABEL } from "@/lib/constants";
import { QUAL_STATE_LABEL } from "@/lib/qualification";
import { qualStateTone } from "@/lib/ui-maps";
import { fmtDate } from "@/lib/dates";
import { archiveTypeAction, createTypeAction, restoreTypeAction, updateTypeAction } from "./actions";
import { forbidden } from "@/server/errors";
import { Field } from "@/components/ui";

export const metadata = { title: "Qualifikationen" };

type QT = Awaited<ReturnType<typeof listQualTypes>>[number];

function TypeFields({ t, all }: { t?: QT; all: QT[] }) {
  const others = all.filter((x) => x.id !== t?.id);
  return (
    <>
      <Field label="Bezeichnung" required><input name="name" className="input" required maxLength={120} defaultValue={t?.name} placeholder="z. B. Sanitätshelfer" /></Field>
      <Field label="Kategorie"><select name="category" className="input" defaultValue={t?.category ?? "AUSBILDUNG"}>{Object.entries(QUAL_CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Gültigkeitsdauer (Monate)" hint="Leer = unbegrenzt gültig"><input name="validityMonths" type="number" min={1} max={240} className="input" defaultValue={t?.validityMonths ?? ""} /></Field>
      <Field label="Beschreibung"><input name="description" className="input" maxLength={500} defaultValue={t?.description ?? ""} /></Field>
      {others.length > 0 && <fieldset className="sm:col-span-2"><legend className="label">Deckt zusätzlich ab (z. B. Rettungssanitäter ⊇ Sanitätshelfer)</legend><div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border border-line p-2 sm:grid-cols-2">{others.map((x) => <label key={x.id} className="flex min-h-[28px] items-center gap-2 text-sm"><input type="checkbox" name="covers[]" value={x.id} defaultChecked={t?.covers.includes(x.id)} />{x.name}</label>)}</div></fieldset>}
    </>
  );
}

export default async function QualificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string; days?: string; archiv?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const canView = hasAnywhere(ctx, "qualification.view");
  const manageUnits = await unitsWith(ctx, "qualification.manage");
  if (!canView && !manageUnits.length) throw forbidden();
  const tab = sp.tab === "ablauf" && canView ? "ablauf" : sp.tab === "arten" ? "arten" : "uebersicht";
  const tabs = [{ key: "uebersicht", label: "Übersicht", href: "/qualifications" }, { key: "ablauf", label: "Ablaufende", href: "/qualifications?tab=ablauf" }, { key: "arten", label: "Qualifikationsarten", href: "/qualifications?tab=arten" }];
  const archived = tab === "arten" && sp.archiv === "1";
  const types = await listQualTypes(ctx);
  const archivedTypes = archived ? await listQualTypes(ctx, { archived: true }) : [];
  const canEdit = (t: { unitId: string | null }) => (t.unitId ? manageUnits.some((u) => u.id === t.unitId) : ctx.all);
  return (
    <>
      <PageHeader title="Qualifikationen" subtitle="Wer besitzt was, was läuft ab, was fehlt?" />
      <Tabs tabs={tabs} active={tab} />
      {tab === "uebersicht" && canView && <Overview ctx={ctx} typeId={sp.type} />}
      {tab === "ablauf" && canView && <Expiring ctx={ctx} days={Number(sp.days) || 90} />}
      {tab === "arten" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-fg-muted">Diese Liste wird bei Zertifikaten, Lehrgängen, Dienstanforderungen und im Helferprofil zur Auswahl angeboten.</p>
            <Link className="text-sm text-info hover:underline" href={archived ? "/qualifications?tab=arten" : "/qualifications?tab=arten&archiv=1"}>{archived ? "← Aktive anzeigen" : "Archivierte anzeigen"}</Link>
          </div>
          {!archived && (manageUnits.length > 0 || ctx.all) && (
            <Collapse summary="＋ Neue Qualifikationsart / Ausbildung anlegen">
              <ActionForm action={createTypeAction} className="grid gap-4 sm:grid-cols-2" resetOnSuccess>
                <TypeFields all={types} />
                <Field label="Geltungsbereich"><select name="unitId" className="input">{ctx.all && <option value="">Alle Einheiten (global)</option>}{manageUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
                <div className="flex items-end"><SubmitButton>Anlegen</SubmitButton></div>
              </ActionForm>
            </Collapse>
          )}
          {(archived ? archivedTypes : types).length === 0 ? <Empty title={archived ? "Nichts archiviert" : "Keine Qualifikationsarten"} /> : (
            <Card pad={false}>
              <ul className="divide-y divide-line">{(archived ? archivedTypes : types).map((t) => (
                <li key={t.id} className="px-4 py-3" data-qualtype={t.name}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{t.name} <span className="ml-1 text-xs font-normal text-fg-subtle">{QUAL_CATEGORY_LABEL[t.category]}</span></p>
                      <p className="text-xs text-fg-subtle">{t.validityMonths ? `${t.validityMonths} Monate gültig` : "unbegrenzt gültig"} · {t.holders} Zuordnung(en) · {t.unitName ?? "alle Einheiten"}{t.covers.length ? ` · deckt ab: ${t.covers.map((c) => types.find((x) => x.id === c)?.name).filter(Boolean).join(", ")}` : ""}</p>
                    </div>
                    {canEdit(t) && (archived
                      ? <ActionButton action={restoreTypeAction} fields={{ id: t.id }} label="Wiederherstellen" variant="ok" />
                      : <ActionButton action={archiveTypeAction} fields={{ id: t.id }} variant="ghost" label="Archivieren" confirm={`„${t.name}“ archivieren? Sie wird nicht mehr zur Auswahl angeboten; bestehende Zuordnungen und Zertifikate bleiben erhalten.`} />)}
                  </div>
                  {canEdit(t) && !archived && (
                    <details className="mt-1">
                      <summary className="inline-block cursor-pointer text-xs text-info hover:underline">Bearbeiten</summary>
                      <ActionForm action={updateTypeAction} className="mt-3 grid gap-4 rounded-lg border border-line p-3 sm:grid-cols-2"><input type="hidden" name="id" value={t.id} /><TypeFields t={t} all={types} /><div><SubmitButton small>Speichern</SubmitButton></div></ActionForm>
                    </details>
                  )}
                </li>
              ))}</ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

async function Overview({ ctx, typeId }: { ctx: Awaited<ReturnType<typeof requireCtx>>; typeId?: string }) {
  const rows = await qualificationOverview(ctx);
  if (!rows.length) return <Empty title="Keine Qualifikationsarten" />;
  const sel = rows.find((r) => r.id === typeId);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2" pad={false}><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Qualifikation</th><th className="text-right">Gültig</th><th className="text-right">Läuft ab</th><th className="text-right">Abgelaufen</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id} className={`row-link ${sel?.id === r.id ? "bg-fill-2" : ""}`}><td><Link className="font-medium hover:underline" href={`/qualifications?type=${r.id}`}>{r.name}</Link><span className="block text-xs text-fg-subtle">{QUAL_CATEGORY_LABEL[r.category]}</span></td><td className="text-right tabular-nums">{r.valid}</td><td className="text-right tabular-nums">{r.expiring ? <Badge tone="warn">{r.expiring}</Badge> : "–"}</td><td className="text-right tabular-nums">{r.expired ? <Badge tone="danger">{r.expired}</Badge> : "–"}</td></tr>)}
      </tbody></table></div></Card>
      <Card title={sel ? `Inhaber: ${sel.name}` : "Inhaber"}>
        {!sel ? <p className="text-sm text-fg-muted">Wähle links eine Qualifikation, um die Inhaber zu sehen. Qualifikationen, die eine andere abdecken, zählen mit.</p> : sel.holders.length === 0 ? <p className="text-sm text-fg-muted">Niemand im sichtbaren Bereich.</p> : <ul className="divide-y divide-line">{sel.holders.map((h) => <li key={h.id}><Link href={`/helpers/${h.id}?tab=qualifikationen`} className="flex items-center justify-between gap-2 py-2 text-sm hover:underline"><span>{h.name}</span><Badge tone={qualStateTone[h.state]}>{QUAL_STATE_LABEL[h.state]}</Badge></Link></li>)}</ul>}
      </Card>
    </div>
  );
}

async function Expiring({ ctx, days }: { ctx: Awaited<ReturnType<typeof requireCtx>>; days: number }) {
  const rows = await expiringQualifications(ctx, days, true);
  return (
    <>
      <form className="mb-4 flex items-center gap-2 text-sm"><input type="hidden" name="tab" value="ablauf" />Zeitraum:<select name="days" defaultValue={days} className="input !w-auto">{[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} Tage</option>)}</select><button className="btn btn-sm">Anzeigen</button></form>
      {rows.length === 0 ? <Empty title="Nichts läuft ab" text="Alle gültigen Qualifikationen reichen über den gewählten Zeitraum hinaus." /> : (
        <Card pad={false}><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Helfer</th><th>Einheit</th><th>Qualifikation</th><th>Gültig bis</th><th>Status</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id} className="row-link"><td><Link href={`/helpers/${r.helperId}?tab=qualifikationen`} className="font-medium hover:underline">{r.helperName}</Link></td><td className="text-fg-muted">{r.unitName}</td><td>{r.typeName}</td><td>{fmtDate(r.validUntil)}</td><td><Badge tone={qualStateTone[r.state]}>{r.daysLeft < 0 ? `${QUAL_STATE_LABEL[r.state]} seit ${-r.daysLeft} T.` : `in ${r.daysLeft} Tagen`}</Badge></td></tr>)}
        </tbody></table></div></Card>
      )}
    </>
  );
}
