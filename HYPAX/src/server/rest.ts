// REST-API v1: schmale Schicht über denselben Services wie die Weboberfläche.
// Es gibt keinen Datenzugriff an den Services und ihrer Rechteprüfung vorbei.
import { badRequest, notFound } from "./errors";
import type { Ctx } from "./context";
import { parseDateOnly } from "@/lib/dates";
import * as Units from "./services/units";
import * as Helpers from "./services/helpers";
import * as Quals from "./services/qualifications";
import * as Avail from "./services/availability";
import * as Shifts from "./services/shifts";
import * as Events from "./services/events";
import * as Vehicles from "./services/vehicles";
import * as Materials from "./services/materials";
import * as Docs from "./services/documents";
import * as Messages from "./services/messages";
import * as Notifs from "./services/notifications";
import * as Cal from "./services/calendar";
import * as Lage from "./services/lagekarte";
import * as Reports from "./services/reports";
import * as Audit from "./services/audit-log";
import { globalSearch } from "./services/search";
import { getDashboard } from "./services/dashboard";
import { hasAnywhere } from "./context";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export interface Call { ctx: Ctx; params: Record<string, string>; q: URLSearchParams; body: any }
type Handler = (c: Call) => Promise<unknown> | unknown;
interface Route { method: string; segs: string[]; handler: Handler; status?: number }
const routes: Route[] = [];
const add = (method: string, path: string, handler: Handler, status?: number) => routes.push({ method, segs: path.split("/").filter(Boolean), handler, status });
const get = (p: string, h: Handler) => add("GET", p, h);
const post = (p: string, h: Handler, status = 201) => add("POST", p, h, status);
const patch = (p: string, h: Handler) => add("PATCH", p, h);
const put = (p: string, h: Handler) => add("PUT", p, h);
const del = (p: string, h: Handler) => add("DELETE", p, h);
const ok = async (fn: () => Promise<unknown>) => { await fn(); return { ok: true }; };

const date = (v: string | null, fallback: Date) => { if (!v) return fallback; const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseDateOnly(v) : new Date(v); if (!d || Number.isNaN(d.getTime())) throw badRequest("Ungültiges Datum."); return d; };
const int = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
const list = (q: URLSearchParams, k: string) => q.getAll(k).flatMap((x) => x.split(",")).filter(Boolean);

// ── Profil & Stammdaten ──
get("/me", ({ ctx }) => ({
  userId: ctx.userId, email: ctx.email, systemRole: ctx.systemRole, helperId: ctx.helperId, helperName: ctx.helperName, mustChangePw: ctx.mustChangePw, totpEnabled: ctx.totpEnabled,
  permissions: ALL_PERMISSIONS.filter((p) => hasAnywhere(ctx, p)),
  roles: ctx.grants.map((g) => ({ unitId: g.unitId, role: g.roleKey, scope: g.scope })),
}));
get("/dashboard", ({ ctx }) => getDashboard(ctx));
get("/units", ({ ctx }) => Units.listUnitTree(ctx));
get("/search", ({ ctx, q }) => globalSearch(ctx, q.get("q") ?? "", int(q.get("limit")) ?? 6));
get("/audit", ({ ctx, q }) => Audit.listAudit(ctx, { q: q.get("q") ?? undefined, entityType: q.get("entityType") ?? undefined, actor: q.get("actor") ?? undefined, unitId: q.get("unitId") ?? undefined, page: int(q.get("page")), pageSize: int(q.get("pageSize")) }));

