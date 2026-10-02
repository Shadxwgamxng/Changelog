import { can, type Actor } from "@/lib/permissions";

export type AdminTab = "overview" | "members" | "requirements" | "team" | "audit";

export function adminTabs(active: AdminTab, user: Actor) {
  const all = [
    { key: "overview", href: "/admin", label: "Übersicht", show: can(user, "admin.dashboard") || can(user, "members.viewAdmin") },
    { key: "members", href: "/admin/members", label: "Mitglieder", show: can(user, "members.viewAdmin") },
    { key: "requirements", href: "/admin/requirements", label: "Ausrüstungsanforderungen", show: can(user, "equipment.manageAll") },
    { key: "team", href: "/admin/team", label: "Teamdaten", show: can(user, "team.edit") },
    { key: "audit", href: "/admin/audit", label: "Aktivitätsprotokoll", show: can(user, "audit.view") },
  ] as const;
  return all.filter((t) => t.show).map((t) => ({ href: t.href, label: t.label, active: t.key === active }));
}
