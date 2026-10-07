import { hasAnywhere, type Ctx } from "@/server/context";

export interface NavItem { href: string; label: string; icon: string; show: boolean; group: string }

export function navItems(ctx: Ctx): NavItem[] {
  const any = (p: Parameters<typeof hasAnywhere>[1]) => hasAnywhere(ctx, p);
  const admin = ctx.all || any("unit.manage") || any("user.manage") || any("user.view") || any("audit.view") || any("role.manage");
  const items: NavItem[] = [
    { group: "Übersicht", href: "/", label: "Start", icon: "LayoutDashboard", show: true },
    { group: "Übersicht", href: "/calendar", label: "Kalender", icon: "CalendarDays", show: true },
    { group: "Übersicht", href: "/availability", label: "Verfügbarkeit", icon: "CalendarCheck", show: !!ctx.helperId || any("availability.view_others") },
    { group: "Planung", href: "/shifts", label: "Dienste", icon: "ClipboardList", show: any("shift.view") || !!ctx.helperId },
    { group: "Planung", href: "/events", label: "Veranstaltungen", icon: "PartyPopper", show: any("event.view") },
    { group: "Planung", href: "/alerts", label: "Alarmierung", icon: "Siren", show: any("alert.view") || !!ctx.helperId },
    { group: "Planung", href: "/incidents", label: "Einsätze", icon: "Ambulance", show: any("incident.view") },
    { group: "Verwaltung", href: "/helpers", label: "Helfer", icon: "Users", show: any("helper.view") },
    { group: "Verwaltung", href: "/qualifications", label: "Qualifikationen", icon: "GraduationCap", show: any("qualification.view") || any("qualification.manage") },
    { group: "Verwaltung", href: "/vehicles", label: "Fahrzeuge", icon: "Truck", show: any("vehicle.view") },
    { group: "Verwaltung", href: "/materials", label: "Material", icon: "Package", show: any("material.view") },
    { group: "Verwaltung", href: "/documents", label: "Dokumente", icon: "FileText", show: any("document.view") || any("document.manage") || !!ctx.helperId },
    { group: "Kommunikation", href: "/messages", label: "Nachrichten", icon: "MessageSquare", show: true },
    { group: "Auswertung", href: "/hours", label: "Dienststunden", icon: "Clock", show: !!ctx.helperId || any("report.view") },
    { group: "Auswertung", href: "/reports", label: "Berichte", icon: "BarChart3", show: any("report.view") },
    { group: "Administration", href: "/admin/units", label: "Einheiten", icon: "Network", show: admin },
    { group: "Administration", href: "/admin/users", label: "Benutzer & Rollen", icon: "ShieldCheck", show: any("user.manage") || any("user.view") || ctx.all },
    { group: "Administration", href: "/admin/audit", label: "Audit-Log", icon: "ScrollText", show: any("audit.view") },
  ];
  return items.filter((i) => i.show);
}
