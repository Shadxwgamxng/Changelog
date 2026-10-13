// Lehrgänge: Termine, Anmeldung (mit Voraussetzungen, Kapazität, Warteliste), Bewertung, Zertifikate.
import type { CourseParticipantStatus, Prisma } from "@prisma/client";
import { prisma, type Db } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, require_, scopeWhere, unitsWith, type Ctx } from "../context";
import { loadUnits, type UnitInfo } from "../units";
import { notifyHelpers } from "../notify";
import { courseInput } from "../schemas";
import { loadCovers } from "./qualifications";
import { computeValidUntil, effectiveQualTypes, missingTypes } from "@/lib/qualification";
import { randomToken } from "@/lib/crypto";
import { fmtDateTime, fmtRange } from "@/lib/dates";
import { storeCertificateDocument } from "./certificate-documents";
import { manualCertificateInput } from "../schemas";

export const PARTICIPANT_STATUS_LABEL: Record<CourseParticipantStatus, string> = {
  ANGEMELDET: "Angemeldet", WARTELISTE: "Warteliste", ABGEMELDET: "Abgemeldet", BESTANDEN: "Bestanden", NICHT_BESTANDEN: "Nicht bestanden",
};
/** Belegen einen Platz */
const SEATED: CourseParticipantStatus[] = ["ANGEMELDET", "BESTANDEN", "NICHT_BESTANDEN"];

const ancestorsAndSelf = (unit: UnitInfo) => unit.path.split("/").filter(Boolean);

/** Sichtbar: Lehrgänge in Einheiten mit course.view/manage, Lehrgänge der eigenen und übergeordneter Einheiten, eigene Teilnahmen. */
export async function courseVisibleWhere(ctx: Ctx): Promise<Prisma.CourseWhereInput> {
  const or: Prisma.CourseWhereInput[] = [scopeWhere(ctx, "course.view") as Prisma.CourseWhereInput, scopeWhere(ctx, "course.manage") as Prisma.CourseWhereInput];
  if (ctx.helperId) {
    or.push({ participants: { some: { helperId: ctx.helperId } } });
    const own = ctx.helperUnitId ? (await loadUnits()).get(ctx.helperUnitId) : null;
    if (own && hasAnywhere(ctx, "course.view")) or.push({ unitId: { in: ancestorsAndSelf(own) } });
  }
  return { OR: or };
}

const courseInclude = {
  unit: { select: { id: true, name: true, path: true } },
  qualification: { select: { id: true, name: true, validityMonths: true } },
  lead: { select: { id: true, firstName: true, lastName: true } },
  participants: { select: { id: true, helperId: true, status: true } },
} satisfies Prisma.CourseInclude;

function seatInfo(c: { capacity: number | null; participants: { status: CourseParticipantStatus }[] }) {
  const taken = c.participants.filter((p) => SEATED.includes(p.status)).length;
  const waiting = c.participants.filter((p) => p.status === "WARTELISTE").length;
  return { taken, waiting, free: c.capacity === null ? null : Math.max(0, c.capacity - taken), full: c.capacity !== null && taken >= c.capacity };
}

export async function listCourses(ctx: Ctx, q: { scope?: "upcoming" | "past" | "mine" } = {}) {
  const now = new Date();
  const scope = q.scope ?? "upcoming";
  const where: Prisma.CourseWhereInput[] = [await courseVisibleWhere(ctx)];
  if (scope === "upcoming") where.push({ endsAt: { gte: now } });
  if (scope === "past") where.push({ endsAt: { lt: now } });
  if (scope === "mine") where.push({ participants: { some: { helperId: ctx.helperId ?? "-" } } });
  const rows = await prisma.course.findMany({ where: { AND: where }, include: courseInclude, orderBy: { startsAt: scope === "upcoming" ? "asc" : "desc" }, take: 200 });
  return rows.map((c) => {
    const mine = ctx.helperId ? c.participants.find((p) => p.helperId === ctx.helperId) : undefined;
    return {
      id: c.id, title: c.title, startsAt: c.startsAt, endsAt: c.endsAt, location: c.location, status: c.status, unitName: c.unit.name,
      qualificationName: c.qualification?.name ?? null, capacity: c.capacity, ...seatInfo(c), myStatus: mine?.status ?? null,
    };
  });
}

