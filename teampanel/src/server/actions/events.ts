"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionPermission, actionUser } from "@/lib/auth";
import { audit, actorLabel } from "@/lib/audit";
import { can, canDeleteEvent, canEditEvent } from "@/lib/permissions";
import { registrationState } from "@/lib/events";
import { fmtDate } from "@/lib/dates";
import { shortName } from "@/lib/labels";
import { formToObject, toArray, zBool, zDateTime, zId, zOptDateTime, zOptEuro, zOptInt, zOptStr, zOptText, zOptUrl, zStr } from "@/lib/validation";
import { notifyAllActive, notifyUsers } from "../notifications";

const eventSchema = z
  .object({
    title: zStr("Titel", 120),
    type: z.enum(["SPIELTAG", "TRAINING", "BESPRECHUNG", "SONSTIGES"]),
    status: z.enum(["PLANNED", "OPEN", "FULL", "COMPLETED", "CANCELLED"]),
    startsAt: zDateTime("Beginn"),
    endsAt: zOptDateTime("Ende"),
    location: zStr("Veranstaltungsort", 160),
    address: zOptStr("Adresse", 250),
    mapsUrl: zOptUrl("Google-Maps-Link"),
    organizer: zOptStr("Veranstalter", 120),
    description: zOptText("Beschreibung", 5000),
    meetingPoint: zOptStr("Treffpunkt", 200),
    departureAt: zOptDateTime("Abfahrtszeit"),
    cost: zOptEuro("Kosten"),
    registrationDeadline: zOptDateTime("Anmeldefrist"),
    maxParticipants: zOptInt("Max. Teilnehmer", 1, 1000),
  })
  .refine((v) => !v.endsAt || v.endsAt >= v.startsAt, { message: "Das Ende muss nach dem Beginn liegen.", path: ["endsAt"] })
  .refine((v) => !v.registrationDeadline || v.registrationDeadline <= v.startsAt, { message: "Die Anmeldefrist muss vor dem Beginn liegen.", path: ["registrationDeadline"] });

function eventData(input: z.infer<typeof eventSchema>) {
  return {
    title: input.title,
    type: input.type,
    status: input.status,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    location: input.location,
    address: input.address ?? null,
    mapsUrl: input.mapsUrl ?? null,
    organizer: input.organizer ?? null,
    description: input.description ?? null,
    meetingPoint: input.meetingPoint ?? null,
    departureAt: input.departureAt ?? null,
    costCents: input.cost ?? null,
    registrationDeadline: input.registrationDeadline ?? null,
    maxParticipants: input.maxParticipants ?? null,
  };
}

async function validEquipmentIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.equipment.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return rows.map((r) => r.id);
}

function refresh(id?: string) {
  revalidatePath("/events");
  revalidatePath("/calendar");
  revalidatePath("/");
  if (id) revalidatePath(`/events/${id}`);
}

export async function createEvent(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return run("Der Termin konnte nicht erstellt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("events.create");
    const raw = formToObject(formData);
    const input = eventSchema.parse(raw);
    const equipmentIds = await validEquipmentIds(toArray(raw.equipmentIds));
    const event = await db.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: { ...eventData(input), createdById: actor.id, equipment: { create: equipmentIds.map((equipmentId) => ({ equipmentId })) } },
      });
      await audit(actor, { action: "event.create", targetType: "Event", targetId: created.id, targetLabel: created.title, message: `${actorLabel(actor)} hat den Termin „${created.title}“ am ${fmtDate(created.startsAt)} erstellt.` }, tx);
      await notifyAllActive({ type: "EVENT_CREATED", title: `Neuer Termin: ${created.title} am ${fmtDate(created.startsAt)}.`, href: `/events/${created.id}` }, actor.id, tx);
      return created;
    });
    refresh();
    return ok("Termin erstellt.", { id: event.id });
  });
}

