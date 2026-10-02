import type { ReactNode } from "react";
import { Button, ButtonLink } from "./button";

/** Server-seitige Filterleiste (GET-Formular) – funktioniert ohne JavaScript und ist per URL teilbar. */
export function FilterBar({ children, resetHref }: { children: ReactNode; resetHref: string }) {
  return (
    <form method="get" className="panel mb-5 grid grid-cols-2 gap-3 p-3 sm:p-4 lg:grid-cols-4">
      {children}
      <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
        <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
          Filtern
        </Button>
        <ButtonLink href={resetHref} variant="ghost">
          Zurücksetzen
        </ButtonLink>
      </div>
    </form>
  );
}

export function FilterSelect({ label, name, value, options, placeholder = "Alle" }: { label: string; name: string; value?: string; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="label-caps">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input pr-8">
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterInput({ label, name, value, type = "search", placeholder }: { label: string; name: string; value?: string; type?: string; placeholder?: string }) {
  return (
    <label className="col-span-2 block space-y-1 sm:col-span-1">
      <span className="label-caps">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} className="input" />
    </label>
  );
}

/** Liest einen Query-Parameter, der nur einen von erlaubten Werten annehmen darf. */
export function pickEnum<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return allowed.includes(v as T) ? (v as T) : undefined;
}

export function pickString(value: string | string[] | undefined, max = 100): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const t = v?.trim().slice(0, max);
  return t ? t : undefined;
}
