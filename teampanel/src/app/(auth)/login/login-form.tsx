"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { login } from "@/server/actions/auth";

export function LoginForm() {
  const router = useRouter();
  return (
    <ActionForm
      action={login}
      refresh={false}
      onSuccess={(data) => {
        router.push(data?.redirectTo ?? "/");
        router.refresh();
      }}
    >
      <Field label="Benutzername oder E-Mail" name="identifier" required>
        <Input name="identifier" autoComplete="username" autoCapitalize="none" autoCorrect="off" required autoFocus />
      </Field>
      <Field label="Passwort" name="password" required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full">Anmelden</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-accent-300">
          Passwort vergessen?
        </Link>
      </p>
    </ActionForm>
  );
}
