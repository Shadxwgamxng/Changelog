import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { cfg } from '../api';
import { useApi, useLive } from '../store';
import { CAT } from '../lib/format';

export type Layers = Record<string, boolean>;
export const DEFAULT_LAYERS: Layers = { basemap: true, grid: true, vehicle: true, track: true, points: true, missions: true, samples: true, areas: true, weather: true, history: false, others: true, route: false };
export const LAYER_LABELS: [string, string][] = [['vehicle', 'Fahrzeug'], ['track', 'GPS-Track'], ['points', 'Messpunkte'], ['missions', 'Messaufträge'], ['samples', 'Proben'], ['areas', 'CBRN-Bereiche'], ['weather', 'Wetter'], ['history', 'Historische Messungen'], ['others', 'Andere Fahrzeuge'], ['grid', 'Gitter 100 m'], ['basemap', 'Hintergrundkarte'], ['route', 'Demo-Route']];

const EMPTY = { type: 'FeatureCollection', features: [] } as any;
const fc = (features: any[]) => ({ type: 'FeatureCollection', features });
const circlePoly = (lon: number, lat: number, r: number) => {
  const pts = Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * 2 * Math.PI; return [lon + (r * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (r * Math.sin(a)) / 111320]; });
  return { type: 'Polygon', coordinates: [pts] };
};
const statusColor = ['match', ['get', 'status'], 'ALARM', '#d0503f', 'HOCH', '#d0503f', 'ERHÖHT', '#d9a21b', 'AUSWERTUNG ERFORDERLICH', '#d6742a', 'NORMAL', '#4a8fd6', '#8896a6'] as any;