// ── Helfer ──
get("/helpers", ({ ctx, q }) => Helpers.listHelpers(ctx, { q: q.get("q") ?? undefined, unitId: q.get("unitId") ?? undefined, status: (q.get("status") as never) ?? undefined, group: q.get("group") ?? undefined, qualTypeId: q.get("qualTypeId") ?? undefined, fn: q.get("function") ?? undefined, page: int(q.get("page")), pageSize: int(q.get("pageSize")) }));
post("/helpers", ({ ctx, body }) => Helpers.createHelper(ctx, body));
get("/helpers/:id", ({ ctx, params }) => Helpers.getHelper(ctx, params.id));
patch("/helpers/:id", ({ ctx, params, body }) => Helpers.updateHelper(ctx, params.id, body).then((h) => Helpers.getHelper(ctx, h.id)));
del("/helpers/:id", ({ ctx, params }) => ok(() => Helpers.anonymizeHelper(ctx, params.id)));
patch("/me/profile", ({ ctx, body }) => Helpers.updateOwnProfile(ctx, body).then(() => ({ ok: true })));
get("/helpers/:id/qualifications", ({ ctx, params }) => Quals.listHelperQualifications(ctx, params.id));
post("/helpers/:id/qualifications", ({ ctx, params, body }) => Quals.addHelperQualification(ctx, params.id, body));
patch("/helper-qualifications/:id", ({ ctx, params, body }) => ok(() => Quals.updateHelperQualification(ctx, params.id, body)));
del("/helper-qualifications/:id", ({ ctx, params }) => ok(() => Quals.removeHelperQualification(ctx, params.id)));
get("/qualification-types", ({ ctx }) => Quals.listQualTypes(ctx));
post("/qualification-types", ({ ctx, body }) => Quals.createQualType(ctx, body));
get("/qualifications/overview", ({ ctx }) => Quals.qualificationOverview(ctx));
get("/qualifications/expiring", ({ ctx, q }) => Quals.expiringQualifications(ctx, int(q.get("days")) ?? 90, q.get("includeExpired") !== "0"));
get("/helpers/:id/availability", ({ ctx, params, q }) => { const f = date(q.get("from"), new Date()); return Avail.getAvailability(ctx, params.id, f, date(q.get("to"), new Date(f.getTime() + 60 * 86_400_000))); });
put("/helpers/:id/availability", ({ ctx, params, body }) => ok(() => Avail.setAvailability(ctx, params.id, body)));
del("/helpers/:id/availability", ({ ctx, params, q, body }) => ok(() => Avail.clearAvailability(ctx, params.id, date(q.get("from") ?? body?.startDate, new Date()), date(q.get("to") ?? body?.endDate, new Date()))));
get("/units/:id/availability", ({ ctx, params, q }) => { const f = date(q.get("from"), parseDateOnly(new Date().toISOString().slice(0, 10))!); return Avail.unitAvailabilityMatrix(ctx, params.id, f, date(q.get("to"), new Date(f.getTime() + 13 * 86_400_000))); });
get("/helpers/:id/shifts", ({ ctx, params, q }) => Shifts.shiftHistory(ctx, params.id, int(q.get("limit")) ?? 50));

// ── Dienste ──
get("/shifts", ({ ctx, q }) => Shifts.listShifts(ctx, { from: q.get("from") ? date(q.get("from"), new Date()) : undefined, to: q.get("to") ? date(q.get("to"), new Date()) : undefined, unitId: q.get("unitId") ?? undefined, kind: (q.get("kind") as never) ?? undefined, status: (q.get("status") as never) ?? undefined, mine: q.get("mine") === "1", openOnly: q.get("open") === "1", take: int(q.get("limit")) }));
post("/shifts", ({ ctx, body }) => Shifts.createShift(ctx, body));
get("/shifts/:id", ({ ctx, params }) => Shifts.getShift(ctx, params.id));
patch("/shifts/:id", ({ ctx, params, body }) => Shifts.updateShift(ctx, params.id, body).then(() => Shifts.getShift(ctx, params.id)));
del("/shifts/:id", ({ ctx, params }) => ok(() => Shifts.deleteShift(ctx, params.id)));
post("/shifts/:id/publish", ({ ctx, params }) => ok(() => Shifts.publishShift(ctx, params.id)), 200);
post("/shifts/:id/cancel", ({ ctx, params, body }) => ok(() => Shifts.cancelShift(ctx, params.id, body?.reason)), 200);
post("/shifts/:id/complete", ({ ctx, params, body }) => ok(() => Shifts.completeShift(ctx, params.id, body?.minutes ?? {})), 200);
post("/shifts/:id/signup", ({ ctx, params, body }) => Shifts.signUpForShift(ctx, params.id, body?.note ?? null).then((r) => ({ status: r.assignment.status, warnings: r.warnings })));
post("/shifts/:id/withdraw", ({ ctx, params, body }) => ok(() => Shifts.withdrawFromShift(ctx, params.id, body?.reason)), 200);
post("/shifts/:id/respond", ({ ctx, params, body }) => ok(() => Shifts.respondToInvitation(ctx, params.id, body?.accept === true)), 200);
get("/shifts/:id/recommendation", ({ ctx, params }) => Shifts.getRecommendation(ctx, params.id));
post("/shifts/:id/recommendation/apply", ({ ctx, params, body }) => Shifts.applyRecommendation(ctx, params.id, body?.picks ?? [], body?.mode === "EINLADEN" ? "EINLADEN" : "EINTEILEN"), 200);
post("/shifts/:id/assignments", ({ ctx, params, body }) => Shifts.assignHelper(ctx, params.id, String(body?.helperId ?? ""), { requirementId: body?.requirementId ?? null, override: body?.override === true, mode: body?.mode === "EINLADEN" ? "EINLADEN" : "EINTEILEN" }));
patch("/assignments/:id", ({ ctx, params, body }) => { if (body?.workedMinutes !== undefined) return ok(() => Shifts.setWorkedMinutes(ctx, params.id, Number(body.workedMinutes))); if (!["CONFIRM", "REJECT", "WAITLIST"].includes(body?.decision)) throw badRequest("decision muss CONFIRM, REJECT oder WAITLIST sein."); return Shifts.decideAssignment(ctx, params.id, body.decision, { requirementId: body.requirementId ?? null, override: body.override === true }); });
del("/assignments/:id", ({ ctx, params }) => ok(() => Shifts.removeFromShift(ctx, params.id)));
put("/shifts/:id/resources", ({ ctx, params, body }) => ok(() => Shifts.setShiftResources(ctx, params.id, { vehicleIds: body?.vehicleIds, materials: body?.materials })));

