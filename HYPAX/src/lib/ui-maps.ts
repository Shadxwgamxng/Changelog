// Zuordnung von Fachwerten zu Badge-Tönen.
export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "brand";

export const shiftStatusTone: Record<string, Tone> = { ENTWURF: "neutral", OFFEN: "info", ABGESAGT: "danger", ABGESCHLOSSEN: "ok" };
export const assignmentTone: Record<string, Tone> = { BESTAETIGT: "ok", ANGEFRAGT: "warn", EINGELADEN: "info", WARTELISTE: "neutral", ABGELEHNT: "danger", ZURUECKGEZOGEN: "neutral" };
export const vehicleTone: Record<string, Tone> = { EINSATZBEREIT: "ok", EINGESCHRAENKT: "warn", NICHT_EINSATZBEREIT: "danger", IN_WARTUNG: "info" };
export const materialTone: Record<string, Tone> = { OK: "ok", DEFEKT: "danger", IN_WARTUNG: "warn", AUSGESONDERT: "neutral" };
export const helperStatusTone: Record<string, Tone> = { AKTIV: "ok", PASSIV: "warn", INAKTIV: "neutral", AUSGETRETEN: "neutral", ANONYMISIERT: "neutral" };
export const availabilityTone: Record<string, Tone> = { VERFUEGBAR: "ok", EINGESCHRAENKT: "warn", NICHT_VERFUEGBAR: "danger" };
export const qualStateTone: Record<string, Tone> = { GUELTIG: "ok", LAEUFT_AB: "warn", ABGELAUFEN: "danger", WIDERRUFEN: "danger", IN_PRUEFUNG: "info" };
export const alertResponseTone: Record<string, Tone> = { KOMME: "ok", VIELLEICHT: "warn", KANN_NICHT: "danger", OFFEN: "neutral" };
export const levelTone = { rot: "danger", gelb: "warn", info: "info" } as const;