async function loadCourse(ctx: Ctx, courseId: string) {
  const c = await prisma.course.findFirst({ where: { AND: [{ id: courseId }, await courseVisibleWhere(ctx)] }, include: courseInclude });
  if (!c) throw notFound("Lehrgang nicht gefunden.");
  const unit = (await loadUnits()).get(c.unitId)!;
  return { c, unit, manage: canIn(ctx, "course.manage", unit) };
}

/** Prüft, ob ein Helfer die Voraussetzungen zum Lehrgangsbeginn erfüllt. Liefert die Namen fehlender Qualifikationen. */
async function missingPrerequisites(helperId: string, course: { prerequisiteIds: string[]; startsAt: Date }, db: Db = prisma): Promise<string[]> {
  if (!course.prerequisiteIds.length) return [];
  const quals = await db.helperQualification.findMany({ where: { helperId }, select: { typeId: true, validUntil: true, status: true } });
  const held = effectiveQualTypes(quals, await loadCovers(), course.startsAt);
  const missing = missingTypes(course.prerequisiteIds, held);
  if (!missing.length) return [];
  return (await db.qualificationType.findMany({ where: { id: { in: missing } }, select: { name: true } })).map((t) => t.name);
}

export async function getCourse(ctx: Ctx, courseId: string) {
  const { c, unit, manage } = await loadCourse(ctx, courseId);
  const now = new Date();
  const prereqs = c.prerequisiteIds.length ? await prisma.qualificationType.findMany({ where: { id: { in: c.prerequisiteIds } }, select: { id: true, name: true } }) : [];
  const mine = ctx.helperId
    ? await prisma.courseParticipant.findUnique({ where: { courseId_helperId: { courseId, helperId: ctx.helperId } }, include: { certificate: { select: { id: true, number: true, code: true, revokedAt: true } } } })
    : null;
  const units = await loadUnits();
  const helperUnit = ctx.helperUnitId ? units.get(ctx.helperUnitId) : null;
  const eligibleUnit = !!helperUnit && helperUnit.path.startsWith(unit.path);
  const deadline = c.signupDeadline ?? c.startsAt;
  const signupOpen = c.status === "GEPLANT" && deadline > now && c.startsAt > now;
  const missing = ctx.helperId && eligibleUnit ? await missingPrerequisites(ctx.helperId, c) : [];
  const participants = manage
    ? await prisma.courseParticipant.findMany({
        where: { courseId },
        include: { helper: { select: { id: true, firstName: true, lastName: true, unit: { select: { name: true } } } }, certificate: { select: { id: true, number: true, code: true, revokedAt: true } } },
        orderBy: [{ createdAt: "asc" }],
      })
    : [];
  return {
    id: c.id, title: c.title, description: c.description, location: c.location, startsAt: c.startsAt, endsAt: c.endsAt, signupDeadline: c.signupDeadline,
    status: c.status, unitId: c.unitId, unitName: c.unit.name, capacity: c.capacity, ...seatInfo(c), instructors: c.instructors,
    lead: c.lead ? { id: c.lead.id, name: `${c.lead.firstName} ${c.lead.lastName}` } : null, leadHelperId: c.leadHelperId,
    qualification: c.qualification, qualificationTypeId: c.qualificationTypeId, prerequisites: prereqs, prerequisiteIds: c.prerequisiteIds,
    started: c.startsAt <= now, signupOpen,
    mine: mine ? { id: mine.id, status: mine.status, note: mine.note, result: mine.result, certificate: mine.certificate } : null,
    canSignUp: !!ctx.helperId && eligibleUnit && signupOpen && (!mine || mine.status === "ABGEMELDET") && missing.length === 0,
    signupBlockedReason: !ctx.helperId ? "Nur Helfer mit Helferprofil können sich anmelden." : !eligibleUnit ? "Der Lehrgang gehört nicht zu deiner Einheit." : !signupOpen ? (c.status !== "GEPLANT" ? "Der Lehrgang ist nicht mehr offen." : "Der Anmeldeschluss ist vorbei.") : missing.length ? `Es fehlen Voraussetzungen: ${missing.join(", ")}.` : null,
    perms: { manage },
    participants: participants.map((p) => ({
      id: p.id, helperId: p.helperId, name: `${p.helper.lastName}, ${p.helper.firstName}`, unitName: p.helper.unit.name, status: p.status, note: p.note, result: p.result,
      assessedAt: p.assessedAt, createdAt: p.createdAt, certificate: p.certificate,
    })),
  };
}

