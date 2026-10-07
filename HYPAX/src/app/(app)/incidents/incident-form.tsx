import { ActionForm, RowsEditor, SubmitButton } from "@/components/forms";
import { Field, Notice } from "@/components/ui";
import { toBerlinInput } from "@/lib/dates";
import { INCIDENT_PRIVACY_NOTICE } from "@/server/services/incidents";
import type { FormState } from "@/server/action";

export function IncidentForm({ action, units, helpers, vehicles, materials, d, submit }: {
  action: (p: FormState, f: FormData) => Promise<FormState>; units: { id: string; name: string }[]; helpers: { id: string; name: string }[]; vehicles: { id: string; name: string }[]; materials: { id: string; name: string }[]; submit: string;
  d?: { id?: string; unitId?: string; number?: string; kind?: string; alertedAt?: Date | null; startedAt?: Date; endedAt?: Date | null; location?: string | null; documentation?: string | null; helpers?: { helperId: string; role: string | null }[]; vehicleIds?: string[]; materials?: { materialId: string; quantity: number }[] };
}) {
  const x = d ?? {};
  return (
    <ActionForm action={action} className="space-y-5">
      {x.id && <input type="hidden" name="id" value={x.id} />}
      <Notice tone="info">🔒 {INCIDENT_PRIVACY_NOTICE}</Notice>
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <Field label="Einheit" required>{x.id ? <><input type="hidden" name="unitId" value={x.unitId} /><input disabled className="input" value={units.find((u) => u.id === x.unitId)?.name ?? ""} /></> : <select name="unitId" className="input" defaultValue={x.unitId} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}</Field>
        <Field label="Einsatznummer" hint="Leer = automatisch (JJJJ-NNN)"><input name="number" className="input" defaultValue={x.number} /></Field>
        <Field label="Einsatzart" required><input name="kind" className="input" required defaultValue={x.kind} placeholder="z. B. Sanitätsdienst, Betreuung, Übung" /></Field>
        <Field label="Einsatzort"><input name="location" className="input" defaultValue={x.location ?? ""} /></Field>
        <Field label="Alarmierungszeit"><input type="datetime-local" name="alertedAt" className="input" defaultValue={toBerlinInput(x.alertedAt)} /></Field>
        <Field label="Einsatzbeginn" required><input type="datetime-local" name="startedAt" className="input" required defaultValue={toBerlinInput(x.startedAt ?? new Date())} /></Field>
        <Field label="Einsatzende"><input type="datetime-local" name="endedAt" className="input" defaultValue={toBerlinInput(x.endedAt)} /></Field>
        <Field label="Einsatzdokumentation (ohne Patientendaten)" className="sm:col-span-2"><textarea name="documentation" className="input" maxLength={8000} defaultValue={x.documentation ?? ""} /></Field>
      </div>
      <div className="card card-pad"><h2 className="card-title mb-3">Beteiligte Helfer</h2>
        <RowsEditor name="helpers" initial={(x.helpers ?? []).map((h) => ({ helperId: h.helperId, role: h.role ?? "" }))} blank={{ helperId: "", role: "" }} addLabel="Helfer hinzufügen" columns={[{ key: "helperId", label: "Helfer", type: "select", width: "sm:col-span-3", options: helpers.map((h) => ({ value: h.id, label: h.name })) }, { key: "role", label: "Funktion im Einsatz", type: "text", width: "sm:col-span-3" }]} /></div>
      <div className="card card-pad"><h2 className="card-title mb-3">Fahrzeuge</h2><div className="grid gap-1 sm:grid-cols-2">{vehicles.length === 0 && <p className="text-sm text-fg-muted">Keine Fahrzeuge.</p>}{vehicles.map((v) => <label key={v.id} className="flex min-h-[32px] items-center gap-2 text-sm"><input type="checkbox" name="vehicleIds[]" value={v.id} defaultChecked={x.vehicleIds?.includes(v.id)} className="h-4 w-4" />{v.name}</label>)}</div></div>
      <div className="card card-pad"><h2 className="card-title mb-3">Material</h2>
        <RowsEditor name="materials" initial={(x.materials ?? []).map((m) => ({ ...m }))} blank={{ materialId: "", quantity: 1 }} addLabel="Material hinzufügen" columns={[{ key: "materialId", label: "Material", type: "select", width: "sm:col-span-4", options: materials.map((m) => ({ value: m.id, label: m.name })) }, { key: "quantity", label: "Menge", type: "number", width: "sm:col-span-2", min: 1 }]} /></div>
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  );
}
