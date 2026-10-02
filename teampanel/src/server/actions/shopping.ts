"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionPermission } from "@/lib/auth";
import { audit, actorLabel } from "@/lib/audit";
import { CATEGORY_LABELS } from "@/lib/labels";
import { releaseUpload } from "../upload-gc";
import { formToObject, zId, zInt, zOptEuro, zOptImage, zOptStr, zOptText, zOptUrl, zStr } from "@/lib/validation";

const categories = Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]];

const optId = z.preprocess((v) => (v === "" ? undefined : v), zId.optional());

const shoppingSchema = z.object({
  name: zStr("Produktname", 160),
  category: z.enum(categories, { errorMap: () => ({ message: "Bitte wähle eine Kategorie." }) }),
  description: zOptText("Beschreibung", 2000),
  shop: zOptStr("Shop", 120),
  url: zOptUrl("Produkt-Link"),
  price: zOptEuro("Preis"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  imageUrl: zOptImage("Bild"),
  quantity: zInt("Anzahl", 1, 999),
  status: z.enum(["OPEN", "ORDERED", "PURCHASED"]),
  equipmentId: optId,
  targetUserId: optId,
});

function refresh() {
  revalidatePath("/shopping");
  revalidatePath("/admin");
}

async function checkRefs(i: z.infer<typeof shoppingSchema>) {
  if (i.equipmentId && !(await db.equipment.findUnique({ where: { id: i.equipmentId }, select: { id: true } }))) {
    throw new ActionError("Der verknüpfte Katalog-Artikel existiert nicht mehr.", { equipmentId: "Nicht gefunden." });
  }
  if (i.targetUserId && !(await db.user.findUnique({ where: { id: i.targetUserId }, select: { id: true } }))) {
    throw new ActionError("Das ausgewählte Mitglied existiert nicht mehr.", { targetUserId: "Nicht gefunden." });
  }
}

function data(i: z.infer<typeof shoppingSchema>) {
  return {
    name: i.name,
    category: i.category,
    description: i.description ?? null,
    shop: i.shop ?? null,
    url: i.url ?? null,
    priceCents: i.price ?? null,
    priority: i.priority,
    imageUrl: i.imageUrl ?? null,
    quantity: i.quantity,
    status: i.status,
    equipmentId: i.equipmentId ?? null,
    targetUserId: i.targetUserId ?? null,
  };
}

export async function createShoppingItem(formData: FormData): Promise<ActionResult> {
  return run("Der Artikel konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("shopping.manage");
    const input = shoppingSchema.parse(formToObject(formData));
    await checkRefs(input);
    await db.$transaction(async (tx) => {
      const item = await tx.shoppingItem.create({ data: { ...data(input), createdById: actor.id } });
      await audit(actor, { action: "shopping.create", targetType: "ShoppingItem", targetId: item.id, targetLabel: item.name, message: `${actorLabel(actor)} hat „${item.name}“ zur Einkaufsliste hinzugefügt.` }, tx);
    });
    refresh();
    return ok("Artikel hinzugefügt.");
  });
}

export async function updateShoppingItem(formData: FormData): Promise<ActionResult> {
  return run("Der Artikel konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("shopping.manage");
    const id = zId.parse(formData.get("id"));
    const input = shoppingSchema.parse(formToObject(formData));
    await checkRefs(input);
    const existing = await db.shoppingItem.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Dieser Artikel existiert nicht mehr.");
    await db.$transaction(async (tx) => {
      await tx.shoppingItem.update({ where: { id }, data: data(input) });
      await audit(actor, { action: "shopping.update", targetType: "ShoppingItem", targetId: id, targetLabel: input.name, message: `${actorLabel(actor)} hat den Einkaufsartikel „${input.name}“ bearbeitet.` }, tx);
    });
    await releaseUpload(existing.imageUrl);
    refresh();
    return ok("Artikel gespeichert.");
  });
}

export async function setShoppingStatus(id: string, status: "OPEN" | "ORDERED" | "PURCHASED"): Promise<ActionResult> {
  return run("Der Status konnte nicht geändert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("shopping.manage");
    z.enum(["OPEN", "ORDERED", "PURCHASED"]).parse(status);
    const existing = await db.shoppingItem.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Dieser Artikel existiert nicht mehr.");
    await db.shoppingItem.update({ where: { id }, data: { status } });
    await audit(actor, { action: "shopping.status", targetType: "ShoppingItem", targetId: id, targetLabel: existing.name, message: `${actorLabel(actor)} hat „${existing.name}“ auf ${status === "OPEN" ? "offen" : status === "ORDERED" ? "bestellt" : "gekauft"} gesetzt.` });
    refresh();
    return ok("Status geändert.");
  });
}

export async function deleteShoppingItem(id: string): Promise<ActionResult> {
  return run("Der Artikel konnte nicht gelöscht werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("shopping.manage");
    const existing = await db.shoppingItem.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Dieser Artikel existiert nicht mehr.");
    await db.$transaction(async (tx) => {
      await tx.shoppingItem.delete({ where: { id } });
      await audit(actor, { action: "shopping.delete", targetType: "ShoppingItem", targetId: id, targetLabel: existing.name, message: `${actorLabel(actor)} hat „${existing.name}“ von der Einkaufsliste entfernt.` }, tx);
    });
    await releaseUpload(existing.imageUrl);
    refresh();
    return ok("Artikel entfernt.");
  });
}

/** Übernimmt einen Katalog-Artikel (inkl. Shop-Link und Preis) in die Einkaufsliste. */
export async function addEquipmentToShopping(equipmentId: string): Promise<ActionResult> {
  return run("Der Artikel konnte nicht hinzugefügt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("shopping.manage");
    const e = await db.equipment.findUnique({ where: { id: equipmentId } });
    if (!e) throw new ActionError("Diese Ausrüstung existiert nicht mehr.");
    if (await db.shoppingItem.findFirst({ where: { equipmentId, status: { not: "PURCHASED" } } })) {
      throw new ActionError("Dieser Artikel steht bereits auf der Einkaufsliste.");
    }
    let shop: string | null = null;
    try {
      shop = e.shopUrl ? new URL(e.shopUrl).hostname.replace(/^www\./, "") : null;
    } catch {
      shop = null;
    }
    await db.$transaction(async (tx) => {
      const item = await tx.shoppingItem.create({
        data: { name: e.name, category: e.category, description: e.description, shop, url: e.shopUrl, priceCents: e.priceCents, priority: e.priority, imageUrl: null, quantity: e.recommendedQuantity, equipmentId: e.id, createdById: actor.id },
      });
      await audit(actor, { action: "shopping.create", targetType: "ShoppingItem", targetId: item.id, targetLabel: item.name, message: `${actorLabel(actor)} hat „${item.name}“ zur Einkaufsliste hinzugefügt.` }, tx);
    });
    refresh();
    return ok("Zur Einkaufsliste hinzugefügt.");
  });
}