// ── Lagekarte (Sanitätsdienste) ──
get("/shifts/:id/map", ({ ctx, params }) => Lage.getLagekarte(ctx, params.id));
post("/shifts/:id/map/objects", ({ ctx, params, body }) => Lage.createMapObject(ctx, params.id, body));
put("/shifts/:id/map/view", ({ ctx, params, body }) => ok(() => Lage.setMapView(ctx, params.id, body)));
patch("/map-objects/:id", ({ ctx, params, body }) => Lage.updateMapObject(ctx, params.id, body));
del("/map-objects/:id", ({ ctx, params }) => ok(() => Lage.deleteMapObject(ctx, params.id)));

// ── Veranstaltungen, Kalender, Berichte ──
get("/events", ({ ctx, q }) => Events.listEvents(ctx, { from: q.get("from") ? date(q.get("from"), new Date()) : undefined, to: q.get("to") ? date(q.get("to"), new Date()) : undefined, unitId: q.get("unitId") ?? undefined }));
post("/events", ({ ctx, body }) => Events.createEvent(ctx, body));
get("/events/:id", ({ ctx, params }) => Events.getEvent(ctx, params.id));
patch("/events/:id", ({ ctx, params, body }) => ok(() => Events.updateEvent(ctx, params.id, body)));
post("/events/:id/cancel", ({ ctx, params }) => ok(() => Events.cancelEvent(ctx, params.id)), 200);
get("/calendar", ({ ctx, q }) => { const f = date(q.get("from"), new Date()); return Cal.calendarEntries(ctx, { from: f, to: date(q.get("to"), new Date(f.getTime() + 31 * 86_400_000)), types: list(q, "type") as never, unitId: q.get("unitId") ?? undefined, mine: q.get("mine") === "1" }); });
get("/reports/:key/data", ({ ctx, params, q }) => { if (!(Reports.REPORT_KEYS as readonly string[]).includes(params.key)) throw notFound(); const f = date(q.get("from"), new Date(new Date().getFullYear(), 0, 1)); return Reports.buildReport(ctx, params.key as never, { from: f, to: date(q.get("to"), new Date()), unitId: q.get("unitId") ?? undefined }); });

