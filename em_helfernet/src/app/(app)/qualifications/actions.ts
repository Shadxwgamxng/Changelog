"use server";
import { action, formObject, str } from "@/server/action";
import * as Q from "@/server/services/qualifications";

export const createTypeAction = action(async (ctx, f) => { const o = formObject(f); await Q.createQualType(ctx, { ...o, unitId: o.unitId || null, covers: f.getAll("covers[]").map(String) }); return "Qualifikationsart angelegt."; });
export const updateTypeAction = action(async (ctx, f) => { const o = formObject(f); await Q.updateQualType(ctx, str(f, "id"), { ...o, covers: f.getAll("covers[]").map(String) }); return "Gespeichert."; });
export const archiveTypeAction = action(async (ctx, f) => { await Q.archiveQualType(ctx, str(f, "id")); return "Archiviert."; });