export function MapView({ layers, onSelect, follow = true, grid = true, showVehicleLabels = true }: { layers: Layers; onSelect?: (s: { type: string; id: string }) => void; follow?: boolean; grid?: boolean; showVehicleLabels?: boolean }) {
  const el = useRef<HTMLDivElement>(null); const mapRef = useRef<maplibregl.Map | null>(null); const ready = useRef(false);
  const marker = useRef<maplibregl.Marker | null>(null); const markerEl = useRef<HTMLDivElement | null>(null);
  const { meta, vehicles, weather } = useLive();
  const meas = useApi<any[]>('/measurements?limit=500', ['measurement.created', 'poll']);
  const samples = useApi<any[]>('/samples', ['sample.created', 'sample.updated']);
  const alarms = useApi<any[]>('/alarms', ['alarm.created']);
  const missions = useApi<any[]>('/missions', ['mission.created', 'mission.updated']);
  const track = useApi<any[]>('/track?vehicle=CBRN-01', ['measurement.created', 'poll']);
  const onSel = useRef(onSelect); onSel.current = onSelect;

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const c = meta?.center ?? { lat: 54.3233, lon: 10.1228 };
    const map = new maplibregl.Map({ container: el.current, center: [c.lon, c.lat], zoom: 14.3, attributionControl: { compact: true },
      style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#10161c' } }] } });
    mapRef.current = map; map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right'); map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.on('load', () => {
      const t = cfg().tileUrl;
      if (t) { map.addSource('osm', { type: 'raster', tiles: [t], tileSize: 256, attribution: cfg().tileAttribution ?? '' } as any); map.addLayer({ id: 'basemap', type: 'raster', source: 'osm', paint: { 'raster-brightness-max': 0.45, 'raster-saturation': -0.7, 'raster-contrast': 0.15 } }); }
      const lines: any[] = []; const cc = meta?.center ?? c;
      for (let k = -30; k <= 30; k++) { const dx = k * 100 / (111320 * Math.cos((cc.lat * Math.PI) / 180)), dy = k * 100 / 111320;
        lines.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[cc.lon + dx, cc.lat - 0.03], [cc.lon + dx, cc.lat + 0.03]] } }, { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[cc.lon - 0.05, cc.lat + dy], [cc.lon + 0.05, cc.lat + dy]] } }); }
      map.addSource('grid', { type: 'geojson', data: fc(lines) }); map.addLayer({ id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': '#2a3541', 'line-width': 0.6, 'line-opacity': 0.7 } });
      for (const s of ['route', 'track', 'sectors', 'areas', 'points', 'samples', 'others', 'hist']) map.addSource(s, { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#8896a6', 'line-width': 1, 'line-dasharray': [2, 3] } });
      map.addLayer({ id: 'sectors-fill', type: 'fill', source: 'sectors', paint: { 'fill-color': ['case', ['get', 'active'], '#4a8fd6', '#38465a'], 'fill-opacity': ['case', ['get', 'active'], 0.14, 0.05] } });
      map.addLayer({ id: 'sectors', type: 'line', source: 'sectors', paint: { 'line-color': ['case', ['get', 'active'], '#4a8fd6', '#38465a'], 'line-width': 1.5, 'line-dasharray': [4, 2] } });
      map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'areas', type: 'line', source: 'areas', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 } });
      map.addLayer({ id: 'track', type: 'line', source: 'track', paint: { 'line-color': '#4a8fd6', 'line-width': 2.5, 'line-opacity': 0.85 } });
      map.addLayer({ id: 'hist', type: 'circle', source: 'hist', paint: { 'circle-radius': 3, 'circle-color': '#8896a6', 'circle-opacity': 0.6 } });
      map.addLayer({ id: 'points', type: 'circle', source: 'points', paint: { 'circle-radius': ['case', ['==', ['get', 'status'], 'NORMAL'], 3.5, 6], 'circle-color': statusColor, 'circle-stroke-color': '#0f1318', 'circle-stroke-width': 1 } });
      map.addLayer({ id: 'samples', type: 'circle', source: 'samples', paint: { 'circle-radius': 6, 'circle-color': '#0f1318', 'circle-stroke-color': '#e8edf2', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'others', type: 'circle', source: 'others', paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#e8edf2', 'circle-stroke-width': 1.5 } });
      map.on('click', (e: any) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['points', 'samples', 'others'] })[0]; if (f) onSel.current?.({ type: f.layer.id, id: String(f.properties?.id) });
      });
      for (const l of ['points', 'samples', 'others']) { map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer')); map.on('mouseleave', l, () => (map.getCanvas().style.cursor = '')); }
      ready.current = true; mapRef.current!.fire('cbrn-ready' as any);
    });
    return () => { map.remove(); mapRef.current = null; ready.current = false; };
  }, []); // eslint-disable-line

  // Datenupdate
  const upd = () => {
    const map = mapRef.current; if (!map || !ready.current) return;
    const set = (id: string, data: any) => (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);
    const recent = Date.now() - 30 * 60000;
    const m = meas.data ?? [];
    set('points', fc(m.filter((x) => Date.parse(x.ts) >= recent).map((x) => ({ type: 'Feature', properties: { id: x.id, status: x.status }, geometry: { type: 'Point', coordinates: [x.lon, x.lat] } }))));
    set('hist', fc(m.filter((x) => Date.parse(x.ts) < recent).map((x) => ({ type: 'Feature', properties: { id: x.id }, geometry: { type: 'Point', coordinates: [x.lon, x.lat] } }))));
    set('samples', fc((samples.data ?? []).map((s) => ({ type: 'Feature', properties: { id: s.id }, geometry: { type: 'Point', coordinates: [s.lon, s.lat] } }))));
    set('track', fc([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: (track.data ?? []).map((p) => [p.lon, p.lat]) } }]));
    set('route', fc([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: meta?.route ?? [] } }]));
    const act = new Set((missions.data ?? []).filter((x) => ['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'].includes(x.status)).map((x) => x.sector));
    set('sectors', fc((meta?.sectors ?? []).map((s: any) => ({ type: 'Feature', properties: { name: s.name, active: act.has(s.key) }, geometry: { type: 'Polygon', coordinates: [s.polygon] } }))));
    set('areas', fc((alarms.data ?? []).filter((a) => a.status === 'OFFEN' && ['CHEMISCH', 'RADIOLOGISCH', 'NUKLEAR', 'BIOLOGISCH', 'UNBEKANNT'].includes(a.category)).map((a) => ({ type: 'Feature', properties: { color: (CAT[a.category[0]] ?? CAT.U).color }, geometry: circlePoly(a.lon, a.lat, 90) }))));
    set('others', fc(vehicles.filter((v) => v.id !== 'CBRN-01').map((v) => ({ type: 'Feature', properties: { id: v.id, color: v.online ? '#4fa86b' : '#8896a6' }, geometry: { type: 'Point', coordinates: [v.lon, v.lat] } }))));
    const v = vehicles.find((x) => x.id === 'CBRN-01');
    if (v) {
      if (!marker.current) {
        const d = document.createElement('div'); d.innerHTML = `<svg width="30" height="30" viewBox="-15 -15 30 30"><g id="rot"><polygon points="0,-12 9,10 0,5 -9,10" fill="#4a8fd6" stroke="#fff" stroke-width="1.5"/></g></svg>`; markerEl.current = d;
        marker.current = new maplibregl.Marker({ element: d, rotationAlignment: 'map' }).setLngLat([v.lon, v.lat]).addTo(map);
      }
      marker.current.setLngLat([v.lon, v.lat]).setRotation(v.heading ?? 0);
      if (follow) map.easeTo({ center: [v.lon, v.lat], duration: 1500, easing: (t: number) => t });
    }
  };
  useEffect(() => { const map = mapRef.current; if (!map) return; const f = () => upd(); if (ready.current) f(); else map.once('cbrn-ready' as any, f); }); // jede Änderung
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const apply = () => {
      const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      vis('basemap', layers.basemap); vis('grid', layers.grid && grid); vis('track', layers.track); vis('points', layers.points); vis('samples', layers.samples); vis('hist', layers.history); vis('others', layers.others);
      vis('route', layers.route); vis('sectors', layers.missions); vis('sectors-fill', layers.missions); vis('areas', layers.areas); vis('areas-fill', layers.areas);
      if (markerEl.current) markerEl.current.style.display = layers.vehicle ? 'block' : 'none';
    };
    if (ready.current) apply(); else map.once('cbrn-ready' as any, apply);
  }, [layers, grid, vehicles.length]);

  return (
    <div className="relative w-full h-full min-h-[200px]">
      <div ref={el} className="absolute inset-0" />
      {layers.weather && weather && (
        <div className="absolute left-2 top-2 panel px-2 py-1 text-[11px] bg-panel/90 pointer-events-none">
          <div className="lbl">Wind kommt aus</div>
          <div className="val flex items-center gap-2"><svg width="18" height="18" viewBox="-10 -10 20 20" style={{ transform: `rotate(${(weather.wind_from + 180) % 360}deg)` }}><path d="M0,-8 L5,6 L0,3 L-5,6Z" fill="#4a8fd6" /></svg>{weather.wind_from_text} ({Math.round(weather.wind_from)}°) · {weather.wind_speed} m/s</div>
        </div>
      )}
    </div>
  );
}
