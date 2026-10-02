"use client";

import { useRouter } from "next/navigation";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { registerWithInvitation } from "@/server/actions/auth";

export function RegisterForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  return (
    <ActionForm
      action={registerWithInvitation}
      refresh={false}
      onSuccess={(data) => {
        router.push(data?.redirectTo ?? "/");
        router.refresh();
      }}
    >
      <input type="hidden" name="token" value={token} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname" name="firstName" required>
          <Input name="firstName" autoComplete="given-name" required maxLength={60} />
        </Field>
        <Field label="Nachname" name="lastName" required>
          <Input name="lastName" autoComplete="family-name" required maxLength={60} />
        </Field>
      </div>
      <Field label="Rufname" name="callsign" hint="Optional – dein Callsign im Team.">
        <Input name="callsign" maxLength={40} />
      </Field>
      <Field label="Benutzername" name="username" required hint="3–32 Zeichen: a–z, 0–9, Punkt, Binde- und Unterstrich.">
        <Input name="username" autoComplete="username" autoCapitalize="none" required maxLength={32} />
      </Field>
      <Field label="E-Mail" name="email" required>
        <Input name="email" type="email" autoComplete="email" defaultValue={email} readOnly={Boolean(email)} required />
      </Field>
      <Field label="Passwort" name="password" required hint="Mindestens 10 Zeichen, Buchstaben und Zahlen.">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Passwort wiederholen" name="confirm" required>
        <Input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <SubmitButton className="w-full">Konto erstellen</SubmitButton>
    </ActionForm>
  );
}
