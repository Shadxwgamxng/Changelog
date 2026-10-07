import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, visibleUnits } from "@/server/context";
import { listShifts } from "@/server/services/shifts";
import { Badge, Card, Empty, LinkButton, PageHeader, ProgressBar } from "@/components/ui";
import { SHIFT_KIND_LABEL, SHIFT_STATUS_LABEL, ASSIGNMENT_STATUS_LABEL } from "@/lib/constants";
import { assignmentTone, shiftStatusTone } from "@/lib/ui-maps";
import { fmtLong, fmtRange, berlinDateKey, parseBerlinLocal } from "@/lib/dates";
import { AutoSubmitSelect } from "@/components/forms";

export const metadata = { title: "Dienste" };
type SP = { unit?: string; kind?: string; status?: string; mine?: string; open?: string; range?: string };

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const now = new Date();
  const range = sp.range ?? "upcoming";
  const from = range === "past" ? new Date(now.getTime() - 180 * 86_400_000) : range === "all" ? new Date(now.getTime() - 365 * 86_400_000) : new Date(now.getTime() - 3_600_000 * 4);
  const to = range === "past" ? now : new Date(now.getTime() + 400 * 86_400_000);
  const shifts = await listShifts(ctx, { from, to, unitId: sp.unit || undefined, kind: (sp.kind as never) || undefined, status: (sp.status as never) || undefined, mine: sp.mine === "1", openOnly: sp.open === "1" });
  const ordered = range === "past" ? [...shifts].reverse() : shifts;
  const units = await visibleUnits(ctx);
  const canCreate = hasAnywhere(ctx, "shift.create");
  const groups = new Map<string, typeof shifts>();
  for (const s of ordered) { const k = berlinDateKey(s.startsAt); groups.set(k, [...(groups.get(k) ?? []), s]); }
  return (
    <>
      <PageHeader title="Dienste" subtitle="Sanitätsdienste, Bereitschaftsabende, Ausbildung und mehr." actions={canCreate && <LinkButton href="/shifts/new" variant="primary"><Plus className="h-4 w-4" />Dienst erstellen</LinkButton>} />
      <form className="card card-pad mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filter">
        <select name="range" defaultValue={range} className="input" aria-label="Zeitraum"><option value="upcoming">Kommende</option><option value="past">Vergangene</option><option value="all">Alle (1 Jahr)</option></select>
        <select name="unit" defaultValue={sp.unit ?? ""} className="input" aria-label="Einheit"><option value="">Alle Einheiten</option>{units.map((u) => <option key={u.id} value={u.id}>{"— ".repeat(u.path.split("/").length - 3)}{u.name}</option>)}</select>
        <select name="kind" defaultValue={sp.kind ?? ""} className="input" aria-label="Dienstart"><option value="">Alle Arten</option>{Object.entries(SHIFT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <AutoSubmitSelect name="status" defaultValue={sp.status ?? ""} aria-label="Status"><option value="">Alle Status</option>{Object.entries(SHIFT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</AutoSubmitSelect>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="mine" value="1" defaultChecked={sp.mine === "1"} className="h-4 w-4" /> Meine</label>
          <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="open" value="1" defaultChecked={sp.open === "1"} className="h-4 w-4" /> Mit freien Plätzen</label>
          <button className="btn btn-sm ml-auto">Filtern</button>
        </div>
      </form>
      {ordered.length === 0 ? <Empty title="Keine Dienste gefunden" text="Passe die Filter an oder erstelle einen neuen Dienst." action={canCreate && <LinkButton href="/shifts/new" variant="primary">Dienst erstellen</LinkButton>} /> : (
        <div className="space-y-6">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold text-fg-muted">{fmtLong(list[0].startsAt)}</h2>
              <ul className="space-y-2.5">
                {list.map((s) => (
                  <li key={s.id}>
                    <Link href={`/shifts/${s.id}`} className="card block px-4 py-3.5 transition hover:border-line-strong hover:shadow-pop">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="text-sm text-fg-muted">{fmtRange(s.startsAt, s.endsAt)} · {s.unitName}{s.location ? ` · ${s.location}` : ""}</p></div>
                        <div className="flex flex-wrap gap-1.5"><Badge>{SHIFT_KIND_LABEL[s.kind]}</Badge>{s.status !== "OFFEN" && <Badge tone={shiftStatusTone[s.status]}>{SHIFT_STATUS_LABEL[s.status]}</Badge>}{s.myStatus && <Badge tone={assignmentTone[s.myStatus]}>{s.myStatus === "BESTAETIGT" ? "✅ Zugesagt" : ASSIGNMENT_STATUS_LABEL[s.myStatus]}</Badge>}</div>
                      </div>
                      {s.needed > 0 && (
                        <div className="mt-3 flex items-center gap-3"><div className="flex-1"><ProgressBar value={s.filledPositions} max={s.needed} label={`Besetzung ${s.name}`} /></div><span className="text-xs tabular-nums text-fg-muted">{s.filledPositions}/{s.needed} besetzt{s.requested ? ` · ${s.requested} Anfrage${s.requested > 1 ? "n" : ""}` : ""}</span></div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <span hidden><Card>{null}</Card>{String(parseBerlinLocal("2027-01-01T00:00"))}</span>
    </>
  );
}
