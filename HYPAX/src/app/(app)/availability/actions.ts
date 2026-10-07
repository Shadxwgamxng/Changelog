"use server";
import { action, formObject, str } from "@/server/action";
import { clearAvailability, setAvailability } from "@/server/services/availability";
import { parseDateOnly } from "@/lib/dates";
import { badRequest } from "@/server/errors";

export const setAvailabilityAction = action(async (ctx, f) => {
  const helperId = str(f, "helperId") || ctx.helperId;
  if (!helperId) throw badRequest("Kein Helferprofil verknüpft.");
  const o = formObject(f);
  await setAvailability(ctx, helperId, { startDate: o.startDate, endDate: o.endDate || o.startDate, status: o.status, reason: o.reason || null, note: o.note || null });
  return "Verfügbarkeit gespeichert.";
});

export const clearAvailabilityAction = action(async (ctx, f) => {
  const helperId = str(f, "helperId") || ctx.helperId;
  if (!helperId) throw badRequest("Kein Helferprofil verknüpft.");
  const s = parseDateOnly(str(f, "startDate")), e = parseDateOnly(str(f, "endDate") || str(f, "startDate"));
  if (!s || !e) throw badRequest("Ungültiges Datum.");
  await clearAvailability(ctx, helperId, s, e);
  return "Zurückgesetzt auf „Keine Angabe“.";
});
