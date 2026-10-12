// Wrapper für Server Actions: Rechteprüfung, Fehlerübersetzung, einheitlicher Rückgabewert für Formulare.
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";
import { requireCtx } from "./session";
import { HttpError } from "./errors";
import type { Ctx } from "./context";
import { revalidatePath } from "next/cache";

export interface FormState { ok?: string; error?: string; fieldErrors?: Record<string, string>; data?: unknown }

export function describeError(e: unknown): FormState {
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of e.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { error: `Bitte prüfe deine Eingaben: ${e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "Eingabe"}: ${i.message}`).join("; ")}`, fieldErrors };
  }
  if (e instanceof HttpError) return { error: e.message };
  console.error("[action]", e);
  return { error: "Unerwarteter Fehler. Bitte versuche es erneut." };
}

/** Erzeugt eine Server Action. `fn` bekommt den geprüften Kontext und die Formulardaten. */
export function action(fn: (ctx: Ctx, form: FormData) => Promise<string | void | { ok?: string; data?: unknown }>, opts: { revalidate?: string[] } = {}) {
  return async (_prev: FormState, form: FormData): Promise<FormState> => {
    try {
      const ctx = await requireCtx();
      const r = await fn(ctx, form);
      for (const p of opts.revalidate ?? []) revalidatePath(p);
      if (typeof r === "string") return { ok: r };
      if (r && typeof r === "object") return { ok: r.ok, data: r.data };
      return { ok: "Gespeichert." };
    } catch (e) {
      if (isRedirectError(e)) throw e;
      return describeError(e);
    }
  };
}

/** FormData → Objekt. Mehrfach vorkommende Schlüssel (oder `name[]`) werden zu Arrays; leere Strings bleiben leer. */
export function formObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const vals = form.getAll(key).filter((v): v is string => typeof v === "string");
    if (key.endsWith("[]")) out[key.slice(0, -2)] = vals;
    else out[key] = vals.length > 1 ? vals : vals[0] ?? "";
  }
  return out;
}

export const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
export const json = <T>(form: FormData, key: string, fallback: T): T => {
  try { const v = form.get(key); return typeof v === "string" && v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
export const checked = (form: FormData, key: string) => ["on", "true", "1"].includes(String(form.get(key) ?? ""));
