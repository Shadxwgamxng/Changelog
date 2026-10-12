import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { helperOptions } from "@/server/services/helpers";
import { DOC_ACCESS_LABEL, DOC_CATEGORY_LABEL } from "@/lib/constants";
import { prisma } from "@/server/db";
import { uploadAction } from "../actions";

export const metadata = { title: "Dokument hochladen" };

export default async function NewDocument({ searchParams }: { searchParams: Promise<{ helper?: string; vehicle?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const mgr = await unitsWith(ctx, "document.manage");
  const own = ctx.helperId ? await prisma.helper.findUnique({ where: { id: ctx.helperId }, select: { unitId: true, unit: { select: { name: true } } } }) : null;
  const units = mgr.length ? mgr : own ? [{ id: own.unitId, name: own.unit.name }] : [];
  const helpers = mgr.length ? await helperOptions(ctx) : [];
  const vehicle = sp.vehicle ? await prisma.vehicle.findUnique({ where: { id: sp.vehicle } }) : null;
  const personalOnly = !mgr.length;
  return (
    <>
      <PageHeader title="Dokument hochladen" back={{ href: "/documents", label: "Dokumente" }} subtitle="Erlaubt: PDF, PNG, JPG, TXT, DOCX, XLSX bis 10 MB. Der Inhalt wird verschlüsselt gespeichert." />
      <ActionForm action={uploadAction} className="card card-pad grid max-w-3xl gap-4 sm:grid-cols-2">
        <Field label="Titel" required className="sm:col-span-2"><input name="title" className="input" required maxLength={200} /></Field>
        <Field label="Einheit" required><select name="unitId" className="input" required>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Kategorie"><select name="category" className="input" defaultValue={personalOnly || sp.helper ? "QUALIFIKATIONSNACHWEIS" : vehicle ? "FAHRZEUG" : "INTERN"}>{Object.entries(DOC_CATEGORY_LABEL).filter(([k]) => !personalOnly || k === "QUALIFIKATIONSNACHWEIS").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Wer darf lesen?"><select name="access" className="input" defaultValue={personalOnly || sp.helper ? "PERSOENLICH" : "FUEHRUNG"}>{Object.entries(DOC_ACCESS_LABEL).filter(([k]) => !personalOnly || k === "PERSOENLICH").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Gültig bis (optional)" hint="Du wirst vor dem Ablauf erinnert."><input type="date" name="expiresAt" className="input" /></Field>
        {personalOnly ? <input type="hidden" name="ownerHelperId" value={ctx.helperId ?? ""} /> : (
          <Field label="Besitzer (für persönliche Dokumente)"><select name="ownerHelperId" className="input" defaultValue={sp.helper ?? ""}><option value="">— keiner —</option>{helpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
        )}
        {vehicle && <input type="hidden" name="vehicleId" value={vehicle.id} />}
        <Field label="Datei" required className="sm:col-span-2"><input type="file" name="file" required className="input !py-1.5" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx" /></Field>
        <div className="sm:col-span-2"><SubmitButton>Hochladen</SubmitButton></div>
      </ActionForm>
    </>
  );
}
