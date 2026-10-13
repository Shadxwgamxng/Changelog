"use server";
import { redirect } from "next/navigation";
import { action, checked, formObject, str } from "@/server/action";
import * as C from "@/server/services/courses";

export const createCourseAction = action(async (ctx, f) => { const c = await C.createCourse(ctx, formObject(f)); redirect(`/courses/${c.id}`); });
export const updateCourseAction = action(async (ctx, f) => { const id = str(f, "id"); await C.updateCourse(ctx, id, formObject(f)); redirect(`/courses/${id}`); });
export const cancelCourseAction = action(async (ctx, f) => { await C.cancelCourse(ctx, str(f, "id")); return "Lehrgang abgesagt."; });
export const completeCourseAction = action(async (ctx, f) => { await C.completeCourse(ctx, str(f, "id")); return "Lehrgang abgeschlossen."; });
export const courseSignupAction = action(async (ctx, f) => {
  const s = await C.signUpForCourse(ctx, str(f, "id"), str(f, "note"));
  return s === "WARTELISTE" ? "Der Lehrgang ist voll – du stehst auf der Warteliste und rückst automatisch nach." : "Du bist angemeldet.";
});
export const courseWithdrawAction = action(async (ctx, f) => { await C.withdrawFromCourse(ctx, str(f, "id")); return "Du bist abgemeldet."; });
export const addParticipantAction = action(async (ctx, f) => { await C.addParticipant(ctx, str(f, "id"), str(f, "helperId"), checked(f, "override")); return "Teilnehmer angemeldet."; });
export const participantStatusAction = action(async (ctx, f) => { await C.setParticipantStatus(ctx, str(f, "participantId"), str(f, "status") as "ANGEMELDET" | "WARTELISTE" | "ABGEMELDET"); return "Gespeichert."; });
export const assessAction = action(async (ctx, f) => {
  const passed = str(f, "result") === "passed";
  await C.assessParticipant(ctx, str(f, "participantId"), passed, str(f, "note"));
  return passed ? "Bestanden – Qualifikation eingetragen, Zertifikat ausgestellt." : "Als nicht bestanden bewertet.";
});
export const revokeCertificateAction = action(async (ctx, f) => { await C.revokeCertificate(ctx, str(f, "certificateId"), str(f, "reason")); return "Zertifikat widerrufen."; });
