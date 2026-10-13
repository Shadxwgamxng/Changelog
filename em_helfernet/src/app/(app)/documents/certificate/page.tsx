import { requireCtx } from "@/server/session";
import { forbidden } from "@/server/errors";
import { certificateIssueOptions } from "@/server/services/courses";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { issueCertificateAction } from "../actions";

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
            <Field label="Bezeichnung (Lehrgang/Ausbildung)" required className="sm:col-span-2"><input name="title" className="input" required maxLength={160} placeholder="z. B. Erste-Hilfe-Ausbildung (extern)" /></Field>
            <Field label="Von" required><input type="date" name="startsAt" className="input" required defaultValue={today} /></Field>
            <Field label="Bis" required><input type="date" name="endsAt" className="input" required defaultValue={today} /></Field>
            <Field label="Qualifikation eintragen (optional)" hint="Wird mit Gültigkeit im Profil eingetragen und steht auf dem Zertifikat.">
              <select name="qualificationTypeId" className="input" defaultValue=""><option value="">— keine —</option>{o.qualTypes.map((q) => <option key={q.id} value={q.id}>{q.name}{q.validityMonths ? ` (${q.validityMonths} Monate)` : ""}</option>)}</select>
            </Field>
            <Field label="Gültig bis (optional)" hint="Leer = aus der Qualifikation berechnet bzw. unbegrenzt."><input type="date" name="validUntil" className="input" /></Field>
            <Field label="Ausbilder / Lehrgangsleitung (optional)" className="sm:col-span-2"><input name="instructors" className="input" maxLength={300} placeholder="z. B. Dr. M. Weber" /></Field>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Was passiert?">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
              <li>Zertifikat mit fortlaufender Nummer und Prüf-Link wird erstellt (Gestaltung laut Zertifikat-Vorlage).</li>
              <li>Das PDF landet als persönliches Dokument in der Personalakte.</li>
              <li>Optional wird die Qualifikation eingetragen.</li>
              <li>Die Person wird benachrichtigt; alles wird im Audit-Log protokolliert.</li>
            </ul>
          </Card>
          <SubmitButton className="w-full" pendingText="Wird ausgestellt …">Zertifikat ausstellen</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
