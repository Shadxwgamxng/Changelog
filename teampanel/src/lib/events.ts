import type { EventStatus } from "@prisma/client";
import { fmtDateTime } from "./dates";

interface EventLike {
  status: EventStatus;
  startsAt: Date;
  endsAt: Date | null;
  maxParticipants: number | null;
  registrationDeadline: Date | null;
}

const DEFAULT_DURATION_MS = 12 * 3_600_000;

export function eventEnd(e: Pick<EventLike, "startsAt" | "endsAt">): Date {
  return e.endsAt ?? new Date(e.startsAt.getTime() + DEFAULT_DURATION_MS);
}

/** Angezeigter Status: berücksichtigt Teilnehmerlimit und vergangene Termine. */
export function effectiveStatus(e: EventLike, accepted: number, now = new Date()): EventStatus {
  if (e.status === "CANCELLED") return "CANCELLED";
  if (e.status === "COMPLETED" || eventEnd(e) < now) return "COMPLETED";
  if (e.status === "FULL") return "FULL";
  if (e.status === "OPEN" && e.maxParticipants !== null && accepted >= e.maxParticipants) return "FULL";
  return e.status;
}

export interface RegistrationState {
  open: boolean;
  /** Warum keine Anmeldung möglich ist (für Anzeige). */
  reason?: string;
  /** Zusagen sind nicht mehr möglich (z. B. voll), Absage/Vielleicht aber schon. */
  acceptBlocked?: string;
}

export function registrationState(e: EventLike, accepted: number, now = new Date()): RegistrationState {
  const status = effectiveStatus(e, accepted, now);
  if (status === "CANCELLED") return { open: false, reason: "Dieser Termin wurde abgesagt." };
  if (status === "COMPLETED") return { open: false, reason: "Dieser Termin ist bereits abgeschlossen." };
  if (status === "PLANNED") return { open: false, reason: "Die Anmeldung ist noch nicht geöffnet." };
  if (e.registrationDeadline && e.registrationDeadline < now) {
    return { open: false, reason: `Die Anmeldefrist ist am ${fmtDateTime(e.registrationDeadline)} abgelaufen.` };
  }
  if (status === "FULL") return { open: true, acceptBlocked: "Der Termin ist voll – Zusagen sind nicht mehr möglich." };
  return { open: true };
}
