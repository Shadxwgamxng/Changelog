// Initialisierung: Standardrollen und ein erster Superadministrator.
import { prisma } from "./db";
import { DEFAULT_ROLES } from "@/lib/permissions";
import { hashPassword, passwordProblems } from "@/lib/crypto";

/** Legt fehlende Systemrollen an. Bereits angepasste Rollen werden NICHT überschrieben. */
export async function ensureDefaultRoles() {
  for (const r of DEFAULT_ROLES) {
    await prisma.roleDefinition.upsert({
      where: { key: r.key },
      create: { key: r.key, name: r.name, description: r.description, rank: r.rank, permissions: r.permissions, system: true },
      update: {},
    });
  }
}

export async function ensureSuperadmin(email: string, password: string) {
  const problems = passwordProblems(password);
  if (problems.length) throw new Error(`Passwort unzureichend: ${problems.join(", ")}`);
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return existing;
  return prisma.user.create({ data: { email: email.toLowerCase(), passwordHash: await hashPassword(password), systemRole: "SUPERADMIN", mustChangePw: true } });
}

/** Globale Standard-Qualifikationsarten für DRK-Einheiten. */
export const DEFAULT_QUALIFICATIONS: { name: string; category: "AUSBILDUNG" | "LEHRGANG" | "FUEHRERSCHEIN" | "MEDIZIN" | "FUNK" | "SANITAET" | "FUEHRUNG" | "TECHNIK" | "SONDER"; months: number | null; covers?: string[] }[] = [
  { name: "Erste-Hilfe-Ausbildung", category: "AUSBILDUNG", months: 24 },
  { name: "Sanitätshelfer", category: "SANITAET", months: 24 },
  { name: "Rettungssanitäter", category: "MEDIZIN", months: 36, covers: ["Sanitätshelfer"] },
  { name: "Notfallsanitäter", category: "MEDIZIN", months: 36, covers: ["Rettungssanitäter", "Sanitätshelfer"] },
  { name: "Erste-Hilfe-Ausbilder", category: "AUSBILDUNG", months: 36 },
  { name: "Sprechfunk (BOS)", category: "FUNK", months: null },
  { name: "Führerschein Klasse B", category: "FUEHRERSCHEIN", months: null },
  { name: "Führerschein Klasse C1", category: "FUEHRERSCHEIN", months: null, covers: ["Führerschein Klasse B"] },
  { name: "Gruppenführer", category: "FUEHRUNG", months: null },
  { name: "Zugführer", category: "FUEHRUNG", months: null, covers: ["Gruppenführer"] },
  { name: "Einsatzleiter Sanitätsdienst", category: "FUEHRUNG", months: 36 },
  { name: "Motorsäge (Basis)", category: "TECHNIK", months: null },
  { name: "Rettungsschwimmer Silber", category: "SONDER", months: 36 },
];

export async function ensureDefaultQualifications() {
  const ids = new Map<string, string>();
  for (const q of DEFAULT_QUALIFICATIONS) {
    let t = await prisma.qualificationType.findFirst({ where: { unitId: null, name: q.name } });
    t ??= await prisma.qualificationType.create({ data: { name: q.name, category: q.category, validityMonths: q.months } });
    ids.set(q.name, t.id);
  }
  for (const q of DEFAULT_QUALIFICATIONS) {
    for (const c of q.covers ?? []) {
      await prisma.qualificationCover.upsert({
        where: { typeId_coversTypeId: { typeId: ids.get(q.name)!, coversTypeId: ids.get(c)! } },
        create: { typeId: ids.get(q.name)!, coversTypeId: ids.get(c)! }, update: {},
      });
    }
  }
  return ids;
}