async function validated(ctx: Ctx, raw: unknown) {
  const input = courseInput.parse(raw);
  await require_(ctx, "course.manage", input.unitId);
  if (input.qualificationTypeId && !(await prisma.qualificationType.findUnique({ where: { id: input.qualificationTypeId } }))) throw badRequest("Qualifikationsart nicht gefunden.");
  const prereqs = [...new Set(input.prerequisiteIds)];
  if (prereqs.length && (await prisma.qualificationType.count({ where: { id: { in: prereqs } } })) !== prereqs.length) throw badRequest("Unbekannte Voraussetzung.");
  if (input.leadHelperId) {
    const lead = await prisma.helper.findUnique({ where: { id: input.leadHelperId }, select: { unitId: true } });
    if (!lead) throw badRequest("Lehrgangsleitung nicht gefunden.");
  }
  return { ...input, prerequisiteIds: prereqs };
}

export async function createCourse(ctx: Ctx, raw: unknown) {
  const input = await validated(ctx, raw);
  const course = await prisma.course.create({ data: input });
  await audit(ctx, { action: "course.create", entityType: "Course", entityId: course.id, unitId: course.unitId, summary: `Lehrgang „${course.title}“ angelegt` });
  // Helfer der Einheit und ihrer Untereinheiten informieren
  const units = await loadUnits();
  const unit = units.get(course.unitId)!;
  const helpers = await prisma.helper.findMany({ where: { status: "AKTIV", userId: { not: null }, unit: { path: { startsWith: unit.path } } }, select: { id: true } });
  await notifyHelpers(helpers.map((h) => h.id), { type: "LEHRGANG", title: `Neuer Lehrgang: ${course.title}`, body: fmtRange(course.startsAt, course.endsAt), link: `/courses/${course.id}`, dedupeKey: `course-new:${course.id}` });
  return course;
}

export async function updateCourse(ctx: Ctx, courseId: string, raw: unknown) {
  const { c, manage } = await loadCourse(ctx, courseId);
  if (!manage) throw forbidden();
  if (c.status !== "GEPLANT") throw badRequest("Abgeschlossene oder abgesagte Lehrgänge können nicht mehr bearbeitet werden.");
  const input = await validated(ctx, { ...(raw as object), unitId: c.unitId });
  const updated = await prisma.course.update({ where: { id: courseId }, data: input });
  await audit(ctx, { action: "course.update", entityType: "Course", entityId: courseId, unitId: c.unitId, summary: `Lehrgang „${updated.title}“ bearbeitet` });
  await promoteWaitlist(ctx, courseId);
  const changedTime = c.startsAt.getTime() !== updated.startsAt.getTime() || c.endsAt.getTime() !== updated.endsAt.getTime();
  if (changedTime) {
    const ps = await prisma.courseParticipant.findMany({ where: { courseId, status: { in: ["ANGEMELDET", "WARTELISTE"] } }, select: { helperId: true } });
    await notifyHelpers(ps.map((p) => p.helperId), { type: "LEHRGANG", title: `Lehrgang verlegt: ${updated.title}`, body: `Neuer Termin: ${fmtRange(updated.startsAt, updated.endsAt)}`, link: `/courses/${courseId}` });
  }
  return updated;
}

export async function cancelCourse(ctx: Ctx, courseId: string) {
  const { c, manage } = await loadCourse(ctx, courseId);
  if (!manage) throw forbidden();
  if (c.status !== "GEPLANT") throw badRequest("Der Lehrgang ist nicht mehr offen.");
  if (c.participants.some((p) => p.status === "BESTANDEN")) throw badRequest("Es gibt bereits bestandene Teilnehmer – bitte stattdessen abschließen.");
  await prisma.course.update({ where: { id: courseId }, data: { status: "ABGESAGT" } });
  await audit(ctx, { action: "course.cancel", entityType: "Course", entityId: courseId, unitId: c.unitId, summary: `Lehrgang „${c.title}“ abgesagt` });
  const ids = c.participants.filter((p) => p.status === "ANGEMELDET" || p.status === "WARTELISTE").map((p) => p.helperId);
  await notifyHelpers(ids, { type: "LEHRGANG", title: `Lehrgang abgesagt: ${c.title}`, body: fmtRange(c.startsAt, c.endsAt), link: `/courses/${courseId}` });
}

