"use client";
// Lagekarte für Sanitätsdienste: Leaflet-Karte mit taktischen Zeichen (DV 102), Linien, Flächen und Texten.
// Änderungen werden sofort über die REST-API gespeichert; Betrachter sehen Änderungen live (Polling).
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Lf from "leaflet";
import { erzeugeTaktischesZeichen } from "@taktische-zeichen/core";
import clsx from "clsx";
import { AREA_STYLES, LINE_STYLES, MAP_DEFAULT_VIEW, MAP_MAX_ZOOM, MAP_NATIVE_ZOOM, MAP_SIZE, PLACES, PRESETS, PRESET_GROUPS, areaStyleById, lineStyleById, presetById, type LatLng, type Preset } from "@/lib/lagekarte";

export interface MapObj { id: string; kind: "MARKER" | "LINE" | "AREA" | "TEXT"; preset: string; coords: LatLng | LatLng[]; label: string | null; note: string | null; color: string | null }
export interface LagekarteData {
  shiftId: string; name: string; canEdit: boolean; location: string | null; meetingPoint: string | null;
  view: { lat: number; lng: number; zoom: number } | null;
  vehicles: { id: string; label: string; preset: string }[];
  objects: MapObj[];
  config: { tileUrl: string };
}

type Tool = { type: "select" } | { type: "marker"; preset: string; label?: string } | { type: "line" | "area"; style: string } | { type: "text" };

// ── Symbole ──
const imgCache = new Map<string, { url: string; w: number; h: number }>();
function tzImage(p: Preset) {
  let hit = imgCache.get(p.id);
  if (!hit && p.tz) {
    let z;
    try { z = erzeugeTaktischesZeichen(p.tz as never); } catch { z = erzeugeTaktischesZeichen({ ...p.tz, skipFontRegistration: true } as never); }
    hit = { url: z.dataUrl, w: z.size[0], h: z.size[1] };
    imgCache.set(p.id, hit);
  }
  return hit;
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `Fehler ${res.status}`);
  return json as T;
}

const isPoint = (c: MapObj["coords"]): c is LatLng => typeof c[0] === "number";

function PresetIcon({ p, size = 34 }: { p: Preset; size?: number }) {
  const img = tzImage(p);
  if (img) return <img src={img.url} alt="" width={Math.round((img.w / img.h) * size)} height={size} className="shrink-0 object-contain" style={{ height: size }} />;
  return <span className="flex shrink-0 items-center justify-center rounded-full text-base text-white" style={{ background: p.pin?.color, width: size * 0.85, height: size * 0.85 }} aria-hidden>{p.pin?.emoji}</span>;
}

