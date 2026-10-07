import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireCtx } from "@/server/session";
import { getIncident } from "@/server/services/incidents";
import { Badge, Card, Dl, LinkButton, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { fmtDateTime } from "@/lib/dates";
import { deleteIncidentAction } from "../actions";

export const metadata = { title: "Einsatz" };

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const i = await getIncident(ctx, id).catch(() => null);
  if (!i) notFound();
  return (
    <>
      <PageHeader title={`Einsatz ${i.number}: ${i.kind}`} back={{ href: "/incidents", label: "Einsätze" }} subtitle={i.unitName} actions={<><Badge tone={i.status === "LAUFEND" ? "danger" : "ok"}>{i.status === "LAUFEND" ? "Laufend" : "Abgeschlossen"}</Badge>{i.canManage && <LinkButton href={`/incidents/${id}/edit`}><Pencil className="h-4 w-4" />Bearbeiten</LinkButton>}</>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Einsatzdaten"><Dl items={[["Alarmierung", i.alertedAt ? fmtDateTime(i.alertedAt) : null], ["Einsatzbeginn", fmtDateTime(i.startedAt)], ["Einsatzende", i.endedAt ? fmtDateTime(i.endedAt) : "laufend"], ["Einsatzort", i.location]]} /></Card>
          <Card title="Dokumentation"><p className="prose-plain">{i.documentation || "Keine Einträge."}</p></Card>
        </div>
        <div className="space-y-5">
          <Card title={`Beteiligte Helfer (${i.helpers.length})`}><ul className="space-y-1.5 text-sm">{i.helpers.map((h) => <li key={h.helperId} className="flex justify-between gap-2"><span>{h.helper.lastName}, {h.helper.firstName}</span><span className="text-fg-muted">{h.role}</span></li>)}{i.helpers.length === 0 && <li className="text-fg-muted">–</li>}</ul></Card>
          <Card title="Fahrzeuge"><ul className="space-y-1 text-sm">{i.vehicles.map((v) => <li key={v.vehicleId}>{v.vehicle.name} <span className="text-fg-muted">{v.vehicle.callSign}</span></li>)}{i.vehicles.length === 0 && <li className="text-fg-muted">–</li>}</ul></Card>
          <Card title="Material"><ul className="space-y-1 text-sm">{i.materials.map((m) => <li key={m.materialId}>{m.quantity}× {m.material.name}</li>)}{i.materials.length === 0 && <li className="text-fg-muted">–</li>}</ul></Card>
          {i.canManage && <ActionButton action={deleteIncidentAction} fields={{ id }} variant="ghost" small={false} label="Einsatz löschen" confirm="Einsatz endgültig löschen?" />}
        </div>
      </div>
    </>
  );
}
