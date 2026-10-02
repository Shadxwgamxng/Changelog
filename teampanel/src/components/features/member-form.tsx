"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { ActionForm, Checkbox, Field, FormActions, ImageUpload, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useModalClose } from "@/components/ui/modal";
import { AIRSOFT_ROLE_OPTIONS } from "@/lib/labels";
import { createMember, updateMember } from "@/server/actions/members";

export interface MemberFormValues {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  callsign?: string;
  role?: string;
  airsoftRole?: string;
  joinedAt?: string;
  bio?: string;
  phone?: string;
  phoneVisible?: boolean;
  adminNotes?: string;
  avatarUrl?: string | null;
}

interface Props {
  values?: MemberFormValues;
  roleOptions: { value: string; label: string }[];
  /** Darf der Betrachter private Admin-Notizen sehen/bearbeiten? */
  canNotes: boolean;
  /** Wenn die Systemrolle des Mitglieds nicht vom Betrachter vergeben werden darf, bleibt das Feld gesperrt. */
  roleLocked?: boolean;
}

export function MemberForm({ values = {}, roleOptions, canNotes, roleLocked }: Props) {
  const router = useRouter();
  const closeModal = useModalClose();
  const editing = Boolean(values.id);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  if (created) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Mitglied angelegt">
          Gib diese Zugangsdaten sicher weiter. Das Passwort wird nur jetzt angezeigt; das Mitglied muss es beim ersten Login ändern.
        </Alert>
        <CopyField label="Benutzername" value={created.username} />
        <CopyField label="Vorläufiges Passwort" value={created.password} />
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => closeModal?.()}>
            Fertig
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ActionForm
      action={editing ? updateMember : createMember}
      closeOnSuccess={editing}
      successMessage={editing ? "Mitglied gespeichert." : undefined}
      onSuccess={(data) => {
        if (!editing && data) setCreated({ username: (data as { username: string }).username, password: (data as { password: string }).password });
        if (editing) router.refresh();
      }}
    >
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <ImageUpload name="avatarUrl" kind="avatars" defaultValue={values.avatarUrl} label="Profilbild" round />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vorname" name="firstName" required>
          <Input name="firstName" defaultValue={values.firstName} maxLength={60} required />
        </Field>
        <Field label="Nachname" name="lastName" required>
          <Input name="lastName" defaultValue={values.lastName} maxLength={60} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rufname" name="callsign">
          <Input name="callsign" defaultValue={values.callsign} maxLength={40} />
        </Field>
        <Field label="Benutzername" name="username" required>
          <Input name="username" defaultValue={values.username} maxLength={32} autoCapitalize="none" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-Mail" name="email" required>
          <Input name="email" type="email" defaultValue={values.email} required />
        </Field>
        <Field label="Telefon" name="phone">
          <Input name="phone" type="tel" defaultValue={values.phone} maxLength={40} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Systemrolle (Rechte)" name="role" required hint="Steuert die Berechtigungen im Panel.">
          <Select name="role" defaultValue={values.role ?? "MITGLIED"} options={roleOptions} disabled={roleLocked} />
          {roleLocked && <input type="hidden" name="role" value={values.role} />}
        </Field>
        <Field label="Airsoft-Rolle" name="airsoftRole" required hint="Aufgabe im Spiel – ohne Rechte.">
          <Select name="airsoftRole" defaultValue={values.airsoftRole ?? "RIFLEMAN"} options={AIRSOFT_ROLE_OPTIONS} />
        </Field>
      </div>
      <Field label="Teambeitritt" name="joinedAt">
        <Input name="joinedAt" type="date" defaultValue={values.joinedAt} />
      </Field>
      <Field label="Kurzbeschreibung" name="bio">
        <Textarea name="bio" defaultValue={values.bio} rows={3} maxLength={1000} />
      </Field>
      <Checkbox name="phoneVisible" label="Telefonnummer für alle Mitglieder sichtbar" defaultChecked={values.phoneVisible} />
      {canNotes && (
        <Field label="Private Admin-Notizen" name="adminNotes" hint="Nur für Admins sichtbar – nie für Mitglieder.">
          <Textarea name="adminNotes" defaultValue={values.adminNotes} rows={3} maxLength={3000} />
        </Field>
      )}
      {!editing && <p className="text-xs text-subtle">Das Passwort wird automatisch erzeugt und nach dem Anlegen einmalig angezeigt.</p>}
      <FormActions>
        <SubmitButton>{editing ? "Speichern" : "Mitglied anlegen"}</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
