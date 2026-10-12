import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { EfMark } from "@/components/brand";
import { needsSetup, setupTokenRequired } from "@/server/setup";
import { UNIT_TYPE_LABEL } from "@/lib/constants";
import { setupAction } from "./actions";

export const metadata = { title: "Einrichtung" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  if (!(await needsSetup())) redirect("/login");
  const { token } = await searchParams;
  const tokenRequired = setupTokenRequired();
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <EfMark className="h-12 w-[5.1rem] text-brand-600" label="EmergencyForge" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">HelferNet einrichten</h1>
          <p className="text-sm text-fg-muted">Einmalig: Organisation und ersten Administrator anlegen</p>
        </div>
      </div>
      <div className="card card-pad">
        <ActionForm action={setupAction} className="space-y-4">
          {tokenRequired && (
            <label className="block"><span className="label">Einrichtungs-Code</span>
              <input className="input font-mono" name="token" defaultValue={token ?? ""} required autoComplete="off" />
              <span className="mt-1 block text-xs text-fg-subtle">Steht in der Ausgabe des Installationsskripts bzw. als SETUP_TOKEN in der .env.</span>
            </label>
          )}
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-semibold">Organisation</legend>
            <label className="block"><span className="label">Name</span><input className="input" name="orgName" required placeholder="z. B. Rettungsdienst Los Santos" autoFocus={!tokenRequired || Boolean(token)} /></label>
            <label className="block"><span className="label">Art der obersten Einheit</span>
              <select className="input" name="unitType" defaultValue="SONSTIGE">
                {Object.entries(UNIT_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-semibold">Administrator-Konto</legend>
            <label className="block"><span className="label">E-Mail</span><input className="input" type="email" name="email" autoComplete="username" required inputMode="email" /></label>
            <label className="block"><span className="label">Passwort</span><input className="input" type="password" name="password" autoComplete="new-password" required minLength={10} /></label>
            <label className="block"><span className="label">Passwort wiederholen</span><input className="input" type="password" name="password2" autoComplete="new-password" required minLength={10} /></label>
            <p className="text-xs text-fg-subtle">Mindestens 10 Zeichen aus drei Zeichenarten (Klein-, Großbuchstaben, Ziffern, Sonderzeichen).</p>
          </fieldset>
          <SubmitButton className="w-full" pendingText="Wird eingerichtet …">Einrichten und anmelden</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-6 text-center text-xs text-fg-subtle">Diese Seite ist nur verfügbar, solange noch kein Benutzer existiert.</p>
    </main>
  );
}
