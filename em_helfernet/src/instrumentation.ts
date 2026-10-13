// Beim Start prüfen, ob die Produktionskonfiguration vollständig ist – lieber sofort scheitern als erst beim ersten Upload.
export async function register() {
  // Node-spezifische Startaufgaben getrennt laden, damit sie nicht in den Edge-Build geraten.
  if (process.env.NEXT_RUNTIME === "nodejs") await (await import("./instrumentation-node")).registerNode();
}
