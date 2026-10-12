import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil } from "lucide-react";
import { requireCtx } from "@/server/session";
import { helperWithAccess, serializeHelper } from "@/server/services/helpers";
import { listHelperQualifications, listQualTypes } from "@/server/services/qualifications";
import { shiftHistory, upcomingForHelper } from "@/server/services/shifts";
import { listDocuments } from "@/server/services/documents";
import { getAvailability } from "@/server/services/availability";
import { ownHours } from "@/server/services/stats";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { canIn } from "@/server/context";
import { Avatar, Badge, Card, Dl, Empty, LinkButton, Tabs } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { AVAILABILITY_EMOJI, AVAILABILITY_LABEL, DOC_CATEGORY_LABEL, FUNCTION_LABEL, HELPER_STATUS_LABEL, QUAL_CATEGORY_LABEL, SHIFT_KIND_LABEL } from "@/lib/constants";
import { assignmentTone, helperStatusTone, qualStateTone } from "@/lib/ui-maps";
import { QUAL_STATE_LABEL } from "@/lib/qualification";
import { berlinParts, fmtDate, fmtHours, fmtRange, parseDateOnly } from "@/lib/dates";
import * as A from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const r = await helperWithAccess(ctx, id).catch(() => null);
  return { title: r ? `${r.helper.firstName} ${r.helper.lastName}` : "Helfer" };
}

