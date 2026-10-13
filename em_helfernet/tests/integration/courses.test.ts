import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper, mkHelper, mkQual } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import * as C from "../../src/server/services/courses";
import { anonymizeHelper } from "../../src/server/services/helpers";
import { renderCertificatePdf } from "../../src/server/certificate-pdf";

let S: Awaited<ReturnType<typeof scenario>>;
beforeEach(async () => { S = await scenario(); });
const rejects = (p: Promise<unknown>, status: number, msg?: RegExp) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status && (!msg || msg.test(e.message)));
const day = 86_400_000;
const at = (offsetDays: number, h = 9) => { const d = new Date(Date.now() + offsetDays * day); d.setUTCHours(h, 0, 0, 0); return d.toISOString(); };

async function mkCourse(extra: Record<string, unknown> = {}) {
  const ausbilder = await mkAccountHelper(S.ovA.id, "Anna", "Ausbilder", "AUSBILDER");
  const course = await C.createCourse(ausbilder.ctx, { unitId: S.ovA.id, title: "Sanitätshelfer-Lehrgang", startsAt: at(10), endsAt: at(11, 16), capacity: "2", qualificationTypeId: S.qt.get("Sanitätshelfer"), ...extra });
  return { ausbilder, course };
}

test("Lehrgang: Anmeldung aus Untereinheit, Voraussetzungen, Kapazität, Warteliste und Nachrücken", async () => {
  const { course } = await mkCourse({ prerequisiteIds: [S.qt.get("Erste-Hilfe-Ausbildung")] });
  const a = await mkAccountHelper(S.berA.id, "Ben", "A");
  const b = await mkAccountHelper(S.berA.id, "Cara", "B");
  const c = await mkAccountHelper(S.jrkA.id, "Dora", "C");
  const fremd = await mkAccountHelper(S.berB.id, "Emil", "Fremd");

  // ohne Erste Hilfe keine Anmeldung
  await rejects(C.signUpForCourse(a.ctx, course.id), 400, /Voraussetzungen: Erste-Hilfe-Ausbildung/);
  // Rettungssanitäter deckt Erste Hilfe nicht ab → aber direkte Qualifikation reicht
  for (const h of [a, b, c]) await mkQual(h.helper.id, S.qt.get("Erste-Hilfe-Ausbildung")!);
  assert.equal(await C.signUpForCourse(a.ctx, course.id, "Bringe Laptop mit"), "ANGEMELDET");
  assert.equal(await C.signUpForCourse(b.ctx, course.id), "ANGEMELDET");
  assert.equal(await C.signUpForCourse(c.ctx, course.id), "WARTELISTE");
  await rejects(C.signUpForCourse(a.ctx, course.id), 400);
  // fremde Einheit sieht den Lehrgang nicht
  await rejects(C.getCourse(fremd.ctx, course.id), 404);
  assert.equal((await C.listCourses(fremd.ctx)).length, 0);
  // Helfer der Untereinheit sieht ihn in der Liste
  assert.equal((await C.listCourses(a.ctx))[0].myStatus, "ANGEMELDET");

  await C.withdrawFromCourse(b.ctx, course.id);
  const status = Object.fromEntries((await prisma.courseParticipant.findMany({ include: { helper: true } })).map((p) => [p.helper.firstName, p.status]));
  assert.deepEqual(status, { Ben: "ANGEMELDET", Cara: "ABGEMELDET", Dora: "ANGEMELDET" });
  assert.ok(await prisma.notification.findFirst({ where: { userId: c.user.id, type: "LEHRGANG", title: { startsWith: "Platz frei" } } }));
});

test("Lehrgang: gleichzeitige Anmeldungen überbuchen nicht", async () => {
  const { course } = await mkCourse({ capacity: "1" });
  const hs = await Promise.all([1, 2, 3, 4].map((i) => mkAccountHelper(S.berA.id, `H${i}`, "Parallel")));
  await Promise.all(hs.map((h) => C.signUpForCourse(h.ctx, course.id)));
  const ps = await prisma.courseParticipant.findMany({ where: { courseId: course.id } });
  assert.equal(ps.filter((p) => p.status === "ANGEMELDET").length, 1);
  assert.equal(ps.filter((p) => p.status === "WARTELISTE").length, 3);
});

