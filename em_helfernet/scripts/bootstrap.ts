// Erstinstallation: Standardrollen, Standard-Qualifikationen und ersten Superadministrator anlegen.
//   npm run bootstrap -- admin@example.org "Sicheres#Passwort1"
import "dotenv/config";
import { ensureDefaultQualifications, ensureDefaultRoles, ensureSuperadmin } from "../src/server/bootstrap";
import { prisma } from "../src/server/db";

async function main() {
  const [email, password] = process.argv.slice(2);
  await ensureDefaultRoles();
  await ensureDefaultQualifications();
  console.log("Standardrollen und Qualifikationsarten sind angelegt.");
  if (email && password) {
    await ensureSuperadmin(email, password);
    console.log(`Superadministrator ${email} ist angelegt (Passwortwechsel beim ersten Login erforderlich).`);
  } else console.log('Tipp: npm run bootstrap -- admin@example.org "Passwort"  legt zusätzlich den ersten Superadmin an.');
}
main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
