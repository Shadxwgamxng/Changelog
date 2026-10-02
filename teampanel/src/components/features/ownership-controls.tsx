"use client";

import type { OwnershipStatus } from "@prisma/client";
import { Pencil } from "lucide-react";
import { ActionForm, Field, FormActions, Input, Select, SubmitButton } from "@/components/ui/form";
import { ModalTrigger } from "@/components/ui/modal";
import { useRunAction } from "@/components/ui/use-action";
import { OWNERSHIP_OPTIONS } from "@/lib/labels";
import { quickSetEquipmentStatus, setEquipmentStatus } from "@/server/actions/equipment";

/** Dropdown zum schnellen Ändern des Status (eigene Ausrüstung oder – mit userId – die eines Mitglieds). */
export function OwnershipSelect({ equipmentId, status, userId, label }: { equipmentId: string; status: OwnershipStatus; userId?: string; label: string }) {
  const { run, pending } = useRunAction();
  return (
    <select
      aria-label={`Status für ${label}`}
      defaultValue={status}
      disabled={pending}
      onChange={(e) => run(() => quickSetEquipmentStatus(equipmentId, e.target.value as OwnershipStatus, userId))}
      className="input h-9 w-auto min-w-36 py-1 pr-8"
    >
      {OWNERSHIP_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface EditorProps {
  equipmentId: string;
  name: string;
  status: OwnershipStatus;
  quantity: number;
  notes?: string | null;
  userId?: string;
}

/** Modal für Status, Menge und Notiz. */
export function OwnershipEditor({ equipmentId, name, status, quantity, notes, userId }: EditorProps) {
  return (
    <ModalTrigger variant="ghost" size="sm" label={<><Pencil className="h-3.5 w-3.5" /> Bearbeiten</>} title={name} description="Status deiner Ausrüstung" ariaLabel={`${name} bearbeiten`}>
      <ActionForm action={setEquipmentStatus} successMessage="Ausrüstung aktualisiert.">
        <input type="hidden" name="equipmentId" value={equipmentId} />
        {userId && <input type="hidden" name="userId" value={userId} />}
        <Field label="Status" name="status" required>
          <Select name="status" defaultValue={status} options={OWNERSHIP_OPTIONS} />
        </Field>
        <Field label="Menge" name="quantity">
          <Input name="quantity" type="number" min={0} max={99} defaultValue={quantity} />
        </Field>
        <Field label="Notiz" name="notes">
          <Input name="notes" defaultValue={notes ?? ""} maxLength={300} placeholder="z. B. Größe, Modell, Bestelldatum" />
        </Field>
        <FormActions>
          <SubmitButton>Speichern</SubmitButton>
        </FormActions>
      </ActionForm>
    </ModalTrigger>
  );
}
