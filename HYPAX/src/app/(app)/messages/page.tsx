import Link from "next/link";
import { requireCtx } from "@/server/session";
import { hasAnywhere, unitsWith, visibleUnits } from "@/server/context";
import { inbox, listAnnouncements, sentMessages } from "@/server/services/messages";
import { listShifts } from "@/server/services/shifts";
import { listGroups } from "@/server/services/helpers";
import { prisma } from "@/server/db";
import { Badge, Card, Empty, Field, PageHeader, Tabs } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { announceAction, deleteAnnouncementAction, sendMessageAction } from "./actions";

export const metadata = { title: "Nachrichten" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ tab?: string; to?: string; shift?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const canAnnounce = hasAnywhere(ctx, "message.announce");
  const tab = sp.tab ?? "posteingang";
  const tabs = [{ key: "posteingang", label: "Posteingang", href: "/messages" }, { key: "gesendet", label: "Gesendet", href: "/messages?tab=gesendet" }, { key: "neu", label: "Neue Nachricht", href: "/messages?tab=neu" }, { key: "announcements", label: "Bekanntmachungen", href: "/messages?tab=announcements" }];
  return (
    <>
      <PageHeader title="Nachrichten" subtitle="Interne Kommunikation ohne WhatsApp-Gruppen." />
      <Tabs tabs={tabs} active={tabs.some((t) => t.key === tab) ? tab : "posteingang"} />
      {tab === "posteingang" && <Inbox ctx={ctx} />}
      {tab === "gesendet" && <Sent ctx={ctx} />}
      {tab === "neu" && <Compose ctx={ctx} to={sp.to} shift={sp.shift} />}
      {tab === "announcements" && <Announcements ctx={ctx} canAnnounce={canAnnounce} />}
    </>
  );
}

async function Inbox({ ctx }: { ctx: Awaited<ReturnType<typeof requireCtx>> }) {
  const msgs = await inbox(ctx);
  if (!msgs.length) return <Empty title="Keine Nachrichten" />;
  return <Card pad={false}><ul className="divide-y divide-line">{msgs.map((m) => <li key={m.id}><Link href={`/messages/${m.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-fill-1"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.read ? "bg-transparent" : "bg-brand-600"}`} aria-label={m.read ? "gelesen" : "ungelesen"} /><span className="min-w-0 flex-1"><span className={`block truncate ${m.read ? "" : "font-semibold"}`}>{m.subject}</span><span className="block truncate text-sm text-fg-muted">{m.from} · {m.preview}</span></span><span className="shrink-0 text-xs text-fg-subtle">{fmtDateTime(m.createdAt)}</span></Link></li>)}</ul></Card>;
}