export default async function HelperProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (await searchParams).tab ?? "uebersicht";
  const ctx = await requireCtx();
  const r = await helperWithAccess(ctx, id).catch(() => null);
  if (!r) notFound();
  const { helper, access, unit } = r;
  const h = serializeHelper(helper, access, unit.name);
  const name = `${helper.firstName} ${helper.lastName}`;
  const canManageQuals = canIn(ctx, "qualification.manage", unit);
  const canExport = access.self || canIn(ctx, "helper.export", unit);
  const canDelete = canIn(ctx, "helper.delete", unit);
  const canUsers = canIn(ctx, "user.manage", unit);
  const showQuals = access.quals;

  const today = parseDateOnly(new Date().toISOString().slice(0, 10))!;
  const [quals, upcoming, avail, docs, hours, history, account] = await Promise.all([
    showQuals ? listHelperQualifications(ctx, id) : [],
    access.self || access.planning || access.quals ? upcomingForHelper(id, 6) : [],
    access.planning ? getAvailability(ctx, id, today, new Date(today.getTime() + 14 * 86_400_000)) : [],
    tab === "dokumente" || tab === "uebersicht" ? listDocuments(ctx, { ownerHelperId: id }) : [],
    access.self ? ownHours({ ...ctx, helperId: id }, berlinParts(new Date()).y) : null,
    tab === "dienste" && (access.self || access.planning || access.quals) ? shiftHistory(ctx, id, 60) : [],
    helper.userId && canUsers ? prisma.user.findUnique({ where: { id: helper.userId }, select: { id: true, email: true, active: true, totpEnabled: true, lastLoginAt: true } }) : null,
  ]);
  const typeOptions = showQuals && (canManageQuals || access.self) ? await listQualTypes(ctx) : [];
  const current = avail.find((a) => a.startDate <= today && a.endDate >= today);
  const totalMinutes = history.reduce((s, x) => s + (x.workedMinutes ?? 0), 0);
  const training = history.filter((x) => x.kind === "AUSBILDUNG" && x.status === "ABGESCHLOSSEN");
  const valid = quals.filter((q) => q.state === "GUELTIG" || q.state === "LAEUFT_AB");
  const base = `/helpers/${id}`;
  const tabs = [
    { key: "uebersicht", label: "Übersicht", href: base },
    ...(showQuals ? [{ key: "qualifikationen", label: `Qualifikationen${quals.some((q) => q.state === "ABGELAUFEN" || q.state === "LAEUFT_AB") ? " ⚠" : ""}`, href: `${base}?tab=qualifikationen` }] : []),
    ...(access.self || access.planning || access.quals ? [{ key: "dienste", label: "Dienste & Stunden", href: `${base}?tab=dienste` }] : []),
    { key: "dokumente", label: "Dokumente", href: `${base}?tab=dokumente` },
    ...(access.sensitive ? [{ key: "notizen", label: "Interne Notizen", href: `${base}?tab=notizen` }] : []),
    ...(canExport || canDelete || canUsers ? [{ key: "zugang", label: "Zugang & Datenschutz", href: `${base}?tab=zugang` }] : []),
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={64} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
            <p className="text-sm text-fg-muted">{unit.name}{helper.dienststellung ? ` · ${helper.dienststellung}` : ""}{helper.groupName ? ` · ${helper.groupName}` : ""}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone={helperStatusTone[helper.status]}>{HELPER_STATUS_LABEL[helper.status]}</Badge>
              {helper.functions.map((f) => <Badge key={f} tone="neutral">{FUNCTION_LABEL[f] ?? f}</Badge>)}
              {helper.leadershipRole && <Badge tone="brand">{helper.leadershipRole}</Badge>}
              {access.planning && <Badge tone={current ? (current.status === "VERFUEGBAR" ? "ok" : current.status === "EINGESCHRAENKT" ? "warn" : "danger") : "neutral"}>{AVAILABILITY_EMOJI[current?.status ?? "NONE"]} {current ? AVAILABILITY_LABEL[current.status] : "Keine Angabe"}</Badge>}
            </div>
          </div>
        </div>
        {access.edit && helper.status !== "ANONYMISIERT" && <LinkButton href={`${base}/edit`}><Pencil className="h-4 w-4" />Bearbeiten</LinkButton>}
      </div>
      <Tabs tabs={tabs} active={tabs.some((t) => t.key === tab) ? tab : "uebersicht"} />

      {tab === "uebersicht" || !tabs.some((t) => t.key === tab) ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Card title="Nächste Dienste">
              {upcoming.length === 0 ? <p className="text-sm text-fg-muted">Keine anstehenden Dienste.</p> : (
                <ul className="divide-y divide-line">{upcoming.map((s) => <li key={s.shiftId}><Link href={`/shifts/${s.shiftId}`} className="flex min-h-[52px] items-center gap-3 py-2.5"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.name}</span><span className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</span></span><Badge tone={assignmentTone[s.status]}>{s.status === "BESTAETIGT" ? "Zugesagt" : s.status === "ANGEFRAGT" ? "Angefragt" : s.status === "EINGELADEN" ? "Eingeladen" : "Warteliste"}</Badge></Link></li>)}</ul>
              )}
            </Card>
            {showQuals && (
              <Card title="Qualifikationen" action={<Link className="text-sm text-info hover:underline" href={`${base}?tab=qualifikationen`}>Alle</Link>}>
                {quals.length === 0 ? <p className="text-sm text-fg-muted">Noch keine Qualifikationen eingetragen.</p> : <ul className="flex flex-wrap gap-2">{valid.concat(quals.filter((q) => !valid.includes(q))).map((q) => <li key={q.id}><Badge tone={qualStateTone[q.state]}>{q.typeName}{q.state === "LAEUFT_AB" ? ` · ${q.daysLeft} T.` : q.state === "ABGELAUFEN" ? " · abgelaufen" : ""}</Badge></li>)}</ul>}
              </Card>
            )}
            {hours && (
              <Card title={`Dienststunden ${berlinParts(new Date()).y}`}>
                <div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-semibold">{fmtHours(hours.totalMinutes)}</p><p className="text-xs text-fg-muted">gesamt</p></div><div><p className="text-2xl font-semibold">{hours.shifts}</p><p className="text-xs text-fg-muted">Dienste</p></div><div><p className="text-2xl font-semibold">{fmtHours(hours.trainingMinutes)}</p><p className="text-xs text-fg-muted">Ausbildung</p></div></div>
              </Card>
            )}
          </div>
          <div className="space-y-5">
            <Card title="Kontakt & Stammdaten">
              <Dl items={[
                ["Mitgliedsnummer", "memberNumber" in h ? h.memberNumber : null], ["E-Mail", "email" in h && h.email ? <a key="e" className="text-info hover:underline" href={`mailto:${h.email}`}>{h.email}</a> : null],
                ["Telefon", "phone" in h && h.phone ? <a key="p" className="text-info hover:underline" href={`tel:${h.phone}`}>{h.phone}</a> : null],
                ["Adresse", "street" in h && (h.street || h.city) ? `${h.street ?? ""}, ${h.zip ?? ""} ${h.city ?? ""}` : null], ["Eintritt", "joinedAt" in h && h.joinedAt ? fmtDate(h.joinedAt) : null],
                ["Geburtsdatum", "birthDate" in h && h.birthDate ? fmtDate(h.birthDate) : null],
              ]} />
              {!access.contact && <p className="text-sm text-fg-muted">Kontaktdaten sind für dich nicht freigegeben.</p>}
            </Card>
            {access.planning && (
              <Card title="Planungswünsche">
                <Dl items={[["Max. Dienste/Monat", "maxShiftsPerMonth" in h ? h.maxShiftsPerMonth ?? "unbegrenzt" : null], ["Ruhezeit", "minRestHours" in h ? `${h.minRestHours} h` : null], ["Bevorzugte Dienste", "preferredKinds" in h && h.preferredKinds && h.preferredKinds.length ? h.preferredKinds.map((k) => SHIFT_KIND_LABEL[k]).join(", ") : null]]} />
              </Card>
            )}
            {access.self && <Card title="Mein Profil"><p className="mb-3 text-sm text-fg-muted">Du kannst deine Kontaktdaten und Planungswünsche selbst pflegen.</p><OwnProfileForm h={h as never} /></Card>}
          </div>
        </div>
      ) : null}

      {tab === "qualifikationen" && showQuals && (
        <div className="space-y-5">
          <Card pad={false}>
            {quals.length === 0 ? <div className="p-5"><Empty title="Keine Qualifikationen" /></div> : (
              <div className="overflow-x-auto"><table className="tbl">
                <thead><tr><th>Qualifikation</th><th className="hidden sm:table-cell">Kategorie</th><th>Ausgestellt</th><th>Gültig bis</th><th>Status</th><th className="hidden md:table-cell">Nachweis</th>{canManageQuals && <th />}</tr></thead>
                <tbody>{quals.map((q) => (
                  <tr key={q.id}>
                    <td className="font-medium">{q.typeName}{q.note && <span className="block text-xs font-normal text-fg-muted">{q.note}</span>}</td>
                    <td className="hidden text-fg-muted sm:table-cell">{QUAL_CATEGORY_LABEL[q.category as keyof typeof QUAL_CATEGORY_LABEL]}</td>
                    <td className="text-fg-muted">{q.issuedAt ? fmtDate(q.issuedAt) : "–"}</td>
                    <td className="text-fg-muted">{q.validUntil ? fmtDate(q.validUntil) : "unbegrenzt"}</td>
                    <td><Badge tone={qualStateTone[q.state]}>{QUAL_STATE_LABEL[q.state]}{q.state === "LAEUFT_AB" ? ` (${q.daysLeft} T.)` : ""}</Badge></td>
                    <td className="hidden md:table-cell">{q.documentId ? <Link className="text-info hover:underline" href={`/documents/${q.documentId}`}>Dokument</Link> : "–"}</td>
                    {canManageQuals && <td className="whitespace-nowrap text-right">
                      {q.state === "IN_PRUEFUNG" && <ActionButton action={A.approveQualAction} fields={{ id: q.id }} variant="ok" label="Bestätigen" className="mr-1" />}
                      <ActionButton action={A.removeQualAction} fields={{ id: q.id }} variant="ghost" label="Entfernen" confirm="Qualifikation entfernen?" />
                    </td>}
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
          {(canManageQuals || access.self) && helper.status !== "ANONYMISIERT" && (
            <Card title={canManageQuals ? "Qualifikation eintragen" : "Qualifikation melden (wird von der Leitung geprüft)"}>
              <ActionForm action={A.addQualAction} className="grid gap-4 sm:grid-cols-2" resetOnSuccess>
                <input type="hidden" name="helperId" value={id} />
                <label className="block sm:col-span-2"><span className="label">Qualifikation</span><select name="typeId" className="input" required><option value="">— wählen —</option>{Object.entries(Object.groupBy(typeOptions, (t) => t.category)).map(([cat, ts]) => <optgroup key={cat} label={QUAL_CATEGORY_LABEL[cat as keyof typeof QUAL_CATEGORY_LABEL]}>{ts!.map((t) => <option key={t.id} value={t.id}>{t.name}{t.validityMonths ? ` (${t.validityMonths} Mon. gültig)` : ""}</option>)}</optgroup>)}</select></label>
                <label className="block"><span className="label">Ausstellungsdatum</span><input type="date" name="issuedAt" className="input" /></label>
                <label className="block"><span className="label">Gültig bis</span><input type="date" name="validUntil" className="input" /><span className="hint">Leer lassen: wird aus Ausstellungsdatum + Gültigkeitsdauer berechnet.</span></label>
                <label className="block sm:col-span-2"><span className="label">Bemerkung</span><input name="note" className="input" maxLength={500} /></label>
                {docs.filter((d) => d.category === "QUALIFIKATIONSNACHWEIS").length > 0 && <label className="block sm:col-span-2"><span className="label">Nachweis-Dokument</span><select name="documentId" className="input"><option value="">— keins —</option>{docs.filter((d) => d.category === "QUALIFIKATIONSNACHWEIS").map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>}
                <div className="sm:col-span-2"><SubmitButton>Speichern</SubmitButton></div>
              </ActionForm>
            </Card>
          )}
        </div>
      )}

      {tab === "dienste" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3"><Card><p className="text-2xl font-semibold">{history.length}</p><p className="text-xs text-fg-muted">Dienste (letzte 60)</p></Card><Card><p className="text-2xl font-semibold">{fmtHours(totalMinutes)}</p><p className="text-xs text-fg-muted">geleistete Stunden</p></Card><Card><p className="text-2xl font-semibold">{training.length}</p><p className="text-xs text-fg-muted">absolvierte Ausbildungen</p></Card></div>
          <Card title="Diensthistorie" pad={false}>
            {history.length === 0 ? <div className="p-5"><Empty title="Noch keine Dienste" /></div> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Datum</th><th>Dienst</th><th className="hidden sm:table-cell">Position</th><th>Art</th><th className="text-right">Stunden</th></tr></thead><tbody>{history.map((s) => <tr key={s.shiftId} className="row-link"><td className="whitespace-nowrap text-fg-muted">{fmtDate(s.startsAt)}</td><td><Link href={`/shifts/${s.shiftId}`} className="font-medium hover:underline">{s.name}</Link></td><td className="hidden text-fg-muted sm:table-cell">{s.position ?? "–"}</td><td><Badge>{SHIFT_KIND_LABEL[s.kind]}</Badge></td><td className="text-right tabular-nums">{s.workedMinutes != null ? fmtHours(s.workedMinutes) : s.status === "OFFEN" ? "geplant" : "–"}</td></tr>)}</tbody></table></div>}
          </Card>
        </div>
      )}

      {tab === "dokumente" && (
        <Card title="Dokumente" action={(access.self || canIn(ctx, "document.manage", unit)) && <LinkButton href={`/documents/new?helper=${id}`} size="sm">Hochladen</LinkButton>}>
          {docs.length === 0 ? <Empty title="Keine Dokumente" text="Hier erscheinen persönliche Nachweise, soweit du sie sehen darfst." /> : <ul className="divide-y divide-line">{docs.map((d) => <li key={d.id}><Link href={`/documents/${d.id}`} className="flex min-h-[52px] items-center justify-between gap-3 py-2.5"><span className="font-medium">{d.title}</span><span className="text-sm text-fg-muted">{DOC_CATEGORY_LABEL[d.category]} · v{d.version}{d.expiresAt ? ` · bis ${fmtDate(d.expiresAt)}` : ""}</span></Link></li>)}</ul>}
        </Card>
      )}

      {tab === "notizen" && access.sensitive && (
        <Card title="Interne Notizen"><p className="prose-plain">{(h as { internalNotes?: string | null }).internalNotes || "Keine Notizen."}</p><p className="mt-4 text-xs text-fg-subtle">Nur sichtbar für Führungskräfte mit Berechtigung „sensible Daten“. Der Helfer selbst sieht diese Notizen nicht. Änderungen werden protokolliert.</p></Card>
      )}

      {tab === "zugang" && (
        <div className="space-y-5">
          {canUsers && (
            <Card title="Benutzerkonto">
              {account ? (
                <div className="space-y-3 text-sm">
                  <Dl items={[["E-Mail", account.email], ["Status", account.active ? "Aktiv" : "Deaktiviert"], ["2-Faktor", account.totpEnabled ? "aktiviert" : "nicht aktiviert"], ["Letzte Anmeldung", account.lastLoginAt ? fmtDate(account.lastLoginAt) : "noch nie"]]} />
                  <div className="flex flex-wrap gap-2">
                    <ActionButton action={A.resetPasswordAction} fields={{ userId: account.id }} label="Passwort zurücksetzen" confirm="Neues Initialpasswort erzeugen? Alle Sitzungen werden beendet." />
                    <ActionButton action={A.toggleAccountAction} fields={{ userId: account.id, ...(account.active ? {} : { active: "on" }) }} label={account.active ? "Konto sperren" : "Konto entsperren"} variant={account.active ? "danger" : "ok"} confirm={account.active ? "Konto sperren?" : undefined} />
                  </div>
                </div>
              ) : (
                <ActionForm action={A.createAccountAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="helperId" value={id} /><label className="block"><span className="label">E-Mail für die Anmeldung</span><input className="input" type="email" name="email" required defaultValue={"email" in h ? h.email ?? "" : ""} /></label><label className="block"><span className="label">Initialpasswort (optional)</span><input className="input" name="password" autoComplete="off" placeholder="leer = automatisch erzeugen" /></label><div className="sm:col-span-2"><SubmitButton>Konto anlegen</SubmitButton><p className="hint">Das Passwort muss beim ersten Login geändert werden. Rollen vergibst du unter Administration → Benutzer & Rollen.</p></div></ActionForm>
              )}
            </Card>
          )}
          {canExport && (
            <Card title="Datenauskunft (Art. 15 DSGVO)"><p className="mb-3 text-sm text-fg-muted">Exportiert alle zu {access.self ? "dir" : "dieser Person"} gespeicherten Daten als JSON. Der Export wird protokolliert.</p><a className="btn" href={`/api/v1/helpers/${id}/export`} download><Download className="h-4 w-4" />Daten exportieren</a></Card>
          )}
          {canDelete && access.basic && helper.status !== "ANONYMISIERT" && (
            <Card title="Status & Löschung">
              <ActionForm action={A.statusAction} className="mb-5 flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={id} /><label className="block"><span className="label">Status ändern</span><select name="status" className="input !w-48" defaultValue={helper.status}>{["AKTIV", "PASSIV", "INAKTIV", "AUSGETRETEN"].map((s) => <option key={s} value={s}>{HELPER_STATUS_LABEL[s as keyof typeof HELPER_STATUS_LABEL]}</option>)}</select></label><SubmitButton>Übernehmen</SubmitButton></ActionForm>
              <Collapse summary={<span className="text-danger">Helfer anonymisieren (DSGVO-Löschung)</span>}>
                <p className="mb-3 text-sm text-fg-muted">Entfernt Name, Kontaktdaten, Qualifikationen, Dokumente und das Benutzerkonto unwiderruflich. Dienstzeiten bleiben anonym für Statistiken erhalten. Ausgetretene Helfer werden nach {env.retainLeftHelperMonths} Monaten automatisch anonymisiert.</p>
                <ActionForm action={A.anonymizeAction} className="flex flex-wrap items-end gap-3"><input type="hidden" name="id" value={id} /><label className="block"><span className="label">Zur Bestätigung „LÖSCHEN“ eintippen</span><input className="input !w-48" name="confirm" autoComplete="off" /></label><SubmitButton variant="danger">Endgültig anonymisieren</SubmitButton></ActionForm>
              </Collapse>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function OwnProfileForm({ h }: { h: Record<string, unknown> }) {
  const v = (k: string) => (h[k] as string | null) ?? "";
  return (
    <ActionForm action={A.updateOwnProfileAction} className="space-y-3">
      <label className="block"><span className="label">E-Mail</span><input className="input" type="email" name="email" defaultValue={v("email")} /></label>
      <label className="block"><span className="label">Telefon</span><input className="input" name="phone" type="tel" defaultValue={v("phone")} /></label>
      <label className="block"><span className="label">Straße</span><input className="input" name="street" defaultValue={v("street")} /></label>
      <div className="grid grid-cols-3 gap-3"><label className="block"><span className="label">PLZ</span><input className="input" name="zip" defaultValue={v("zip")} /></label><label className="col-span-2 block"><span className="label">Ort</span><input className="input" name="city" defaultValue={v("city")} /></label></div>
      <label className="block"><span className="label">Max. Dienste pro Monat</span><input className="input" type="number" min={0} max={60} name="maxShiftsPerMonth" defaultValue={(h.maxShiftsPerMonth as number | null) ?? ""} /></label>
      <SubmitButton>Speichern</SubmitButton>
    </ActionForm>
  );
}
