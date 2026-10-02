"use client";

import { ActionForm, Checkbox, Field, FormActions, ImageUpload, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { ANNOUNCEMENT_PRIORITY_OPTIONS } from "@/lib/labels";
import { createAnnouncement, updateAnnouncement } from "@/server/actions/announcements";

export interface AnnouncementFormValues {
  id?: string;
  title?: string;
  body?: string;
  priority?: string;
  pinned?: boolean;
  imageUrl?: string | null;
  publishedAt?: string;
}

export function AnnouncementForm({ values = {} }: { values?: AnnouncementFormValues }) {
  const editing = Boolean(values.id);
  return (
    <ActionForm action={editing ? updateAnnouncement : createAnnouncement} successMessage={editing ? "Ankündigung gespeichert." : "Ankündigung veröffentlicht."}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Titel" name="title" required>
        <Input name="title" defaultValue={values.title} maxLength={140} required />
      </Field>
      <Field label="Text" name="body" required>
        <Textarea name="body" defaultValue={values.body} rows={7} maxLength={8000} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Priorität" name="priority" required hint="Wichtige und dringende Ankündigungen benachrichtigen alle Mitglieder.">
          <Select name="priority" defaultValue={values.priority ?? "NORMAL"} options={ANNOUNCEMENT_PRIORITY_OPTIONS} />
        </Field>
        <Field label="Veröffentlichung" name="publishedAt" hint="Leer = sofort. In der Zukunft = geplant.">
          <Input name="publishedAt" type="datetime-local" defaultValue={values.publishedAt} />
        </Field>
      </div>
      <Checkbox name="pinned" label="Oben anheften" defaultChecked={values.pinned} />
      <ImageUpload name="imageUrl" kind="announcements" defaultValue={values.imageUrl} label="Bild (optional)" />
      <FormActions>
        <SubmitButton>{editing ? "Speichern" : "Veröffentlichen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
