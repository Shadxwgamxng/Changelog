// Beim Start prüfen, ob die Produktionskonfiguration vollständig ist – lieber sofort scheitern als erst beim ersten Upload.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const problems: string[] = [];
  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL fehlt");
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key || Buffer.from(key, "base64").length !== 32) problems.push("APP_ENCRYPTION_KEY fehlt oder ist nicht 32 Byte (Base64)");
  if (!process.env.APP_URL) problems.push("APP_URL fehlt (Basis-URL für Links)");
  if (problems.length) {
    console.error(`\n[HelferNet] Ungültige Konfiguration:\n - ${problems.join("\n - ")}\nSiehe .env.example.\n`);
    throw new Error(`Ungültige Konfiguration: ${problems.join("; ")}`);
  }
}
