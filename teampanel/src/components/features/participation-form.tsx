"use client";

import { useState } from "react";
import { ActionForm, Checkbox, Field, FormActions, Input, SubmitButton } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";
import { ATTENDANCE_ICONS, ATTENDANCE_LABELS } from "@/lib/labels";
import { respondToEvent, setMemberAttendance } from "@/server/actions/events";
import type { AttendanceStatus } from "@prisma/client";

export interface ParticipationValues {
  status?: AttendanceStatus;
  needsRide?: boolean;
  canDrive?: boolean;
  freeSeats?: number | null;
  departureLocation?: string | null;
  comment?: string | null;
}

interface Props {
  eventId: string;
  /** Wenn gesetzt, pflegt die Teamleitung die Antwort dieses Mitglieds. */
  userId?: string;
  values?: ParticipationValues;
  disabled?: boolean;
  submitLabel?: string;
}

/** Antwort mit Mitfahrgelegenheit, Fahrerangaben und Kommentar. */
export function ParticipationForm({ eventId, userId, values = {}, disabled, submitLabel = "Antwort speichern" }: Props) {
  const [status, setStatus] = useState<AttendanceStatus>(values.status ?? "ACCEPTED");
  return (
    <ActionForm action={userId ? setMemberAttendance : respondToEvent}>
      <input type="hidden" name="eventId" value={eventId} />
      {userId && <input type="hidden" name="userId" value={userId} />}
      <fieldset disabled={disabled} className="space-y-4">
        <div role="radiogroup" aria-label="Teilnahme" className="grid grid-cols-3 gap-2">
          {(["ACCEPTED", "MAYBE", "DECLINED"] as const).map((s) => (
            <label
              key={s}
              className={cn(
                "flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-400",
                status === s ? (s === "ACCEPTED" ? "border-ok bg-ok/15 text-ok" : s === "MAYBE" ? "border-warn bg-warn/15 text-warn" : "border-danger bg-danger/15 text-danger") : "border-line bg-elevated hover:border-subtle",
              )}
            >
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="sr-only" />
              <span aria-hidden>{ATTENDANCE_ICONS[s]}</span>
              {ATTENDANCE_LABELS[s]}
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <Checkbox name="needsRide" label="Ich brauche eine Mitfahrgelegenheit" defaultChecked={values.needsRide} />
          <Checkbox name="canDrive" label="Ich kann fahren" defaultChecked={values.canDrive} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Freie Plätze" name="freeSeats" hint="Nur wenn du fährst.">
            <Input name="freeSeats" type="number" min={0} max={20} defaultValue={values.freeSeats ?? ""} />
          </Field>
          <Field label="Abfahrtsort" name="departureLocation">
            <Input name="departureLocation" defaultValue={values.departureLocation ?? ""} maxLength={120} placeholder="z. B. Neumünster" />
          </Field>
        </div>
        <Field label="Kommentar" name="comment">
          <Input name="comment" defaultValue={values.comment ?? ""} maxLength={300} placeholder="Optional" />
        </Field>
      </fieldset>
      <FormActions>
        <SubmitButton>{submitLabel}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
