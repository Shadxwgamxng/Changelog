import Link from "next/link";
import { AlertTriangle, CalendarClock, ChevronRight, ClipboardList, Megaphone, ShieldAlert, Siren } from "lucide-react";
import { requireCtx } from "@/server/session";
import { getDashboard } from "@/server/services/dashboard";
import { Badge, Card, Empty, LinkButton, ProgressBar, Stat } from "@/components/ui";
import { AVAILABILITY_EMOJI, AVAILABILITY_LABEL, ASSIGNMENT_STATUS_LABEL, SHIFT_KIND_LABEL } from "@/lib/constants";
import { assignmentTone, levelTone } from "@/lib/ui-maps";
import { fmtDateTime, fmtHours, fmtRange, greeting, fmtDate } from "@/lib/dates";
import { QUAL_STATE_LABEL } from "@/lib/qualification";

export const metadata = { title: "Start" };

const kindIcon: Record<string, string> = { SANITAETSDIENST: "🚑", EINSATZ: "🚨", UEBUNG: "🎯", SONSTIGES: "📌", AUSBILDUNG: "📚", BESPRECHUNG: "💬", BEREITSCHAFTSABEND: "🏠" };

export default async function Dashboard() {
  const ctx = await requireCtx();
  const d = await getDashboard(ctx);
  const L = d.leadership;
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{greeting()}, {d.greetingName}!</h1>
        <p className="mt-1 text-sm text-fg-muted">{ctx.helperName ? "Hier ist alles Wichtige für deinen DRK-Dienst." : "Übersicht über deinen Verantwortungsbereich."}</p>
      </div>

      {d.alerts.some((a) => a.myResponse === "OFFEN") && (
        <Link href={`/alerts/${d.alerts.find((a) => a.myResponse === "OFFEN")!.id}`} className="mb-5 flex items-center gap-3 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-danger">
          <Siren className="h-6 w-6 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1"><p className="font-semibold">Alarmierung: {d.alerts.find((a) => a.myResponse === "OFFEN")!.title}</p><p className="text-sm opacity-90">Bitte jetzt antworten: Ich komme / eventuell / kann nicht.</p></div>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      )}

      {d.tasks.length > 0 && (
        <div className="mb-5 space-y-2">
          {d.tasks.map((t, i) => (
            <Link key={i} href={t.link} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${t.level === "rot" ? "bg-danger-soft text-danger" : t.level === "gelb" ? "bg-warn-soft text-warn" : "bg-info-soft text-info"}`}>
              <ClipboardList className="h-4 w-4 shrink-0" aria-hidden /><span className="flex-1">{t.text}</span><ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Deine nächsten Dienste" action={<LinkButton href="/shifts?mine=1" variant="ghost" size="sm">Alle</LinkButton>}>
            {d.duties.length === 0 ? <Empty title="Keine anstehenden Dienste" text={d.openShifts.length ? "Unten findest du Dienste mit freien Plätzen." : "Sobald du eingeteilt bist, siehst du es hier."} /> : (
              <ul className="divide-y divide-line">
                {d.duties.map((s) => (
                  <li key={s.shiftId}>
                    <Link href={`/shifts/${s.shiftId}`} className="flex min-h-[64px] items-center gap-3 py-3">
                      <span className="text-2xl" aria-hidden>{kindIcon[s.kind] ?? "📌"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}{s.meetingPoint ? ` · ${s.meetingPoint}` : ""}</p>
                      </div>
                      <Badge tone={assignmentTone[s.status]}>{s.status === "BESTAETIGT" ? "✅ Zugesagt" : ASSIGNMENT_STATUS_LABEL[s.status as keyof typeof ASSIGNMENT_STATUS_LABEL]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Deine nächsten Termine">
            {d.appointments.length === 0 ? <p className="text-sm text-fg-muted">Keine Termine in Sicht.</p> : (
              <ul className="divide-y divide-line">
                {d.appointments.map((s) => (
                  <li key={s.shiftId}><Link href={`/shifts/${s.shiftId}`} className="flex min-h-[52px] items-center gap-3 py-2.5"><span className="text-xl" aria-hidden>{kindIcon[s.kind]}</span><span className="min-w-0 flex-1 truncate font-medium">{s.name}</span><span className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</span></Link></li>
                ))}
              </ul>
            )}
            {d.events.length > 0 && (
              <>
                <p className="card-title mb-1 mt-4">Veranstaltungen</p>
                <ul className="divide-y divide-line">
                  {d.events.map((e) => <li key={e.id}><Link href={`/events/${e.id}`} className="flex min-h-[48px] items-center gap-3 py-2"><CalendarClock className="h-4 w-4 text-fg-subtle" aria-hidden /><span className="min-w-0 flex-1 truncate">{e.name}</span><span className="text-sm text-fg-muted">{fmtDate(e.startsAt)}</span></Link></li>)}
                </ul>
              </>
            )}
          </Card>

          {(d.pendingRequests.some((s) => s.status === "WARTELISTE") || d.invitations.length > 0 || d.openShifts.length > 0) && (
            <Card title="Dienstanfragen & freie Plätze">
              <ul className="divide-y divide-line">
                {d.invitations.map((s) => <li key={s.shiftId}><Link href={`/shifts/${s.shiftId}`} className="flex min-h-[52px] items-center gap-3 py-2.5"><Badge tone="info">Einladung</Badge><span className="min-w-0 flex-1 truncate font-medium">{s.name}</span><span className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</span></Link></li>)}
                {d.pendingRequests.filter((s) => s.status === "WARTELISTE").map((s) => <li key={s.shiftId}><Link href={`/shifts/${s.shiftId}`} className="flex min-h-[52px] items-center gap-3 py-2.5"><Badge tone="warn">{s.status === "WARTELISTE" ? "Warteliste" : "Angefragt"}</Badge><span className="min-w-0 flex-1 truncate font-medium">{s.name}</span><span className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</span></Link></li>)}
                {d.openShifts.map((s) => <li key={s.id}><Link href={`/shifts/${s.id}`} className="flex min-h-[52px] items-center gap-3 py-2.5"><Badge tone="neutral">{s.open > 0 ? `${s.open} frei` : "offen"}</Badge><span className="min-w-0 flex-1 truncate font-medium">{s.name}</span><span className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</span></Link></li>)}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Benachrichtigungen" action={d.unread ? <Badge tone="brand">{d.unread} neu</Badge> : undefined}>
            <ul className="space-y-2">
              {d.qualWarnings.map((q) => (
                <li key={q.id}>
                  <Link href={ctx.helperId ? `/helpers/${ctx.helperId}?tab=qualifikationen` : "/"} className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${q.state === "ABGELAUFEN" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{q.state === "ABGELAUFEN" ? `Deine Qualifikation „${q.name}“ ist abgelaufen.` : `Deine Qualifikation „${q.name}“ läuft in ${q.daysLeft} Tagen ab.`}</span>
                  </Link>
                </li>
              ))}
              {d.notifications.map((n) => (
                <li key={n.id}><Link href={n.link ?? "/notifications"} className={`block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2 ${n.readAt ? "text-fg-muted" : "font-medium"}`}>{n.title}<span className="block text-xs font-normal text-fg-subtle">{fmtDateTime(n.createdAt)}</span></Link></li>
              ))}
              {!d.qualWarnings.length && !d.notifications.length && <li className="text-sm text-fg-muted">Alles erledigt. 🎉</li>}
            </ul>
            <LinkButton href="/notifications" variant="ghost" size="sm" className="mt-2">Alle anzeigen</LinkButton>
          </Card>

          {d.availability && (
            <Card title="Deine Verfügbarkeit">
              <p className="text-lg font-semibold">{AVAILABILITY_EMOJI[(d.availability.today as keyof typeof AVAILABILITY_EMOJI) ?? "NONE"]} {d.availability.today ? AVAILABILITY_LABEL[d.availability.today as keyof typeof AVAILABILITY_LABEL] : "Keine Angabe für heute"}</p>
              <LinkButton href="/availability" size="sm" className="mt-3">Verfügbarkeit ändern</LinkButton>
            </Card>
          )}

          <Card title="Bekanntmachungen" action={<Megaphone className="h-4 w-4 text-fg-subtle" aria-hidden />}>
            {d.announcements.length === 0 ? <p className="text-sm text-fg-muted">Keine aktuellen Bekanntmachungen.</p> : (
              <ul className="space-y-3">
                {d.announcements.map((a) => (
                  <li key={a.id} className={`rounded-lg border p-3 ${a.important ? "border-warn/40 bg-warn-soft" : "border-line bg-surface-2"}`}>
                    <p className="text-sm font-semibold">{a.important ? "📢 Wichtige Information" : "📢"} {a.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{a.body}</p>
                    <p className="mt-1.5 text-xs text-fg-subtle">{a.unitName} · {fmtDate(a.publishAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {ctx.helperId && <Stat label="Dienststunden dieses Jahr" value={fmtHours(d.hours)} href="/hours" />}
        </div>
      </div>

      {L && (
        <section className="mt-8" aria-labelledby="lead-h">
          <h2 id="lead-h" className="mb-3 text-lg font-semibold">Führungsübersicht</h2>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat fill label="Offene Positionen (30 Tage)" value={L.openPositions} tone={L.openPositions ? "warn" : "ok"} href="/shifts?open=1" sub={L.requests ? `${L.requests} Anfragen warten` : undefined} />
            <Stat fill label="Einsatzbereitschaft heute" value={L.readiness == null ? "–" : `${L.readiness} %`} sub={`${L.available} verfügbar · ${L.limited} eingeschränkt · ${L.absent} abwesend`} href="/availability" />
            <Stat fill label="Qualifikationen" value={`${L.expired + L.expiringSoon}`} tone={L.expired ? "danger" : L.expiringSoon ? "warn" : "ok"} sub={`${L.expired} abgelaufen · ${L.expiringSoon} laufen bald ab`} href="/qualifications" />
            <Stat fill label="Dienststunden diesen Monat" value={L.hoursMonthMinutes == null ? "–" : fmtHours(L.hoursMonthMinutes)} href="/hours" sub={`Fahrzeuge: ${L.vehicles.ready} bereit · ${L.vehicles.down} nicht`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Besetzungsstatus kommender Dienste">
              {L.nextShifts.length === 0 ? <p className="text-sm text-fg-muted">Keine Dienste mit Besetzungsbedarf in den nächsten 30 Tagen.</p> : (
                <ul className="space-y-4">
                  {L.nextShifts.map((s) => (
                    <li key={s.id}>
                      <Link href={`/shifts/${s.id}`} className="block">
                        <div className="flex items-baseline justify-between gap-3"><span className="truncate font-medium">{s.name}</span><span className="shrink-0 text-sm tabular-nums text-fg-muted">{s.filledPositions} / {s.needed}</span></div>
                        <p className="mb-1.5 text-xs text-fg-subtle">{SHIFT_KIND_LABEL[s.kind]} · {fmtRange(s.startsAt, s.endsAt)}{s.status === "ENTWURF" ? " · Entwurf" : ""}{s.requested ? ` · ${s.requested} Anfrage(n)` : ""}</p>
                        <ProgressBar value={s.filledPositions} max={s.needed} label={`Besetzung ${s.name}`} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Hinweise & Warnungen" action={<ShieldAlert className="h-4 w-4 text-fg-subtle" aria-hidden />}>
              <ul className="space-y-2">
                {L.expiringList.map((e) => (
                  <li key={e.id}><Link href={`/helpers/${e.helperId}?tab=qualifikationen`} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><span className="min-w-0 truncate">{e.helperName} – {e.typeName}</span><Badge tone={e.state === "ABGELAUFEN" ? "danger" : "warn"}>{e.state === "ABGELAUFEN" ? QUAL_STATE_LABEL.ABGELAUFEN : `${e.daysLeft} Tage`}</Badge></Link></li>
                ))}
                {L.warnings.map((w, i) => <li key={i}><Link href={w.link} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><span className="min-w-0 truncate">{w.text}</span><Badge tone={levelTone[w.level]}>{w.level === "rot" ? "Dringend" : "Bald"}</Badge></Link></li>)}
                {!L.expiringList.length && !L.warnings.length && <li className="text-sm text-fg-muted">Keine Warnungen – alles im grünen Bereich.</li>}
              </ul>
            </Card>
          </div>
        </section>
      )}
    </>
  );
}
