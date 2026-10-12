import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, forbidden, notFound, tooMany } from "../errors";
import { canIn, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { announcementInput, messageInput } from "../schemas";
import { notifyUsers } from "../notify";
import { rateLimit } from "@/lib/rate-limit";

const MAX_RECIPIENTS = 1000;

async function resolveAudience(ctx: Ctx, a: ReturnType<typeof messageInput.parse>["audience"]): Promise<{ userIds: string[]; label: string }> {
  const units = await loadUnits();
  switch (a.kind) {
    case "USERS": {
      // Einzelnachrichten nur an Personen, die man auch als Helfer sehen darf.
      const helpers = await prisma.helper.findMany({
        where: { userId: { in: a.userIds.slice(0, 50) }, OR: [scopeWhere(ctx, "helper.view") as Prisma.HelperWhereInput, ...(ctx.helperId ? [{ id: ctx.helperId }] : [])] },
        select: { userId: true, firstName: true, lastName: true },
      });
      if (helpers.length !== new Set(a.userIds).size) throw forbidden("Mindestens ein Empfänger ist für dich nicht erreichbar.");
      return { userIds: helpers.map((h) => h.userId!), label: helpers.length === 1 ? `${helpers[0].firstName} ${helpers[0].lastName}` : `${helpers.length} Personen` };
    }
    case "UNIT": {
      const u = units.get(a.unitId);
      if (!u) throw badRequest("Einheit nicht gefunden.");
      await require_(ctx, "message.send", u.id);
      const hs = await prisma.helper.findMany({ where: { status: "AKTIV", userId: { not: null }, unit: a.includeSubunits ? { path: { startsWith: u.path } } : { id: u.id } }, select: { userId: true } });
      return { userIds: hs.map((h) => h.userId!), label: `${u.name}${a.includeSubunits ? " (inkl. Untereinheiten)" : ""}` };
    }
    case "GROUP": {
      const u = units.get(a.unitId);
      if (!u) throw badRequest("Einheit nicht gefunden.");
      await require_(ctx, "message.send", u.id);
      const hs = await prisma.helper.findMany({ where: { status: "AKTIV", userId: { not: null }, groupName: a.groupName, unit: { path: { startsWith: u.path } } }, select: { userId: true } });
      return { userIds: hs.map((h) => h.userId!), label: `${u.name} · Gruppe ${a.groupName}` };
    }
    case "SHIFT": {
      const s = await prisma.shift.findUnique({ where: { id: a.shiftId }, include: { assignments: { where: { status: { in: ["BESTAETIGT", "EINGELADEN"] } }, include: { helper: { select: { userId: true } } } } } });
      if (!s) throw notFound("Dienst nicht gefunden.");
      const u = units.get(s.unitId)!;
      if (!canIn(ctx, "message.send", u) && !canIn(ctx, "shift.staff", u)) throw forbidden();
      return { userIds: s.assignments.map((x) => x.helper.userId).filter(Boolean) as string[], label: `Dienstbesatzung „${s.name}“` };
    }
    case "LEADERS": {
      const u = units.get(a.unitId);
      if (!u) throw badRequest("Einheit nicht gefunden.");
      // Führungskräfte darf jeder anschreiben, der die Einheit kennt (Helfer ihrer Einheit/Untereinheit).
      const member = ctx.all || ctx.helperUnitId === u.id || (ctx.helperUnitId && units.get(ctx.helperUnitId)?.path.startsWith(u.path)) || ctx.grants.some((g) => u.path.startsWith(g.unitPath));
      if (!member) throw forbidden();
      const ancestors = u.path.split("/").filter(Boolean);
      const rows = await prisma.roleAssignment.findMany({ where: { role: { rank: { gte: 60 } }, user: { active: true }, OR: [{ unitId: u.id }, { unitId: { in: ancestors }, scope: "SUBTREE" }] }, select: { userId: true } });
      return { userIds: [...new Set(rows.map((r) => r.userId))], label: `Führungskräfte ${u.name}` };
    }
  }
}

export async function sendMessage(ctx: Ctx, raw: unknown) {
  const input = messageInput.parse(raw);
  if (!rateLimit(`msg:${ctx.userId}`, 30, 10 * 60_000).ok) throw tooMany("Du sendest zu viele Nachrichten. Bitte warte kurz.");
  const { userIds, label } = await resolveAudience(ctx, input.audience);
  const recipients = [...new Set(userIds)].filter((u) => u !== ctx.userId);
  if (!recipients.length) throw badRequest("Es wurde kein Empfänger gefunden.");
  if (recipients.length > MAX_RECIPIENTS) throw badRequest(`Maximal ${MAX_RECIPIENTS} Empfänger.`);
  const m = await prisma.message.create({ data: { senderId: ctx.userId, subject: input.subject, body: input.body, audience: label, recipients: { create: recipients.map((userId) => ({ userId })) } } });
  await audit(ctx, { action: "message.send", entityType: "Message", entityId: m.id, summary: `Nachricht „${input.subject}“ an ${label} (${recipients.length})` });
  await notifyUsers(recipients, { type: "NACHRICHT", title: `Neue Nachricht: ${input.subject}`, body: input.body.slice(0, 140), link: `/messages/${m.id}` });
  return m;
}

export async function inbox(ctx: Ctx, take = 100) {
  const rows = await prisma.messageRecipient.findMany({ where: { userId: ctx.userId }, include: { message: { include: { sender: { select: { email: true, helper: { select: { firstName: true, lastName: true } } } } } } }, orderBy: { message: { createdAt: "desc" } }, take });
  return rows.map((r) => ({ id: r.message.id, subject: r.message.subject, preview: r.message.body.slice(0, 120), from: senderName(r.message.sender), audience: r.message.audience, createdAt: r.message.createdAt, read: !!r.readAt }));
}

export async function sentMessages(ctx: Ctx, take = 50) {
  const rows = await prisma.message.findMany({ where: { senderId: ctx.userId }, include: { _count: { select: { recipients: true } }, recipients: { where: { readAt: { not: null } }, select: { userId: true } } }, orderBy: { createdAt: "desc" }, take });
  return rows.map((m) => ({ id: m.id, subject: m.subject, audience: m.audience, createdAt: m.createdAt, recipients: m._count.recipients, readBy: m.recipients.length }));
}

const senderName = (s: { email: string; helper: { firstName: string; lastName: string } | null }) => (s.helper ? `${s.helper.firstName} ${s.helper.lastName}` : s.email);

export async function readMessage(ctx: Ctx, id: string) {
  const m = await prisma.message.findFirst({
    where: { id, OR: [{ senderId: ctx.userId }, { recipients: { some: { userId: ctx.userId } } }] },
    include: { sender: { select: { email: true, helper: { select: { firstName: true, lastName: true } } } } },
  });
  if (!m) throw notFound("Nachricht nicht gefunden.");
  await prisma.messageRecipient.updateMany({ where: { messageId: id, userId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
  return { id: m.id, subject: m.subject, body: m.body, from: senderName(m.sender), audience: m.audience, createdAt: m.createdAt, mine: m.senderId === ctx.userId };
}

export const unreadMessageCount = (ctx: Ctx) => prisma.messageRecipient.count({ where: { userId: ctx.userId, readAt: null } });

// ── Bekanntmachungen ──

/** Einheiten, deren Bekanntmachungen der Benutzer erhält: eigene Einheit, Grant-Einheiten und alle übergeordneten. */
async function announcementUnitIds(ctx: Ctx): Promise<string[] | null> {
  if (ctx.all) return null;
  const units = await loadUnits();
  const ids = new Set<string>();
  const add = (unitId: string | null) => { const u = unitId ? units.get(unitId) : null; if (u) u.path.split("/").filter(Boolean).forEach((x) => ids.add(x)); };
  add(ctx.helperUnitId);
  ctx.grants.forEach((g) => add(g.unitId));
  return [...ids];
}

export async function listAnnouncements(ctx: Ctx, opts: { includeExpired?: boolean; take?: number } = {}) {
  const unitIds = await announcementUnitIds(ctx);
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: { AND: [unitIds ? { unitId: { in: unitIds } } : {}, opts.includeExpired ? {} : { publishAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] },
    include: { unit: { select: { name: true } } }, orderBy: [{ pinned: "desc" }, { publishAt: "desc" }], take: opts.take ?? 30,
  });
  const units = await loadUnits();
  return rows.map((a) => ({ id: a.id, unitId: a.unitId, unitName: a.unit.name, title: a.title, body: a.body, important: a.important, pinned: a.pinned, publishAt: a.publishAt, expiresAt: a.expiresAt, canDelete: canIn(ctx, "message.announce", units.get(a.unitId)!) }));
}

export async function createAnnouncement(ctx: Ctx, raw: unknown) {
  const input = announcementInput.parse(raw);
  await require_(ctx, "message.announce", input.unitId);
  const a = await prisma.announcement.create({ data: { ...input, createdById: ctx.userId } });
  const unit = (await loadUnits()).get(input.unitId)!;
  await audit(ctx, { action: "announcement.create", entityType: "Announcement", entityId: a.id, unitId: a.unitId, summary: `Bekanntmachung „${a.title}“ veröffentlicht` });
  const helpers = await prisma.helper.findMany({ where: { status: "AKTIV", userId: { not: null }, unit: { path: { startsWith: unit.path } } }, select: { userId: true } });
  await notifyUsers(helpers.map((h) => h.userId!).filter((u) => u !== ctx.userId), { type: "BEKANNTMACHUNG", title: `${input.important ? "📢 Wichtig: " : "📢 "}${input.title}`, body: input.body.slice(0, 140), link: "/messages?tab=announcements" });
  return a;
}

export async function deleteAnnouncement(ctx: Ctx, id: string) {
  const a = await prisma.announcement.findUnique({ where: { id } });
  if (!a) throw notFound();
  await require_(ctx, "message.announce", a.unitId, true);
  await prisma.announcement.delete({ where: { id } });
  await audit(ctx, { action: "announcement.delete", entityType: "Announcement", entityId: id, unitId: a.unitId, summary: `Bekanntmachung „${a.title}“ gelöscht` });
}
