import { Plus, Trash2, Pencil } from "lucide-react";
import type { PersonalItem } from "@prisma/client";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalTrigger } from "@/components/ui/modal";
import { deletePersonalItem } from "@/server/actions/personal-items";
import { PersonalItemForm } from "./personal-item-form";

type Item = PersonalItem & { parts: PersonalItem[] };

function Meta({ i }: { i: PersonalItem }) {
  const line = [[i.manufacturer, i.model].filter(Boolean).join(" "), i.quantity > 1 ? `${i.quantity}×` : ""].filter(Boolean).join(" · ");
  return (
    <>
      {line && <p className="text-xs text-muted">{line}</p>}
      {i.notes && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-subtle">{i.notes}</p>}
    </>
  );
}

function Actions({ item, weapons, editable }: { item: PersonalItem; weapons: { value: string; label: string }[]; editable: boolean }) {
  if (!editable) return null;
  return (
    <div className="flex shrink-0 items-center">
      <ModalTrigger variant="ghost" size="sm" label={<Pencil className="h-3.5 w-3.5" />} ariaLabel={`${item.name} bearbeiten`} title={`${item.name} bearbeiten`}>
        <PersonalItemForm
          group={item.group}
          weapons={weapons}
          values={{ id: item.id, name: item.name, manufacturer: item.manufacturer ?? "", model: item.model ?? "", quantity: item.quantity, notes: item.notes ?? "", parentId: item.parentId ?? "" }}
        />
      </ModalTrigger>
      <ActionButton
        size="sm"
        variant="ghost"
        ariaLabel={`${item.name} löschen`}
        action={deletePersonalItem}
        args={[item.id]}
        confirm={{
          title: "Gegenstand löschen?",
          message: item.group === "WEAPON" ? `„${item.name}“ wird samt allen Anbauteilen gelöscht. Gadgets bleiben als einzelne Gadgets erhalten.` : `„${item.name}“ wird gelöscht.`,
          confirmLabel: "Löschen",
          danger: true,
        }}
      >
        <Trash2 className="h-3.5 w-3.5 text-danger" />
      </ActionButton>
    </div>
  );
}

/** Inventar: Kleidung · Waffen (mit Anbauteilen/Gadgets) · einzelne Gadgets. `editable=false` = Nur-Lese-Ansicht (Teamleitung/Admin). */
export function PersonalInventory({ items, editable }: { items: Item[]; editable: boolean }) {
  const weapons = items.filter((i) => i.group === "WEAPON");
  const clothing = items.filter((i) => i.group === "CLOTHING");
  const looseGadgets = items.filter((i) => i.group === "GADGET" && !i.parentId);
  const weaponOptions = weapons.map((w) => ({ value: w.id, label: w.name }));
  const add = (group: "CLOTHING" | "WEAPON" | "GADGET" | "ATTACHMENT", label: string, parentId?: string, small = false) =>
    editable && (
      <ModalTrigger variant={small ? "ghost" : "secondary"} size="sm" label={<><Plus className="h-3.5 w-3.5" /> {label}</>} title={label}>
        <PersonalItemForm group={group} weapons={weaponOptions} values={parentId ? { parentId } : {}} />
      </ModalTrigger>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Waffen" action={add("WEAPON", "Waffe hinzufügen")} />
        {weapons.length === 0 ? (
          <EmptyState title="Noch keine Waffe">{editable ? "Lege deine Primärwaffe oder Sidearm an und hänge Anbauteile und Gadgets daran." : "Keine Waffen eingetragen."}</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {weapons.map((w) => (
              <li key={w.id} className="px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{w.name}</p>
                    <Meta i={w} />
                  </div>
                  <Actions item={w} weapons={weaponOptions} editable={editable} />
                </div>
                <ul className="mt-3 space-y-2 border-l-2 border-accent-700/60 pl-4">
                  {w.parts.length === 0 && <li className="text-xs text-subtle">Keine Anbauteile oder Gadgets.</li>}
                  {w.parts.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {p.name} <Badge tone={p.group === "ATTACHMENT" ? "accent" : "info"}>{p.group === "ATTACHMENT" ? "Anbauteil" : "Gadget"}</Badge>
                        </p>
                        <Meta i={p} />
                      </div>
                      <Actions item={p} weapons={weaponOptions} editable={editable} />
                    </li>
                  ))}
                  {editable && (
                    <li className="flex flex-wrap gap-1">
                      {add("ATTACHMENT", "Anbauteil hinzufügen", w.id, true)}
                      {add("GADGET", "Gadget hinzufügen", w.id, true)}
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Kleidung" action={add("CLOTHING", "Kleidung hinzufügen")} />
        {clothing.length === 0 ? (
          <EmptyState title="Noch keine Kleidung">{editable ? "Trage Feldanzug, Stiefel, Handschuhe usw. ein." : "Keine Kleidung eingetragen."}</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {clothing.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <Meta i={c} />
                </div>
                <Actions item={c} weapons={weaponOptions} editable={editable} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Weitere Gadgets" action={add("GADGET", "Gadget hinzufügen")} />
        {looseGadgets.length === 0 ? (
          <EmptyState title="Keine einzelnen Gadgets">Gadgets, die an keiner Waffe montiert sind (z. B. Funkgerät, Taschenlampe).</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {looseGadgets.map((g) => (
              <li key={g.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="font-medium">{g.name}</p>
                  <Meta i={g} />
                </div>
                <Actions item={g} weapons={weaponOptions} editable={editable} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
