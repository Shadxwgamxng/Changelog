// Demo-Daten für Entwicklung und Vorführung. NICHT für Produktion (verwendet bekannte Passwörter).
import "dotenv/config";
import { prisma } from "../src/server/db";
import { ensureDefaultQualifications, ensureDefaultRoles } from "../src/server/bootstrap";
import { hashPassword } from "../src/lib/crypto";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "yes") {
  console.error("Seed ist für Produktion gesperrt (ALLOW_DEMO_SEED=yes setzen, falls wirklich gewollt).");
  process.exit(1);
}

const PASSWORD = "Demo#Passwort1";
const DAY = 86_400_000;
const at = (days: number, hour: number, minute = 0) => {
  const d = new Date(Date.now() + days * DAY);
  // Berliner Ortszeit grob über UTC+2/+1 approximiert – für Demozwecke ausreichend
  d.setUTCHours(hour - 2, minute, 0, 0);
  return d;
};

async function unit(name: string, type: Parameters<typeof prisma.orgUnit.create>[0]["data"]["type"], parent?: { id: string; path: string }) {
  const u = await prisma.orgUnit.create({ data: { name, type, parentId: parent?.id ?? null, path: `tmp-${Math.random()}` } });
  return prisma.orgUnit.update({ where: { id: u.id }, data: { path: `${parent?.path ?? "/"}${u.id}/` } });
}

