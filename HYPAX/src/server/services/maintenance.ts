// Wartungslauf (täglich per Cron): Ablaufwarnungen und Aufbewahrungsfristen (Löschkonzept).
import { prisma } from "../db";
import { env } from "../env";
import { audit } from "../audit";
import { notifyHelpers, notifyUsers, usersWithPermission } from "../notify";
import { purgeExpiredSessions } from "../auth";
import { anonymizeCore } from "./helpers";
import { EXPIRY_WARN_DAYS } from "@/lib/constants";
import { daysUntil, fmtDate } from "@/lib/dates";

const level = (days: number): number => (days < 0 ? 0 : days <= 7 ? 7 : days <= 30 ? 30 : days <= 90 ? 90 : -1);

export async function runMaintenance(now = new Date()) {
  const result = { qualWarnings: 0, docWarnings: 0, resourceWarnings: 0, anonymized: 0, notificationsDeleted: 0, auditDeleted: 0, sessionsDeleted: 0 };

  // 1) Qualifikationen: Warnung je Stufe (90/30/7 Tage, abgelaufen) – genau einmal pro Stufe und Ablaufdatum
  const quals = await prisma.helperQualification.findMany({
    where: { status: "GUELTIG", validUntil: { not: null, lte: new Date(now.getTime() + EXPIRY_WARN_DAYS[0] * 86_400_000) }, helper: { status: "AKTIV" } },
    include: { type: { select: { name: true } }, helper: { select: { id: true, firstName: true, lastName: true, unitId: true } } },
  });
  for (const q of quals) {
    const days = daysUntil(q.validUntil!, now), lvl = level(days);
    if (lvl < 0 || q.warnedLevel === lvl + 1) continue;
    const key = `qual:${q.id}:${q.validUntil!.toISOString().slice(0, 10)}:${lvl}`;
    const text = days < 0 ? `ist seit ${-days} Tagen abgelaufen` : days === 0 ? "läuft heute ab" : `läuft in ${days} Tagen ab (${fmtDate(q.validUntil!)})`;
    result.qualWarnings += await notifyHelpers([q.helperId], { type: "QUALIFIKATION_LAEUFT_AB", title: `Qualifikation „${q.type.name}“ ${text}`, body: "Bitte kümmere dich rechtzeitig um die Verlängerung bzw. melde den neuen Nachweis.", link: "/profile", dedupeKey: key });
    // Leitung nur bei der letzten Stufe und bei Ablauf informieren
    if (lvl <= 7) {
      const managers = await usersWithPermission("qualification.manage", q.helper.unitId);
      await notifyUsers(managers, { type: "QUALIFIKATION_LAEUFT_AB", title: `${q.helper.firstName} ${q.helper.lastName}: „${q.type.name}“ ${text}`, link: `/helpers/${q.helperId}`, dedupeKey: `${key}:lead` });
    }
    await prisma.helperQualification.update({ where: { id: q.id }, data: { warnedLevel: lvl + 1 } });
  }

  // 2) Dokumente
  const docs = await prisma.document.findMany({ where: { warnedExpiry: false, expiresAt: { not: null, lte: new Date(now.getTime() + 30 * 86_400_000) } } });
  for (const d of docs) {
    const managers = await usersWithPermission("document.manage", d.unitId);
    result.docWarnings += await notifyUsers(managers, { type: "DOKUMENT_LAEUFT_AB", title: `Dokument „${d.title}“ ${d.expiresAt! < now ? "ist abgelaufen" : `läuft am ${fmtDate(d.expiresAt!)} ab`}`, link: `/documents/${d.id}`, dedupeKey: `doc:${d.id}:${d.expiresAt!.toISOString().slice(0, 10)}` });
    await prisma.document.update({ where: { id: d.id }, data: { warnedExpiry: true } });
  }

  // 3) Fahrzeuge & Material: Fälligkeiten (je Fälligkeitsdatum einmalig)
  const soon = new Date(now.getTime() + 30 * 86_400_000);
  const vehicles = await prisma.vehicle.findMany({ where: { OR: [{ tuvDue: { lte: soon } }, { huDue: { lte: soon } }, { insuranceDue: { lte: soon } }] } });
  for (const v of vehicles) {
    const managers = await usersWithPermission("vehicle.manage", v.unitId);
    for (const [label, d] of [["TÜV", v.tuvDue], ["HU", v.huDue], ["Versicherung", v.insuranceDue]] as const) {
      if (!d || d > soon) continue;
      result.resourceWarnings += await notifyUsers(managers, { type: "SYSTEM", title: `${v.name}: ${label} ${d < now ? "überfällig" : `fällig am ${fmtDate(d)}`}`, link: `/vehicles/${v.id}`, dedupeKey: `veh:${v.id}:${label}:${d.toISOString().slice(0, 10)}` });
    }
  }
  const mats = await prisma.materialItem.findMany({ where: { status: { not: "AUSGESONDERT" }, OR: [{ expiresAt: { lte: soon } }, { maintenanceDue: { lte: soon } }] } });
  for (const m of mats) {
    const managers = await usersWithPermission("material.manage", m.unitId);
    for (const [label, d] of [["Ablauf", m.expiresAt], ["Wartung", m.maintenanceDue]] as const) {
      if (!d || d > soon) continue;
      result.resourceWarnings += await notifyUsers(managers, { type: "SYSTEM", title: `${m.name}: ${label} ${d < now ? "überfällig" : `am ${fmtDate(d)}`}`, link: `/materials/${m.id}`, dedupeKey: `mat:${m.id}:${label}:${d.toISOString().slice(0, 10)}` });
    }
  }

  // 4) Löschkonzept
  const leaveCut = new Date(now); leaveCut.setMonth(leaveCut.getMonth() - env.retainLeftHelperMonths);
  const leavers = await prisma.helper.findMany({ where: { status: "AUSGETRETEN", leftAt: { lt: leaveCut } }, select: { id: true, unitId: true } });
  for (const h of leavers) {
    if (await anonymizeCore(h.id)) {
      result.anonymized++;
      await audit(null, { action: "helper.anonymize", entityType: "Helper", entityId: h.id, unitId: h.unitId, summary: `Helfer #${h.id.slice(-6)} nach Ablauf der Aufbewahrungsfrist (${env.retainLeftHelperMonths} Monate) automatisch anonymisiert` });
    }
  }
  const nCut = new Date(now.getTime() - env.retainNotificationDays * 86_400_000);
  result.notificationsDeleted = (await prisma.notification.deleteMany({ where: { createdAt: { lt: nCut }, readAt: { not: null } } })).count;
  await prisma.notification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 2 * env.retainNotificationDays * 86_400_000) } } });
  result.sessionsDeleted = (await purgeExpiredSessions()).count;
  await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } });

  // Audit-Log-Bereinigung ist die EINZIGE erlaubte Löschung (Trigger-Ausnahme nur innerhalb dieser Transaktion)
  const auditCut = new Date(now); auditCut.setMonth(auditCut.getMonth() - env.retainAuditMonths);
  result.auditDeleted = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL hypax.allow_audit_purge = 'on'`);
    return tx.$executeRaw`DELETE FROM "AuditLog" WHERE "at" < ${auditCut}`;
  });
  await audit(null, { action: "maintenance.run", entityType: "System", summary: `Wartungslauf: ${result.qualWarnings} Qualifikationswarnungen, ${result.anonymized} anonymisiert, ${result.auditDeleted} Audit-Einträge nach Frist gelöscht` });
  return result;
}
