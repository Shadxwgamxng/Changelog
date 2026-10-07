import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { alertInput } from "../schemas";
import { notifyHelpers } from "../notify";
import { loadCovers } from "./qualifications";
import { fmtTime } from "@/lib/dates";

const RESPONSES = ["KOMME", "VIELLEICHT", "KANN_NICHT"] as const;

/** Empfängerkreis auflösen – immer nur aktive Helfer der Einheit (inkl. Untereinheiten). */
async function resolveRecipients(unitId: string, input: { audienceType: string; audienceRef: string | null; alertGroupId: string | null }): Promise<string[]> {
  const unit = (await loadUnits()).get(unitId)!;
  const base: Prisma.HelperWhereInput = { status: "AKTIV", unit: { path: { startsWith: unit.path } } };
  switch (input.audienceType) {
    case "EINHEIT": return (await prisma.helper.findMany({ where: base, select: { id: true } })).map((h) => h.id);
    case "GRUPPE":
      if (!input.audienceRef) throw badRequest("Bitte eine Gruppe wählen.");
      return (await prisma.helper.findMany({ where: { ...base, groupName: input.audienceRef }, select: { id: true } })).map((h) => h.id);
    case "QUALIFIKATION": {
      if (!input.audienceRef) throw badRequest("Bitte eine Qualifikation wählen.");
      const covers = await loadCovers();
      // Alle Qualifikationsarten, die die gewählte abdecken (z. B. Rettungssanitäter ⊇ Sanitätshelfer)
      const typeIds = [...covers.entries()].filter(([, set]) => set.has(input.audienceRef!)).map(([id]) => id);
      if (!typeIds.length) typeIds.push(input.audienceRef);
      const now = new Date(Date.now() - 86_400_000);
      return (await prisma.helper.findMany({ where: { ...base, qualifications: { some: { typeId: { in: typeIds }, status: "GUELTIG", OR: [{ validUntil: null }, { validUntil: { gte: now } }] } } }, select: { id: true } })).map((h) => h.id);
    }
    case "ALARMGRUPPE": {
      if (!input.alertGroupId) throw badRequest("Bitte eine Alarmgruppe wählen.");
      const g = await prisma.alertGroup.findUnique({ where: { id: input.alertGroupId } });
      if (!g || g.unitId !== unitId) throw badRequest("Alarmgruppe gehört nicht zu dieser Einheit.");
      return (await prisma.helper.findMany({ where: { status: "AKTIV", alertGroupMembers: { some: { groupId: g.id } } }, select: { id: true } })).map((h) => h.id);
    }
    default: throw badRequest("Ungültiger Empfängerkreis.");
  }
}

export async function createAlert(ctx: Ctx, raw: unknown) {
  const input = alertInput.parse(raw);
  await require_(ctx, "alert.create", input.unitId);
  if (input.shiftId) {
    const s = await prisma.shift.findUnique({ where: { id: input.shiftId } });
    if (!s || s.unitId !== input.unitId) throw badRequest("Der Dienst gehört zu einer anderen Einheit.");
  }
  const recipients = await resolveRecipients(input.unitId, input);
  if (!recipients.length) throw conflict("Der gewählte Empfängerkreis enthält keine aktiven Helfer.");
  const alert = await prisma.alert.create({
    data: {
      unitId: input.unitId, title: input.title, message: input.message, meetingPoint: input.meetingPoint, meetingTime: input.meetingTime ?? null,
      audienceType: input.audienceType, audienceRef: input.audienceRef, alertGroupId: input.alertGroupId, shiftId: input.shiftId, createdById: ctx.userId,
      recipients: { create: recipients.map((helperId) => ({ helperId })) },
    },
  });
  await audit(ctx, { action: "alert.create", entityType: "Alert", entityId: alert.id, unitId: alert.unitId, summary: `Alarmierung „${alert.title}“ an ${recipients.length} Helfer ausgelöst` });
  await notifyHelpers(recipients, {
    type: "ALARM", title: `🚨 Alarmierung: ${alert.title}`,
    body: [input.meetingPoint && `Treffpunkt: ${input.meetingPoint}`, input.meetingTime && `Zeit: ${fmtTime(input.meetingTime)} Uhr`, input.message].filter(Boolean).join(" · "),
    link: `/alerts/${alert.id}`,
  });
  return { alert, recipients: recipients.length };
}

