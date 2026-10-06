import { useState } from 'react';
import { Btn } from './ui';
import { copyText } from '../lib/clipboard';
import { useLive } from '../store';
import { dt } from '../lib/format';

const n = (v: number, d = 1) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export function weatherText(w: any, short = false) {
  if (!w) return '';
  const wind = `Wind kommt aus ${w.wind_from_text} (${Math.round(w.wind_from)}°), ${n(w.wind_speed)} m/s`;
  if (short) return `Wetter ${new Date(w.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}: ${n(w.temperature)} °C, ${Math.round(w.humidity)} % rF, ${Math.round(w.pressure)} hPa, ${wind}, Bewölkung ${w.cloud_okta}/8, Niederschlag ${n(w.precipitation)} mm/h`;
  return [`WETTERDATEN – ${dt(w.ts)}`, `Temperatur: ${n(w.temperature)} °C`, `Luftfeuchtigkeit: ${Math.round(w.humidity)} %`, `Luftdruck: ${Math.round(w.pressure)} hPa`,
    `Windgeschwindigkeit: ${n(w.wind_speed)} m/s`, `Windrichtung (meteorologisch): Wind kommt aus ${w.wind_from_text} (${Math.round(w.wind_from)}°)`, `Bewölkung: ${w.cloud_okta}/8`, `Niederschlag: ${n(w.precipitation)} mm/h`,
    ...(w.game_weather ? [`GTA-Wetterlage: ${w.game_weather}`] : [])].join('\n');
}
export function WeatherCopy({ compact }: { compact?: boolean }) {
  const { weather } = useLive(); const [msg, setMsg] = useState('');
  const go = async (short: boolean) => { const ok = await copyText(weatherText(weather, short)); setMsg(ok ? 'Kopiert ✓' : 'Kopieren nicht möglich'); setTimeout(() => setMsg(''), 2500); };
  return (
    <span className="inline-flex items-center gap-2 no-print">
      <Btn kind="primary" onClick={() => go(false)} disabled={!weather}>Wetterdaten kopieren</Btn>
      {!compact && <Btn onClick={() => go(true)} disabled={!weather} title="Eine Zeile, z. B. für Funk/Chat">Kurzform kopieren</Btn>}
      {msg && <span className="text-ok text-[12px]">{msg}</span>}
    </span>
  );
}
