import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit, diff } from "../audit";
import { badRequest, conflict, notFound } from "../errors";
import { canIn, hasAnywhere, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { materialInput } from "../schemas";
import { daysUntil } from "@/lib/dates";
import { dueState } from "./vehicles";

export type MaterialFlag = "MINDESTBESTAND" | "ABLAUF_BALD" | "ABGELAUFEN" | "WARTUNG_FAELLIG" | "WARTUNG_BALD" | "DEFEKT" | "IN_WARTUNG";

type Row = Prisma.MaterialItemGetPayload<{ include: { unit: { select: { name: true } }; responsible: { select: { firstName: true; lastName: true } }; issues: { where: { returnedAt: null } } } }>;

function decorate(m: Row) {
  const out = m.issues.reduce((s, i) => s + i.quantity, 0);
  const flags: MaterialFlag[] = [];
  if (m.status === "DEFEKT") flags.push("DEFEKT");
  if (m.status === "IN_WARTUNG") flags.push("IN_WARTUNG");
  if (m.quantity - out < m.minQuantity) flags.push("MINDESTBESTAND");
  const exp = dueState(m.expiresAt, 60), mnt = dueState(m.maintenanceDue, 30);
  if (exp === "UEBERFAELLIG") flags.push("ABGELAUFEN"); else if (exp === "BALD") flags.push("ABLAUF_BALD");
  if (mnt === "UEBERFAELLIG") flags.push("WARTUNG_FAELLIG"); else if (mnt === "BALD") flags.push("WARTUNG_BALD");
  const { issues: _i, unit: _u, responsible, ...rest } = m;
  return { ...rest, unitName: m.unit.name, responsibleName: responsible ? `${responsible.firstName} ${responsible.lastName}` : null, issuedOut: out, available: m.quantity - out, flags };
}

const include = { unit: { select: { name: true } }, responsible: { select: { firstName: true, lastName: true } }, issues: { where: { returnedAt: null } } } as const;

export async function listMaterials(ctx: Ctx, q: { unitId?: string; category?: string; flagged?: boolean } = {}) {
  const units = await loadUnits();
  const and: Prisma.MaterialItemWhereInput[] = [scopeWhere(ctx, "material.view") as Prisma.MaterialItemWhereInput];
  if (q.unitId && units.get(q.unitId)) and.push({ unit: { path: { startsWith: units.get(q.unitId)!.path } } });
  if (q.category) and.push({ category: q.category });
  const rows = await prisma.materialItem.findMany({ where: { AND: and }, include, orderBy: [{ category: "asc" }, { name: "asc" }], take: 1000 });
  const items = rows.map(decorate);
  return q.flagged ? items.filter((i) => i.flags.length) : items;
}

export async function getMaterial(ctx: Ctx, id: string) {
  const m = await prisma.materialItem.findFirst({ where: { AND: [{ id }, scopeWhere(ctx, "material.view") as Prisma.MaterialItemWhereInput] }, include });
  if (!m) throw notFound("Material nicht gefunden.");
  const history = await prisma.materialIssue.findMany({ where: { materialId: id }, include: { helper: { select: { firstName: true, lastName: true } } }, orderBy: { issuedAt: "desc" }, take: 30 });
  const unit = (await loadUnits()).get(m.unitId)!;
  return { ...decorate(m), history: history.map((h) => ({ id: h.id, helperName: `${h.helper.firstName} ${h.helper.lastName}`, quantity: h.quantity, issuedAt: h.issuedAt, returnedAt: h.returnedAt, note: h.note })), canManage: canIn(ctx, "material.manage", unit) };
}

async function checkResponsible(responsibleId: string | null, unitId: string) {
  if (!responsibleId) return;
  const unit = (await loadUnits()).get(unitId)!;
  const h = await prisma.helper.findUnique({ where: { id: responsibleId }, include: { unit: true } });
  if (!h || !(h.unit.path.startsWith(unit.path) || unit.path.startsWith(h.unit.path))) throw badRequest("Der Verantwortliche gehört nicht zu dieser Einheit.");
}

export async function createMaterial(ctx: Ctx, raw: unknown) {
  const input = materialInput.parse(raw);
  await require_(ctx, "material.manage", input.unitId);
  await checkResponsible(input.responsibleId, input.unitId);
  const m = await prisma.materialItem.create({ data: input });
  await audit(ctx, { action: "material.create", entityType: "MaterialItem", entityId: m.id, unitId: m.unitId, summary: `Material „${m.name}“ angelegt (${m.quantity} Stk.)` });
  return m;
}

export async function updateMaterial(ctx: Ctx, id: string, raw: unknown) {
  const input = materialInput.omit({ unitId: true }).parse(raw);
  const before = await prisma.materialItem.findUnique({ where: { id }, include: { issues: { where: { returnedAt: null } } } });
  if (!before) throw notFound();
  await require_(ctx, "material.manage", before.unitId, true);
  await checkResponsible(input.responsibleId, before.unitId);
  const out = before.issues.reduce((s, i) => s + i.quantity, 0);
  if (input.quantity < out) throw conflict(`Es sind noch ${out} Stück ausgegeben – der Bestand kann nicht kleiner sein.`);
  const after = await prisma.materialItem.update({ where: { id }, data: input });
  const changes = diff(before as never, after as never, Object.keys(input));
  if (Object.keys(changes).length) await audit(ctx, { action: "material.update", entityType: "MaterialItem", entityId: id, unitId: before.unitId, summary: `Material „${before.name}“ geändert`, changes });
}

export async function deleteMaterial(ctx: Ctx, id: string) {
  const m = await prisma.materialItem.findUnique({ where: { id }, include: { _count: { select: { shifts: true, incidents: true } } } });
  if (!m) throw notFound();
  await require_(ctx, "material.manage", m.unitId, true);
  if (m._count.shifts || m._count.incidents) throw conflict("Das Material wurde bereits in Diensten/Einsätzen verwendet. Setze es auf „Ausgesondert“.");
  await prisma.materialItem.delete({ where: { id } });
  await audit(ctx, { action: "material.delete", entityType: "MaterialItem", entityId: id, unitId: m.unitId, summary: `Material „${m.name}“ gelöscht` });
}

export async function issueMaterial(ctx: Ctx, materialId: string, helperId: string, quantity: number, note?: string | null) {
  if (!Number.isInteger(quantity) || quantity < 1) throw badRequest("Ungültige Menge.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "MaterialItem" WHERE id = ${materialId} FOR UPDATE`;
    const m = await tx.materialItem.findUnique({ where: { id: materialId }, include: { issues: { where: { returnedAt: null } } } });
    if (!m) throw notFound();
    await require_(ctx, "material.manage", m.unitId, true);
    if (m.status === "DEFEKT" || m.status === "AUSGESONDERT") throw conflict("Defektes oder ausgesondertes Material kann nicht ausgegeben werden.");
    const h = await tx.helper.findUnique({ where: { id: helperId }, include: { unit: true } });
    const mu = (await loadUnits()).get(m.unitId)!;
    if (!h || h.status !== "AKTIV" || !(h.unit.path.startsWith(mu.path) || mu.path.startsWith(h.unit.path))) throw badRequest("Helfer nicht gefunden oder nicht aktiv.");
    const avail = m.quantity - m.issues.reduce((s, i) => s + i.quantity, 0);
    if (quantity > avail) throw conflict(`Nur ${avail} Stück verfügbar.`);
    const issue = await tx.materialIssue.create({ data: { materialId, helperId, quantity, note: note ?? null } });
    await audit(ctx, { action: "material.issue", entityType: "MaterialItem", entityId: materialId, unitId: m.unitId, summary: `${quantity}× „${m.name}“ an ${h.firstName} ${h.lastName} ausgegeben` }, tx);
    return issue;
  });
}

