"use server";
import { redirect } from "next/navigation";
import { action, formObject, str } from "@/server/action";
import * as V from "@/server/services/vehicles";

export const createVehicleAction = action(async (ctx, f) => { const v = await V.createVehicle(ctx, formObject(f)); redirect(`/vehicles/${v.id}`); });
export const updateVehicleAction = action(async (ctx, f) => { const id = str(f, "id"); const o = formObject(f); delete o.id; await V.updateVehicle(ctx, id, o); return "Gespeichert."; });
export const maintenanceAction = action(async (ctx, f) => {
  await V.addMaintenance(ctx, str(f, "id"), { date: str(f, "date"), description: str(f, "description"), odometerKm: str(f, "odometerKm") ? Number(str(f, "odometerKm")) : null, cost: str(f, "cost") ? Number(str(f, "cost").replace(",", ".")) : null, nextDue: str(f, "nextDue") || null });
  return "Wartung eingetragen.";
});
export const deleteVehicleAction = action(async (ctx, f) => { await V.deleteVehicle(ctx, str(f, "id")); redirect("/vehicles"); });
