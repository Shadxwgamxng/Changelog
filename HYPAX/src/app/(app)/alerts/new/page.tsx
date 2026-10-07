import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { forbidden } from "@/server/errors";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { ALERT_AUDIENCE_LABEL } from "@/lib/constants";
import { listAlertGroups } from "@/server/services/alerts";
import { listGroups } from "@/server/services/helpers";
import { listQualTypes } from "@/server/services/qualifications";
import { getShift } from "@/server/services/shifts";
import { toBerlinInput } from "@/lib/dates";
import { createAlertAction } from "../actions";

export const metadata = { title: "Alarmierung auslösen" };

export default async function NewAlert({ searchParams }: { searchParams: Promise<{ shift?: string }> }) {
  const ctx = await requireCtx();
  const units = await unitsWith(ctx, "alert.create");
  if (!units.length) throw forbidden();
  const sp = await searchParams;
  const shift = sp.shift ? await getShift(ctx, sp.shift).catch(() => null) : null;
  const [groups, quals, alertGroups] = await Promise.all([listGroups(ctx), listQualTypes(ctx), listAlertGroups(ctx)]);
  const unitId = shift?.unitId ?? units[0].id;
  return (
    <>
      <PageHeader title="🚨 Alarmierung auslösen" back={{ href: "/alerts", label: "Alarmierung" }} subtitle="Alle Empfänger werden sofort benachrichtigt und können mit „Ich komme“, „eventuell“ oder „kann nicht“ antworten." />
      <ActionForm action={createAlertAction} className="card card-pad grid max-w-3xl gap-4 sm:grid-cols-2">
        {shift && <input type="hidden" name="shiftId" value={shift.id} />}
        <Field label="Einheit" required><select name="unitId" className="input" defaultValue={unitId} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Einsatz / Anlass" required><input name="title" className="input" required defaultValue={shift ? shift.name : ""} placeholder="z. B. Sanitätsdienst / Veranstaltung" /></Field>
        <Field label="Treffpunkt"><input name="meetingPoint" className="input" defaultValue={shift?.meetingPoint ?? "Unterkunft"} /></Field>
        <Field label="Zeit"><input type="datetime-local" name="meetingTime" className="input" defaultValue={toBerlinInput(new Date(Date.now() + 30 * 60_000))} /></Field>
        <Field label="Nachricht" className="sm:col-span-2"><textarea name="message" className="input" maxLength={2000} /></Field>
        <fieldset className="sm:col-span-2"><legend className="label">Empfänger</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="audienceType" className="input" defaultValue="EINHEIT" aria-label="Empfängerkreis">{Object.entries(ALERT_AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <div className="space-y-2">
              <select name="audienceRef" className="input" aria-label="Gruppe oder Qualifikation"><option value="">— bei „Gruppe“ / „Qualifikation“ wählen —</option><optgroup label="Gruppen">{groups.map((g) => <option key={g} value={g}>{g}</option>)}</optgroup><optgroup label="Qualifikationen">{quals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</optgroup></select>
              <select name="alertGroupId" className="input" aria-label="Alarmgruppe"><option value="">— Alarmgruppe (bei „Definierte Alarmgruppe“) —</option>{alertGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.unitName})</option>)}</select>
            </div>
          </div>
          <p className="hint">Alarmiert werden nur aktive Helfer der gewählten Einheit (inkl. Untereinheiten).</p>
        </fieldset>
        <div className="sm:col-span-2"><SubmitButton variant="danger" confirm="Alarmierung jetzt auslösen? Alle Empfänger werden sofort benachrichtigt.">Alarmierung auslösen</SubmitButton></div>
      </ActionForm>
    </>
  );
}
