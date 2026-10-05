import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { cfg, url } from '../api';
import { useApi, useLive } from '../store';
import { CAT } from '../lib/format';

export type Layers = Record<string, boolean>;
export const DEFAULT_LAYERS: Layers = { basemap: true, grid: false, vehicle: true, track: true, points: true, missions: true, samples: true, areas: true, weather: true, history: false, others: true, route: false };
export const LAYER_LABELS: [string, string][] = [['vehicle', 'Fahrzeug'], ['track', 'GPS-Track'], ['points', 'Messpunkte'], ['missions', 'Messaufträge'], ['samples', 'Proben'], ['areas', 'CBRN-Bereiche'], ['weather', 'Wetter'], ['history', 'Historische Messungen'], ['others', 'Andere Fahrzeuge'], ['grid', 'Gitter 100 m'], ['basemap', 'Hintergrundkarte']];

const EMPTY = { type: 'FeatureCollection', features: [] } as any;
const fc = (features: any[]) => ({ type: 'FeatureCollection', features });
const circlePoly = (lon: number, lat: number, r: number) => {
  const pts = Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * 2 * Math.PI; return [lon + (r * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (r * Math.sin(a)) / 111320]; });
  return { type: 'Polygon', coordinates: [pts] };
};
const statusColor = ['match', ['get', 'status'], 'ALARM', '#e5534b', 'HOCH', '#e5534b', 'ERHÖHT', '#d29922', 'AUSWERTUNG ERFORDERLICH', '#f0500a', 'NORMAL', '#58a6ff', '#817d78'] as any;

