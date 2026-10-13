// Zertifikat-Vorlage: Platzhalter und einfache Formatierung (rein, ohne DB – gut testbar).
//
// Formatierung je Zeile:
//   # Text      → sehr groß, fett (z. B. Name)
//   ## Text     → groß, fett (z. B. Lehrgang)
//   ### Text    → fett
//   [[ … ]]     → Zeile erscheint nur, wenn alle Platzhalter darin einen Wert haben
//   Leerzeile   → Abstand

export const CERT_PLACEHOLDERS = {
  name: "Name des Teilnehmers",
  lehrgang: "Titel des Lehrgangs",
  qualifikation: "Vermittelte Qualifikation (leer, wenn keine)",
  zeitraum: "„am 03.10.2026“ bzw. „vom 03.10.2026 bis 04.10.2026“",
  von: "Beginn (Datum)",
  bis: "Ende (Datum)",
  gueltig_bis: "Gültig bis (leer, wenn unbegrenzt)",
  einheit: "Ausstellende Einheit",
  organisation: "Organisationsname aus der Vorlage (sonst Einheit)",
  nummer: "Zertifikatsnummer",
  ausgestellt_am: "Ausstellungsdatum",
  aussteller: "Wer das Zertifikat ausgestellt hat",
  lehrgangsleitung: "Lehrgangsleitung und Ausbilder",
} as const;
export type CertVars = Partial<Record<keyof typeof CERT_PLACEHOLDERS, string | null>>;

export const CERT_FONTS = { Helvetica: "Serifenlos (Helvetica)", Times: "Mit Serifen (Times)", Courier: "Schreibmaschine (Courier)" } as const;
export type CertFont = keyof typeof CERT_FONTS;

export const DEFAULT_CERT_TEMPLATE = {
  orgName: null as string | null,
  title: "Zertifikat",
  body: [
    "Hiermit wird bescheinigt, dass",
    "",
    "# {name}",
    "",
    "{zeitraum} erfolgreich am Lehrgang",
    "## „{lehrgang}“",
    "teilgenommen hat.",
    "",
    "[[Damit wurde die Qualifikation „{qualifikation}“ erworben.]]",
    "[[Gültig bis {gueltig_bis}]]",
  ].join("\n"),
  footerText: null as string | null,
  accentColor: "#f0500a",
  textColor: "#1d2430",
  font: "Helvetica" as CertFont,
  logoMode: "STANDARD" as "STANDARD" | "EIGENES" | "KEINES",
  showFrame: true,
  showQr: true,
  sig1Label: "Lehrgangsleitung",
  sig1Name: "{lehrgangsleitung}",
  sig2Label: "Ausgestellt durch",
  sig2Name: "{aussteller}",
};

export interface CertLine { style: "h1" | "h2" | "h3" | "text" | "gap"; text: string }

const PH = /\{([a-z_]+)\}/g;

/** Ersetzt Platzhalter. Unbekannte Platzhalter bleiben sichtbar stehen (damit Tippfehler auffallen). */
export function fillPlaceholders(text: string, vars: CertVars): string {
  return text.replace(PH, (m, key: string) => (key in CERT_PLACEHOLDERS ? vars[key as keyof CertVars] ?? "" : m));
}

/** Wandelt den Vorlagentext in formatierte Zeilen um. */
export function renderBody(body: string, vars: CertVars): CertLine[] {
  const out: CertLine[] = [];
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    let line = raw.trim();
    const cond = /^\[\[(.*)\]\]$/.exec(line);
    if (cond) {
      line = cond[1].trim();
      const keys = [...line.matchAll(PH)].map((m) => m[1]);
      if (keys.some((k) => k in CERT_PLACEHOLDERS && !vars[k as keyof CertVars])) continue;
    }
    if (!line) { out.push({ style: "gap", text: "" }); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const style = h ? (["h1", "h2", "h3"] as const)[h[1].length - 1] : "text";
    out.push({ style, text: fillPlaceholders(h ? h[2] : line, vars) });
  }
  // doppelte/abschließende Abstände entfernen
  return out.filter((l, i, a) => l.style !== "gap" || (i > 0 && a[i - 1].style !== "gap" && i < a.length - 1));
}

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

const day = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

export function certificateVars(c: { holderName: string; courseTitle: string; qualificationName: string | null; courseStartsAt: Date; courseEndsAt: Date; validUntil: Date | null; unitName: string; number: string; issuedAt: Date; issuedByName: string; instructors: string | null }, orgName?: string | null): CertVars {
  const von = day(c.courseStartsAt), bis = day(c.courseEndsAt);
  return {
    name: c.holderName, lehrgang: c.courseTitle, qualifikation: c.qualificationName, von, bis,
    zeitraum: von === bis ? `am ${von}` : `vom ${von} bis ${bis}`,
    gueltig_bis: c.validUntil ? day(c.validUntil) : null, einheit: c.unitName, organisation: orgName || c.unitName,
    nummer: c.number, ausgestellt_am: day(c.issuedAt), aussteller: c.issuedByName, lehrgangsleitung: c.instructors,
  };
}
