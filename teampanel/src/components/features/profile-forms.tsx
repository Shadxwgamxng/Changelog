"use client";

import { ActionForm, Checkbox, Field, FormActions, ImageUpload, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { AIRSOFT_ROLE_OPTIONS } from "@/lib/labels";
import { changeOwnPassword } from "@/server/actions/auth";
import { updateOwnProfile } from "@/server/actions/members";

export interface ProfileValues {
  firstName: string;
  lastName: string;
  callsign: string;
  airsoftRole: string;
  bio: string;
  phone: string;
  phoneVisible: boolean;
  avatarUrl: string | null;
}

export function ProfileForm({ values }: { values: ProfileValues }) {
  return (
    <ActionForm action={updateOwnProfile} successMessage="Profil gespeichert.">
      <ImageUpload name="avatarUrl" kind="avatars" defaultValue={values.avatarUrl} label="Profilbild" round />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vorname" name="firstName" required>
          <Input name="firstName" defaultValue={values.firstName} maxLength={60} required autoComplete="given-name" />
        </Field>
        <Field label="Nachname" name="lastName" required>
          <Input name="lastName" defaultValue={values.lastName} maxLength={60} required autoComplete="family-name" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rufname" name="callsign">
          <Input name="callsign" defaultValue={values.callsign} maxLength={40} />
        </Field>
        <Field label="Airsoft-Rolle" name="airsoftRole" required hint="Deine bevorzugte Aufgabe im Spiel – hat keinen Einfluss auf Rechte.">
          <Select name="airsoftRole" defaultValue={values.airsoftRole} options={AIRSOFT_ROLE_OPTIONS} />
        </Field>
      </div>
      <Field label="Über mich" name="bio">
        <Textarea name="bio" defaultValue={values.bio} rows={4} maxLength={1000} />
      </Field>
      <Field label="Telefon" name="phone">
        <Input name="phone" type="tel" defaultValue={values.phone} maxLength={40} autoComplete="tel" />
      </Field>
      <Checkbox name="phoneVisible" label="Telefonnummer für alle Teammitglieder sichtbar" hint="Teamleitung und Admins sehen sie immer." defaultChecked={values.phoneVisible} />
      <FormActions>
        <SubmitButton>Profil speichern</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changeOwnPassword} resetOnSuccess successMessage="Passwort geändert.">
      <Field label="Aktuelles Passwort" name="current" required>
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Neues Passwort" name="password" required hint="Mindestens 10 Zeichen mit Buchstaben und Zahlen.">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Neues Passwort wiederholen" name="confirm" required>
        <Input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <FormActions>
        <SubmitButton>Passwort ändern</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
