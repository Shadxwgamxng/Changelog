import { ZodError } from "zod";

/** Einheitliches Ergebnis aller Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Fehler mit Nachricht, die dem Benutzer direkt angezeigt werden darf. */
export class ActionError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export const ok = <T = undefined>(message?: string, data?: T): ActionResult<T> => ({ ok: true, message, data });

export function zodToFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Führt eine Action aus und übersetzt Fehler in verständliche Rückgaben.
 * Unerwartete Fehler werden geloggt, der Benutzer sieht nur `fallback`.
 */
export async function run<T = undefined>(fallback: string, fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ActionError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    if (err instanceof ZodError) {
      const fieldErrors = zodToFieldErrors(err);
      const first = Object.values(fieldErrors)[0] ?? "Bitte prüfe deine Eingaben.";
      return { ok: false, error: first, fieldErrors };
    }
    if (isNextControlFlow(err)) throw err;
    console.error("[action]", err);
    return { ok: false, error: fallback };
  }
}

/** redirect()/notFound() in Next werfen spezielle Fehler, die durchgereicht werden müssen. */
function isNextControlFlow(err: unknown) {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND");
}
