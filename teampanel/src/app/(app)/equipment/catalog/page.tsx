import type { Metadata } from "next";
import { Pencil, PackageSearch, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CATEGORY_OPTIONS } from "@/lib/labels";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickEnum, pickString } from "@/components/ui/filter-bar";
import { ModalTrigger } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { EquipmentCard } from "@/components/features/equipment-card";
import { EquipmentForm } from "@/components/features/equipment-form";
import { equipmentTabs } from "@/components/features/equipment-tabs";
import { deleteEquipment } from "@/server/actions/equipment";
import { addEquipmentToShopping } from "@/server/actions/shopping";
import { getCatalog } from "@/server/queries/equipment";

export const metadata: Metadata = { title: "Ausrüstungskatalog" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const category = pickEnum(sp.category, CATEGORY_OPTIONS.map((c) => c.value));
  const required = pickEnum(sp.required, ["required", "optional"] as const);
  const q = pickString(sp.q);
  const items = await getCatalog(user.id, { category, required, q });
  const manage = can(user, "equipment.manage");
  const shop = can(user, "shopping.manage");

  return (
    <>
      <PageHeader
        eyebrow="Ausrüstung"
        title="Ausrüstungskatalog"
        subtitle="Empfohlene und vorgeschriebene Ausrüstung des Teams."
        actions={
          manage && (
            <ModalTrigger variant="primary" label={<><Plus className="h-4 w-4" /> Neue Ausrüstung</>} title="Neue Ausrüstung" modalSize="lg">
              <EquipmentForm />
            </ModalTrigger>
          )
        }
      />
      <Tabs items={equipmentTabs("catalog")} />
      <FilterBar resetHref="/equipment/catalog">
        <FilterInput label="Suche" name="q" value={q} placeholder="Name, Hersteller, Modell" />
        <FilterSelect label="Kategorie" name="category" value={category} options={CATEGORY_OPTIONS} />
        <FilterSelect label="Pflicht / optional" name="required" value={required} options={[{ value: "required", label: "Nur Pflicht" }, { value: "optional", label: "Nur optional" }]} />
      </FilterBar>

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<PackageSearch className="h-8 w-8" />} title="Keine Ausrüstung gefunden">
            {category || required || q ? "Mit diesen Filtern gibt es keine Treffer." : "Es wurde noch keine Ausrüstung angelegt."}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((i) => (
            <EquipmentCard
              key={i.id}
              equipment={i}
              status={i.myStatus}
              quantity={i.myQuantity}
              actions={
                manage || shop ? (
                  <>
                    {shop && (
                      <ActionButton size="sm" variant="ghost" action={addEquipmentToShopping} args={[i.id]} ariaLabel={`${i.name} auf die Einkaufsliste setzen`}>
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </ActionButton>
                    )}
                    {manage && (
                      <>
                        <ModalTrigger
                          variant="ghost"
                          size="sm"
                          label={<Pencil className="h-3.5 w-3.5" />}
                          ariaLabel={`${i.name} bearbeiten`}
                          title="Ausrüstung bearbeiten"
                          modalSize="lg"
                        >
                          <EquipmentForm
                            values={{
                              id: i.id,
                              name: i.name,
                              description: i.description ?? "",
                              category: i.category,
                              required: i.required,
                              recommendedQuantity: i.recommendedQuantity,
                              shopUrl: i.shopUrl ?? "",
                              price: i.priceCents !== null ? (i.priceCents / 100).toFixed(2).replace(".", ",") : "",
                              imageUrl: i.imageUrl,
                              manufacturer: i.manufacturer ?? "",
                              model: i.model ?? "",
                              priority: i.priority,
                              notes: i.notes ?? "",
                            }}
                          />
                        </ModalTrigger>
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          ariaLabel={`${i.name} löschen`}
                          action={deleteEquipment} args={[i.id]}
                          confirm={{ title: "Ausrüstung löschen?", message: `„${i.name}“ wird aus dem Katalog entfernt – inklusive aller persönlichen Einträge und Anforderungen.`, confirmLabel: "Löschen", danger: true }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </ActionButton>
                      </>
                    )}
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
