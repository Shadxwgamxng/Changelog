import { requireCtxAllowPwChange } from "@/server/session";
import { prisma } from "@/server/db";
import { getPreferences } from "@/server/services/notifications";
import { env } from "@/server/env";
import { Card, Field, Notice, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { PushToggle } from "@/components/pwa";
import { fmtDateTime } from "@/lib/dates";
import { beginTotpAction, changePasswordAction, confirmTotpAction, disableTotpAction, icalTokenAction, revokeSessionsAction } from "./actions";
import { savePrefsAction } from "../notifications/actions";
import { TotpSetup } from "./totp-setup";

export const metadata = { title: "Konto & Sicherheit" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ force?: string; changed?: string }> }) {
  const ctx = await requireCtxAllowPwChange();
  const sp = await searchParams;
  const [user, prefs, sessions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { email: true, totpEnabled: true, icalToken: true, lastLoginAt: true, passwordChangedAt: true } }),
    getPreferences(ctx),
    prisma.session.findMany({ where: { userId: ctx.userId }, orderBy: { lastSeenAt: "desc" }, take: 10 }),
  ]);
  const feed = user.icalToken ? `${env.appUrl}/api/calendar/${user.icalToken}.ics` : null;
  return (
    <>
      <PageHeader title="Konto & Sicherheit" subtitle={user.email} />
      {ctx.mustChangePw && <div className="mb-5"><Notice tone="warn">Bitte vergib jetzt ein eigenes Passwort. Erst danach kannst du HelferNet nutzen.</Notice></div>}
      {sp.changed && <div className="mb-5"><Notice tone="ok">Passwort geändert. Andere Geräte wurden abgemeldet.</Notice></div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Passwort ändern">
          <ActionForm action={changePasswordAction} className="space-y-3">
            <Field label="Aktuelles Passwort"><input type="password" name="current" className="input" autoComplete="current-password" required /></Field>
            <Field label="Neues Passwort" hint="Mindestens 10 Zeichen, drei Zeichenarten."><input type="password" name="next" className="input" autoComplete="new-password" required minLength={10} /></Field>
            <Field label="Neues Passwort wiederholen"><input type="password" name="repeat" className="input" autoComplete="new-password" required /></Field>
            <SubmitButton>Passwort ändern</SubmitButton>
          </ActionForm>
        </Card>
        {!ctx.mustChangePw && (
          <>
            <Card title="Zwei-Faktor-Authentifizierung (optional)">
              {user.totpEnabled ? (
                <div className="space-y-3"><p className="text-sm text-ok">✓ Aktiviert – beim Anmelden wird zusätzlich ein Code abgefragt.</p>
                  <ActionForm action={disableTotpAction} className="flex flex-wrap items-end gap-3"><label className="block"><span className="label">Passwort zur Bestätigung</span><input type="password" name="password" className="input !w-56" required /></label><SubmitButton variant="danger" confirm="2FA wirklich deaktivieren?">Deaktivieren</SubmitButton></ActionForm></div>
              ) : <TotpSetup begin={beginTotpAction} confirm={confirmTotpAction} />}
            </Card>
            <Card title="Kalender-Abo (iCalendar)">
              <p className="mb-3 text-sm text-fg-muted">Mit diesem privaten Link siehst du deine Dienste in Google/Apple/Outlook-Kalender. Wer den Link kennt, sieht deine Dienste – gib ihn nicht weiter.</p>
              {feed && <input readOnly className="input mb-3 font-mono !text-xs" value={feed} aria-label="Kalender-Link" onFocus={undefined} />}
              <ActionButton action={icalTokenAction} small={false} label={feed ? "Neuen Link erzeugen (alter wird ungültig)" : "Kalender-Link erzeugen"} />
            </Card>
            <Card title="Angemeldete Geräte">
              <ul className="mb-3 space-y-1.5 text-sm">{sessions.map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="truncate text-fg-muted">{(s.userAgent ?? "Unbekanntes Gerät").slice(0, 60)}</span><span className="shrink-0 text-xs text-fg-subtle">{fmtDateTime(s.lastSeenAt)}</span></li>)}</ul>
              <ActionButton action={revokeSessionsAction} small={false} label="Alle anderen Geräte abmelden" confirm="Alle anderen Sitzungen beenden?" />
            </Card>
            <Card title="Benachrichtigungen" id="benachrichtigungen" className="lg:col-span-2">
              <p className="mb-3 text-sm text-fg-muted">Lege fest, worüber und wie du informiert werden möchtest. Push gilt pro Gerät.</p>
              <div className="mb-4"><PushToggle publicKey={env.vapid?.publicKey ?? null} /></div>
              <ActionForm action={savePrefsAction}>
                <input type="hidden" name="types" value={prefs.map((p) => p.type).join(",")} />
                <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Ereignis</th><th className="text-center">In HelferNet</th><th className="text-center">E-Mail</th><th className="text-center">Push</th></tr></thead><tbody>
                  {prefs.map((p) => <tr key={p.type}><td>{p.label}</td>{(["inApp", "email", "push"] as const).map((ch) => <td key={ch} className="text-center"><input type="checkbox" name={`${p.type}:${ch}`} defaultChecked={p[ch]} className="h-4 w-4" aria-label={`${p.label} – ${ch}`} /></td>)}</tr>)}
                </tbody></table></div>
                <div className="mt-3"><SubmitButton>Speichern</SubmitButton></div>
              </ActionForm>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
