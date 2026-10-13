import { Pencil } from "lucide-react";
import { requireCtx } from "@/server/session";
import { courseFormOptions, getCourse, PARTICIPANT_STATUS_LABEL } from "@/server/services/courses";
import { Badge, Card, Dl, Empty, LinkButton, Notice, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { fmtDateTime, fmtLong, fmtRange } from "@/lib/dates";
import { env } from "@/server/env";
import { addParticipantAction, assessAction, cancelCourseAction, completeCourseAction, courseSignupAction, courseWithdrawAction, participantStatusAction, revokeCertificateAction } from "../actions";

export const metadata = { title: "Lehrgang" };

const tone = { ANGEMELDET: "ok", WARTELISTE: "warn", ABGEMELDET: "neutral", BESTANDEN: "ok", NICHT_BESTANDEN: "danger" } as const;
type Cert = { id: string; number: string; code: string; revokedAt: Date | null } | null;

function CertLinks({ cert }: { cert: Cert }) {
  if (!cert) return null;
  if (cert.revokedAt) return <Badge tone="danger">Zertifikat {cert.number} widerrufen</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a className="btn btn-sm" href={`/api/certificates/${cert.id}/pdf`}>Zertifikat (PDF)</a>
      <a className="text-xs text-info hover:underline" href={`/zertifikat/${cert.code}`} target="_blank" rel="noreferrer">Prüf-Link</a>
    </span>
  );
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const c = await getCourse(ctx, (await params).id);
  const options = c.perms.manage && c.status === "GEPLANT" ? await courseFormOptions(ctx) : null;
  const unitHelpers = options?.helpers.filter((h) => !c.participants.some((p) => p.helperId === h.id && p.status !== "ABGEMELDET")) ?? [];
  const seats = c.capacity === null ? `${c.taken} angemeldet (unbegrenzt)` : `${c.taken} / ${c.capacity}${c.waiting ? ` · ${c.waiting} auf der Warteliste` : ""}`;
  const openAssessments = c.participants.filter((p) => p.status === "ANGEMELDET").length;

  return (
    <>
      <PageHeader
        title={c.title}
        subtitle={<>{fmtLong(c.startsAt)} · {fmtRange(c.startsAt, c.endsAt)} · {c.unitName}</>}
        back={{ href: "/courses", label: "Lehrgänge" }}
        actions={c.perms.manage && c.status === "GEPLANT" ? <LinkButton href={`/courses/${c.id}/edit`}><Pencil className="h-4 w-4" />Bearbeiten</LinkButton> : undefined}
      />
      {c.status === "ABGESAGT" && <div className="mb-5"><Notice tone="danger">Dieser Lehrgang wurde abgesagt.</Notice></div>}
      {c.status === "ABGESCHLOSSEN" && <div className="mb-5"><Notice tone="info">Dieser Lehrgang ist abgeschlossen.</Notice></div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Details">
            <Dl items={[
              ["Termin", fmtRange(c.startsAt, c.endsAt)],
              ["Ort", c.location ?? "—"],
              ["Anmeldeschluss", fmtDateTime(c.signupDeadline ?? c.startsAt)],
              ["Plätze", seats],
              ["Vermittelte Qualifikation", c.qualification?.name ?? "— (Teilnahmebescheinigung)"],
              ["Voraussetzungen", c.prerequisites.length ? c.prerequisites.map((p) => p.name).join(", ") : "keine"],
              ["Lehrgangsleitung", [c.lead?.name, c.instructors].filter(Boolean).join(", ") || "—"],
            ]} />
            {c.description && <p className="mt-4 whitespace-pre-line text-sm">{c.description}</p>}
          </Card>

          {c.perms.manage && (
            <Card title={`Teilnehmer (${c.participants.filter((p) => p.status !== "ABGEMELDET").length})`}>
              {c.participants.length === 0 ? <Empty title="Noch keine Anmeldungen" /> : (
                <ul className="divide-y divide-line">
                  {c.participants.map((p) => (
                    <li key={p.id} className="space-y-2 py-3" data-participant={p.name}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0"><p className="font-medium">{p.name}</p><p className="text-xs text-fg-subtle">{p.unitName} · angemeldet {fmtDateTime(p.createdAt)}{p.note ? ` · „${p.note}“` : ""}</p></div>
                        <Badge tone={tone[p.status]}>{PARTICIPANT_STATUS_LABEL[p.status]}</Badge>
                      </div>
                      {p.result && <p className="text-sm text-fg-muted">Bewertung: {p.result}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <CertLinks cert={p.certificate} />
                        {c.status === "GEPLANT" && p.status === "WARTELISTE" && <ActionButton action={participantStatusAction} fields={{ participantId: p.id, status: "ANGEMELDET" }} label="Nachrücken lassen" variant="ok" />}
                        {c.status === "GEPLANT" && (p.status === "ANGEMELDET" || p.status === "WARTELISTE") && <ActionButton action={participantStatusAction} fields={{ participantId: p.id, status: "ABGEMELDET" }} label="Abmelden" confirm={`${p.name} abmelden?`} />}
                        {c.status === "GEPLANT" && p.status === "ABGEMELDET" && <ActionButton action={participantStatusAction} fields={{ participantId: p.id, status: "ANGEMELDET" }} label="Wieder anmelden" />}
                      </div>
                      {c.started && c.status !== "ABGESAGT" && p.status !== "ABGEMELDET" && p.status !== "WARTELISTE" && (
                        <ActionForm action={assessAction} className="flex flex-wrap items-end gap-2" compact>
                          <input type="hidden" name="participantId" value={p.id} />
                          <label className="block min-w-[14rem] flex-1"><span className="label">Bemerkung zur Bewertung (optional)</span><input name="note" className="input" maxLength={1000} defaultValue={p.result ?? ""} /></label>
                          <SubmitButton small variant="ok" name="result" value="passed">Bestanden</SubmitButton>
                          <SubmitButton small variant="danger" name="result" value="failed" confirm={p.status === "BESTANDEN" ? "Bewertung auf „nicht bestanden“ ändern? Zertifikat und Qualifikation werden widerrufen." : undefined}>Nicht bestanden</SubmitButton>
                        </ActionForm>
                      )}
                      {p.certificate && !p.certificate.revokedAt && (
                        <Collapse summary={<span className="text-xs">Zertifikat widerrufen …</span>}>
                          <ActionForm action={revokeCertificateAction} className="flex flex-wrap items-end gap-2" compact>
                            <input type="hidden" name="certificateId" value={p.certificate.id} />
                            <label className="block flex-1"><span className="label">Grund</span><input name="reason" className="input" required maxLength={300} /></label>
                            <SubmitButton small variant="danger" confirm="Zertifikat widerrufen? Die eingetragene Qualifikation wird ebenfalls widerrufen.">Widerrufen</SubmitButton>
                          </ActionForm>
                        </Collapse>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {options && unitHelpers.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <ActionForm action={addParticipantAction} className="flex flex-wrap items-end gap-3" resetOnSuccess>
                    <input type="hidden" name="id" value={c.id} />
                    <label className="block min-w-[14rem] flex-1"><span className="label">Helfer anmelden</span><select name="helperId" className="input" required>{unitHelpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="override" className="h-4 w-4" /> Trotzdem anmelden (fehlende Voraussetzungen)</label>
                    <SubmitButton>Anmelden</SubmitButton>
                  </ActionForm>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {ctx.helperId && (
            <Card title="Deine Anmeldung">
              {c.mine && c.mine.status !== "ABGEMELDET" ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2"><Badge tone={tone[c.mine.status]}>{PARTICIPANT_STATUS_LABEL[c.mine.status]}</Badge>{c.mine.status === "WARTELISTE" && <span className="text-sm text-fg-muted">Du rückst automatisch nach, sobald ein Platz frei wird.</span>}</p>
                  {c.mine.note && <p className="text-sm text-fg-muted">Deine Bemerkung: „{c.mine.note}“</p>}
                  {c.mine.result && <p className="text-sm">Bewertung: {c.mine.result}</p>}
                  {c.mine.certificate && (
                    <div className="space-y-2">
                      <p className="text-sm">Zertifikat <strong>{c.mine.certificate.number}</strong></p>
                      <CertLinks cert={c.mine.certificate} />
                    </div>
                  )}
                  {(c.mine.status === "ANGEMELDET" || c.mine.status === "WARTELISTE") && !c.started && c.status === "GEPLANT" && <ActionButton action={courseWithdrawAction} fields={{ id: c.id }} label="Abmelden" variant="danger" small={false} confirm="Vom Lehrgang abmelden?" />}
                </div>
              ) : c.canSignUp ? (
                <ActionForm action={courseSignupAction} className="space-y-3">
                  <input type="hidden" name="id" value={c.id} />
                  {c.full && <Notice tone="warn">Der Lehrgang ist voll – du kommst auf die Warteliste.</Notice>}
                  <label className="block"><span className="label">Bemerkung (optional)</span><textarea name="note" className="input" maxLength={500} rows={2} /></label>
                  <SubmitButton className="w-full">{c.full ? "Auf die Warteliste" : "Anmelden"}</SubmitButton>
                </ActionForm>
              ) : (
                <p className="text-sm text-fg-muted">{c.signupBlockedReason ?? "Eine Anmeldung ist nicht möglich."}</p>
              )}
            </Card>
          )}
          {c.perms.manage && c.status === "GEPLANT" && (
            <Card title="Lehrgang verwalten">
              <div className="space-y-3 text-sm">
                {c.started ? (
                  <>
                    <p className="text-fg-muted">{openAssessments ? `${openAssessments} Teilnehmer noch nicht bewertet.` : "Alle Teilnehmer sind bewertet."}</p>
                    <ActionButton action={completeCourseAction} fields={{ id: c.id }} label="Lehrgang abschließen" variant="ok" small={false} confirm="Lehrgang abschließen? Danach sind keine Änderungen mehr möglich." />
                  </>
                ) : <p className="text-fg-muted">Bewertung und Zertifikate sind ab Lehrgangsbeginn möglich.</p>}
                {c.participants.every((p) => p.status !== "BESTANDEN") && <ActionButton action={cancelCourseAction} fields={{ id: c.id }} label="Lehrgang absagen" variant="danger" small={false} confirm="Lehrgang absagen? Alle Angemeldeten werden benachrichtigt." />}
              </div>
            </Card>
          )}
          <p className="px-1 text-xs text-fg-subtle">Zertifikate lassen sich über den Prüf-Link auf {new URL(env.appUrl).host} auf Echtheit prüfen.</p>
        </div>
      </div>
    </>
  );
}
