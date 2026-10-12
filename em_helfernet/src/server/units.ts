// Einheitenbaum mit kurzem In-Memory-Cache (Einheiten ändern sich selten).
import { prisma } from "./db";

export interface UnitInfo { id: string; name: string; type: string; parentId: string | null; path: string; active: boolean }

let cache: { at: number; map: Map<string, UnitInfo> } | null = null;
const TTL = 10_000;

export async function loadUnits(force = false): Promise<Map<string, UnitInfo>> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.map;
  const rows = await prisma.orgUnit.findMany({ select: { id: true, name: true, type: true, parentId: true, path: true, active: true } });
  const map = new Map(rows.map((r) => [r.id, r as UnitInfo]));
  cache = { at: Date.now(), map };
  return map;
}
export const invalidateUnits = () => { cache = null; };

export async function unitInfo(id: string): Promise<UnitInfo | null> {
  return (await loadUnits()).get(id) ?? (await loadUnits(true)).get(id) ?? null;
}