export async function completeCourse(ctx: Ctx, courseId: string) {
  const { c, manage } = await loadCourse(ctx, courseId);
  if (!manage) throw forbidden();
  if (c.status !== "GEPLANT") throw badRequest("Der Lehrgang ist nicht mehr offen.");
  if (c.startsAt > new Date()) throw badRequest("Ein Lehrgang kann erst nach Beginn abgeschlossen werden.");
  const open = c.participants.filter((p) => p.status === "ANGEMELDET").length;
  if (open) throw badRequest(`Bitte zuerst alle Teilnehmer bewerten (${open} offen).`);
  await prisma.course.update({ where: { id: courseId }, data: { status: "ABGESCHLOSSEN" } });
  await audit(ctx, { action: "course.complete", entityType: "Course", entityId: courseId, unitId: c.unitId, summary: `Lehrgang „${c.title}“ abgeschlossen` });
}

/** Sperrt den Lehrgang für die Dauer der Transaktion (keine Überbuchung bei gleichzeitigen Anmeldungen). */
async function lockCourse(tx: Prisma.TransactionClient, courseId: string) {
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
  const course = await tx.course.findUniqueOrThrow({ where: { id: courseId }, include: { participants: { select: { status: true } } } });
  return { course, ...seatInfo(course) };
}

export async function signUpForCourse(ctx: Ctx, courseId: string, note?: string | null) {
  const info = await getCourse(ctx, courseId);
  if (!info.canSignUp) throw badRequest(info.signupBlockedReason ?? (info.mine ? "Du bist bereits angemeldet." : "Anmeldung nicht möglich."));
  const helperId = ctx.helperId!;
  const status = await prisma.$transaction(async (tx) => {
    const { full } = await lockCourse(tx, courseId);
    const status: CourseParticipantStatus = full ? "WARTELISTE" : "ANGEMELDET";
    const data = { status, note: note?.trim().slice(0, 500) || null, result: null, assessedAt: null };
    await tx.courseParticipant.upsert({ where: { courseId_helperId: { courseId, helperId } }, create: { courseId, helperId, ...data }, update: data });
    return status;
  });
  await audit(ctx, { action: "course.signup", entityType: "Course", entityId: courseId, unitId: info.unitId, summary: `Zum Lehrgang „${info.title}“ ${status === "WARTELISTE" ? "auf die Warteliste gesetzt" : "angemeldet"}` });
  return status;
}

export async function withdrawFromCourse(ctx: Ctx, courseId: string) {
  if (!ctx.helperId) throw forbidden();
  const p = await prisma.courseParticipant.findUnique({ where: { courseId_helperId: { courseId, helperId: ctx.helperId } }, include: { course: true } });
  if (!p || (p.status !== "ANGEMELDET" && p.status !== "WARTELISTE")) throw badRequest("Du bist für diesen Lehrgang nicht angemeldet.");
  if (p.course.startsAt <= new Date()) throw badRequest("Der Lehrgang hat bereits begonnen – bitte wende dich an die Lehrgangsleitung.");
  await prisma.courseParticipant.update({ where: { id: p.id }, data: { status: "ABGEMELDET" } });
  await audit(ctx, { action: "course.withdraw", entityType: "Course", entityId: courseId, unitId: p.course.unitId, summary: `Vom Lehrgang „${p.course.title}“ abgemeldet` });
  await promoteWaitlist(ctx, courseId);
}

/** Rückt Wartende nach, solange Plätze frei sind (Reihenfolge der Anmeldung). */
async function promoteWaitlist(ctx: Ctx, courseId: string) {
  const promoted = await prisma.$transaction(async (tx) => {
    const { course, free } = await lockCourse(tx, courseId);
    if (course.status !== "GEPLANT" || course.startsAt <= new Date()) return [];
    const waiting = await tx.courseParticipant.findMany({ where: { courseId, status: "WARTELISTE" }, orderBy: { createdAt: "asc" }, take: free === null ? 1000 : free });
    for (const w of waiting) await tx.courseParticipant.update({ where: { id: w.id }, data: { status: "ANGEMELDET" } });
    return waiting.map((w) => ({ helperId: w.helperId, title: course.title }));
  });
  if (promoted.length) {
    await audit(ctx, { action: "course.waitlist_promote", entityType: "Course", entityId: courseId, summary: `${promoted.length} Teilnehmer von der Warteliste nachgerückt` });
    await notifyHelpers(promoted.map((p) => p.helperId), { type: "LEHRGANG", title: `Platz frei: ${promoted[0].title}`, body: "Du bist von der Warteliste nachgerückt und jetzt angemeldet.", link: `/courses/${courseId}` });
  }
}

