import "server-only";
import type { Equipment, EquipmentCategory, OwnershipStatus, Prisma, Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { daysBetween } from "@/lib/dates";

export interface CatalogFilters {
  category?: EquipmentCategory;
  required?: "required" | "optional";
  /** Nur bezogen auf den Betrachter: vorhanden / fehlt */
  have?: "have" | "missing";
  q?: string;
}

export type CatalogItem = Equipment & { myStatus: OwnershipStatus; myQuantity: number; myNotes: string | null; requiredBy: number };

export async function getCatalog(userId: string, filters: CatalogFilters = {}): Promise<CatalogItem[]> {
  const where: Prisma.EquipmentWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.required ? { required: filters.required === "required" } : {}),
    ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { manufacturer: { contains: filters.q, mode: "insensitive" } }, { model: { contains: filters.q, mode: "insensitive" } }] } : {}),
  };
  const rows = await db.equipment.findMany({
    where,
    orderBy: [{ required: "desc" }, { category: "asc" }, { name: "asc" }],
    include: { userEquipment: { where: { userId } }, _count: { select: { requirements: true } } },
  });
  const items = rows.map(({ userEquipment, _count, ...e }) => {
    const mine = userEquipment[0];
    return { ...e, myStatus: mine?.status ?? ("MISSING" as OwnershipStatus), myQuantity: mine?.quantity ?? 0, myNotes: mine?.notes ?? null, requiredBy: _count.requirements };
  });
  if (filters.have === "have") return items.filter((i) => i.myStatus === "OWNED");
  if (filters.have === "missing") return items.filter((i) => i.myStatus !== "OWNED");
  return items;
}

export interface NeedItem {
  key: string;
  equipment: Equipment;
  status: OwnershipStatus;
  reason: "REQUIREMENT" | "REQUIRED";
  note: string | null;
  dueDate: Date | null;
  urgency: "high" | "medium";
}

/** Persönliche Einkaufsliste: zugewiesene Anforderungen + fehlende Pflichtausrüstung. */
export async function getNeeds(userId: string): Promise<NeedItem[]> {
  const [requirements, required, owned] = await Promise.all([
    db.equipmentRequirement.findMany({ where: { userId }, include: { equipment: true } }),
    db.equipment.findMany({ where: { required: true } }),
    db.userEquipment.findMany({ where: { userId } }),
  ]);
  const statusOf = new Map(owned.map((o) => [o.equipmentId, o.status]));
  const now = new Date();
  const needs = new Map<string, NeedItem>();

  for (const r of requirements) {
    const status = statusOf.get(r.equipmentId) ?? "MISSING";
    if (status === "OWNED") continue;
    const soon = r.dueDate ? daysBetween(now, r.dueDate) <= 14 : false;
    needs.set(r.equipmentId, {
      key: r.id,
      equipment: r.equipment,
      status,
      reason: "REQUIREMENT",
      note: r.note,
      dueDate: r.dueDate,
      urgency: r.equipment.required || r.equipment.priority === "HIGH" || soon ? "high" : "medium",
    });
  }
  for (const e of required) {
    const status = statusOf.get(e.id) ?? "MISSING";
    if (status === "OWNED" || needs.has(e.id)) continue;
    needs.set(e.id, { key: `req-${e.id}`, equipment: e, status, reason: "REQUIRED", note: null, dueDate: null, urgency: "high" });
  }
  const rank = (p: Priority) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[p];
  return [...needs.values()].sort((a, b) => (a.urgency === b.urgency ? rank(a.equipment.priority) - rank(b.equipment.priority) : a.urgency === "high" ? -1 : 1));
}

export interface EquipmentSummary {
  requiredTotal: number;
  requiredOwned: number;
  missingRequired: Equipment[];
  openNeeds: number;
}

export async function getEquipmentSummary(userId: string): Promise<EquipmentSummary> {
  const [required, owned, needs] = await Promise.all([
    db.equipment.findMany({ where: { required: true }, orderBy: [{ priority: "desc" }, { name: "asc" }] }),
    db.userEquipment.findMany({ where: { userId, status: "OWNED" }, select: { equipmentId: true } }),
    getNeeds(userId),
  ]);
  const ownedIds = new Set(owned.map((o) => o.equipmentId));
  return {
    requiredTotal: required.length,
    requiredOwned: required.filter((e) => ownedIds.has(e.id)).length,
    missingRequired: required.filter((e) => !ownedIds.has(e.id)),
    openNeeds: needs.length,
  };
}

/** Admin: alle offenen Anforderungen (nicht erfüllt) mit Mitglied. */
export async function getOpenRequirements() {
  const rows = await db.equipmentRequirement.findMany({
    include: {
      equipment: true,
      event: { select: { id: true, title: true } },
      user: { select: { id: true, active: true, profile: { select: { firstName: true, lastName: true, callsign: true } }, equipment: { select: { equipmentId: true, status: true } } } },
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return rows
    .map((r) => ({ ...r, ownership: r.user.equipment.find((e) => e.equipmentId === r.equipmentId)?.status ?? ("MISSING" as OwnershipStatus) }))
    .filter((r) => r.user.active && r.ownership !== "OWNED");
}

export async function countOpenRequirements() {
  return (await getOpenRequirements()).length;
}
