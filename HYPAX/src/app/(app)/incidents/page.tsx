import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere } from "@/server/context";
import { listIncidents } from "@/server/services/incidents";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";

export const metadata = { title: "Einsätze" };

export default async function IncidentsPage() {
  const ctx = await requireCtx();
  const list = await listIncidents(ctx);
  return (
    <>
      <PageHeader title="Einsätze" subtitle="Datensparsame Einsatzdokumentation – keine Patientendaten." actions={hasAnywhere(ctx, "incident.manage") && <LinkButton href="/incidents/new" variant="primary"><Plus className="h-4 w-4" />Einsatz erfassen</LinkButton>} />
      {list.length === 0 ? <Empty title="Keine Einsätze" /> : (
        <Card pad={false}><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Nr.</th><th>Einsatzart</th><th>Beginn</th><th className="hidden sm:table-cell">Ort</th><th>Kräfte</th><th>Status</th></tr></thead><tbody>
          {list.map((i) => <tr key={i.id} className="row-link"><td className="font-mono text-xs"><Link href={`/incidents/${i.id}`} className="font-medium hover:underline">{i.number}</Link></td><td>{i.kind}<span className="block text-xs text-fg-subtle">{i.unitName}</span></td><td className="whitespace-nowrap">{fmtDateTime(i.startedAt)}</td><td className="hidden text-fg-muted sm:table-cell">{i.location ?? "–"}</td><td className="tabular-nums">{i.helperCount} H · {i.vehicleCount} Fzg</td><td><Badge tone={i.status === "LAUFEND" ? "danger" : "ok"}>{i.status === "LAUFEND" ? "Laufend" : "Abgeschlossen"}</Badge></td></tr>)}
        </tbody></table></div></Card>
      )}
    </>
  );
}
