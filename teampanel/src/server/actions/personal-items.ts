"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionUser } from "@/lib/auth";
import { formToObject, zId, zInt, zOptStr, zOptText, zStr } from "@/lib/validation";

const optId = z.preprocess((v) => (v === "" ? undefined : v), zId.optional());

const baseFields = {
  name: zStr("Name", 120),
  manufacturer: zOptStr("Hersteller", 80),
  model: zOptStr("Modell", 80),
  quantity: zInt("Menge", 1, 999),
  notes: zOptText("Notizen", 1000),
  parentId: optId,
};

const createSchema = z.object({ group: z.enum(["CLOTHING", "WEAPON", "ATTACHMENT", "GADGET"]), ...baseFields });
const updateSchema = z.object({ id: zId, ...baseFields });

/** Anbauteile brauchen eine eigene Waffe; Gadgets dürfen an einer Waffe hängen oder einzeln sein; sonst kein Elternteil. */
async function resolveParent(userId: string, group: z.infer<typeof createSchema>["group"], parentId: string | undefined) {
  if (group === "CLOTHING" || group === "WEAPON") return null;
  if (!parentId) {
    if (group === "ATTACHMENT") throw new ActionError("Bitte wähle die Waffe, zu der das Anbauteil gehört.", { parentId: "Bitte eine Waffe wählen." });
    return null;
  }
  const parent = await db.personalItem.findFirst({ where: { id: parentId, userId, group: "WEAPON" }, select: { id: true } });
  if (!parent) throw new ActionError("Die gewählte Waffe wurde nicht gefunden.", { parentId: "Nicht gefunden." });
  return parent.id;
}

function refresh() {
  revalidatePath("/equipment/inventory");
  revalidatePath("/admin/members/[id]", "page");
}

export async function createPersonalItem(formData: FormData): Promise<ActionResult> {
  return run("Der Gegenstand konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const i = createSchema.parse(formToObject(formData));
    const parentId = await resolveParent(me.id, i.group, i.parentId);
    if ((await db.personalItem.count({ where: { userId: me.id } })) >= 500) throw new ActionError("Du hast die maximale Anzahl an Gegenständen erreicht.");
    await db.personalItem.create({
      data: { userId: me.id, group: i.group, parentId, name: i.name, manufacturer: i.manufacturer, model: i.model, quantity: i.quantity, notes: i.notes },
    });
    refresh();
    return ok("Gegenstand hinzugefügt.");
  });
}

export async function updatePersonalItem(formData: FormData): Promise<ActionResult> {
  return run("Der Gegenstand konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const i = updateSchema.parse(formToObject(formData));
    const existing = await db.personalItem.findFirst({ where: { id: i.id, userId: me.id } });
    if (!existing) throw new ActionError("Dieser Gegenstand wurde nicht gefunden.");
    const parentId = await resolveParent(me.id, existing.group, i.parentId);
    await db.personalItem.update({
      where: { id: existing.id },
      data: { parentId, name: i.name, manufacturer: i.manufacturer ?? null, model: i.model ?? null, quantity: i.quantity, notes: i.notes ?? null },
    });
    refresh();
    return ok("Gegenstand gespeichert.");
  });
}

export async function deletePersonalItem(id: string): Promise<ActionResult> {
  return run("Der Gegenstand konnte nicht gelöscht werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const existing = await db.personalItem.findFirst({ where: { id: zId.parse(id), userId: me.id } });
    if (!existing) throw new ActionError("Dieser Gegenstand existiert nicht mehr.");
    // Anbauteile werden mit der Waffe gelöscht; Gadgets bleiben als einzelne Gadgets erhalten.
    await db.$transaction([
      db.personalItem.updateMany({ where: { parentId: existing.id, group: "GADGET" }, data: { parentId: null } }),
      db.personalItem.delete({ where: { id: existing.id } }),
    ]);
    refresh();
    return ok("Gegenstand gelöscht.");
  });
}
