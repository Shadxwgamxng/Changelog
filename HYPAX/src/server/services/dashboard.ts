import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { hasAnywhere, scopeWhere, type Ctx } from "../context";
import { listShifts, upcomingForHelper } from "./shifts";
import { listAnnouncements } from "./messages";
import { listNotifications, unreadNotificationCount } from "./notifications";
import { expiringQualifications, ownQualificationWarnings } from "./qualifications";
import { vehicleWarnings } from "./vehicles";
import { materialWarnings } from "./materials";
import { hoursReport, ownHours } from "./stats";
import { listAlerts } from "./alerts";
import { listEvents } from "./events";
import { berlinParts, parseDateOnly, startOfBerlinMonth } from "@/lib/dates";
import { evaluate } from "@/lib/matching";
import { buildCandidates, toRequirement } from "./staffing";
import { qualState } from "@/lib/qualification";

const FIELD_KINDS = new Set(["SANITAETSDIENST", "EINSATZ", "UEBUNG", "SONSTIGES"]);

export async function getDashboard(ctx: Ctx) {
  const now = new Date();
  const [mine, notifications, unread, announcements, qualWarn, alerts, events] = await Promise.all([
    ctx.helperId ? upcomingForHelper(ctx.helperId, 12) : [],
    listNotifications(ctx, { take: 6 }),
    unreadNotificationCount(ctx),
    listAnnouncements(ctx, { take: 4 }),
    ownQualificationWarnings(ctx),
    listAlerts(ctx, 5),
    hasAnywhere(ctx, "event.view") ? listEvents(ctx, { from: now }) : [],
  ]);

  const duties = mine.filter((s) => FIELD_KINDS.has(s.kind)).slice(0, 5);
  const appointments = mine.filter((s) => !FIELD_KINDS.has(s.kind)).slice(0, 5);
  const pendingRequests = mine.filter((s) => s.status === "ANGEFRAGT" || s.status === "WARTELISTE");
  const invitations = mine.filter((s) => s.status === "EINGELADEN");

  // Offene Dienste, für die ich fachlich in Frage komme
  const openShifts = hasAnywhere(ctx, "shift.view") && ctx.helperId
    ? (await listShifts(ctx, { from: now, openOnly: true, take: 30 })).filter((s) => !s.myStatus).slice(0, 5)
    : [];

  const tasks: { text: string; link: string; level: "rot" | "gelb" | "info" }[] = [];
  for (const i of invitations) tasks.push({ text: `Einladung beantworten: ${i.name}`, link: `/shifts/${i.shiftId}`, level: "gelb" });
  for (const a of alerts.filter((a) => a.status === "AKTIV" && a.myResponse === "OFFEN")) tasks.push({ text: `🚨 Alarmierung beantworten: ${a.title}`, link: `/alerts/${a.id}`, level: "rot" });
  const me = ctx.helperId ? await prisma.helper.findUnique({ where: { id: ctx.helperId }, select: { qualifications: { select: { status: true, validUntil: true, type: { select: { name: true } } } } } }) : null;
  const review = me?.qualifications.filter((q) => q.status === "IN_PRUEFUNG") ?? [];
  for (const q of review) tasks.push({ text: `Qualifikation „${q.type.name}“ wartet auf Bestätigung durch die Leitung`, link: "/profile", level: "info" });
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { mustChangePw: true, totpEnabled: true } });
  if (user?.mustChangePw) tasks.push({ text: "Bitte vergib ein neues Passwort", link: "/account", level: "rot" });

  // Aktuelle Verfügbarkeit (heute und die nächsten 14 Tage)
  let availability: { today: string | null; nextChange: string | null } | null = null;
  if (ctx.helperId) {
    const p = berlinParts(now);
    const today = parseDateOnly(`${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`)!;
    const rows = await prisma.availability.findMany({ where: { helperId: ctx.helperId, endDate: { gte: today }, startDate: { lte: new Date(today.getTime() + 14 * 86_400_000) } }, orderBy: { startDate: "asc" } });
    const cur = rows.find((r) => r.startDate <= today && r.endDate >= today);
    availability = { today: cur?.status ?? null, nextChange: rows.find((r) => r.startDate > today)?.startDate.toISOString().slice(0, 10) ?? null };
  }

  // Führungsbereich
  const lead = hasAnywhere(ctx, "shift.staff") || hasAnywhere(ctx, "report.view") || hasAnywhere(ctx, "qualification.view");
  let leadership: Awaited<ReturnType<typeof leaderSection>> | null = null;
  if (lead) leadership = await leaderSection(ctx);

  return {
    greetingName: ctx.helperName?.split(" ")[0] ?? ctx.email.split("@")[0],
    duties, appointments, pendingRequests, invitations, openShifts, events: events.slice(0, 5), announcements, notifications, unread, qualWarnings: qualWarn, alerts: alerts.filter((a) => a.status === "AKTIV"), tasks, availability, leadership,
    hours: ctx.helperId ? (await ownHours(ctx, berlinParts(now).y)).totalMinutes : 0,
  };
}

