import { Field } from "@/components/ui";
import { VEHICLE_STATUS_LABEL } from "@/lib/constants";
import { toDateOnly } from "@/lib/dates";

export function VehicleFields({ v, units }: { v?: Record<string, unknown>; units?: { id: string; name: string }[] }) {
  const s = (k: string) => (v?.[k] as string | null) ?? "";
  const d = (k: string) => toDateOnly(v?.[k] as Date | null);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {units && <Field label="Einheit" required><select name="unitId" className="input" required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
      <Field label="Fahrzeugname" required><input className="input" name="name" required defaultValue={s("name")} placeholder="z. B. RTW 1" /></Field>
      <Field label="Funkrufname"><input className="input" name="callSign" defaultValue={s("callSign")} /></Field>
      <Field label="Kennzeichen"><input className="input" name="plate" defaultValue={s("plate")} /></Field>
      <Field label="Fahrzeugtyp"><input className="input" name="type" defaultValue={s("type")} placeholder="RTW, KTW, MTW …" /></Field>
      <Field label="Standort"><input className="input" name="location" defaultValue={s("location")} /></Field>
      <Field label="Kilometerstand"><input className="input" type="number" min={0} name="odometerKm" defaultValue={(v?.odometerKm as number | null) ?? ""} /></Field>
      <Field label="Status"><select name="status" className="input" defaultValue={s("status") || "EINSATZBEREIT"}>{Object.entries(VEHICLE_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="TÜV fällig"><input className="input" type="date" name="tuvDue" defaultValue={d("tuvDue")} /></Field>
      <Field label="HU fällig"><input className="input" type="date" name="huDue" defaultValue={d("huDue")} /></Field>
      <Field label="Versicherung bis"><input className="input" type="date" name="insuranceDue" defaultValue={d("insuranceDue")} /></Field>
      <Field label="Notizen" className="sm:col-span-2"><textarea className="input" name="notes" defaultValue={s("notes")} /></Field>
    </div>
  );
}
