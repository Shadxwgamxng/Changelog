// EmergencyForge-Marken (aus dem ignis-Projekt, assets/img). Inline-SVG, damit `currentColor` dem Theme folgt.
import { readFileSync } from "node:fs";
import path from "node:path";

const load = (f: string) => {
  try { return readFileSync(path.join(process.cwd(), "public", "brand", f), "utf8").replace(/<svg /, '<svg width="100%" height="100%" focusable="false" ').replace(/ role="img" aria-label="[^"]*"/, ""); }
  catch { return ""; }
};
const MARK = load("ef-mark.svg");
const LOCKUP = load("ignis-lockup.svg");

/** EmergencyForge-Bildmarke (Ratio ≈ 1,7 : 1). */
export function EfMark({ className = "h-5 w-8", label = "EmergencyForge" }: { className?: string; label?: string }) {
  return <span role="img" aria-label={label} className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: MARK }} />;
}

/** ignis-Wortbildmarke (Design-Vorlage dieser Oberfläche). */
export function IgnisLockup({ className = "h-5 w-14" }: { className?: string }) {
  return <span role="img" aria-label="ignis" className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: LOCKUP }} />;
}

export function BrandFooter({ compact }: { compact?: boolean }) {
  if (compact) return <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle"><EfMark className="h-3 w-5" /><span>EmergencyForge · ignis-Design</span></p>;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-fg-subtle">
      <EfMark className="h-3 w-5" /><span>EmergencyForge</span><span aria-hidden>·</span><span>Oberflächendesign orientiert an</span><IgnisLockup className="h-3 w-9" />
    </p>
  );
}
