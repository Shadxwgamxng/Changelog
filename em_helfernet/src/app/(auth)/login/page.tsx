import { redirect } from "next/navigation";
import { getCtx } from "@/server/session";
import { ActionForm, SubmitButton } from "@/components/forms";
import { loginAction } from "./actions";
import { EfMark } from "@/components/brand";
import { needsSetup } from "@/server/setup";
import { discordEnabled } from "@/server/discord";
import { DiscordButton } from "@/components/discord";

export const metadata = { title: "Anmelden" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCtx()) redirect("/");
  if (await needsSetup()) redirect("/setup");
  const { error } = await searchParams;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <EfMark className="h-12 w-[5.1rem] text-brand-600" label="EmergencyForge" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">HelferNet</h1>
          <p className="text-sm text-fg-muted">Dienst- und Helferverwaltung</p>
        </div>
      </div>
      <div className="card card-pad">
        <h2 className="mb-4 text-lg font-semibold">Anmelden</h2>
        {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error.slice(0, 300)}</p>}
        {discordEnabled() && (
          <>
            <DiscordButton href="/api/auth/discord/start?mode=login" label="Mit Discord anmelden" />
            <div className="my-4 flex items-center gap-3 text-xs text-fg-subtle"><span className="h-px flex-1 bg-line" />oder mit E-Mail<span className="h-px flex-1 bg-line" /></div>
          </>
        )}
        <ActionForm action={loginAction} className="space-y-4">
          <label className="block"><span className="label">E-Mail</span><input className="input" type="email" name="email" autoComplete="username" required autoFocus inputMode="email" /></label>
          <label className="block"><span className="label">Passwort</span><input className="input" type="password" name="password" autoComplete="current-password" required /></label>
          <SubmitButton className="w-full" pendingText="Anmelden …">Anmelden</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-xs text-fg-subtle">Passwort vergessen? Wende dich an die Leitung deiner Einheit – sie kann dein Passwort zurücksetzen.</p>
      </div>
      <p className="mt-6 text-center text-xs text-fg-subtle">Aus Sicherheitsgründen wirst du nach 30 Minuten Inaktivität automatisch abgemeldet.</p>
    </main>
  );
}
