import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCtx } from "@/server/session";
import { getLagekarte } from "@/server/services/lagekarte";
import { PageHeader } from "@/components/ui";
import { LagekarteEditor, type MapObj } from "@/components/lagekarte/editor";
import { fmtRange } from "@/lib/dates";
import { prisma } from "@/server/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = await getLagekarte(await requireCtx(), (await params).id).catch(() => null);
  return { title: m ? `Lagekarte: ${m.name}` : "Lagekarte" };
}

export default async function LagekartePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const m = await getLagekarte(ctx, id).catch(() => null);
  if (!m) notFound();
  const shift = await prisma.shift.findUniqueOrThrow({ where: { id }, select: { startsAt: true, endsAt: true } });
  return (
    <>
      <PageHeader title={`Lagekarte · ${m.name}`} back={{ href: `/shifts/${id}`, label: "Dienst" }} subtitle={`${fmtRange(shift.startsAt, shift.endsAt)}${m.location ? ` · ${m.location}` : ""}${m.canEdit ? "" : " · schreibgeschützt"}`} />
      <LagekarteEditor data={{ shiftId: id, name: m.name, canEdit: m.canEdit, location: m.location, meetingPoint: m.meetingPoint, view: m.view, vehicles: m.vehicles, objects: m.objects as unknown as MapObj[], config: m.config }} />
      <p className="mt-4 text-xs text-fg-subtle">Taktische Zeichen nach DV 102 (<Link className="underline" href="https://taktische-zeichen.dev" target="_blank" rel="noreferrer">taktische-zeichen.dev</Link>, MIT). Kartenmaterial: GTA-V-Atlas aus dem ignis-Repository (© Rockstar Games – Nutzungsrechte vor Veröffentlichung prüfen).</p>
    </>
  );
}
