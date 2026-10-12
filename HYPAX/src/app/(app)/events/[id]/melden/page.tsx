import { notFound } from "next/navigation";
import { Building2, CalendarX2, Check, Clock, Info, Mail, MapPin } from "lucide-react";
import clsx from "clsx";
import { requireCtx } from "@/server/session";
import { getEventSignup, type EventSignup } from "@/server/services/shifts";
import { PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { fmtDateTime, fmtTime } from "@/lib/dates";
import * as A from "../../../shifts/actions";

export const metadata = { title: "Meldung abgeben" };

const tz = "Europe/Berlin";
const fDay = new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "2-digit", month: "2-digit", year: "2-digit" });
const fWd = new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "short" });
const fNum = new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "numeric" });
const fMon = new Intl.DateTimeFormat("de-DE", { timeZone: tz, month: "short" });
const fDeadline = new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "numeric", month: "short" });

export default async function EventSignupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const d = await getEventSignup(ctx, id).catch(() => null);
  if (!d) notFound();
  const { event: e } = d;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Meldung abgeben" back={{ href: `/shifts/${d.shifts[0].id}`, label: "Dienst" }} />
      <section className="card card-pad mb-4 space-y-2" aria-label="Veranstaltung">
        <h2 className="mb-1 text-center text-lg font-semibold">{e.name}</h2>
        {e.organizer && <Row icon={<Building2 className="h-5 w-5" />}>{e.organizer}</Row>}
        <Row icon={<Clock className="h-5 w-5" />}>{fDay.format(e.startsAt)}{fDay.format(e.startsAt) !== fDay.format(e.endsAt) ? ` – ${fDay.format(e.endsAt)}` : ""}</Row>
        {e.location && <Row icon={<MapPin className="h-5 w-5" />}>{e.location}</Row>}
        <Row icon={<Info className="h-5 w-5" />}><span>{d.total} {d.total === 1 ? "Schicht / Abschnitt" : "Schichten / Abschnitte"}<br /><span className="text-fg-muted">{d.past} davon bereits vergangen</span></span></Row>
        {d.signupDeadline && <Row icon={<CalendarX2 className="h-5 w-5" />} tone={d.signupDeadline < new Date() ? "danger" : undefined}>Meldeschluss: {fDeadline.format(d.signupDeadline)} {fmtTime(d.signupDeadline)} Uhr{d.signupDeadline < new Date() ? " (vorbei)" : ""}</Row>}
        {e.cancelled && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Die Veranstaltung wurde abgesagt.</p>}
      </section>

      <div className="space-y-4">
        {d.shifts.map((s) => <ShiftCard key={s.id} s={s} total={d.total} eventName={e.name} canSignUp={d.canSignUp && !e.cancelled} />)}
      </div>
    </div>
  );
}

function Row({ icon, children, tone }: { icon: React.ReactNode; children: React.ReactNode; tone?: "danger" }) {
  return <div className={clsx("flex min-h-[48px] items-center gap-3 rounded-xl bg-bg px-4 py-2.5 text-[15px]", tone === "danger" && "text-danger")}><span className="shrink-0 text-fg-muted" aria-hidden>{icon}</span><span className="min-w-0">{children}</span></div>;
}

type S = EventSignup["shifts"][number];

function StatusIcon({ s }: { s: S }) {
  const st = s.mine?.status;
  if (st === "BESTAETIGT") return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ok text-white" title="Eingeteilt"><Check className="h-7 w-7" strokeWidth={3} /></span>;
  if (st === "EINGELADEN") return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white" title="Eingeladen"><Mail className="h-6 w-6" /></span>;
  if (st === "ANGEFRAGT" || st === "WARTELISTE") return <span className="h-12 w-12 shrink-0 rounded-full bg-warn" title={st === "WARTELISTE" ? "Warteliste" : "Gemeldet – noch nicht entschieden"} />;
  return <span className="h-12 w-12 shrink-0 rounded-full border-2 border-dashed border-line-strong" title="Nicht gemeldet" />;
}

