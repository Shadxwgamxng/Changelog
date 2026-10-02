/**
 * Demo-Daten für Entwicklung und Test. NICHT in Produktion verwenden!
 * Aufruf: npm run db:seed   (bricht ab, wenn bereits Benutzer existieren; SEED_FORCE=true löscht vorher alle Daten)
 */
import "dotenv/config";
import { PrismaClient, type AirsoftRole, type EquipmentCategory, type OwnershipStatus, type RoleKey } from "@prisma/client";
import { ensureBaseData } from "./base";
import { hashPassword } from "../src/lib/password";
import { addDays, dayKey, localToDate } from "../src/lib/dates";

const db = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "DEMO-Passwort-2026!";

const at = (offsetDays: number, time: string) => localToDate(`${dayKey(addDays(new Date(), offsetDays))}T${time}`)!;

interface DemoMember {
  username: string;
  first: string;
  last: string;
  callsign: string;
  role: RoleKey;
  airsoft: AirsoftRole;
  joinedYear: number;
  bio: string;
  active?: boolean;
  notes?: string;
}

const MEMBERS: DemoMember[] = [
  { username: "superadmin", first: "Jan", last: "Petersen", callsign: "Kommandant", role: "SUPERADMIN", airsoft: "SQUAD_LEADER", joinedYear: 2019, bio: "Gründer des Teams, koordiniert Termine und Organisation." },
  { username: "admin", first: "Max", last: "Müller", callsign: "Raptor", role: "ADMIN", airsoft: "SUPPORT_GUNNER", joinedYear: 2020, bio: "Verwaltet Mitglieder und Ausrüstung. Spielt am liebsten Support mit der MG.", notes: "Hat Schlüssel für das Vereinsheim." },
  { username: "leader", first: "Leif", last: "Andresen", callsign: "Alpha", role: "TEAMLEITUNG", airsoft: "SQUAD_LEADER", joinedYear: 2020, bio: "Führt das Squad im Spiel und plant die Spieltage." },
  { username: "member", first: "Jonas", last: "Meier", callsign: "Ghost", role: "MITGLIED", airsoft: "RECON", joinedYear: 2023, bio: "Leise unterwegs, liebt Waldmaps.", notes: "Fährt oft aus Neumünster mit." },
  { username: "viking", first: "Sven", last: "Jensen", callsign: "Viking", role: "MITGLIED", airsoft: "RIFLEMAN", joinedYear: 2021, bio: "Allrounder aus Flensburg." },
  { username: "doc", first: "Lena", last: "Thomsen", callsign: "Doc", role: "MITGLIED", airsoft: "MEDIC", joinedYear: 2022, bio: "Erste-Hilfe-Ausbilderin, kümmert sich um das Sanitätsmaterial." },
  { username: "hawk", first: "Kai", last: "Bruhn", callsign: "Hawk", role: "MITGLIED", airsoft: "SNIPER", joinedYear: 2022, bio: "Geduldiger Scharfschütze." },
  { username: "echo", first: "Mia", last: "Clausen", callsign: "Echo", role: "MITGLIED", airsoft: "FUNKER", joinedYear: 2024, bio: "Hält die Funkverbindung im Team." },
  { username: "wheels", first: "Tim", last: "Sörensen", callsign: "Wheels", role: "MITGLIED", airsoft: "FAHRER", joinedYear: 2023, bio: "Hat einen Neunsitzer und fährt gern." },
  { username: "nordlicht", first: "Finn", last: "Ohlsen", callsign: "Nordlicht", role: "MITGLIED", airsoft: "RIFLEMAN", joinedYear: 2025, bio: "Neu im Team, lernt schnell." },
  { username: "rookie", first: "Paul", last: "Witt", callsign: "Rookie", role: "MITGLIED", airsoft: "SONSTIGE", joinedYear: 2024, bio: "Pausiert aktuell.", active: false },
];

const EMAIL_OVERRIDE: Record<string, string> = { admin: "admin@example.local", member: "member@example.local", leader: "leader@example.local", superadmin: "superadmin@example.local" };

