import { notFound } from "next/navigation";
import { requireCtx } from "@/server/session";
import { readMessage } from "@/server/services/messages";
import { Card, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";

export const metadata = { title: "Nachricht" };

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCtx();
  const m = await readMessage(ctx, (await params).id).catch(() => null);
  if (!m) notFound();
  return (<><PageHeader title={m.subject} back={{ href: "/messages", label: "Nachrichten" }} subtitle={`${m.mine ? "Von dir" : `Von ${m.from}`} · an ${m.audience} · ${fmtDateTime(m.createdAt)}`} /><Card><p className="prose-plain">{m.body}</p></Card></>);
}
