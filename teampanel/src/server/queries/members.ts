import "server-only";
import type { AirsoftRole, Prisma, RoleKey } from "@prisma/client";
import { db } from "@/lib/db";
import { can, type Actor } from "@/lib/permissions";

/** Was ein Betrachter von einem Mitglied sehen darf. Rohdaten gelangen nie direkt an die UI. */
export interface MemberView {
  id: string;
  username: string;
  role: RoleKey;
  active: boolean;
  firstName: string;
  lastName: string;
  callsign: string | null;
  avatarUrl: string | null;
  joinedAt: Date;
  bio: string | null;
  airsoftRole: AirsoftRole;
  email: string | null;
  phone: string | null;
  phoneVisible: boolean;
  adminNotes: string | null;
  lastLoginAt: Date | null;
}

const memberInclude = { role: true, profile: true } satisfies Prisma.UserInclude;
type MemberRow = Prisma.UserGetPayload<{ include: typeof memberInclude }>;

export function toMemberView(row: MemberRow, viewer: Actor): MemberView | null {
  const p = row.profile;
  if (!p) return null;
  const isSelf = row.id === viewer.id;
  const admin = can(viewer, "members.viewAdmin");
  return {
    id: row.id,
    username: row.username,
    role: row.role.key,
    active: row.active,
    firstName: p.firstName,
    lastName: p.lastName,
    callsign: p.callsign,
    avatarUrl: p.avatarUrl,
    joinedAt: p.joinedAt,
    bio: p.bio,
    airsoftRole: p.airsoftRole,
    email: admin || isSelf ? row.email : null,
    phone: admin || isSelf || p.phoneVisible ? p.phone : null,
    phoneVisible: p.phoneVisible,
    adminNotes: can(viewer, "members.viewNotes") ? p.adminNotes : null,
    lastLoginAt: admin ? row.lastLoginAt : null,
  };
}

export interface MemberFilters {
  q?: string;
  role?: RoleKey;
  airsoftRole?: AirsoftRole;
  status?: "active" | "inactive" | "all";
}

export async function listMembers(viewer: Actor, filters: MemberFilters = {}): Promise<MemberView[]> {
  const admin = can(viewer, "members.viewAdmin");
  const status = admin ? (filters.status ?? "all") : "active";
  const q = filters.q?.trim();
  const where: Prisma.UserWhereInput = {
    profile: { isNot: null },
    ...(status === "active" ? { active: true } : status === "inactive" ? { active: false } : {}),
    ...(filters.role ? { role: { key: filters.role } } : {}),
    ...(filters.airsoftRole ? { profile: { is: { airsoftRole: filters.airsoftRole } } } : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            ...(admin ? [{ email: { contains: q, mode: "insensitive" as const } }] : []),
            { profile: { is: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { callsign: { contains: q, mode: "insensitive" } }] } } },
          ],
        }
      : {}),
  };
  const rows = await db.user.findMany({ where, include: memberInclude, orderBy: [{ profile: { lastName: "asc" } }, { profile: { firstName: "asc" } }] });
  return rows.map((r) => toMemberView(r, viewer)).filter((m): m is MemberView => m !== null);
}

export async function getMember(viewer: Actor, id: string): Promise<MemberView | null> {
  const row = await db.user.findUnique({ where: { id }, include: memberInclude });
  if (!row) return null;
  // Inaktive Mitglieder sieht nur die Verwaltung
  if (!row.active && !can(viewer, "members.viewAdmin") && row.id !== viewer.id) return null;
  return toMemberView(row, viewer);
}
