import { z } from "zod";
import { localToDate } from "./dates";

/** Hilfen für FormData-basierte Eingaben. Leere Strings werden zu undefined. */

export const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const zBool = z.preprocess((v) => v === "on" || v === "true" || v === true || v === "1", z.boolean());

export const zStr = (label: string, max = 200) =>
  z
    .string({ required_error: `${label} ist erforderlich.` })
    .trim()
    .min(1, `${label} ist erforderlich.`)
    .max(max, `${label} ist zu lang (max. ${max} Zeichen).`);

export const zOptStr = (label: string, max = 200) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max, `${label} ist zu lang (max. ${max} Zeichen).`).optional());

export const zOptText = (label: string, max = 5000) => zOptStr(label, max);

export const zOptUrl = (label: string) =>
  z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .max(2000, `${label} ist zu lang.`)
      .refine((v) => isHttpUrl(v), `${label} muss mit http:// oder https:// beginnen.`)
      .optional(),
  );

/** Nur http(s)-URLs – verhindert javascript:-Links. */
export function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Interner Upload-Pfad (/api/files/...) oder http(s)-URL. */
export const zOptImage = (label = "Bild") =>
  z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .max(2000)
      .refine((v) => /^\/api\/files\/[A-Za-z0-9._/-]+$/.test(v) && !v.includes("..") || isHttpUrl(v), `${label}: ungültige Adresse.`)
      .optional(),
  );

export const zOptInt = (label: string, min = 0, max = 100000) =>
  z.preprocess(
    emptyToUndef,
    z.coerce
      .number({ invalid_type_error: `${label} muss eine Zahl sein.` })
      .int(`${label} muss eine ganze Zahl sein.`)
      .min(min, `${label} muss mindestens ${min} sein.`)
      .max(max, `${label} darf höchstens ${max} sein.`)
      .optional(),
  );

export const zInt = (label: string, min = 0, max = 100000) =>
  z.coerce
    .number({ invalid_type_error: `${label} muss eine Zahl sein.` })
    .int(`${label} muss eine ganze Zahl sein.`)
    .min(min, `${label} muss mindestens ${min} sein.`)
    .max(max, `${label} darf höchstens ${max} sein.`);

/** Euro-Eingabe ("49,99" / "49.99") → Cent. */
export const zOptEuro = (label: string) =>
  z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .transform((v, ctx) => {
        const n = Number(v.replace(/\s/g, "").replace("€", "").replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
          ctx.addIssue({ code: "custom", message: `${label}: ungültiger Betrag.` });
          return z.NEVER;
        }
        return Math.round(n * 100);
      })
      .optional(),
  );

/** datetime-local / date → UTC-Date (Ortszeit APP_TIMEZONE). */
export const zDateTime = (label: string) =>
  z
    .string({ required_error: `${label} ist erforderlich.` })
    .trim()
    .transform((v, ctx) => {
      const d = localToDate(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: `${label}: ungültiges Datum.` });
        return z.NEVER;
      }
      return d;
    });

export const zOptDateTime = (label: string) =>
  z.preprocess(emptyToUndef, zDateTime(label).optional());

export const zEmail = z
  .string({ required_error: "E-Mail ist erforderlich." })
  .trim()
  .toLowerCase()
  .email("Bitte gib eine gültige E-Mail-Adresse ein.")
  .max(200);

export const zUsername = z
  .string({ required_error: "Benutzername ist erforderlich." })
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, "Benutzername: 3–32 Zeichen, nur Buchstaben, Zahlen, Punkt, Binde- und Unterstrich.");

export const zPassword = z
  .string({ required_error: "Passwort ist erforderlich." })
  .min(10, "Das Passwort muss mindestens 10 Zeichen lang sein.")
  .max(128, "Das Passwort darf höchstens 128 Zeichen lang sein.")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Das Passwort muss Buchstaben und Zahlen enthalten.");

export const zId = z.string().trim().min(1).max(64);

/** FormData → einfaches Objekt; wiederholte Felder (z. B. Checkbox-Listen) werden zu Arrays. */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}

export function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v) return [v];
  return [];
}
