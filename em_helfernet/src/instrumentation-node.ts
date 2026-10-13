// Startaufgaben im Node-Server (nicht im Edge-Build): Konfiguration prüfen, Zertifikate nachtragen.
export async function registerNode() {
  if (process.env.NODE_ENV !== "production") return;
  const problems: string[] = [];
  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL fehlt");
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key || Buffer.from(key, "base64").length !== 32) problems.push("APP_ENCRYPTION_KEY fehlt oder ist nicht 32 Byte (Base64)");
  if (!process.env.APP_URL) problems.push("APP_URL fehlt (Basis-URL für Links)");
  if (problems.length) {
    console.error(`\n[HelferNet] Ungültige Konfiguration:\n - ${problems.join("\n - ")}\nSiehe .env.example.\n`);
    throw new Error(`Ungültige Konfiguration: ${problems.join("; ")}`);
  }
  // Zertifikate aus früheren Versionen als Dokument in die Personalakte übernehmen (im Hintergrund)
  setTimeout(() => {
    import("./server/services/certificate-documents")
      .then((m) => m.backfillCertificateDocuments())
      .then((n) => { if (n) console.log(`[HelferNet] ${n} Zertifikat(e) in Personalakten abgelegt.`); })
      .catch((e) => console.error("[HelferNet] Zertifikat-Nachtrag fehlgeschlagen:", e));
  }, 5_000);
}
