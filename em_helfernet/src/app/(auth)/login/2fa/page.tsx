import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/server/auth";
import { COOKIE_NAME } from "@/server/env";
import { ActionForm, SubmitButton } from "@/components/forms";
import { twoFactorAction } from "../actions";

export const metadata = { title: "Zwei-Faktor-Anmeldung" };

export default async function TwoFactorPage() {
  const s = await getSession((await cookies()).get(COOKIE_NAME)?.value);
  if (!s) redirect("/login");
  if (s.twoFactorOk) redirect("/");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="card card-pad">
        <h1 className="mb-1 text-lg font-semibold">Zweiter Faktor</h1>
        <p className="mb-4 text-sm text-fg-muted">Gib den 6-stelligen Code aus deiner Authenticator-App ein – oder einen Wiederherstellungscode.</p>
        <ActionForm action={twoFactorAction} className="space-y-4">
          <input className="input text-center text-xl tracking-[0.3em]" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus aria-label="Code" />
          <SubmitButton className="w-full">Bestätigen</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
