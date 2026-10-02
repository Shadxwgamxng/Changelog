"use client";

import { ActionForm, Field, FormActions, ImageUpload, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, SHOPPING_STATUS_OPTIONS } from "@/lib/labels";
import { createShoppingItem, updateShoppingItem } from "@/server/actions/shopping";

export interface ShoppingFormValues {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  shop?: string;
  url?: string;
  price?: string;
  priority?: string;
  imageUrl?: string | null;
  quantity?: number;
  status?: string;
  equipmentId?: string;
  targetUserId?: string;
}

interface Props {
  values?: ShoppingFormValues;
  equipment: { value: string; label: string }[];
  members: { value: string; label: string }[];
}

export function ShoppingForm({ values = {}, equipment, members }: Props) {
  const editing = Boolean(values.id);
  return (
    <ActionForm action={editing ? updateShoppingItem : createShoppingItem} successMessage={editing ? "Artikel gespeichert." : "Artikel hinzugefügt."}>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Produktname" name="name" required>
        <Input name="name" defaultValue={values.name} maxLength={160} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategorie" name="category" required>
          <Select name="category" defaultValue={values.category ?? "OTHER"} options={CATEGORY_OPTIONS} />
        </Field>
        <Field label="Priorität" name="priority" required>
          <Select name="priority" defaultValue={values.priority ?? "MEDIUM"} options={PRIORITY_OPTIONS} />
        </Field>
      </div>
      <Field label="Beschreibung" name="description">
        <Textarea name="description" defaultValue={values.description} rows={2} maxLength={2000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop" name="shop">
          <Input name="shop" defaultValue={values.shop} maxLength={120} placeholder="z. B. Beispiel-Shop" />
        </Field>
        <Field label="Preis (€)" name="price">
          <Input name="price" inputMode="decimal" defaultValue={values.price} placeholder="49,99" />
        </Field>
      </div>
      <Field label="Produkt-Link" name="url" hint="Beginnt mit https://. Öffnet in einem neuen Tab.">
        <Input name="url" type="url" defaultValue={values.url} maxLength={2000} placeholder="https://…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Anzahl" name="quantity" required>
          <Input name="quantity" type="number" min={1} max={999} defaultValue={values.quantity ?? 1} required />
        </Field>
        <Field label="Status" name="status" required>
          <Select name="status" defaultValue={values.status ?? "OPEN"} options={SHOPPING_STATUS_OPTIONS} />
        </Field>
      </div>
      <Field label="Katalog-Artikel (optional)" name="equipmentId" hint="Damit wird berechnet, wie viele Mitglieder den Artikel benötigen.">
        <Select name="equipmentId" defaultValue={values.equipmentId ?? ""} options={equipment} placeholder="– keiner –" />
      </Field>
      <Field label="Bestimmt für (optional)" name="targetUserId">
        <Select name="targetUserId" defaultValue={values.targetUserId ?? ""} options={members} placeholder="– ganzes Team –" />
      </Field>
      <ImageUpload name="imageUrl" kind="shopping" defaultValue={values.imageUrl} label="Bild" />
      <FormActions>
        <SubmitButton>{editing ? "Speichern" : "Hinzufügen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
