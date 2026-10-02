"use client";

import { Pencil, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { ModalTrigger } from "@/components/ui/modal";
import { removeAttendance } from "@/server/actions/events";
import { ParticipationForm, type ParticipationValues } from "./participation-form";

interface Props {
  eventId: string;
  userId: string;
  name: string;
  values?: ParticipationValues;
  hasResponse: boolean;
}

/** Teamleitung/Admin: Antwort eines Mitglieds setzen, ändern oder entfernen. */
export function AttendanceAdminActions({ eventId, userId, name, values, hasResponse }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      <ModalTrigger variant="ghost" size="sm" label={<><Pencil className="h-3.5 w-3.5" /> {hasResponse ? "Ändern" : "Eintragen"}</>} title={`Teilnahme: ${name}`} description="Als Teamleitung kannst du die Antwort auch nach Anmeldeschluss pflegen." ariaLabel={`Teilnahme von ${name} bearbeiten`}>
        <ParticipationForm eventId={eventId} userId={userId} values={values} />
      </ModalTrigger>
      {hasResponse && (
        <ActionButton
          variant="ghost"
          size="sm"
          ariaLabel={`Antwort von ${name} entfernen`}
          action={() => removeAttendance(eventId, userId)}
          confirm={{ title: "Antwort entfernen?", message: `Die Antwort von ${name} wird gelöscht.`, confirmLabel: "Entfernen", danger: true }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ActionButton>
      )}
    </div>
  );
}
