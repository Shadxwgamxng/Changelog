import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere } from "@/server/context";
import { listEvents } from "@/server/services/events";
import { Badge, Empty, LinkButton, PageHeader } from "@/components/ui";
import { fmtRange, fmtLong } from "@/lib/dates";

export const metadata = { title: "Veranstaltungen" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const ctx = await requireCtx();
  const past = (await searchParams).past === "1";
  const now = new Date();
  const events = await listEvents(ctx, past ? { to: now } : { from: now });
  const list = past ? [...events].reverse() : events;
  return (
    <>
      <PageHeader title="Veranstaltungen" subtitle="Veranstaltungen bündeln mehrere Dienste, Fahrzeuge, Material und Aufgaben." actions={<>{hasAnywhere(ctx, "event.manage") && <LinkButton href="/events/new" variant="primary"><Plus className="h-4 w-4" />Veranstaltung anlegen</LinkButton>}<LinkButton href={past ? "/events" : "/events?past=1"}>{past ? "Kommende" : "Vergangene"}</LinkButton></>} />
      {list.length === 0 ? <Empty title="Keine Veranstaltungen" /> : (
        <ul className="space-y-3">{list.map((e) => (
          <li key={e.id}><Link href={`/events/${e.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:shadow-pop"><div className="min-w-0"><p className="truncate font-semibold">{e.name}</p><p className="text-sm text-fg-muted">{fmtLong(e.startsAt)} · {fmtRange(e.startsAt, e.endsAt)}{e.location ? ` · ${e.location}` : ""}</p><p className="text-xs text-fg-subtle">{e.unitName}</p></div><div className="flex gap-2">{e.cancelled && <Badge tone="danger">Abgesagt</Badge>}<Badge tone="info">{e.shiftCount} Dienst{e.shiftCount === 1 ? "" : "e"}</Badge></div></Link></li>
        ))}</ul>
      )}
    </>
  );
}
