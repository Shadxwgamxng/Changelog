import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { equipmentTabs } from "@/components/features/equipment-tabs";
import { PersonalInventory } from "@/components/features/personal-inventory";

export const metadata: Metadata = { title: "Mein Inventar" };

export default async function InventoryPage() {
  const user = await requireUser();
  const items = await db.personalItem.findMany({ where: { userId: user.id }, include: { parts: { orderBy: [{ group: "asc" }, { name: "asc" }] } }, orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader eyebrow="Ausrüstung" title="Mein Inventar" subtitle="Deine eigene Ausrüstung: Kleidung und Waffen – mit Anbauteilen und Gadgets." />
      <Tabs items={equipmentTabs("inventory")} />
      <PersonalInventory items={items} editable />
    </>
  );
}
