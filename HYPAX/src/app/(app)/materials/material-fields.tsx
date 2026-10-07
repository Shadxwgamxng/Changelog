import { Field } from "@/components/ui";
import { MATERIAL_STATUS_LABEL } from "@/lib/constants";
import { toDateOnly } from "@/lib/dates";

export function MaterialFields({ m, units, helpers }: { m?: Record<string, unknown>; units?: { id: string; name: string }[]; helpers: { id: string; name: string }[] }) {
  const s = (k: string) => (m?.[k] as string | null) ?? "";
  const d = (k: string) => toDateOnly(m?.[k] as Date | null);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {units && <Field label="Einheit" required><select name="unitId" className="input" required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}
      <Field label="Bezeichnung" required><input className="input" name="name" required defaultValue={s("name")} placeholder="z. B. AED, Sanitätsrucksack" /></Field>
      <Field label="Kategorie"><input className="input" name="category" list="mat-cats" defaultValue={s("category")} /><datalist id="mat-cats">{["Medizin", "Funk", "Rettung", "Verbrauchsmaterial", "Schutzkleidung", "Ausrüstung", "Fahrzeugequipment"].map((c) => <option key={c} value={c} />)}</datalist></Field>
      <Field label="Bestand"><input className="input" type="number" min={0} name="quantity" defaultValue={(m?.quantity as number) ?? 0} /></Field>
      <Field label="Mindestbestand" hint="Darunter wird gewarnt."><input className="input" type="number" min={0} name="minQuantity" defaultValue={(m?.minQuantity as number) ?? 0} /></Field>
      <Field label="Standort"><input className="input" name="location" defaultValue={s("location")} /></Field>
      <Field label="Seriennummer"><input className="input" name="serialNumber" defaultValue={s("serialNumber")} /></Field>
      <Field label="Status"><select name="status" className="input" defaultValue={s("status") || "OK"}>{Object.entries(MATERIAL_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Nächste Wartung"><input className="input" type="date" name="maintenanceDue" defaultValue={d("maintenanceDue")} /></Field>
      <Field label="Ablaufdatum"><input className="input" type="date" name="expiresAt" defaultValue={d("expiresAt")} /></Field>
      <Field label="Verantwortlicher"><select name="responsibleId" className="input" defaultValue={s("responsibleId")}><option value="">—</option>{helpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
      <Field label="Notizen" className="sm:col-span-2"><textarea className="input" name="notes" defaultValue={s("notes")} /></Field>
    </div>
  );
}
