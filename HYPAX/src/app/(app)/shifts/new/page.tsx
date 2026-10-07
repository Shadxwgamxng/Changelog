import { requireCtx } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { unitsWith } from "@/server/context";
import { listQualTypes } from "@/server/services/qualifications";
import { listEvents } from "@/server/services/events";
import { helperOptions } from "@/server/services/helpers";
import { createShiftAction } from "../actions";
import { ShiftForm } from "../shift-form";
import { forbidden } from "@/server/errors";
import { parseBerlinLocal } from "@/lib/dates";

export const metadata = { title: "Dienst erstellen" };

export default async function NewShift({ searchParams }: { searchParams: Promise<{ event?: string; unit?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const units = await unitsWith(ctx, "shift.create");
  if (!units.length) throw forbidden();
  const [qualTypes, events, helpers] = await Promise.all([listQualTypes(ctx), listEvents(ctx, { from: new Date(Date.now() - 86_400_000) }), helperOptions(ctx)]);
  const ev = sp.event ? events.find((e) => e.id === sp.event) : undefined;
  const unitId = ev?.unitId ?? sp.unit ?? units[0].id;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Dienst erstellen" back={{ href: "/shifts", label: "Dienste" }} subtitle="Neue Dienste starten als Entwurf. Erst nach dem Veröffentlichen können sich Helfer anmelden." />
      <ShiftForm action={createShiftAction} submit="Dienst als Entwurf anlegen" units={units} qualTypes={qualTypes} events={events} helpers={helpers}
        defaults={{ unitId, eventId: ev?.id ?? null, startsAt: ev?.startsAt ?? parseBerlinLocal(`${tomorrow}T18:00`)!, endsAt: ev?.endsAt ?? parseBerlinLocal(`${tomorrow}T22:00`)!, name: ev ? `Sanitätsdienst ${ev.name}` : "", kind: "SANITAETSDIENST" }} />
    </>
  );
}