async function participantForManager(ctx: Ctx, participantId: string) {
  const p = await prisma.courseParticipant.findUnique({ where: { id: participantId }, include: { course: true, helper: { select: { firstName: true, lastName: true } }, certificate: true } });
  if (!p) throw notFound();
  const { manage } = await loadCourse(ctx, p.courseId);
  if (!manage) throw forbidden();
  return p;
}

/** Leitung meldet einen Helfer an (ohne Anmeldeschluss/Kapazitätsgrenze; Voraussetzungen werden geprüft, außer mit override). */
export async function addParticipant(ctx: Ctx, courseId: string, helperId: string, override = false) {
  const { c, unit, manage } = await loadCourse(ctx, courseId);
  if (!manage) throw forbidden();
  if (c.status !== "GEPLANT") throw badRequest("Der Lehrgang ist nicht mehr offen.");
  const helper = await prisma.helper.findUnique({ where: { id: helperId }, include: { unit: { select: { path: true } } } });
  if (!helper || helper.status === "ANONYMISIERT") throw notFound("Helfer nicht gefunden.");
  if (!helper.unit.path.startsWith(unit.path)) throw badRequest("Der Helfer gehört nicht zur Einheit des Lehrgangs.");
  const missing = await missingPrerequisites(helperId, c);
  if (missing.length && !override) throw conflict(`Es fehlen Voraussetzungen: ${missing.join(", ")}. Mit „Trotzdem anmelden“ ist eine protokollierte Ausnahme möglich.`, { missing });
  const existing = c.participants.find((p) => p.helperId === helperId);
  if (existing && existing.status !== "ABGEMELDET" && existing.status !== "WARTELISTE") throw conflict("Der Helfer ist bereits Teilnehmer.");
  await prisma.courseParticipant.upsert({ where: { courseId_helperId: { courseId, helperId } }, create: { courseId, helperId, status: "ANGEMELDET" }, update: { status: "ANGEMELDET", result: null, assessedAt: null } });
  await audit(ctx, { action: "course.participant_add", entityType: "Course", entityId: courseId, unitId: c.unitId, summary: `${helper.firstName} ${helper.lastName} zum Lehrgang „${c.title}“ angemeldet${missing.length ? ` (Ausnahme: fehlende Voraussetzungen ${missing.join(", ")})` : ""}` });
  await notifyHelpers([helperId], { type: "LEHRGANG", title: `Angemeldet: ${c.title}`, body: `Du wurdest zum Lehrgang angemeldet (${fmtRange(c.startsAt, c.endsAt)}).`, link: `/courses/${courseId}` });
}

export async function setParticipantStatus(ctx: Ctx, participantId: string, status: "ANGEMELDET" | "WARTELISTE" | "ABGEMELDET") {
  const p = await participantForManager(ctx, participantId);
  if (p.course.status !== "GEPLANT") throw badRequest("Der Lehrgang ist nicht mehr offen.");
  if (p.status === "BESTANDEN" || p.status === "NICHT_BESTANDEN") throw badRequest("Bereits bewertete Teilnehmer bitte über die Bewertung ändern.");
  await prisma.courseParticipant.update({ where: { id: p.id }, data: { status } });
  await audit(ctx, { action: "course.participant_status", entityType: "Course", entityId: p.courseId, unitId: p.course.unitId, summary: `${p.helper.firstName} ${p.helper.lastName}: ${PARTICIPANT_STATUS_LABEL[p.status]} → ${PARTICIPANT_STATUS_LABEL[status]}` });
  if (status === "ABGEMELDET") await promoteWaitlist(ctx, p.courseId);
}

