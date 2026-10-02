"use client";

import { ActionForm, Field, FormActions, ImageUpload, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { updateTeamSettings } from "@/server/actions/team";

type V = Record<"name" | "shortName" | "motto" | "foundedYear" | "location" | "description" | "rules" | "contactEmail" | "contactPhone" | "websiteUrl" | "discordUrl" | "instagramUrl" | "facebookUrl" | "youtubeUrl", string> & { logoUrl: string | null };

export function TeamSettingsForm({ values: v }: { values: V }) {
  return (
    <ActionForm action={updateTeamSettings} successMessage="Teamdaten gespeichert.">
      <ImageUpload name="logoUrl" kind="team" defaultValue={v.logoUrl} label="Teamlogo (leer = Standardlogo)" round />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Teamname" name="name" required className="sm:col-span-2">
          <Input name="name" defaultValue={v.name} maxLength={100} required />
        </Field>
        <Field label="Kürzel" name="shortName" required>
          <Input name="shortName" defaultValue={v.shortName} maxLength={12} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Leitspruch" name="motto" className="sm:col-span-2">
          <Input name="motto" defaultValue={v.motto} maxLength={120} />
        </Field>
        <Field label="Gründungsjahr" name="foundedYear">
          <Input name="foundedYear" type="number" min={1990} max={2100} defaultValue={v.foundedYear} />
        </Field>
      </div>
      <Field label="Standort" name="location" required>
        <Input name="location" defaultValue={v.location} maxLength={100} required />
      </Field>
      <Field label="Beschreibung" name="description">
        <Textarea name="description" defaultValue={v.description} rows={5} maxLength={4000} />
      </Field>
      <Field label="Teamregeln" name="rules">
        <Textarea name="rules" defaultValue={v.rules} rows={8} maxLength={8000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kontakt-E-Mail" name="contactEmail">
          <Input name="contactEmail" type="email" defaultValue={v.contactEmail} />
        </Field>
        <Field label="Kontakt-Telefon" name="contactPhone">
          <Input name="contactPhone" type="tel" defaultValue={v.contactPhone} maxLength={40} />
        </Field>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="label-caps mb-2">Social Media &amp; Links</legend>
        {(
          [
            ["websiteUrl", "Website"],
            ["discordUrl", "Discord"],
            ["instagramUrl", "Instagram"],
            ["facebookUrl", "Facebook"],
            ["youtubeUrl", "YouTube"],
          ] as const
        ).map(([name, label]) => (
          <Field key={name} label={label} name={name}>
            <Input name={name} type="url" defaultValue={v[name]} maxLength={2000} placeholder="https://…" />
          </Field>
        ))}
      </fieldset>
      <FormActions>
        <SubmitButton>Speichern</SubmitButton>
      </FormActions>
    </ActionForm>
  );
}
