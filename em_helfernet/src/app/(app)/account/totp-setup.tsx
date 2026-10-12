"use client";
import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import type { FormState } from "@/server/action";

type Act = (p: FormState, f: FormData) => Promise<FormState>;

export function TotpSetup({ begin, confirm }: { begin: Act; confirm: Act }) {
  const [b, bAction] = useActionState(begin, {});
  const [c, cAction] = useActionState(confirm, {});
  const setup = b.data as { secret: string; uri: string } | undefined;
  const codes = (c.data as { codes: string[] } | undefined)?.codes;
  if (codes) return (
    <div className="space-y-3"><p className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">2FA ist aktiv. Speichere diese Wiederherstellungscodes jetzt – sie werden nur einmal angezeigt:</p><ul className="grid grid-cols-2 gap-2 font-mono text-sm">{codes.map((x) => <li key={x} className="rounded border border-line bg-bg-2 px-2 py-1">{x}</li>)}</ul></div>
  );
  if (!setup) return <form action={bAction}><SubmitButton>2-Faktor-Authentifizierung einrichten</SubmitButton>{b.error && <p className="mt-2 text-sm text-danger">{b.error}</p>}</form>;
  return (
    <form action={cAction} className="space-y-3">
      <p className="text-sm text-fg-muted">1. Öffne eine Authenticator-App (z. B. Aegis, 2FAS, Google/Microsoft Authenticator) und füge ein Konto hinzu – per Link oder manuell mit diesem Schlüssel:</p>
      <p className="break-all rounded border border-line bg-bg-2 p-2 font-mono text-sm">{setup.secret}</p>
      <a className="text-sm text-info hover:underline" href={setup.uri}>In Authenticator-App öffnen (otpauth-Link)</a>
      <label className="block"><span className="label">2. Aktuellen 6-stelligen Code eingeben</span><input name="code" inputMode="numeric" autoComplete="one-time-code" className="input !w-40 text-center tracking-widest" required /></label>
      <SubmitButton>Bestätigen & aktivieren</SubmitButton>
      {c.error && <p className="text-sm text-danger">{c.error}</p>}
    </form>
  );
}
