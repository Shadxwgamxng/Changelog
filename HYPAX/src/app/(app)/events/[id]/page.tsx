import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { getEvent } from "@/server/services/events";
import { listShifts } from "@/server/services/shifts";
import { hasAnywhere } from "@/server/context";
import { Badge, Card, Dl, LinkButton, ProgressBar } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { EVENT_TASK_LABEL, SHIFT_KIND_LABEL } from "@/lib/constants";
import { fmtDateTime, fmtRange } from "@/lib/dates";
import { cancelEventAction, toggleTaskAction } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const e = await getEvent(ctx, (await params).id).catch(() => null);
  return { title: e?.name ?? "Veranstaltung" };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const e = await getEvent(ctx, id).catch(() => null);
  if (!e) notFound();
  const shifts = await listShifts(ctx, { eventId: id, take: 100 });
  const canShift = hasAnywhere(ctx, "shift.create");
  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/events" className="mb-1 inline-block text-sm text-fg-subtle hover:text-fg">← Veranstaltungen</Link><h1 className="text-xl font-semibold tracking-tight">{e.name} {e.cancelled && <Badge tone="danger">Abgesagt</Badge>}</h1><p className="mt-1 text-sm text-fg-muted">{fmtDateTime(e.startsAt)} – {fmtDateTime(e.endsAt)}{e.location ? ` · ${e.location}` : ""}</p></div>
        {e.canManage && <div className="flex gap-2"><LinkButton href={`/events/${id}/edit`}><Pencil className="h-4 w-4" />Bearbeiten</LinkButton>{!e.cancelled && <ActionButton action={cancelEventAction} fields={{ id }} small={false} variant="danger" label="Absagen" confirm="Veranstaltung absagen?" />}</div>}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Dienste dieser Veranstaltung" action={canShift && <LinkButton href={`/shifts/new?event=${id}`} size="sm"><Plus className="h-4 w-4" />Dienst</LinkButton>}>
            {shifts.length === 0 ? <p className="text-sm text-fg-muted">Noch keine Dienste zugeordnet.</p> : (
              <ul className="space-y-3">{shifts.map((s) => (
                <li key={s.id}><Link href={`/shifts/${s.id}`} className="block rounded-lg border border-line p-3 transition hover:bg-surface-2"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{s.name}</span><span className="flex gap-1.5"><Badge>{SHIFT_KIND_LABEL[s.kind]}</Badge>{s.status === "ENTWURF" && <Badge>Entwurf</Badge>}</span></div><p className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</p>{s.needed > 0 && <div className="mt-2 flex items-center gap-3"><div className="flex-1"><ProgressBar value={s.filledPositions} max={s.needed} label="Besetzung" /></div><span className="text-xs tabular-nums text-fg-muted">{s.filledPositions}/{s.needed}</span></div>}</Link></li>
              ))}</ul>
            )}
          </Card>
          {e.description && <Card title="Beschreibung"><p className="prose-plain">{e.description}</p></Card>}
        </div>
        <div className="space-y-5">
          <Card title="Aufgaben">
            {e.tasks.length === 0 ? <p className="text-sm text-fg-muted">Keine Aufgaben.</p> : <ul className="space-y-1">{e.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm"><span className={t.done ? "text-fg-subtle line-through" : ""}><Badge tone="neutral">{EVENT_TASK_LABEL[t.kind]}</Badge> {t.title}</span>{e.canManage && <ActionButton action={toggleTaskAction} fields={{ taskId: t.id }} variant="ghost" label={t.done ? "↺" : "✓"} />}</li>
            ))}</ul>}
          </Card>
          <Card title="Details"><Dl items={[["Einheit", e.unitName], ["Veranstalter", e.organizer], ["Ort", e.location]]} /></Card>
        </div>
      </div>
    </>
  );
}
