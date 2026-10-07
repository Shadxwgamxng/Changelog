import type { ReactNode } from "react";
import { ActionForm, RowsEditor, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { FUNCTIONS, SHIFT_KIND_LABEL } from "@/lib/constants";
import { toBerlinInput } from "@/lib/dates";
import type { FormState } from "@/server/action";

export interface ShiftFormDefaults {
  id?: string; unitId?: string; eventId?: string | null; name?: string; kind?: string; startsAt?: Date; endsAt?: Date; meetingPoint?: string | null; location?: string | null; organizer?: string | null; description?: string | null; responsibleId?: string | null;
  requirements?: { id?: string; label: string; count: number; functionKey: string | null; qualTypeIds: string[] }[];
}

export function ShiftForm({ action, defaults = {}, units, qualTypes, events, helpers, submit, children }: {
  action: (p: FormState, f: FormData) => Promise<FormState>; defaults?: ShiftFormDefaults; units: { id: string; name: string }[];
  qualTypes: { id: string; name: string }[]; events: { id: string; name: string; unitId: string }[]; helpers: { id: string; name: string }[]; submit: string; children?: ReactNode;
}) {
  const d = defaults;
  return (
    <ActionForm action={action} className="space-y-5">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <Field label="Name des Dienstes" required className="sm:col-span-2"><input className="input" name="name" required maxLength={160} defaultValue={d.name} placeholder="z. B. Sanitätsdienst Stadtfest" /></Field>
        <Field label="Dienstart" required>
          <select className="input" name="kind" defaultValue={d.kind ?? "SANITAETSDIENST"}>{Object.entries(SHIFT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="Einheit" required>
          {d.id ? <><input type="hidden" name="unitId" value={d.unitId} /><input className="input" disabled value={units.find((u) => u.id === d.unitId)?.name ?? ""} /></> : (
            <select className="input" name="unitId" defaultValue={d.unitId} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          )}
        </Field>
        <Field label="Beginn" required><input className="input" type="datetime-local" name="startsAt" required defaultValue={toBerlinInput(d.startsAt)} /></Field>
        <Field label="Ende" required><input className="input" type="datetime-local" name="endsAt" required defaultValue={toBerlinInput(d.endsAt)} /></Field>
        <Field label="Treffpunkt"><input className="input" name="meetingPoint" defaultValue={d.meetingPoint ?? ""} /></Field>
        <Field label="Einsatzort"><input className="input" name="location" defaultValue={d.location ?? ""} /></Field>
        <Field label="Veranstalter"><input className="input" name="organizer" defaultValue={d.organizer ?? ""} /></Field>
        <Field label="Verantwortliche Person">
          <select className="input" name="responsibleId" defaultValue={d.responsibleId ?? ""}><option value="">—</option>{helpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
        </Field>
        <Field label="Veranstaltung (optional)" className="sm:col-span-2">
          <select className="input" name="eventId" defaultValue={d.eventId ?? ""}><option value="">— keine —</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
        </Field>
        <Field label="Beschreibung" className="sm:col-span-2"><textarea className="input" name="description" maxLength={4000} defaultValue={d.description ?? ""} /></Field>
      </div>
      <div className="card card-pad">
        <h2 className="card-title mb-1">Benötigte Besetzung</h2>
        <p className="mb-3 text-sm text-fg-muted">Lege Positionen mit Anzahl, Funktion und Qualifikationen fest. Nur passende Helfer werden später vorgeschlagen.</p>
        <RowsEditor
          name="requirements"
          initial={(d.requirements ?? []).map((r) => ({ id: r.id ?? "", label: r.label, count: r.count, functionKey: r.functionKey ?? "", qualTypeIds: r.qualTypeIds }))}
          blank={{ id: "", label: "", count: 1, functionKey: "", qualTypeIds: [] as string[] }}
          addLabel="Position hinzufügen"
          columns={[
            { key: "label", label: "Bezeichnung", type: "text", width: "sm:col-span-3", placeholder: "z. B. Rettungssanitäter" },
            { key: "count", label: "Anzahl", type: "number", width: "sm:col-span-1", min: 1, max: 200 },
            { key: "functionKey", label: "Funktion", type: "select", width: "sm:col-span-2", options: FUNCTIONS.map((f) => ({ value: f.key, label: f.label })) },
            { key: "qualTypeIds", label: "Benötigte Qualifikationen (alle)", type: "multiselect", width: "sm:col-span-6", options: qualTypes.map((q) => ({ value: q.id, label: q.name })) },
          ]}
        />
      </div>
      {children}
      <div className="flex flex-wrap gap-3"><SubmitButton>{submit}</SubmitButton></div>
    </ActionForm>
  );
}
