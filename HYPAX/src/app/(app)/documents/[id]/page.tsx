import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireCtx } from "@/server/session";
import { getDocument } from "@/server/services/documents";
import { Badge, Card, Dl, Field, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { DOC_ACCESS_LABEL, DOC_CATEGORY_LABEL } from "@/lib/constants";
import { fmtDateTime, toDateOnly } from "@/lib/dates";
import { deleteDocAction, newVersionAction, updateMetaAction } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const d = await getDocument(await requireCtx(), (await params).id).catch(() => null);
  return { title: d?.title ?? "Dokument" };
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const d = await getDocument(ctx, id).catch(() => null);
  if (!d) notFound();
  const canEdit = d.canManage || (d.ownerHelperId && d.ownerHelperId === ctx.helperId);
  const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  return (
    <>
      <PageHeader title={d.title} back={{ href: "/documents", label: "Dokumente" }} subtitle={`${d.unitName}${d.ownerName ? ` · ${d.ownerName}` : ""}`} actions={<a className="btn btn-primary" href={`/api/v1/documents/${id}/download`}><Download className="h-4 w-4" />Herunterladen (v{d.currentVersion})</a>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Versionen" pad={false}>
            <ul className="divide-y divide-line">{d.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><span><strong>Version {v.version}</strong> {v.version === d.currentVersion && <Badge tone="ok">aktuell</Badge>}<span className="block text-xs text-fg-muted">{v.filename} · {kb(v.size)} · {fmtDateTime(v.uploadedAt)}</span><span className="block font-mono text-[11px] text-fg-subtle">SHA-256 {v.sha256.slice(0, 16)}…</span></span><a className="btn btn-sm" href={`/api/v1/documents/${id}/download?version=${v.version}`}>Download</a></li>
            ))}</ul>
          </Card>
          {canEdit && <Card title="Neue Version hochladen"><ActionForm action={newVersionAction} className="flex flex-wrap items-end gap-3" resetOnSuccess><input type="hidden" name="id" value={id} /><input type="file" name="file" required className="input !w-auto !py-1.5" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.xlsx" /><SubmitButton>Hochladen</SubmitButton></ActionForm></Card>}
        </div>
        <div className="space-y-5">
          <Card title="Eigenschaften"><Dl items={[["Kategorie", DOC_CATEGORY_LABEL[d.category]], ["Zugriff", DOC_ACCESS_LABEL[d.access]], ["Gültig bis", d.expiresAt ? toDateOnly(d.expiresAt) : null], ["Angelegt", fmtDateTime(d.createdAt)]]} /><p className="mt-3 text-xs text-fg-subtle">Jeder Abruf wird im Audit-Log protokolliert.</p></Card>
          {d.canManage && (
            <Card title="Bearbeiten"><ActionForm action={updateMetaAction} className="space-y-3"><input type="hidden" name="id" value={id} /><Field label="Titel"><input name="title" className="input" defaultValue={d.title} /></Field><Field label="Kategorie"><select name="category" className="input" defaultValue={d.category}>{Object.entries(DOC_CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field><Field label="Wer darf lesen?"><select name="access" className="input" defaultValue={d.access}>{Object.entries(DOC_ACCESS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field><Field label="Gültig bis"><input type="date" name="expiresAt" className="input" defaultValue={toDateOnly(d.expiresAt)} /></Field><SubmitButton>Speichern</SubmitButton></ActionForm></Card>
          )}
          {canEdit && <ActionButton action={deleteDocAction} fields={{ id }} variant="ghost" small={false} label="Dokument löschen" confirm="Dokument mit allen Versionen endgültig löschen?" />}
        </div>
      </div>
    </>
  );
}
