"use server";
import { redirect } from "next/navigation";
import { action, formObject, json, str } from "@/server/action";
import * as I from "@/server/services/incidents";

const payload = (f: FormData) => ({ ...formObject(f), helpers: json(f, "helpers", []).filter((h: { helperId?: string }) => h.helperId), vehicleIds: f.getAll("vehicleIds[]").map(String), materials: json(f, "materials", []).filter((m: { materialId?: string }) => m.materialId) });
export const createIncidentAction = action(async (ctx, f) => { const i = await I.createIncident(ctx, payload(f)); redirect(`/incidents/${i.id}`); });
export const updateIncidentAction = action(async (ctx, f) => { const id = str(f, "id"); await I.updateIncident(ctx, id, payload(f)); redirect(`/incidents/${id}`); });
export const deleteIncidentAction = action(async (ctx, f) => { await I.deleteIncident(ctx, str(f, "id")); redirect("/incidents"); });