export async function returnMaterial(ctx: Ctx, issueId: string) {
  const i = await prisma.materialIssue.findUnique({ where: { id: issueId }, include: { material: true, helper: true } });
  if (!i) throw notFound();
  await require_(ctx, "material.manage", i.material.unitId, true);
  if (i.returnedAt) throw conflict("Bereits zurückgegeben.");
  await prisma.materialIssue.update({ where: { id: issueId }, data: { returnedAt: new Date() } });
  await audit(ctx, { action: "material.return", entityType: "MaterialItem", entityId: i.materialId, unitId: i.material.unitId, summary: `${i.quantity}× „${i.material.name}“ von ${i.helper.firstName} ${i.helper.lastName} zurückgenommen` });
}

export async function materialWarnings(ctx: Ctx) {
  if (!hasAnywhere(ctx, "material.view")) return [];
  const items = await listMaterials(ctx, { flagged: true });
  const label: Record<MaterialFlag, [string, "rot" | "gelb"]> = {
    MINDESTBESTAND: ["Mindestbestand unterschritten", "rot"], ABGELAUFEN: ["Abgelaufen", "rot"], ABLAUF_BALD: ["Läuft bald ab", "gelb"],
    WARTUNG_FAELLIG: ["Wartung überfällig", "rot"], WARTUNG_BALD: ["Wartung bald fällig", "gelb"], DEFEKT: ["Defekt", "rot"], IN_WARTUNG: ["In Wartung", "gelb"],
  };
  return items.flatMap((m) => m.flags.map((f) => ({ materialId: m.id, name: m.name, flag: f, level: label[f][1], text: `${label[f][0]}${f === "MINDESTBESTAND" ? ` (${m.available}/${m.minQuantity})` : f.startsWith("ABLAUF") && m.expiresAt ? ` (${daysUntil(m.expiresAt)} Tage)` : ""}` })));
}
