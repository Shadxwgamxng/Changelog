"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionPermission, actionUser } from "@/lib/auth";
import { audit, actorLabel } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { CATEGORY_LABELS, OWNERSHIP_LABELS, shortName } from "@/lib/labels";
import { releaseUpload } from "../upload-gc";
import { fmtDate } from "@/lib/dates";
import { formToObject, toArray, zBool, zId, zInt, zOptDateTime, zOptEuro, zOptImage, zOptStr, zOptText, zOptUrl, zStr } from "@/lib/validation";
import { notifyUsers } from "../notifications";

const categories = Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]];
const ownership = Object.keys(OWNERSHIP_LABELS) as [keyof typeof OWNERSHIP_LABELS, ...(keyof typeof OWNERSHIP_LABELS)[]];

const equipmentSchema = z.object({
  name: zStr("Name", 120),
  description: zOptText("Beschreibung", 2000),
  category: z.enum(categories, { errorMap: () => ({ message: "Bitte wähle eine Kategorie." }) }),
  required: zBool,
  recommendedQuantity: zInt("Empfohlene Menge", 1, 99),
  shopUrl: zOptUrl("Shop-Link"),
  price: zOptEuro("Preis"),
  imageUrl: zOptImage("Bild"),
  manufacturer: zOptStr("Hersteller", 80),
  model: zOptStr("Modell", 80),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notes: zOptText("Notizen", 2000),
});

function refreshEquipment() {
  revalidatePath("/equipment");
  revalidatePath("/shopping");
  revalidatePath("/");
}

function data(i: z.infer<typeof equipmentSchema>) {
  return {
    name: i.name,
    description: i.description ?? null,
    category: i.category,
    required: i.required,
    recommendedQuantity: i.recommendedQuantity,
    shopUrl: i.shopUrl ?? null,
    priceCents: i.price ?? null,
    imageUrl: i.imageUrl ?? null,
    manufacturer: i.manufacturer ?? null,
    model: i.model ?? null,
    priority: i.priority,
    notes: i.notes ?? null,
  };
}

export async function createEquipment(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return run("Die Ausrüstung konnte nicht angelegt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("equipment.manage");
    const input = equipmentSchema.parse(formToObject(formData));
    const created = await db.$transaction(async (tx) => {
      const e = await tx.equipment.create({ data: data(input) });
      await audit(actor, { action: "equipment.create", targetType: "Equipment", targetId: e.id, targetLabel: e.name, message: `${actorLabel(actor)} hat die Ausrüstung „${e.name}“ zum Katalog hinzugefügt.` }, tx);
      return e;
    });
    refreshEquipment();
    return ok("Ausrüstung angelegt.", { id: created.id });
  });
}

export async function updateEquipment(formData: FormData): Promise<ActionResult> {
  return run("Die Ausrüstung konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("equipment.manage");
    const id = zId.parse(formData.get("id"));
    const input = equipmentSchema.parse(formToObject(formData));
    const existing = await db.equipment.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Diese Ausrüstung wurde nicht gefunden.");
    await db.$transaction(async (tx) => {
      await tx.equipment.update({ where: { id }, data: data(input) });
      await audit(actor, { action: "equipment.update", targetType: "Equipment", targetId: id, targetLabel: input.name, message: `${actorLabel(actor)} hat die Ausrüstung „${input.name}“ bearbeitet.` }, tx);
    });
    await releaseUpload(existing.imageUrl);
    refreshEquipment();
    return ok("Ausrüstung gespeichert.");
  });
}

export async function deleteEquipment(id: string): Promise<ActionResult> {
  return run("Die Ausrüstung konnte nicht gelöscht werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("equipment.manage");
    const existing = await db.equipment.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Diese Ausrüstung existiert nicht mehr.");
    await db.$transaction(async (tx) => {
      await tx.equipment.delete({ where: { id } });
      await audit(actor, { action: "equipment.delete", targetType: "Equipment", targetId: id, targetLabel: existing.name, message: `${actorLabel(actor)} hat die Ausrüstung „${existing.name}“ gelöscht.` }, tx);
    });
    await releaseUpload(existing.imageUrl);
    refreshEquipment();
    return ok("Ausrüstung gelöscht.");
  });
}

// ── Persönliche Ausrüstung ───────────────────────────────────

const statusSchema = z.object({
  equipmentId: zId,
  userId: z.preprocess((v) => (v === "" ? undefined : v), zId.optional()),
  status: z.enum(ownership, { errorMap: () => ({ message: "Bitte wähle einen Status." }) }),
  quantity: z.preprocess((v) => (v === "" || v === undefined ? 1 : v), zInt("Menge", 0, 99)),
  notes: zOptStr("Notiz", 300),
});

