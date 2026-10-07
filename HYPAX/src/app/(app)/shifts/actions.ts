"use server";
import { redirect } from "next/navigation";
import { action, checked, formObject, json, str } from "@/server/action";
import * as S from "@/server/services/shifts";
import { prisma } from "@/server/db";

export const createShiftAction = action(async (ctx, form) => {
  const o = formObject(form);
  const shift = await S.createShift(ctx, { ...o, requirements: json(form, "requirements", []) });
  redirect(`/shifts/${shift.id}`);
});

export const updateShiftAction = action(async (ctx, form) => {
  const id = str(form, "id");
  const o = formObject(form);
  await S.updateShift(ctx, id, { ...o, requirements: json(form, "requirements", []) });
  redirect(`/shifts/${id}`);
});

export const publishAction = action(async (ctx, f) => { await S.publishShift(ctx, str(f, "id")); return "Dienst veröffentlicht – berechtigte Helfer wurden benachrichtigt."; });
export const cancelAction = action(async (ctx, f) => { await S.cancelShift(ctx, str(f, "id"), str(f, "reason") || undefined); return "Dienst abgesagt, Besatzung benachrichtigt."; });
export const deleteDraftAction = action(async (ctx, f) => { await S.deleteShift(ctx, str(f, "id")); redirect("/shifts"); });
export const completeAction = action(async (ctx, f) => {
  const minutes: Record<string, number> = {};
  for (const [k, v] of f.entries()) if (k.startsWith("min:") && String(v).trim() !== "") minutes[k.slice(4)] = Math.round(Number(v) * 60);
  await S.completeShift(ctx, str(f, "id"), minutes);
  return "Dienst abgeschlossen – Stunden wurden gebucht.";
});

export const signUpAction = action(async (ctx, f) => {
  const r = await S.signUpForShift(ctx, str(f, "id"), str(f, "note") || null);
  return r.warnings.length ? `Deine Anfrage wurde an den Dienstplaner übermittelt. Hinweis: ${r.warnings.join("; ")}` : "Deine Anfrage wurde an den Dienstplaner übermittelt.";
});
export const withdrawAction = action(async (ctx, f) => { await S.withdrawFromShift(ctx, str(f, "id"), str(f, "reason") || null); return "Abgesagt. Die Planer wurden informiert."; });
export const respondInviteAction = action(async (ctx, f) => { await S.respondToInvitation(ctx, str(f, "id"), str(f, "accept") === "1"); return str(f, "accept") === "1" ? "Zugesagt – danke!" : "Abgesagt."; });

export const decideAction = action(async (ctx, f) => {
  const d = str(f, "decision") as "CONFIRM" | "REJECT" | "WAITLIST";
  await S.decideAssignment(ctx, str(f, "assignmentId"), d, { requirementId: str(f, "requirementId") || null, override: checked(f, "override") });
  return d === "CONFIRM" ? "Bestätigt." : d === "REJECT" ? "Abgelehnt." : "Auf die Warteliste gesetzt.";
});
export const removeCrewAction = action(async (ctx, f) => { await S.removeFromShift(ctx, str(f, "assignmentId")); return "Entfernt."; });
export const assignAction = action(async (ctx, f) => {
  await S.assignHelper(ctx, str(f, "shiftId"), str(f, "helperId"), { requirementId: str(f, "requirementId") || null, override: checked(f, "override"), mode: str(f, "mode") === "EINLADEN" ? "EINLADEN" : "EINTEILEN" });
  return "Eingeteilt.";
});
export const applyRecommendationAction = action(async (ctx, f) => {
  const picks = json<{ requirementId: string; helperId: string }[]>(f, "picks", []);
  const r = await S.applyRecommendation(ctx, str(f, "shiftId"), picks, str(f, "mode") === "EINLADEN" ? "EINLADEN" : "EINTEILEN");
  return `${r.applied.length} Helfer eingeteilt${r.skipped.length ? `, ${r.skipped.length} übersprungen (${r.skipped[0].reason})` : ""}.`;
});
export const setHoursAction = action(async (ctx, f) => { await S.setWorkedMinutes(ctx, str(f, "assignmentId"), Math.round(Number(str(f, "hours").replace(",", ".")) * 60)); return "Dienstzeit gespeichert."; });

export const resourcesAction = action(async (ctx, f) => {
  const vehicleIds = f.getAll("vehicleIds[]").map(String);
  const materials = json<{ materialId: string; quantity: number }[]>(f, "materials", []).filter((m) => m.materialId);
  await S.setShiftResources(ctx, str(f, "id"), { vehicleIds, materials });
  return "Fahrzeuge und Material gespeichert.";
});
void prisma;