function ShiftCard({ s, total, eventName, canSignUp }: { s: S; total: number; eventName: string; canSignUp: boolean }) {
  const st = s.mine?.status;
  const pending = st === "ANGEFRAGT" || st === "WARTELISTE";
  const locked = st === "BESTAETIGT";
  const closed = s.past || s.signupClosed || s.status !== "OFFEN";
  const editable = canSignUp && !closed && (!s.mine || pending);
  const timeInputs = (
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
      <span className="text-fg-muted">Von</span>
      <input type="time" name="from" step={900} required defaultValue={fmtTime(s.defaultFrom)} disabled={!editable} aria-label={`Von (Schicht ${s.index})`} className="input text-center text-lg tabular-nums" />
      <span className="text-fg-muted">bis</span>
      <input type="time" name="to" step={900} required defaultValue={fmtTime(s.defaultTo)} disabled={!editable} aria-label={`Bis (Schicht ${s.index})`} className="input text-center text-lg tabular-nums" />
    </div>
  );
  return (
    <section className={clsx("card card-pad space-y-3", s.past && "opacity-60")} aria-label={`Schicht ${s.index} von ${total}`}>
      <div className="flex items-start gap-3">
        <StatusIcon s={s} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium tabular-nums">{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)} Uhr</p>
          <p className="text-sm text-fg-muted">Schicht / Abschnitt {s.index} von {total}{shortName(s.name, eventName) ? ` · ${shortName(s.name, eventName)}` : ""}</p>
          {s.mine && <p className="mt-0.5 text-xs text-fg-subtle">{st === "BESTAETIGT" ? "Eingeteilt" : st === "EINGELADEN" ? "Eingeladen" : st === "WARTELISTE" ? "Warteliste" : "Gemeldet"}: {s.mine.label ?? "ganze Schicht"}</p>}
        </div>
        <div className="shrink-0 border-t-4 border-fg bg-bg px-3 py-1 text-center leading-tight" aria-label={fmtDateTime(s.startsAt)}>
          <span className="text-sm">{fWd.format(s.startsAt)}</span><span className="text-2xl font-bold">{fNum.format(s.startsAt)}.</span><br /><span className="text-sm">{fMon.format(s.startsAt)}</span>
        </div>
      </div>

      {editable ? (
        <ActionForm action={A.eventSignupAction} className="space-y-3">
          <input type="hidden" name="id" value={s.id} />
          {timeInputs}
          <textarea name="note" className="input !min-h-[72px]" placeholder="Bemerkung" maxLength={300} defaultValue={s.mine?.note ?? ""} aria-label={`Bemerkung (Schicht ${s.index})`} />
          {s.full && <Notice>Die Schicht ist bereits voll besetzt – deine Meldung landet ggf. auf der Warteliste.</Notice>}
          <div className={clsx("grid gap-3", pending ? "grid-cols-2" : "grid-cols-1")}>
            {pending && <SubmitButton variant="default" name="intent" value="withdraw" confirm="Meldung für diese Schicht zurückziehen?">Absagen</SubmitButton>}
            <SubmitButton variant="primary" name="intent" value={pending ? "update" : "signup"}>{pending ? "Meldung ändern" : "Melden"}</SubmitButton>
          </div>
        </ActionForm>
      ) : (
        <>
          {timeInputs}
          {s.mine?.note && <p className="rounded-xl bg-bg px-4 py-3 text-sm">{s.mine.note}</p>}
          {locked && <Notice>Eine Änderung dieser Meldung ist nur durch die Dienstplanung möglich.</Notice>}
          {st === "EINGELADEN" && !closed && <div className="grid grid-cols-2 gap-3"><ActionButton action={A.respondInviteAction} fields={{ id: s.id, accept: "0" }} small={false} label="Absagen" confirm="Einladung wirklich ablehnen?" className="[&_button]:w-full" /><ActionButton action={A.respondInviteAction} fields={{ id: s.id, accept: "1" }} small={false} variant="ok" label="Zusagen" className="[&_button]:w-full" /></div>}
          {!s.mine && closed && <Notice>{s.past ? "Diese Schicht ist bereits vorbei." : s.signupClosed ? "Der Meldeschluss ist vorbei." : "Für diese Schicht sind keine Meldungen möglich."}</Notice>}
          {!s.mine && !closed && !canSignUp && <Notice>Dein Konto ist mit keinem Helferprofil verknüpft.</Notice>}
          {pending && closed && <Notice>Der Meldeschluss ist vorbei – Änderungen bitte über die Dienstplanung.</Notice>}
        </>
      )}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-3 rounded-xl bg-bg px-4 py-3 text-sm"><Info className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden />{children}</p>;
}

/** Schichtname ohne vorangestellten Veranstaltungsnamen („Festival – Tag 2“ → „Tag 2“). */
function shortName(name: string, eventName: string) {
  if (name === eventName) return "";
  return name.startsWith(eventName) ? name.slice(eventName.length).replace(/^\s*[–-]\s*/, "") : name;
}