export async function updateEvent(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return run("Der Termin konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    const id = zId.parse(formData.get("id"));
    const existing = await db.event.findUnique({ where: { id }, include: { attendances: { select: { userId: true, status: true } } } });
    if (!existing) throw new ActionError("Dieser Termin wurde nicht gefunden.");
    if (!canEditEvent(actor, existing)) throw new ActionError("Diesen Termin darfst du nicht bearbeiten.");
    const raw = formToObject(formData);
    const input = eventSchema.parse(raw);
    const equipmentIds = await validEquipmentIds(toArray(raw.equipmentIds));

    const accepted = existing.attendances.filter((a) => a.status === "ACCEPTED").length;
    if (input.maxParticipants && input.maxParticipants < accepted && input.status === "OPEN") {
      throw new ActionError(`Es gibt bereits ${accepted} Zusagen – das Limit kann nicht darunter liegen.`, { maxParticipants: `Mindestens ${accepted}.` });
    }

    await db.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: eventData(input) });
      await tx.eventEquipment.deleteMany({ where: { eventId: id } });
      if (equipmentIds.length) await tx.eventEquipment.createMany({ data: equipmentIds.map((equipmentId) => ({ eventId: id, equipmentId })) });
      await audit(actor, { action: "event.update", targetType: "Event", targetId: id, targetLabel: input.title, message: `${actorLabel(actor)} hat den Termin „${input.title}“ bearbeitet.` }, tx);
      if (input.status === "CANCELLED" && existing.status !== "CANCELLED") {
        const ids = existing.attendances.filter((a) => a.status !== "DECLINED").map((a) => a.userId);
        await notifyUsers(ids, { type: "EVENT_CANCELLED", title: `Abgesagt: ${input.title} am ${fmtDate(input.startsAt)}.`, href: `/events/${id}` }, tx);
      }
    });
    refresh(id);
    return ok("Termin gespeichert.", { id });
  });
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  return run("Der Termin konnte nicht gelöscht werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("events.deleteAny");
    if (!canDeleteEvent(actor)) throw new ActionError("Diesen Termin darfst du nicht löschen.");
    const existing = await db.event.findUnique({ where: { id } });
    if (!existing) throw new ActionError("Dieser Termin existiert nicht mehr.");
    await db.$transaction(async (tx) => {
      await tx.event.delete({ where: { id } });
      await audit(actor, { action: "event.delete", targetType: "Event", targetId: id, targetLabel: existing.title, message: `${actorLabel(actor)} hat den Termin „${existing.title}“ gelöscht.` }, tx);
    });
    refresh();
    return ok("Termin gelöscht.");
  });
}

// ── Teilnahme ──────────────────────────────────────────────

const attendanceSchema = z.object({
  eventId: zId,
  status: z.enum(["ACCEPTED", "DECLINED", "MAYBE"], { errorMap: () => ({ message: "Bitte wähle Zusage, Absage oder Vielleicht." }) }),
  needsRide: zBool,
  canDrive: zBool,
  freeSeats: zOptInt("Freie Plätze", 0, 20),
  departureLocation: zOptStr("Abfahrtsort", 120),
  comment: zOptStr("Kommentar", 300),
});

async function writeAttendance(opts: {
  eventId: string;
  userId: string;
  status: "ACCEPTED" | "DECLINED" | "MAYBE";
  extras?: { needsRide: boolean; canDrive: boolean; freeSeats?: number; departureLocation?: string; comment?: string };
  bypassRules: boolean;
}) {
  const event = await db.event.findUnique({ where: { id: opts.eventId }, include: { attendances: { select: { userId: true, status: true } } } });
  if (!event) throw new ActionError("Dieser Termin wurde nicht gefunden.");
  const accepted = event.attendances.filter((a) => a.status === "ACCEPTED").length;
  const alreadyAccepted = event.attendances.some((a) => a.userId === opts.userId && a.status === "ACCEPTED");
  if (!opts.bypassRules) {
    const state = registrationState(event, accepted);
    if (!state.open) throw new ActionError(state.reason ?? "Für diesen Termin ist keine Anmeldung möglich.");
    if (opts.status === "ACCEPTED" && !alreadyAccepted && state.acceptBlocked) throw new ActionError(state.acceptBlocked);
  }
  if (opts.status === "ACCEPTED" && !alreadyAccepted && event.maxParticipants !== null && accepted >= event.maxParticipants && !opts.bypassRules) {
    throw new ActionError("Der Termin ist voll – Zusagen sind nicht mehr möglich.");
  }
  const x = opts.extras;
  const rideData = x
    ? { needsRide: x.needsRide, canDrive: x.canDrive, freeSeats: x.canDrive ? (x.freeSeats ?? null) : null, departureLocation: x.departureLocation ?? null, comment: x.comment ?? null }
    : {};
  await db.eventAttendance.upsert({
    where: { eventId_userId: { eventId: opts.eventId, userId: opts.userId } },
    create: { eventId: opts.eventId, userId: opts.userId, status: opts.status, ...rideData },
    update: { status: opts.status, ...rideData },
  });
  return event;
}

