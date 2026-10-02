"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionPermission, actionUser } from "@/lib/auth";
import { audit, actorLabel } from "@/lib/audit";
import { can, canEditAnnouncement } from "@/lib/permissions";
import { releaseUpload } from "../upload-gc";
import { formToObject, zBool, zId, zOptDateTime, zOptImage, zStr } from "@/lib/validation";
import { notifyAllActive } from "../notifications";

const schema = z.object({
  title: zStr("Titel", 140),
  body: zStr("Text", 8000),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  pinned: zBool,
  imageUrl: zOptImage("Bild"),
  publishedAt: zOptDateTime("Veröffentlichungsdatum"),
});

function refresh() {
  revalidatePath("/announcements");
  revalidatePath("/");
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  return run("Die Ankündigung konnte nicht veröffentlicht werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("announcements.create");
    const input = schema.parse(formToObject(formData));
    const publishedAt = input.publishedAt ?? new Date();
    await db.$transaction(async (tx) => {
      const a = await tx.announcement.create({
        data: { title: input.title, body: input.body, priority: input.priority, pinned: input.pinned, imageUrl: input.imageUrl, publishedAt, authorId: actor.id },
      });
      await audit(actor, { action: "announcement.create", targetType: "Announcement", targetId: a.id, targetLabel: a.title, message: `${actorLabel(actor)} hat die Ankündigung „${a.title}“ veröffentlicht.` }, tx);
      if (a.priority !== "NORMAL" && publishedAt <= new Date()) {
        await notifyAllActive({ type: "ANNOUNCEMENT", title: `${a.priority === "URGENT" ? "Dringende" : "Wichtige"} Ankündigung: ${a.title}`, href: "/announcements" }, actor.id, tx);
      }
    });
    refresh();
    return ok("Ankündigung veröffentlicht.");
  });
}

export async function updateAnnouncement(formData: FormData): Promise<ActionResult> {
  return run("Die Ankündigung konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    const id = zId.parse(formData.get("id"));
    const input = schema.parse(formToObject(formData));
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Diese Ankündigung existiert nicht mehr.");
    if (!canEditAnnouncement(actor, existing)) throw new ActionError("Diese Ankündigung darfst du nicht bearbeiten.");
    await db.$transaction(async (tx) => {
      await tx.announcement.update({
        where: { id },
        data: { title: input.title, body: input.body, priority: input.priority, pinned: input.pinned, imageUrl: input.imageUrl ?? null, ...(input.publishedAt ? { publishedAt: input.publishedAt } : {}) },
      });
      await audit(actor, { action: "announcement.update", targetType: "Announcement", targetId: id, targetLabel: input.title, message: `${actorLabel(actor)} hat die Ankündigung „${input.title}“ bearbeitet.` }, tx);
    });
    await releaseUpload(existing.imageUrl);
    refresh();
    return ok("Ankündigung gespeichert.");
  });
}

export async function toggleAnnouncementPin(id: string): Promise<ActionResult> {
  return run("Das Anheften konnte nicht geändert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Diese Ankündigung existiert nicht mehr.");
    if (!canEditAnnouncement(actor, existing)) throw new ActionError("Diese Ankündigung darfst du nicht bearbeiten.");
    await db.announcement.update({ where: { id }, data: { pinned: !existing.pinned } });
    refresh();
    return ok(existing.pinned ? "Anheftung entfernt." : "Ankündigung angeheftet.");
  });
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  return run("Die Ankündigung konnte nicht gelöscht werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Diese Ankündigung existiert nicht mehr.");
    if (!canEditAnnouncement(actor, existing) || !(can(actor, "announcements.editAny") || can(actor, "announcements.create"))) {
      throw new ActionError("Diese Ankündigung darfst du nicht löschen.");
    }
    await db.$transaction(async (tx) => {
      await tx.announcement.delete({ where: { id } });
      await audit(actor, { action: "announcement.delete", targetType: "Announcement", targetId: id, targetLabel: existing.title, message: `${actorLabel(actor)} hat die Ankündigung „${existing.title}“ gelöscht.` }, tx);
    });
    await releaseUpload(existing.imageUrl);
    refresh();
    return ok("Ankündigung gelöscht.");
  });
}
