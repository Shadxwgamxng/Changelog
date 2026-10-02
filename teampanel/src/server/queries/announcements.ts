import "server-only";
import type { AnnouncementPriority, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, type Actor } from "@/lib/permissions";

export interface AnnouncementFilters {
  q?: string;
  priority?: AnnouncementPriority;
}

const authorSelect = { select: { id: true, profile: { select: { firstName: true, lastName: true, callsign: true } } } } as const;

/** Zukünftig terminierte Ankündigungen sehen nur Autoren/Verwaltung. */
function visibility(viewer: Actor): Prisma.AnnouncementWhereInput {
  return can(viewer, "announcements.create") ? {} : { publishedAt: { lte: new Date() } };
}

export async function listAnnouncements(viewer: Actor, filters: AnnouncementFilters = {}, take?: number) {
  return db.announcement.findMany({
    where: {
      ...visibility(viewer),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.q ? { OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { body: { contains: filters.q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    include: { author: authorSelect },
    take,
  });
}

export type AnnouncementItem = Awaited<ReturnType<typeof listAnnouncements>>[number];

export async function getAnnouncement(viewer: Actor, id: string) {
  return db.announcement.findFirst({ where: { id, ...visibility(viewer) }, include: { author: authorSelect } });
}