// ── Ressourcen ──
get("/vehicles", ({ ctx, q }) => Vehicles.listVehicles(ctx, { unitId: q.get("unitId") ?? undefined, status: q.get("status") ?? undefined }));
post("/vehicles", ({ ctx, body }) => Vehicles.createVehicle(ctx, body));
get("/vehicles/:id", ({ ctx, params }) => Vehicles.getVehicle(ctx, params.id));
patch("/vehicles/:id", ({ ctx, params, body }) => Vehicles.updateVehicle(ctx, params.id, body));
del("/vehicles/:id", ({ ctx, params }) => ok(() => Vehicles.deleteVehicle(ctx, params.id)));
post("/vehicles/:id/maintenance", ({ ctx, params, body }) => ok(() => Vehicles.addMaintenance(ctx, params.id, body)));
get("/materials", ({ ctx, q }) => Materials.listMaterials(ctx, { unitId: q.get("unitId") ?? undefined, category: q.get("category") ?? undefined, flagged: q.get("flagged") === "1" }));
post("/materials", ({ ctx, body }) => Materials.createMaterial(ctx, body));
get("/materials/:id", ({ ctx, params }) => Materials.getMaterial(ctx, params.id));
patch("/materials/:id", ({ ctx, params, body }) => ok(() => Materials.updateMaterial(ctx, params.id, body)));
del("/materials/:id", ({ ctx, params }) => ok(() => Materials.deleteMaterial(ctx, params.id)));
post("/materials/:id/issue", ({ ctx, params, body }) => Materials.issueMaterial(ctx, params.id, String(body?.helperId ?? ""), Number(body?.quantity ?? 1), body?.note));
post("/material-issues/:id/return", ({ ctx, params }) => ok(() => Materials.returnMaterial(ctx, params.id)), 200);
get("/documents", ({ ctx, q }) => Docs.listDocuments(ctx, { unitId: q.get("unitId") ?? undefined, category: (q.get("category") as never) ?? undefined, ownerHelperId: q.get("helperId") ?? undefined, vehicleId: q.get("vehicleId") ?? undefined, q: q.get("q") ?? undefined }));
get("/documents/:id", ({ ctx, params }) => Docs.getDocument(ctx, params.id));
del("/documents/:id", ({ ctx, params }) => ok(() => Docs.deleteDocument(ctx, params.id)));

// ── Kommunikation ──
get("/messages", ({ ctx }) => Messages.inbox(ctx));
get("/messages/sent", ({ ctx }) => Messages.sentMessages(ctx));
post("/messages", ({ ctx, body }) => Messages.sendMessage(ctx, body).then((m) => ({ id: m.id })));
get("/messages/:id", ({ ctx, params }) => Messages.readMessage(ctx, params.id));
get("/announcements", ({ ctx }) => Messages.listAnnouncements(ctx));
post("/announcements", ({ ctx, body }) => Messages.createAnnouncement(ctx, body).then((a) => ({ id: a.id })));
del("/announcements/:id", ({ ctx, params }) => ok(() => Messages.deleteAnnouncement(ctx, params.id)));
get("/notifications", ({ ctx, q }) => Notifs.listNotifications(ctx, { unreadOnly: q.get("unread") === "1", take: int(q.get("limit")) }));
post("/notifications/read-all", ({ ctx }) => ok(() => Notifs.markAllRead(ctx)), 200);
post("/notifications/:id/read", ({ ctx, params }) => ok(() => Notifs.markRead(ctx, params.id)), 200);
get("/me/notification-preferences", ({ ctx }) => Notifs.getPreferences(ctx));
put("/me/notification-preferences", ({ ctx, body }) => ok(() => Notifs.setPreferences(ctx, body?.preferences ?? [])));
post("/me/push", ({ ctx, body }) => ok(() => Notifs.savePushSubscription(ctx, body)));
del("/me/push", ({ ctx, body }) => ok(() => Notifs.removePushSubscription(ctx, String(body?.endpoint ?? ""))));

export async function dispatch(method: string, path: string[], call: Omit<Call, "params">): Promise<{ status: number; data: unknown } | null> {
  for (const r of routes) {
    if (r.method !== method || r.segs.length !== path.length) continue;
    const params: Record<string, string> = {};
    if (!r.segs.every((s, i) => (s.startsWith(":") ? ((params[s.slice(1)] = decodeURIComponent(path[i])), true) : s === path[i]))) continue;
    return { status: r.status ?? 200, data: await r.handler({ ...call, params }) };
  }
  return null;
}
export const routeCount = () => routes.length;
