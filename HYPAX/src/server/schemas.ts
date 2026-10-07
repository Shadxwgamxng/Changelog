import { z } from "zod";
import { FUNCTIONS } from "@/lib/constants";
import { parseBerlinLocal, parseDateOnly } from "@/lib/dates";

const trim = z.string().trim();
export const optStr = (max = 500) => trim.max(max).optional().nullable().transform((v) => (v ? v : null));
export const reqStr = (max = 200) => trim.min(1, "Pflichtfeld").max(max);
export const id = z.string().min(1).max(40);

/** Datum+Uhrzeit in Berliner Wandzeit ("2027-07-18T18:00") oder ISO mit Zone → Date */
export const dateTime = z.union([z.string(), z.date()]).transform((v, ctx) => {
  if (v instanceof Date) return v;
  const d = /[zZ]|[+-]\d{2}:?\d{2}$/.test(v) ? new Date(v) : parseBerlinLocal(v);
  if (!d || Number.isNaN(d.getTime())) { ctx.addIssue({ code: "custom", message: "Ungültiges Datum/Uhrzeit" }); return z.NEVER; }
  return d;
});
export const dateOnly = z.union([z.string(), z.date()]).transform((v, ctx) => {
  if (v instanceof Date) return v;
  const d = parseDateOnly(v);
  if (!d) { ctx.addIssue({ code: "custom", message: "Ungültiges Datum" }); return z.NEVER; }
  return d;
});
export const optDateOnly = z.union([z.string(), z.date(), z.null(), z.undefined()]).transform((v, ctx) => {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  const d = parseDateOnly(v);
  if (!d) { ctx.addIssue({ code: "custom", message: "Ungültiges Datum" }); return z.NEVER; }
  return d;
});
export const optInt = z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((v, ctx) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) { ctx.addIssue({ code: "custom", message: "Ganze Zahl erwartet" }); return z.NEVER; }
  return n;
});
export const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
export const bool = z.union([z.boolean(), z.string()]).transform((v) => v === true || v === "true" || v === "on" || v === "1");

const functionKeys = FUNCTIONS.map((f) => f.key) as [string, ...string[]];

export const helperInput = z.object({
  unitId: id,
  firstName: reqStr(80),
  lastName: reqStr(80),
  birthDate: optDateOnly,
  email: trim.max(200).email("Ungültige E-Mail").optional().nullable().or(z.literal("")).transform((v) => v || null),
  phone: optStr(40),
  street: optStr(120),
  zip: optStr(10),
  city: optStr(80),
  memberNumber: optStr(40),
  status: z.enum(["AKTIV", "PASSIV", "INAKTIV", "AUSGETRETEN"]).default("AKTIV"),
  joinedAt: optDateOnly,
  leftAt: optDateOnly,
  groupName: optStr(80),
  functions: z.array(z.enum(functionKeys)).default([]),
  dienststellung: optStr(80),
  leadershipRole: optStr(80),
  internalNotes: optStr(4000),
  maxShiftsPerMonth: optInt,
  minRestHours: int(0, 48).default(11),
  preferredKinds: z.array(z.enum(["SANITAETSDIENST", "BEREITSCHAFTSABEND", "AUSBILDUNG", "BESPRECHUNG", "EINSATZ", "UEBUNG", "SONSTIGES"])).default([]),
  preferredWeekdays: z.array(int(0, 6)).default([]),
});
export type HelperInput = z.infer<typeof helperInput>;

/** Felder, die ein Helfer an seinem eigenen Profil selbst ändern darf. */
export const ownProfileInput = z.object({
  email: helperInput.shape.email,
  phone: helperInput.shape.phone,
  street: helperInput.shape.street,
  zip: helperInput.shape.zip,
  city: helperInput.shape.city,
  maxShiftsPerMonth: helperInput.shape.maxShiftsPerMonth,
  minRestHours: helperInput.shape.minRestHours,
  preferredKinds: helperInput.shape.preferredKinds,
  preferredWeekdays: helperInput.shape.preferredWeekdays,
});

export const qualTypeInput = z.object({
  unitId: id.nullable().optional().transform((v) => v || null),
  name: reqStr(120),
  category: z.enum(["AUSBILDUNG", "LEHRGANG", "FUEHRERSCHEIN", "MEDIZIN", "FUNK", "SANITAET", "FUEHRUNG", "TECHNIK", "SONDER"]),
  validityMonths: optInt,
  description: optStr(500),
  covers: z.array(id).default([]),
});

export const helperQualInput = z.object({
  typeId: id,
  issuedAt: optDateOnly,
  validUntil: optDateOnly,
  status: z.enum(["GUELTIG", "IN_PRUEFUNG", "WIDERRUFEN"]).default("GUELTIG"),
  note: optStr(500),
  documentId: id.nullable().optional().transform((v) => v || null),
});

