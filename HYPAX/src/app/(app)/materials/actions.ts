"use server";
import { redirect } from "next/navigation";
import { action, formObject, str } from "@/server/action";
import * as M from "@/server/services/materials";

export const createMaterialAction = action(async (ctx, f) => { const m = await M.createMaterial(ctx, formObject(f)); redirect(`/materials/${m.id}`); });
export const updateMaterialAction = action(async (ctx, f) => { const id = str(f, "id"); const o = formObject(f); delete o.id; await M.updateMaterial(ctx, id, o); return "Gespeichert."; });
export const issueAction = action(async (ctx, f) => { await M.issueMaterial(ctx, str(f, "id"), str(f, "helperId"), Number(str(f, "quantity") || 1), str(f, "note") || null); return "Ausgegeben."; });
export const returnAction = action(async (ctx, f) => { await M.returnMaterial(ctx, str(f, "issueId")); return "Zurückgenommen."; });
export const deleteMaterialAction = action(async (ctx, f) => { await M.deleteMaterial(ctx, str(f, "id")); redirect("/materials"); });
