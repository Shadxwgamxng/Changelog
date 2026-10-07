// Demo-Lagekarte für „Sanitätsdienst Stadtfest“ (fiktive Anordnung am Vespucci-Strand, GTA-V-Karte; Einheiten = Karteneinheiten).
import type { PrismaClient } from "@prisma/client";

const C: [number, number] = [-197, 83];
const p = (dLat: number, dLng: number): [number, number] => [Math.round((C[0] + dLat * 1500) * 1e4) / 1e4, Math.round((C[1] + dLng * 1500) * 1e4) / 1e4];

export async function seedLagekarte(prisma: PrismaClient, shiftId: string, userId: string) {
  await prisma.shift.update({ where: { id: shiftId }, data: { mapLat: C[0], mapLng: C[1], mapZoom: 5 } });
  const o = (kind: "MARKER" | "LINE" | "AREA" | "TEXT", preset: string, coords: unknown, label?: string, extra: Record<string, unknown> = {}) =>
    ({ shiftId, kind, preset, coords: coords as never, label: label ?? null, createdById: userId, ...extra });
  await prisma.mapObject.createMany({
    data: [
      o("AREA", "veranstaltung", [p(0.0016, -0.0034), p(0.0016, 0.0034), p(-0.0016, 0.0034), p(-0.0016, -0.0034)], "Veranstaltungsfläche"),
      o("AREA", "gefahrenbereich", [p(0.0006, 0.0012), p(0.0006, 0.0022), p(-0.0001, 0.0022), p(-0.0001, 0.0012)], "Bühnenbereich gesperrt"),
      o("LINE", "rettungsweg", [p(0.0026, -0.0042), p(0.0008, -0.0034), p(0.0002, -0.0018), p(0.0001, -0.0008)], "Rettungsweg Nord"),
      o("LINE", "absperrung", [p(-0.0016, -0.0034), p(-0.0016, 0.0034)], "Absperrung Süd"),
      o("MARKER", "einsatzleitung", p(0.0002, -0.0005), "Einsatzleitung"),
      o("MARKER", "behandlungsplatz", p(-0.0004, -0.0016), "BHP"),
      o("MARKER", "sanitaetsstation", p(0.0009, 0.0004), "Sanitätsstation Mitte"),
      o("MARKER", "rtw", p(0.0001, -0.0027), "RTW 71/83-1"),
      o("MARKER", "ktw", p(-0.0002, -0.0031), "KTW 71/85-1"),
      o("MARKER", "elw", p(0.0006, -0.0021), "ELW"),
      o("MARKER", "gruppe", p(0.0003, 0.0018), "San-Gruppe 1"),
      o("MARKER", "sanitaeter", p(-0.0009, 0.0011), "Streife Ost"),
      o("MARKER", "patientenablage", p(-0.0007, -0.0010), "Patientenablage"),
      o("MARKER", "aed", p(0.0010, 0.0016), "AED Bühne"),
      o("MARKER", "aed", p(-0.0011, 0.0005), "AED Süd"),
      o("MARKER", "wc", p(0.0013, -0.0012)),
      o("MARKER", "wasser", p(-0.0012, 0.0024), "Trinkwasser"),
      o("MARKER", "zufahrt", p(0.0016, -0.0036), "Zufahrt RD"),
      o("MARKER", "hubschrauberlandeplatz", p(0.0024, 0.0031), "LP Hubschrauber"),
      o("TEXT", "text", p(0.0012, 0.0017), "Bühne"),
    ],
  });
}
