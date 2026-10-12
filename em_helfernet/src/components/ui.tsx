// Kleine, serverkompatible UI-Bausteine.
import Link from "next/link";
import clsx from "clsx";
import type { ReactNode, ComponentProps } from "react";

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back && <Link href={back.href} className="mb-1 inline-block text-sm text-fg-subtle hover:text-fg">← {back.label}</Link>}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className, pad = true, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean; id?: string }) {
  return (
    <section id={id} className={clsx("card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
          <h2 className="card-title">{title}</h2>
          {action}
        </header>
      )}
      <div className={clsx(pad && "card-pad", title && pad && "!pt-3")}>{children}</div>
    </section>
  );
}

type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "brand";
export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span title={title} className={clsx("badge", `badge-${tone}`)}>{children}</span>;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      {icon && <div className="text-fg-subtle">{icon}</div>}
      <p className="font-medium">{title}</p>
      {text && <p className="max-w-md text-sm text-fg-muted">{text}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone, label, big }: { value: number; max?: number; tone?: Tone; label?: string; big?: boolean }) {
  const pct = max ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  const t = tone ?? (pct >= 100 ? "ok" : pct >= 60 ? "info" : pct >= 30 ? "warn" : "danger");
  const color = { ok: "bg-ok", info: "bg-info", warn: "bg-warn", danger: "bg-danger", brand: "bg-brand-500", neutral: "bg-fg-subtle" }[t];
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx("overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line", big ? "h-3" : "h-2")}>
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone, href, fill }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; href?: string; fill?: boolean }) {
  const body = (
    <div className={clsx("card card-pad", fill && "h-full", href && "transition hover:border-line-strong hover:shadow-pop")}>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className={clsx("mt-1 text-xl font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warn" && "text-warn", tone === "ok" && "text-ok")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className={clsx("block", fill && "h-full")}>{body}</Link> : body;
}

export function LinkButton({ href, variant, size, children, className, ...rest }: { href: string; variant?: "primary" | "ghost" | "danger" | "ok"; size?: "sm"; children: ReactNode; className?: string } & Omit<ComponentProps<typeof Link>, "href">) {
  return <Link href={href} className={clsx("btn", variant && `btn-${variant}`, size === "sm" && "btn-sm", className)} {...rest}>{children}</Link>;
}

export function Field({ label, hint, error, children, className, required }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
      {hint && !error && <span className="hint block">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Tabs({ tabs, active }: { tabs: { key: string; label: ReactNode; href: string }[]; active: string }) {
  return (
    <nav className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Bereiche">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}
          className={clsx("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition", t.key === active ? "border-brand-500 text-fg" : "border-transparent text-fg-muted hover:text-fg")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${h} 45% 42%)` }}>
      {initials || "?"}
    </span>
  );
}

export function Dl({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
        <div key={k}><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{k}</dt><dd className="mt-0.5 text-[15px]">{v}</dd></div>
      ))}
    </dl>
  );
}

export const Notice = ({ tone = "info", children }: { tone?: Tone; children: ReactNode }) => (
  <div role={tone === "danger" ? "alert" : "status"} className={clsx("rounded-lg px-4 py-3 text-sm", `badge-${tone}`, "!inline-block !w-full !whitespace-normal !rounded-lg")}>{children}</div>
);