interface DemoEquipment {
  key: string;
  name: string;
  category: EquipmentCategory;
  required: boolean;
  qty?: number;
  price?: number;
  manufacturer?: string;
  model?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

const EQUIPMENT: DemoEquipment[] = [
  { key: "eyes", name: "Vollschutz-Schutzbrille", category: "EYE_PROTECTION", required: true, price: 4999, manufacturer: "Beispiel-Hersteller", model: "Ballistic-X", priority: "HIGH", description: "Splitterschutz nach EN 166, Pflicht auf jedem Spielfeld." },
  { key: "face", name: "Gesichtsschutz Mesh", category: "FACE_PROTECTION", required: true, price: 2499, priority: "HIGH", description: "Mesh-Maske zum Schutz von Mund, Nase und Zähnen." },
  { key: "primary", name: "Primärwaffe (AEG/GBB ≤ 0,5 J)", category: "PRIMARY_WEAPON", required: true, priority: "HIGH", description: "Deutsche Spielfeldregeln: unter 0,5 Joule, ab 18 Jahren; Waffenpapiere nicht vergessen." },
  { key: "mags", name: "Zusätzliche Magazine (Midcap)", category: "MAGAZINES", required: false, qty: 5, price: 1599, priority: "MEDIUM", description: "Mindestens 5 Magazine für einen Spieltag." },
  { key: "side", name: "Sidearm (GBB-Pistole)", category: "SIDEARM", required: false, price: 11999, priority: "LOW", description: "Backup-Waffe für Innenräume." },
  { key: "helmet", name: "Helm mit Rails", category: "HELMET", required: false, price: 8999, priority: "MEDIUM", description: "Fast-Helm-Replika inkl. Gummizug." },
  { key: "rig", name: "Chest Rig", category: "CHEST_RIG", required: true, price: 5999, priority: "MEDIUM", description: "Trägt Magazine und Kleinkram, einheitlich in Coyote." },
  { key: "plate", name: "Plattenträger", category: "PLATE_CARRIER", required: false, price: 11999, priority: "LOW", description: "Alternative zum Chest Rig." },
  { key: "uniform", name: "Feldanzug Multicam", category: "UNIFORM", required: true, price: 8999, priority: "MEDIUM", description: "Einheitliche Tarnung im Team." },
  { key: "boots", name: "Feldstiefel", category: "BOOTS", required: true, price: 7999, priority: "MEDIUM", description: "Knöchelhoch, wasserdicht, eingelaufen." },
  { key: "gloves", name: "Taktische Handschuhe", category: "GLOVES", required: false, price: 2999, priority: "LOW", description: "Schnitt- und Rutschfest." },
  { key: "radio", name: "Funkgerät PMR446", category: "RADIO", required: false, price: 3999, priority: "HIGH", description: "Teamfunk mit Headset (Kanal wird am Spieltag abgesprochen)." },
  { key: "ears", name: "Aktiver Gehörschutz", category: "HEARING_PROTECTION", required: false, price: 5999, priority: "LOW", description: "Schützt bei Außengeräuschen und Pyro." },
  { key: "ifak", name: "IFAK Erste-Hilfe-Set", category: "IFAK", required: true, price: 3499, priority: "HIGH", description: "Pflaster, Kompresse, Dreieckstuch, Rettungsdecke." },
  { key: "bag", name: "Rucksack 30 L", category: "BAGS", required: false, price: 4999, priority: "LOW", description: "Für Verpflegung und Wechselkleidung." },
  { key: "bbs", name: "BBs 0,25 g Bio (5000 Stk.)", category: "OTHER", required: true, price: 1299, priority: "MEDIUM", description: "Nur biologisch abbaubare BBs – Pflicht auf allen Spielfeldern." },
];

async function main() {
  const existing = await db.user.count();
  if (existing > 0) {
    if (process.env.SEED_FORCE !== "true") {
      console.log("ℹ Es existieren bereits Benutzer – Seed übersprungen. (SEED_FORCE=true löscht alle Daten und seedet neu.)");
      return;
    }
    await db.$transaction([
      db.auditLog.deleteMany(), db.notification.deleteMany(), db.shoppingItem.deleteMany(), db.equipmentRequirement.deleteMany(), db.userEquipment.deleteMany(),
      db.eventAttendance.deleteMany(), db.eventEquipment.deleteMany(), db.event.deleteMany(), db.equipment.deleteMany(), db.announcement.deleteMany(),
      db.session.deleteMany(), db.invitation.deleteMany(), db.passwordResetToken.deleteMany(), db.teamMemberProfile.deleteMany(), db.user.deleteMany(), db.rateLimit.deleteMany(),
    ]);
  }

  await ensureBaseData(db);
  const roles = new Map((await db.role.findMany()).map((r) => [r.key, r.id]));
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users = new Map<string, string>();
  for (const m of MEMBERS) {
    const u = await db.user.create({
      data: {
        username: m.username,
        email: EMAIL_OVERRIDE[m.username] ?? `${m.username}@example.local`,
        passwordHash,
        mustChangePassword: true,
        active: m.active ?? true,
        roleId: roles.get(m.role)!,
        profile: { create: { firstName: m.first, lastName: m.last, callsign: m.callsign, airsoftRole: m.airsoft, bio: m.bio, joinedAt: new Date(Date.UTC(m.joinedYear, 2, 15)), adminNotes: m.notes, phone: m.username === "admin" ? "+49 170 0000000" : undefined, phoneVisible: m.username === "admin" } },
      },
    });
    users.set(m.username, u.id);
  }
  const uid = (name: string) => users.get(name)!;

  await db.teamSettings.update({
    where: { id: 1 },
    data: {
      foundedYear: 2019,
      description: "Das Schleswig-Holstein Airsoft Kommando ist ein Airsoft-Team aus dem echten Norden. Wir spielen fair, sicher und mit Teamgeist – vom Wald in der Nordheide bis zu Indoor-Maps an der Küste. Wind von vorn macht uns nichts aus.",
      rules: "1. Sicherheit geht vor: Schutzbrille und Gesichtsschutz sind auf dem Spielfeld Pflicht.\n2. Fair Play: Treffer werden ehrlich gemeldet.\n3. Nur Bio-BBs, Energie unter 0,5 Joule.\n4. Zu- und Absagen bitte rechtzeitig im Panel eintragen.\n5. Respektvoller Umgang miteinander und mit anderen Teams.\n6. Müll wird wieder mitgenommen.",
      contactEmail: "kontakt@example.local",
      discordUrl: "https://discord.com/",
      instagramUrl: "https://www.instagram.com/",
    },
  });

  // Ausrüstung
  const eq = new Map<string, string>();
  for (const e of EQUIPMENT) {
    const row = await db.equipment.create({
      data: {
        name: e.name, category: e.category, required: e.required, recommendedQuantity: e.qty ?? 1, priceCents: e.price, manufacturer: e.manufacturer, model: e.model,
        priority: e.priority ?? "MEDIUM", description: e.description, shopUrl: `https://www.example.com/shop/${e.key}`, notes: "Demo-Link – bitte durch echten Shop-Link ersetzen.",
      },
    });
    eq.set(e.key, row.id);
  }

  // Persönliche Ausrüstung (Auswahl)
  const own = (user: string, owned: string[], other: Record<string, OwnershipStatus> = {}) => [
    ...owned.map((k) => ({ userId: uid(user), equipmentId: eq.get(k)!, status: "OWNED" as const, quantity: k === "mags" ? 6 : 1 })),
    ...Object.entries(other).map(([k, status]) => ({ userId: uid(user), equipmentId: eq.get(k)!, status, quantity: status === "OWNED" ? 1 : 0 })),
  ];
  const all = ["eyes", "face", "primary", "rig", "uniform", "boots", "ifak", "bbs"];
  await db.userEquipment.createMany({
    data: [
      ...own("admin", [...all, "mags", "helmet", "gloves", "radio"]),
      ...own("leader", [...all, "mags", "radio", "plate"]),
      ...own("superadmin", all),
      ...own("member", ["eyes", "face", "primary", "uniform", "boots", "rig", "bbs"], { ifak: "PARTIAL", radio: "MISSING", mags: "ORDERED", gloves: "DEFECTIVE" }),
      ...own("viking", [...all, "mags"]),
      ...own("doc", [...all, "mags", "bag"]),
      ...own("hawk", [...all.filter((k) => k !== "ifak"), "gloves"], { ifak: "ORDERED" }),
      ...own("echo", [...all, "radio", "ears"]),
      ...own("nordlicht", ["eyes", "face", "primary"], { rig: "ORDERED", boots: "MISSING" }),
    ],
  });

  // Events
  const nordheide = await db.event.create({
    data: {
      title: "Spieltag Nordheide", type: "SPIELTAG", status: "OPEN", startsAt: at(9, "09:00"), endsAt: at(9, "17:00"), location: "Airsoft-Gelände Nordheide", address: "Waldweg 1, 21255 Tostedt",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Tostedt", organizer: "Nordheide Airsoft e. V.", description: "Großes Waldgelände mit Bunkern und Wechselfeldern. Mittagessen vor Ort (Grillstation). Chronopflicht, Bio-BBs, Energie max. 0,5 J.",
      meetingPoint: "Parkplatz Autobahnraststätte Holmmoor", departureAt: at(9, "07:15"), costCents: 2500, registrationDeadline: at(6, "20:00"), maxParticipants: 12, createdById: uid("leader"),
    },
  });
  const training = await db.event.create({
    data: { title: "Funk- und Medic-Training", type: "TRAINING", status: "OPEN", startsAt: at(4, "18:30"), endsAt: at(4, "21:00"), location: "Vereinsheim Neumünster", address: "Beispielstraße 12, 24534 Neumünster", organizer: "SH Airsoft Kommando", description: "Funkdisziplin, Funksprüche und Erste Hilfe im Feld. Bitte Funkgeräte mitbringen.", costCents: 0, maxParticipants: 20, createdById: uid("admin") },
  });
  const kiel = await db.event.create({
    data: { title: "CQB-Event Kiel Hafen", type: "SPIELTAG", status: "PLANNED", startsAt: at(23, "10:00"), endsAt: at(23, "18:00"), location: "Indoor-Arena Kiel", address: "Hafenstraße 5, 24103 Kiel", organizer: "CQB Nord", description: "Indoor-Event mit Szenarien. Anmeldung öffnet in Kürze.", costCents: 3500, maxParticipants: 16, createdById: uid("leader") },
  });
  await db.event.create({
    data: { title: "Teambesprechung Saisonplanung", type: "BESPRECHUNG", status: "OPEN", startsAt: at(15, "19:00"), endsAt: at(15, "21:00"), location: "Discord", description: "Planung der Spieltage fürs nächste Quartal.", createdById: uid("superadmin") },
  });
  const past = await db.event.create({
    data: { title: "Spieltag Segeberger Forst", type: "SPIELTAG", status: "COMPLETED", startsAt: at(-14, "09:00"), endsAt: at(-14, "17:00"), location: "Segeberger Forst", organizer: "Forst-Airsoft", description: "War ein toller Tag!", costCents: 2000, createdById: uid("leader") },
  });

  await db.eventEquipment.createMany({ data: ["eyes", "face", "primary", "boots", "bbs", "ifak"].map((k) => ({ eventId: nordheide.id, equipmentId: eq.get(k)! })) });
  await db.eventEquipment.createMany({ data: ["radio", "ifak"].map((k) => ({ eventId: training.id, equipmentId: eq.get(k)! })) });

  await db.eventAttendance.createMany({
    data: [
      { eventId: nordheide.id, userId: uid("admin"), status: "ACCEPTED", canDrive: true, freeSeats: 3, departureLocation: "Hamburg-Harburg" },
      { eventId: nordheide.id, userId: uid("leader"), status: "ACCEPTED", canDrive: true, freeSeats: 2, departureLocation: "Neumünster" },
      { eventId: nordheide.id, userId: uid("member"), status: "ACCEPTED", needsRide: true, comment: "Suche Mitfahrgelegenheit ab Neumünster" },
      { eventId: nordheide.id, userId: uid("viking"), status: "ACCEPTED" },
      { eventId: nordheide.id, userId: uid("doc"), status: "ACCEPTED" },
      { eventId: nordheide.id, userId: uid("hawk"), status: "MAYBE", canDrive: true, comment: "Entscheide ich später" },
      { eventId: nordheide.id, userId: uid("echo"), status: "DECLINED", comment: "Familienfeier" },
      { eventId: training.id, userId: uid("admin"), status: "ACCEPTED" },
      { eventId: training.id, userId: uid("echo"), status: "ACCEPTED" },
      { eventId: training.id, userId: uid("doc"), status: "ACCEPTED" },
      { eventId: past.id, userId: uid("admin"), status: "ACCEPTED" },
      { eventId: past.id, userId: uid("member"), status: "ACCEPTED" },
      { eventId: past.id, userId: uid("viking"), status: "ACCEPTED" },
      { eventId: past.id, userId: uid("hawk"), status: "DECLINED" },
      { eventId: kiel.id, userId: uid("admin"), status: "MAYBE" },
    ],
  });

  // Anforderungen
  await db.equipmentRequirement.createMany({
    data: [
      ...["radio", "eyes", "ifak"].map((k) => ({ userId: uid("member"), equipmentId: eq.get(k)!, eventId: nordheide.id, dueDate: nordheide.startsAt, note: "Bis zum nächsten Spieltag", assignedById: uid("admin") })),
      { userId: uid("nordlicht"), equipmentId: eq.get("boots")!, dueDate: nordheide.startsAt, assignedById: uid("leader") },
      { userId: uid("nordlicht"), equipmentId: eq.get("mags")!, assignedById: uid("leader"), note: "Mindestens 5 Stück" },
      { userId: uid("hawk"), equipmentId: eq.get("radio")!, assignedById: uid("admin") },
    ],
  });

  // Einkaufsliste
  await db.shoppingItem.createMany({
    data: [
      { name: "Funkgerät PMR446 mit Headset", category: "RADIO", shop: "example.com", url: "https://www.example.com/shop/radio", priceCents: 3999, priority: "HIGH", quantity: 4, equipmentId: eq.get("radio")!, description: "Teamfunk-Set, Sammelbestellung geplant.", createdById: uid("admin") },
      { name: "IFAK Erste-Hilfe-Set", category: "IFAK", shop: "example.com", url: "https://www.example.com/shop/ifak", priceCents: 3499, priority: "HIGH", quantity: 3, equipmentId: eq.get("ifak")!, createdById: uid("admin") },
      { name: "Midcap-Magazine 5er-Pack", category: "MAGAZINES", shop: "example.com", url: "https://www.example.com/shop/mags", priceCents: 1599, priority: "MEDIUM", quantity: 2, equipmentId: eq.get("mags")!, status: "ORDERED", createdById: uid("leader") },
      { name: "Feldstiefel Größe 44", category: "BOOTS", shop: "example.com", url: "https://www.example.com/shop/boots", priceCents: 7999, priority: "MEDIUM", quantity: 1, targetUserId: uid("nordlicht"), createdById: uid("leader") },
    ],
  });

  // Ankündigungen
  await db.announcement.createMany({
    data: [
      { title: "Spieltag Nordheide: Anmeldung bis Freitag!", body: "Bitte tragt euch bis spätestens Freitag 20:00 Uhr im Panel ein. Wir haben nur 12 Plätze. Fahrgemeinschaften bitte direkt beim Event eintragen.\n\nTreffpunkt ist der Parkplatz Holmmoor, Abfahrt 07:15 Uhr.", priority: "URGENT", pinned: true, authorId: uid("leader"), publishedAt: at(-1, "18:00") },
      { title: "Neue Pflichtausrüstung: IFAK", body: "Ab sofort ist ein persönliches IFAK Pflicht auf jedem Spieltag. Im Bereich „Ausrüstung“ seht ihr, was euch noch fehlt – inklusive Links zu empfohlenen Produkten.", priority: "IMPORTANT", authorId: uid("admin"), publishedAt: at(-3, "12:00") },
      { title: "Willkommen im neuen Team Panel", body: "Moin zusammen! Ab jetzt organisieren wir Spieltage, Ausrüstung und News zentral hier. Bitte vervollständigt euer Profil und ändert euer Start-Passwort.", priority: "NORMAL", authorId: uid("superadmin"), publishedAt: at(-7, "10:00") },
    ],
  });

  await db.notification.createMany({
    data: [
      { userId: uid("member"), type: "EQUIPMENT_REQUIRED", title: "Dir wurde Ausrüstung zugewiesen: Funkgerät, Schutzbrille, IFAK.", href: "/shopping" },
      { userId: uid("member"), type: "EVENT_CREATED", title: "Neuer Termin: Spieltag Nordheide.", href: `/events/${nordheide.id}` },
    ],
  });

  await db.auditLog.createMany({
    data: [
      { actorId: uid("admin"), actorLabel: "Admin Raptor", action: "member.role", targetType: "User", targetId: uid("leader"), targetLabel: "leader", message: "Admin Raptor hat Alpha die Rolle Teamleitung gegeben." },
      { actorId: uid("leader"), actorLabel: "Teamleitung Alpha", action: "event.create", targetType: "Event", targetId: nordheide.id, targetLabel: nordheide.title, message: "Teamleitung Alpha hat den Termin „Spieltag Nordheide“ erstellt." },
      { actorId: uid("admin"), actorLabel: "Admin Raptor", action: "requirement.assign", targetType: "User", targetId: uid("member"), targetLabel: "member", message: "Admin Raptor hat die Ausrüstung Funkgerät, Vollschutz-Schutzbrille, IFAK Erste-Hilfe-Set zu Ghost hinzugefügt." },
    ],
  });

  console.log("✔ Demo-Daten angelegt.");
  console.log("\nDemo-Zugänge (Passwort für alle):", DEMO_PASSWORD);
  for (const u of ["superadmin@example.local (Superadmin)", "admin@example.local (Admin)", "leader@example.local (Teamleitung)", "member@example.local (Mitglied)"]) console.log("  •", u);
  console.log("\n⚠ Das sind Demo-Accounts – Passwörter nach der Installation ändern bzw. Accounts löschen!");
}

main()
  .catch((err) => {
    console.error("✖ Seed fehlgeschlagen:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
