import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/server/session";
import { getAlert } from "@/server/services/alerts";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";
import { ActionButton, LiveRefresh } from "@/components/forms";
import { ALERT_AUDIENCE_LABEL, ALERT_RESPONSE_EMOJI, ALERT_RESPONSE_LABEL } from "@/lib/constants";
import { alertResponseTone } from "@/lib/ui-maps";
import { fmtDateTime, fmtTime } from "@/lib/dates";
import { endAlertAction, respondAction, setResponseAction } from "../actions";

export const metadata = { title: "Alarmierung" };

export default async function AlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const a = await getAlert(ctx, id).catch(() => null);
  if (!a) notFound();
  const c = a.counts;
  return (
    <>
      {a.status === "AKTIV" && <LiveRefresh seconds={5} />}
      <PageHeader title={`🚨 ${a.title}`} back={{ href: "/alerts", label: "Alarmierung" }} subtitle={`${a.unitName} · ausgelöst ${fmtDateTime(a.createdAt)}`} actions={<>{a.status === "AKTIV" ? <Badge tone="danger">Aktiv · live</Badge> : <Badge>Beendet</Badge>}{a.shiftId && <Link href={`/shifts/${a.shiftId}`} className="btn btn-sm">Zum Dienst</Link>}</>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs font-medium uppercase text-fg-subtle">Einsatz</p><p className="font-medium">{a.title}</p></div>
              <div><p className="text-xs font-medium uppercase text-fg-subtle">Treffpunkt</p><p className="font-medium">{a.meetingPoint ?? "–"}</p></div>
              <div><p className="text-xs font-medium uppercase text-fg-subtle">Zeit</p><p className="font-medium">{a.meetingTime ? `${fmtTime(a.meetingTime)} Uhr` : "sofort"}</p></div>
            </div>
            {a.message && <p className="prose-plain mt-4 border-t border-line pt-4">{a.message}</p>}
            <p className="mt-3 text-xs text-fg-subtle">Empfänger: {ALERT_AUDIENCE_LABEL[a.audienceType]}{a.alertGroupName ? ` „${a.alertGroupName}“` : ""}</p>
          </Card>
          {a.canRespond && (
            <Card title="Deine Rückmeldung">
              <p className="mb-3 text-sm text-fg-muted">Aktuell: <strong>{a.myResponse ? `${ALERT_RESPONSE_EMOJI[a.myResponse]} ${ALERT_RESPONSE_LABEL[a.myResponse]}` : "–"}</strong></p>
              <div className="grid gap-3 sm:grid-cols-3">
                <ActionButton action={respondAction} fields={{ id, response: "KOMME" }} variant={a.myResponse === "KOMME" ? "ok" : "default"} small={false} className="[&_button]:w-full [&_button]:!min-h-[60px] [&_button]:text-base" label="🟢 Ich komme" />
                <ActionButton action={respondAction} fields={{ id, response: "VIELLEICHT" }} small={false} className="[&_button]:w-full [&_button]:!min-h-[60px] [&_button]:text-base" label="🟡 Ich komme eventuell" />
                <ActionButton action={respondAction} fields={{ id, response: "KANN_NICHT" }} small={false} className="[&_button]:w-full [&_button]:!min-h-[60px] [&_button]:text-base" label="🔴 Ich kann nicht" />
              </div>
            </Card>
          )}
          {a.recipients && (
            <Card title={`Rückmeldungen (${c.total - c.OFFEN}/${c.total})`} pad={false}>
              <ul className="divide-y divide-line">{a.recipients.map((r) => (
                <li key={r.helperId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"><span className="font-medium">{r.name}</span>
                  <span className="flex items-center gap-2"><Badge tone={alertResponseTone[r.response]}>{ALERT_RESPONSE_EMOJI[r.response]} {ALERT_RESPONSE_LABEL[r.response]}</Badge>{r.respondedAt && <span className="text-xs text-fg-subtle">{fmtTime(r.respondedAt)}</span>}
                    {a.canManage && a.status === "AKTIV" && r.response === "OFFEN" && <><ActionButton action={setResponseAction} fields={{ id, helperId: r.helperId, response: "KOMME" }} variant="ghost" label="telefonisch: kommt" /></>}</span></li>
              ))}</ul>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card title="Rückmeldestatus (live)">
            <div className="space-y-3 text-sm">
              {([["🟢 Ich komme", c.KOMME, "ok"], ["🟡 Eventuell", c.VIELLEICHT, "warn"], ["🔴 Kann nicht", c.KANN_NICHT, "danger"], ["⚪ Keine Antwort", c.OFFEN, "neutral"]] as const).map(([l, n, t]) => (
                <div key={l}><div className="mb-1 flex justify-between"><span>{l}</span><span className="tabular-nums font-semibold">{n}</span></div><ProgressBar value={n} max={c.total} tone={t} label={l} /></div>
              ))}
            </div>
          </Card>
          {a.canManage && a.status === "AKTIV" && <ActionButton action={endAlertAction} fields={{ id }} small={false} label="Alarmierung beenden" confirm="Alarmierung beenden? Danach sind keine Rückmeldungen mehr möglich." />}
        </div>
      </div>
    </>
  );
}
