import { ActionForm, ChipSelect, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { toBerlinInput } from "@/lib/dates";
import type { FormState } from "@/server/action";

type Opt = { id: string; name: string };
export interface CourseDefaults {
  id?: string; unitId?: string; title?: string; description?: string | null; location?: string | null; startsAt?: Date; endsAt?: Date; signupDeadline?: Date | null;
  capacity?: number | null; qualificationTypeId?: string | null; prerequisiteIds?: string[]; leadHelperId?: string | null; instructors?: string | null;
}

export function CourseForm({ action, units, qualTypes, helpers, defaults, submit }: { action: (p: FormState, f: FormData) => Promise<FormState>; units: Opt[]; qualTypes: Opt[]; helpers: Opt[]; defaults?: CourseDefaults; submit: string }) {
  const d = defaults ?? {};
  return (
    <ActionForm action={action} className="space-y-5">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <Field label="Titel" required className="sm:col-span-2"><input className="input" name="title" required maxLength={160} defaultValue={d.title} placeholder="z. B. Sanitätshelfer-Lehrgang Frühjahr" /></Field>
        <Field label="Einheit" required hint="Anmelden können sich Helfer dieser Einheit und ihrer Untereinheiten.">
          {d.id ? <><input type="hidden" name="unitId" value={d.unitId} /><input disabled className="input" value={units.find((u) => u.id === d.unitId)?.name ?? ""} /></> : <select className="input" name="unitId" defaultValue={d.unitId} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        </Field>
        <Field label="Ort"><input className="input" name="location" defaultValue={d.location ?? ""} maxLength={200} /></Field>
        <Field label="Beginn" required><input className="input" type="datetime-local" name="startsAt" required defaultValue={toBerlinInput(d.startsAt)} /></Field>
        <Field label="Ende" required><input className="input" type="datetime-local" name="endsAt" required defaultValue={toBerlinInput(d.endsAt)} /></Field>
        <Field label="Anmeldeschluss (optional)" hint="Ohne Angabe: bis Lehrgangsbeginn."><input className="input" type="datetime-local" name="signupDeadline" defaultValue={toBerlinInput(d.signupDeadline ?? null)} /></Field>
        <Field label="Plätze (optional)" hint="Leer = unbegrenzt. Weitere Anmeldungen kommen auf die Warteliste."><input className="input" type="number" name="capacity" min={1} max={1000} defaultValue={d.capacity ?? ""} /></Field>
        <Field label="Vermittelte Qualifikation" hint="Wird bei „bestanden“ automatisch eingetragen und steht auf dem Zertifikat." className="sm:col-span-2">
          <select className="input" name="qualificationTypeId" defaultValue={d.qualificationTypeId ?? ""}><option value="">— keine (nur Teilnahmebescheinigung) —</option>{qualTypes.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select>
        </Field>
        <Field label="Lehrgangsleitung"><select className="input" name="leadHelperId" defaultValue={d.leadHelperId ?? ""}><option value="">—</option>{helpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
        <Field label="Weitere Ausbilder (optional)"><input className="input" name="instructors" defaultValue={d.instructors ?? ""} maxLength={300} placeholder="z. B. M. Muster, A. Beispiel" /></Field>
        <Field label="Beschreibung" className="sm:col-span-2"><textarea className="input" name="description" maxLength={4000} defaultValue={d.description ?? ""} /></Field>
      </div>
      {qualTypes.length > 0 && (
        <div className="card card-pad">
          <h2 className="card-title mb-1">Voraussetzungen</h2>
          <p className="mb-3 text-sm text-fg-muted">Helfer können sich nur anmelden, wenn sie alle gewählten Qualifikationen zum Lehrgangsbeginn gültig besitzen.</p>
          <ChipSelect name="prerequisiteIds" options={qualTypes.map((q) => ({ value: q.id, label: q.name }))} defaultValue={d.prerequisiteIds ?? []} />
        </div>
      )}
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  );
}
