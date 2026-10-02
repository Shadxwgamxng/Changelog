"use client";

import { ActionForm, Checkbox, Field, FormActions, ImageUpload, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from "@/lib/labels";
import { createEquipment, updateEquipment } from "@/server/actions/equipment";

export interface EquipmentFormValues {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  required?: boolean;
  recommendedQuantity?: number;
  shopUrl?: string;
  price?: string;
  imageUrl?: string | null;
  manufacturer?: string;
  model?: string;
  priority?: string;
  notes?: string;
}

export function EquipmentForm({ values = {} }: { values?: EquipmentFormValues }) {
  const editing = Boolean(values.id);
  return (
    <ActionForm action={editing ? updateEquipment : createEquipment} successMessage={editing ? "Ausrüstung gespeichert." : "Ausrüstung angelegt."}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Name" name="name" required>
        <Input name="name" defaultValue={values.name} maxLength={120} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategorie" name="category" required>
          <Select name="category" defaultValue={values.category ?? "OTHER"} options={CATEGORY_OPTIONS} />
        </Field>
        <Field label="Priorität" name="priority" required>
          <Select name="priority" defaultValue={values.priority ?? "MEDIUM"} options={PRIORITY_OPTIONS} />
        </Field>
      </div>
      <Checkbox name="required" label="Pflichtausrüstung" hint="Fehlt sie, erscheint sie automatisch auf der persönlichen Einkaufsliste." defaultChecked={values.required} />
      <Field label="Beschreibung" name="description">
        <Textarea name="description" defaultValue={values.description} rows={3} maxLength={2000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hersteller" name="manufacturer">
          <Input name="manufacturer" defaultValue={values.manufacturer} maxLength={80} />
        </Field>
        <Field label="Modell" name="model">
          <Input name="model" defaultValue={values.model} maxLength={80} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preis (€)" name="price">
          <Input name="price" inputMode="decimal" defaultValue={values.price} placeholder="49,99" />
        </Field>
        <Field label="Empfohlene Menge" name="recommendedQuantity" required>
          <Input name="recommendedQuantity" type="number" min={1} max={99} defaultValue={values.recommendedQuantity ?? 1} required />
        </Field>
      </div>
      <Field label="Shop-Link" name="shopUrl" hint="Beginnt mit https://. Wird in einem neuen Tab geöffnet.">
        <Input name="shopUrl" type="url" defaultValue={values.shopUrl} maxLength={2000} placeholder="https://…" />
      </Field>
      <ImageUpload name="imageUrl" kind="equipment" defaultValue={values.imageUrl} label="Bild" />
      <Field label="Notizen" name="notes">
        <Textarea name="notes" defaultValue={values.notes} rows={2} maxLength={2000} />
      </Field>
      <FormActions>
        <SubmitButton>{editing ? "Speichern" : "Anlegen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