async function nextCertificateNumber(tx: Prisma.TransactionClient, at: Date) {
  const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('certificate_number_seq') AS n`;
  return `HN-${at.getUTCFullYear()}-${String(n).padStart(5, "0")}`;
}

/** Bewertung. „Bestanden“ trägt die Qualifikation ein und stellt das Zertifikat aus; eine Änderung auf „nicht bestanden“ widerruft beides. */
export async function assessParticipant(ctx: Ctx, participantId: string, passed: boolean, result?: string | null) {
  const p = await participantForManager(ctx, participantId);
  if (p.course.status === "ABGESAGT") throw badRequest("Der Lehrgang wurde abgesagt.");
  if (p.course.startsAt > new Date()) throw badRequest("Bewertungen sind erst ab Lehrgangsbeginn möglich.");
  if (p.status === "ABGEMELDET" || p.status === "WARTELISTE") throw badRequest("Nur angemeldete Teilnehmer können bewertet werden.");
  const course = await prisma.course.findUniqueOrThrow({ where: { id: p.courseId }, include: { qualification: true, unit: { select: { name: true } }, lead: { select: { firstName: true, lastName: true } } } });
  const issuer = ctx.helperName ?? ctx.email;
  const name = `${p.helper.firstName} ${p.helper.lastName}`;
  const note = result?.trim().slice(0, 1000) || null;

  await prisma.$transaction(async (tx) => {
    await tx.courseParticipant.update({ where: { id: p.id }, data: { status: passed ? "BESTANDEN" : "NICHT_BESTANDEN", result: note, assessedAt: new Date() } });
    if (passed && (!p.certificate || p.certificate.revokedAt)) {
      let helperQualificationId: string | null = null;
      const issuedAt = course.endsAt;
      const validUntil = course.qualification ? computeValidUntil(issuedAt, course.qualification.validityMonths) : null;
      if (course.qualification) {
        const hq = await tx.helperQualification.create({ data: { helperId: p.helperId, typeId: course.qualification.id, issuedAt, validUntil, status: "GUELTIG", note: `Lehrgang „${course.title}“` } });
        helperQualificationId = hq.id;
      }
      const certData = {
        number: await nextCertificateNumber(tx, issuedAt), code: randomToken(12).replace(/[-_]/g, "x"), courseId: course.id, helperId: p.helperId, helperQualificationId,
        holderName: name, courseTitle: course.title, qualificationName: course.qualification?.name ?? null, unitName: course.unit.name,
        courseStartsAt: course.startsAt, courseEndsAt: course.endsAt, issuedAt: new Date(), validUntil, issuedByName: issuer,
        instructors: [course.lead ? `${course.lead.firstName} ${course.lead.lastName}` : null, course.instructors].filter(Boolean).join(", ") || null,
        revokedAt: null, revokeReason: null,
      };
      if (p.certificate) await tx.certificate.update({ where: { id: p.certificate.id }, data: certData });
      else await tx.certificate.create({ data: { ...certData, participantId: p.id } });
    }
    if (!passed && p.certificate && !p.certificate.revokedAt) {
      await tx.certificate.update({ where: { id: p.certificate.id }, data: { revokedAt: new Date(), revokeReason: "Bewertung auf „nicht bestanden“ geändert" } });
      if (p.certificate.helperQualificationId) await tx.helperQualification.updateMany({ where: { id: p.certificate.helperQualificationId }, data: { status: "WIDERRUFEN" } });
    }
  });
  const certNow = await prisma.certificate.findUnique({ where: { participantId: p.id }, select: { id: true } });
  const issuedOrRevoked = (passed && (!p.certificate || p.certificate.revokedAt)) || (!passed && p.certificate && !p.certificate.revokedAt);
  if (certNow && issuedOrRevoked) await storeCertificateDocument(certNow.id, ctx.userId);
  await audit(ctx, { action: "course.assess", entityType: "Course", entityId: p.courseId, unitId: p.course.unitId, summary: `${name}: ${passed ? "bestanden" : "nicht bestanden"} (Lehrgang „${p.course.title}“)` });
  if (p.status !== (passed ? "BESTANDEN" : "NICHT_BESTANDEN")) {
    await notifyHelpers([p.helperId], {
      type: "LEHRGANG_ERGEBNIS",
      title: passed ? `Bestanden: ${p.course.title}` : `Lehrgang nicht bestanden: ${p.course.title}`,
      body: passed ? `Herzlichen Glückwunsch! ${course.qualification ? `Die Qualifikation „${course.qualification.name}“ wurde eingetragen. ` : ""}Dein Zertifikat steht zum Download bereit.` : note ?? undefined,
      link: `/courses/${p.courseId}`,
    });
  }
}

/** Darf der Benutzer dieses Zertifikat verwalten? Lehrgangszertifikat: Leitung des Lehrgangs; sonst course.manage in der Einheit des Inhabers. */
async function certificateManageGuard(ctx: Ctx, cert: { courseId: string | null; helperId: string | null }) {
  if (cert.courseId) {
    const { manage } = await loadCourse(ctx, cert.courseId).catch(() => ({ manage: false }));
    if (manage) return true;
  }
  if (cert.helperId) {
    const h = await prisma.helper.findUnique({ where: { id: cert.helperId }, select: { unitId: true } });
    const unit = h ? (await loadUnits()).get(h.unitId) : null;
    if (unit && canIn(ctx, "course.manage", unit)) return true;
  }
  return false;
}

export async function revokeCertificate(ctx: Ctx, certificateId: string, reason: string) {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) throw notFound();
  if (!(await certificateManageGuard(ctx, cert))) throw forbidden();
  if (cert.revokedAt) throw badRequest("Das Zertifikat ist bereits widerrufen.");
  const why = reason.trim().slice(0, 300);
  if (!why) throw badRequest("Bitte einen Grund angeben.");
  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({ where: { id: cert.id }, data: { revokedAt: new Date(), revokeReason: why } });
    if (cert.helperQualificationId) await tx.helperQualification.updateMany({ where: { id: cert.helperQualificationId }, data: { status: "WIDERRUFEN" } });
  });
  await storeCertificateDocument(cert.id, ctx.userId);
  await audit(ctx, { action: "certificate.revoke", entityType: "Certificate", entityId: cert.id, summary: `Zertifikat ${cert.number} widerrufen: ${why}` });
}

/** Zertifikat ohne Lehrgang ausstellen (z. B. externe Ausbildung, Nachtrag). Trägt optional die Qualifikation ein. */
export async function issueCertificate(ctx: Ctx, raw: unknown) {
  const input = manualCertificateInput.parse(raw);
  const helper = await prisma.helper.findUnique({ where: { id: input.helperId }, include: { unit: { select: { id: true, name: true, path: true } } } });
  if (!helper || helper.status === "ANONYMISIERT") throw notFound("Helfer nicht gefunden.");
  if (!canIn(ctx, "course.manage", helper.unit)) throw forbidden("Zertifikate darf ausstellen, wer in der Einheit Lehrgänge verwalten darf.");
  if (input.endsAt < input.startsAt) throw badRequest("Das Ende liegt vor dem Beginn.");
  const qual = input.qualificationTypeId ? await prisma.qualificationType.findUnique({ where: { id: input.qualificationTypeId } }) : null;
  if (input.qualificationTypeId && !qual) throw badRequest("Qualifikationsart nicht gefunden.");
  const validUntil = input.validUntil ?? (qual ? computeValidUntil(input.endsAt, qual.validityMonths) : null);
  if (validUntil && validUntil < input.endsAt) throw badRequest("„Gültig bis“ liegt vor dem Ende.");
  const name = `${helper.firstName} ${helper.lastName}`;
  const cert = await prisma.$transaction(async (tx) => {
    const hq = qual ? await tx.helperQualification.create({ data: { helperId: helper.id, typeId: qual.id, issuedAt: input.endsAt, validUntil, status: "GUELTIG", note: `Zertifikat „${input.title}“` } }) : null;
    return tx.certificate.create({
      data: {
        number: await nextCertificateNumber(tx, input.endsAt), code: randomToken(12).replace(/[-_]/g, "x"), helperId: helper.id, helperQualificationId: hq?.id ?? null,
        holderName: name, courseTitle: input.title, qualificationName: qual?.name ?? null, unitName: helper.unit.name,
        courseStartsAt: input.startsAt, courseEndsAt: input.endsAt, validUntil, issuedByName: ctx.helperName ?? ctx.email, instructors: input.instructors,
      },
    });
  });
  const documentId = await storeCertificateDocument(cert.id, ctx.userId);
  await audit(ctx, { action: "certificate.issue", entityType: "Certificate", entityId: cert.id, unitId: helper.unitId, summary: `Zertifikat ${cert.number} „${input.title}“ für ${name} ausgestellt (ohne Lehrgang)${qual ? `, Qualifikation „${qual.name}“ eingetragen` : ""}` });
  await notifyHelpers([helper.id], { type: "LEHRGANG_ERGEBNIS", title: `Zertifikat ausgestellt: ${input.title}`, body: `Dein Zertifikat ${cert.number} liegt in deinen Dokumenten.${qual ? ` Die Qualifikation „${qual.name}“ wurde eingetragen.` : ""}`, link: documentId ? `/documents/${documentId}` : "/courses?tab=mine" });
  return { ...cert, documentId };
}

/** Zertifikat zu einem Dokument (für die Dokumentseite). */
export async function certificateForDocument(ctx: Ctx, documentId: string) {
  const cert = await prisma.certificate.findUnique({ where: { documentId } });
  if (!cert) return null;
  return { id: cert.id, number: cert.number, code: cert.code, revokedAt: cert.revokedAt, revokeReason: cert.revokeReason, courseId: cert.courseId, canManage: await certificateManageGuard(ctx, cert) };
}

/** Wem darf man ein Zertifikat ausstellen? */
export async function certificateIssueOptions(ctx: Ctx) {
  const units = await unitsWith(ctx, "course.manage");
  if (!units.length) return null;
  const [helpers, qualTypes] = await Promise.all([
    prisma.helper.findMany({ where: { status: { not: "ANONYMISIERT" }, OR: units.map((u) => ({ unit: { path: { startsWith: u.path } } })) }, select: { id: true, firstName: true, lastName: true, unit: { select: { name: true } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 3000 }),
    prisma.qualificationType.findMany({ where: { active: true }, select: { id: true, name: true, validityMonths: true }, orderBy: { name: "asc" } }),
  ]);
  return { helpers: helpers.map((h) => ({ id: h.id, name: `${h.lastName}, ${h.firstName}`, unitName: h.unit.name })), qualTypes };
}

/** Zertifikat für den Download: eigenes oder als Lehrgangsleitung. */
export async function certificateForDownload(ctx: Ctx, certificateId: string) {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) throw notFound();
  const own = !!ctx.helperId && cert.helperId === ctx.helperId;
  if (!own && !(await certificateManageGuard(ctx, cert))) throw notFound();
  return cert;
}

/** Öffentliche Echtheitsprüfung über den Prüfcode – nur die Angaben, die auch auf dem Zertifikat stehen. */
export async function verifyCertificate(code: string) {
  if (!/^[A-Za-z0-9]{8,40}$/.test(code)) return null;
  const c = await prisma.certificate.findUnique({ where: { code } });
  if (!c) return null;
  return {
    number: c.number, holderName: c.holderName, courseTitle: c.courseTitle, qualificationName: c.qualificationName, unitName: c.unitName,
    courseStartsAt: c.courseStartsAt, courseEndsAt: c.courseEndsAt, issuedAt: c.issuedAt, validUntil: c.validUntil, revokedAt: c.revokedAt, revokeReason: c.revokeReason,
  };
}

/** Auswahl für Formulare */
export async function courseFormOptions(ctx: Ctx) {
  const units = await unitsWith(ctx, "course.manage");
  const paths = units.map((u) => u.path);
  const [qualTypes, helpers] = await Promise.all([
    prisma.qualificationType.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    paths.length ? prisma.helper.findMany({ where: { status: "AKTIV", OR: paths.map((p) => ({ unit: { path: { startsWith: p } } })) }, select: { id: true, firstName: true, lastName: true, unitId: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 2000 }) : [],
  ]);
  return { units, qualTypes, helpers: helpers.map((h) => ({ id: h.id, name: `${h.lastName}, ${h.firstName}`, unitId: h.unitId })) };
}

/** Für den Kalender */
export async function coursesBetween(ctx: Ctx, from: Date, to: Date) {
  return prisma.course.findMany({
    where: { AND: [await courseVisibleWhere(ctx), { startsAt: { lte: to }, endsAt: { gte: from } }] },
    include: { unit: { select: { name: true } }, participants: { where: { helperId: ctx.helperId ?? "-" }, select: { status: true } } },
    orderBy: { startsAt: "asc" }, take: 500,
  });
}

export const deadlineLabel = (c: { signupDeadline: Date | null; startsAt: Date }) => fmtDateTime(c.signupDeadline ?? c.startsAt);
