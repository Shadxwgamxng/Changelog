import { FileText } from "lucide-react";
import { requireCtx } from "@/server/session";
import { forbidden } from "@/server/errors";
import { getCertificateTemplate } from "@/server/services/certificate-template";
import { Card, Field, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { CERT_FONTS, CERT_PLACEHOLDERS } from "@/lib/certificate-template";
import { resetTemplateAction, saveTemplateAction } from "./actions";

export const metadata = { title: "Zertifikat-Vorlage" };

function ImageField({ slot, label, hint, present }: { slot: string; label: string; hint: string; present: boolean }) {
  return (
    <Field label={label} hint={hint}>
      <input type="file" name={`${slot}File`} accept="image/png,image/jpeg" className="input !py-1.5 text-sm" />
      {present && <label className="mt-1.5 flex items-center gap-2 text-xs text-fg-muted"><span className="text-ok">✓ Bild hinterlegt</span> · <input type="checkbox" name={`${slot}Remove`} className="h-3.5 w-3.5" /> entfernen</label>}
    </Field>
  );
}

export default async function CertificateTemplatePage() {
  const ctx = await requireCtx();
  if (!ctx.all) throw forbidden();
  const t = await getCertificateTemplate();
  return (
    <>
      <PageHeader title="Zertifikat-Vorlage" subtitle="So sehen die Zertifikate aus, die bei bestandenen Lehrgängen ausgestellt werden (DIN A4 hochkant). Änderungen gelten auch für bereits ausgestellte Zertifikate beim nächsten Download."
        actions={<><a className="btn btn-primary" href="/api/certificates/preview" target="_blank" rel="noreferrer"><FileText className="h-4 w-4" />Vorschau (PDF)</a><a className="btn" href="/api/certificates/preview?widerrufen=1" target="_blank" rel="noreferrer">Vorschau widerrufen</a></>} />
      <ActionForm action={saveTemplateAction} className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Kopf & Text">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organisationsname (Kopfzeile)" hint="Leer = Name der ausstellenden Einheit."><input name="orgName" className="input" maxLength={120} defaultValue={t.orgName ?? ""} placeholder="z. B. Rettungsdienst Los Santos" /></Field>
              <Field label="Titel" required><input name="title" className="input" maxLength={80} required defaultValue={t.title} /></Field>
              <Field label="Text" className="sm:col-span-2" hint="Eine Zeile pro Absatz. # = sehr groß, ## = groß, ### = fett, [[ … ]] = nur anzeigen, wenn die Platzhalter darin gefüllt sind.">
                <textarea name="body" className="input font-mono !text-[13px]" rows={12} maxLength={3000} required defaultValue={t.body} />
              </Field>
              <Field label="Fußzeile (optional)" className="sm:col-span-2" hint="Kleiner Text ganz unten, z. B. Anschrift oder Website. Platzhalter möglich."><input name="footerText" className="input" maxLength={300} defaultValue={t.footerText ?? ""} /></Field>
            </div>
          </Card>
          <Card title="Unterschriften">
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="space-y-3"><legend className="label">Links</legend>
                <input name="sig1Label" className="input" maxLength={60} defaultValue={t.sig1Label ?? ""} placeholder="Bezeichnung, z. B. Lehrgangsleitung" aria-label="Bezeichnung links" />
                <input name="sig1Name" className="input" maxLength={120} defaultValue={t.sig1Name ?? ""} placeholder="Name oder {lehrgangsleitung}" aria-label="Name links" />
                <ImageField slot="sig1" label="Unterschrift als Bild (optional)" hint="PNG mit transparentem Hintergrund, max. 3 MB." present={!!t.sig1Image} />
              </fieldset>
              <fieldset className="space-y-3"><legend className="label">Rechts</legend>
                <input name="sig2Label" className="input" maxLength={60} defaultValue={t.sig2Label ?? ""} placeholder="Bezeichnung, z. B. Leitung" aria-label="Bezeichnung rechts" />
                <input name="sig2Name" className="input" maxLength={120} defaultValue={t.sig2Name ?? ""} placeholder="Name oder {aussteller}" aria-label="Name rechts" />
                <ImageField slot="sig2" label="Unterschrift als Bild (optional)" hint="PNG mit transparentem Hintergrund, max. 3 MB." present={!!t.sig2Image} />
              </fieldset>
            </div>
            <p className="mt-3 text-xs text-fg-subtle">Bleiben Bezeichnung, Name und Bild einer Seite leer, entfällt diese Unterschrift.</p>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Gestaltung">
            <div className="space-y-4">
              <Field label="Logo">
                <select name="logoMode" className="input" defaultValue={t.logoMode}><option value="STANDARD">EmergencyForge-Logo</option><option value="EIGENES">Eigenes Logo</option><option value="KEINES">Kein Logo</option></select>
              </Field>
              <ImageField slot="logo" label="Eigenes Logo" hint="PNG/JPG, max. 3 MB. Wird bei „Eigenes Logo“ verwendet." present={!!t.logo} />
              <ImageField slot="background" label="Hintergrundbild (optional)" hint="Ganzseitig, ideal 2480 × 3508 px (A4 hochkant, 300 dpi), z. B. ein Urkundenrahmen." present={!!t.background} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Akzentfarbe"><input type="color" name="accentColor" className="input !h-10 !p-1" defaultValue={t.accentColor} /></Field>
                <Field label="Textfarbe"><input type="color" name="textColor" className="input !h-10 !p-1" defaultValue={t.textColor} /></Field>
              </div>
              <Field label="Schrift"><select name="font" className="input" defaultValue={t.font}>{Object.entries(CERT_FONTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showFrame" defaultChecked={t.showFrame} className="h-4 w-4" /> Rahmen und Farbbalken</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showQr" defaultChecked={t.showQr} className="h-4 w-4" /> QR-Code zur Echtheitsprüfung</label>
            </div>
          </Card>
          <Card title="Platzhalter">
            <ul className="space-y-1 text-xs">{Object.entries(CERT_PLACEHOLDERS).map(([k, v]) => <li key={k}><code className="text-brand-600">{`{${k}}`}</code> <span className="text-fg-muted">– {v}</span></li>)}</ul>
          </Card>
          <div className="flex flex-wrap gap-2"><SubmitButton>Speichern</SubmitButton></div>
        </div>
      </ActionForm>
      <div className="mt-6"><ActionButton action={resetTemplateAction} label="Auf Standard zurücksetzen" variant="danger" small={false} confirm="Vorlage inkl. aller Bilder auf den Standard zurücksetzen?" /></div>
    </>
  );
}
