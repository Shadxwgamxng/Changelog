// Ersteinrichtung im Browser: legt – nur solange noch kein Benutzer existiert – die oberste Einheit und den ersten Superadministrator an.
import type { UnitType } from "@prisma/client";
import { prisma } from "./db";
import { audit } from "./audit";
import { badRequest, forbidden } from "./errors";
import { ensureDefaultQualifications, ensureDefaultRoles } from "./bootstrap";
import { invalidateUnits } from "./units";
import { hashPassword, passwordProblems, safeEqual } from "@/lib/crypto";
import { UNIT_TYPE_LABEL } from "@/lib/constants";

export async function needsSetup(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}

/** Ist ein Einrichtungs-Code (SETUP_TOKEN) gesetzt, muss er angegeben werden. */
export const setupTokenRequired = () => Boolean(process.env.SETUP_TOKEN?.trim());

export interface SetupInput { token?: string; orgName: string; unitType: string; email: string; password: string; password2: string }

export async function runSetup(input: SetupInput): Promise<{ userId: string }> {
  const expected = process.env.SETUP_TOKEN?.trim();
  if (expected && !safeEqual(String(input.token ?? "").trim(), expected)) throw forbidden("Der Einrichtungs-Code ist falsch.");
  const orgName = input.orgName.trim();
  const email = input.email.trim().toLowerCase();
  if (!orgName) throw badRequest("Bitte gib den Namen deiner Organisation an.");
  if (!(input.unitType in UNIT_TYPE_LABEL)) throw badRequest("Unbekannte Art der Einheit.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("Bitte gib eine gültige E-Mail-Adresse an.");
  if (input.password !== input.password2) throw badRequest("Die Passwörter stimmen nicht überein.");
  const problems = passwordProblems(input.password);
  if (problems.length) throw badRequest(`Passwort unzureichend: ${problems.join(", ")}.`);

  await ensureDefaultRoles();
  await ensureDefaultQualifications();
  const passwordHash = await hashPassword(input.password);
  const result = await prisma.$transaction(async (tx) => {
    // Sperre gegen gleichzeitige Einrichtung; danach erneut prüfen, ob schon jemand schneller war.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(724110)`;
    if ((await tx.user.count()) > 0) throw forbidden("HelferNet ist bereits eingerichtet.");
    const u = await tx.orgUnit.create({ data: { name: orgName, type: input.unitType as UnitType, path: `__tmp__${Math.random()}` } });
    const unit = await tx.orgUnit.update({ where: { id: u.id }, data: { path: `/${u.id}/` } });
    const user = await tx.user.create({ data: { email, passwordHash, systemRole: "SUPERADMIN" } });
    const actor = { userId: user.id, email, ip: undefined };
    await audit(actor, { action: "setup.complete", entityType: "OrgUnit", entityId: unit.id, unitId: unit.id, summary: `Ersteinrichtung: Einheit „${orgName}“ und Superadministrator angelegt` }, tx);
    return { userId: user.id };
  });
  invalidateUnits();
  return result;
}
