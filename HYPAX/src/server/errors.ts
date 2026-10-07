export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "error", public details?: unknown) {
    super(message);
  }
}
export const unauthorized = (m = "Bitte melde dich an.") => new HttpError(401, m, "unauthorized");
export const forbidden = (m = "Dafür fehlt dir die Berechtigung.") => new HttpError(403, m, "forbidden");
/** 404 statt 403, wenn schon die Existenz des Datensatzes nicht verraten werden soll. */
export const notFound = (m = "Nicht gefunden.") => new HttpError(404, m, "not_found");
export const badRequest = (m: string, details?: unknown) => new HttpError(400, m, "bad_request", details);
export const conflict = (m: string, details?: unknown) => new HttpError(409, m, "conflict", details);
export const tooMany = (m = "Zu viele Versuche. Bitte warte kurz.") => new HttpError(429, m, "rate_limited");
