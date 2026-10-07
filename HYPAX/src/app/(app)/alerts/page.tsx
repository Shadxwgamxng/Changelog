import Link from "next/link";
import { Siren } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, unitsWith } from "@/server/context";
import { listAlertGroups, listAlerts } from "@/server/services/alerts";
import { helperOptions } from "@/server/services/helpers";
import { Badge, Empty, LinkButton, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { ALERT_RESPONSE_EMOJI, ALERT_RESPONSE_LABEL } from "@/lib/constants";
import { alertResponseTone } from "@/lib/ui-maps";
import { fmtDateTime } from "@/lib/dates";
import { deleteGroupAction, saveGroupAction } from "./actions";

export const metadata = { title: "Alarmierung" };

export default async function AlertsPage() {
  const ctx = await requireCtx();
  const [alerts, groups, units] = await Promise.all([listAlerts(ctx, 40), listAlertGroups(ctx), unitsWith(ctx, "alert.create")]);
  const canCreate = units.length > 0;
  const helpers = canCreate ? await helperOptions(ctx) : [];
  return (
    <>
      <PageHeader title="Alarmierung" subtitle="Helfer alarmieren und Rückmeldungen live verfolgen." actions={canCreate && <LinkButton href="/alerts/new" variant="danger"><Siren className="h-4 w-4" />Alarmierung auslösen</LinkButton>} />
      {alerts.length === 0 ? <Empty icon={<Siren className="h-8 w-8" />} title="Keine Alarmierungen" /> : (
        <ul className="space-y-3">{alerts.map((a) => (
          <li key={a.id}><Link href={`/alerts/${a.id}`} className="card block px-4 py-4 transition hover:shadow-pop">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">🚨 {a.title}</p><p className="text-sm text-fg-muted">{a.unitName} · {fmtDateTime(a.createdAt)}{a.meetingPoint ? ` · Treffpunkt ${a.meetingPoint}` : ""}</p></div><div className="flex gap-1.5">{a.status === "BEENDET" ? <Badge>Beendet</Badge> : <Badge tone="danger">Aktiv</Badge>}{a.myResponse && <Badge tone={alertResponseTone[a.myResponse]}>{ALERT_RESPONSE_EMOJI[a.myResponse as keyof typeof ALERT_RESPONSE_EMOJI]} {ALERT_RESPONSE_LABEL[a.myResponse as keyof typeof ALERT_RESPONSE_LABEL]}</Badge>}</div></div>
            <p className="mt-2 text-sm"><span className="mr-3">🟢 {a.counts.KOMME}</span><span className="mr-3">🟡 {a.counts.VIELLEICHT}</span><span className="mr-3">🔴 {a.counts.KANN_NICHT}</span><span className="text-fg-muted">⚪ {a.counts.OFFEN} offen · {a.counts.total} alarmiert</span></p>
          </Link></li>
        ))}</ul>
      )}
      {hasAnywhere(ctx, "alert.view") && (
        <div className="mt-8"><h2 className="mb-3 text-lg font-semibold">Alarmgruppen</h2>
          <div className="space-y-3">
            {groups.map((g) => (
              <Collapse key={g.id} summary={`${g.name} · ${g.unitName} (${g.members.length})`}>
                {canCreate ? <GroupForm unitId={g.unitId} units={units} helpers={helpers} group={g} /> : <ul className="text-sm">{g.members.map((m) => <li key={m.id}>{m.name}</li>)}</ul>}
              </Collapse>
            ))}
            {canCreate && <Collapse summary="＋ Neue Alarmgruppe"><GroupForm unitId={units[0].id} units={units} helpers={helpers} /></Collapse>}
            {groups.length === 0 && !canCreate && <p className="text-sm text-fg-muted">Keine Alarmgruppen definiert.</p>}
          </div>
        </div>
      )}
    </>
  );
}

function GroupForm({ unitId, units, helpers, group }: { unitId: string; units: { id: string; name: string }[]; helpers: { id: string; name: string; unitId: string }[]; group?: { id: string; name: string; members: { id: string }[] } }) {
  return (
    <div className="space-y-3">
      <ActionForm action={saveGroupAction} className="space-y-3">
        {group && <input type="hidden" name="id" value={group.id} />}
        <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="label">Name</span><input className="input" name="name" required defaultValue={group?.name} /></label><label className="block"><span className="label">Einheit</span>{group ? <><input type="hidden" name="unitId" value={unitId} /><input disabled className="input" value={units.find((u) => u.id === unitId)?.name ?? ""} /></> : <select name="unitId" className="input" defaultValue={unitId}>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}</label></div>
        <fieldset><legend className="label">Mitglieder</legend><div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">{helpers.map((h) => <label key={h.id} className="flex min-h-[36px] items-center gap-2 text-sm"><input type="checkbox" name="memberIds[]" value={h.id} defaultChecked={group?.members.some((m) => m.id === h.id)} className="h-4 w-4" />{h.name}</label>)}</div></fieldset>
        <SubmitButton>Speichern</SubmitButton>
      </ActionForm>
      {group && <ActionButton action={deleteGroupAction} fields={{ id: group.id }} variant="ghost" label="Alarmgruppe löschen" confirm="Alarmgruppe löschen?" />}
    </div>
  );
}