function counts(rs: { response: string }[]) {
  const c = { KOMME: 0, VIELLEICHT: 0, KANN_NICHT: 0, OFFEN: 0, total: rs.length };
  for (const r of rs) c[r.response as keyof typeof c]++;
  return c;
}

export async function listAlerts(ctx: Ctx, take = 30) {
  const or: Prisma.AlertWhereInput[] = [scopeWhere(ctx, "alert.view") as Prisma.AlertWhereInput];
  if (ctx.helperId) or.push({ recipients: { some: { helperId: ctx.helperId } } });
  const rows = await prisma.alert.findMany({ where: { OR: or }, include: { recipients: { select: { response: true, helperId: true } }, unit: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take });
  return rows.map((a) => ({
    id: a.id, title: a.title, unitName: a.unit.name, status: a.status, createdAt: a.createdAt, meetingPoint: a.meetingPoint, meetingTime: a.meetingTime,
    counts: counts(a.recipients), myResponse: ctx.helperId ? a.recipients.find((r) => r.helperId === ctx.helperId)?.response ?? null : null,
  }));
}

/** Details inkl. Live-Rückmeldestatus. Namen der Rückmeldungen sehen nur Berechtigte; Empfänger sehen Zahlen + eigene Antwort. */
export async function getAlert(ctx: Ctx, alertId: string) {
  const a = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { unit: { select: { name: true } }, recipients: { include: { helper: { select: { id: true, firstName: true, lastName: true } } } }, alertGroup: { select: { name: true } } },
  });
  if (!a) throw notFound("Alarmierung nicht gefunden.");
  const unit = (await loadUnits()).get(a.unitId)!;
  const staff = canIn(ctx, "alert.view", unit);
  const mine = ctx.helperId ? a.recipients.find((r) => r.helperId === ctx.helperId) : undefined;
  if (!staff && !mine) throw notFound("Alarmierung nicht gefunden.");
  return {
    id: a.id, unitId: a.unitId, unitName: a.unit.name, title: a.title, message: a.message, meetingPoint: a.meetingPoint, meetingTime: a.meetingTime, status: a.status, createdAt: a.createdAt,
    audienceType: a.audienceType, audienceRef: a.audienceRef, alertGroupName: a.alertGroup?.name ?? null, shiftId: a.shiftId,
    counts: counts(a.recipients), myResponse: mine?.response ?? null, canRespond: !!mine && a.status === "AKTIV", canManage: canIn(ctx, "alert.create", unit),
    recipients: staff ? a.recipients.map((r) => ({ helperId: r.helperId, name: `${r.helper.lastName}, ${r.helper.firstName}`, response: r.response, respondedAt: r.respondedAt })).sort((x, y) => x.name.localeCompare(y.name, "de")) : undefined,
  };
}

export async function respondToAlert(ctx: Ctx, alertId: string, response: (typeof RESPONSES)[number]) {
  if (!RESPONSES.includes(response)) throw badRequest("Ungültige Antwort.");
  if (!ctx.helperId) throw badRequest("Dein Konto ist mit keinem Helferprofil verknüpft.");
  const r = await prisma.alertRecipient.findUnique({ where: { alertId_helperId: { alertId, helperId: ctx.helperId } }, include: { alert: true } });
  if (!r) throw notFound("Alarmierung nicht gefunden.");
  if (r.alert.status !== "AKTIV") throw conflict("Die Alarmierung ist beendet.");
  await prisma.alertRecipient.update({ where: { alertId_helperId: { alertId, helperId: ctx.helperId } }, data: { response, respondedAt: new Date() } });
  await audit(ctx, { action: "alert.respond", entityType: "Alert", entityId: alertId, unitId: r.alert.unitId, summary: `Rückmeldung zur Alarmierung „${r.alert.title}“: ${response}` });
}