async function leaderSection(ctx: Ctx) {
  const now = new Date();
  const monthStart = startOfBerlinMonth(berlinParts(now).y, berlinParts(now).m);
  const canStaff = hasAnywhere(ctx, "shift.staff") || hasAnywhere(ctx, "shift.edit");
  const upcoming = canStaff ? (await listShifts(ctx, { from: now, to: new Date(now.getTime() + 30 * 86_400_000), take: 60 })).filter((s) => s.status === "OFFEN" || s.status === "ENTWURF") : [];
  const withNeed = upcoming.filter((s) => s.needed > 0);
  const openPositions = withNeed.reduce((a, s) => a + s.open, 0);
  const requests = canStaff ? await prisma.shiftAssignment.count({ where: { status: "ANGEFRAGT", shift: { AND: [scopeWhere(ctx, "shift.staff") as Prisma.ShiftWhereInput, { endsAt: { gte: now }, status: "OFFEN" }] } } }) : 0;
  const drafts = upcoming.filter((s) => s.status === "ENTWURF").length;

  // Verfügbare Helfer in den nächsten 7 Tagen (Status „verfügbar“/„eingeschränkt“ für heute) und Abwesenheiten
  const p = berlinParts(now);
  const today = parseDateOnly(`${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`)!;
  const helperScope = scopeWhere(ctx, "availability.view_others") as Prisma.HelperWhereInput;
  const activeHelpers = hasAnywhere(ctx, "availability.view_others") ? await prisma.helper.count({ where: { AND: [helperScope, { status: "AKTIV" }] } }) : 0;
  const todays = hasAnywhere(ctx, "availability.view_others")
    ? await prisma.availability.findMany({ where: { startDate: { lte: today }, endDate: { gte: today }, helper: { AND: [helperScope, { status: "AKTIV" }] } }, select: { status: true } })
    : [];
  const available = todays.filter((a) => a.status === "VERFUEGBAR").length, limited = todays.filter((a) => a.status === "EINGESCHRAENKT").length, absent = todays.filter((a) => a.status === "NICHT_VERFUEGBAR").length;

  const [expiring, vWarn, mWarn, hours] = await Promise.all([
    expiringQualifications(ctx, 60, true).catch(() => []),
    vehicleWarnings(ctx), materialWarnings(ctx),
    hasAnywhere(ctx, "report.view") ? hoursReport(ctx, { from: monthStart, to: now }).then((h) => h.totalMinutes).catch(() => null) : null,
  ]);

  const vehicles = hasAnywhere(ctx, "vehicle.view") ? await prisma.vehicle.groupBy({ by: ["status"], where: scopeWhere(ctx, "vehicle.view") as Prisma.VehicleWhereInput, _count: { _all: true } }) : [];
  const vReady = vehicles.find((v) => v.status === "EINGESCHRAENKT")?._count._all ?? 0 + (vehicles.find((v) => v.status === "EINSATZBEREIT")?._count._all ?? 0);
  void vReady;
  const count = (s: string) => vehicles.find((v) => v.status === s)?._count._all ?? 0;

  return {
    nextShifts: withNeed.slice(0, 5), openPositions, requests, drafts,
    activeHelpers, available, limited, absent, noEntry: Math.max(0, activeHelpers - todays.length),
    expired: expiring.filter((e) => e.state === "ABGELAUFEN").length, expiringSoon: expiring.filter((e) => e.state === "LAEUFT_AB").length, expiringList: expiring.slice(0, 6),
    hoursMonthMinutes: hours,
    readiness: activeHelpers ? Math.round(((available + limited * 0.5) / activeHelpers) * 100) : null,
    vehicles: { ready: count("EINSATZBEREIT"), limited: count("EINGESCHRAENKT"), down: count("NICHT_EINSATZBEREIT") + count("IN_WARTUNG") },
    warnings: [...vWarn.map((w) => ({ text: `${w.name}: ${w.text}`, level: w.level, link: `/vehicles/${w.vehicleId}` })), ...mWarn.map((w) => ({ text: `${w.name}: ${w.text}`, level: w.level, link: `/materials/${w.materialId}` }))].slice(0, 8),
  };
}

/** Eignung des Benutzers für einen offenen Dienst (für den Hinweis „passt zu dir“). */
export async function myFitForShift(ctx: Ctx, shift: { id: string; unitId: string; kind: string; startsAt: Date; endsAt: Date; requirements: { id: string; label: string; count: number; functionKey: string | null; qualifications: { typeId: string }[] }[] }) {
  if (!ctx.helperId) return null;
  const { candidates, shiftCtx } = await buildCandidates(null, shift, { onlyHelperIds: [ctx.helperId] });
  if (!candidates[0] || !shiftCtx) return null;
  return shift.requirements.map((r) => ({ requirementId: r.id, label: r.label, ...evaluate({ ...candidates[0], alreadyOnShift: false }, toRequirement(r), shiftCtx) }));
}
void qualState;
