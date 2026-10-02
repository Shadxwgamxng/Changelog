import type { PrismaClient } from "@prisma/client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_RANK } from "../src/lib/permissions";

/** Stammdaten, ohne die die Anwendung nicht laufen kann (Systemrollen, Teameinstellungen). Idempotent. */
export async function ensureBaseData(db: PrismaClient) {
  for (const key of Object.keys(ROLE_RANK) as (keyof typeof ROLE_RANK)[]) {
    await db.role.upsert({
      where: { key },
      create: { key, name: ROLE_LABELS[key], description: ROLE_DESCRIPTIONS[key], rank: ROLE_RANK[key] },
      update: { name: ROLE_LABELS[key], description: ROLE_DESCRIPTIONS[key] },
    });
  }
  await db.teamSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: "Schleswig-Holstein Airsoft Kommando",
      shortName: "SAK",
      motto: "Wind von vorn",
      location: "Schleswig-Holstein",
    },
    update: {},
  });
}
