"use client";

import { ActionForm, Field, FormActions, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import type { PersonalGroupKey } from "@/lib/labels";
import { createPersonalItem, updatePersonalItem } from "@/server/actions/personal-items";

interface Props {
  group: PersonalGroupKey;
  weapons: { value: string; label: string }[];
  values?: { id?: string; name?: string; manufacturer?: string; model?: string; quantity?: number; notes?: string; parentId?: string };
}

const HINTS: Record<PersonalGroupKey, string> = {
  CLOTHING: "z. B. Feldanzug, Stiefel, Handschuhe",
  WEAPON: "z. B. M4A1 AEG, Glock 17 GBB",
  ATTACHMENT: "z. B. Rotpunktvisier, Griff, Schalldämpfer",
  GADGET: "z. B. Funkgerät, Taschenlampe, Rauchgranate",
};

export function PersonalItemForm({ group, weapons, values = {} }: Props) {
  const editing = Boolean(values.id);
  return (
    <ActionForm action={editing ? updatePersonalItem : createPersonalItem} successMessage={editing ? "Gegenstand gespeichert." : "Gegenstand hinzugefügt."}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : <input type="hidden" name="group" value={group} />}
      <Field label="Name" name="name" required>
        <Input name="name" defaultValue={values.name} maxLength={120} placeholder={HINTS[group]} required />
      </Field>
      {(group === "ATTACHMENT" || group === "GADGET") && (
        <Field label={group === "ATTACHMENT" ? "Gehört zu Waffe" : "Montiert an Waffe (optional)"} name="parentId" required={group === "ATTACHMENT"}>
          <Select name="parentId" defaultValue={values.parentId ?? ""} options={weapons} placeholder={group === "ATTACHMENT" ? "– Waffe wählen –" : "– keine / einzeln –"} required={group === "ATTACHMENT"} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hersteller" name="manufacturer">
          <Input name="manufacturer" defaultValue={values.manufacturer} maxLength={80} />
        </Field>
        <Field label="Modell" name="model">
          <Input name="model" defaultValue={values.model} maxLength={80} />
        </Field>
      </div>
      <Field label="Menge" name="quantity" required>
        <Input name="quantity" type="number" min={1} max={999} defaultValue={values.quantity ?? 1} required />
      </Field>
      <Field label="Notizen" name="notes" hint={group === "WEAPON" ? "z. B. Joule-Wert, Seriennummer, Kaufdatum" : undefined}>
        <Textarea name="notes" defaultValue={values.notes} rows={2} maxLength={1000} />
      </Field>
      <FormActions>
        <SubmitButton>{editing ? "Speichern" : "Hinzufügen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
