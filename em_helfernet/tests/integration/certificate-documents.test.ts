import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper, mkHelper } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import * as C from "../../src/server/services/courses";
import { deleteDocument, downloadDocument, getDocument, listDocuments, updateDocumentMeta } from "../../src/server/services/documents";
import { backfillCertificateDocuments } from "../../src/server/services/certificate-documents";
import { anonymizeHelper } from "../../src/server/services/helpers";

let S: Awaited<ReturnType<typeof scenario>>;
beforeEach(async () => { S = await scenario(); });
const rejects = (p: Promise<unknown>, status: number, msg?: RegExp) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status && (!msg || msg.test(e.message)));
const day = 86_400_000;
const iso = (d: number) => new Date(Date.now() + d * day).toISOString();

test("Lehrgangszertifikat landet in der Personalakte; Widerruf erzeugt neue Version", async () => {
  const ausbilder = await mkAccountHelper(S.ovA.id, "Anna", "Ausbilder", "AUSBILDER");
  const h = await mkAccountHelper(S.berA.id, "Paul", "Prüfling");
  const course = await C.createCourse(ausbilder.ctx, { unitId: S.ovA.id, title: "Funk", startsAt: iso(-2), endsAt: iso(-1), qualificationTypeId: S.qt.get("Sprechfunk (BOS)") });
  await C.addParticipant(ausbilder.ctx, course.id, h.helper.id);
  const p = await prisma.courseParticipant.findFirstOrThrow({ where: { helperId: h.helper.id } });
  await C.assessParticipant(ausbilder.ctx, p.id, true);
  const cert = await prisma.certificate.findFirstOrThrow({ where: { participantId: p.id } });
  assert.equal(cert.helperId, h.helper.id);
  assert.ok(cert.documentId);

  // Helfer sieht das Dokument in seiner Akte und kann es laden
  const own = await listDocuments(h.ctx, { ownerHelperId: h.helper.id });
  assert.equal(own.length, 1);
  assert.equal(own[0].category, "ZERTIFIKAT");
  assert.match(own[0].title, new RegExp(cert.number));
  const file = await downloadDocument(h.ctx, cert.documentId!);
  assert.equal(Buffer.from(file.data).subarray(0, 5).toString(), "%PDF-");
  // Qualifikation verweist auf das Dokument
  const q = await prisma.helperQualification.findUniqueOrThrow({ where: { id: cert.helperQualificationId! } });
  assert.equal(q.documentId, cert.documentId);
  // Zertifikat-Dokumente sind geschützt
  await rejects(deleteDocument(S.adminCtx, cert.documentId!), 400, /automatisch/);
  await rejects(updateDocumentMeta(S.adminCtx, cert.documentId!, { title: "x" }), 400);

  await C.revokeCertificate(ausbilder.ctx, cert.id, "Fehler bei der Prüfung");
  const doc = await getDocument(h.ctx, cert.documentId!);
  assert.equal(doc.currentVersion, 2);
  assert.match(doc.title, /widerrufen/);
});

test("Zertifikat ohne Lehrgang: Ausbilder stellt aus, Qualifikation wird eingetragen, Rechte werden geprüft", async () => {
  const ausbilder = await mkAccountHelper(S.berA.id, "Anna", "Ausbilder", "AUSBILDER");
  const helfer = await mkAccountHelper(S.berA.id, "Hans", "Helfer");
  const fremd = await mkHelper(S.berB.id, "Fritz", "Fremd");
  const input = { helperId: helfer.helper.id, title: "Erste Hilfe (extern)", qualificationTypeId: S.qt.get("Erste-Hilfe-Ausbildung"), startsAt: "2026-09-01", endsAt: "2026-09-02", instructors: "DRK-Fremdkurs" };
  await rejects(C.issueCertificate(helfer.ctx, input), 403);
  await rejects(C.issueCertificate(ausbilder.ctx, { ...input, helperId: fremd.id }), 403);
  await rejects(C.issueCertificate(ausbilder.ctx, { ...input, endsAt: "2026-08-01" }), 400);

  const c = await C.issueCertificate(ausbilder.ctx, input);
  assert.match(c.number, /^HN-2026-\d{5}$/);
  assert.equal(c.courseId, null);
  assert.ok(c.documentId);
  const q = await prisma.helperQualification.findFirstOrThrow({ where: { helperId: helfer.helper.id, typeId: S.qt.get("Erste-Hilfe-Ausbildung") } });
  assert.equal(q.status, "GUELTIG");
  assert.ok(q.validUntil && q.validUntil.getUTCFullYear() === 2028); // 24 Monate
  assert.ok(await prisma.notification.findFirst({ where: { userId: helfer.user.id, type: "LEHRGANG_ERGEBNIS" } }));
  // Ausbilder sieht das Dokument, der Inhaber auch, ein anderer Helfer nicht
  assert.equal((await getDocument(ausbilder.ctx, c.documentId!)).category, "ZERTIFIKAT");
  assert.equal((await getDocument(helfer.ctx, c.documentId!)).ownerHelperId, helfer.helper.id);
  const anderer = await mkAccountHelper(S.berA.id, "Olga", "Other");
  await rejects(getDocument(anderer.ctx, c.documentId!), 404);
  assert.equal((await C.certificateForDownload(helfer.ctx, c.id)).id, c.id);
  await rejects(C.certificateForDownload(anderer.ctx, c.id), 404);
  // Prüfseite und Widerruf ohne Lehrgang
  assert.equal((await C.verifyCertificate(c.code))?.courseTitle, "Erste Hilfe (extern)");
  await rejects(C.revokeCertificate(anderer.ctx, c.id, "x"), 403);
  await C.revokeCertificate(ausbilder.ctx, c.id, "falsch ausgestellt");
  assert.equal((await prisma.helperQualification.findUniqueOrThrow({ where: { id: q.id } })).status, "WIDERRUFEN");
});

test("Nachtrag alter Zertifikate und Anonymisierung", async () => {
  const h = await mkHelper(S.berA.id, "Alt", "Bestand");
  const cert = await prisma.certificate.create({ data: { number: "HN-2026-99999", code: "altbestand12345", helperId: h.id, holderName: "Alt Bestand", courseTitle: "Alter Lehrgang", unitName: "X", courseStartsAt: new Date(), courseEndsAt: new Date(), issuedByName: "System" } });
  assert.equal(await backfillCertificateDocuments(), 1);
  const after = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } });
  assert.ok(after.documentId);
  assert.equal(await backfillCertificateDocuments(), 0);
  await anonymizeHelper(S.adminCtx, h.id);
  const anon = await prisma.certificate.findUniqueOrThrow({ where: { id: cert.id } });
  assert.equal(anon.holderName, "Anonymisiert");
  assert.equal(anon.documentId, null); // Dokument mit der Akte gelöscht
  assert.equal(await backfillCertificateDocuments(), 0); // nicht neu erzeugt
});
