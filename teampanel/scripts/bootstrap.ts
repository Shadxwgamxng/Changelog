/**
 * Produktions-Setup ohne Demo-Daten:
 *   - legt Systemrollen und Teameinstellungen an
 *   - legt (falls INITIAL_SUPERADMIN_* gesetzt sind) den ersten Superadmin an
 * Aufruf: npm run db:bootstrap
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureBaseData } from "../prisma/base";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

async function main() {
  await ensureBaseData(db);
  console.log("✔ Systemrollen und Teameinstellungen sind vorhanden.");

  const email = process.env.INITIAL_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const username = process.env.INITIAL_SUPERADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.INITIAL_SUPERADMIN_PASSWORD;
  if (!email || !username || !password) {
    console.log("ℹ Kein INITIAL_SUPERADMIN_* gesetzt – es wurde kein Benutzer angelegt.");
    return;
  }
  if (password.length < 10) throw new Error("INITIAL_SUPERADMIN_PASSWORD muss mindestens 10 Zeichen lang sein.");
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("INITIAL_SUPERADMIN_USERNAME: 3–32 Zeichen (a–z, 0–9, . _ -).");

  const existing = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    console.log(`ℹ Benutzer ${existing.username} existiert bereits – nichts geändert.`);
    return;
  }
  const role = await db.role.findUniqueOrThrow({ where: { key: "SUPERADMIN" } });
  await db.user.create({
    data: {
      email,
      username,
      passwordHash: await hashPassword(password),
      roleId: role.id,
      profile: { create: { firstName: "Super", lastName: "Admin", callsign: username } },
    },
  });
  console.log(`✔ Superadmin ${username} (${email}) angelegt. Entferne INITIAL_SUPERADMIN_PASSWORD jetzt aus der .env.`);
}

main()
  .catch((err) => {
    console.error("✖", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
