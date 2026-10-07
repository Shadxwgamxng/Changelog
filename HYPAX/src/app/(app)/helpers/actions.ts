"use server";
import { redirect } from "next/navigation";
import { action, checked, formObject, str } from "@/server/action";
import * as H from "@/server/services/helpers";
import * as Q from "@/server/services/qualifications";
import { createUser, adminResetPassword, setUserActive } from "@/server/services/users";

export const createHelperAction = action(async (ctx, f) => {
  const h = await H.createHelper(ctx, formObject(f));
  redirect(`/helpers/${h.id}`);
});
export const updateHelperAction = action(async (ctx, f) => {
  const id = str(f, "id");
  const o = formObject(f);
  delete o.id;
  // Felder, die der Benutzer nicht sehen darf, werden gar nicht erst gesendet → bleiben unverändert
  await H.updateHelper(ctx, id, o);
  redirect(`/helpers/${id}`);
});
export const updateOwnProfileAction = action(async (ctx, f) => { await H.updateOwnProfile(ctx, formObject(f)); return "Profil gespeichert."; });
export const statusAction = action(async (ctx, f) => { await H.deactivateLeaving(ctx, str(f, "id"), str(f, "status") as "AKTIV" | "PASSIV" | "INAKTIV" | "AUSGETRETEN"); return "Status geändert."; });
export const anonymizeAction = action(async (ctx, f) => {
  if (str(f, "confirm") !== "LÖSCHEN") throw new Error("Bitte tippe zur Bestätigung LÖSCHEN.");
  await H.anonymizeHelper(ctx, str(f, "id"));
  redirect("/helpers");
});

export const addQualAction = action(async (ctx, f) => { await Q.addHelperQualification(ctx, str(f, "helperId"), formObject(f)); return "Qualifikation gespeichert."; });
export const updateQualAction = action(async (ctx, f) => { const o = formObject(f); await Q.updateHelperQualification(ctx, str(f, "id"), { status: o.status, validUntil: o.validUntil, issuedAt: o.issuedAt, note: o.note }); return "Qualifikation aktualisiert."; });
export const removeQualAction = action(async (ctx, f) => { await Q.removeHelperQualification(ctx, str(f, "id")); return "Qualifikation entfernt."; });
export const approveQualAction = action(async (ctx, f) => { await Q.updateHelperQualification(ctx, str(f, "id"), { status: "GUELTIG" }); return "Qualifikation bestätigt."; });

export const createAccountAction = action(async (ctx, f) => {
  const r = await createUser(ctx, { email: str(f, "email"), helperId: str(f, "helperId"), password: str(f, "password") || undefined });
  return `Konto angelegt. ${r.initialPassword ? `Initialpasswort (einmalig sichtbar): ${r.initialPassword}` : "Das Passwort muss beim ersten Login geändert werden."}`;
});
export const resetPasswordAction = action(async (ctx, f) => `Neues Initialpasswort (einmalig sichtbar): ${await adminResetPassword(ctx, str(f, "userId"))}`);
export const toggleAccountAction = action(async (ctx, f) => { await setUserActive(ctx, str(f, "userId"), checked(f, "active")); return "Konto aktualisiert."; });
