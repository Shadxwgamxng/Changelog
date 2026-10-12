"use client";
// Zeitraum-Auswahl für Dienstmeldungen: ganzer Dienst oder nur ein Teil (Berliner Ortszeit, datetime-local).
import { useState } from "react";

export function WindowFields({ min, max, from, to, partial = false, idPrefix }: { min: string; max: string; from?: string; to?: string; partial?: boolean; idPrefix: string }) {
  const [teil, setTeil] = useState(partial);
  return (
    <fieldset className="space-y-2">
      <legend className="label">Wann kannst du?</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        <label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-fill-2">
          <input type="radio" name="scope" value="ganz" checked={!teil} onChange={() => setTeil(false)} className="h-4 w-4" /> Ganzer Dienst
        </label>
        <label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-fill-2">
          <input type="radio" name="scope" value="teil" checked={teil} onChange={() => setTeil(true)} className="h-4 w-4" /> Nur einen Teil
        </label>
      </div>
      {teil && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block" htmlFor={`${idPrefix}-from`}><span className="label">Von</span><input id={`${idPrefix}-from`} className="input" type="datetime-local" name="from" min={min} max={max} defaultValue={from ?? min} required step={900} /></label>
          <label className="block" htmlFor={`${idPrefix}-to`}><span className="label">Bis</span><input id={`${idPrefix}-to`} className="input" type="datetime-local" name="to" min={min} max={max} defaultValue={to ?? max} required step={900} /></label>
        </div>
      )}
    </fieldset>
  );
}
