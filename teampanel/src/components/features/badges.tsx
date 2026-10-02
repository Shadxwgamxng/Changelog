import type { AnnouncementPriority, AttendanceStatus, EventStatus, OwnershipStatus, Priority, RoleKey, ShoppingStatus } from "@prisma/client";
import { Badge, type Tone } from "@/components/ui/badge";
import { ANNOUNCEMENT_PRIORITY_LABELS, ATTENDANCE_ICONS, ATTENDANCE_LABELS, EVENT_STATUS_LABELS, OWNERSHIP_ICONS, OWNERSHIP_LABELS, PRIORITY_LABELS, SHOPPING_STATUS_LABELS } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/permissions";

const EVENT_TONES: Record<EventStatus, Tone> = { PLANNED: "neutral", OPEN: "ok", FULL: "warn", COMPLETED: "neutral", CANCELLED: "danger" };
export const EventStatusBadge = ({ status }: { status: EventStatus }) => <Badge tone={EVENT_TONES[status]}>{EVENT_STATUS_LABELS[status]}</Badge>;

const ATT_TONES: Record<AttendanceStatus, Tone> = { ACCEPTED: "ok", MAYBE: "warn", DECLINED: "danger" };
export const AttendanceBadge = ({ status }: { status: AttendanceStatus }) => (
  <Badge tone={ATT_TONES[status]}>
    <span aria-hidden>{ATTENDANCE_ICONS[status]}</span> {ATTENDANCE_LABELS[status]}
  </Badge>
);

const OWN_TONES: Record<OwnershipStatus, Tone> = { OWNED: "ok", MISSING: "danger", ORDERED: "info", PARTIAL: "warn", DEFECTIVE: "warn" };
export const OwnershipBadge = ({ status }: { status: OwnershipStatus }) => (
  <Badge tone={OWN_TONES[status]}>
    <span aria-hidden>{OWNERSHIP_ICONS[status]}</span> {OWNERSHIP_LABELS[status]}
  </Badge>
);

const PRIO_TONES: Record<Priority, Tone> = { LOW: "neutral", MEDIUM: "info", HIGH: "danger" };
export const PriorityBadge = ({ priority }: { priority: Priority }) => <Badge tone={PRIO_TONES[priority]}>Priorität: {PRIORITY_LABELS[priority]}</Badge>;

const ANN_TONES: Record<AnnouncementPriority, Tone> = { NORMAL: "neutral", IMPORTANT: "warn", URGENT: "danger" };
export const AnnouncementPriorityBadge = ({ priority }: { priority: AnnouncementPriority }) => <Badge tone={ANN_TONES[priority]}>{ANNOUNCEMENT_PRIORITY_LABELS[priority]}</Badge>;

const SHOP_TONES: Record<ShoppingStatus, Tone> = { OPEN: "warn", ORDERED: "info", PURCHASED: "ok" };
export const ShoppingStatusBadge = ({ status }: { status: ShoppingStatus }) => <Badge tone={SHOP_TONES[status]}>{SHOPPING_STATUS_LABELS[status]}</Badge>;

const ROLE_TONES: Record<RoleKey, Tone> = { SUPERADMIN: "danger", ADMIN: "warn", TEAMLEITUNG: "accent", MITGLIED: "neutral" };
export const RoleBadge = ({ role }: { role: RoleKey }) => <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>;
