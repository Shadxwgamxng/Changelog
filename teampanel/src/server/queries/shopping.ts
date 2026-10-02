import "server-only";
import type { EquipmentCategory, Prisma, ShoppingStatus } from "@prisma/client";
import { db } from "@/lib/db";

export interface ShoppingFilters {
  status?: ShoppingStatus;
  category?: EquipmentCategory;
  q?: string;
}

/** Je Katalog-Artikel: Anzahl aktiver Mitglieder, die ihn noch benötigen (Anforderung oder Pflicht, nicht vorhanden). */
export async function getNeederCounts(equipmentIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (equipmentIds.length === 0) return result;
  const [users, equipment, requirements, owned] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true } }),
    db.equipment.findMany({ where: { id: { in: equipmentIds } }, select: { id: true, required: true } }),
    db.equipmentRequirement.findMany({ where: { equipmentId: { in: equipmentIds } }, select: { userId: true, equipmentId: true } }),
    db.userEquipment.findMany({ where: { equipmentId: { in: equipmentIds }, status: "OWNED" }, select: { userId: true, equipmentId: true } }),
  ]);
  const ownedSet = new Set(owned.map((o) => `${o.userId}:${o.equipmentId}`));
  const reqSet = new Set(requirements.map((r) => `${r.userId}:${r.equipmentId}`));
  for (const e of equipment) {
    let n = 0;
    for (const u of users) {
      const key = `${u.id}:${e.id}`;
      if (ownedSet.has(key)) continue;
      if (e.required || reqSet.has(key)) n++;
    }
    result.set(e.id, n);
  }
  return result;
}

export async function getShoppingItems(filters: ShoppingFilters = {}) {
  const where: Prisma.ShoppingItemWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { shop: { contains: filters.q, mode: "insensitive" } }] } : {}),
  };
  const items = await db.shoppingItem.findMany({
    where,
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    include: { targetUser: { select: { id: true, profile: { select: { firstName: true, lastName: true, callsign: true } } } } },
  });
  const counts = await getNeederCounts(items.flatMap((i) => (i.equipmentId ? [i.equipmentId] : [])));
  return items.map((i) => ({ ...i, needers: i.equipmentId ? (counts.get(i.equipmentId) ?? 0) : i.targetUserId ? 1 : 0 }));
}

export type ShoppingListItem = Awaited<ReturnType<typeof getShoppingItems>>[number];
