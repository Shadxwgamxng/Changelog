// Dokumentenverwaltung: verschlüsselter Speicher, Versionierung, dreistufige Zugriffskontrolle.
import type { DocAccess, DocCategory, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, isSelf, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { ALLOWED_MIME, getStorage, MAX_UPLOAD_BYTES, sniffMatches } from "../storage";
import { sha256 } from "@/lib/crypto";

const CATS = ["QUALIFIKATIONSNACHWEIS", "DIENSTANWEISUNG", "AUSBILDUNG", "FAHRZEUG", "PRUEFBERICHT", "INTERN"] as const;
const ACCESS = ["HELFER", "FUEHRUNG", "PERSOENLICH"] as const;

/** Welche Dokumente darf der Benutzer überhaupt sehen? (als Prisma-Filter, damit Listen/Suche nichts durchlassen) */
export function documentVisibility(ctx: Ctx): Prisma.DocumentWhereInput {
  const manage = scopeWhere(ctx, "document.manage") as Prisma.DocumentWhereInput;
  const or: Prisma.DocumentWhereInput[] = [
    { AND: [{ access: "HELFER" }, scopeWhere(ctx, "document.view") as Prisma.DocumentWhereInput] },
    { AND: [{ access: { in: ["HELFER", "FUEHRUNG"] } }, manage] },
    { AND: [{ access: "PERSOENLICH" }, scopeWhere(ctx, "qualification.manage") as Prisma.DocumentWhereInput] },
    { AND: [{ access: "PERSOENLICH" }, scopeWhere(ctx, "helper.view_sensitive") as Prisma.DocumentWhereInput] },
  ];
  if (ctx.helperId) or.push({ ownerHelperId: ctx.helperId });
  return { OR: or };
}

const sanitizeName = (n: string) => n.normalize("NFC").replace(/[\\/\0\r\n"<>:*?|]/g, "_").replace(/^\.+/, "_").slice(0, 150) || "datei";

export async function listDocuments(ctx: Ctx, q: { unitId?: string; category?: DocCategory; ownerHelperId?: string; vehicleId?: string; q?: string } = {}) {
  const units = await loadUnits();
  const and: Prisma.DocumentWhereInput[] = [documentVisibility(ctx)];
  if (q.unitId && units.get(q.unitId)) and.push({ unit: { path: { startsWith: units.get(q.unitId)!.path } } });
  if (q.category) and.push({ category: q.category });
  if (q.ownerHelperId) and.push({ ownerHelperId: q.ownerHelperId });
  if (q.vehicleId) and.push({ vehicleId: q.vehicleId });
  if (q.q?.trim()) and.push({ title: { contains: q.q.trim(), mode: "insensitive" } });
  const rows = await prisma.document.findMany({
    where: { AND: and }, orderBy: { createdAt: "desc" }, take: 300,
    include: { unit: { select: { name: true } }, owner: { select: { firstName: true, lastName: true } }, versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  return rows.map((d) => ({
    id: d.id, unitId: d.unitId, unitName: d.unit.name, title: d.title, category: d.category, access: d.access, ownerName: d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : null,
    ownerHelperId: d.ownerHelperId, vehicleId: d.vehicleId, expiresAt: d.expiresAt, version: d.currentVersion, filename: d.versions[0]?.filename, size: d.versions[0]?.size, uploadedAt: d.versions[0]?.uploadedAt,
  }));
}

async function loadVisible(ctx: Ctx, id: string) {
  const d = await prisma.document.findFirst({ where: { AND: [{ id }, documentVisibility(ctx)] }, include: { versions: { orderBy: { version: "desc" } }, owner: { select: { firstName: true, lastName: true } }, unit: { select: { name: true } } } });
  if (!d) throw notFound("Dokument nicht gefunden.");
  return d;
}

export async function getDocument(ctx: Ctx, id: string) {
  const d = await loadVisible(ctx, id);
  const unit = (await loadUnits()).get(d.unitId)!;
  return { ...d, unitName: d.unit.name, ownerName: d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : null, canManage: canIn(ctx, "document.manage", unit) };
}

interface UploadInput { unitId: string; title: string; category: DocCategory; access: DocAccess; ownerHelperId?: string | null; vehicleId?: string | null; expiresAt?: Date | null }
interface FileInput { filename: string; mime: string; data: Buffer }

function validateFile(f: FileInput) {
  if (!f.data.length) throw badRequest("Die Datei ist leer.");
  if (f.data.length > MAX_UPLOAD_BYTES) throw badRequest(`Die Datei ist größer als ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  if (!ALLOWED_MIME[f.mime]) throw badRequest("Dateityp nicht erlaubt (PDF, PNG, JPG, TXT, DOCX, XLSX).");
  if (!sniffMatches(f.mime, f.data)) throw badRequest("Der Dateiinhalt passt nicht zum Dateityp.");
}

/** Berechtigung zum Hochladen: Dokumentverwalter – oder Helfer für ihre eigenen persönlichen Nachweise. */
async function uploadGuard(ctx: Ctx, input: UploadInput) {
  const unit = (await loadUnits()).get(input.unitId);
  if (!unit) throw badRequest("Einheit nicht gefunden.");
  if (canIn(ctx, "document.manage", unit)) return;
  if (input.access === "PERSOENLICH" && input.ownerHelperId && isSelf(ctx, input.ownerHelperId) && input.category === "QUALIFIKATIONSNACHWEIS") {
    const h = await prisma.helper.findUnique({ where: { id: input.ownerHelperId } });
    if (h?.unitId === input.unitId) return;
  }
  throw forbidden();
}

export async function uploadDocument(ctx: Ctx, input: UploadInput, file: FileInput) {
  if (!CATS.includes(input.category) || !ACCESS.includes(input.access)) throw badRequest("Ungültige Angaben.");
  if (!input.title.trim()) throw badRequest("Titel fehlt.");
  validateFile(file);
  await uploadGuard(ctx, input);
  if (input.access === "PERSOENLICH" && !input.ownerHelperId) throw badRequest("Persönliche Dokumente brauchen einen Besitzer.");
  if (input.ownerHelperId) {
    const h = await prisma.helper.findUnique({ where: { id: input.ownerHelperId } });
    if (!h || h.unitId !== input.unitId) throw badRequest("Der Besitzer gehört nicht zu dieser Einheit.");
  }
  if (input.vehicleId) {
    const v = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!v || v.unitId !== input.unitId) throw badRequest("Das Fahrzeug gehört nicht zu dieser Einheit.");
  }
  const key = await getStorage().put(file.data);
  try {
    const doc = await prisma.document.create({
      data: {
        unitId: input.unitId, title: input.title.trim().slice(0, 200), category: input.category, access: input.access, ownerHelperId: input.ownerHelperId ?? null, vehicleId: input.vehicleId ?? null,
        expiresAt: input.expiresAt ?? null, createdById: ctx.userId,
        versions: { create: { version: 1, storageKey: key, filename: sanitizeName(file.filename), mime: file.mime, size: file.data.length, sha256: sha256(file.data), uploadedById: ctx.userId } },
      },
    });
    await audit(ctx, { action: "document.upload", entityType: "Document", entityId: doc.id, unitId: doc.unitId, summary: `Dokument „${doc.title}“ hochgeladen (${doc.category})` });
    return doc;
  } catch (e) {
    await getStorage().delete(key).catch(() => {});
    throw e;
  }
}

export async function addDocumentVersion(ctx: Ctx, id: string, file: FileInput, expiresAt?: Date | null) {
  validateFile(file);
  const d = await loadVisible(ctx, id);
  const unit = (await loadUnits()).get(d.unitId)!;
  const own = d.ownerHelperId && isSelf(ctx, d.ownerHelperId) && d.access === "PERSOENLICH";
  if (!canIn(ctx, "document.manage", unit) && !own) throw forbidden();
  const key = await getStorage().put(file.data);
  try {
    const next = d.currentVersion + 1;
    await prisma.$transaction([
      prisma.documentVersion.create({ data: { documentId: id, version: next, storageKey: key, filename: sanitizeName(file.filename), mime: file.mime, size: file.data.length, sha256: sha256(file.data), uploadedById: ctx.userId } }),
      prisma.document.update({ where: { id }, data: { currentVersion: next, warnedExpiry: false, ...(expiresAt !== undefined ? { expiresAt } : {}) } }),
    ]);
    await audit(ctx, { action: "document.version", entityType: "Document", entityId: id, unitId: d.unitId, summary: `Neue Version ${next} von „${d.title}“` });
    return next;
  } catch (e) {
    await getStorage().delete(key).catch(() => {});
    throw e;
  }
}

/** Liefert den entschlüsselten Dateiinhalt – jeder Abruf wird protokolliert. */
export async function downloadDocument(ctx: Ctx, id: string, version?: number) {
  const d = await loadVisible(ctx, id);
  const v = d.versions.find((x) => x.version === (version ?? d.currentVersion));
  if (!v) throw notFound("Version nicht gefunden.");
  const data = await getStorage().get(v.storageKey);
  if (sha256(data) !== v.sha256) throw new Error("Integritätsprüfung fehlgeschlagen.");
  await audit(ctx, { action: "document.download", entityType: "Document", entityId: id, unitId: d.unitId, summary: `Dokument „${d.title}“ (v${v.version}) abgerufen` });
  return { data, filename: v.filename, mime: v.mime };
}

export async function updateDocumentMeta(ctx: Ctx, id: string, patch: { title?: string; category?: DocCategory; access?: DocAccess; expiresAt?: Date | null }) {
  const d = await loadVisible(ctx, id);
  await require_(ctx, "document.manage", d.unitId);
  if (patch.access === "PERSOENLICH" && !d.ownerHelperId) throw badRequest("Persönliche Dokumente brauchen einen Besitzer.");
  await prisma.document.update({ where: { id }, data: { title: patch.title?.trim() || undefined, category: patch.category, access: patch.access, expiresAt: patch.expiresAt, warnedExpiry: patch.expiresAt !== undefined ? false : undefined } });
  await audit(ctx, { action: "document.update", entityType: "Document", entityId: id, unitId: d.unitId, summary: `Dokument „${d.title}“ geändert`, changes: patch.access && patch.access !== d.access ? { access: [d.access, patch.access] } : null });
}

export async function deleteDocument(ctx: Ctx, id: string) {
  const d = await loadVisible(ctx, id);
  const unit = (await loadUnits()).get(d.unitId)!;
  const own = d.ownerHelperId && isSelf(ctx, d.ownerHelperId);
  if (!canIn(ctx, "document.manage", unit) && !own) throw forbidden();
  await prisma.document.delete({ where: { id } });
  await Promise.all(d.versions.map((v) => getStorage().delete(v.storageKey).catch(() => {})));
  await audit(ctx, { action: "document.delete", entityType: "Document", entityId: id, unitId: d.unitId, summary: `Dokument „${d.title}“ mit ${d.versions.length} Version(en) gelöscht` });
}

export async function expiringDocuments(ctx: Ctx, days = 60) {
  if (!hasAnywhere(ctx, "document.manage")) return [];
  const rows = await prisma.document.findMany({ where: { AND: [{ expiresAt: { not: null, lte: new Date(Date.now() + days * 86_400_000) } }, scopeWhere(ctx, "document.manage") as Prisma.DocumentWhereInput] }, include: { unit: { select: { name: true } } }, orderBy: { expiresAt: "asc" }, take: 100 });
  return rows.map((d) => ({ id: d.id, title: d.title, unitName: d.unit.name, expiresAt: d.expiresAt! }));
}