export function LagekarteEditor({ data }: { data: LagekarteData }) {
  const { shiftId, canEdit, config } = data;
  const mapEl = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Lf | null>(null);
  const map = useRef<Lf.Map | null>(null);
  const layer = useRef<Lf.LayerGroup | null>(null);
  const preview = useRef<Lf.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [objects, setObjects] = useState<MapObj[]>(data.objects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>({ type: "select" });
  const [drawPts, setDrawPts] = useState<LatLng[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [scale, setScale] = useState(0.85);
  const [filter, setFilter] = useState("");
  const busy = useRef(false); // während Ziehen/Speichern kein Polling-Überschreiben

  // Refs, damit Karten-Handler immer den aktuellen Zustand sehen
  const toolRef = useRef(tool); toolRef.current = tool;
  const objectsRef = useRef(objects); objectsRef.current = objects;
  const drawRef = useRef(drawPts); drawRef.current = drawPts;
  const selected = objects.find((o) => o.id === selectedId) ?? null;

  const fail = useCallback((e: unknown) => { setError(e instanceof Error ? e.message : "Unbekannter Fehler"); setTimeout(() => setError(null), 6000); }, []);

  // ── Karte initialisieren ──
  useEffect(() => {
    let disposed = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (disposed || !mapEl.current || map.current) return;
      L.current = leaflet;
      // GTA-V-Atlas: einfaches Koordinatensystem (lat 0 … −256 oben→unten, lng 0 … 256 links→rechts)
      const bounds = leaflet.latLngBounds([[-MAP_SIZE, 0], [0, MAP_SIZE]]);
      const m = leaflet.map(mapEl.current, { crs: leaflet.CRS.Simple, zoomControl: true, doubleClickZoom: false, minZoom: 0, maxZoom: MAP_MAX_ZOOM, zoomSnap: 0.5, maxBounds: bounds.pad(0.25), maxBoundsViscosity: 0.8, attributionControl: false });
      leaflet.tileLayer(config.tileUrl, { minZoom: 0, maxZoom: MAP_MAX_ZOOM, maxNativeZoom: MAP_NATIVE_ZOOM, noWrap: true, bounds, tileSize: 256 }).addTo(m);
      layer.current = leaflet.layerGroup().addTo(m);
      preview.current = leaflet.layerGroup().addTo(m);
      if (data.view) m.setView([data.view.lat, data.view.lng], data.view.zoom);
      else if (data.objects.length) {
        const pts = data.objects.flatMap((o) => (isPoint(o.coords) ? [o.coords] : o.coords));
        m.fitBounds(leaflet.latLngBounds(pts as Lf.LatLngTuple[]).pad(0.3), { maxZoom: 5 });
      } else m.setView([MAP_DEFAULT_VIEW.lat, MAP_DEFAULT_VIEW.lng], MAP_DEFAULT_VIEW.zoom);
      m.on("click", (e: Lf.LeafletMouseEvent) => onMapClick([e.latlng.lat, e.latlng.lng]));
      m.on("dblclick", () => finishDrawing(true));
      map.current = m;
      setReady(true);
    })();
    return () => { disposed = true; map.current?.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Karteninhalt zeichnen ──
  useEffect(() => {
    const Lx = L.current, g = layer.current;
    if (!ready || !Lx || !g) return;
    g.clearLayers();
    for (const o of objects) {
      const sel = o.id === selectedId;
      let lyr: Lf.Layer | null = null;
      if (o.kind === "MARKER" || o.kind === "TEXT") {
        const c = o.coords as LatLng;
        const p = o.kind === "MARKER" ? presetById(o.preset) : undefined;
        const img = p ? tzImage(p) : undefined;
        let icon: Lf.Icon | Lf.DivIcon;
        let h = 30;
        if (img) {
          const w = img.w * scale, hh = img.h * scale; h = hh;
          icon = Lx.icon({ iconUrl: img.url, iconSize: [w, hh], iconAnchor: [w / 2, hh / 2], className: clsx("lk-icon", sel && "lk-selected") });
        } else if (o.kind === "MARKER") {
          const el = document.createElement("div"); el.className = "lk-pin"; el.style.background = p?.pin?.color ?? "#475569"; el.textContent = p?.pin?.emoji ?? "📍";
          icon = Lx.divIcon({ html: el, className: clsx("lk-icon", sel && "lk-selected"), iconSize: [32, 32], iconAnchor: [16, 16] });
        } else {
          const el = document.createElement("div"); el.className = "lk-text"; el.textContent = o.label || "Text"; if (o.color) el.style.color = o.color;
          icon = Lx.divIcon({ html: el, className: clsx("lk-icon lk-textwrap", sel && "lk-selected"), iconSize: [0, 0] });
        }
        const interactive = tool.type === "select"; // beim Setzen/Zeichnen sollen Klicks durch bestehende Objekte zur Karte durchgehen
        const mk = Lx.marker(c, { icon, draggable: canEdit && interactive, keyboard: false, riseOnHover: true, interactive });
        if (o.kind === "MARKER" && o.label) {
          const t = document.createElement("span"); t.textContent = o.label;
          mk.bindTooltip(t, { permanent: true, direction: "bottom", offset: [0, h / 2 - 2], className: "lk-label" });
        }
        mk.on("click", (e) => { Lx.DomEvent.stopPropagation(e); if (toolRef.current.type === "select") setSelectedId(o.id); });
        mk.on("dragstart", () => { busy.current = true; });
        mk.on("dragend", async () => {
          const ll = mk.getLatLng();
          const next: LatLng = [round(ll.lat), round(ll.lng)];
          setObjects((cur) => cur.map((x) => (x.id === o.id ? { ...x, coords: next } : x)));
          try { await call("PATCH", `/api/v1/map-objects/${o.id}`, { coords: next }); } catch (e) { fail(e); }
          busy.current = false;
        });
        lyr = mk;
      } else {
        const pts = o.coords as LatLng[];
        const st = o.kind === "LINE" ? lineStyleById(o.preset) : areaStyleById(o.preset);
        const color = o.color ?? st?.color ?? "#2563eb";
        const base: Lf.PathOptions = { interactive: tool.type === "select", color, weight: (o.kind === "LINE" ? (st as { weight?: number } | undefined)?.weight ?? 4 : 3) + (sel ? 3 : 0), dashArray: st?.dash, opacity: 0.95, lineCap: "round" };
        const path = o.kind === "LINE" ? Lx.polyline(pts, base) : Lx.polygon(pts, { ...base, fillColor: color, fillOpacity: (st as { fillOpacity?: number } | undefined)?.fillOpacity ?? 0.15 });
        if (o.label) { const t = document.createElement("span"); t.textContent = o.label; path.bindTooltip(t, { permanent: true, direction: "center", className: "lk-label" }); }
        path.on("click", (e) => { Lx.DomEvent.stopPropagation(e); if (toolRef.current.type === "select") setSelectedId(o.id); });
        lyr = path;
      }
      lyr.addTo(g);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, selectedId, ready, scale, canEdit, tool.type]);

  // ── Zeichenvorschau ──
  useEffect(() => {
    const Lx = L.current, pv = preview.current;
    if (!ready || !Lx || !pv) return;
    pv.clearLayers();
    if (drawPts.length === 0 || (tool.type !== "line" && tool.type !== "area")) return;
    const st = tool.type === "line" ? lineStyleById(tool.style) : areaStyleById(tool.style);
    const opts = { color: st?.color ?? "#2563eb", weight: 4, dashArray: "4 6", fillOpacity: 0.1 };
    (tool.type === "line" || drawPts.length < 3 ? Lx.polyline(drawPts, opts) : Lx.polygon(drawPts, opts)).addTo(pv);
    drawPts.forEach((p) => Lx.circleMarker(p, { radius: 5, color: "#fff", weight: 2, fillColor: st?.color ?? "#2563eb", fillOpacity: 1 }).addTo(pv));
  }, [drawPts, tool, ready]);

  // ── Live-Aktualisierung (Betrachter und untätige Bearbeiter) ──
  useEffect(() => {
    const t = setInterval(async () => {
      if (busy.current || document.visibilityState !== "visible" || toolRef.current.type !== "select" || drawRef.current.length) return;
      try {
        const fresh = await call<{ objects: MapObj[] }>("GET", `/api/v1/shifts/${shiftId}/map`);
        setObjects((cur) => (JSON.stringify(cur.map(sig)) === JSON.stringify(fresh.objects.map(sig)) ? cur : fresh.objects));
      } catch { /* offline o. Ä. – nächster Versuch */ }
    }, 12_000);
    return () => clearInterval(t);
  }, [shiftId]);

  // ── Aktionen ──
  const create = useCallback(async (body: Record<string, unknown>) => {
    busy.current = true;
    try {
      const o = await call<MapObj>("POST", `/api/v1/shifts/${shiftId}/map/objects`, body);
      setObjects((cur) => [...cur, o]);
      setSelectedId(o.id);
      return o;
    } catch (e) { fail(e); } finally { busy.current = false; }
  }, [shiftId, fail]);

  function onMapClick(pt: LatLng) {
    const t = toolRef.current;
    const at: LatLng = [round(pt[0]), round(pt[1])];
    if (t.type === "select") { setSelectedId(null); return; }
    if (!canEdit) return;
    if (t.type === "marker") void create({ kind: "MARKER", preset: t.preset, coords: at, label: t.label ?? null });
    else if (t.type === "text") { void create({ kind: "TEXT", coords: at, label: "Text" }); setTool({ type: "select" }); }
    else setDrawPts((cur) => [...cur, at]);
  }

  function finishDrawing(fromDblClick = false) {
    const t = toolRef.current;
    if (t.type !== "line" && t.type !== "area") return;
    let pts = drawRef.current;
    if (fromDblClick && pts.length > 1) { // Doppelklick fügt den letzten Punkt doppelt ein
      const [a, b] = [pts[pts.length - 1], pts[pts.length - 2]];
      if (Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4) pts = pts.slice(0, -1);
    }
    const min = t.type === "line" ? 2 : 3;
    if (pts.length < min) { if (pts.length) fail(new Error(`Mindestens ${min} Punkte setzen.`)); return; }
    setDrawPts([]);
    void create({ kind: t.type === "line" ? "LINE" : "AREA", preset: t.style, coords: pts });
    setTool({ type: "select" });
  }

  const patch = useCallback(async (id: string, body: Record<string, unknown>) => {
    try {
      const o = await call<MapObj>("PATCH", `/api/v1/map-objects/${id}`, body);
      setObjects((cur) => cur.map((x) => (x.id === id ? o : x)));
    } catch (e) { fail(e); }
  }, [fail]);

  const remove = useCallback(async (id: string) => {
    try { await call("DELETE", `/api/v1/map-objects/${id}`); setObjects((cur) => cur.filter((x) => x.id !== id)); setSelectedId(null); } catch (e) { fail(e); }
  }, [fail]);

  async function saveView() {
    const m = map.current; if (!m) return;
    const c = m.getCenter();
    try { await call("PUT", `/api/v1/shifts/${shiftId}/map/view`, { lat: round(c.lat), lng: round(c.lng), zoom: m.getZoom() }); setNotice("Kartenansicht gespeichert."); setTimeout(() => setNotice(null), 3000); } catch (e) { fail(e); }
  }

  function exportGeoJson() {
    const features = objects.map((o) => ({
      type: "Feature", properties: { art: o.kind, symbol: o.preset, beschriftung: o.label, notiz: o.note },
      geometry: isPoint(o.coords) ? { type: "Point", coordinates: [o.coords[1], o.coords[0]] }
        : o.kind === "LINE" ? { type: "LineString", coordinates: o.coords.map((p) => [p[1], p[0]]) }
        : { type: "Polygon", coordinates: [[...o.coords, o.coords[0]].map((p) => [p[1], p[0]])] },
    }));
    const url = URL.createObjectURL(new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/geo+json" }));
    const a = document.createElement("a"); a.href = url; a.download = `lagekarte-${shiftId}.geojson`; a.click(); URL.revokeObjectURL(url);
  }

  // Tastatur: Entf löscht, Esc bricht ab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") { setDrawPts([]); setTool({ type: "select" }); setSelectedId(null); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedId && canEdit) { e.preventDefault(); void remove(selectedId); }
      else if (e.key === "Enter") finishDrawing();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, canEdit, remove]);

  useEffect(() => { setTimeout(() => map.current?.invalidateSize(), 60); }, [full]);
  useEffect(() => { try { const s = Number(localStorage.getItem("lkScale")); if (s >= 0.5 && s <= 1.4) setScale(s); } catch { /* egal */ } }, []);
  const chooseScale = (s: number) => { setScale(s); try { localStorage.setItem("lkScale", String(s)); } catch { /* egal */ } };

  const hint = tool.type === "marker" ? `Klicke auf die Karte, um „${presetById(tool.preset)?.label}“ zu setzen. Esc beendet.`
    : tool.type === "line" || tool.type === "area" ? `${drawPts.length} Punkt(e). Klicke Punkte; Doppelklick oder Enter schließt ab, Esc bricht ab.`
    : tool.type === "text" ? "Klicke auf die Karte, um einen Text zu setzen." : canEdit ? "Wähle links ein Symbol oder ein Werkzeug. Symbole lassen sich verschieben." : "Schreibgeschützt – Änderungen anderer erscheinen automatisch.";

  const q = filter.trim().toLowerCase();
  const groups = useMemo(() => PRESET_GROUPS.map((g) => ({ g, items: PRESETS.filter((p) => p.group === g && (!q || p.label.toLowerCase().includes(q))) })).filter((x) => x.items.length), [q]);
  const legend = useMemo(() => {
    const m = new Map<string, number>();
    objects.forEach((o) => { if (o.kind === "MARKER") m.set(o.preset, (m.get(o.preset) ?? 0) + 1); });
    return [...m.entries()].map(([id, n]) => ({ p: presetById(id)!, n })).filter((x) => x.p);
  }, [objects]);

  const toolBtn = (active: boolean) => clsx("btn btn-sm", active && "!bg-brand-600 !text-on-accent");

  return (
    <div className={clsx("lk-wide", full ? "fixed inset-0 z-[300] overflow-auto bg-bg p-3" : "")}>
      <div className="mb-3 flex flex-wrap items-center gap-2 no-print">
        <button type="button" className={toolBtn(tool.type === "select")} onClick={() => { setTool({ type: "select" }); setDrawPts([]); }}>↖ Auswählen</button>
        {canEdit && (
          <>
            <button type="button" className={toolBtn(tool.type === "text")} onClick={() => setTool({ type: "text" })}>𝐓 Text</button>
            {(tool.type === "line" || tool.type === "area") && drawPts.length > 0 && (<><button type="button" className="btn btn-sm btn-ok" onClick={() => finishDrawing()}>✓ Fertig</button><button type="button" className="btn btn-sm" onClick={() => setDrawPts((c) => c.slice(0, -1))}>↶ Letzter Punkt</button></>)}
            <button type="button" className="btn btn-sm" onClick={saveView} title="Aktuellen Kartenausschnitt als Standardansicht dieses Dienstes speichern">📍 Ansicht speichern</button>
          </>
        )}
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">Symbolgröße
          <select className="input !min-h-[28px] !w-auto !py-0 text-xs" value={scale} onChange={(e) => chooseScale(Number(e.target.value))}><option value={0.6}>klein</option><option value={0.85}>mittel</option><option value={1.1}>groß</option></select>
        </label>
        <span className="ml-auto flex gap-2">
          <button type="button" className="btn btn-sm" onClick={exportGeoJson}>GeoJSON</button>
          <button type="button" className="btn btn-sm" onClick={() => window.print()}>Drucken</button>
          <button type="button" className="btn btn-sm" onClick={() => setFull((f) => !f)}>{full ? "Vollbild beenden" : "Vollbild"}</button>
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 no-print">
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">Ort anspringen
          <select className="input !min-h-[28px] !w-auto !py-0 text-xs" value="" onChange={(e) => { const pl = PLACES.find((x) => x.id === e.target.value); if (pl) map.current?.flyTo([pl.lat, pl.lng], pl.zoom); }} aria-label="Ort anspringen">
            <option value="">Los Santos, Blaine County …</option>
            {PLACES.map((pl) => <option key={pl.id} value={pl.id}>{pl.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)_15rem]">
        {/* Symbolvorrat */}
        <aside className="order-2 space-y-3 lg:order-1 no-print" aria-label="Symbole und Werkzeuge">
          {canEdit ? (
            <>
              {data.vehicles.length > 0 && (
                <section className="card card-pad"><h3 className="card-title mb-2">Fahrzeuge dieses Dienstes</h3>
                  <ul className="space-y-1">{data.vehicles.map((v) => { const p = presetById(v.preset)!; return <li key={v.id}><button type="button" onClick={() => setTool({ type: "marker", preset: v.preset, label: v.label })} className={clsx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-fill-2", tool.type === "marker" && tool.preset === v.preset && tool.label === v.label && "bg-fill-3")}><PresetIcon p={p} size={26} /><span className="truncate">{v.label}</span></button></li>; })}</ul>
                </section>
              )}
              <section className="card card-pad"><h3 className="card-title mb-2">Linien & Flächen</h3>
                <div className="space-y-1">
                  {LINE_STYLES.map((s) => <button type="button" key={s.id} onClick={() => { setDrawPts([]); setTool({ type: "line", style: s.id }); }} className={clsx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-fill-2", tool.type === "line" && tool.style === s.id && "bg-fill-3")}><span className="inline-block w-9 rounded-sm bg-white px-0.5 py-1"><span className="block w-full border-t-4" style={{ borderColor: s.color, borderTopStyle: s.dash ? "dashed" : "solid" }} /></span>{s.label}</button>)}
                  {AREA_STYLES.map((s) => <button type="button" key={s.id} onClick={() => { setDrawPts([]); setTool({ type: "area", style: s.id }); }} className={clsx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-fill-2", tool.type === "area" && tool.style === s.id && "bg-fill-3")}><span className="inline-block h-5 w-9 rounded-sm bg-white p-0.5"><span className="block h-full w-full rounded-[2px] border-2" style={{ borderColor: s.color, background: `${s.color}33`, borderStyle: s.dash ? "dashed" : "solid" }} /></span>{s.label}</button>)}
                </div>
              </section>
              <section className="card card-pad"><h3 className="card-title mb-2">Symbole</h3>
                <input className="input !min-h-[30px] mb-2 text-[13px]" placeholder="Symbol suchen …" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Symbole filtern" />
                <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                  {groups.map(({ g, items }) => (
                    <div key={g}><p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{g}</p>
                      <div className="grid grid-cols-2 gap-1.5">{items.map((p) => (
                        <button type="button" key={p.id} title={p.label} onClick={() => { setDrawPts([]); setTool({ type: "marker", preset: p.id }); }} className={clsx("flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md border border-line bg-bg-2 p-1.5 text-center text-[11px] leading-tight hover:border-line-strong", tool.type === "marker" && tool.preset === p.id && !tool.label && "!border-brand-500 bg-fill-2")}>
                          <PresetIcon p={p} size={30} /><span className="line-clamp-2">{p.label}</span>
                        </button>))}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : <section className="card card-pad"><p className="text-sm text-fg-muted">Die Lagekarte wird von der Einsatzleitung gepflegt. Du siehst Änderungen automatisch.</p></section>}
        </aside>

        {/* Karte */}
        <div className="order-1 lg:order-2">
          <div className="relative">
            <div ref={mapEl} role="application" aria-label="Lagekarte" className={clsx("lk-map w-full overflow-hidden rounded-lg border border-line", full ? "h-[calc(100dvh-9rem)]" : "h-[72vh] min-h-[26rem]")} />
            <div className="pointer-events-none absolute inset-x-0 top-2 z-[500] flex flex-col items-center gap-2 px-2">
              <p className="pointer-events-none rounded-md bg-surface/95 px-3 py-1.5 text-xs text-fg shadow-card ring-1 ring-line">{hint}</p>
              {error && <p role="alert" className="pointer-events-auto rounded-md bg-danger px-3 py-1.5 text-xs text-white shadow-card">{error}</p>}
              {notice && <p className="rounded-md bg-ok px-3 py-1.5 text-xs text-black shadow-card">{notice}</p>}
            </div>
          </div>
        </div>

        {/* Eigenschaften, Legende, Objektliste */}
        <aside className="order-3 space-y-3 no-print" aria-label="Objekte">
          {selected && (
            <section className="card card-pad" aria-live="polite">
              <h3 className="card-title mb-2">Ausgewählt</h3>
              <SelectedPanel key={selected.id} o={selected} canEdit={canEdit} onPatch={(b) => patch(selected.id, b)} onDelete={() => remove(selected.id)} />
            </section>
          )}
          {legend.length > 0 && (
            <section className="card card-pad"><h3 className="card-title mb-2">Legende</h3>
              <ul className="space-y-1">{legend.map(({ p, n }) => <li key={p.id} className="flex items-center gap-2 text-[13px]"><PresetIcon p={p} size={24} /><span className="flex-1 truncate">{p.label}</span><span className="tabular-nums text-fg-subtle">{n}×</span></li>)}</ul>
            </section>
          )}
          <section className="card card-pad"><h3 className="card-title mb-2">Objekte ({objects.length})</h3>
            {objects.length === 0 ? <p className="text-sm text-fg-muted">Noch keine Objekte.</p> : (
              <ul className="max-h-64 space-y-0.5 overflow-y-auto text-[13px]">{objects.map((o) => (
                <li key={o.id}><button type="button" onClick={() => { setSelectedId(o.id); const c = isPoint(o.coords) ? o.coords : o.coords[0]; map.current?.panTo(c); }} className={clsx("flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left hover:bg-fill-2", o.id === selectedId && "bg-fill-3")}><span className="truncate">{o.label || presetLabel(o)}</span><span className="shrink-0 text-[11px] text-fg-subtle">{kindLabel(o.kind)}</span></button></li>
              ))}</ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function SelectedPanel({ o, canEdit, onPatch, onDelete }: { o: MapObj; canEdit: boolean; onPatch: (b: Record<string, unknown>) => void; onDelete: () => void }) {
  const [label, setLabel] = useState(o.label ?? "");
  const [note, setNote] = useState(o.note ?? "");
  const p = o.kind === "MARKER" ? presetById(o.preset) : undefined;
  const commit = () => { const b: Record<string, unknown> = {}; if (label !== (o.label ?? "")) b.label = label; if (note !== (o.note ?? "")) b.note = note; if (Object.keys(b).length) onPatch(b); };
  return (
    <div className="space-y-2.5 text-[13px]">
      <p className="flex items-center gap-2 font-medium">{p && <PresetIcon p={p} size={28} />}{presetLabel(o)}</p>
      {canEdit ? (
        <>
          <label className="block"><span className="label">Beschriftung</span><input className="input" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())} placeholder={o.kind === "TEXT" ? "Text" : "z. B. RTW 71/83-1"} /></label>
          <label className="block"><span className="label">Notiz</span><textarea className="input !min-h-[64px]" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} onBlur={commit} /></label>
          {o.kind === "MARKER" && (
            <label className="block"><span className="label">Symbol ändern</span>
              <select className="input" value={o.preset} onChange={(e) => onPatch({ preset: e.target.value })}>{PRESET_GROUPS.map((g) => <optgroup key={g} label={g}>{PRESETS.filter((x) => x.group === g).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup>)}</select></label>
          )}
          {(o.kind === "LINE" || o.kind === "AREA") && (
            <>
              <label className="block"><span className="label">Stil</span>
                <select className="input" value={o.preset} onChange={(e) => onPatch({ preset: e.target.value, color: null })}>{(o.kind === "LINE" ? LINE_STYLES : AREA_STYLES).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
              <label className="flex items-center gap-2"><span className="label !mb-0">Farbe</span><input type="color" value={o.color ?? (o.kind === "LINE" ? lineStyleById(o.preset)?.color : areaStyleById(o.preset)?.color) ?? "#2563eb"} onChange={(e) => onPatch({ color: e.target.value })} className="h-8 w-12 rounded border border-line bg-transparent" /></label>
            </>
          )}
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Objekt löschen (Entf)</button>
        </>
      ) : (<>{o.label && <p><span className="text-fg-subtle">Beschriftung: </span>{o.label}</p>}{o.note && <p className="whitespace-pre-line"><span className="text-fg-subtle">Notiz: </span>{o.note}</p>}</>)}
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;
const sig = (o: MapObj) => [o.id, o.preset, o.label, o.note, o.color, JSON.stringify(o.coords)];
const kindLabel = (k: MapObj["kind"]) => ({ MARKER: "Symbol", LINE: "Linie", AREA: "Fläche", TEXT: "Text" })[k];
const presetLabel = (o: MapObj) => (o.kind === "MARKER" ? presetById(o.preset)?.label : o.kind === "LINE" ? lineStyleById(o.preset)?.label : o.kind === "AREA" ? areaStyleById(o.preset)?.label : "Text") ?? o.preset;
