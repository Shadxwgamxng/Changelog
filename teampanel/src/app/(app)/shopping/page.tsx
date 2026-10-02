import type { Metadata } from "next";
import { CheckCircle2, ExternalLink, ShoppingCart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtEuro } from "@/lib/dates";
import { CATEGORY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { OwnershipBadge } from "@/components/features/badges";
import { shoppingTabs } from "@/components/features/equipment-tabs";
import { OwnershipEditor } from "@/components/features/ownership-controls";
import { getNeeds } from "@/server/queries/equipment";

export const metadata: Metadata = { title: "Meine Einkaufsliste" };

export default async function MyShoppingPage() {
  const user = await requireUser();
  const needs = await getNeeds(user.id);
  const total = needs.filter((n) => n.status !== "ORDERED").reduce((sum, n) => sum + (n.equipment.priceCents ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow="Einkaufsliste" title="Noch benötigt" subtitle="Zugewiesene Ausrüstung und fehlende Pflichtausrüstung." />
      <Tabs items={shoppingTabs("mine")} />

      {needs.length === 0 ? (
        <Card>
          <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-ok" />} title="Alles vorhanden">
            Dir fehlt aktuell nichts. Sobald dir die Teamleitung Ausrüstung zuweist, erscheint sie hier.
          </EmptyState>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            {needs.length} {needs.length === 1 ? "Gegenstand" : "Gegenstände"} · geschätzt <strong className="text-fg">{fmtEuro(total)}</strong> (ohne bereits Bestelltes)
          </p>
          <ul className="space-y-3">
            {needs.map((n) => (
              <li key={n.key}>
                <Card className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-1 text-lg leading-none" aria-label={n.urgency === "high" ? "Dringend benötigt" : "Zusätzlich empfohlen"}>
                        {n.urgency === "high" ? "🔴" : "🟡"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{n.equipment.name}</p>
                        <p className="text-xs text-muted">
                          {CATEGORY_LABELS[n.equipment.category]} · {fmtEuro(n.equipment.priceCents)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <OwnershipBadge status={n.status} />
                          {n.reason === "REQUIRED" ? <Badge tone="danger">Pflichtausrüstung</Badge> : <Badge tone="accent">Zugewiesen</Badge>}
                          {n.dueDate && <Badge tone="warn">bis {fmtDate(n.dueDate)}</Badge>}
                        </div>
                        {n.note && <p className="mt-1.5 text-sm text-muted">„{n.note}“</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {n.equipment.shopUrl ? (
                        <ButtonLink href={n.equipment.shopUrl} target="_blank" rel="noopener noreferrer nofollow" variant="primary" size="sm">
                          Zum Shop <ExternalLink className="h-3.5 w-3.5" />
                        </ButtonLink>
                      ) : (
                        <span className="text-xs text-subtle">Kein Shop-Link hinterlegt</span>
                      )}
                      <OwnershipEditor equipmentId={n.equipment.id} name={n.equipment.name} status={n.status} quantity={1} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
      <CardBody className="px-0 text-xs text-subtle">
        <ShoppingCart className="mr-1 inline h-3.5 w-3.5" />
        Setze den Status auf „Bestellt“ oder „Vorhanden“, sobald du etwas besorgt hast – dann verschwindet es von dieser Liste.
      </CardBody>
    </>
  );
}