async function main() {
  const existing = await prisma.orgUnit.count();
  if (existing > 0) { console.log("Datenbank enthält bereits Daten – Seed übersprungen. (npm run db:reset für Neuanfang)"); return; }
  await ensureDefaultRoles();
  const qt = await ensureDefaultQualifications();
  const pwHash = await hashPassword(PASSWORD);

  const kv = await unit("DRK Kreisverband Musterkreis", "KREISVERBAND");
  const ovA = await unit("Ortsverein Musterstadt", "ORTSVEREIN", kv);
  const berA = await unit("Bereitschaft Musterstadt", "BEREITSCHAFT", ovA);
  const jrkA = await unit("Jugendrotkreuz Musterstadt", "JUGENDROTKREUZ", ovA);
  const ovB = await unit("Ortsverein Beispielstadt", "ORTSVEREIN", kv);
  const berB = await unit("Bereitschaft Beispielstadt", "BEREITSCHAFT", ovB);
  const ww = await unit("Wasserwacht Beispielstadt", "WASSERWACHT", ovB);
  const eeN = await unit("Einsatzeinheit Nord", "EINSATZEINHEIT", kv);
  const seg = await unit("SEG Sanitätsdienst", "SEG", kv);
  void jrkA; void ww; void eeN; void seg;

  const roles = Object.fromEntries((await prisma.roleDefinition.findMany()).map((r) => [r.key, r.id]));
  const q = (n: string) => qt.get(n)!;

  async function person(unitId: string, first: string, last: string, opts: { role?: string; scope?: "UNIT" | "SUBTREE"; email?: string; functions?: string[]; group?: string; quals?: [string, number | null][]; extra?: Record<string, unknown>; sys?: "SUPERADMIN" | "SYSTEMADMIN" | "SUPPORT" } = {}) {
    const email = opts.email ?? `${first}.${last}`.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss") + "@demo.hypax.de";
    const user = await prisma.user.create({ data: { email, passwordHash: pwHash, systemRole: opts.sys ?? "NONE" } });
    if (opts.role) await prisma.roleAssignment.create({ data: { userId: user.id, unitId, roleId: roles[opts.role], scope: opts.scope ?? "UNIT" } });
    const h = await prisma.helper.create({
      data: {
        unitId, userId: user.id, firstName: first, lastName: last, email, functions: opts.functions ?? ["HELFER"], groupName: opts.group,
        memberNumber: `DRK-${Math.floor(10000 + Math.random() * 89999)}`, joinedAt: new Date(Date.now() - (200 + Math.floor(Math.random() * 3000)) * DAY),
        birthDate: new Date(1970 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27)),
        phone: `0171 ${Math.floor(1000000 + Math.random() * 8999999)}`, street: "Rotkreuzstraße " + (1 + Math.floor(Math.random() * 40)), zip: "12345", city: "Musterstadt",
        ...opts.extra,
      },
    });
    for (const [name, days] of opts.quals ?? []) {
      await prisma.helperQualification.create({ data: { helperId: h.id, typeId: q(name), issuedAt: new Date(Date.now() - 400 * DAY), validUntil: days === null ? null : new Date(Date.now() + days * DAY) } });
    }
    return { user, helper: h };
  }

  await person(kv.id, "Sabine", "Superadmin", { email: "admin@demo.hypax.de", sys: "SUPERADMIN", functions: [] });
  await prisma.helper.deleteMany({ where: { firstName: "Sabine" } });
  await person(kv.id, "Sven", "Support", { email: "support@demo.hypax.de", sys: "SUPPORT", functions: [] });
  await prisma.helper.deleteMany({ where: { firstName: "Sven", lastName: "Support" } });

  const leiter = await person(ovA.id, "Lena", "Leitner", { email: "leitung@demo.hypax.de", role: "EINHEITENLEITER", scope: "SUBTREE", functions: ["ZUGFUEHRER", "EINSATZLEITER"], quals: [["Zugführer", null], ["Rettungssanitäter", 300], ["Einsatzleiter Sanitätsdienst", 500], ["Sprechfunk (BOS)", null]] });
  const planer = await person(berA.id, "Paul", "Planer", { email: "planer@demo.hypax.de", role: "DIENSTPLANER", functions: ["HELFER", "FUNKER"], quals: [["Sanitätshelfer", 400], ["Sprechfunk (BOS)", null]] });
  const max = await person(berA.id, "Max", "Mustermann", { email: "max@demo.hypax.de", role: "HELFER", group: "Gruppe 1", functions: ["HELFER", "SANITAETER", "AUSBILDER"], quals: [["Sanitätshelfer", 45], ["Erste-Hilfe-Ausbilder", 700], ["Sprechfunk (BOS)", null], ["Führerschein Klasse C1", null]] });
  const anna = await person(berA.id, "Anna", "Beispiel", { role: "GRUPPENFUEHRER", group: "Gruppe 1", functions: ["GRUPPENFUEHRER", "SANITAETER"], quals: [["Sanitätshelfer", 200], ["Gruppenführer", null], ["Sprechfunk (BOS)", null]] });
  const peter = await person(berA.id, "Peter", "Beispiel", { role: "HELFER", group: "Gruppe 2", functions: ["HELFER", "FAHRER"], quals: [["Sanitätshelfer", 20], ["Führerschein Klasse C1", null]] });
  const names: [string, string, string[], [string, number | null][], string][] = [
    ["Rita", "Retter", ["SANITAETER", "RETTUNGSSANITAETER"], [["Rettungssanitäter", 365], ["Sprechfunk (BOS)", null]], "Gruppe 1"],
    ["Dirk", "Fahrer", ["FAHRER", "HELFER"], [["Führerschein Klasse C1", null], ["Sanitätshelfer", 90]], "Gruppe 2"],
    ["Sara", "Sanitz", ["SANITAETER"], [["Sanitätshelfer", 300]], "Gruppe 1"],
    ["Tim", "Thaler", ["HELFER"], [["Erste-Hilfe-Ausbildung", 100]], "Gruppe 2"],
    ["Uta", "Unger", ["SANITAETER"], [["Sanitätshelfer", -12]], "Gruppe 2"],
    ["Ben", "Brandt", ["HELFER", "FAHRER"], [["Führerschein Klasse B", null], ["Sanitätshelfer", 500]], "Gruppe 1"],
    ["Clara", "Conrad", ["SANITAETER"], [["Sanitätshelfer", 600], ["Sprechfunk (BOS)", null]], "Gruppe 2"],
    ["Emil", "Ebert", ["HELFER"], [["Erste-Hilfe-Ausbildung", 400]], "Gruppe 1"],
    ["Fiona", "Fuchs", ["SANITAETER", "BETREUER"], [["Sanitätshelfer", 150]], "Gruppe 2"],
    ["Georg", "Graf", ["HELFER"], [["Motorsäge (Basis)", null]], "Gruppe 1"],
  ];
  const crew = [];
  for (const [f, l, fn, qs, g] of names) crew.push(await person(berA.id, f, l, { role: "HELFER", functions: fn, quals: qs, group: g }));
  const bl = await person(berA.id, "Bernd", "Bereitschaftsleiter", { email: "bereitschaft@demo.hypax.de", role: "BEREITSCHAFTSLEITER", functions: ["EINSATZLEITER", "SANITAETER"], quals: [["Rettungssanitäter", 250], ["Einsatzleiter Sanitätsdienst", 400]] });
  const fremd = await person(berB.id, "Frieda", "Fremd", { email: "fremd@demo.hypax.de", role: "BEREITSCHAFTSLEITER", functions: ["SANITAETER"], quals: [["Sanitätshelfer", 100]] });
  await person(berB.id, "Olaf", "Beispielstädter", { role: "HELFER", quals: [["Sanitätshelfer", 100]] });

  // Fahrzeuge & Material
  const rtw = await prisma.vehicle.create({ data: { unitId: berA.id, name: "RTW 1", callSign: "Rotkreuz Musterstadt 71/83-1", plate: "MU-RK 112", type: "RTW", location: "Rettungswache", odometerKm: 84210, tuvDue: new Date(Date.now() + 40 * DAY), huDue: new Date(Date.now() + 200 * DAY), insuranceDue: new Date(Date.now() + 300 * DAY) } });
  await prisma.vehicle.create({ data: { unitId: berA.id, name: "KTW 2", callSign: "Rotkreuz Musterstadt 71/85-1", plate: "MU-RK 115", type: "KTW", odometerKm: 120500, tuvDue: new Date(Date.now() - 12 * DAY), huDue: new Date(Date.now() + 90 * DAY), status: "EINGESCHRAENKT" } });
  await prisma.vehicle.create({ data: { unitId: berA.id, name: "MTW", callSign: "Rotkreuz Musterstadt 71/19-1", plate: "MU-RK 120", type: "Mannschaftstransporter", odometerKm: 56000, status: "IN_WARTUNG" } });
  await prisma.vehicle.create({ data: { unitId: berB.id, name: "KdoW Beispielstadt", plate: "BS-RK 1", type: "Kommandowagen" } });
  await prisma.vehicleMaintenance.create({ data: { vehicleId: rtw.id, date: new Date(Date.now() - 90 * DAY), description: "Inspektion & Ölwechsel", odometerKm: 80000, cost: 640 } });
  const aed = await prisma.materialItem.create({ data: { unitId: berA.id, name: "AED", category: "Medizin", quantity: 3, minQuantity: 2, location: "Lager A", serialNumber: "AED-2291", maintenanceDue: new Date(Date.now() + 25 * DAY) } });
  await prisma.materialItem.create({ data: { unitId: berA.id, name: "Sanitätsrucksack", category: "Medizin", quantity: 4, minQuantity: 4, location: "Lager A", responsibleId: anna.helper.id } });
  await prisma.materialItem.create({ data: { unitId: berA.id, name: "Funkgerät (Handfunk)", category: "Funk", quantity: 8, minQuantity: 6, location: "Funkraum", maintenanceDue: new Date(Date.now() + 120 * DAY) } });
  await prisma.materialItem.create({ data: { unitId: berA.id, name: "Verbandkasten Typ B", category: "Verbrauchsmaterial", quantity: 5, minQuantity: 8, expiresAt: new Date(Date.now() + 35 * DAY) } });
  await prisma.materialItem.create({ data: { unitId: berA.id, name: "Zelt 6×6 m", category: "Ausrüstung", quantity: 2, minQuantity: 1, status: "DEFEKT", notes: "Gestänge gebrochen" } });
  await prisma.materialItem.create({ data: { unitId: berA.id, name: "Trage (Schleifkorb)", category: "Rettung", quantity: 3, minQuantity: 2 } });

  // Veranstaltung & Dienste
  const fest = await prisma.event.create({ data: { unitId: berA.id, name: "Stadtfest Musterstadt", description: "Dreitägiges Stadtfest mit Sanitätsdienst am Hauptplatz.", startsAt: at(30, 14), endsAt: at(31, 3), location: "Hauptplatz Musterstadt", organizer: "Stadt Musterstadt", tasks: { create: [{ kind: "SANITAETSDIENST", title: "Sanitätsdienst Hauptplatz" }, { kind: "EINSATZLEITUNG", title: "Einsatzleitung besetzen" }, { kind: "FAHRZEUG", title: "RTW bereitstellen" }, { kind: "MATERIAL", title: "AED & Rucksäcke packen" }, { kind: "FUNK", title: "Funkplan abstimmen" }] } } });
  const mkShift = async (name: string, kind: Parameters<typeof prisma.shift.create>[0]["data"]["kind"], start: Date, end: Date, status: "OFFEN" | "ENTWURF" | "ABGESCHLOSSEN", reqs: { label: string; count: number; fn?: string; q?: string[] }[], extra: Record<string, unknown> = {}) =>
    prisma.shift.create({ data: { unitId: berA.id, name, kind, startsAt: start, endsAt: end, status, meetingPoint: "Unterkunft Bereitschaft", location: "Musterstadt", responsibleId: bl.helper.id, requirements: { create: reqs.map((r, i) => ({ label: r.label, count: r.count, functionKey: r.fn, sortOrder: i, qualifications: { create: (r.q ?? []).map((n) => ({ typeId: q(n) })) } })) }, ...extra } });

  const sd = await mkShift("Sanitätsdienst Stadtfest", "SANITAETSDIENST", at(30, 18), at(31, 2), "OFFEN", [
    { label: "Einsatzleiter", count: 1, q: ["Einsatzleiter Sanitätsdienst"] }, { label: "Rettungssanitäter", count: 2, q: ["Rettungssanitäter"] }, { label: "Sanitätshelfer", count: 4, q: ["Sanitätshelfer"] }, { label: "Fahrer", count: 1, fn: "FAHRER", q: ["Führerschein Klasse B"] },
  ], { eventId: fest.id, organizer: "Stadt Musterstadt", description: "Sanitätsdienst auf dem Stadtfest. Dienstkleidung, Verpflegung wird gestellt." });
  await prisma.shiftVehicle.create({ data: { shiftId: sd.id, vehicleId: rtw.id } });
  await prisma.shiftMaterial.create({ data: { shiftId: sd.id, materialId: aed.id, quantity: 2 } });
  const ab = await mkShift("Bereitschaftsabend", "BEREITSCHAFTSABEND", at(3, 19), at(3, 21, 30), "OFFEN", [{ label: "Helfer", count: 12 }]);
  const aus = await mkShift("Ausbildungsabend: Reanimation", "AUSBILDUNG", at(6, 19), at(6, 21, 30), "OFFEN", [{ label: "Teilnehmer", count: 15 }, { label: "Ausbilder", count: 1, fn: "AUSBILDER", q: ["Erste-Hilfe-Ausbilder"] }]);
  await mkShift("Sanitätsdienst Fußballspiel", "SANITAETSDIENST", at(12, 13), at(12, 19), "OFFEN", [{ label: "Rettungssanitäter", count: 1, q: ["Rettungssanitäter"] }, { label: "Sanitätshelfer", count: 3, q: ["Sanitätshelfer"] }]);
  await mkShift("Sanitätsdienst Marathon (Entwurf)", "SANITAETSDIENST", at(50, 8), at(50, 16), "ENTWURF", [{ label: "Sanitätshelfer", count: 6, q: ["Sanitätshelfer"] }]);
  const past1 = await mkShift("Sanitätsdienst Schützenfest", "SANITAETSDIENST", at(-20, 12), at(-20, 22), "ABGESCHLOSSEN", [{ label: "Sanitätshelfer", count: 3, q: ["Sanitätshelfer"] }]);
  const past2 = await mkShift("Ausbildung: Funk", "AUSBILDUNG", at(-9, 19), at(-9, 21, 30), "ABGESCHLOSSEN", [{ label: "Teilnehmer", count: 10 }]);

  const mk = (shiftId: string, helperId: string, status: "BESTAETIGT" | "ANGEFRAGT" | "EINGELADEN" | "WARTELISTE", worked?: number, requirementId?: string | null) => prisma.shiftAssignment.create({ data: { shiftId, helperId, status, source: status === "ANGEFRAGT" ? "SELBST" : "PLANER", workedMinutes: worked, requirementId: requirementId ?? null } });
  for (const [s, mins] of [[past1, 600], [past2, 150]] as const) for (const p of [max, anna, peter, ...crew.slice(0, 4)]) await mk(s.id, p.helper.id, "BESTAETIGT", mins);
  const reqOf = async (shiftId: string, label: string) => (await prisma.shiftRequirement.findFirstOrThrow({ where: { shiftId, label } })).id;
  await mk(sd.id, leiter.helper.id, "BESTAETIGT", undefined, await reqOf(sd.id, "Einsatzleiter"));
  await mk(sd.id, crew[0].helper.id, "BESTAETIGT", undefined, await reqOf(sd.id, "Rettungssanitäter"));
  await mk(sd.id, anna.helper.id, "BESTAETIGT", undefined, await reqOf(sd.id, "Sanitätshelfer"));
  await mk(sd.id, max.helper.id, "ANGEFRAGT");
  await mk(sd.id, peter.helper.id, "ANGEFRAGT");
  await mk(sd.id, crew[1].helper.id, "ANGEFRAGT");
  for (const p of [max, anna, peter, ...crew.slice(0, 5)]) await mk(ab.id, p.helper.id, "BESTAETIGT");
  await mk(aus.id, max.helper.id, "BESTAETIGT");

  // Verfügbarkeit
  const d = (days: number) => new Date(new Date(Date.now() + days * DAY).toISOString().slice(0, 10));
  await prisma.availability.create({ data: { helperId: max.helper.id, startDate: d(0), endDate: d(2), status: "VERFUEGBAR" } });
  await prisma.availability.create({ data: { helperId: max.helper.id, startDate: d(8), endDate: d(14), status: "NICHT_VERFUEGBAR", reason: "URLAUB", note: "Familienurlaub" } });
  await prisma.availability.create({ data: { helperId: crew[2].helper.id, startDate: d(29), endDate: d(31), status: "NICHT_VERFUEGBAR", reason: "ARBEIT" } });
  await prisma.availability.create({ data: { helperId: crew[0].helper.id, startDate: d(28), endDate: d(32), status: "VERFUEGBAR" } });
  await prisma.availability.create({ data: { helperId: anna.helper.id, startDate: d(0), endDate: d(60), status: "EINGESCHRAENKT", reason: "SCHULE", note: "Prüfungsphase" } });

  // Kommunikation & Alarmierung
  await prisma.announcement.create({ data: { unitId: berA.id, title: "Bereitschaftsabend am Donnerstag", body: "Der nächste Bereitschaftsabend findet am Donnerstag um 19:00 Uhr statt.", important: true, pinned: true, createdById: bl.user.id } });
  await prisma.announcement.create({ data: { unitId: ovA.id, title: "Mitgliederversammlung", body: "Die Mitgliederversammlung des Ortsvereins ist am 14. des Monats um 19:30 Uhr im Vereinsheim.", createdById: leiter.user.id } });
  const alert = await prisma.alert.create({ data: { unitId: berA.id, title: "Sanitätsdienst Veranstaltung", message: "Zusätzliche Kräfte für Sanitätsdienst gesucht.", meetingPoint: "Unterkunft", meetingTime: at(0, 18, 30), audienceType: "EINHEIT", createdById: bl.user.id, status: "AKTIV" } });
  const recips = [max, anna, peter, ...crew.slice(0, 6)];
  for (const [i, p] of recips.entries()) await prisma.alertRecipient.create({ data: { alertId: alert.id, helperId: p.helper.id, response: i === 1 ? "KOMME" : i === 2 ? "VIELLEICHT" : i === 3 ? "KANN_NICHT" : "OFFEN", respondedAt: i >= 1 && i <= 3 ? new Date() : null } });
  const msg = await prisma.message.create({ data: { senderId: bl.user.id, subject: "Dienstkleidung Stadtfest", body: "Bitte denkt an die rote Einsatzjacke und festes Schuhwerk.", audience: "Bereitschaft Musterstadt" } });
  await prisma.messageRecipient.createMany({ data: [max, anna, peter].map((p) => ({ messageId: msg.id, userId: p.user.id })) });
  await prisma.notification.createMany({ data: [
    { userId: max.user.id, type: "DIENST_NEU", title: "Neuer Dienst: Sanitätsdienst Stadtfest", link: `/shifts/${sd.id}` },
    { userId: max.user.id, type: "BEKANNTMACHUNG", title: "📢 Wichtige Information", link: "/messages?tab=announcements" },
  ] });

  // Einsatz (datensparsam)
  await prisma.incident.create({ data: { unitId: berA.id, number: `${new Date().getFullYear()}-001`, kind: "Sanitätsdienst", startedAt: at(-20, 12), endedAt: at(-20, 22), location: "Schützenplatz", documentation: "Ruhiger Verlauf, 7 Hilfeleistungen, 1 Transport.", status: "ABGESCHLOSSEN", helpers: { create: [{ helperId: max.helper.id, role: "Sanitäter" }, { helperId: anna.helper.id, role: "Gruppenführerin" }] }, vehicles: { create: [{ vehicleId: rtw.id }] } } });
  void fremd; void planer; void jrkA;
  console.log(`\nDemo-Daten angelegt. Passwort für alle Demo-Konten: ${PASSWORD}\n  admin@demo.hypax.de (Superadmin) · leitung@demo.hypax.de (Einheitenleiter OV) · bereitschaft@demo.hypax.de (Bereitschaftsleiter)\n  planer@demo.hypax.de (Dienstplaner) · max@demo.hypax.de (Helfer) · fremd@demo.hypax.de (andere Einheit)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
