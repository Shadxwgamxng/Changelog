"use client";

import { ActionForm, Checkbox, Field, FormActions, Input, SubmitButton } from "@/components/ui/form";
import { assignRequirements } from "@/server/actions/equipment";

interface Props {
  members: { id: string; label: string }[];
  equipment: { id: string; label: string; hint: string }[];
}

/** Mehrfachauswahl: mehrere Mitglieder × mehrere Gegenstände in einem Schritt. */
export function RequirementForm({ members, equipment }: Props) {
  return (
    <ActionForm action={assignRequirements} resetOnSuccess>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Mitglieder</legend>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-line bg-bg p-3">
          {members.map((m) => (
            <Checkbox key={m.id} name="userIds" value={m.id} label={m.label} />
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ausrüstung</legend>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-line bg-bg p-3">
          {equipment.map((e) => (
            <Checkbox key={e.id} name="equipmentIds" value={e.id} label={e.label} hint={e.hint} />
          ))}
        </div>
      </fieldset>
      <Field label="Fällig bis" name="dueDate" hint="Optional, z. B. bis zum nächsten Spieltag.">
        <Input name="dueDate" type="datetime-local" />
      </Field>
      <Field label="Hinweis" name="note">
        <Input name="note" maxLength={300} placeholder="z. B. Bis zum nächsten Spieltag" />
      </Field>
      <FormActions>
        <SubmitButton>Zuweisen</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
