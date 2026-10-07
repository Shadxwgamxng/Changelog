// Täglicher Wartungslauf (Ablaufwarnungen, Löschkonzept). Per Cron: 0 3 * * *  npm run maintenance
import "dotenv/config";
import { runMaintenance } from "../src/server/services/maintenance";
import { prisma } from "../src/server/db";

runMaintenance().then((r) => console.log("Wartungslauf abgeschlossen:", r)).catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
