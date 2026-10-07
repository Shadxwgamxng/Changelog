import { ActionForm, RowsEditor, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { EVENT_TASK_LABEL } from "@/lib/constants";
import { toBerlinInput } from "@/lib/dates";
import type { FormState } from "@/server/action";

export function EventForm({ action, units, defaults, submit }: { action: (p: FormState, f: FormData) => Promise<FormState>; units: { id: string; name: string }[]; submit: string; defaults?: { id?: string; unitId?: string; name?: string; description?: string | null; startsAt?: Date; endsAt?: Date; location?: string | null; organizer?: string | null; tasks?: { kind: string; title: string }[] } }) {
  const d = defaults ?? {};
  return (
    <ActionForm action={action} className="space-y-5">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <Field label="Name der Veranstaltung" required className="sm:col-span-2"><input className="input" name="name" required defaultValue={d.name} placeholder="z. B. Stadtfest Musterstadt" /></Field>
        <Field label="Einheit" required>{d.id ? <><input type="hidden" name="unitId" value={d.unitId} /><input disabled className="input" value={units.find((u) => u.id === d.unitId)?.name ?? ""} /></> : <select className="input" name="unitId" defaultValue={d.unitId} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}</Field>
        <Field label="Veranstalter"><input className="input" name="organizer" defaultValue={d.organizer ?? ""} /></Field>
        <Field label="Beginn" required><input className="input" type="datetime-local" name="startsAt" required defaultValue={toBerlinInput(d.startsAt)} /></Field>
        <Field label="Ende" required><input className="input" type="datetime-local" name="endsAt" required defaultValue={toBerlinInput(d.endsAt)} /></Field>
        <Field label="Ort" className="sm:col-span-2"><input className="input" name="location" defaultValue={d.location ?? ""} /></Field>
        <Field label="Beschreibung" className="sm:col-span-2"><textarea className="input" name="description" defaultValue={d.description ?? ""} /></Field>
      </div>
      <div className="card card-pad">
        <h2 className="card-title mb-3">Aufgaben</h2>
        <RowsEditor name="tasks" initial={(d.tasks ?? []).map((t) => ({ kind: t.kind, title: t.title }))} blank={{ kind: "SANITAETSDIENST", title: "" }} addLabel="Aufgabe hinzufügen"
          columns={[{ key: "kind", label: "Bereich", type: "select", width: "sm:col-span-2", options: Object.entries(EVENT_TASK_LABEL).map(([value, label]) => ({ value, label })) }, { key: "title", label: "Aufgabe", type: "text", width: "sm:col-span-4" }]} />
      </div>
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  );
}