/** Leitstelle trägt telefonisch erhaltene Rückmeldung ein. */
export async function setRecipientResponse(ctx: Ctx, alertId: string, helperId: string, response: (typeof RESPONSES)[number] | "OFFEN") {
  const a = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!a) throw notFound();
  await require_(ctx, "alert.create", a.unitId, true);
  if (a.status !== "AKTIV") throw conflict("Die Alarmierung ist beendet.");
  const r = await prisma.alertRecipient.findUnique({ where: { alertId_helperId: { alertId, helperId } } });
  if (!r) throw badRequest("Der Helfer gehört nicht zu dieser Alarmierung.");
  await prisma.alertRecipient.update({ where: { alertId_helperId: { alertId, helperId } }, data: { response, respondedAt: response === "OFFEN" ? null : new Date() } });
}

export async function endAlert(ctx: Ctx, alertId: string) {
  const a = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!a) throw notFound();
  await require_(ctx, "alert.create", a.unitId, true);
  await prisma.alert.update({ where: { id: alertId }, data: { status: "BEENDET" } });
  await audit(ctx, { action: "alert.end", entityType: "Alert", entityId: alertId, unitId: a.unitId, summary: `Alarmierung „${a.title}“ beendet` });
}

// ── Alarmgruppen ──
export async function listAlertGroups(ctx: Ctx, unitId?: string) {
  if (!hasAnywhere(ctx, "alert.view")) return [];
  const rows = await prisma.alertGroup.findMany({ where: { AND: [scopeWhere(ctx, "alert.view") as Prisma.AlertGroupWhereInput, unitId ? { unitId } : {}] }, include: { members: { include: { helper: { select: { id: true, firstName: true, lastName: true } } } }, unit: { select: { name: true } } }, orderBy: { name: "asc" } });
  return rows.map((g) => ({ id: g.id, unitId: g.unitId, unitName: g.unit.name, name: g.name, members: g.members.map((m) => ({ id: m.helper.id, name: `${m.helper.lastName}, ${m.helper.firstName}` })) }));
}

export async function saveAlertGroup(ctx: Ctx, input: { id?: string; unitId: string; name: string; memberIds: string[] }) {
  await require_(ctx, "alert.create", input.unitId);
  const name = input.name.trim();
  if (!name) throw badRequest("Name fehlt.");
  const unit = (await loadUnits()).get(input.unitId)!;
  const members = await prisma.helper.findMany({ where: { id: { in: input.memberIds }, unit: { path: { startsWith: unit.path } } }, select: { id: true } });
  if (members.length !== new Set(input.memberIds).size) throw badRequest("Ein Mitglied gehört nicht zu dieser Einheit.");
  if (input.id) {
    const g = await prisma.alertGroup.findUnique({ where: { id: input.id } });
    if (!g || g.unitId !== input.unitId) throw forbidden();
    await prisma.$transaction([prisma.alertGroupMember.deleteMany({ where: { groupId: g.id } }), prisma.alertGroup.update({ where: { id: g.id }, data: { name, members: { create: members.map((m) => ({ helperId: m.id })) } } })]);
    return g.id;
  }
  const g = await prisma.alertGroup.create({ data: { unitId: input.unitId, name, members: { create: members.map((m) => ({ helperId: m.id })) } } });
  await audit(ctx, { action: "alertgroup.create", entityType: "AlertGroup", entityId: g.id, unitId: input.unitId, summary: `Alarmgruppe „${name}“ mit ${members.length} Mitgliedern angelegt` });
  return g.id;
}

export async function deleteAlertGroup(ctx: Ctx, id: string) {
  const g = await prisma.alertGroup.findUnique({ where: { id } });
  if (!g) throw notFound();
  await require_(ctx, "alert.create", g.unitId, true);
  await prisma.alert.updateMany({ where: { alertGroupId: id }, data: { alertGroupId: null } });
  await prisma.alertGroup.delete({ where: { id } });
}
