"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { requestPasswordReset } from "@/server/actions/auth";

export function ForgotForm() {
  const [sent, setSent] = useState<string | null>(null);
  if (sent) {
    return (
      <div className="space-y-4">
        <Alert variant="success">{sent}</Alert>
        <Link href="/login" className="block text-center text-sm text-muted hover:text-accent-300">
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }
  return (
    <ActionForm action={requestPasswordReset} refresh={false} onSuccess={(_d, message) => setSent(message ?? "Anfrage gesendet.")}>
      <Field label="E-Mail" name="email" required>
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <SubmitButton className="w-full">Link anfordern</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted hover:text-accent-300">
          Zurück zur Anmeldung
        </Link>
      </p>
    </ActionForm>
  );
}
