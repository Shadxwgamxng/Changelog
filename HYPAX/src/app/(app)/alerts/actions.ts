"use server";
import { redirect } from "next/navigation";
import { action, formObject, json, str } from "@/server/action";
import * as A from "@/server/services/alerts";

export const createAlertAction = action(async (ctx, f) => { const r = await A.createAlert(ctx, formObject(f)); redirect(`/alerts/${r.alert.id}`); });
export const respondAction = action(async (ctx, f) => { await A.respondToAlert(ctx, str(f, "id"), str(f, "response") as "KOMME"); return "Rückmeldung gesendet."; });
export const endAlertAction = action(async (ctx, f) => { await A.endAlert(ctx, str(f, "id")); return "Alarmierung beendet."; });
export const setResponseAction = action(async (ctx, f) => { await A.setRecipientResponse(ctx, str(f, "id"), str(f, "helperId"), str(f, "response") as "KOMME"); });
export const saveGroupAction = action(async (ctx, f) => { await A.saveAlertGroup(ctx, { id: str(f, "id") || undefined, unitId: str(f, "unitId"), name: str(f, "name"), memberIds: f.getAll("memberIds[]").map(String) }); return "Alarmgruppe gespeichert."; });
export const deleteGroupAction = action(async (ctx, f) => { await A.deleteAlertGroup(ctx, str(f, "id")); return "Gelöscht."; });
void json;
