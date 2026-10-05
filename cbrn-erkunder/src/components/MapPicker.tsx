import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { cfg, url } from '../api';
import { useLive } from '../store';

export interface Pos { lat: number; lon: number }
const dot = (color: string, size = 14, ring = '#fff') => { const d = document.createElement('div'); d.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid ${ring};box-shadow:0 0 0 3px ${color}55`; return d; };

/** Kleine Karte zum Setzen eines Punkts (Einsatzstelle / eigener Standort). Optional: Referenzpunkte (z. B. FiveM-Position). */
export function MapPicker({ value, onChange, hint, hintLabel, color = '#f0500a', height = 300 }: { value: Pos | null; onChange: (p: Pos) => void; hint?: Pos | null; hintLabel?: string; color?: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null); const mapRef = useRef<maplibregl.Map | null>(null); const mk = useRef<maplibregl.Marker | null>(null); const hk = useRef<maplibregl.Marker | null>(null);
  const cb = useRef(onChange); cb.current = onChange; const { meta } = useLive(); const mm = meta?.map;

  // Kartenbild folgt einem geänderten Kartenversatz (Kalibrierung) sofort
  useEffect(() => {
    const map = mapRef.current, b = mm?.bounds, k = 111320; const src = map?.getSource('gta') as maplibregl.ImageSource | undefined;
    if (b && src?.setCoordinates) src.setCoordinates([[b.minX / k, b.maxY / k], [b.maxX / k, b.maxY / k], [b.maxX / k, b.minY / k], [b.minX / k, b.minY / k]]);
  }, [mm?.bounds?.minX, mm?.bounds?.minY]);
  useEffect(() => {
    if (!el.current || mapRef.current || !meta) return;
    const mm = meta.map, gta = mm?.mode === 'gta5', c = value ?? hint ?? meta.center;
    const map = new maplibregl.Map({ container: el.current, center: [c.lon, c.lat], zoom: gta ? 13.4 : 14.3, maxZoom: gta ? 17.5 : 19, attributionControl: { compact: true },
      style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b0b0b' } }] } });
    mapRef.current = map; map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right'); map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.on('load', () => {
      if (gta && mm.image) {
        const b = mm.bounds, k = 111320;
        map.addSource('gta', { type: 'image', url: url(mm.image), coordinates: [[b.minX / k, b.maxY / k], [b.maxX / k, b.maxY / k], [b.maxX / k, b.minY / k], [b.minX / k, b.minY / k]] } as any);
        map.addLayer({ id: 'basemap', type: 'raster', source: 'gta', paint: { 'raster-brightness-max': 0.82 } });
      } else {
        map.addSource('osm', { type: 'raster', tiles: [mm?.tileUrl ?? cfg().tileUrl], tileSize: 256, attribution: mm?.attribution ?? cfg().tileAttribution ?? '' } as any);
        map.addLayer({ id: 'basemap', type: 'raster', source: 'osm' });
      }
    });
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', (e) => cb.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
    return () => { map.remove(); mapRef.current = null; mk.current = null; hk.current = null; };
  }, [!!meta]); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (value) { if (!mk.current) mk.current = new maplibregl.Marker({ element: dot(color, 16) }).setLngLat([value.lon, value.lat]).addTo(map); else mk.current.setLngLat([value.lon, value.lat]); }
  }, [value?.lat, value?.lon, color]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !hint) return;
    if (!hk.current) hk.current = new maplibregl.Marker({ element: dot('#58a6ff', 12) }).setLngLat([hint.lon, hint.lat]).addTo(map); else hk.current.setLngLat([hint.lon, hint.lat]);
  }, [hint?.lat, hint?.lon]);

  return (
    <div className="relative rounded-md overflow-hidden border border-line" style={{ height }}>
      <div ref={el} className="absolute inset-0" />
      <div className="absolute left-2 bottom-8 panel px-2 py-1 text-[11px] bg-panel/90 pointer-events-none">
        {value ? <span className="font-mono">Markiert: {value.lon.toFixed(5)} | {value.lat.toFixed(5)}</span> : <span className="text-warn">Klicke auf die Karte, um den Punkt zu setzen</span>}
        {hint && hintLabel && <div className="text-[#58a6ff]">● {hintLabel}</div>}
      </div>
    </div>
  );
}
