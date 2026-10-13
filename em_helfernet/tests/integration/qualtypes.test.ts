import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { archiveQualType, createQualType, restoreQualType, updateQualType } from "../../src/server/services/qualifications";

let S: Awaited<ReturnType<typeof scenario>>;
beforeEach(async () => { S = await scenario(); });
const rejects = (p: Promise<unknown>, status: number, msg?: RegExp) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status && (!msg || msg.test(e.message)));

test("Qualifikationsarten: keine Dubletten (Groß-/Kleinschreibung, Leerzeichen), Umbenennen, Archivieren und Wiederherstellen", async () => {
  await rejects(createQualType(S.adminCtx, { name: "  sanitätshelfer ", category: "SANITAET" }), 409, /gibt es bereits/);
  const t = await createQualType(S.adminCtx, { name: "Atemschutz   Grundlehrgang", category: "AUSBILDUNG", validityMonths: "24" });
  assert.equal(t.name, "Atemschutz Grundlehrgang");
  await rejects(updateQualType(S.adminCtx, t.id, { name: "SANITÄTSHELFER", category: "AUSBILDUNG" }), 409);
  await updateQualType(S.adminCtx, t.id, { name: "Atemschutz-Grundlehrgang", category: "AUSBILDUNG", validityMonths: "36" });
  assert.equal((await prisma.qualificationType.findUniqueOrThrow({ where: { id: t.id } })).validityMonths, 36);
  await archiveQualType(S.adminCtx, t.id);
  await rejects(createQualType(S.adminCtx, { name: "atemschutz-grundlehrgang", category: "AUSBILDUNG" }), 409, /archiviert/);
  await restoreQualType(S.adminCtx, t.id);
  assert.equal((await prisma.qualificationType.findUniqueOrThrow({ where: { id: t.id } })).active, true);
});
