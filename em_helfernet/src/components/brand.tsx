// EmergencyForge-Marken (aus dem ignis-Projekt, assets/img). Inline-SVG, damit `currentColor` dem Theme folgt.
import { readFileSync } from "node:fs";
import path from "node:path";

const load = (f: string) => {
  try { return readFileSync(path.join(process.cwd(), "public", "brand", f), "utf8").replace(/<svg /, '<svg width="100%" height="100%" focusable="false" ').replace(/ role="img" aria-label="[^"]*"/, ""); }
  catch { return ""; }
};
const MARK = load("ef-mark.svg");

/** EmergencyForge-Bildmarke (Ratio ≈ 1,7 : 1). */
export function EfMark({ className = "h-5 w-8", label = "EmergencyForge" }: { className?: string; label?: string }) {
  return <span role="img" aria-label={label} className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: MARK }} />;
}

