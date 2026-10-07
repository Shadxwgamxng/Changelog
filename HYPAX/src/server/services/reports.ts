// Berichte: liefern Tabellen für Bildschirm UND Export (PDF/CSV/Excel) – eine Datenquelle, damit beides identisch ist.
import { forbidden, badRequest } from "../errors";
import { hasAnywhere, type Ctx } from "../context";
import { audit } from "../audit";
import { loadUnits } from "../units";
import { exportTable, FORMATS, type ExportFormat, type Table } from "../export";
import { helperStats, hoursReport, qualificationStats, shiftStats } from "./stats";
import { expiringQualifications } from "./qualifications";
import { fmtDate, fmtDateTime, fmtHours } from "@/lib/dates";
import { QUAL_STATE_LABEL } from "@/lib/qualification";

export const REPORT_KEYS = ["helpers", "shifts", "qualifications", "hours"] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];
export const REPORT_LABEL: Record<ReportKey, string> = { helpers: "Helferstatistik", shifts: "Dienststatistik", qualifications: "Qualifikationsstatistik", hours: "Leistungsstatistik (Dienststunden)" };

export interface ReportParams { from: Date; to: Date; unitId?: string }

export async function buildReport(ctx: Ctx, key: ReportKey, p: ReportParams): Promise<Table> {
  if (!hasAnywhere(ctx, "report.view")) throw forbidden();
  const scope = p.unitId ? (await loadUnits()).get(p.unitId)?.name : "alle sichtbaren Einheiten";
  const period = `${fmtDate(p.from)} – ${fmtDate(p.to)}`;
  switch (key) {
    case "helpers": {
      const s = await helperStats(ctx, p.from, p.to, p.unitId);
      return {
        title: REPORT_LABEL.helpers, subtitle: `${scope} · ${period}`, header: ["Kennzahl", "Wert"],
        rows: [["Aktive Helfer", s.active], ["Passive Helfer", s.passive], ["Inaktive Helfer", s.inactive], ["Ausgetretene Helfer (gesamt)", s.left], ["Neue Mitglieder im Zeitraum", s.newMembers], ["Austritte im Zeitraum", s.leavers], ...s.byUnit.map((u) => [`Aktive in ${u.unit}`, u.active] as [string, number])],
      };
    }
    case "shifts": {
      const s = await shiftStats(ctx, p.from, p.to, p.unitId);
      return {
        title: REPORT_LABEL.shifts, subtitle: `${scope} · ${period}`, header: ["Kennzahl", "Wert"],
        rows: [["Dienste gesamt", s.total], ["davon abgeschlossen", s.completed], ["davon abgesagt", s.cancelled], ["Benötigte Plätze", s.needed], ["Besetzte Plätze", s.filled], ["Besetzungsquote", s.fillRate == null ? "–" : `${s.fillRate} %`], ...s.byKind.map((k) => [`Dienste: ${k.label}`, k.count] as [string, number]), ...s.open.map((o) => [`Offen: ${o.name} (${fmtDate(o.startsAt)}, ${o.unitName})`, `${o.filled}/${o.needed}`] as [string, string])],
      };
    }
    case "qualifications": {
      const s = await qualificationStats(ctx, p.unitId);
      const expiring = await expiringQualifications(ctx, 90, true);
      return {
        title: REPORT_LABEL.qualifications, subtitle: `${scope} · Stand ${fmtDateTime(new Date())}`, header: ["Qualifikation / Helfer", "Kategorie / Einheit", "Gültig / bis", "Läuft ab / Status", "Abgelaufen"],
        rows: [
          ["GESAMT", "", s.valid, s.expiring, s.expired],
          ...s.perType.map((t) => [t.name, t.category, t.valid, t.expiring, t.expired] as (string | number)[]),
          ...expiring.map((e) => [`⚠ ${e.helperName} – ${e.typeName}`, e.unitName, fmtDate(e.validUntil), QUAL_STATE_LABEL[e.state], e.daysLeft < 0 ? `seit ${-e.daysLeft} Tagen` : `in ${e.daysLeft} Tagen`] as (string | number)[]),
          ...s.gaps.map((g) => [`Lücke: ${g.shiftName} – ${g.position}`, fmtDate(g.startsAt), `benötigt ${g.needed}`, `qualifiziert ${g.qualified}`, ""] as (string | number)[]),
        ],
      };
    }
    case "hours": {
      const h = await hoursReport(ctx, p);
      return {
        title: REPORT_LABEL.hours, subtitle: `${scope} · ${period}`, header: ["Helfer", "Einheit", "Dienste", "Dienststunden", "Ausbildungsstunden", "Einsatzstunden"],
        rows: h.helpers.map((r) => [r.name, r.unitName, r.shifts, fmtHours(r.minutes), fmtHours(r.trainingMinutes), fmtHours(r.incidentMinutes)]),
        footer: `Gesamt: ${fmtHours(h.totalMinutes)} in ${h.shiftCount} Dienstbesetzungen · Ausbildung ${fmtHours(h.trainingMinutes)} · Einsatz ${fmtHours(h.incidentMinutes)}`,
      };
    }
  }
}

export async function exportReport(ctx: Ctx, key: ReportKey, p: ReportParams, format: ExportFormat) {
  if (!hasAnywhere(ctx, "report.export")) throw forbidden("Dir fehlt das Recht zum Exportieren von Berichten.");
  if (!REPORT_KEYS.includes(key) || !(format in FORMATS)) throw badRequest("Ungültiger Bericht oder Format.");
  const table = await buildReport(ctx, key, p);
  const buffer = await exportTable(format, table);
  await audit(ctx, { action: "report.export", entityType: "Report", entityId: key, unitId: p.unitId ?? null, summary: `Bericht „${table.title}“ als ${format.toUpperCase()} exportiert (${table.rows.length} Zeilen)` });
  return { buffer, mime: FORMATS[format].mime, filename: `${key}-${p.from.toISOString().slice(0, 10)}_${p.to.toISOString().slice(0, 10)}.${FORMATS[format].ext}` };
}

