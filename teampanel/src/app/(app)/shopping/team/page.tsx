import type { Metadata } from "next";
import { ExternalLink, Pencil, Plus, ShoppingCart, Trash2, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { CATEGORY_OPTIONS, CATEGORY_LABELS, SHOPPING_STATUS_OPTIONS, shortName } from "@/lib/labels";
import { fmtEuro } from "@/lib/dates";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickEnum, pickString } from "@/components/ui/filter-bar";
import { ModalTrigger } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { PriorityBadge, ShoppingStatusBadge } from "@/components/features/badges";
import { shoppingTabs } from "@/components/features/equipment-tabs";
import { ShoppingForm } from "@/components/features/shopping-form";
import { ShoppingStatusSelect } from "@/components/features/shopping-status-select";
import { deleteShoppingItem } from "@/server/actions/shopping";
import { getShoppingItems } from "@/server/queries/shopping";

export const metadata: Metadata = { title: "Team-Einkaufsliste" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TeamShoppingPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const manage = can(user, "shopping.manage");
  const status = pickEnum(sp.status, ["OPEN", "ORDERED", "PURCHASED"] as const);
  const category = pickEnum(sp.category, CATEGORY_OPTIONS.map((c) => c.value));
  const q = pickString(sp.q);

  const [items, equipment, members] = await Promise.all([
    getShoppingItems({ status, category, q }),
    manage ? db.equipment.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    manage ? db.user.findMany({ where: { active: true, profile: { isNot: null } }, include: { profile: true }, orderBy: { profile: { firstName: "asc" } } }) : Promise.resolve([]),
  ]);
  const equipmentOptions = equipment.map((e) => ({ value: e.id, label: e.name }));
  const memberOptions = members.map((m) => ({ value: m.id, label: `${shortName(m.profile!)} (${m.profile!.firstName} ${m.profile!.lastName})` }));
  const openTotal = items.filter((i) => i.status === "OPEN").reduce((s, i) => s + (i.priceCents ?? 0) * i.quantity, 0);

  return (
    <>
      <PageHeader
        eyebrow="Einkaufsliste"
        title="Team-Einkaufsliste"
        subtitle="Empfohlene Produkte und Sammelbestellungen."
        actions={
          manage && (
            <ModalTrigger variant="primary" label={<><Plus className="h-4 w-4" /> Artikel hinzufügen</>} title="Neuer Einkaufsartikel" modalSize="lg">
              <ShoppingForm equipment={equipmentOptions} members={memberOptions} />
            </ModalTrigger>
          )
        }
      />
      <Tabs items={shoppingTabs("team")} />
      <FilterBar resetHref="/shopping/team">
        <FilterInput label="Suche" name="q" value={q} placeholder="Produkt oder Shop" />
        <FilterSelect label="Status" name="status" value={status} options={SHOPPING_STATUS_OPTIONS} />
        <FilterSelect label="Kategorie" name="category" value={category} options={CATEGORY_OPTIONS} />
      </FilterBar>

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<ShoppingCart className="h-8 w-8" />} title="Keine Artikel">
            {status || category || q ? "Mit diesen Filtern gibt es keine Treffer." : "Die Einkaufsliste ist noch leer."}
          </EmptyState>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Offen insgesamt: <strong className="text-fg">{fmtEuro(openTotal)}</strong>
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((i) => (
              <Card key={i.id} className="flex flex-col p-4">
                <div className="flex gap-3">
                  {i.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-md border border-line object-cover" loading="lazy" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      <ShoppingStatusBadge status={i.status} />
                      <PriorityBadge priority={i.priority} />
                      <Badge>{CATEGORY_LABELS[i.category]}</Badge>
                    </div>
                    <h3 className="break-words font-semibold">{i.name}</h3>
                    {i.description && <p className="mt-1 text-sm text-muted">{i.description}</p>}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="label-caps">Preis</dt>
                    <dd>{fmtEuro(i.priceCents)}</dd>
                  </div>
                  <div>
                    <dt className="label-caps">Anzahl</dt>
                    <dd>{i.quantity}×</dd>
                  </div>
                  <div>
                    <dt className="label-caps">Shop</dt>
                    <dd className="truncate">{i.shop ?? "–"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {i.equipmentId && (
                    <Badge tone={i.needers > 0 ? "warn" : "ok"}>
                      <Users className="h-3 w-3" /> {i.needers === 0 ? "Niemand benötigt ihn aktuell" : i.needers === 1 ? "1 Mitglied benötigt diesen Artikel" : `${i.needers} Mitglieder benötigen diesen Artikel`}
                    </Badge>
                  )}
                  {i.targetUser?.profile && <Badge tone="accent">Für {shortName(i.targetUser.profile)}</Badge>}
                  {!i.equipmentId && !i.targetUser && <Badge>Für das ganze Team</Badge>}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                  <div className="flex items-center gap-2">
                    {i.url && (
                      <a href={i.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-elevated px-3 text-xs font-medium hover:border-subtle">
                        Zum Produkt <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {manage && (
                    <div className="flex items-center gap-1">
                      <ShoppingStatusSelect id={i.id} status={i.status} name={i.name} />
                      <ModalTrigger
                        variant="ghost"
                        size="sm"
                        label={<Pencil className="h-3.5 w-3.5" />}
                        ariaLabel={`${i.name} bearbeiten`}
                        title="Artikel bearbeiten"
                        modalSize="lg"
                      >
                        <ShoppingForm
                          equipment={equipmentOptions}
                          members={memberOptions}
                          values={{ id: i.id, name: i.name, category: i.category, description: i.description ?? "", shop: i.shop ?? "", url: i.url ?? "", price: i.priceCents !== null ? (i.priceCents / 100).toFixed(2).replace(".", ",") : "", priority: i.priority, imageUrl: i.imageUrl, quantity: i.quantity, status: i.status, equipmentId: i.equipmentId ?? "", targetUserId: i.targetUserId ?? "" }}
                        />
                      </ModalTrigger>
                      <ActionButton
                        size="sm"
                        variant="ghost"
                        ariaLabel={`${i.name} entfernen`}
                        action={deleteShoppingItem} args={[i.id]}
                        confirm={{ title: "Artikel entfernen?", message: `„${i.name}“ wird von der Einkaufsliste gelöscht.`, confirmLabel: "Entfernen", danger: true }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </ActionButton>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
