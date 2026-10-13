// Zertifikate als PDF-Dokument in der Personalakte ablegen (verschlüsselt, versioniert).
import { prisma } from "../db";
import { getStorage } from "../storage";
import { renderCertificatePdf } from "../certificate-pdf";
import { sha256 } from "@/lib/crypto";

const docTitle = (c: { number: string; courseTitle: string; revokedAt: Date | null }) => `Zertifikat ${c.number} – ${c.courseTitle}${c.revokedAt ? " (widerrufen)" : ""}`.slice(0, 200);

/**
 * Erzeugt das PDF und legt es als persönliches Dokument des Inhabers ab. Existiert das Dokument schon
 * (z. B. nach einem Widerruf), entsteht eine neue Version – frühere Versionen bleiben nachvollziehbar.
 */
export async function storeCertificateDocument(certificateId: string, actorUserId: string): Promise<string | null> {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId }, include: { helper: { select: { id: true, unitId: true, status: true } }, document: true } });
  if (!cert?.helper || cert.helper.status === "ANONYMISIERT") return null;
  const pdf = await renderCertificatePdf(cert);
  const storage = getStorage();
  const key = await storage.put(pdf);
  const filename = `Zertifikat-${cert.number}${cert.revokedAt ? "-widerrufen" : ""}.pdf`;
  const version = { storageKey: key, filename, mime: "application/pdf", size: pdf.length, sha256: sha256(pdf), uploadedById: actorUserId };
  try {
    if (cert.document) {
      const next = cert.document.currentVersion + 1;
      await prisma.$transaction([
        prisma.documentVersion.create({ data: { documentId: cert.document.id, version: next, ...version } }),
        prisma.document.update({ where: { id: cert.document.id }, data: { currentVersion: next, title: docTitle(cert) } }),
      ]);
      return cert.document.id;
    }
    const doc = await prisma.document.create({
      data: {
        unitId: cert.helper.unitId, title: docTitle(cert), category: "ZERTIFIKAT", access: "PERSOENLICH", ownerHelperId: cert.helper.id, createdById: actorUserId,
        versions: { create: { version: 1, ...version } },
      },
    });
    await prisma.certificate.update({ where: { id: cert.id }, data: { documentId: doc.id } });
    if (cert.helperQualificationId) await prisma.helperQualification.updateMany({ where: { id: cert.helperQualificationId, documentId: null }, data: { documentId: doc.id } });
    return doc.id;
  } catch (e) {
    await storage.delete(key).catch(() => {});
    throw e;
  }
}

/** Nachtrag: Zertifikate, die vor dieser Funktion ausgestellt wurden, bekommen ihr Dokument. */
export async function backfillCertificateDocuments(): Promise<number> {
  const missing = await prisma.certificate.findMany({ where: { documentId: null, helperId: { not: null }, helper: { status: { not: "ANONYMISIERT" } } }, select: { id: true }, take: 500 });
  if (!missing.length) return 0;
  const actor = await prisma.user.findFirst({ where: { systemRole: "SUPERADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } }) ?? await prisma.user.findFirst({ select: { id: true } });
  if (!actor) return 0;
  let n = 0;
  for (const c of missing) if (await storeCertificateDocument(c.id, actor.id).catch(() => null)) n++;
  return n;
}
