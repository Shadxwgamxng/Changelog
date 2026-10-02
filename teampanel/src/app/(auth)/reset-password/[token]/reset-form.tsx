"use client";

import { useRouter } from "next/navigation";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { resetPassword } from "@/server/actions/auth";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  return (
    <ActionForm action={resetPassword} refresh={false} onSuccess={(data) => router.push(data?.redirectTo ?? "/login")} successMessage="Passwort geändert. Du kannst dich jetzt anmelden.">
      <input type="hidden" name="token" value={token} />
      <Field label="Neues Passwort" name="password" required>
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </Field>
      <Field label="Passwort wiederholen" name="confirm" required>
        <Input name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <SubmitButton className="w-full">Passwort speichern</SubmitButton>
    </ActionForm>
  );
}