async function writeOwnership(actor: Awaited<ReturnType<typeof actionUser>>, input: z.infer<typeof statusSchema>) {
  const targetId = input.userId ?? actor.id;
  if (targetId !== actor.id && !can(actor, "equipment.manageAll")) throw new ActionError("Du darfst nur deine eigene Ausrüstung bearbeiten.");
  const [equipment, target] = await Promise.all([
    db.equipment.findUnique({ where: { id: input.equipmentId } }),
    db.user.findUnique({ where: { id: targetId }, include: { profile: true } }),
  ]);
  if (!equipment) throw new ActionError("Diese Ausrüstung existiert nicht mehr.");
  if (!target?.profile) throw new ActionError("Dieses Mitglied wurde nicht gefunden.");
  await db.userEquipment.upsert({
    where: { userId_equipmentId: { userId: targetId, equipmentId: input.equipmentId } },
    create: { userId: targetId, equipmentId: input.equipmentId, status: input.status, quantity: input.quantity, notes: input.notes },
    update: { status: input.status, quantity: input.quantity, notes: input.notes ?? null },
  });
  if (targetId !== actor.id) {
    await audit(actor, { action: "userEquipment.set", targetType: "User", targetId, targetLabel: target.username, message: `${actorLabel(actor)} hat die Ausrüstung „${equipment.name}“ von ${shortName(target.profile)} auf „${OWNERSHIP_LABELS[input.status]}“ gesetzt.` });
  }
  refreshEquipment();
  revalidatePath("/admin/members");
}

export async function setEquipmentStatus(formData: FormData): Promise<ActionResult> {
  return run("Der Status konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    await writeOwnership(actor, statusSchema.parse(formToObject(formData)));
    return ok("Ausrüstung aktualisiert.");
  });
}

/** Schnelles Umschalten ohne Formular. */
export async function quickSetEquipmentStatus(equipmentId: string, status: keyof typeof OWNERSHIP_LABELS, userId?: string): Promise<ActionResult> {
  return run("Der Status konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    const existing = await db.userEquipment.findUnique({ where: { userId_equipmentId: { userId: userId ?? actor.id, equipmentId } } });
    await writeOwnership(actor, statusSchema.parse({ equipmentId, userId, status, quantity: existing?.quantity ?? (status === "OWNED" ? 1 : 0), notes: existing?.notes ?? undefined }));
    return ok("Ausrüstung aktualisiert.");
  });
}

// ── Anforderungen ────────────────────────────────────────────

const requirementSchema = z.object({
  dueDate: zOptDateTime("Fällig bis"),
  note: zOptStr("Hinweis", 300),
});

export async function assignRequirements(formData: FormData): Promise<ActionResult<{ count: number }>> {
  return run("Die Ausrüstung konnte nicht zugewiesen werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("equipment.manageAll");
    const raw = formToObject(formData);
    const { dueDate, note } = requirementSchema.parse(raw);
    const userIds = toArray(raw.userIds);
    const equipmentIds = toArray(raw.equipmentIds);
    if (userIds.length === 0) throw new ActionError("Bitte wähle mindestens ein Mitglied.");
    if (equipmentIds.length === 0) throw new ActionError("Bitte wähle mindestens einen Ausrüstungsgegenstand.");
    if (userIds.length * equipmentIds.length > 500) throw new ActionError("Zu viele Zuweisungen auf einmal. Bitte wähle weniger Mitglieder oder Gegenstände.");

    const [users, equipment] = await Promise.all([
      db.user.findMany({ where: { id: { in: userIds }, active: true }, include: { profile: true } }),
      db.equipment.findMany({ where: { id: { in: equipmentIds } } }),
    ]);
    if (users.length === 0 || equipment.length === 0) throw new ActionError("Mitglieder oder Ausrüstung wurden nicht gefunden.");

    await db.$transaction(async (tx) => {
      for (const u of users) {
        for (const e of equipment) {
          await tx.equipmentRequirement.upsert({
            where: { userId_equipmentId: { userId: u.id, equipmentId: e.id } },
            create: { userId: u.id, equipmentId: e.id, dueDate, note, assignedById: actor.id },
            update: { dueDate: dueDate ?? null, note: note ?? null, assignedById: actor.id },
          });
        }
        const names = equipment.map((e) => e.name).join(", ");
        await audit(actor, { action: "requirement.assign", targetType: "User", targetId: u.id, targetLabel: u.username, message: `${actorLabel(actor)} hat die Ausrüstung ${names} zu ${shortName(u.profile!)} hinzugefügt.`, data: { equipment: equipment.map((e) => e.id), dueDate: dueDate?.toISOString() ?? null } }, tx);
        await notifyUsers([u.id], { type: "EQUIPMENT_REQUIRED", title: `Dir wurde Ausrüstung zugewiesen: ${names}${dueDate ? ` (bis ${fmtDate(dueDate)})` : ""}.`, href: "/shopping" }, tx);
      }
    });
    refreshEquipment();
    revalidatePath("/admin/requirements");
    return ok(`${users.length * equipment.length} Anforderung(en) gespeichert.`, { count: users.length * equipment.length });
  });
}

export async function removeRequirement(id: string): Promise<ActionResult> {
  return run("Die Anforderung konnte nicht entfernt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("equipment.manageAll");
    const req = await db.equipmentRequirement.findUnique({ where: { id }, include: { equipment: true, user: { include: { profile: true } } } });
    if (!req) throw new ActionError("Diese Anforderung existiert nicht mehr.");
    await db.$transaction(async (tx) => {
      await tx.equipmentRequirement.delete({ where: { id } });
      await audit(actor, { action: "requirement.remove", targetType: "User", targetId: req.userId, targetLabel: req.user.username, message: `${actorLabel(actor)} hat die Anforderung „${req.equipment.name}“ für ${shortName(req.user.profile!)} entfernt.` }, tx);
    });
    refreshEquipment();
    revalidatePath("/admin/requirements");
    return ok("Anforderung entfernt.");
  });
}

