import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Map as MapIcon, MapPin, Pencil, Truck, Package } from "lucide-react";
import { requireCtx } from "@/server/session";
import { getShift, getRecommendation } from "@/server/services/shifts";
import { helperOptions } from "@/server/services/helpers";
import { listVehicles } from "@/server/services/vehicles";
import { listMaterials } from "@/server/services/materials";
import { Badge, Card, Dl, Empty, LinkButton, ProgressBar } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, RowsEditor, SubmitButton } from "@/components/forms";
import { ASSIGNMENT_STATUS_LABEL, FUNCTION_LABEL, SHIFT_KIND_LABEL, SHIFT_STATUS_LABEL, VEHICLE_STATUS_EMOJI, VEHICLE_STATUS_LABEL } from "@/lib/constants";
import { assignmentTone, shiftStatusTone } from "@/lib/ui-maps";
import { fmtDateTime, fmtRange, fmtLong, hoursBetween } from "@/lib/dates";
import * as A from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const s = await getShift(ctx, id).catch(() => null);
  return { title: s?.name ?? "Dienst" };
}

export default async function ShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const s = await getShift(ctx, id).catch(() => null);
  if (!s) notFound();
  const { perms, summary: sum } = s;
  const live = s.status === "OFFEN" || s.status === "ENTWURF";
  const [rec, helperOpts, vehicles, materials] = await Promise.all([
    perms.staff && live ? getRecommendation(ctx, id).catch(() => null) : null,
    perms.staff && live ? helperOptions(ctx) : [],
    perms.edit && live ? listVehicles(ctx, { unitId: s.unitId }) : [],
    perms.edit && live ? listMaterials(ctx, { unitId: s.unitId }) : [],
  ]);
  const requests = s.crew.filter((c) => c.status === "ANGEFRAGT" || c.status === "WARTELISTE");
  const mine = s.mine;
  const ended = s.endsAt < new Date();
  const canSignUp = s.status === "OFFEN" && !ended && ctx.helperId && (!mine || mine.status === "ABGELEHNT" || mine.status === "ZURUECKGEZOGEN");
  const crewBy = (reqId: string | null) => s.crew.filter((c) => c.requirementId === reqId && (c.status === "BESTAETIGT" || c.status === "EINGELADEN"));
  const unassigned = s.crew.filter((c) => c.status === "BESTAETIGT" && !c.requirementId);
  const reqOptions = s.requirements.filter((r) => r.filled + r.reserved < r.count);

  return (
    <>
      <div className="mb-5">
        <Link href="/shifts" className="mb-1 inline-block text-sm text-fg-subtle hover:text-fg">← Dienste</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap gap-1.5"><Badge>{SHIFT_KIND_LABEL[s.kind]}</Badge><Badge tone={shiftStatusTone[s.status]}>{SHIFT_STATUS_LABEL[s.status]}</Badge>{s.eventId && <Link href={`/events/${s.eventId}`}><Badge tone="brand">Veranstaltung: {s.eventName}</Badge></Link>}</div>
            <h1 className="text-xl font-semibold tracking-tight">{s.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden />{fmtLong(s.startsAt)} · {fmtRange(s.startsAt, s.endsAt)} ({hoursBetween(s.startsAt, s.endsAt).toLocaleString("de-DE", { maximumFractionDigits: 1 })} h)</span>
              {(s.meetingPoint || s.location) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden />{[s.meetingPoint && `Treffpunkt: ${s.meetingPoint}`, s.location && `Einsatzort: ${s.location}`].filter(Boolean).join(" · ")}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.kind === "SANITAETSDIENST" && s.status !== "ENTWURF" || (s.kind === "SANITAETSDIENST" && perms.edit) ? <LinkButton href={`/shifts/${id}/lagekarte`}><MapIcon className="h-4 w-4" />Lagekarte</LinkButton> : null}
            {perms.edit && live && <LinkButton href={`/shifts/${id}/edit`}><Pencil className="h-4 w-4" />Bearbeiten</LinkButton>}
            {perms.edit && s.status === "ENTWURF" && <ActionButton action={A.publishAction} fields={{ id }} variant="primary" small={false} label="Veröffentlichen" />}
          </div>
        </div>
      </div>

      {/* Meine Teilnahme */}
      {ctx.helperId && s.status !== "ENTWURF" && (
        <Card className="mb-5" title="Deine Teilnahme">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">{mine ? (mine.status === "BESTAETIGT" ? "✅ Du bist eingeteilt / hast zugesagt" : mine.status === "ANGEFRAGT" ? "⏳ Deine Anfrage wurde an den Dienstplaner übermittelt." : mine.status === "EINGELADEN" ? "✉️ Du wurdest eingeladen" : mine.status === "WARTELISTE" ? "🕒 Du stehst auf der Warteliste" : mine.status === "ABGELEHNT" ? "Deine Anfrage wurde abgelehnt" : "Du hast abgesagt") : `Benötigt: ${sum.needed || "–"} · Gemeldet: ${sum.confirmed + sum.invited + sum.requested}`}</p>
              {!mine && sum.needed > 0 && <p className="text-sm text-fg-muted">{sum.open} Positionen noch offen.</p>}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {canSignUp && (
                <ActionForm action={A.signUpAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={id} /><input className="input !w-56" name="note" placeholder="Anmerkung (optional)" maxLength={300} aria-label="Anmerkung" /><SubmitButton variant="primary">Für Dienst anmelden</SubmitButton></ActionForm>
              )}
              {mine?.status === "EINGELADEN" && (<><ActionButton action={A.respondInviteAction} fields={{ id, accept: "1" }} variant="ok" small={false} label="Zusagen" /><ActionButton action={A.respondInviteAction} fields={{ id, accept: "0" }} small={false} label="Absagen" confirm="Einladung wirklich ablehnen?" /></>)}
              {mine && ["BESTAETIGT", "ANGEFRAGT", "WARTELISTE"].includes(mine.status) && !ended && s.status === "OFFEN" && <ActionButton action={A.withdrawAction} fields={{ id }} small={false} variant="ghost" label={mine.status === "BESTAETIGT" ? "Absagen" : "Anfrage zurückziehen"} confirm={mine.status === "BESTAETIGT" ? "Willst du deine Zusage wirklich zurückziehen? Die Planer werden informiert." : "Anfrage zurückziehen?"} />}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Besetzung" action={sum.needed > 0 ? <span className="text-sm tabular-nums text-fg-muted">{sum.filledPositions} / {sum.needed} besetzt</span> : undefined}>
            {sum.needed > 0 && <div className="mb-4"><ProgressBar big value={sum.filledPositions} max={sum.needed} label="Gesamtbesetzung" /></div>}
            {s.requirements.length === 0 ? (
              <>
                <p className="mb-3 text-sm text-fg-muted">Für diesen Dienst sind keine festen Positionen definiert.</p>
                <CrewList crew={s.crew.filter((c) => c.status === "BESTAETIGT" || c.status === "EINGELADEN")} perms={perms} live={live} />
              </>
            ) : (
              <div className="space-y-5">
                {s.requirements.map((r) => {
                  const people = crewBy(r.id);
                  return (
                    <div key={r.id}>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{r.label} <span className="text-fg-muted">× {r.count}</span></p>
                        <Badge tone={r.filled >= r.count ? "ok" : r.filled > 0 ? "warn" : "danger"}>{r.filled}/{r.count}{r.reserved ? ` (+${r.reserved} eingeladen)` : ""}</Badge>
                      </div>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {r.functionKey && <Badge tone="info">Funktion: {FUNCTION_LABEL[r.functionKey]}</Badge>}
                        {r.qualifications.map((q) => <Badge key={q.id} tone="neutral">🎓 {q.name}</Badge>)}
                      </div>
                      <ProgressBar value={r.filled} max={r.count} label={r.label} />
                      <CrewList crew={people} perms={perms} live={live} />
                      {Array.from({ length: Math.max(0, r.count - people.length) }).map((_, i) => <p key={i} className="mt-1.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-fg-subtle">Offen</p>)}
                    </div>
                  );
                })}
                {unassigned.length > 0 && <div><p className="mb-1 font-medium">Ohne feste Position</p><CrewList crew={unassigned} perms={perms} live={live} /></div>}
              </div>
            )}
          </Card>

          {perms.staff && live && requests.length > 0 && (
            <Card title={`Anfragen & Warteliste (${requests.length})`}>
              <ul className="divide-y divide-line">
                {requests.map((c) => (
                  <li key={c.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><p className="font-medium"><Link href={`/helpers/${c.helperId}`} className="hover:underline">{c.name}</Link> <Badge tone={assignmentTone[c.status]}>{ASSIGNMENT_STATUS_LABEL[c.status as keyof typeof ASSIGNMENT_STATUS_LABEL]}</Badge></p>{c.note && <p className="text-sm text-fg-muted">„{c.note}“</p>}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionForm action={A.decideAction} className="flex flex-wrap items-center gap-2" compact>
                          <input type="hidden" name="assignmentId" value={c.id} /><input type="hidden" name="decision" value="CONFIRM" />
                          {reqOptions.length > 0 && <select name="requirementId" className="input !min-h-[36px] !w-44 !py-0 text-[13px]" aria-label="Position"><option value="">Beste Position wählen</option>{reqOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>}
                          <label className="flex items-center gap-1.5 text-xs text-fg-muted"><input type="checkbox" name="override" /> trotz Abweichung</label>
                          <SubmitButton variant="ok" small>Bestätigen</SubmitButton>
                        </ActionForm>
                        {c.status === "ANGEFRAGT" && <ActionButton action={A.decideAction} fields={{ assignmentId: c.id, decision: "WAITLIST" }} label="Warteliste" />}
                        <ActionButton action={A.decideAction} fields={{ assignmentId: c.id, decision: "REJECT" }} label="Ablehnen" variant="ghost" confirm="Anfrage ablehnen?" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {rec && (
            <Card title="Beste Besetzung (Empfehlung)">
              <p className="mb-4 text-sm text-fg-muted">Berücksichtigt Qualifikation, Funktion, Verfügbarkeit, Ruhezeiten, bestehende Dienste, Dienstbelastung, Wünsche und Einheit. Nur geeignete Helfer erscheinen.</p>
              {rec.proposal.length === 0 ? <Empty title="Alle Positionen sind besetzt" /> : (
                <>
                  <div className="space-y-4">
                    {rec.proposal.map((slot) => (
                      <div key={slot.requirementId}>
                        <p className="mb-1 text-sm font-semibold">{slot.label} <span className="font-normal text-fg-muted">– {slot.needed} benötigt</span></p>
                        {slot.filled.length === 0 && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Kein geeigneter Helfer verfügbar.</p>}
                        <ol className="space-y-1.5">
                          {slot.filled.map((c, i) => (
                            <li key={c.helperId} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                              <span className="w-5 text-sm tabular-nums text-fg-subtle">{i + 1}.</span>
                              <span className="min-w-0 flex-1"><Link href={`/helpers/${c.helperId}`} className="font-medium hover:underline">{c.name}</Link><span className="block text-xs text-fg-muted">{[...c.reasons.slice(0, 3), ...c.warnings].join(" · ")}</span></span>
                              <Badge tone={c.score >= 80 ? "ok" : c.score >= 60 ? "info" : "warn"}>{c.score} % passend</Badge>
                            </li>
                          ))}
                        </ol>
                        {slot.unfilled > 0 && slot.filled.length > 0 && <p className="mt-1.5 text-xs text-warn">Es fehlen noch {slot.unfilled} geeignete Helfer.</p>}
                      </div>
                    ))}
                  </div>
                  <ActionForm action={A.applyRecommendationAction} className="mt-4 flex flex-wrap items-center gap-3">
                    <input type="hidden" name="shiftId" value={id} />
                    <input type="hidden" name="picks" value={JSON.stringify(rec.proposal.flatMap((p) => p.filled.map((f) => ({ requirementId: p.requirementId, helperId: f.helperId }))))} />
                    <select name="mode" className="input !w-auto" aria-label="Art der Zuteilung"><option value="EINTEILEN">Direkt einteilen</option><option value="EINLADEN">Als Einladung senden</option></select>
                    <SubmitButton variant="primary">Empfehlung übernehmen</SubmitButton>
                  </ActionForm>
                </>
              )}
              <div className="mt-5">
                <Collapse summary="Weitere geeignete Helfer je Position">
                  <div className="space-y-4">
                    {rec.requirements.map((r) => (
                      <div key={r.requirementId}>
                        <p className="mb-1 text-sm font-semibold">{r.label} <span className="font-normal text-fg-muted">({r.filled}/{r.needed} besetzt · {r.excluded} Helfer nicht geeignet)</span></p>
                        {r.candidates.length === 0 ? <p className="text-sm text-fg-muted">Keine geeigneten Helfer.</p> : (
                          <ul className="divide-y divide-line">
                            {r.candidates.map((c) => (
                              <li key={c.helperId} className="flex flex-wrap items-center gap-2 py-2">
                                <span className="min-w-0 flex-1 text-sm"><span className="font-medium">{c.name}</span> <span className="text-xs text-fg-muted">{c.warnings.join(" · ")}</span></span>
                                <Badge tone={c.score >= 80 ? "ok" : "neutral"}>{c.score} %</Badge>
                                {r.filled < r.needed && <ActionButton action={A.assignAction} fields={{ shiftId: id, helperId: c.helperId, requirementId: r.requirementId }} label="Einteilen" />}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Collapse>
              </div>
              <div className="mt-3">
                <Collapse summary="Manuell einteilen (auch mit Ausnahme)">
                  <ActionForm action={A.assignAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
                    <input type="hidden" name="shiftId" value={id} />
                    <label className="block"><span className="label">Helfer</span><select name="helperId" className="input" required><option value="">— wählen —</option>{helperOpts.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
                    <label className="block"><span className="label">Position</span><select name="requirementId" className="input"><option value="">Automatisch</option>{reqOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
                    <label className="block"><span className="label">Art</span><select name="mode" className="input"><option value="EINTEILEN">Direkt einteilen</option><option value="EINLADEN">Einladung senden</option></select></label>
                    <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="override" className="h-4 w-4" /> Ausnahme: trotz fehlender Qualifikation/Ruhezeit (wird protokolliert)</label>
                    <div className="sm:col-span-2"><SubmitButton>Einteilen</SubmitButton></div>
                  </ActionForm>
                </Collapse>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Details">
            <Dl items={[["Einheit", s.unitName], ["Veranstalter", s.organizer], ["Verantwortlich", s.responsible && <Link key="r" href={`/helpers/${s.responsible.id}`} className="hover:underline">{s.responsible.name}</Link>], ["Beginn", fmtDateTime(s.startsAt)], ["Ende", fmtDateTime(s.endsAt)]]} />
            {s.description && <p className="prose-plain mt-4 border-t border-line pt-4">{s.description}</p>}
          </Card>

          <Card title="Fahrzeuge" action={<Truck className="h-4 w-4 text-fg-subtle" aria-hidden />}>
            {s.vehicles.length === 0 ? <p className="text-sm text-fg-muted">Keine Fahrzeuge zugewiesen.</p> : <ul className="space-y-1.5 text-sm">{s.vehicles.map((v) => <li key={v.id}><Link href={`/vehicles/${v.id}`} className="hover:underline">{VEHICLE_STATUS_EMOJI[v.status]} {v.name}</Link> <span className="text-fg-muted">{[v.callSign, v.plate].filter(Boolean).join(" · ")}</span></li>)}</ul>}
          </Card>
          <Card title="Material" action={<Package className="h-4 w-4 text-fg-subtle" aria-hidden />}>
            {s.materials.length === 0 ? <p className="text-sm text-fg-muted">Kein Material reserviert.</p> : <ul className="space-y-1.5 text-sm">{s.materials.map((m) => <li key={m.id}><Link href={`/materials/${m.id}`} className="hover:underline">{m.quantity}× {m.name}</Link></li>)}</ul>}
          </Card>

          {perms.edit && live && (
            <Card title="Fahrzeuge & Material zuweisen">
              <ActionForm action={A.resourcesAction} className="space-y-4">
                <input type="hidden" name="id" value={id} />
                <fieldset><legend className="label">Fahrzeuge</legend>
                  <div className="space-y-1.5">{vehicles.length === 0 && <p className="text-sm text-fg-muted">Keine Fahrzeuge in dieser Einheit.</p>}{vehicles.map((v) => (
                    <label key={v.id} className="flex min-h-[40px] items-center gap-2 text-sm"><input type="checkbox" name="vehicleIds[]" value={v.id} defaultChecked={s.vehicles.some((x) => x.id === v.id)} className="h-4 w-4" /><span>{VEHICLE_STATUS_EMOJI[v.status]} {v.name}</span><span className="text-xs text-fg-subtle">{VEHICLE_STATUS_LABEL[v.status]}</span></label>
                  ))}</div>
                </fieldset>
                <fieldset><legend className="label">Material</legend>
                  <RowsEditor name="materials" initial={s.materials.map((m) => ({ materialId: m.id, quantity: m.quantity }))} blank={{ materialId: "", quantity: 1 }} addLabel="Material hinzufügen"
                    columns={[{ key: "materialId", label: "Material", type: "select", width: "sm:col-span-4", options: materials.map((m) => ({ value: m.id, label: `${m.name} (${m.available} verfügbar)` })) }, { key: "quantity", label: "Menge", type: "number", width: "sm:col-span-2", min: 1 }]} />
                </fieldset>
                <SubmitButton>Speichern</SubmitButton>
              </ActionForm>
            </Card>
          )}

          {perms.cancel && s.status === "OFFEN" && (
            <Card title="Dienst beenden">
              <div className="space-y-4">
                {s.startsAt <= new Date() && (
                  <ActionForm action={A.completeAction} className="space-y-3">
                    <input type="hidden" name="id" value={id} />
                    <p className="text-sm text-fg-muted">Schließt den Dienst ab und bucht die Stunden aller bestätigten Helfer. Abweichende Zeiten (in Stunden) optional eintragen:</p>
                    <div className="space-y-1.5">{s.crew.filter((c) => c.status === "BESTAETIGT").map((c) => <label key={c.id} className="flex items-center justify-between gap-2 text-sm"><span>{c.name}</span><input name={`min:${c.helperId}`} type="number" step="0.25" min="0" max="72" placeholder={String(hoursBetween(s.startsAt, s.endsAt))} className="input !min-h-[36px] !w-24" aria-label={`Stunden ${c.name}`} /></label>)}</div>
                    <SubmitButton variant="ok" confirm="Dienst abschließen und Stunden buchen?">Dienst abschließen</SubmitButton>
                  </ActionForm>
                )}
                <ActionForm action={A.cancelAction} className="space-y-2"><input type="hidden" name="id" value={id} /><input className="input" name="reason" placeholder="Grund der Absage (optional)" maxLength={200} /><SubmitButton variant="danger" confirm="Dienst wirklich absagen? Alle Eingeteilten werden benachrichtigt.">Dienst absagen</SubmitButton></ActionForm>
              </div>
            </Card>
          )}
          {perms.edit && s.status === "ENTWURF" && <ActionButton action={A.deleteDraftAction} fields={{ id }} variant="danger" small={false} label="Entwurf löschen" confirm="Entwurf endgültig löschen?" />}
          {s.status === "ABGESCHLOSSEN" && perms.cancel && (
            <Card title="Geleistete Stunden">
              <ul className="space-y-2">{s.crew.filter((c) => c.status === "BESTAETIGT").map((c) => (
                <li key={c.id}><ActionForm action={A.setHoursAction} className="flex items-center justify-between gap-2 text-sm" compact><input type="hidden" name="assignmentId" value={c.id} /><span className="min-w-0 flex-1 truncate">{c.name}</span><input name="hours" className="input !min-h-[36px] !w-20" defaultValue={((c.workedMinutes ?? 0) / 60).toString().replace(".", ",")} aria-label={`Stunden ${c.name}`} /><SubmitButton small variant="default">OK</SubmitButton></ActionForm></li>
              ))}</ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function CrewList({ crew, perms, live }: { crew: { id: string; helperId: string; name: string; status: string; source: string; workedMinutes: number | null }[]; perms: { staff: boolean; viewHelpers: boolean }; live: boolean }) {
  if (!crew.length) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {crew.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">{perms.viewHelpers ? <Link href={`/helpers/${c.helperId}`} className="font-medium hover:underline">{c.name}</Link> : <span className="font-medium">{c.name}</span>}</span>
          <span className="flex items-center gap-2">
            <Badge tone={assignmentTone[c.status]}>{ASSIGNMENT_STATUS_LABEL[c.status as keyof typeof ASSIGNMENT_STATUS_LABEL]}</Badge>
            {perms.staff && live && <ActionButton action={A.removeCrewAction} fields={{ assignmentId: c.id }} variant="ghost" label="Entfernen" confirm={`${c.name} aus dem Dienst entfernen?`} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
