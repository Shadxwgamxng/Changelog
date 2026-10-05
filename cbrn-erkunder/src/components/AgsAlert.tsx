import { useEffect, useRef } from 'react';
import { useApi } from '../store';

/** Atemschutz-Warnton im Computer (Aufnahme „Atemschutzgerät leer“): einmal bei Pfeife (55 bar) und einmal bei leer – unabhängig von der geöffneten Seite. */
export function AgsAlert() {
  const ags = useApi<any[]>('/ags', ['ags.changed']); const prev = useRef<Record<number, string>>({}); const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    for (const d of ags.data ?? []) {
      const was = prev.current[d.slot]; prev.current[d.slot] = d.status;
      if (was && was !== d.status && (d.status === 'PFEIFE' || d.status === 'LEER')) {
        try { audio.current = audio.current ?? new Audio('../web/sounds/pa_leer.ogg'); audio.current.volume = 0.7; audio.current.currentTime = 0; void audio.current.play().catch(() => {}); } catch { /* ohne Ton */ }
      }
    }
  }, [ags.data]);
  return null;
}