async function Sent({ ctx }: { ctx: Awaited<ReturnType<typeof requireCtx>> }) {
  const msgs = await sentMessages(ctx);
  if (!msgs.length) return <Empty title="Noch nichts gesendet" />;
  return <Card pad={false}><ul className="divide-y divide-line">{msgs.map((m) => <li key={m.id}><Link href={`/messages/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-fill-1"><span className="min-w-0"><span className="block truncate font-medium">{m.subject}</span><span className="text-sm text-fg-muted">An {m.audience}</span></span><span className="shrink-0 text-right text-xs text-fg-subtle">{fmtDateTime(m.createdAt)}<br />{m.readBy}/{m.recipients} gelesen</span></Link></li>)}</ul></Card>;
}

async function Compose({ ctx, to, shift }: { ctx: Awaited<ReturnType<typeof requireCtx>>; to?: string; shift?: string }) {
  const [sendUnits, vis, groups, shifts] = await Promise.all([unitsWith(ctx, "message.send"), visibleUnits(ctx), listGroups(ctx), listShifts(ctx, { from: new Date(Date.now() - 86_400_000), take: 40 })]);
  const people = await prisma.helper.findMany({ where: { userId: { not: null }, status: "AKTIV", id: { not: ctx.helperId ?? "-" }, unitId: { in: vis.map((u) => u.id) } }, select: { userId: true, firstName: true, lastName: true }, orderBy: [{ lastName: "asc" }], take: 400 });
  const bulk = sendUnits.length > 0;
  return (
    <ActionForm action={sendMessageAction} className="card card-pad grid max-w-3xl gap-4 sm:grid-cols-2">
      <Field label="Empfängerkreis" required className="sm:col-span-2"><select name="kind" className="input" defaultValue={shift ? "SHIFT" : to ? "USERS" : "USERS"}>
        <option value="USERS">Einzelne Personen</option>{bulk && <><option value="UNIT">Gesamte Einheit</option><option value="GROUP">Gruppe einer Einheit</option></>}{(bulk || shifts.length > 0) && <option value="SHIFT">Dienstbesatzung</option>}<option value="LEADERS">Führungskräfte einer Einheit</option></select></Field>
      <Field label="Personen (bei „Einzelne Personen“)" className="sm:col-span-2"><select name="userIds[]" multiple size={6} className="input !h-auto">{people.map((p) => <option key={p.userId} value={p.userId!} selected={p.userId === to}>{p.lastName}, {p.firstName}</option>)}</select><span className="hint block">Mehrfachauswahl mit Strg/Cmd.</span></Field>
      <Field label="Einheit (Einheit / Gruppe / Führungskräfte)"><select name="unitId" className="input">{(bulk ? sendUnits : vis).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
      <Field label="Gruppe"><select name="groupName" className="input"><option value="">—</option>{groups.map((g) => <option key={g}>{g}</option>)}</select></Field>
      <Field label="Dienst (bei „Dienstbesatzung“)"><select name="shiftId" className="input" defaultValue={shift}><option value="">—</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name} · {fmtDate(s.startsAt)}</option>)}</select></Field>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="includeSubunits" className="h-4 w-4" /> inkl. Untereinheiten</label>
      <Field label="Betreff" required className="sm:col-span-2"><input name="subject" className="input" required maxLength={160} /></Field>
      <Field label="Nachricht" required className="sm:col-span-2"><textarea name="body" className="input !min-h-[140px]" required maxLength={8000} /></Field>
      <div className="sm:col-span-2"><SubmitButton>Senden</SubmitButton></div>
    </ActionForm>
  );
}

async function Announcements({ ctx, canAnnounce }: { ctx: Awaited<ReturnType<typeof requireCtx>>; canAnnounce: boolean }) {
  const [list, units] = await Promise.all([listAnnouncements(ctx, { includeExpired: canAnnounce, take: 50 }), canAnnounce ? unitsWith(ctx, "message.announce") : []]);
  return (
    <div className="space-y-5">
      {canAnnounce && (
        <Card title="Bekanntmachung veröffentlichen">
          <ActionForm action={announceAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
            <Field label="Einheit"><select name="unitId" className="input">{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
            <Field label="Titel" required><input name="title" className="input" required maxLength={160} /></Field>
            <Field label="Text" required className="sm:col-span-2"><textarea name="body" className="input" required maxLength={4000} /></Field>
            <Field label="Läuft ab (optional)"><input type="datetime-local" name="expiresAt" className="input" /></Field>
            <div className="flex items-end gap-5 pb-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="important" className="h-4 w-4" /> Wichtig</label><label className="flex items-center gap-2"><input type="checkbox" name="pinned" className="h-4 w-4" /> Anheften</label></div>
            <div className="sm:col-span-2"><SubmitButton>Veröffentlichen</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
      {list.length === 0 ? <Empty title="Keine Bekanntmachungen" /> : list.map((a) => (
        <div key={a.id} className={`card p-4 ${a.important ? "!border-warn/50" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{a.important ? "📢 Wichtige Information: " : "📢 "}{a.title}</p><div className="flex gap-1.5">{a.pinned && <Badge>Angeheftet</Badge>}{a.expiresAt && a.expiresAt < new Date() && <Badge tone="neutral">Abgelaufen</Badge>}</div></div>
          <p className="prose-plain mt-2">{a.body}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-fg-subtle"><span>{a.unitName} · {fmtDate(a.publishAt)}</span>{a.canDelete && <ActionButton action={deleteAnnouncementAction} fields={{ id: a.id }} variant="ghost" label="Löschen" confirm="Bekanntmachung löschen?" />}</div>
        </div>
      ))}
    </div>
  );
}
