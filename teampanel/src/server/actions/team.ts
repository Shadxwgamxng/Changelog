"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, run, type ActionResult } from "@/lib/action";
import { actionPermission, actionUser } from "@/lib/auth";
import { audit, actorLabel } from "@/lib/audit";
import { releaseUpload } from "../upload-gc";
import { formToObject, zId, zOptImage, zOptInt, zOptStr, zOptText, zOptUrl, zStr } from "@/lib/validation";

const schema = z.object({
  name: zStr("Teamname", 100),
  shortName: zStr("Kürzel", 12),
  motto: zOptStr("Leitspruch", 120),
  foundedYear: zOptInt("Gründungsjahr", 1990, 2100),
  location: zStr("Standort", 100),
  description: zOptText("Beschreibung", 4000),
  rules: zOptText("Teamregeln", 8000),
  contactEmail: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein.").max(200).optional()),
  contactPhone: zOptStr("Telefon", 40),
  logoUrl: zOptImage("Logo"),
  websiteUrl: zOptUrl("Website"),
  discordUrl: zOptUrl("Discord"),
  instagramUrl: zOptUrl("Instagram"),
  facebookUrl: zOptUrl("Facebook"),
  youtubeUrl: zOptUrl("YouTube"),
});

export async function updateTeamSettings(formData: FormData): Promise<ActionResult> {
  return run("Die Teamdaten konnten nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("team.edit");
    const i = schema.parse(formToObject(formData));
    const current = await db.teamSettings.findUnique({ where: { id: 1 } });
    const data = {
      name: i.name,
      shortName: i.shortName,
      motto: i.motto ?? null,
      foundedYear: i.foundedYear ?? null,
      location: i.location,
      description: i.description ?? null,
      rules: i.rules ?? null,
      contactEmail: i.contactEmail ?? null,
      contactPhone: i.contactPhone ?? null,
      logoUrl: i.logoUrl ?? null,
      websiteUrl: i.websiteUrl ?? null,
      discordUrl: i.discordUrl ?? null,
      instagramUrl: i.instagramUrl ?? null,
      facebookUrl: i.facebookUrl ?? null,
      youtubeUrl: i.youtubeUrl ?? null,
    };
    await db.$transaction(async (tx) => {
      await tx.teamSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
      await audit(actor, { action: "team.update", targetType: "TeamSettings", targetId: "1", targetLabel: i.name, message: `${actorLabel(actor)} hat die Teamdaten bearbeitet.` }, tx);
    });
    await releaseUpload(current?.logoUrl);
    revalidatePath("/", "layout");
    return ok("Teamdaten gespeichert.");
  });
}

// ── Benachrichtigungen ───────────────────────────────────────

export async function markNotificationRead(id: string): Promise<ActionResult> {
  return run("Die Benachrichtigung konnte nicht aktualisiert werden.", async () => {
    const me = await actionUser();
    await db.notification.updateMany({ where: { id: zId.parse(id), userId: me.id, readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/", "layout");
    return ok();
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return run("Die Benachrichtigungen konnten nicht aktualisiert werden.", async () => {
    const me = await actionUser();
    await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/", "layout");
    return ok("Alle Benachrichtigungen als gelesen markiert.");
  });
}

export async function deleteReadNotifications(): Promise<ActionResult> {
  return run("Die Benachrichtigungen konnten nicht gelöscht werden.", async () => {
    const me = await actionUser();
    await db.notification.deleteMany({ where: { userId: me.id, readAt: { not: null } } });
    revalidatePath("/", "layout");
    return ok("Gelesene Benachrichtigungen gelöscht.");
  });
}
