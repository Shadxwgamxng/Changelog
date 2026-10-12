import { ActionForm, ChipSelect, SubmitButton } from "@/components/forms";
import { Field } from "@/components/ui";
import { FUNCTIONS, HELPER_STATUS_LABEL, SHIFT_KIND_LABEL } from "@/lib/constants";
import { toDateOnly } from "@/lib/dates";
import type { FormState } from "@/server/action";
import type { HelperView } from "@/server/services/helpers";

const WEEKDAYS = [["1", "Mo"], ["2", "Di"], ["3", "Mi"], ["4", "Do"], ["5", "Fr"], ["6", "Sa"], ["0", "So"]];

/** Felder erscheinen nur, wenn der Benutzer sie sehen darf (Serverdaten enthalten sie sonst gar nicht). */
export function HelperForm({ action, h, units, groups, submit }: { action: (p: FormState, f: FormData) => Promise<FormState>; h?: HelperView & Record<string, unknown>; units: { id: string; name: string }[]; groups: string[]; submit: string }) {
  const v = (k: string) => (h?.[k] as string | null | undefined) ?? "";
  const canContact = !h || h.access.contact;
  const canSens = !h || h.access.sensitive;
  const date = (k: string) => toDateOnly(h?.[k] as Date | undefined);
  return (
    <ActionForm action={action} className="space-y-5">
      {h && <input type="hidden" name="id" value={h.id} />}
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <h2 className="card-title sm:col-span-2">Stammdaten</h2>
        <Field label="Vorname" required><input className="input" name="firstName" required defaultValue={v("firstName")} /></Field>
        <Field label="Nachname" required><input className="input" name="lastName" required defaultValue={v("lastName")} /></Field>
        {canSens && <Field label="Geburtsdatum"><input className="input" type="date" name="birthDate" defaultValue={date("birthDate")} /></Field>}
        {canContact && <Field label="Mitgliedsnummer / interne Kennung"><input className="input" name="memberNumber" defaultValue={v("memberNumber")} /></Field>}
        {canContact && <><Field label="E-Mail"><input className="input" type="email" name="email" defaultValue={v("email")} autoComplete="off" /></Field>
        <Field label="Telefon"><input className="input" type="tel" name="phone" defaultValue={v("phone")} /></Field>
        <Field label="Straße und Hausnummer" className="sm:col-span-2"><input className="input" name="street" defaultValue={v("street")} /></Field>
        <Field label="PLZ"><input className="input" name="zip" defaultValue={v("zip")} /></Field>
        <Field label="Ort"><input className="input" name="city" defaultValue={v("city")} /></Field>
        <Field label="Eintrittsdatum"><input className="input" type="date" name="joinedAt" defaultValue={date("joinedAt")} /></Field></>}
      </div>
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <h2 className="card-title sm:col-span-2">Organisation</h2>
        <Field label="Einheit" required>
          <select className="input" name="unitId" defaultValue={h?.unitId} required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        </Field>
        <Field label="Status"><select className="input" name="status" defaultValue={(h?.status as string) === "ANONYMISIERT" ? "AKTIV" : h?.status ?? "AKTIV"}>{Object.entries(HELPER_STATUS_LABEL).filter(([k]) => k !== "ANONYMISIERT").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Gruppe" hint="Freitext, z. B. „Gruppe 1“. Wird für Alarmierung und Nachrichten genutzt."><input className="input" name="groupName" list="groups" defaultValue={v("groupName")} /><datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist></Field>
        <Field label="Dienststellung"><input className="input" name="dienststellung" defaultValue={v("dienststellung")} placeholder="z. B. Helfer, Gruppenführer" /></Field>
        <Field label="Führungsfunktion"><input className="input" name="leadershipRole" defaultValue={v("leadershipRole")} placeholder="z. B. stellv. Bereitschaftsleiter" /></Field>
        {canContact && h && <Field label="Austrittsdatum"><input className="input" type="date" name="leftAt" defaultValue={date("leftAt")} /></Field>}
        <div className="sm:col-span-2"><span className="label">Funktionen (Mehrfachauswahl)</span><ChipSelect name="functions" options={FUNCTIONS.map((f) => ({ value: f.key, label: f.label }))} defaultValue={(h?.functions as string[]) ?? ["HELFER"]} /></div>
      </div>
      <div className="card card-pad grid gap-4 sm:grid-cols-2">
        <h2 className="card-title sm:col-span-2">Planungswünsche</h2>
        <Field label="Max. Dienste pro Monat" hint="Leer = unbegrenzt"><input className="input" type="number" min={0} max={60} name="maxShiftsPerMonth" defaultValue={(h?.maxShiftsPerMonth as number | null) ?? ""} /></Field>
        <Field label="Mindest-Ruhezeit zwischen Diensten (Std.)"><input className="input" type="number" min={0} max={48} name="minRestHours" defaultValue={(h?.minRestHours as number) ?? 11} /></Field>
        <div className="sm:col-span-2"><span className="label">Bevorzugte Dienstarten</span><ChipSelect name="preferredKinds" options={Object.entries(SHIFT_KIND_LABEL).map(([value, label]) => ({ value, label }))} defaultValue={(h?.preferredKinds as string[]) ?? []} /></div>
        <div className="sm:col-span-2"><span className="label">Bevorzugte Wochentage</span><ChipSelect name="preferredWeekdays" options={WEEKDAYS.map(([value, label]) => ({ value, label }))} defaultValue={((h?.preferredWeekdays as number[]) ?? []).map(String)} /></div>
      </div>
      {canSens && (
        <div className="card card-pad">
          <h2 className="card-title mb-3">Interne Notizen <span className="ml-2 normal-case text-fg-subtle">nur für berechtigte Führungskräfte sichtbar</span></h2>
          <textarea className="input" name="internalNotes" maxLength={4000} defaultValue={v("internalNotes")} aria-label="Interne Notizen" />
        </div>
      )}
      <SubmitButton>{submit}</SubmitButton>
    </ActionForm>
  );
}
