import { requireCtx } from "@/server/session";
import { forbidden } from "@/server/errors";
import { certificateIssueOptions } from "@/server/services/courses";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { issueCertificateAction } from "../actions";
import { QUAL_CATEGORY_LABEL } from "@/lib/constants";

export const metadata = { title: "Zertifikat ausstellen" };

export default async function IssueCertificatePage({ searchParams }: { searchParams: Promise<{ helper?: string }> }) {
  const ctx = await requireCtx();
  const o = await certificateIssueOptions(ctx);
  if (!o) throw forbidden();
  const { helper } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const back = helper ? { href: `/helpers/${helper}?tab=dokumente`, label: "Personalakte" } : { href: "/documents", label: "Dokumente" };
  return (
    <>
      <PageHeader title="Zertifikat ausstellen" subtitle="Für eine Person – auch ohne Lehrgang in HelferNet (z. B. externe Ausbildung oder Nachtrag). Das PDF wird in der Personalakte abgelegt." back={back} />
      <ActionForm action={issueCertificateAction} className="grid gap-5 lg:grid-cols-3">
        <Card title="Angaben" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Person" required className="sm:col-span-2">
              <select name="helperId" className="input" required defaultValue={helper ?? ""}>
                <option value="" disabled>— bitte wählen —</option>
                {o.helpers.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.unitName}</option>)}
              </select>
            </Field>
            <Field label="Ausbildung" required className="sm:col-span-2" hint="Aus der Liste unter Qualifikationen → Qualifikationsarten. Fehlt eine? Dort anlegen.">
              <select name="qualificationTypeId" className="input" required defaultValue="">
                <option value="" disabled>— bitte wählen —</option>
                {Object.entries(QUAL_CATEGORY_LABEL).map(([cat, label]) => {
                  const items = o.qualTypes.filter((q) => q.category === cat);
                  return items.length ? <optgroup key={cat} label={label}>{items.map((q) => <option key={q.id} value={q.id}>{q.name}{q.validityMonths ? ` (${q.validityMonths} Monate gültig)` : ""}</option>)}</optgroup> : null;
                })}
              </select>
            </Field>
            <Field label="Von" required><input type="date" name="startsAt" className="input" required defaultValue={today} /></Field>
            <Field label="Bis" required><input type="date" name="endsAt" className="input" required defaultValue={today} /></Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" name="addQualification" defaultChecked className="mt-0.5 h-4 w-4" /><span>Qualifikation im Profil eintragen <span className="block text-xs text-fg-subtle">Abwählen für eine reine Teilnahmebescheinigung – dann steht auch keine Qualifikation auf dem Zertifikat.</span></span></label>
            <Field label="Gültig bis (optional)" hint="Leer = aus der Gültigkeitsdauer der Ausbildung berechnet."><input type="date" name="validUntil" className="input" /></Field>
            <Field label="Ausbilder / Lehrgangsleitung (optional)" className="sm:col-span-2"><input name="instructors" className="input" maxLength={300} placeholder="z. B. Dr. M. Weber" /></Field>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Was passiert?">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
              <li>Zertifikat mit fortlaufender Nummer und Prüf-Link wird erstellt (Gestaltung laut Zertifikat-Vorlage).</li>
              <li>Das PDF landet als persönliches Dokument in der Personalakte.</li>
              <li>Die Qualifikation wird mit Gültigkeit im Profil eingetragen (abwählbar).</li>
              <li>Die Person wird benachrichtigt; alles wird im Audit-Log protokolliert.</li>
            </ul>
          </Card>
          <SubmitButton className="w-full" pendingText="Wird ausgestellt …">Zertifikat ausstellen</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
