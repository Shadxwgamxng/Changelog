"use client";

import { useRouter } from "next/navigation";
import { ActionForm, Checkbox, Field, FormActions, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, EVENT_STATUS_OPTIONS, EVENT_TYPE_OPTIONS } from "@/lib/labels";
import { createEvent, updateEvent } from "@/server/actions/events";

export interface EventFormValues {
  id?: string;
  title?: string;
  type?: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  address?: string;
  mapsUrl?: string;
  organizer?: string;
  description?: string;
  meetingPoint?: string;
  departureAt?: string;
  cost?: string;
  registrationDeadline?: string;
  maxParticipants?: string;
  equipmentIds?: string[];
}

interface Props {
  values?: EventFormValues;
  equipment: { id: string; name: string; category: keyof typeof CATEGORY_LABELS; required: boolean }[];
}

export function EventForm({ values = {}, equipment }: Props) {
  const router = useRouter();
  const editing = Boolean(values.id);
  return (
    <ActionForm
      action={editing ? updateEvent : createEvent}
      refresh={false}
      onSuccess={(data) => {
        const id = (data as { id: string } | undefined)?.id ?? values.id;
        router.push(id ? `/events/${id}` : "/events");
        router.refresh();
      }}
      className="space-y-6"
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <fieldset className="panel space-y-4 p-4 sm:p-5">
        <legend className="label-caps px-2">Grunddaten</legend>
        <Field label="Titel" name="title" required>
          <Input name="title" defaultValue={values.title} maxLength={120} required placeholder="z. B. Spieltag Nordheide" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Art des Termins" name="type" required>
            <Select name="type" defaultValue={values.type ?? "SPIELTAG"} options={EVENT_TYPE_OPTIONS} />
          </Field>
          <Field label="Status" name="status" required hint="„Voll“ wird bei erreichtem Teilnehmerlimit automatisch angezeigt.">
            <Select name="status" defaultValue={values.status ?? "OPEN"} options={EVENT_STATUS_OPTIONS} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Beginn" name="startsAt" required>
            <Input name="startsAt" type="datetime-local" defaultValue={values.startsAt} required />
          </Field>
          <Field label="Ende" name="endsAt">
            <Input name="endsAt" type="datetime-local" defaultValue={values.endsAt} />
          </Field>
        </div>
        <Field label="Beschreibung" name="description">
          <Textarea name="description" defaultValue={values.description} rows={5} maxLength={5000} placeholder="Ablauf, Regeln, Verpflegung …" />
        </Field>
      </fieldset>

      <fieldset className="panel space-y-4 p-4 sm:p-5">
        <legend className="label-caps px-2">Ort &amp; Anfahrt</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Veranstaltungsort" name="location" required>
            <Input name="location" defaultValue={values.location} maxLength={160} required />
          </Field>
          <Field label="Veranstalter" name="organizer">
            <Input name="organizer" defaultValue={values.organizer} maxLength={120} />
          </Field>
        </div>
        <Field label="Adresse" name="address">
          <Input name="address" defaultValue={values.address} maxLength={250} autoComplete="off" />
        </Field>
        <Field label="Google-Maps-Link" name="mapsUrl" hint="Beginnt mit https://">
          <Input name="mapsUrl" type="url" defaultValue={values.mapsUrl} maxLength={2000} placeholder="https://maps.google.com/…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Treffpunkt" name="meetingPoint">
            <Input name="meetingPoint" defaultValue={values.meetingPoint} maxLength={200} />
          </Field>
          <Field label="Abfahrtszeit" name="departureAt">
            <Input name="departureAt" type="datetime-local" defaultValue={values.departureAt} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="panel space-y-4 p-4 sm:p-5">
        <legend className="label-caps px-2">Anmeldung &amp; Kosten</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kosten (€)" name="cost">
            <Input name="cost" inputMode="decimal" defaultValue={values.cost} placeholder="25,00" />
          </Field>
          <Field label="Anmeldefrist" name="registrationDeadline">
            <Input name="registrationDeadline" type="datetime-local" defaultValue={values.registrationDeadline} />
          </Field>
          <Field label="Max. Teilnehmer" name="maxParticipants">
            <Input name="maxParticipants" type="number" min={1} max={1000} defaultValue={values.maxParticipants} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="panel p-4 sm:p-5">
        <legend className="label-caps px-2">Benötigte Ausrüstung</legend>
        {equipment.length === 0 ? (
          <p className="text-sm text-muted">Im Katalog gibt es noch keine Ausrüstung.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {equipment.map((e) => (
              <Checkbox key={e.id} name="equipmentIds" value={e.id} label={e.name} hint={`${CATEGORY_LABELS[e.category]}${e.required ? " · Pflicht" : ""}`} defaultChecked={values.equipmentIds?.includes(e.id)} />
            ))}
          </div>
        )}
      </fieldset>

      <FormActions>
        <Button variant="ghost" onClick={() => router.back()}>
          Abbrechen
        </Button>
        <SubmitButton>{editing ? "Änderungen speichern" : "Termin erstellen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
