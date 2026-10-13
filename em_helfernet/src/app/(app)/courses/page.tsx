import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere } from "@/server/context";
import { listCourses, PARTICIPANT_STATUS_LABEL } from "@/server/services/courses";
import { Badge, Empty, LinkButton, PageHeader, Tabs } from "@/components/ui";
import { fmtLong, fmtRange } from "@/lib/dates";

export const metadata = { title: "Lehrgänge" };

const statusTone = { ANGEMELDET: "ok", WARTELISTE: "warn", ABGEMELDET: "neutral", BESTANDEN: "ok", NICHT_BESTANDEN: "danger" } as const;

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireCtx();
  const t = (await searchParams).tab;
  const scope = t === "past" ? "past" : t === "mine" ? "mine" : "upcoming";
  const courses = await listCourses(ctx, { scope });
  const tabs = [{ key: "upcoming", label: "Kommende", href: "/courses" }, ...(ctx.helperId ? [{ key: "mine", label: "Meine Lehrgänge & Zertifikate", href: "/courses?tab=mine" }] : []), { key: "past", label: "Vergangene", href: "/courses?tab=past" }];
  return (
    <>
      <PageHeader title="Lehrgänge" subtitle="Lehrgangstermine, Anmeldung und Zertifikate." actions={hasAnywhere(ctx, "course.manage") ? <LinkButton href="/courses/new" variant="primary"><Plus className="h-4 w-4" />Lehrgang anlegen</LinkButton> : undefined} />
      <Tabs tabs={tabs} active={scope} />
      {courses.length === 0 ? <Empty title={scope === "mine" ? "Noch keine Lehrgänge" : "Keine Lehrgänge"} text={scope === "upcoming" ? "Sobald ein Lehrgang geplant ist, erscheint er hier." : undefined} /> : (
        <ul className="space-y-3">{courses.map((c) => (
          <li key={c.id}>
            <Link href={`/courses/${c.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:shadow-pop">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.title}</p>
                <p className="text-sm text-fg-muted">{fmtLong(c.startsAt)} · {fmtRange(c.startsAt, c.endsAt)}{c.location ? ` · ${c.location}` : ""}</p>
                <p className="text-xs text-fg-subtle">{c.unitName}{c.qualificationName ? ` · vermittelt: ${c.qualificationName}` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status === "ABGESAGT" && <Badge tone="danger">Abgesagt</Badge>}
                {c.status === "ABGESCHLOSSEN" && <Badge>Abgeschlossen</Badge>}
                {c.myStatus && <Badge tone={statusTone[c.myStatus]}>{PARTICIPANT_STATUS_LABEL[c.myStatus]}</Badge>}
                {c.status === "GEPLANT" && <Badge tone={c.full ? "warn" : "info"}>{c.capacity === null ? `${c.taken} angemeldet` : c.full ? `Voll${c.waiting ? ` · ${c.waiting} warten` : ""}` : `${c.free} von ${c.capacity} frei`}</Badge>}
              </div>
            </Link>
          </li>
        ))}</ul>
      )}
    </>
  );
}