/** Schnelle Zu-/Absage ohne Zusatzangaben (Dashboard, Handy). */
export async function quickRespond(eventId: string, status: "ACCEPTED" | "DECLINED" | "MAYBE"): Promise<ActionResult> {
  return run("Deine Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const parsed = attendanceSchema.pick({ eventId: true, status: true }).parse({ eventId, status });
    await writeAttendance({ eventId: parsed.eventId, userId: me.id, status: parsed.status, bypassRules: false });
    refresh(eventId);
    return ok(status === "ACCEPTED" ? "Zusage gespeichert. Bis dahin!" : status === "DECLINED" ? "Absage gespeichert." : "Als „Vielleicht“ gespeichert.");
  });
}

/** Antwort inkl. Mitfahrgelegenheit und Kommentar. */
export async function respondToEvent(formData: FormData): Promise<ActionResult> {
  return run("Deine Antwort konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const input = attendanceSchema.parse(formToObject(formData));
    await writeAttendance({ eventId: input.eventId, userId: me.id, status: input.status, extras: input, bypassRules: false });
    refresh(input.eventId);
    return ok("Antwort gespeichert.");
  });
}

/** Teamleitung/Admin pflegt die Antwort eines anderen Mitglieds. */
export async function setMemberAttendance(formData: FormData): Promise<ActionResult> {
  return run("Die Anwesenheit konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("attendance.manage");
    const userId = zId.parse(formData.get("userId"));
    const input = attendanceSchema.parse(formToObject(formData));
    const target = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!target?.profile) throw new ActionError("Dieses Mitglied wurde nicht gefunden.");
    const event = await writeAttendance({ eventId: input.eventId, userId, status: input.status, extras: input, bypassRules: true });
    await audit(actor, { action: "attendance.set", targetType: "Event", targetId: event.id, targetLabel: event.title, message: `${actorLabel(actor)} hat die Teilnahme von ${shortName(target.profile)} an „${event.title}“ auf ${input.status === "ACCEPTED" ? "Zusage" : input.status === "DECLINED" ? "Absage" : "Vielleicht"} gesetzt.` });
    refresh(event.id);
    return ok("Teilnahme gespeichert.");
  });
}

export async function removeAttendance(eventId: string, userId: string): Promise<ActionResult> {
  return run("Die Antwort konnte nicht entfernt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionUser();
    const isSelf = actor.id === userId;
    if (!isSelf && !can(actor, "attendance.manage")) throw new ActionError("Dafür fehlt dir die Berechtigung.");
    if (isSelf && !can(actor, "attendance.manage")) {
      const event = await db.event.findUnique({ where: { id: eventId }, include: { attendances: { select: { status: true } } } });
      if (!event) throw new ActionError("Dieser Termin wurde nicht gefunden.");
      const state = registrationState(event, event.attendances.filter((a) => a.status === "ACCEPTED").length);
      if (!state.open) throw new ActionError(state.reason ?? "Die Anmeldung ist geschlossen.");
    }
    await db.eventAttendance.deleteMany({ where: { eventId, userId } });
    refresh(eventId);
    return ok("Antwort entfernt.");
  });
}

