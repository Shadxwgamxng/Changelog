"use client";
// Client-Bausteine für Formulare: Server-Action-Anbindung, Bestätigungsdialog, automatische Aktualisierung.
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { FormState } from "@/server/action";

export function SubmitButton({ children, className, pendingText = "Bitte warten …", variant = "primary", small, confirm }: { children: ReactNode; className?: string; pendingText?: string; variant?: "primary" | "ghost" | "danger" | "ok" | "default"; small?: boolean; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={clsx("btn", variant !== "default" && `btn-${variant}`, small && "btn-sm", className)}>
      {pending ? pendingText : children}
    </button>
  );
}

const initial: FormState = {};

/** Formular, das eine Server Action aufruft und Erfolg/Fehler anzeigt. */
export function ActionForm({ action, children, className, resetOnSuccess, redirectTo, compact }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; children: ReactNode; className?: string; resetOnSuccess?: boolean; redirectTo?: string; compact?: boolean }) {
  const [state, formAction] = useActionState(action, initial);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    }
  }, [state, resetOnSuccess, redirectTo, router]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div aria-live="polite" className={clsx(compact ? "mt-2" : "mt-3", !state.ok && !state.error && "hidden")}>
        {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state.ok && !state.error && <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok">{state.ok}</p>}
      </div>
    </form>
  );
}

/** Kleines Ein-Klick-Formular für Aktionen (Bestätigen, Absagen, Löschen …) mit optionaler Rückfrage. */
export function ActionButton({ action, label, variant = "default", small = true, confirm, fields, className, pendingText }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; label: ReactNode; variant?: "primary" | "ghost" | "danger" | "ok" | "default"; small?: boolean; confirm?: string; fields?: Record<string, string>; className?: string; pendingText?: string }) {
  return (
    <ActionForm action={action} className={clsx("inline-block", className)} compact>
      {Object.entries(fields ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} small={small} confirm={confirm} pendingText={pendingText}>{label}</SubmitButton>
    </ActionForm>
  );
}

/** Lädt die Seite in festen Abständen neu (Live-Ansicht, z. B. Alarm-Rückmeldungen). Pausiert bei verstecktem Tab. */
export function LiveRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") start(() => router.refresh()); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return <span className="sr-only" aria-live="off">Live-Ansicht aktiv</span>;
}

/** Auswahl mehrerer Werte als Chips (z. B. Funktionen, Wochentage). Submit als `name[]`-Felder. */
export function ChipSelect({ name, options, defaultValue = [] }: { name: string; options: { value: string; label: string }[]; defaultValue?: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="checkbox" name={`${name}[]`} value={o.value} defaultChecked={defaultValue.includes(o.value)} className="peer sr-only" />
          <span className="inline-flex min-h-[34px] items-center rounded border border-line-strong bg-bg-2 px-3 text-[13px] text-fg-muted transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:font-medium peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-info">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Dynamische Zeilen (Positionen, Aufgaben, Einsatzkräfte …) → JSON im Hidden-Feld. */
export function RowsEditor<T extends Record<string, unknown>>({ name, initial, columns, blank, addLabel = "Zeile hinzufügen" }: {
  name: string; initial: T[]; blank: T; addLabel?: string;
  columns: { key: keyof T & string; label: string; type: "text" | "number" | "select" | "multiselect"; options?: { value: string; label: string }[]; width?: string; placeholder?: string; min?: number; max?: number }[];
}) {
  const [rows, setRows] = useState<T[]>(initial);
  const set = (i: number, k: string, v: unknown) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.length === 0 && <p className="text-sm text-fg-subtle">Noch keine Einträge.</p>}
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface-2 p-3">
          <div className="grid gap-3 sm:grid-cols-6">
            {columns.map((c) => (
              <label key={c.key} className={clsx("block", c.width ?? "sm:col-span-2")}>
                <span className="label">{c.label}</span>
                {c.type === "select" ? (
                  <select className="input" value={String(row[c.key] ?? "")} onChange={(e) => set(i, c.key, e.target.value)}>
                    <option value="">—</option>
                    {c.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : c.type === "multiselect" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {c.options?.map((o) => {
                      const cur = (row[c.key] as string[] | undefined) ?? [];
                      const on = cur.includes(o.value);
                      return (
                        <button type="button" key={o.value} aria-pressed={on} onClick={() => set(i, c.key, on ? cur.filter((x) => x !== o.value) : [...cur, o.value])}
                          className={clsx("min-h-[30px] rounded border px-2.5 text-xs transition", on ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-line-strong bg-surface text-fg-muted")}>
                          {o.label}
                        </button>
                      );
                    })}
                    {!c.options?.length && <span className="text-sm text-fg-subtle">Keine Optionen</span>}
                  </div>
                ) : (
                  <input className="input" type={c.type} value={String(row[c.key] ?? "")} placeholder={c.placeholder} min={c.min} max={c.max}
                    onChange={(e) => set(i, c.key, c.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />
                )}
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm mt-2 text-danger" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>Entfernen</button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => setRows((r) => [...r, { ...blank }])}>＋ {addLabel}</button>
    </div>
  );
}

/** Löst nach Auswahl eines Filters das GET-Formular automatisch aus. */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("input", props.className)} onChange={(e) => { props.onChange?.(e); e.currentTarget.form?.requestSubmit(); }} />;
}

export function Collapse({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="group rounded-lg border border-line bg-surface" open={open}>
      <summary className="flex min-h-[44px] items-center justify-between gap-2 px-4 py-2 text-sm font-medium">
        <span>{summary}</span><span className="text-fg-subtle transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  );
}
