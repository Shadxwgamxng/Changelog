import type { Metadata } from "next";
import { Plus, CalendarX } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { EVENT_STATUS_OPTIONS, EVENT_TYPE_OPTIONS } from "@/lib/labels";
import { localToDate, addDays } from "@/lib/dates";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickEnum, pickString } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EventCard } from "@/components/features/event-card";
import { listEvents } from "@/server/queries/events";

export const metadata: Metadata = { title: "Spieltage" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = pickEnum(sp.range, ["upcoming", "past", "all"] as const) ?? "upcoming";
  const status = pickEnum(sp.status, ["PLANNED", "OPEN", "FULL", "COMPLETED", "CANCELLED"] as const);
  const type = pickEnum(sp.type, ["SPIELTAG", "TRAINING", "BESPRECHUNG", "SONSTIGES"] as const);
  const mine = pickEnum(sp.mine, ["ACCEPTED", "MAYBE", "DECLINED", "NONE"] as const);
  const fromStr = pickString(sp.from, 10);
  const toStr = pickString(sp.to, 10);
  const from = fromStr ? (localToDate(fromStr) ?? undefined) : undefined;
  const toBase = toStr ? localToDate(toStr) : null;
  const to = toBase ? addDays(toBase, 1) : undefined;
  const q = pickString(sp.q);

  const events = await listEvents(user.id, { range, status, type, mine, from, to, q });
  const hasFilter = Boolean(status || type || mine || from || to || q || range !== "upcoming");

  return (
    <>
      <PageHeader
        eyebrow="Termine"
        title="Spieltage & Termine"
        subtitle="Zu- und Absagen, Details und Anfahrt."
        actions={
          can(user, "events.create") && (
            <ButtonLink href="/events/new" variant="primary">
              <Plus className="h-4 w-4" /> Neuer Termin
            </ButtonLink>
          )
        }
      />
      <FilterBar resetHref="/events">
        <FilterInput label="Suche" name="q" value={q} placeholder="Titel oder Ort" />
        <FilterSelect label="Zeitraum" name="range" value={range} placeholder="Kommende" options={[{ value: "upcoming", label: "Kommende" }, { value: "past", label: "Vergangene" }, { value: "all", label: "Alle" }]} />
        <FilterSelect label="Status" name="status" value={status} options={EVENT_STATUS_OPTIONS} />
        <FilterSelect label="Art" name="type" value={type} options={EVENT_TYPE_OPTIONS} />
        <FilterSelect label="Meine Teilnahme" name="mine" value={mine} options={[{ value: "ACCEPTED", label: "Zugesagt" }, { value: "MAYBE", label: "Vielleicht" }, { value: "DECLINED", label: "Abgesagt" }, { value: "NONE", label: "Noch keine Antwort" }]} />
        <FilterInput label="Von" name="from" type="date" value={fromStr} />
        <FilterInput label="Bis" name="to" type="date" value={toStr} />
      </FilterBar>

      {events.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarX className="h-8 w-8" />}
            title={hasFilter ? "Keine Treffer" : "Keine Termine geplant"}
            action={!hasFilter && can(user, "events.create") ? <ButtonLink href="/events/new" variant="primary">Ersten Termin anlegen</ButtonLink> : undefined}
          >
            {hasFilter ? "Mit diesen Filtern wurde kein Termin gefunden." : "Sobald ein Termin angelegt wird, erscheint er hier."}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </>
  );
}
