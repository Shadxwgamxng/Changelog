"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { ActionForm, Field, FormActions, Input, Select, SubmitButton } from "@/components/ui/form";
import { ModalTrigger, useModalClose } from "@/components/ui/modal";
import { createInvitation } from "@/server/actions/members";

function InviteForm({ roleOptions }: { roleOptions: { value: string; label: string }[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const close = useModalClose();
  if (url) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Einladung erstellt">
          Sende diesen Link an die einzuladende Person. Er kann nur einmal verwendet werden.
        </Alert>
        <CopyField label="Einladungslink" value={url} />
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => close?.()}>
            Fertig
          </Button>
        </div>
      </div>
    );
  }
  return (
    <ActionForm action={createInvitation} closeOnSuccess={false} onSuccess={(data) => setUrl((data as { url: string }).url)}>
      <Field label="E-Mail (optional)" name="email" hint="Wenn gesetzt, kann nur mit dieser Adresse registriert werden.">
        <Input name="email" type="email" />
      </Field>
      <Field label="Systemrolle" name="role" required>
        <Select name="role" defaultValue="MITGLIED" options={roleOptions} />
      </Field>
      <Field label="Gültig für (Tage)" name="days" required>
        <Input name="days" type="number" min={1} max={30} defaultValue={7} required />
      </Field>
      <Field label="Notiz (intern)" name="note">
        <Input name="note" maxLength={200} placeholder="z. B. Name der Person" />
      </Field>
      <FormActions>
        <SubmitButton>Link erzeugen</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

export function InvitationDialog({ roleOptions }: { roleOptions: { value: string; label: string }[] }) {
  return (
    <ModalTrigger label={<><UserPlus className="h-4 w-4" /> Einladungslink</>} title="Einladungslink erzeugen" description="Neue Mitglieder registrieren sich selbst über den Link.">
      <InviteForm roleOptions={roleOptions} />
    </ModalTrigger>
  );
}
