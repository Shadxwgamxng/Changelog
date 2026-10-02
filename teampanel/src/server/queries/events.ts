import "server-only";
import type { AttendanceStatus, EventStatus, EventType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { effectiveStatus } from "@/lib/events";

export interface EventFilters {
  range?: "upcoming" | "past" | "all";
  from?: Date;
  to?: Date;
  status?: EventStatus;
  type?: EventType;
  /** Eigene Teilnahme; NONE = noch keine Antwort */
  mine?: AttendanceStatus | "NONE";
  q?: string;
}

export interface EventCounts {
  accepted: number;
  maybe: number;
  declined: number;
}

export type EventListItem = Awaited<ReturnType<typeof listEvents>>[number];

function countsOf(attendances: { status: AttendanceStatus }[]): EventCounts {
  return {
    accepted: attendances.filter((a) => a.status === "ACCEPTED").length,
    maybe: attendances.filter((a) => a.status === "MAYBE").length,
    declined: attendances.filter((a) => a.status === "DECLINED").length,
  };
}

export async function listEvents(userId: string, filters: EventFilters = {}) {
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.q ? { OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { location: { contains: filters.q, mode: "insensitive" } }] } : {}),
    ...(filters.from || filters.to ? { startsAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: filters.to } : {}) } } : {}),
  };
  const range = filters.range ?? "all";
  if (!filters.from && !filters.to) {
    if (range === "upcoming") where.startsAt = { gte: new Date(now.getTime() - 12 * 3_600_000) };
    if (range === "past") where.startsAt = { lt: now };
  }
  const rows = await db.event.findMany({
    where,
    orderBy: { startsAt: range === "past" ? "desc" : "asc" },
    include: { attendances: { select: { userId: true, status: true } } },
  });
  const items = rows.map((e) => {
    const counts = countsOf(e.attendances);
    const mine = e.attendances.find((a) => a.userId === userId)?.status ?? null;
    const { attendances: _a, ...event } = e;
    void _a;
    return { ...event, counts, mine, effectiveStatus: effectiveStatus(e, counts.accepted, now) };
  });
  return items.filter((e) => {
    if (filters.status && e.effectiveStatus !== filters.status) return false;
    if (filters.mine === "NONE") return e.mine === null;
    if (filters.mine) return e.mine === filters.mine;
    return true;
  });
}

export async function getNextEvent(userId: string) {
  const items = await listEvents(userId, { range: "upcoming" });
  return items.find((e) => e.effectiveStatus !== "CANCELLED" && e.effectiveStatus !== "COMPLETED" && e.type === "SPIELTAG") ?? items.find((e) => e.effectiveStatus !== "CANCELLED" && e.effectiveStatus !== "COMPLETED") ?? null;
}

export async function getEvent(id: string, userId: string) {
  const event = await db.event.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, profile: { select: { firstName: true, callsign: true } } } },
      equipment: { include: { equipment: { select: { id: true, name: true, category: true, required: true, shopUrl: true } } } },
      attendances: {
        include: { user: { select: { id: true, active: true, profile: { select: { firstName: true, lastName: true, callsign: true, avatarUrl: true } } } } },
        orderBy: { updatedAt: "asc" },
      },
    },
  });
  if (!event) return null;
  const counts = countsOf(event.attendances);
  const mine = event.attendances.find((a) => a.userId === userId) ?? null;
  return { ...event, counts, mine, effectiveStatus: effectiveStatus(event, counts.accepted) };
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