export function MapView({ layers, onSelect, follow = true, grid = true, showVehicleLabels = true }: { layers: Layers; onSelect?: (s: { type: string; id: string }) => void; follow?: boolean; grid?: boolean; showVehicleLabels?: boolean }) {
  const el = useRef<HTMLDivElement>(null); const mapRef = useRef<maplibregl.Map | null>(null); const ready = useRef(false);
  const marker = useRef<maplibregl.Marker | null>(null); const markerEl = useRef<HTMLDivElement | null>(null);
  const { meta, vehicles, weather, own, incident } = useLive(); const incMk = useRef<maplibregl.Marker | null>(null);
  const meas = useApi<any[]>('/measurements?limit=500', ['measurement.created', 'poll']);
  const samples = useApi<any[]>('/samples', ['sample.created', 'sample.updated']);
  const alarms = useApi<any[]>('/alarms', ['alarm.created']);
  const missions = useApi<any[]>('/missions', ['mission.created', 'mission.updated']);
  const track = useApi<any[]>(`/track?vehicle=${own}`, ['measurement.created', 'poll', 'run.started', 'run.stopped'], [own]);
  const [imgMissing, setImgMissing] = useState(false);
  const mm = meta?.map;
  const onSel = useRef(onSelect); onSel.current = onSelect;

  // Kartenbild folgt einem geänderten Kartenversatz (Kalibrierung) sofort
  useEffect(() => {
    const map = mapRef.current, b = mm?.bounds, k = 111320; const src = map?.getSource('gta') as maplibregl.ImageSource | undefined;
    if (b && src?.setCoordinates) src.setCoordinates([[b.minX / k, b.maxY / k], [b.maxX / k, b.maxY / k], [b.maxX / k, b.minY / k], [b.minX / k, b.minY / k]]);
  }, [mm?.bounds?.minX, mm?.bounds?.minY]);
  useEffect(() => {
    if (!el.current || mapRef.current || !meta) return;
    const c = meta.center;
    const gta = mm?.mode === 'gta5';
    const map = new maplibregl.Map({ container: el.current, center: [c.lon, c.lat], zoom: gta ? 13.6 : 14.3, maxZoom: gta ? 17.5 : 19, attributionControl: { compact: true },
      style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b0b0b' } }] } });
    mapRef.current = map; map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right'); map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.on('load', () => {
      const t = gta ? null : (mm?.tileUrl ?? cfg().tileUrl);
      if (gta && mm.image) {
        const b = mm.bounds, k = 111320;
        map.addSource('gta', { type: 'image', url: url(mm.image), coordinates: [[b.minX / k, b.maxY / k], [b.maxX / k, b.maxY / k], [b.maxX / k, b.minY / k], [b.minX / k, b.minY / k]] } as any);
        map.addLayer({ id: 'basemap', type: 'raster', source: 'gta', paint: { 'raster-brightness-max': 0.82, 'raster-saturation': -0.1 } });
        fetch(url(mm.image), { method: 'HEAD' }).then((r) => setImgMissing(!r.ok)).catch(() => setImgMissing(true));
      }
      if (t) { map.addSource('osm', { type: 'raster', tiles: [t], tileSize: 256, attribution: mm?.attribution ?? cfg().tileAttribution ?? '' } as any); map.addLayer({ id: 'basemap', type: 'raster', source: 'osm', paint: { 'raster-brightness-max': 0.45, 'raster-saturation': -0.7, 'raster-contrast': 0.15 } }); }
      const lines: any[] = []; const cc = meta?.center ?? c;
      for (let k = -80; k <= 80; k++) { const dx = k * 100 / (111320 * Math.cos((cc.lat * Math.PI) / 180)), dy = k * 100 / 111320;
        lines.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[cc.lon + dx, cc.lat - 0.08], [cc.lon + dx, cc.lat + 0.08]] } }, { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[cc.lon - 0.08, cc.lat + dy], [cc.lon + 0.08, cc.lat + dy]] } }); }
      map.addSource('grid', { type: 'geojson', data: fc(lines) }); map.addLayer({ id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': '#000000', 'line-width': 0.6, 'line-opacity': 0.22 } });
      for (const s of ['route', 'track', 'sectors', 'areas', 'points', 'samples', 'others', 'hist']) map.addSource(s, { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#817d78', 'line-width': 1, 'line-dasharray': [2, 3] } });
      map.addLayer({ id: 'sectors-fill', type: 'fill', source: 'sectors', paint: { 'fill-color': ['case', ['get', 'active'], '#f0500a', '#363636'], 'fill-opacity': ['case', ['get', 'active'], 0.07, 0.03] } });
      map.addLayer({ id: 'sectors', type: 'line', source: 'sectors', paint: { 'line-color': ['case', ['get', 'active'], '#f0500a', '#363636'], 'line-width': 1.5, 'line-dasharray': [4, 2] } });
      map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'areas', type: 'line', source: 'areas', paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 } });
      map.addLayer({ id: 'track', type: 'line', source: 'track', paint: { 'line-color': '#f0500a', 'line-width': 2.5, 'line-opacity': 0.9 } });
      map.addLayer({ id: 'hist', type: 'circle', source: 'hist', paint: { 'circle-radius': 3, 'circle-color': '#817d78', 'circle-opacity': 0.6 } });
      map.addLayer({ id: 'points', type: 'circle', source: 'points', paint: { 'circle-radius': ['case', ['==', ['get', 'status'], 'NORMAL'], 3.5, 6], 'circle-color': statusColor, 'circle-stroke-color': '#0b0b0b', 'circle-stroke-width': 1 } });
      map.addLayer({ id: 'samples', type: 'circle', source: 'samples', paint: { 'circle-radius': 6, 'circle-color': '#0b0b0b', 'circle-stroke-color': '#ebe9e6', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'others', type: 'circle', source: 'others', paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#ebe9e6', 'circle-stroke-width': 1.5 } });
      map.on('click', (e: any) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ['points', 'samples', 'others'] })[0]; if (f) onSel.current?.({ type: f.layer.id, id: String(f.properties?.id) });
      });
      for (const l of ['points', 'samples', 'others']) { map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer')); map.on('mouseleave', l, () => (map.getCanvas().style.cursor = '')); }
      ready.current = true; mapRef.current!.fire('cbrn-ready' as any);
    });
    return () => { map.remove(); mapRef.current = null; ready.current = false; incMk.current = null; marker.current = null; };
  }, [!!meta]); // eslint-disable-line

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
    set('others', fc(vehicles.filter((v) => v.id !== own && v.link === 'ONLINE').map((v) => ({ type: 'Feature', properties: { id: v.id, color: '#3fb950' }, geometry: { type: 'Point', coordinates: [v.lon, v.lat] } }))));
    if (incident?.lat != null) {
      if (!incMk.current) { const d = document.createElement('div'); d.title = 'Einsatzstelle'; d.innerHTML = `<svg width="26" height="26" viewBox="-13 -13 26 26"><path d="M0,-11 L11,9 L-11,9Z" fill="#d29922" stroke="#0b0b0b" stroke-width="1.5"/><text x="0" y="6" text-anchor="middle" font-size="12" font-weight="700" fill="#0b0b0b">!</text></svg>`; incMk.current = new maplibregl.Marker({ element: d }).setLngLat([incident.lon, incident.lat]).addTo(map); }
      else incMk.current.setLngLat([incident.lon, incident.lat]);
    } else if (incMk.current) { incMk.current.remove(); incMk.current = null; }
    const v = vehicles.find((x) => x.id === own);
    if (v) {
      if (!marker.current) {
        const d = document.createElement('div'); d.innerHTML = `<svg width="30" height="30" viewBox="-15 -15 30 30"><g id="rot"><polygon points="0,-12 9,10 0,5 -9,10" fill="#f0500a" stroke="#fff" stroke-width="1.5"/></g></svg>`; markerEl.current = d;
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
      {imgMissing && (
        <div className="absolute inset-x-0 top-12 mx-auto w-[460px] panel p-3 bg-panel/95 text-[12px] z-10">
          <b>GTA-5-Kartenbild fehlt.</b> Lege dein Kartenbild als <span className="font-mono">public/maps/gta5.jpg</span> ab (Ränder in <span className="font-mono">config.json → gta5.bounds</span>) und lade die Seite neu. Bis dahin: Gitter 100 m, Sektoren und Messpunkte.
        </div>)}
      {layers.weather && weather && (
        <div className="absolute left-2 top-2 panel px-2 py-1 text-[11px] bg-panel/90 pointer-events-none">
          <div className="lbl">Wind kommt aus</div>
          <div className="val flex items-center gap-2"><svg width="18" height="18" viewBox="-10 -10 20 20" style={{ transform: `rotate(${(weather.wind_from + 180) % 360}deg)` }}><path d="M0,-8 L5,6 L0,3 L-5,6Z" fill="#58a6ff" /></svg>{weather.wind_from_text} ({Math.round(weather.wind_from)}°) · {weather.wind_speed} m/s</div>
        </div>
      )}
    </div>
  );
}