export const availabilityInput = z.object({
  startDate: dateOnly,
  endDate: dateOnly,
  status: z.enum(["VERFUEGBAR", "EINGESCHRAENKT", "NICHT_VERFUEGBAR"]),
  reason: z.enum(["URLAUB", "SCHULE", "ARBEIT", "KRANKHEIT", "PRIVAT", "SONSTIGES"]).nullable().optional().transform((v) => v || null),
  note: optStr(300),
});

export const requirementInput = z.object({
  id: id.optional(),
  label: reqStr(120),
  count: int(1, 200),
  functionKey: z.enum(functionKeys).nullable().optional().transform((v) => v || null),
  qualTypeIds: z.array(id).default([]),
});

export const shiftInput = z.object({
  unitId: id,
  eventId: id.nullable().optional().transform((v) => v || null),
  name: reqStr(160),
  kind: z.enum(["SANITAETSDIENST", "BEREITSCHAFTSABEND", "AUSBILDUNG", "BESPRECHUNG", "EINSATZ", "UEBUNG", "SONSTIGES"]),
  startsAt: dateTime,
  endsAt: dateTime,
  meetingPoint: optStr(200),
  location: optStr(200),
  organizer: optStr(200),
  description: optStr(4000),
  responsibleId: id.nullable().optional().transform((v) => v || null),
  requirements: z.array(requirementInput).default([]),
}).refine((v) => v.endsAt > v.startsAt, { message: "Das Ende muss nach dem Beginn liegen", path: ["endsAt"] });

export const eventInput = z.object({
  unitId: id,
  name: reqStr(160),
  description: optStr(4000),
  startsAt: dateTime,
  endsAt: dateTime,
  location: optStr(200),
  organizer: optStr(200),
  tasks: z.array(z.object({ kind: z.enum(["SANITAETSDIENST", "EINSATZLEITUNG", "FAHRZEUG", "MATERIAL", "FUNK", "SONSTIGES"]), title: reqStr(160) })).default([]),
}).refine((v) => v.endsAt > v.startsAt, { message: "Das Ende muss nach dem Beginn liegen", path: ["endsAt"] });

export const vehicleInput = z.object({
  unitId: id,
  name: reqStr(120),
  callSign: optStr(60),
  plate: optStr(20),
  type: optStr(60),
  location: optStr(120),
  odometerKm: optInt,
  tuvDue: optDateOnly,
  huDue: optDateOnly,
  insuranceDue: optDateOnly,
  status: z.enum(["EINSATZBEREIT", "EINGESCHRAENKT", "NICHT_EINSATZBEREIT", "IN_WARTUNG"]).default("EINSATZBEREIT"),
  notes: optStr(2000),
});

export const materialInput = z.object({
  unitId: id,
  name: reqStr(160),
  category: optStr(80),
  quantity: int(0, 1_000_000).default(0),
  minQuantity: int(0, 1_000_000).default(0),
  location: optStr(120),
  serialNumber: optStr(80),
  maintenanceDue: optDateOnly,
  expiresAt: optDateOnly,
  status: z.enum(["OK", "DEFEKT", "IN_WARTUNG", "AUSGESONDERT"]).default("OK"),
  responsibleId: id.nullable().optional().transform((v) => v || null),
  notes: optStr(2000),
});

export const alertInput = z.object({
  unitId: id,
  title: reqStr(160),
  message: optStr(2000),
  meetingPoint: optStr(200),
  meetingTime: dateTime.nullable().optional().or(z.literal("").transform(() => null)),
  audienceType: z.enum(["EINHEIT", "GRUPPE", "QUALIFIKATION", "ALARMGRUPPE"]),
  audienceRef: optStr(120),
  alertGroupId: id.nullable().optional().transform((v) => v || null),
  shiftId: id.nullable().optional().transform((v) => v || null),
});

export const incidentInput = z.object({
  unitId: id,
  number: reqStr(40),
  kind: reqStr(120),
  alertedAt: dateTime.nullable().optional().or(z.literal("").transform(() => null)),
  startedAt: dateTime,
  endedAt: dateTime.nullable().optional().or(z.literal("").transform(() => null)),
  location: optStr(200),
  documentation: optStr(8000),
  helpers: z.array(z.object({ helperId: id, role: optStr(80) })).default([]),
  vehicleIds: z.array(id).default([]),
  materials: z.array(z.object({ materialId: id, quantity: int(1, 100000).default(1) })).default([]),
});

export const messageInput = z.object({
  subject: reqStr(160),
  body: reqStr(8000),
  audience: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("USERS"), userIds: z.array(id).min(1) }),
    z.object({ kind: z.literal("UNIT"), unitId: id, includeSubunits: bool.default(false) }),
    z.object({ kind: z.literal("GROUP"), unitId: id, groupName: reqStr(80) }),
    z.object({ kind: z.literal("SHIFT"), shiftId: id }),
    z.object({ kind: z.literal("LEADERS"), unitId: id }),
  ]),
});

export const announcementInput = z.object({
  unitId: id,
  title: reqStr(160),
  body: reqStr(4000),
  important: bool.default(false),
  pinned: bool.default(false),
  expiresAt: dateTime.nullable().optional().or(z.literal("").transform(() => null)),
});