test("Lehrgang: Bewertung trägt Qualifikation ein, stellt Zertifikat aus, Widerruf und Prüfseite", async () => {
  const { ausbilder, course } = await mkCourse({ startsAt: at(-2), endsAt: at(-1, 16) });
  const h = await mkAccountHelper(S.berA.id, "Paul", "Prüfling");
  const helfer = await mkAccountHelper(S.berA.id, "Nina", "Neugier");
  // Anmeldung nach Beginn nur durch Leitung
  await rejects(C.signUpForCourse(h.ctx, course.id), 400);
  await C.addParticipant(ausbilder.ctx, course.id, h.helper.id);
  const p = await prisma.courseParticipant.findFirstOrThrow({ where: { helperId: h.helper.id } });
  // normaler Helfer darf nicht bewerten
  await rejects(C.assessParticipant(helfer.ctx, p.id, true), 403);
  await C.assessParticipant(ausbilder.ctx, p.id, true, "Sehr gute Leistung");

  const q = await prisma.helperQualification.findFirstOrThrow({ where: { helperId: h.helper.id, typeId: S.qt.get("Sanitätshelfer") } });
  assert.equal(q.status, "GUELTIG");
  assert.ok(q.validUntil && q.validUntil > new Date(Date.now() + 700 * day)); // 24 Monate
  const cert = await prisma.certificate.findFirstOrThrow({ where: { participantId: p.id } });
  assert.match(cert.number, /^HN-\d{4}-\d{5}$/);
  assert.equal(cert.holderName, "Paul Prüfling");
  assert.equal(cert.qualificationName, "Sanitätshelfer");
  assert.ok(await prisma.notification.findFirst({ where: { userId: h.user.id, type: "LEHRGANG_ERGEBNIS" } }));

  // öffentlich prüfbar, Download nur für Inhaber und Leitung
  assert.equal((await C.verifyCertificate(cert.code))?.revokedAt, null);
  assert.equal(await C.verifyCertificate("gibtesnicht123"), null);
  assert.equal((await C.certificateForDownload(h.ctx, cert.id)).id, cert.id);
  assert.equal((await C.certificateForDownload(ausbilder.ctx, cert.id)).id, cert.id);
  await rejects(C.certificateForDownload(helfer.ctx, cert.id), 404);
  const pdf = await renderCertificatePdf(cert);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");

  // Lehrgang abschließen erst wenn alle bewertet – hier erledigt
  await C.completeCourse(ausbilder.ctx, course.id);
  assert.equal((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status, "ABGESCHLOSSEN");

  await C.revokeCertificate(ausbilder.ctx, cert.id, "Täuschungsversuch");
  assert.equal((await C.verifyCertificate(cert.code))?.revokeReason, "Täuschungsversuch");
  assert.equal((await prisma.helperQualification.findUniqueOrThrow({ where: { id: q.id } })).status, "WIDERRUFEN");
});

test("Lehrgang: Bewertung erst ab Beginn, Abschluss erst wenn alle bewertet, Absage benachrichtigt", async () => {
  const { ausbilder, course } = await mkCourse();
  const h = await mkAccountHelper(S.berA.id, "Olaf", "Offen");
  await C.signUpForCourse(h.ctx, course.id);
  const p = await prisma.courseParticipant.findFirstOrThrow({ where: { helperId: h.helper.id } });
  await rejects(C.assessParticipant(ausbilder.ctx, p.id, true), 400, /ab Lehrgangsbeginn/);
  await rejects(C.completeCourse(ausbilder.ctx, course.id), 400);
  await C.cancelCourse(ausbilder.ctx, course.id);
  assert.ok(await prisma.notification.findFirst({ where: { userId: h.user.id, title: { startsWith: "Lehrgang abgesagt" } } }));
  await rejects(C.signUpForCourse(h.ctx, course.id), 400);
});

test("Lehrgang: Leitung kann fehlende Voraussetzung nur mit Ausnahme übergehen; Anonymisierung entwertet Zertifikat", async () => {
  const { ausbilder, course } = await mkCourse({ startsAt: at(-1), endsAt: at(-1, 16), prerequisiteIds: [S.qt.get("Sprechfunk (BOS)")] });
  const h = await mkHelper(S.berA.id, "Ohne", "Konto");
  await rejects(C.addParticipant(ausbilder.ctx, course.id, h.id), 409, /Sprechfunk/);
  await C.addParticipant(ausbilder.ctx, course.id, h.id, true);
  const p = await prisma.courseParticipant.findFirstOrThrow({ where: { helperId: h.id } });
  await C.assessParticipant(ausbilder.ctx, p.id, true);
  const cert = await prisma.certificate.findFirstOrThrow({ where: { participantId: p.id } });
  await anonymizeHelper(S.adminCtx, h.id);
  const v = await C.verifyCertificate(cert.code);
  assert.equal(v?.holderName, "Anonymisiert");
  assert.ok(v?.revokedAt);
});

test("Lehrgang: Rechte – Helfer darf nicht anlegen, Ausbilder nur in eigener Einheit", async () => {
  const helfer = await mkAccountHelper(S.berA.id, "Hans", "Helfer");
  await rejects(C.createCourse(helfer.ctx, { unitId: S.berA.id, title: "X", startsAt: at(5), endsAt: at(5, 12) }), 403);
  const { ausbilder } = await mkCourse();
  await rejects(C.createCourse(ausbilder.ctx, { unitId: S.ovB.id, title: "X", startsAt: at(5), endsAt: at(5, 12) }), 403);
  await assert.rejects(C.createCourse(ausbilder.ctx, { unitId: S.ovA.id, title: "X", startsAt: at(5, 12), endsAt: at(5, 10) }), /Ende muss nach dem Beginn/);
});
