import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, PackageSearch, ShoppingCart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CATEGORY_OPTIONS } from "@/lib/labels";
import { CATEGORY_LABELS } from "@/lib/labels";
import { fmtEuro } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterSelect, pickEnum } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { equipmentTabs } from "@/components/features/equipment-tabs";
import { OwnershipEditor, OwnershipSelect } from "@/components/features/ownership-controls";
import { getCatalog, getEquipmentSummary } from "@/server/queries/equipment";

export const metadata: Metadata = { title: "Meine Ausrüstung" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function MyEquipmentPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const category = pickEnum(sp.category, CATEGORY_OPTIONS.map((c) => c.value));
  const required = pickEnum(sp.required, ["required", "optional"] as const);
  const have = pickEnum(sp.have, ["have", "missing"] as const);

  const [items, summary] = await Promise.all([getCatalog(user.id, { category, required, have }), getEquipmentSummary(user.id)]);
  const pct = summary.requiredTotal ? Math.round((summary.requiredOwned / summary.requiredTotal) * 100) : 100;

  return (
    <>
      <PageHeader eyebrow="Ausrüstung" title="Meine Ausrüstung" subtitle="Pflege, was du besitzt – die Teamleitung sieht den Stand." actions={<ButtonLink href="/shopping" variant="secondary"><ShoppingCart className="h-4 w-4" /> Meine Einkaufsliste</ButtonLink>} />
      <Tabs items={equipmentTabs("mine")} />

      <Card tactical className="mb-5">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm">
              <strong className="font-display text-2xl">{summary.requiredOwned}</strong> von {summary.requiredTotal} Pflichtgegenständen vorhanden
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pflichtausrüstung">
              <div className={`h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-accent-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-sm text-muted">
            {summary.openNeeds > 0 ? (
              <Link href="/shopping" className="text-warn hover:underline">
                {summary.openNeeds} {summary.openNeeds === 1 ? "Gegenstand" : "Gegenstände"} noch benötigt →
              </Link>
            ) : (
              <span className="text-ok">Nichts mehr benötigt 👍</span>
            )}
          </div>
        </CardBody>
      </Card>

      <FilterBar resetHref="/equipment">
        <FilterSelect label="Kategorie" name="category" value={category} options={CATEGORY_OPTIONS} />
        <FilterSelect label="Pflicht / optional" name="required" value={required} options={[{ value: "required", label: "Nur Pflicht" }, { value: "optional", label: "Nur optional" }]} />
        <FilterSelect label="Vorhanden / fehlt" name="have" value={have} options={[{ value: "have", label: "Vorhanden" }, { value: "missing", label: "Fehlt / nicht vorhanden" }]} />
      </FilterBar>

      <Card>
        {items.length === 0 ? (
          <EmptyState icon={<PackageSearch className="h-8 w-8" />} title="Keine Ausrüstung gefunden">
            {category || required || have ? "Mit diesen Filtern gibt es keine Treffer." : "Der Katalog ist noch leer. Die Teamleitung kann Ausrüstung im Katalog anlegen."}
          </EmptyState>
        ) : (
          <TableWrap>
            <Table className="min-w-[44rem]">
              <thead>
                <tr>
                  <Th>Gegenstand</Th>
                  <Th>Kategorie</Th>
                  <Th>Pflicht</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aktionen</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      <p className="font-medium">{i.name}</p>
                      <p className="text-xs text-subtle">
                        {i.myQuantity > 0 && i.myStatus !== "MISSING" ? `${i.myQuantity}× vorhanden · ` : ""}Empfohlen: {i.recommendedQuantity}× · {fmtEuro(i.priceCents)}
                      </p>
                      {i.myNotes && <p className="text-xs text-muted">📝 {i.myNotes}</p>}
                    </Td>
                    <Td className="text-muted">{CATEGORY_LABELS[i.category]}</Td>
                    <Td>{i.required ? <Badge tone="danger">Pflicht</Badge> : <Badge>Optional</Badge>}</Td>
                    <Td>
                      <OwnershipSelect equipmentId={i.id} status={i.myStatus} label={i.name} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <OwnershipEditor equipmentId={i.id} name={i.name} status={i.myStatus} quantity={i.myQuantity} notes={i.myNotes} />
                        {i.shopUrl && (
                          <a href={i.shopUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs text-accent-300 hover:bg-elevated" aria-label={`${i.name} im Shop ansehen (neuer Tab)`}>
                            Shop <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
